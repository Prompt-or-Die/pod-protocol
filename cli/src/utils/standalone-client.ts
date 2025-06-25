import { readFileSync } from "fs";
import { homedir } from "os";

// Standalone client utilities for CLI during Web3.js v2 migration
// This ensures the CLI works independently while the SDK is being migrated

export interface StandaloneConfig {
  network: string;
  keypairPath: string;
  rpcUrl: string;
}

const DEFAULT_CONFIG: StandaloneConfig = {
  network: "devnet",
  keypairPath: "~/.config/solana/id.json",
  rpcUrl: "https://api.devnet.solana.com"
};

const NETWORK_URLS = {
  devnet: "https://api.devnet.solana.com",
  testnet: "https://api.testnet.solana.com", 
  mainnet: "https://api.mainnet-beta.solana.com"
};

export function getNetworkUrl(network: string): string {
  return NETWORK_URLS[network as keyof typeof NETWORK_URLS] || NETWORK_URLS.devnet;
}

export function expandPath(path: string): string {
  return path.replace("~", homedir());
}

export function createStandaloneClient(config: Partial<StandaloneConfig> = {}) {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  const rpcUrl = getNetworkUrl(finalConfig.network);
  
  return {
    config: finalConfig,
    rpcUrl,
    network: finalConfig.network
  };
}

// Utility to check if a string looks like a valid address
export function isValidAddress(address: string): boolean {
  return typeof address === 'string' && address.length >= 32 && address.length <= 44;
}

// Utility to validate keypair file exists
export function validateKeypairFile(path: string): boolean {
  try {
    const expandedPath = expandPath(path);
    const content = readFileSync(expandedPath, 'utf8');
    const parsed = JSON.parse(content);
    return Array.isArray(parsed) && parsed.length === 64;
  } catch {
    return false;
  }
}

// Mock agent registration for CLI demo
export function mockAgentRegistration(name: string, capabilities: string[]) {
  return {
    address: "Demo" + Math.random().toString(36).substring(2, 15),
    name,
    capabilities,
    status: "registered",
    network: "devnet"
  };
}

// Mock message sending for CLI demo  
export function mockMessageSend(recipient: string, content: string) {
  return {
    messageId: "msg_" + Math.random().toString(36).substring(2, 15),
    recipient,
    content,
    encrypted: true,
    status: "sent",
    timestamp: new Date().toISOString()
  };
} 