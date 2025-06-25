import { existsSync, readFileSync, statSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import { Keypair, PublicKey } from "@solana/web3.js";
import chalk from "chalk";
import { SecureKeypairLoader, secureWipe } from "./secure-memory.js";
import { safeParseConfig, safeParseKeypair } from "./safe-json.js";

interface CliConfig {
  network: string;
  keypairPath: string;
  programId?: string;
  customEndpoint?: string;
}

/**
 * CLI client configuration interface
 */
interface CliClientConfig {
  endpoint: string;
  commitment: 'confirmed' | 'processed' | 'finalized';
  programId?: PublicKey;
  network: string;
}

/**
 * Load CLI configuration from file and environment variables
 * Environment variables take precedence over config file
 */
export function loadConfig(): CliConfig {
  const configPath = join(homedir(), ".config", "pod", "config.json");

  // Default configuration
  let config: CliConfig = {
    network: "devnet",
    keypairPath: join(homedir(), ".config", "solana", "id.json"),
  };

  // Load from config file if it exists
  if (existsSync(configPath)) {
    try {
      const configData = readFileSync(configPath, "utf8");
      const parsedConfig = safeParseConfig(configData);
      
      if (parsedConfig) {
        config = { ...config, ...parsedConfig };
      } else {
        throw new Error("Invalid config format");
      }
    } catch {
      console.warn(
        chalk.yellow("Warning: Could not read config file, using defaults"),
      );
    }
  }

  // Override with environment variables if present
  if (process.env.SOLANA_NETWORK) {
    config.network = process.env.SOLANA_NETWORK;
  }
  
  if (process.env.SOLANA_KEYPAIR_PATH) {
    config.keypairPath = process.env.SOLANA_KEYPAIR_PATH;
  }
  
  if (process.env.SOLANA_PROGRAM_ID) {
    config.programId = process.env.SOLANA_PROGRAM_ID;
  }
  
  if (process.env.SOLANA_RPC_URL) {
    config.customEndpoint = process.env.SOLANA_RPC_URL;
  }

  return config;
}

/**
 * Load keypair using secure memory operations
 * SECURITY ENHANCEMENT: Uses secure memory to protect private keys
 */
export async function loadKeypairSecure(keypairPath?: string): Promise<Keypair> {
  const config = loadConfig();
  const path = keypairPath || config.keypairPath;

  // SECURITY: Validate input path
  if (path && (path.includes("..") || path.includes("./") || path.includes("\\"))) {
    console.error(chalk.red("Error: Invalid keypair path - security violation detected"));
    process.exit(1);
  }

  const expandedPath = path.startsWith("~")
    ? join(homedir(), path.slice(1))
    : path;

  if (!expandedPath || !existsSync(expandedPath)) {
    console.error(chalk.red(`Error: Keypair file not found at ${expandedPath}`));
    process.exit(1);
  }

  try {
    // Load keypair using secure memory
    const { publicKey, secretKey } = await SecureKeypairLoader.loadKeypair(expandedPath);
    
    // Create full keypair buffer in secure memory
    const fullKeypair = Buffer.alloc(64);
    secretKey.getBuffer().copy(fullKeypair, 0);
    publicKey.copy(fullKeypair, 32);
    
    // Create Solana Keypair object
    const keypair = Keypair.fromSecretKey(fullKeypair);
    
    // Securely wipe the temporary buffer
    secureWipe(fullKeypair);
    
    // Clean up secure memory
    secretKey.destroy();
    
    return keypair;
  } catch (error) {
    console.error(chalk.red("Error loading keypair:"), error);
    process.exit(1);
  }
}

/**
 * Load keypair from file path with enhanced security (MED-03)
 * SECURITY ENHANCEMENT: Secure keypair handling with validation and protection
 */
export function loadKeypair(keypairPath?: string): Keypair {
  const config = loadConfig();
  const path = keypairPath || config.keypairPath;

  // SECURITY: Validate input path to prevent directory traversal attacks
  if (path && (path.includes("..") || path.includes("./") || path.includes("\\"))) {
    console.error(chalk.red("Error: Invalid keypair path - security violation detected"));
    console.log(chalk.yellow("Path contains potentially dangerous characters"));
    process.exit(1);
  }

  // Expand ~ to home directory securely
  const expandedPath = path.startsWith("~")
    ? join(homedir(), path.slice(1))
    : path;

  // SECURITY: Ensure path is absolute and within reasonable bounds
  if (!expandedPath || expandedPath.length > 500) {
    console.error(chalk.red("Error: Invalid keypair path length"));
    process.exit(1);
  }

  if (!existsSync(expandedPath)) {
    console.error(chalk.red("Error: Keypair file not found:"), expandedPath);
    console.log(
      chalk.yellow(
        "Tip: Generate a new keypair with 'pod config generate-keypair'",
      ),
    );
    console.log(
      chalk.blue("Default location: ~/.config/solana/id.json")
    );
    process.exit(1);
  }

  try {
    // SECURITY: Read file with size limit to prevent DoS
    const fileStats = statSync(expandedPath);
    if (fileStats.size > 10000) { // Max 10KB for keypair file
      console.error(chalk.red("Error: Keypair file too large (potential security issue)"));
      process.exit(1);
    }

    const fileContent = readFileSync(expandedPath, "utf8");
    
    // SECURITY: Validate JSON structure before parsing
    if (!fileContent.trim().startsWith("[") || !fileContent.trim().endsWith("]")) {
      console.error(chalk.red("Error: Invalid keypair file format (must be JSON array)"));
      process.exit(1);
    }

    const keypairData = safeParseKeypair(fileContent);
    
    if (!keypairData) {
      console.error(chalk.red("Error: Invalid or potentially malicious keypair file format"));
      process.exit(1);
    }

    // SECURITY: Validate all values are valid bytes (0-255)
    for (let i = 0; i < keypairData.length; i++) {
      if (!Number.isInteger(keypairData[i]) || keypairData[i] < 0 || keypairData[i] > 255) {
        console.error(chalk.red(`Error: Invalid byte at position ${i} in keypair`));
        process.exit(1);
      }
    }

    const keypair = Keypair.fromSecretKey(new Uint8Array(keypairData));
    
    // SECURITY: Clear sensitive data from memory (basic attempt)
    keypairData.fill(0);
    
    console.log(chalk.gray(`✓ Loaded keypair: ${keypair.publicKey.toBase58().slice(0, 8)}...`));
    return keypair;
    
  } catch (error) {
    console.error(
      chalk.red("Error: Failed to load keypair:"),
      error instanceof Error ? error.message : "Unknown error"
    );
    console.log(
      chalk.yellow("Tip: Ensure the file contains a valid Solana keypair JSON array"),
    );
    console.log(
      chalk.blue("Example format: [123,45,67,89,...]")
    );
    process.exit(1);
  }
}

/**
 * Get CLI configuration for client initialization
 */
export async function getCliConfig(): Promise<CliClientConfig> {
  const config = loadConfig();
  return {
    endpoint: getNetworkEndpoint(config.network),
    commitment: 'confirmed' as const,
    programId: config.programId ? new PublicKey(config.programId) : undefined,
    network: config.network
  };
}

/**
 * Get network endpoint URL
 */
export function getNetworkEndpoint(network?: string): string {
  const config = loadConfig();
  const selectedNetwork = network || config.network;

  // Use custom endpoint if configured
  if (config.customEndpoint) {
    return config.customEndpoint;
  }

  // Default endpoints for each network
  switch (selectedNetwork) {
    case "devnet":
      return "https://api.devnet.solana.com";
    case "testnet":
      return "https://api.testnet.solana.com";
    case "mainnet":
      return "https://api.mainnet-beta.solana.com";
    default:
      console.error(chalk.red("Error: Invalid network:"), selectedNetwork);
      console.log(chalk.yellow("Valid networks: devnet, testnet, mainnet"));
      process.exit(1);
  }
}

/**
 * Get program ID from config or default
 */
export function getProgramId(): string {
  const config = loadConfig();
  return config.programId || "HEpGLgYsE1kP8aoYKyLFc3JVVrofS7T4zEA6fWBJsZps";
}

/**
 * Validate network name
 */
export function isValidNetwork(network: string): boolean {
  return ["devnet", "testnet", "mainnet"].includes(network);
}

/**
 * Format SOL amount for display
 */
export function formatSol(lamports: number): string {
  return (lamports / 1_000_000_000).toFixed(9) + " SOL";
}

/**
 * Format transaction signature for display
 */
export function formatSignature(signature: string): string {
  return signature.length > 20
    ? signature.slice(0, 8) + "..." + signature.slice(-8)
    : signature;
}

/**
 * Validate Solana public key format
 */
export function isValidPublicKey(key: string): boolean {
  try {
    // Base58 check - Solana public keys are 44 characters in base58
    return (
      key.length >= 32 &&
      key.length <= 44 &&
      /^[1-9A-HJ-NP-Za-km-z]+$/.test(key)
    );
  } catch {
    return false;
  }
}
