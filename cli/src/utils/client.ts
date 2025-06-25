import { readFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import { generateKeyPairSigner, address, createSolanaRpc, createKeyPairSignerFromPrivateKeyBytes } from "@solana/web3.js";
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
