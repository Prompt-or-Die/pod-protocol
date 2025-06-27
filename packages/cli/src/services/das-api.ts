/**
 * Digital Asset Standard (DAS) API Integration
 * Provides interface for querying compressed NFTs and Merkle trees
 */

import { Connection } from '@solana/web3.js';

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
    tree: string;
    leaf_id: number;
    data_hash: string;
    creator_hash: string;
    asset_hash: string;
    seq: number;
  };
  ownership: {
    owner: string;
    ownership_model: string;
  };
  royalty?: {
    royalty_model: string;
    percent: number;
    basis_points: number;
  };
}

export interface DASResponse<T> {
  items: T[];
  total: number;
  limit: number;
  page: number;
}

export interface AssetProof {
  root: string;
  proof: string[];
  node_index: number;
  leaf: string;
  tree_id: string;
}

export interface SearchOptions {
  compressed?: boolean;
  limit?: number;
  page?: number;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
}

export class DASAPI {
  private connection: Connection;
  private endpoint: string;
  private developmentMode: boolean;

  constructor(endpoint: string, developmentMode = false) {
    this.endpoint = endpoint;
    this.developmentMode = developmentMode;
    this.connection = new Connection(endpoint);
  }

  async testConnection(): Promise<{ healthy: boolean; version: string; latency: number }> {
    if (this.developmentMode) {
      const start = Date.now();
      await new Promise(resolve => setTimeout(resolve, 10)); // Simulate latency
      return {
        healthy: true,
        version: 'development-mock',
        latency: Date.now() - start
      };
    }

    try {
      const start = Date.now();
      await this.connection.getVersion();
      return {
        healthy: true,
        version: 'production',
        latency: Date.now() - start
      };
    } catch (error) {
      return {
        healthy: false,
        version: 'unknown',
        latency: -1
      };
    }
  }

  async getAsset(assetId: string): Promise<DASAsset> {
    if (this.developmentMode) {
      return this.createMockAsset(assetId);
    }

    try {
      const response = await fetch(`${this.endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 'get-asset',
          method: 'getAsset',
          params: { id: assetId }
        })
      });

      const data = await response.json();
      return data.result;
    } catch (error) {
      throw new Error(`Failed to fetch asset ${assetId}: ${error}`);
    }
  }

  async getAssetsByOwner(
    owner: string, 
    options: { limit?: number; page?: number } = {}
  ): Promise<DASResponse<DASAsset>> {
    if (this.developmentMode) {
      const limit = options.limit || 20;
      const page = options.page || 1;
      const items = Array.from({ length: Math.min(limit, 5) }, (_, i) => 
        this.createMockAsset(`${owner}_asset_${page}_${i}`)
      );
      
      return {
        items,
        total: 25,
        limit,
        page
      };
    }

    try {
      const response = await fetch(`${this.endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 'get-assets-by-owner',
          method: 'getAssetsByOwner',
          params: { 
            ownerAddress: owner,
            limit: options.limit || 20,
            page: options.page || 1
          }
        })
      });

