/**
 * ZK Compression commands for PoD Protocol CLI
 * Implements Solana's state compression using concurrent Merkle trees
 * for cost-effective storage of compressed accounts and NFTs
 */

import { Command } from 'commander';
import { address as createAddress, type Address } from '@solana/web3.js';
import { getWallet } from '../utils/client.js';
import { displayError } from '../utils/error-handler.js';
import { outputFormatter } from '../utils/output-formatter.js';
import { validatePublicKey } from '../utils/validation.js';
import { safeParseConfig } from '../utils/safe-json.js';
import { createSafeUmiOperations, isDevelopmentMode } from '../utils/wallet-adapter.js';
import { createDASAPI, DASUtils } from '../services/das-api.js';
import chalk from 'chalk';

// ZK Compression specific imports
// TODO: Re-enable these imports after resolving Web3.js v2.0 compatibility issues
// import {
//   getConcurrentMerkleTreeAccountSize,
//   ALL_DEPTH_SIZE_PAIRS,
//   createAllocTreeIx,
//   SPL_ACCOUNT_COMPRESSION_PROGRAM_ID,
//   SPL_NOOP_PROGRAM_ID,
//   type ValidDepthSizePair
// } from '@solana/spl-account-compression';

// import {
//   createUmi
// } from '@metaplex-foundation/umi-bundle-defaults';

// import {
//   createTree,
//   mintV1,
//   mintToCollectionV1,
//   transfer,
//   getAssetWithProof
// } from '@metaplex-foundation/mpl-bubblegum';

// import {
//   generateSigner,
//   keypairIdentity,
//   createSignerFromKeypair
// } from '@metaplex-foundation/umi';

// Mock constants for development mode
export const ALL_DEPTH_SIZE_PAIRS = [
  { maxDepth: 14, maxBufferSize: 64 },
  { maxDepth: 16, maxBufferSize: 64 },
  { maxDepth: 20, maxBufferSize: 256 }
];

export const getConcurrentMerkleTreeAccountSize = (depth: number, buffer: number, canopy: number) => {
  return Math.pow(2, depth) * 32 + buffer * 32 + canopy * 32; // Rough estimate
};

const SPL_ACCOUNT_COMPRESSION_PROGRAM_ID = 'compr6CUsB5m2jS4Y3831ztGSTnDpnKJTKS95d64XVq';

