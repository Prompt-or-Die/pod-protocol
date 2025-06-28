/**
 * ZK Compression Integration Tests
 * Tests for concurrent Merkle trees, compressed NFTs, and DAS API integration
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { createDASAPI, DASUtils } from '../src/services/das-api';
import { createSafeUmiOperations, isDevelopmentMode, mockUmiOperations } from '../src/utils/wallet-adapter';
import { ALL_DEPTH_SIZE_PAIRS, getConcurrentMerkleTreeAccountSize } from '../src/commands/zk-compression';

// Mock wallet for testing
const mockWallet = {
  address: { toString: () => 'DEVtESTwALLET123456789' },
  signTransactions: async (txs: any[]) => txs,
  signTransaction: async (tx: any) => tx
};

describe('ZK Compression Integration Tests', () => {
  let dasAPI: any;
  
  beforeAll(() => {
    // Set up development mode for testing
    process.env.ZK_COMPRESSION_DEV = 'true';
    dasAPI = createDASAPI('https://devnet.helius-rpc.com', true);
  });

  afterAll(() => {
    // Clean up environment
    delete process.env.ZK_COMPRESSION_DEV;
  });

  describe('Tree Configuration & Cost Calculations', () => {
    test('should validate depth/buffer size pairs', () => {
      expect(ALL_DEPTH_SIZE_PAIRS).toBeDefined();
      expect(ALL_DEPTH_SIZE_PAIRS.length).toBeGreaterThan(0);
      
      // Check that each pair has required properties
      ALL_DEPTH_SIZE_PAIRS.forEach(pair => {
        expect(pair).toHaveProperty('maxDepth');
        expect(pair).toHaveProperty('maxBufferSize');
        expect(pair.maxDepth).toBeGreaterThanOrEqual(3);
        expect(pair.maxDepth).toBeLessThanOrEqual(30);
      });
    });

    test('should calculate tree storage costs correctly', () => {
      const testCases = [
        { depth: 14, buffer: 64, canopy: 10 },
        { depth: 20, buffer: 256, canopy: 10 },
        { depth: 24, buffer: 1024, canopy: 14 }
      ];

      testCases.forEach(({ depth, buffer, canopy }) => {
        const size = getConcurrentMerkleTreeAccountSize(depth, buffer, canopy);
        expect(size).toBeGreaterThan(0);
        
        const capacity = Math.pow(2, depth);
        expect(capacity).toBeGreaterThan(0);
        
        // Verify capacity grows exponentially with depth
        if (depth > 14) {
          const smallerSize = getConcurrentMerkleTreeAccountSize(14, 64, 10);
          expect(size).toBeGreaterThan(smallerSize);
        }
      });
    });

    test('should find suitable configurations for NFT counts', () => {
      const testCounts = [1000, 10000, 100000, 1000000];
      
      testCounts.forEach(nftCount => {
        const suitableConfigs = ALL_DEPTH_SIZE_PAIRS.filter(pair => {
          const capacity = Math.pow(2, pair.maxDepth);
          return capacity >= nftCount;
        });
        
        expect(suitableConfigs.length).toBeGreaterThan(0);
        
        // Verify the first suitable config actually fits
        const firstConfig = suitableConfigs[0];
        const capacity = Math.pow(2, firstConfig.maxDepth);
        expect(capacity).toBeGreaterThanOrEqual(nftCount);
      });
    });
  });

  describe('Wallet Adapter Integration', () => {
    test('should create safe Umi operations in development mode', () => {
      const { umi, operations } = createSafeUmiOperations(mockWallet as any, 'https://api.devnet.solana.com');
      
      expect(umi).toBeDefined();
      expect(operations).toBeDefined();
      expect(operations.createTree).toBeDefined();
      expect(operations.mintV1).toBeDefined();
      expect(operations.transfer).toBeDefined();
      expect(operations.getAssetWithProof).toBeDefined();
    });

    test('should detect development mode correctly', () => {
      expect(isDevelopmentMode()).toBe(true);
    });

    test('should create mock tree with proper configuration', async () => {
      const treeConfig = {
        maxDepth: 14,
        maxBufferSize: 64,
        canopyDepth: 10,
        wallet: mockWallet.address.toString()
      };

      const result = await mockUmiOperations.createTree(treeConfig);
      expect(result).toBeDefined();
      expect(result.publicKey).toBeDefined();
      expect(result.sendAndConfirm).toBeDefined();

      const confirmation = await result.sendAndConfirm();
      expect(confirmation.signature).toBeDefined();
      expect(confirmation.signature).toMatch(/^sig_/);
    });

    test('should mint compressed NFT with metadata', async () => {
      const mintConfig = {
        leafOwner: mockWallet.address.toString(),
        merkleTree: 'tree_test123',
        metadata: {
          name: 'Test Compressed NFT',
          symbol: 'TEST',
          uri: 'https://example.com/metadata.json',
          sellerFeeBasisPoints: 500
        }
      };

      const result = await mockUmiOperations.mintV1(mintConfig);
      expect(result).toBeDefined();
      expect(result.sendAndConfirm).toBeDefined();

      const confirmation = await result.sendAndConfirm();
      expect(confirmation.signature).toBeDefined();
      expect(confirmation.signature).toMatch(/^mint_/);
    });

    test('should transfer compressed NFT with proof', async () => {
      const assetId = 'asset_test123';
      const transferConfig = {
        assetWithProof: { asset: { id: assetId }, proof: ['proof1', 'proof2'] },
        leafOwner: mockWallet.address.toString(),
        newLeafOwner: 'new_owner_test456'
      };

      const result = await mockUmiOperations.transfer(transferConfig);
      expect(result).toBeDefined();
      expect(result.sendAndConfirm).toBeDefined();

      const confirmation = await result.sendAndConfirm();
      expect(confirmation.signature).toBeDefined();
      expect(confirmation.signature).toMatch(/^transfer_/);
    });
  });

  describe('DAS API Integration', () => {
    test('should create DAS API service in development mode', () => {
      expect(dasAPI).toBeDefined();
      expect(dasAPI.getAsset).toBeDefined();
      expect(dasAPI.getAssetsByOwner).toBeDefined();
      expect(dasAPI.getAssetProof).toBeDefined();
      expect(dasAPI.searchAssets).toBeDefined();
    });

    test('should test connection successfully in development mode', async () => {
      const connectionTest = await dasAPI.testConnection();
      
      expect(connectionTest).toBeDefined();
      expect(connectionTest.healthy).toBe(true);
      expect(connectionTest.version).toBe('development-mock');
      expect(connectionTest.latency).toBeGreaterThan(0);
      expect(connectionTest.latency).toBeLessThan(100);
    });

    test('should fetch mock asset by ID', async () => {
      const assetId = 'test_asset_123';
      const asset = await dasAPI.getAsset(assetId);
      
      expect(asset).toBeDefined();
      expect(asset.id).toBe(assetId);
      expect(asset.content).toBeDefined();
      expect(asset.content.metadata).toBeDefined();
      expect(asset.content.metadata.name).toContain('Mock NFT');
      expect(asset.compression).toBeDefined();
      expect(asset.compression.compressed).toBe(true);
      expect(asset.ownership).toBeDefined();
    });

    test('should fetch assets by owner with pagination', async () => {
      const ownerAddress = 'owner_test_123';
      const response = await dasAPI.getAssetsByOwner(ownerAddress, {
        limit: 10,
        page: 1
      });
      
      expect(response).toBeDefined();
      expect(response.items).toBeDefined();
      expect(response.items.length).toBeGreaterThan(0);
      expect(response.items.length).toBeLessThanOrEqual(10);
      expect(response.total).toBeDefined();
      expect(response.limit).toBe(10);
      expect(response.page).toBe(1);
      
      // Verify each asset has required properties
      response.items.forEach(asset => {
        expect(asset.id).toBeDefined();
        expect(asset.content).toBeDefined();
        expect(asset.ownership).toBeDefined();
      });
    });

    test('should get asset proof for compressed NFT', async () => {
      const assetId = 'test_asset_proof_123';
      const proof = await dasAPI.getAssetProof(assetId);
      
      expect(proof).toBeDefined();
      expect(proof.root).toBeDefined();
      expect(proof.proof).toBeDefined();
      expect(Array.isArray(proof.proof)).toBe(true);
      expect(proof.proof.length).toBeGreaterThan(0);
      expect(proof.node_index).toBeDefined();
      expect(proof.leaf).toBeDefined();
      expect(proof.tree_id).toBeDefined();
    });

    test('should search assets with filters', async () => {
      const searchResults = await dasAPI.searchAssets({
        compressed: true,
        limit: 15,
        page: 1
      });
      
      expect(searchResults).toBeDefined();
      expect(searchResults.items).toBeDefined();
      expect(searchResults.items.length).toBeGreaterThan(0);
      expect(searchResults.items.length).toBeLessThanOrEqual(15);
      
      // Verify all results are compressed
      const compressedAssets = DASUtils.filterCompressedAssets(searchResults.items);
      expect(compressedAssets.length).toBe(searchResults.items.length);
    });
  });

  describe('DAS Utils Integration', () => {
    test('should filter compressed assets correctly', async () => {
      const allAssets = await dasAPI.getAssetsByOwner('test_owner', { limit: 20 });
      const compressedAssets = DASUtils.filterCompressedAssets(allAssets.items);
      
      expect(Array.isArray(compressedAssets)).toBe(true);
      compressedAssets.forEach(asset => {
        expect(asset.compression?.compressed).toBe(true);
      });
    });

    test('should group assets by tree correctly', async () => {
      const assets = await dasAPI.getAssetsByOwner('test_owner', { limit: 10 });
      const compressedAssets = DASUtils.filterCompressedAssets(assets.items);
      const groupedAssets = DASUtils.groupAssetsByTree(compressedAssets);
      
      expect(typeof groupedAssets).toBe('object');
      
      Object.keys(groupedAssets).forEach(treeId => {
        expect(Array.isArray(groupedAssets[treeId])).toBe(true);
        groupedAssets[treeId].forEach(asset => {
          expect(asset.compression?.tree).toBe(treeId);
        });
      });
    });

    test('should calculate storage savings accurately', () => {
      const testCases = [
        { count: 1000, expectedMultiplier: 12000 },
        { count: 10000, expectedMultiplier: 12000 },
        { count: 100000, expectedMultiplier: 12000 }
      ];

      testCases.forEach(({ count, expectedMultiplier }) => {
        const savings = DASUtils.calculateStorageSavings(count);
        
        expect(savings).toBeDefined();
        expect(savings.regular_cost).toBeDefined();
        expect(savings.compressed_cost).toBeDefined();
        expect(savings.savings).toBeDefined();
        expect(savings.multiplier).toBeDefined();
        
        // Verify the multiplier is approximately correct
        expect(parseInt(savings.multiplier.replace('x', ''))).toBeCloseTo(expectedMultiplier, -2);
        
        // Verify savings calculation
        const regularCost = parseFloat(savings.regular_cost.replace(' SOL', ''));
        const compressedCost = parseFloat(savings.compressed_cost.replace(' SOL', ''));
        const actualSavings = parseFloat(savings.savings.replace(' SOL', ''));
        
        expect(actualSavings).toBeCloseTo(regularCost - compressedCost, 6);
        expect(compressedCost).toBeLessThan(regularCost);
      });
    });

    test('should extract collection information', async () => {
      const assets = await dasAPI.getAssetsByOwner('test_owner', { limit: 20 });
      const collections = DASUtils.extractCollections(assets.items);
      
      expect(Array.isArray(collections)).toBe(true);
      collections.forEach(collection => {
        expect(collection).toHaveProperty('key');
        expect(collection).toHaveProperty('count');
        expect(typeof collection.key).toBe('string');
        expect(typeof collection.count).toBe('number');
        expect(collection.count).toBeGreaterThan(0);
      });
    });
  });

  describe('Error Handling & Edge Cases', () => {
    test('should handle invalid asset IDs gracefully', async () => {
      // This should not throw in development mode, but return mock data
      const asset = await dasAPI.getAsset('invalid_asset_id');
      expect(asset).toBeDefined();
      expect(asset.id).toBe('invalid_asset_id');
    });

    test('should handle empty search results', async () => {
      const searchResults = await dasAPI.searchAssets({
        compressed: true,
        limit: 0 // Request 0 items
      });
      
      expect(searchResults).toBeDefined();
      expect(Array.isArray(searchResults.items)).toBe(true);
    });

    test('should handle filtering empty asset arrays', () => {
      const emptyAssets: any[] = [];
      const filtered = DASUtils.filterCompressedAssets(emptyAssets);
      const grouped = DASUtils.groupAssetsByTree(emptyAssets);
      const collections = DASUtils.extractCollections(emptyAssets);
      
      expect(Array.isArray(filtered)).toBe(true);
      expect(filtered.length).toBe(0);
      expect(typeof grouped).toBe('object');
      expect(Object.keys(grouped).length).toBe(0);
      expect(Array.isArray(collections)).toBe(true);
      expect(collections.length).toBe(0);
    });

    test('should calculate savings for zero assets', () => {
      const savings = DASUtils.calculateStorageSavings(0);
      
      expect(savings).toBeDefined();
      expect(savings.regular_cost).toBe('0.0000 SOL');
      expect(savings.compressed_cost).toBe('0.000000 SOL');
      expect(savings.savings).toBe('0.0000 SOL');
    });
  });

  describe('Performance & Scalability', () => {
    test('should handle large asset queries efficiently', async () => {
      const startTime = Date.now();
      
      const largeQuery = await dasAPI.getAssetsByOwner('test_owner', {
        limit: 1000
      });
      
      const endTime = Date.now();
      const queryTime = endTime - startTime;
      
      expect(largeQuery).toBeDefined();
      expect(queryTime).toBeLessThan(1000); // Should complete within 1 second in dev mode
    });

    test('should handle batch asset requests', async () => {
      const assetIds = Array.from({ length: 50 }, (_, i) => `batch_asset_${i}`);
      
      const startTime = Date.now();
      const batchResults = await dasAPI.getAssetBatch(assetIds);
      const endTime = Date.now();
      
      expect(batchResults).toBeDefined();
      expect(Array.isArray(batchResults)).toBe(true);
      expect(batchResults.length).toBe(assetIds.length);
      expect(endTime - startTime).toBeLessThan(2000); // Should complete within 2 seconds
    });

    test('should efficiently group large numbers of assets', async () => {
      const assets = await dasAPI.getAssetsByOwner('test_owner', { limit: 500 });
      
      const startTime = Date.now();
      const grouped = DASUtils.groupAssetsByTree(assets.items);
      const endTime = Date.now();
      
      expect(endTime - startTime).toBeLessThan(100); // Should group within 100ms
      expect(typeof grouped).toBe('object');
    });
  });
}); 