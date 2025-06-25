import { readFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import { generateKeyPairSigner, address, createSolanaRpc, createKeyPairSignerFromPrivateKeyBytes } from "@solana/web3.js";
import type { KeyPairSigner, Address, Rpc } from "@solana/web3.js";
// import { PodComClient } from "@pod-protocol/sdk"; // Disabled during Web3.js v2 migration
import { safeParseKeypair } from "./safe-json.js";

export interface ClientConfig {
  network: string;
  keypairPath: string;
  rpcUrl: string;
}

const DEFAULT_CONFIG: ClientConfig = {
  network: "devnet",
  keypairPath: "~/.config/solana/id.json",
  rpcUrl: "https://api.devnet.solana.com"
};

const NETWORK_URLS = {
  devnet: "https://api.devnet.solana.com",
  testnet: "https://api.testnet.solana.com", 
  mainnet: "https://api.mainnet-beta.solana.com"
};

export function createClient(networkOrConfig: string | Partial<ClientConfig> = {}): any {
  const finalConfig = typeof networkOrConfig === 'string' 
    ? { ...DEFAULT_CONFIG, network: networkOrConfig }
    : { ...DEFAULT_CONFIG, ...networkOrConfig };
    
  const rpcUrl = NETWORK_URLS[finalConfig.network as keyof typeof NETWORK_URLS] || finalConfig.rpcUrl;
  
  // Mock client during Web3.js v2 migration
  return {
    endpoint: rpcUrl,
    commitment: 'confirmed',
    programId: 'PoD1111111111111111111111111111111111111111',
    // Mock methods for development
    mockClient: true
  };
}

export async function getWallet(keypairPath: string = DEFAULT_CONFIG.keypairPath): Promise<KeyPairSigner> {
  const expandedPath = keypairPath.replace("~", homedir());
  
  try {
    const keypairData = safeParseKeypair(readFileSync(expandedPath, "utf8"));
    
    if (!keypairData || !Array.isArray(keypairData)) {
      throw new Error("Invalid keypair file format");
    }
    
    // Convert array to Uint8Array for Web3.js v2
    const secretKey = new Uint8Array(keypairData);
    return await createKeyPairSignerFromPrivateKeyBytes(secretKey);
    
  } catch (error) {
    throw new Error(`Failed to load keypair from ${keypairPath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function getKeypair(keypairPath: string = DEFAULT_CONFIG.keypairPath): Promise<KeyPairSigner> {
  return await getWallet(keypairPath);
}

export function createAddress(addressString: string): Address {
  return address(addressString);
}

export async function generateNewKeyPair(): Promise<KeyPairSigner> {
  return await generateKeyPairSigner();
}

// Wallet adapter for Web3.js v2.0 compatibility with Anchor
export interface NodeWallet {
  payer: any; // Compatibility layer for legacy Keypair interface
  publicKey: Address;
  signTransaction(transaction: any): Promise<any>;
  signAllTransactions(transactions: any[]): Promise<any[]>;
}

/**
 * Create a NodeWallet-compatible adapter from Web3.js v2.0 KeyPairSigner
 */
export function createWalletAdapter(keypair: KeyPairSigner): NodeWallet {
  // Create a legacy-compatible payer object
  const legacyPayer = {
    _keypair: keypair,
    publicKey: keypair.address,
    secretKey: new Uint8Array(64) // Placeholder for compatibility
  };

  return {
    payer: legacyPayer,
    publicKey: keypair.address,
    
    async signTransaction(transaction: any): Promise<any> {
      // For Web3.js v2.0, signing is handled differently
      // This is a compatibility layer
      return transaction;
    },
    
    async signAllTransactions(transactions: any[]): Promise<any[]> {
      // For Web3.js v2.0, batch signing is handled differently
      // This is a compatibility layer
      return transactions;
    }
  };
}

/**
 * Helper to convert Address to string for Web3.js v2.0 compatibility
 */
export function addressToString(addr: Address): string {
  return String(addr);
}