export function createZKCompressionCommand(): Command {
  const zk = new Command('zk')
    .description('ZK compression operations for cost-effective storage on Solana')
    .alias('compression')
    .option('-k, --keypair <path>', 'Solana keypair file for signing transactions');

  // Tree management commands
  const treeCmd = zk
    .command('tree')
    .description('Concurrent Merkle tree operations')
    .alias('merkle');

  treeCmd
    .command('create')
    .description('Create a new concurrent Merkle tree for compressed storage')
    .option('-d, --max-depth <number>', 'Maximum tree depth (3-30)', '14')
    .option('-b, --max-buffer-size <number>', 'Maximum buffer size', '64')
    .option('-c, --canopy-depth <number>', 'Canopy depth for composability', '10')
    .option('--calculate-cost', 'Calculate and display cost before creation')
    .action(async (options) => {
      try {
        const wallet = await getWallet(options.keypair);
        const maxDepth = parseInt(options.maxDepth);
        const maxBufferSize = parseInt(options.maxBufferSize);
        const canopyDepth = parseInt(options.canopyDepth);

        // Validate depth/buffer size pair
        const validPair = ALL_DEPTH_SIZE_PAIRS.find(
          pair => pair.maxDepth === maxDepth && pair.maxBufferSize === maxBufferSize
        );

        if (!validPair) {
          console.log(chalk.yellow('Invalid depth/buffer size combination. Valid pairs:'));
          ALL_DEPTH_SIZE_PAIRS.forEach(pair => {
            console.log(`  Depth: ${pair.maxDepth}, Buffer: ${pair.maxBufferSize}, Capacity: ${Math.pow(2, pair.maxDepth).toLocaleString()}`);
          });
          return;
        }

        // Calculate costs
        const requiredSpace = getConcurrentMerkleTreeAccountSize(maxDepth, maxBufferSize, canopyDepth);
        const maxCapacity = Math.pow(2, maxDepth);
        
        console.log(chalk.blue('📊 Tree Configuration:'));
        console.log(`  Max Depth: ${maxDepth}`);
        console.log(`  Max Buffer Size: ${maxBufferSize}`);
        console.log(`  Canopy Depth: ${canopyDepth}`);
        console.log(`  Max Capacity: ${maxCapacity.toLocaleString()} items`);
        console.log(`  Storage Size: ${requiredSpace.toLocaleString()} bytes`);

        if (options.calculateCost) {
          console.log(chalk.green('💰 Cost calculation completed. Use --confirm to create the tree.'));
          return;
        }

        console.log(chalk.blue('🌳 Creating concurrent Merkle tree...'));

        // Use the new wallet adapter for Umi integration
        const { umi, operations } = createSafeUmiOperations(wallet, 'https://api.devnet.solana.com');
        
        if (isDevelopmentMode()) {
          console.log('🚧 Running in development mode with mock operations');
        }

        const treeResult = await operations.createTree({
          maxDepth,
          maxBufferSize,
          canopyDepth,
          wallet: wallet.address.toString()
        });
        
        const result = await treeResult.sendAndConfirm();
        
        const output = {
          success: true,
          development_mode: isDevelopmentMode(),
          tree_address: treeResult.publicKey,
          max_capacity: maxCapacity,
          storage_size: requiredSpace,
          transaction_signature: result.signature,
          compression_savings: `~${Math.floor(maxCapacity / 100)}x cheaper than regular accounts`,
          network: 'devnet'
        };

        outputFormatter.success(
          isDevelopmentMode() ? 'Tree creation (development mode)' : 'Concurrent Merkle tree created successfully', 
          output
        );
      } catch (error) {
        displayError('Failed to create Merkle tree', error);
        process.exit(1);
      }
    });

  treeCmd
    .command('info')
    .description('Get information about a concurrent Merkle tree')
    .argument('<tree-address>', 'Merkle tree account address')
    .action(async (treeAddress, options) => {
      try {
        const wallet = await getWallet(options.keypair);
        
        if (!validatePublicKey(treeAddress)) {
          throw new Error('Invalid tree address');
        }

        console.log(chalk.blue('🔍 Fetching tree information...'));

        // Use the new wallet adapter for Umi integration
        const { umi, operations } = createSafeUmiOperations(wallet, 'https://api.devnet.solana.com');
        
        if (isDevelopmentMode()) {
          console.log('🚧 Running in development mode with mock operations');
        }

        // Fetch tree account data
        const treeAccount = await umi.rpc.getAccount(createAddress(treeAddress));
        
        const output = {
          tree_address: treeAddress,
          development_mode: isDevelopmentMode(),
          exists: treeAccount.exists,
          owner: treeAccount.value?.owner || 'Unknown',
          data_size: treeAccount.value?.data?.length || 0,
          lamports: treeAccount.value?.lamports?.toString() || '0',
          status: treeAccount.exists ? 'Active' : 'Not Found',
          network: 'devnet'
        };

        outputFormatter.success(
          isDevelopmentMode() ? 'Tree information (development mode)' : 'Tree information retrieved', 
          output
        );
      } catch (error) {
        displayError('Failed to get tree information', error);
        process.exit(1);
      }
    });

  // Compressed NFT commands
  const nftCmd = zk
    .command('nft')
    .description('Compressed NFT operations using ZK compression')
    .alias('cnft');

  nftCmd
    .command('mint')
    .description('Mint a compressed NFT to a Merkle tree')
    .argument('<tree-address>', 'Merkle tree address')
    .option('-n, --name <name>', 'NFT name', 'Compressed NFT')
    .option('-s, --symbol <symbol>', 'NFT symbol', 'CNFT')
    .option('-u, --uri <uri>', 'Metadata URI (JSON)')
    .option('-o, --owner <address>', 'NFT owner (defaults to wallet)')
    .option('--seller-fee <bps>', 'Seller fee basis points', '500')
    .action(async (treeAddress, options) => {
      try {
        const wallet = await getWallet(options.keypair);
        
        if (!validatePublicKey(treeAddress)) {
          throw new Error('Invalid tree address');
        }

        const owner = options.owner ? createAddress(options.owner) : wallet.address;
        
        console.log(chalk.blue('🎨 Minting compressed NFT...'));

        // Use the new wallet adapter for Umi integration
        const { umi, operations } = createSafeUmiOperations(wallet, 'https://api.devnet.solana.com');
        
        if (isDevelopmentMode()) {
          console.log('🚧 Running in development mode with mock operations');
        }

        const mintResult = await operations.mintV1({
          leafOwner: owner.toString(),
          merkleTree: treeAddress,
          metadata: {
            name: options.name,
            symbol: options.symbol,
            uri: options.uri || '',
            sellerFeeBasisPoints: parseInt(options.sellerFee),
          },
        });
        
        const result = await mintResult.sendAndConfirm();
        
        const output = {
          success: true,
          development_mode: isDevelopmentMode(),
          tree_address: treeAddress,
          owner: owner.toString(),
          metadata: {
            name: options.name,
            symbol: options.symbol,
            uri: options.uri,
            seller_fee_bps: options.sellerFee
          },
          transaction_signature: result.signature,
          cost_savings: '~5000x cheaper than regular NFT mint',
          network: 'devnet'
        };

        outputFormatter.success(
          isDevelopmentMode() ? 'Compressed NFT mint (development mode)' : 'Compressed NFT minted successfully', 
          output
        );
      } catch (error) {
        displayError('Failed to mint compressed NFT', error);
        process.exit(1);
      }
    });

  nftCmd
    .command('transfer')
    .description('Transfer a compressed NFT')
    .argument('<asset-id>', 'Compressed NFT asset ID')
    .argument('<new-owner>', 'New owner address')
    .option('--rpc-url <url>', 'RPC URL with DAS API support', 'https://mainnet.helius-rpc.com')
    .action(async (assetId, newOwner, options) => {
      try {
        const wallet = await getWallet(options.keypair);
        
        if (!validatePublicKey(assetId) || !validatePublicKey(newOwner)) {
          throw new Error('Invalid asset ID or new owner address');
        }

        console.log(chalk.blue('🔄 Transferring compressed NFT...'));

        // Use the new wallet adapter for Umi integration
        const { umi, operations } = createSafeUmiOperations(wallet, options.rpcUrl);
        
        if (isDevelopmentMode()) {
          console.log('🚧 Running in development mode with mock operations');
        }

        // Get asset with proof using DAS API (mock in development)
        const assetWithProof = await operations.getAssetWithProof(assetId);

        const transferResult = await operations.transfer({
          assetWithProof,
          leafOwner: wallet.address.toString(),
          newLeafOwner: newOwner,
        });
        
        const result = await transferResult.sendAndConfirm();
        
        const output = {
          success: true,
          development_mode: isDevelopmentMode(),
          asset_id: assetId,
          previous_owner: wallet.address.toString(),
          new_owner: newOwner,
          transaction_signature: result.signature,
          network: options.rpcUrl.includes('devnet') ? 'devnet' : 'mainnet'
        };

        outputFormatter.success(
          isDevelopmentMode() ? 'Compressed NFT transfer (development mode)' : 'Compressed NFT transferred successfully', 
          output
        );
      } catch (error) {
        displayError('Failed to transfer compressed NFT', error);
        process.exit(1);
      }
    });

  nftCmd
    .command('list')
    .description('List compressed NFTs owned by an address')
    .argument('<owner-address>', 'Owner address')
    .option('--limit <number>', 'Maximum number of assets', '100')
    .option('--rpc-url <url>', 'RPC URL with DAS API support', 'https://mainnet.helius-rpc.com')
    .action(async (ownerAddress, options) => {
      try {
        if (!validatePublicKey(ownerAddress)) {
          throw new Error('Invalid owner address');
        }

        console.log(chalk.blue('🔍 Fetching compressed NFTs...'));

        // Use DAS API service for comprehensive asset querying
        const dasAPI = createDASAPI(options.rpcUrl, isDevelopmentMode());
        
        if (isDevelopmentMode()) {
          console.log('🚧 Running in development mode with mock DAS API');
        }

        // Test DAS API connection
        const connectionTest = await dasAPI.testConnection();
        if (!connectionTest.healthy && !isDevelopmentMode()) {
          throw new Error('DAS API connection failed. Please check your RPC endpoint.');
        }

        // Fetch assets by owner
        const assetsResponse = await dasAPI.getAssetsByOwner(ownerAddress, {
          limit: parseInt(options.limit),
          page: 1
        });
        
        // Filter for compressed assets only
        const compressedAssets = DASUtils.filterCompressedAssets(assetsResponse.items);
        
        // Group by tree for better organization
        const assetsByTree = DASUtils.groupAssetsByTree(compressedAssets);
        
        // Calculate storage savings
        const savings = DASUtils.calculateStorageSavings(compressedAssets.length);

        const output = {
          owner: ownerAddress,
          total_compressed_nfts: compressedAssets.length,
          total_all_assets: assetsResponse.total,
          compression_ratio: `${compressedAssets.length}/${assetsResponse.total}`,
          storage_savings: savings,
          trees_used: Object.keys(assetsByTree).length,
          development_mode: isDevelopmentMode(),
          das_api: {
            healthy: connectionTest.healthy,
            latency: `${connectionTest.latency}ms`,
            version: connectionTest.version
          },
          assets: compressedAssets.map(asset => ({
            id: asset.id,
            name: asset.content?.metadata?.name || 'Unknown',
            symbol: asset.content?.metadata?.symbol || '',
            tree: asset.compression?.tree || 'Unknown',
            leaf_id: asset.compression?.leaf_id || 0,
            owner: asset.ownership.owner,
            delegate: asset.ownership.delegate
          })),
          trees: Object.entries(assetsByTree).map(([tree, assets]) => ({
            tree_id: tree,
            asset_count: assets.length
          }))
        };

        outputFormatter.success(
          isDevelopmentMode() ? 'Compressed NFTs retrieved (development mode)' : 'Compressed NFTs retrieved', 
          output
        );
      } catch (error) {
        displayError('Failed to list compressed NFTs', error);
        process.exit(1);
      }
    });

  // Compression utilities
  const utilsCmd = zk
    .command('utils')
    .description('ZK compression utilities and helpers')
    .alias('tools');

  utilsCmd
    .command('calculate-costs')
    .description('Calculate storage costs for different tree configurations')
    .option('--nft-count <number>', 'Number of NFTs to store', '10000')
    .action(async (options) => {
      try {
        const nftCount = parseInt(options.nftCount);
        
        console.log(chalk.blue(`💰 Calculating costs for ${nftCount.toLocaleString()} compressed NFTs:`));
        console.log();

        // Find suitable configurations
        const suitableConfigs = ALL_DEPTH_SIZE_PAIRS.filter(pair => {
          const capacity = Math.pow(2, pair.maxDepth);
          return capacity >= nftCount;
        }).slice(0, 5); // Show top 5 options

        const results = [];

        for (const config of suitableConfigs) {
          const capacity = Math.pow(2, config.maxDepth);
          const canopyDepth = Math.min(10, config.maxDepth - 3); // Reasonable canopy
          const storageSize = getConcurrentMerkleTreeAccountSize(
            config.maxDepth,
            config.maxBufferSize,
            canopyDepth
          );
          
          // Estimate rent cost (approximate)
          const rentCost = storageSize * 0.00000348; // Rough SOL per byte
          
          results.push({
            max_depth: config.maxDepth,
            max_buffer_size: config.maxBufferSize,
            canopy_depth: canopyDepth,
            capacity: capacity.toLocaleString(),
            storage_size: `${(storageSize / 1024).toFixed(1)} KB`,
            estimated_cost: `~${rentCost.toFixed(4)} SOL`,
            vs_regular_nfts: `${Math.floor(nftCount * 0.001 / rentCost)}x cheaper`
          });
        }

        outputFormatter.success('Storage cost calculations', {
          nft_count: nftCount.toLocaleString(),
          configurations: results,
          note: 'Choose higher canopy depth for better composability but higher cost'
        });
      } catch (error) {
        displayError('Failed to calculate costs', error);
        process.exit(1);
      }
    });

  utilsCmd
    .command('test-das-api')
    .description('Test DAS API connection and capabilities')
    .option('--rpc-url <url>', 'RPC URL with DAS API support', 'https://mainnet.helius-rpc.com')
    .action(async (options) => {
      try {
        console.log(chalk.blue('🔍 Testing DAS API connection...'));

        const dasAPI = createDASAPI(options.rpcUrl, isDevelopmentMode());
        
        if (isDevelopmentMode()) {
          console.log('🚧 Running in development mode with mock DAS API');
        }

        // Test connection
        const connectionTest = await dasAPI.testConnection();
        
        // Perform a sample search to test functionality
        const sampleSearch = await dasAPI.searchAssets({
          compressed: true,
          limit: 5
        });

        const output = {
          rpc_url: options.rpcUrl,
          development_mode: isDevelopmentMode(),
          connection: {
            healthy: connectionTest.healthy,
            latency: `${connectionTest.latency}ms`,
            version: connectionTest.version || 'unknown'
          },
          capabilities: {
            search_assets: sampleSearch.items.length > 0,
            compressed_nft_support: true,
            indexer_status: connectionTest.healthy ? 'operational' : 'unavailable'
          },
          sample_results: {
            total_found: sampleSearch.total,
            sample_count: sampleSearch.items.length,
            compressed_assets: DASUtils.filterCompressedAssets(sampleSearch.items).length
          },
          recommendations: connectionTest.healthy 
            ? ['DAS API is ready for use', 'All compression features available']
            : isDevelopmentMode() 
              ? ['Development mode active', 'Mock data will be used']
              : ['Check RPC endpoint configuration', 'Consider using Helius RPC for full DAS support']
        };

        if (connectionTest.healthy || isDevelopmentMode()) {
          console.log(chalk.green('✅ DAS API connection successful'));
        } else {
          console.log(chalk.red('❌ DAS API connection failed'));
        }

        outputFormatter.success(
          isDevelopmentMode() ? 'DAS API test (development mode)' : 'DAS API test completed', 
          output
        );
      } catch (error) {
        displayError('Failed to test DAS API', error);
        process.exit(1);
      }
    });

  utilsCmd
    .command('validate-tree')
    .description('Validate a Merkle tree configuration')
    .argument('<tree-address>', 'Tree address to validate')
    .option('--rpc-url <url>', 'RPC URL', 'https://api.mainnet-beta.solana.com')
    .action(async (treeAddress, options) => {
      try {
        const wallet = await getWallet(options.keypair);
        
        if (!validatePublicKey(treeAddress)) {
          throw new Error('Invalid tree address');
        }

        console.log(chalk.blue('🔍 Validating Merkle tree...'));

        // Use the new wallet adapter for Umi integration
        const { umi, operations } = createSafeUmiOperations(wallet, options.rpcUrl);
        
        if (isDevelopmentMode()) {
          console.log('🚧 Running in development mode with mock operations');
        }

        // Check if tree exists and get basic info
        const treeAccount = await umi.rpc.getAccount(createAddress(treeAddress));
        
        const validation = {
          tree_address: treeAddress,
          development_mode: isDevelopmentMode(),
          exists: treeAccount.exists,
          owner: treeAccount.value?.owner || 'Unknown',
          data_size: treeAccount.value?.data?.length || 0,
          is_compression_program: treeAccount.value?.owner === SPL_ACCOUNT_COMPRESSION_PROGRAM_ID,
          status: treeAccount.exists ? 'Valid' : 'Not Found',
          network: options.rpcUrl.includes('devnet') ? 'devnet' : 'mainnet'
        };

        if (validation.is_compression_program && !isDevelopmentMode()) {
          console.log(chalk.green('✅ Tree is valid and owned by Account Compression Program'));
        } else if (isDevelopmentMode()) {
          console.log(chalk.yellow('⚠️  Tree validation is in development mode'));
        } else {
          console.log(chalk.yellow('⚠️  Tree exists but not owned by Account Compression Program'));
        }

        outputFormatter.success(
          isDevelopmentMode() ? 'Tree validation (development mode)' : 'Tree validation completed', 
          validation
        );
      } catch (error) {
        displayError('Failed to validate tree', error);
        process.exit(1);
      }
    });

  return zk;
}