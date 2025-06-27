/**
 * ZK Compression Commands and Utilities
 * Handles compressed NFT operations and Merkle tree management
 */

import { Command } from "commander";
import chalk from 'chalk';
import boxen from 'boxen';
import * as emoji from 'node-emoji';
import { intro, outro, text, select, confirm } from '@clack/prompts';
import { createDASAPI, DASUtils } from '../services/das-api.js';
import { createSafeUmiOperations, loadWalletFromFile, validateTreeConfig, calculateTreeCapacity, calculateTreeStorageCost } from '../utils/wallet-adapter.js';

export interface DepthSizePair {
  maxDepth: number;
  maxBufferSize: number;
  description: string;
  capacity: number;
  estimatedCost: number;
}

export const ALL_DEPTH_SIZE_PAIRS: DepthSizePair[] = [
  { maxDepth: 14, maxBufferSize: 64, description: "Small collection (16K NFTs)", capacity: 16384, estimatedCost: 0.1 },
  { maxDepth: 17, maxBufferSize: 64, description: "Medium collection (131K NFTs)", capacity: 131072, estimatedCost: 0.5 },
  { maxDepth: 20, maxBufferSize: 256, description: "Large collection (1M NFTs)", capacity: 1048576, estimatedCost: 2.0 },
  { maxDepth: 24, maxBufferSize: 1024, description: "Massive collection (16M NFTs)", capacity: 16777216, estimatedCost: 15.0 },
  { maxDepth: 26, maxBufferSize: 2048, description: "Enterprise collection (67M NFTs)", capacity: 67108864, estimatedCost: 50.0 },
  { maxDepth: 30, maxBufferSize: 2048, description: "Maximum collection (1B+ NFTs)", capacity: 1073741824, estimatedCost: 200.0 }
];

export function getConcurrentMerkleTreeAccountSize(maxDepth: number, maxBufferSize: number, canopyDepth: number): number {
  return calculateTreeStorageCost(maxDepth, maxBufferSize, canopyDepth);
}

