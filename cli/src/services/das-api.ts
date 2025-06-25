/**
 * Digital Asset Standard (DAS) API Service
 * Provides comprehensive indexing and querying for compressed NFTs on Solana
 */

export interface DASAsset {
  id: string;
  content: {
    metadata: {
      name: string;
      symbol: string;
      description?: string;
    };
    files?: Array<{
      uri: string;
      mime: string;
    }>;
    json_uri?: string;
  };
  compression?: {
    compressed: boolean;
    tree?: string;
    leaf_id?: number;
    data_hash?: string;
    creator_hash?: string;
    asset_hash?: string;
    seq?: number;
  };
  ownership: {
    owner: string;
    delegate?: string;
    ownership_model: string;
  };
  royalty?: {
    royalty_model: string;
    target?: string;
    percent: number;
    basis_points: number;
  };
}

export interface DASAssetProof {
  root: string;
  proof: string[];
  node_index: number;
  leaf: string;
  tree_id: string;
}

export interface DASGetAssetsResponse {
  total: number;
  limit: number;
  page: number;
  items: DASAsset[];
}

export class DASAPIService {
  constructor(private rpcUrl: string, private isDev: boolean = false) {}

  /**
   * Get a specific asset by its ID
   */
  async getAsset(assetId: string): Promise<DASAsset> {
    if (this.isDev) {
      return this.mockGetAsset(assetId);
    }

    const response = await fetch(this.rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: '1',
        method: 'getAsset',
        params: { id: assetId },
      }),
    });

    const { result, error } = await response.json();
    
    if (error) {
      throw new Error(`DAS API Error: ${error.message}`);
    }
    
    return result;
  }

  /**
   * Get multiple assets by their IDs
   */
  async getAssetBatch(assetIds: string[]): Promise<DASAsset[]> {
    if (this.isDev) {
      return Promise.all(assetIds.map(id => this.mockGetAsset(id)));
    }

    const response = await fetch(this.rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: '1',
        method: 'getAssetBatch',
        params: { ids: assetIds },
      }),
    });

    const { result, error } = await response.json();
    
    if (error) {
      throw new Error(`DAS API Error: ${error.message}`);
    }
    
    return result;
  }

  /**
   * Get proof for a compressed asset
   */
  async getAssetProof(assetId: string): Promise<DASAssetProof> {
    if (this.isDev) {
      return this.mockGetAssetProof(assetId);
    }

    const response = await fetch(this.rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: '1',
        method: 'getAssetProof',
        params: { id: assetId },
      }),
    });

    const { result, error } = await response.json();
    
    if (error) {
      throw new Error(`DAS API Error: ${error.message}`);
    }
    
    return result;
  }

  /**
   * Get assets owned by an address
   */
  async getAssetsByOwner(
    ownerAddress: string,
    options: {
      page?: number;
      limit?: number;
      before?: string;
      after?: string;
      sortBy?: 'created' | 'updated';
      sortDirection?: 'asc' | 'desc';
    } = {}
  ): Promise<DASGetAssetsResponse> {
    if (this.isDev) {
      return this.mockGetAssetsByOwner(ownerAddress, options);
    }

    const params = {
      ownerAddress,
      page: options.page || 1,
      limit: options.limit || 1000,
      ...(options.before && { before: options.before }),
      ...(options.after && { after: options.after }),
      ...(options.sortBy && { sortBy: options.sortBy }),
      ...(options.sortDirection && { sortDirection: options.sortDirection }),
    };

    const response = await fetch(this.rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: '1',
        method: 'getAssetsByOwner',
        params,
      }),
    });

    const { result, error } = await response.json();
    
    if (error) {
      throw new Error(`DAS API Error: ${error.message}`);
    }
    
    return result;
  }

  /**
   * Get assets by group (e.g., collection)
   */
  async getAssetsByGroup(
    groupKey: string,
    groupValue: string,
    options: {
      page?: number;
      limit?: number;
      sortBy?: 'created' | 'updated';
      sortDirection?: 'asc' | 'desc';
    } = {}
  ): Promise<DASGetAssetsResponse> {
    if (this.isDev) {
      return this.mockGetAssetsByGroup(groupKey, groupValue, options);
    }

    const params = {
      groupKey,
      groupValue,
      page: options.page || 1,
      limit: options.limit || 1000,
      ...(options.sortBy && { sortBy: options.sortBy }),
      ...(options.sortDirection && { sortDirection: options.sortDirection }),
    };

    const response = await fetch(this.rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: '1',
        method: 'getAssetsByGroup',
        params,
      }),
    });

    const { result, error } = await response.json();
    
    if (error) {
      throw new Error(`DAS API Error: ${error.message}`);
    }
    
    return result;
  }

  /**
   * Search assets with various filters
   */
  async searchAssets(filters: {
    owner?: string;
    creator?: string;
    authority?: string;
    grouping?: Array<{ group_key: string; group_value: string }>;
    burnt?: boolean;
    compressed?: boolean;
    compressible?: boolean;
    frozen?: boolean;
    page?: number;
    limit?: number;
  }): Promise<DASGetAssetsResponse> {
    if (this.isDev) {
      return this.mockSearchAssets(filters);
    }

    const response = await fetch(this.rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: '1',
        method: 'searchAssets',
        params: filters,
      }),
    });

    const { result, error } = await response.json();
    
    if (error) {
      throw new Error(`DAS API Error: ${error.message}`);
    }
    
    return result;
  }

  /**
   * Test DAS API connection
   */
  async testConnection(): Promise<{ healthy: boolean; version?: string; latency: number }> {
    const startTime = Date.now();
    
    if (this.isDev) {
      return {
        healthy: true,
        version: 'development-mock',
        latency: Math.random() * 50 + 10 // Mock 10-60ms latency
      };
    }

    try {
      // Test with a simple getAsset call for a known asset or health check
      const response = await fetch(`${this.rpcUrl.replace('/v1', '')}/health`, {
        method: 'GET',
      });

      const latency = Date.now() - startTime;
      
      if (response.ok) {
        const health = await response.json();
        return {
          healthy: true,
          version: health.version,
          latency
        };
      } else {
        return {
          healthy: false,
          latency
        };
      }
    } catch (error) {
      return {
        healthy: false,
        latency: Date.now() - startTime
      };
    }
  }

  // Mock methods for development mode
  private mockGetAsset(assetId: string): DASAsset {
    return {
      id: assetId,
      content: {
        metadata: {
          name: `Mock NFT ${assetId.substring(0, 8)}`,
          symbol: 'MOCK',
          description: 'A mock compressed NFT for development'
        },
        files: [{
          uri: 'https://example.com/mock-image.png',
          mime: 'image/png'
        }],
        json_uri: 'https://example.com/mock-metadata.json'
      },
      compression: {
        compressed: true,
        tree: 'tree_' + Math.random().toString(36).substring(7),
        leaf_id: Math.floor(Math.random() * 1000),
        data_hash: 'data_' + Math.random().toString(36).substring(7),
        creator_hash: 'creator_' + Math.random().toString(36).substring(7),
        asset_hash: 'asset_' + Math.random().toString(36).substring(7),
        seq: Math.floor(Math.random() * 100)
      },
      ownership: {
        owner: 'owner_' + Math.random().toString(36).substring(7),
        ownership_model: 'single'
      },
      royalty: {
        royalty_model: 'creators',
        percent: 5,
        basis_points: 500
      }
    };
  }

  private mockGetAssetProof(assetId: string): DASAssetProof {
    return {
      root: 'root_' + Math.random().toString(36).substring(7),
      proof: Array.from({ length: 14 }, () => 'proof_' + Math.random().toString(36).substring(7)),
      node_index: Math.floor(Math.random() * 1000),
      leaf: 'leaf_' + Math.random().toString(36).substring(7),
      tree_id: 'tree_' + Math.random().toString(36).substring(7)
    };
  }

  private mockGetAssetsByOwner(ownerAddress: string, options: any): DASGetAssetsResponse {
    const mockAssets = Array.from({ length: Math.min(options.limit || 10, 20) }, (_, i) => 
      this.mockGetAsset(`asset_${ownerAddress.substring(0, 8)}_${i}`)
    );

    return {
      total: mockAssets.length,
      limit: options.limit || 1000,
      page: options.page || 1,
      items: mockAssets
    };
  }

  private mockGetAssetsByGroup(groupKey: string, groupValue: string, options: any): DASGetAssetsResponse {
    const mockAssets = Array.from({ length: Math.min(options.limit || 10, 15) }, (_, i) => 
      this.mockGetAsset(`group_${groupKey}_${groupValue}_${i}`)
    );

    return {
      total: mockAssets.length,
      limit: options.limit || 1000,
      page: options.page || 1,
      items: mockAssets
    };
  }

  private mockSearchAssets(filters: any): DASGetAssetsResponse {
    const mockAssets = Array.from({ length: Math.min(filters.limit || 10, 25) }, (_, i) => 
      this.mockGetAsset(`search_result_${i}`)
    );

    return {
      total: mockAssets.length,
      limit: filters.limit || 1000,
      page: filters.page || 1,
      items: mockAssets
    };
  }
}

