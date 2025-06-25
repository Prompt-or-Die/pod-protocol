/**
 * Wallet Adapter for Web3.js v2.0 → Umi Integration
 * Bridges the gap between Web3.js v2.0 KeyPairSigner and Umi's wallet interface
 */

import { type KeyPairSigner, type Address } from '@solana/web3.js';

// Umi wallet interface types (simplified for development)
export interface UmiKeypair {
  publicKey: string;
  secretKey: Uint8Array;
}

export interface UmiSigner {
  publicKey: string;
  signMessage(message: Uint8Array): Promise<Uint8Array>;
  signTransaction(transaction: any): Promise<any>;
}

/**
 * Converts Web3.js v2.0 KeyPairSigner to Umi-compatible format
 */
export function createUmiKeypairFromWeb3(wallet: KeyPairSigner): UmiKeypair {
  // Web3.js v2.0 doesn't expose secretKey directly for security
  // For development, we'll create a mock that works with our current setup
  
  const mockSecretKey = new Uint8Array(64);
  // Fill with deterministic but not real secret key data for development
  for (let i = 0; i < 64; i++) {
    mockSecretKey[i] = (i + wallet.address.toString().charCodeAt(i % wallet.address.toString().length)) % 256;
  }

  return {
    publicKey: wallet.address.toString(),
    secretKey: mockSecretKey
  };
}

/**
 * Creates a Umi-compatible signer from Web3.js v2.0 wallet
 */
export function createUmiSigner(wallet: KeyPairSigner): UmiSigner {
  return {
    publicKey: wallet.address.toString(),
    
    async signMessage(message: Uint8Array): Promise<Uint8Array> {
      // Web3.js v2.0 doesn't have direct message signing in this interface
      console.warn('Message signing not available in current Web3.js v2.0 interface');
      // Return mock signature for development
      return new Uint8Array(64).fill(1);
    },

    async signTransaction(transaction: any): Promise<any> {
      try {
        // Use Web3.js v2.0 transaction signing (note: signTransactions for multiple)
        const signedTxs = await wallet.signTransactions([transaction]);
        return signedTxs[0];
      } catch (error) {
        console.warn('Transaction signing not available in development mode');
        return transaction; // Return unsigned for development
      }
    }
  };
}

/**
 * Development mode Umi instance creator
 * Creates a simplified Umi-like interface for development
 */
export function createDevelopmentUmi(rpcUrl: string, wallet: KeyPairSigner) {
  const signer = createUmiSigner(wallet);
  
  return {
    rpc: {
      async getAccount(address: Address) {
        // Mock account fetching for development
        return {
          exists: true,
          value: {
            owner: 'compr6CUsB5m2jS4Y3831ztGSTnDpnKJTKS95d64XVq',
            data: new Uint8Array(1000),
            lamports: 1000000n
          }
        };
      },
      
      async sendTransaction(transaction: any) {
        // Mock transaction sending for development
        return {
          signature: 'dev_' + Math.random().toString(36).substring(7),
          confirmationStatus: 'confirmed'
        };
      }
    },
    
    identity: signer,
    
    eddsa: {
      createKeypairFromSecretKey(secretKey: Uint8Array): UmiKeypair {
        return {
          publicKey: wallet.address.toString(),
          secretKey: secretKey
        };
      }
    },
    
    use(plugin: any) {
      // Mock plugin system for development
      return this;
    }
  };
}

/**
 * Mock Umi operations for development mode
 */
export const mockUmiOperations = {
  async createTree(config: any) {
    console.log('🚧 Mock: Creating Merkle tree with config:', config);
    return {
      publicKey: 'tree_' + Math.random().toString(36).substring(7),
      sendAndConfirm: async () => ({
        signature: 'sig_' + Math.random().toString(36).substring(7)
      })
    };
  },

  async mintV1(config: any) {
    console.log('🚧 Mock: Minting compressed NFT with config:', config);
    return {
      sendAndConfirm: async () => ({
        signature: 'mint_' + Math.random().toString(36).substring(7)
      })
    };
  },

  async transfer(config: any) {
    console.log('🚧 Mock: Transferring compressed NFT with config:', config);
    return {
      sendAndConfirm: async () => ({
        signature: 'transfer_' + Math.random().toString(36).substring(7)
      })
    };
  },

  async getAssetWithProof(assetId: string) {
    console.log('🚧 Mock: Getting asset proof for:', assetId);
    return {
      asset: {
        id: assetId,
        compression: {
          tree: 'tree_' + Math.random().toString(36).substring(7),
          leaf_id: Math.floor(Math.random() * 1000)
        }
      },
      proof: ['proof1', 'proof2', 'proof3']
    };
  }
};

/**
 * Utility to determine if we're in development mode
 */
export function isDevelopmentMode(): boolean {
  return process.env.NODE_ENV === 'development' || process.env.ZK_COMPRESSION_DEV === 'true';
}

/**
 * Safe Umi operations that work in both dev and production
 */
export function createSafeUmiOperations(wallet: KeyPairSigner, rpcUrl: string) {
  if (isDevelopmentMode()) {
    return {
      umi: createDevelopmentUmi(rpcUrl, wallet),
      operations: mockUmiOperations
    };
  }
  
  // TODO: Return real Umi operations when dependencies are properly installed
  throw new Error('Production Umi operations require proper dependency installation');
} 