export function createZKCompressionCommands(): Command {
  const zk = new Command('zk')
    .alias('compress')
    .description('ZK compression operations for NFTs and data');

  // Create compressed NFT tree
  zk
    .command('create-tree')
    .description('Create a new Merkle tree for compressed NFTs')
    .option('--depth <number>', 'tree depth (3-30)', '14')
    .option('--buffer-size <number>', 'buffer size', '64')
    .option('--canopy-depth <number>', 'canopy depth for faster proof verification', '10')
    .option('--network <network>', 'target network', 'devnet')
    .action(async (options) => {
      intro(`${emoji.get('deciduous_tree')} Creating ZK Compression Merkle Tree`);

      const maxDepth = parseInt(options.depth);
      const maxBufferSize = parseInt(options.bufferSize);
      const canopyDepth = parseInt(options.canopyDepth);

      const config = {
        maxDepth,
        maxBufferSize,
        canopyDepth,
        wallet: 'current-wallet'
      };

      const validation = validateTreeConfig(config);
      if (!validation.valid) {
        console.error(boxen(
          `${emoji.get('x')} Invalid Configuration:\n\n` +
          validation.errors.map(e => `• ${e}`).join('\n'),
          {
            padding: 1,
            borderStyle: 'round',
            borderColor: 'red',
            title: ' Configuration Error '
          }
        ));
        return;
      }

      const capacity = calculateTreeCapacity(maxDepth);
      const estimatedCost = calculateTreeStorageCost(maxDepth, maxBufferSize, canopyDepth);

      console.log(boxen(
        `${emoji.get('gear')} Tree Configuration:\n\n` +
        `${emoji.get('chart_with_upwards_trend')} Max Depth: ${chalk.cyan(maxDepth)}\n` +
        `${emoji.get('package')} Buffer Size: ${chalk.cyan(maxBufferSize)}\n` +
        `${emoji.get('umbrella')} Canopy Depth: ${chalk.cyan(canopyDepth)}\n` +
        `${emoji.get('hash')} Capacity: ${chalk.green(capacity.toLocaleString())} NFTs\n` +
        `${emoji.get('moneybag')} Estimated Cost: ${chalk.yellow(estimatedCost.toFixed(4))} SOL\n\n` +
        `${emoji.get('globe_with_meridians')} Network: ${chalk.blue(options.network)}`,
        {
          padding: 1,
          borderStyle: 'round',
          borderColor: 'blue',
          title: ' Tree Configuration '
        }
      ));

      const shouldCreate = await confirm({
        message: 'Create this Merkle tree?',
        initialValue: false
      });

      if (shouldCreate) {
        try {
          const wallet = loadWalletFromFile();
          const { operations } = createSafeUmiOperations(wallet, `https://api.${options.network}.solana.com`);
          
          const result = await operations.createTree(config);
          const confirmation = await result.sendAndConfirm();

          console.log(boxen(
            `${emoji.get('white_check_mark')} Tree Created Successfully!\n\n` +
            `${emoji.get('id')} Tree ID: ${chalk.green(result.publicKey)}\n` +
            `${emoji.get('link')} Signature: ${chalk.gray(confirmation.signature)}\n` +
            `${emoji.get('hash')} Capacity: ${chalk.cyan(capacity.toLocaleString())} NFTs\n\n` +
            `${emoji.get('information_source')} You can now mint compressed NFTs to this tree`,
            {
              padding: 1,
              borderStyle: 'round',
              borderColor: 'green',
              title: ' Tree Created '
            }
          ));

          outro(`${emoji.get('white_check_mark')} Merkle tree ready for compressed NFTs!`);
        } catch (error: any) {
          console.error(boxen(
            `${emoji.get('x')} Failed to create tree:\n\n${error.message}`,
            {
              padding: 1,
              borderStyle: 'round',
              borderColor: 'red',
              title: ' Error '
            }
          ));
        }
      }
    });

  // Mint compressed NFT
  zk
    .command('mint')
    .description('Mint a compressed NFT')
    .option('--tree <treeId>', 'Merkle tree ID')
    .option('--name <name>', 'NFT name')
    .option('--symbol <symbol>', 'NFT symbol')
    .option('--uri <uri>', 'metadata URI')
    .option('--to <address>', 'recipient address')
    .action(async (options) => {
      intro(`${emoji.get('art')} Minting Compressed NFT`);

      let treeId = options.tree;
      let name = options.name;
      let symbol = options.symbol;
      let uri = options.uri;
      let recipient = options.to;

      if (!treeId) {
        treeId = await text({
          message: 'Enter Merkle tree ID:',
          placeholder: 'tree_abc123...'
        });
      }

      if (!name) {
        name = await text({
          message: 'Enter NFT name:',
          placeholder: 'My Compressed NFT'
        });
      }

      if (!symbol) {
        symbol = await text({
          message: 'Enter NFT symbol:',
          placeholder: 'CNFT'
        });
      }

      if (!uri) {
        uri = await text({
          message: 'Enter metadata URI:',
          placeholder: 'https://example.com/metadata.json'
        });
      }

      if (!recipient) {
        const wallet = loadWalletFromFile();
        recipient = wallet.address.toString();
      }

      try {
        const wallet = loadWalletFromFile();
        const { operations } = createSafeUmiOperations(wallet, 'https://api.devnet.solana.com');

        const mintConfig = {
          leafOwner: recipient,
          merkleTree: treeId,
          metadata: {
            name,
            symbol,
            uri,
            sellerFeeBasisPoints: 500
          }
        };

        const result = await operations.mintV1(mintConfig);
        const confirmation = await result.sendAndConfirm();

        console.log(boxen(
          `${emoji.get('white_check_mark')} Compressed NFT Minted!\n\n` +
          `${emoji.get('art')} Name: ${chalk.cyan(name)}\n` +
          `${emoji.get('label')} Symbol: ${chalk.cyan(symbol)}\n` +
          `${emoji.get('link')} URI: ${chalk.blue(uri)}\n` +
          `${emoji.get('deciduous_tree')} Tree: ${chalk.gray(treeId)}\n` +
          `${emoji.get('bust_in_silhouette')} Owner: ${chalk.gray(recipient)}\n` +
          `${emoji.get('link')} Signature: ${chalk.gray(confirmation.signature)}\n\n` +
          `${emoji.get('moneybag')} Cost: ~0.000001 SOL (99% savings vs regular NFT)`,
          {
            padding: 1,
            borderStyle: 'round',
            borderColor: 'green',
            title: ' NFT Minted '
          }
        ));

        outro(`${emoji.get('white_check_mark')} Compressed NFT successfully minted!`);
      } catch (error: any) {
        console.error(boxen(
          `${emoji.get('x')} Failed to mint NFT:\n\n${error.message}`,
          {
            padding: 1,
            borderStyle: 'round',
            borderColor: 'red',
            title: ' Error '
          }
        ));
      }
    });

  // Transfer compressed NFT
  zk
    .command('transfer')
    .description('Transfer a compressed NFT')
    .option('--asset <assetId>', 'asset ID to transfer')
    .option('--to <address>', 'recipient address')
    .action(async (options) => {
      intro(`${emoji.get('outbox_tray')} Transferring Compressed NFT`);

      let assetId = options.asset;
      let recipient = options.to;

      if (!assetId) {
        assetId = await text({
          message: 'Enter asset ID to transfer:',
          placeholder: 'asset_abc123...'
        });
      }

      if (!recipient) {
        recipient = await text({
          message: 'Enter recipient address:',
          placeholder: '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM'
        });
      }

      try {
        const wallet = loadWalletFromFile();
        const { operations } = createSafeUmiOperations(wallet, 'https://api.devnet.solana.com');

        // Get asset with proof
        const assetWithProof = await operations.getAssetWithProof(assetId);

        const transferConfig = {
          assetWithProof,
          leafOwner: wallet.address.toString(),
          newLeafOwner: recipient
        };

        const result = await operations.transfer(transferConfig);
        const confirmation = await result.sendAndConfirm();

        console.log(boxen(
          `${emoji.get('white_check_mark')} Transfer Complete!\n\n` +
          `${emoji.get('package')} Asset: ${chalk.cyan(assetId)}\n` +
          `${emoji.get('point_right')} To: ${chalk.cyan(recipient)}\n` +
          `${emoji.get('link')} Signature: ${chalk.gray(confirmation.signature)}\n\n` +
          `${emoji.get('moneybag')} Cost: ~0.0001 SOL (minimal gas fees)`,
          {
            padding: 1,
            borderStyle: 'round',
            borderColor: 'green',
            title: ' Transfer Complete '
          }
        ));

        outro(`${emoji.get('white_check_mark')} Compressed NFT transferred successfully!`);
      } catch (error: any) {
        console.error(boxen(
          `${emoji.get('x')} Failed to transfer NFT:\n\n${error.message}`,
          {
            padding: 1,
            borderStyle: 'round',
            borderColor: 'red',
            title: ' Error '
          }
        ));
      }
    });

  // List compressed NFTs
  zk
    .command('list')
    .description('List compressed NFTs by owner')
    .option('--owner <address>', 'owner address')
    .option('--tree <treeId>', 'filter by specific tree')
    .option('--limit <number>', 'number of NFTs to show', '20')
    .action(async (options) => {
      intro(`${emoji.get('scroll')} Listing Compressed NFTs`);

      let owner = options.owner;
      if (!owner) {
        const wallet = loadWalletFromFile();
        owner = wallet.address.toString();
      }

      try {
        const dasAPI = createDASAPI('https://devnet.helius-rpc.com', true);
        const response = await dasAPI.getAssetsByOwner(owner, {
          limit: parseInt(options.limit)
        });

        const compressedAssets = DASUtils.filterCompressedAssets(response.items);
        
        if (compressedAssets.length === 0) {
          console.log(boxen(
            `${emoji.get('empty_nest')} No compressed NFTs found for this owner.\n\n` +
            `${emoji.get('bulb')} Try minting some with: pod zk mint`,
            {
              padding: 1,
              borderStyle: 'round',
              borderColor: 'yellow',
              title: ' No NFTs Found '
            }
          ));
          return;
        }

        const groupedByTree = DASUtils.groupAssetsByTree(compressedAssets);
        const collections = DASUtils.extractCollections(compressedAssets);

        console.log(boxen(
          `${emoji.get('art')} Compressed NFTs for: ${chalk.cyan(owner)}\n\n` +
          `${emoji.get('1234')} Total NFTs: ${chalk.green(compressedAssets.length)}\n` +
          `${emoji.get('deciduous_tree')} Trees Used: ${chalk.blue(Object.keys(groupedByTree).length)}\n` +
          `${emoji.get('package')} Collections: ${chalk.magenta(collections.length)}\n\n` +
          `${emoji.get('scroll')} Recent NFTs:\n` +
          compressedAssets.slice(0, 5).map(asset => 
            `  • ${chalk.cyan(asset.content.metadata.name)} (${asset.content.metadata.symbol})`
          ).join('\n') + '\n\n' +
          `${emoji.get('information_source')} Use --limit to see more NFTs`,
          {
            padding: 1,
            borderStyle: 'round',
            borderColor: 'blue',
            title: ' Compressed NFTs '
          }
        ));

        outro(`${emoji.get('white_check_mark')} Found ${compressedAssets.length} compressed NFTs`);
      } catch (error: any) {
        console.error(boxen(
          `${emoji.get('x')} Failed to list NFTs:\n\n${error.message}`,
          {
            padding: 1,
            borderStyle: 'round',
            borderColor: 'red',
            title: ' Error '
          }
        ));
      }
    });

  // Calculate savings
  zk
    .command('savings')
    .description('Calculate storage cost savings for compressed NFTs')
    .option('--count <number>', 'number of NFTs to calculate for', '10000')
    .action(async (options) => {
      const nftCount = parseInt(options.count);
      const savings = DASUtils.calculateStorageSavings(nftCount);

      console.log(boxen(
        `${emoji.get('money_with_wings')} ZK Compression Savings Analysis\n\n` +
        `${emoji.get('1234')} NFT Count: ${chalk.cyan(nftCount.toLocaleString())}\n\n` +
        `${emoji.get('moneybag')} Regular NFT Cost: ${chalk.red(savings.regular_cost)}\n` +
        `${emoji.get('sparkles')} Compressed Cost: ${chalk.green(savings.compressed_cost)}\n` +
        `${emoji.get('chart_with_downwards_trend')} Total Savings: ${chalk.green(savings.savings)}\n` +
        `${emoji.get('rocket')} Cost Multiplier: ${chalk.yellow(savings.multiplier)} cheaper\n\n` +
        `${emoji.get('earth_americas')} Environmental Impact: 99% less storage\n` +
        `${emoji.get('zap')} Network Efficiency: Massive throughput improvement`,
        {
          padding: 1,
          borderStyle: 'double',
          borderColor: 'green',
          title: ' Savings Calculator '
        }
      ));
    });

  // Tree recommendations
  zk
    .command('recommend')
    .description('Get tree configuration recommendations')
    .option('--nfts <number>', 'expected number of NFTs')
    .action(async (options) => {
      intro(`${emoji.get('bulb')} ZK Compression Tree Recommendations`);

      let expectedNFTs = options.nfts;
      if (!expectedNFTs) {
        expectedNFTs = await select({
          message: 'How many NFTs do you plan to mint?',
          options: [
            { value: '1000', label: '1,000 NFTs (Small collection)' },
            { value: '10000', label: '10,000 NFTs (Medium collection)' },
            { value: '100000', label: '100,000 NFTs (Large collection)' },
            { value: '1000000', label: '1,000,000+ NFTs (Massive collection)' }
          ]
        });
      }

      const nftCount = parseInt(expectedNFTs);
      const suitableConfigs = ALL_DEPTH_SIZE_PAIRS.filter(pair => 
        pair.capacity >= nftCount
      ).slice(0, 3);

      console.log(boxen(
        `${emoji.get('deciduous_tree')} Recommended Tree Configurations for ${chalk.cyan(nftCount.toLocaleString())} NFTs:\n\n` +
        suitableConfigs.map((config, index) => 
          `${emoji.get('white_check_mark')} Option ${index + 1}: ${config.description}\n` +
          `   Depth: ${config.maxDepth}, Buffer: ${config.maxBufferSize}\n` +
          `   Capacity: ${chalk.green(config.capacity.toLocaleString())} NFTs\n` +
          `   Cost: ~${chalk.yellow(config.estimatedCost)} SOL`
        ).join('\n\n') + '\n\n' +
        `${emoji.get('bulb')} Recommendation: Start with Option 1 for most use cases\n` +
        `${emoji.get('information_source')} You can always create additional trees later`,
        {
          padding: 1,
          borderStyle: 'round',
          borderColor: 'blue',
          title: ' Tree Recommendations '
        }
      ));

      outro(`${emoji.get('white_check_mark')} Use these configurations with 'pod zk create-tree'`);
    });

  return zk;
}