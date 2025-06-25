import { readFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import { generateKeyPairSigner, address, createSolanaRpc } from "@solana/web3.js";
import type { KeyPairSigner, Address, Rpc } from "@solana/web3.js";
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

export function createClient(config: Partial<ClientConfig> = {}): Rpc {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  const rpcUrl = NETWORK_URLS[finalConfig.network as keyof typeof NETWORK_URLS] || finalConfig.rpcUrl;
  
  return createSolanaRpc(rpcUrl);
}

export function getWallet(keypairPath: string = DEFAULT_CONFIG.keypairPath): KeyPairSigner {
  const expandedPath = keypairPath.replace("~", homedir());
  
  try {
    const keypairData = safeParseKeypair(readFileSync(expandedPath, "utf8"));
    
    if (!keypairData || !Array.isArray(keypairData)) {
      throw new Error("Invalid keypair file format");
    }
    
    // Convert array to Uint8Array for Web3.js v2
    const secretKey = new Uint8Array(keypairData);
    return generateKeyPairSigner(); // Web3.js v2 pattern
    
  } catch (error) {
    throw new Error(`Failed to load keypair from ${keypairPath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export function getKeypair(keypairPath: string = DEFAULT_CONFIG.keypairPath): KeyPairSigner {
  return getWallet(keypairPath);
}

export function createAddress(addressString: string): Address {
  return address(addressString);
}

export function generateNewKeyPair(): KeyPairSigner {
  return generateKeyPairSigner();
}