/**
 * Create DAS API service instance with proper configuration
 */
export function createDASAPI(rpcUrl: string, isDevelopment = false): DASAPIService {
  // Ensure RPC URL supports DAS API
  const dasCompatibleUrls = [
    'helius-rpc.com',
    'rpc.helius.xyz',
    'mainnet.helius-rpc.com',
    'devnet.helius-rpc.com'
  ];

  const isDASCompatible = dasCompatibleUrls.some(url => rpcUrl.includes(url));
  
  if (!isDASCompatible && !isDevelopment) {
    console.warn('⚠️  RPC endpoint may not support DAS API. Consider using Helius RPC for full DAS support.');
  }

  return new DASAPIService(rpcUrl, isDevelopment);
}

/**
 * Utility functions for DAS API integration
 */
export const DASUtils = {
  /**
   * Filter compressed assets from a list of assets
   */
  filterCompressedAssets(assets: DASAsset[]): DASAsset[] {
    return assets.filter(asset => asset.compression?.compressed === true);
  },

  /**
   * Group assets by their tree
   */
  groupAssetsByTree(assets: DASAsset[]): Record<string, DASAsset[]> {
    const grouped: Record<string, DASAsset[]> = {};
    
    assets.forEach(asset => {
      const tree = asset.compression?.tree || 'unknown';
      if (!grouped[tree]) {
        grouped[tree] = [];
      }
      grouped[tree].push(asset);
    });
    
    return grouped;
  },

  /**
   * Extract collection information from assets
   */
  extractCollections(assets: DASAsset[]): Array<{ key: string; count: number }> {
    const collections: Record<string, number> = {};
    
    assets.forEach(asset => {
      // Look for collection information in grouping or metadata
      const collectionKey = asset.content.metadata.symbol || 'unknown';
      collections[collectionKey] = (collections[collectionKey] || 0) + 1;
    });
    
    return Object.entries(collections).map(([key, count]) => ({ key, count }));
  },

  /**
   * Calculate storage savings for compressed assets
   */
  calculateStorageSavings(compressedCount: number, regularAccountCost = 0.001): {
    regular_cost: string;
    compressed_cost: string;
    savings: string;
    multiplier: string;
  } {
    const regularCost = compressedCount * regularAccountCost;
    const compressedCost = regularCost / 5000; // ~5000x savings
    const savings = regularCost - compressedCost;
    const multiplier = (regularCost / compressedCost).toFixed(0);

    return {
      regular_cost: `${regularCost.toFixed(4)} SOL`,
      compressed_cost: `${compressedCost.toFixed(6)} SOL`,
      savings: `${savings.toFixed(4)} SOL`,
      multiplier: `${multiplier}x`
    };
  }
}; 