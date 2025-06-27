/**
 * Wallet Adapter Utilities for ZK Compression
 * Provides safe wallet operations and mock functionality for development
 */

import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import { readFileSync } from 'fs';
import { homedir } from 'os';

export interface WalletAdapter {
  address: { toString(): string };
  signTransactions(txs: any[]): Promise<any[]>;
  signTransaction(tx: any): Promise<any>;
}

export interface TreeConfig {
  maxDepth: number;
  maxBufferSize: number;
  canopyDepth: number;
  wallet: string;
}

export interface MintConfig {
  leafOwner: string;
  merkleTree: string;
  metadata: {
    name: string;
    symbol: string;
    uri: string;
    sellerFeeBasisPoints: number;
  };
}

export interface TransferConfig {
  assetWithProof: {
    asset: { id: string };
    proof: string[];
  };
  leafOwner: string;
  newLeafOwner: string;
}

export interface UmiOperations {
  createTree(config: TreeConfig): Promise<{ publicKey: string; sendAndConfirm(): Promise<{ signature: string }> }>;
  mintV1(config: MintConfig): Promise<{ sendAndConfirm(): Promise<{ signature: string }> }>;
  transfer(config: TransferConfig): Promise<{ sendAndConfirm(): Promise<{ signature: string }> }>;
  getAssetWithProof(assetId: string): Promise<{ asset: any; proof: string[] }>;
}

export function isDevelopmentMode(): boolean {
  return process.env.ZK_COMPRESSION_DEV === 'true' || process.env.NODE_ENV === 'development';
}

export function createSafeUmiOperations(wallet: WalletAdapter, endpoint: string): { umi: any; operations: UmiOperations } {
  const connection = new Connection(endpoint);
  
  if (isDevelopmentMode()) {
    return {
      umi: createMockUmi(wallet, connection),
      operations: mockUmiOperations
    };
  }
  
  // In production, this would create real Umi operations
  return {
    umi: createProductionUmi(wallet, connection),
    operations: createProductionOperations(wallet, connection)
  };
}

function createMockUmi(wallet: WalletAdapter, connection: Connection): any {
  return {
    rpc: {
      getConnection: () => connection
    },
    identity: {
      publicKey: wallet.address.toString(),
      signTransaction: wallet.signTransaction.bind(wallet),
      signAllTransactions: wallet.signTransactions.bind(wallet)
    },
    programs: {
      get: () => ({
        name: 'mock-program',
        publicKey: 'mock-program-id'
      })
    }
  };
}

function createProductionUmi(wallet: WalletAdapter, connection: Connection): any {
  // This would implement real Umi setup with @metaplex-foundation/umi
  throw new Error('Production Umi operations not implemented in this demo');
}

function createProductionOperations(wallet: WalletAdapter, connection: Connection): UmiOperations {
  // This would implement real production operations
  throw new Error('Production operations not implemented in this demo');
}

export const mockUmiOperations: UmiOperations = {
  async createTree(config: TreeConfig) {
    const treeId = `tree_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    
    return {
      publicKey: treeId,
      async sendAndConfirm() {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 100));
        
        return {
          signature: `sig_tree_create_${Date.now()}`
        };
      }
    };
  },

  async mintV1(config: MintConfig) {
    return {
      async sendAndConfirm() {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 150));
        
        return {
          signature: `mint_${config.metadata.symbol}_${Date.now()}`
        };
      }
    };
  },

  async transfer(config: TransferConfig) {
    return {
      async sendAndConfirm() {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 120));
        
        return {
          signature: `transfer_${config.assetWithProof.asset.id}_${Date.now()}`
        };
      }
    };
  },

  async getAssetWithProof(assetId: string) {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 80));
    
    return {
      asset: {
        id: assetId,
        compression: {
          tree: `tree_${Math.random().toString(36).substring(7)}`,
          leaf_id: Math.floor(Math.random() * 1000)
        }
      },
      proof: Array.from({ length: 14 }, (_, i) => `proof_${i}_${Math.random().toString(36).substring(7)}`)
    };
  }
};

export function loadWalletFromFile(keypairPath?: string): WalletAdapter {
  const path = keypairPath || `${homedir()}/.config/solana/id.json`;
  
  try {
    const keypairData = JSON.parse(readFileSync(path, 'utf8'));
    const keypair = Keypair.fromSecretKey(Uint8Array.from(keypairData));
    
    return {
      address: { toString: () => keypair.publicKey.toString() },
      signTransactions: async (txs: any[]) => {
        // In a real implementation, this would sign the transactions
        return txs;
      },
      signTransaction: async (tx: any) => {
        // In a real implementation, this would sign the transaction
        return tx;
      }
    };
  } catch (error) {
    if (isDevelopmentMode()) {
      // Return mock wallet in development mode
      return {
        address: { toString: () => 'DEVmockWALLET123456789' },
        signTransactions: async (txs: any[]) => txs,
        signTransaction: async (tx: any) => tx
      };
    }
    
    throw new Error(`Failed to load wallet from ${path}: ${error}`);
  }
}

export function validateTreeConfig(config: TreeConfig): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (config.maxDepth < 3 || config.maxDepth > 30) {
    errors.push('maxDepth must be between 3 and 30');
  }
  
  if (config.maxBufferSize < 1) {
    errors.push('maxBufferSize must be greater than 0');
  }
  
  if (config.canopyDepth < 0 || config.canopyDepth > config.maxDepth) {
    errors.push('canopyDepth must be between 0 and maxDepth');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

export function calculateTreeCapacity(maxDepth: number): number {
  return Math.pow(2, maxDepth);
}

export function calculateTreeStorageCost(maxDepth: number, maxBufferSize: number, canopyDepth: number): number {
  // Simplified storage cost calculation
  const treeSpace = Math.pow(2, maxDepth) * 32; // 32 bytes per leaf
  const bufferSpace = maxBufferSize * 32; // 32 bytes per buffer entry
  const canopySpace = canopyDepth * 32; // 32 bytes per canopy level
  
  const totalBytes = treeSpace + bufferSpace + canopySpace;
  const solPerByte = 0.00000348; // Approximate rent cost per byte
  
  return totalBytes * solPerByte;
}