      const data = await response.json();
      return data.result;
    } catch (error) {
      throw new Error(`Failed to fetch assets for owner ${owner}: ${error}`);
    }
  }

  async getAssetProof(assetId: string): Promise<AssetProof> {
    if (this.developmentMode) {
      return {
        root: `root_${Math.random().toString(36).substring(7)}`,
        proof: Array.from({ length: 14 }, (_, i) => `proof_${i}_${Math.random().toString(36).substring(7)}`),
        node_index: Math.floor(Math.random() * 1000),
        leaf: `leaf_${Math.random().toString(36).substring(7)}`,
        tree_id: `tree_${Math.random().toString(36).substring(7)}`
      };
    }

    try {
      const response = await fetch(`${this.endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 'get-asset-proof',
          method: 'getAssetProof',
          params: { id: assetId }
        })
      });

      const data = await response.json();
      return data.result;
    } catch (error) {
      throw new Error(`Failed to fetch proof for asset ${assetId}: ${error}`);
    }
  }

  async searchAssets(options: SearchOptions = {}): Promise<DASResponse<DASAsset>> {
    if (this.developmentMode) {
      const limit = options.limit || 20;
      const page = options.page || 1;
      const items = Array.from({ length: Math.min(limit, 8) }, (_, i) => 
        this.createMockAsset(`search_result_${page}_${i}`, options.compressed !== false)
      );
      
      return {
        items,
        total: 50,
        limit,
        page
      };
    }

    try {
      const response = await fetch(`${this.endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 'search-assets',
          method: 'searchAssets',
          params: options
        })
      });

      const data = await response.json();
      return data.result;
    } catch (error) {
      throw new Error(`Failed to search assets: ${error}`);
    }
  }

  async getAssetBatch(assetIds: string[]): Promise<DASAsset[]> {
    if (this.developmentMode) {
      return assetIds.map(id => this.createMockAsset(id));
    }

    try {
      const response = await fetch(`${this.endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 'get-asset-batch',
          method: 'getAssetBatch',
          params: { ids: assetIds }
        })
      });

      const data = await response.json();
      return data.result;
    } catch (error) {
      throw new Error(`Failed to fetch asset batch: ${error}`);
    }
  }

  private createMockAsset(id: string, compressed = true): DASAsset {
    return {
      id,
      content: {
        metadata: {
          name: `Mock NFT ${id}`,
          symbol: 'MOCK',
          description: `A mock compressed NFT for testing purposes`
        },
        files: [{
          uri: `https://example.com/${id}.png`,
          mime: 'image/png'
        }],
        json_uri: `https://example.com/${id}.json`
      },
      compression: compressed ? {
        compressed: true,
        tree: `tree_${Math.random().toString(36).substring(7)}`,
        leaf_id: Math.floor(Math.random() * 1000),
        data_hash: `data_${Math.random().toString(36).substring(7)}`,
        creator_hash: `creator_${Math.random().toString(36).substring(7)}`,
        asset_hash: `asset_${Math.random().toString(36).substring(7)}`,
        seq: Math.floor(Math.random() * 100)
      } : undefined,
      ownership: {
        owner: `owner_${Math.random().toString(36).substring(7)}`,
        ownership_model: 'single'
      },
      royalty: {
        royalty_model: 'creators',
        percent: 5,
        basis_points: 500
      }
    };
  }
}

export class DASUtils {
  static filterCompressedAssets(assets: DASAsset[]): DASAsset[] {
    return assets.filter(asset => asset.compression?.compressed === true);
  }

  static groupAssetsByTree(assets: DASAsset[]): Record<string, DASAsset[]> {
    const grouped: Record<string, DASAsset[]> = {};
    
    assets.forEach(asset => {
      if (asset.compression?.tree) {
        if (!grouped[asset.compression.tree]) {
          grouped[asset.compression.tree] = [];
        }
        grouped[asset.compression.tree].push(asset);
      }
    });
    
    return grouped;
  }

  static calculateStorageSavings(nftCount: number) {
    // Regular NFT cost: ~0.012 SOL per NFT (account rent)
    const regularCostPerNFT = 0.012;
    const regularCost = nftCount * regularCostPerNFT;
    
    // Compressed NFT cost: ~0.000001 SOL per NFT (tree space)
    const compressedCostPerNFT = 0.000001;
    const compressedCost = nftCount * compressedCostPerNFT;
    
    const savings = regularCost - compressedCost;
    const multiplier = regularCost > 0 ? Math.round(regularCost / compressedCost) : 0;
    
    return {
      regular_cost: `${regularCost.toFixed(4)} SOL`,
      compressed_cost: `${compressedCost.toFixed(6)} SOL`,
      savings: `${savings.toFixed(4)} SOL`,
      multiplier: `${multiplier}x`
    };
  }

  static extractCollections(assets: DASAsset[]): Array<{ key: string; count: number }> {
    const collections: Record<string, number> = {};
    
    assets.forEach(asset => {
      const collectionKey = asset.content.metadata.symbol || 'Unknown';
      collections[collectionKey] = (collections[collectionKey] || 0) + 1;
    });
    
    return Object.entries(collections).map(([key, count]) => ({ key, count }));
  }
}

export function createDASAPI(endpoint: string, developmentMode = false): DASAPI {
  return new DASAPI(endpoint, developmentMode);
}