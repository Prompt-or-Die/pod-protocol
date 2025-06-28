import { IAgentRuntime } from "@elizaos/core";
import { PodProtocolConfig, PodEnvironment, ValidationResult } from "./types.js";

/**
 * Default configuration values
 */
export const DEFAULT_CONFIG: Partial<PodProtocolConfig> = {
  rpcEndpoint: "https://api.devnet.solana.com",
  programId: "HEpGLgYsE1kP8aoYKyLFc3JVVrofS7T4zEA6fWBJsZps",
  capabilities: ["conversation", "analysis", "collaboration"],
  mcpEndpoint: "http://localhost:3000",
  autoRegister: true,
};

/**
 * Get environment configuration for PoD Protocol
 */
export function getEnvironmentConfig(runtime: IAgentRuntime): PodEnvironment {
  return {
    POD_RPC_ENDPOINT: runtime.getSetting("POD_RPC_ENDPOINT"),
    POD_PROGRAM_ID: runtime.getSetting("POD_PROGRAM_ID"),
    POD_WALLET_PRIVATE_KEY: runtime.getSetting("POD_WALLET_PRIVATE_KEY"),
    POD_AGENT_NAME: runtime.getSetting("POD_AGENT_NAME"),
    POD_AGENT_CAPABILITIES: runtime.getSetting("POD_AGENT_CAPABILITIES"),
    POD_MCP_ENDPOINT: runtime.getSetting("POD_MCP_ENDPOINT"),
    POD_AUTO_REGISTER: runtime.getSetting("POD_AUTO_REGISTER"),
  };
}

/**
 * Parse and validate PoD Protocol configuration
 */
export function parseConfig(runtime: IAgentRuntime): PodProtocolConfig {
  const env = getEnvironmentConfig(runtime);
  
  // Parse capabilities from comma-separated string
  const capabilities = env.POD_AGENT_CAPABILITIES
    ? env.POD_AGENT_CAPABILITIES.split(",").map(c => c.trim())
    : DEFAULT_CONFIG.capabilities!;
  
  // Parse auto-register boolean
  const autoRegister = env.POD_AUTO_REGISTER
    ? env.POD_AUTO_REGISTER.toLowerCase() === "true"
    : DEFAULT_CONFIG.autoRegister!;
  
  return {
    rpcEndpoint: env.POD_RPC_ENDPOINT || DEFAULT_CONFIG.rpcEndpoint!,
    programId: env.POD_PROGRAM_ID || DEFAULT_CONFIG.programId!,
    walletPrivateKey: env.POD_WALLET_PRIVATE_KEY || "",
    agentName: env.POD_AGENT_NAME || runtime.character?.name || "ElizaOS Agent",
    capabilities,
    mcpEndpoint: env.POD_MCP_ENDPOINT || DEFAULT_CONFIG.mcpEndpoint!,
    autoRegister,
  };
}

/**
 * Validate PoD Protocol configuration
 */
export function validateConfig(config: PodProtocolConfig): ValidationResult {
  const errors: string[] = [];
  
  // Validate required fields
  if (!config.rpcEndpoint) {
    errors.push("POD_RPC_ENDPOINT is required");
  }
  
  if (!config.programId) {
    errors.push("POD_PROGRAM_ID is required");
  }
  
  if (!config.walletPrivateKey) {
    errors.push("POD_WALLET_PRIVATE_KEY is required");
  }
  
  // Validate RPC endpoint format
  if (config.rpcEndpoint && !isValidUrl(config.rpcEndpoint)) {
    errors.push("POD_RPC_ENDPOINT must be a valid URL");
  }
  
  // Validate MCP endpoint format if provided
  if (config.mcpEndpoint && !isValidUrl(config.mcpEndpoint)) {
    errors.push("POD_MCP_ENDPOINT must be a valid URL");
  }
  
  // Validate program ID format (should be base58)
  if (config.programId && !isValidBase58(config.programId)) {
    errors.push("POD_PROGRAM_ID must be a valid base58 string");
  }
  
  // Validate private key format (should be base58)
  if (config.walletPrivateKey && !isValidBase58(config.walletPrivateKey)) {
    errors.push("POD_WALLET_PRIVATE_KEY must be a valid base58 string");
  }
  
  // Validate capabilities
  if (!config.capabilities || config.capabilities.length === 0) {
    errors.push("At least one capability must be specified");
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validate PoD Protocol configuration for runtime
 */
export function validateConfigForRuntime(runtime: IAgentRuntime): ValidationResult {
  try {
    const config = parseConfig(runtime);
    return validateConfig(config);
  } catch (error) {
    return {
      isValid: false,
      errors: [`Failed to parse configuration: ${error instanceof Error ? error.message : String(error)}`],
    };
  }
}

/**
 * Check if string is a valid URL
 */
function isValidUrl(str: string): boolean {
  try {
    new URL(str);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if string is valid base58
 */
function isValidBase58(str: string): boolean {
  const base58Regex = /^[1-9A-HJ-NP-Za-km-z]+$/;
  return base58Regex.test(str) && str.length >= 32 && str.length <= 88; // Support both public keys (32-44) and private keys (51-88)
}

/**
 * Get configuration with error handling
 */
export function getConfigSafely(runtime: IAgentRuntime): { config: PodProtocolConfig | null; error: string | null } {
  try {
    const config = parseConfig(runtime);
    const validation = validateConfig(config);
    
    if (!validation.isValid) {
      return {
        config: null,
        error: `Configuration validation failed: ${validation.errors.join(", ")}`,
      };
    }
    
    return {
      config,
      error: null,
    };
  } catch (error) {
    return {
      config: null,
      error: `Failed to parse configuration: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}