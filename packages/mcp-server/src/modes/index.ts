/**
 * MCP Server Mode Configurations
 * Handles different operational modes for the PoD Protocol MCP Server
 */

export type ServerMode = 'hosted' | 'self-hosted' | 'development';

export interface ModeConfig {
  name: string;
  description: string;
  defaultPort: number;
  authRequired: boolean;
  rpcEndpoint: string;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

export const serverModes: Record<ServerMode, ModeConfig> = {
  hosted: {
    name: 'Hosted',
    description: 'Production hosted environment with authentication',
    defaultPort: 3000,
    authRequired: true,
    rpcEndpoint: 'https://api.mainnet-beta.solana.com',
    logLevel: 'info'
  },
  'self-hosted': {
    name: 'Self-Hosted',
    description: 'Private deployment with full control',
    defaultPort: 8080,
    authRequired: false,
    rpcEndpoint: 'https://api.devnet.solana.com',
    logLevel: 'info'
  },
  development: {
    name: 'Development',
    description: 'Local development with debug features',
    defaultPort: 8080,
    authRequired: false,
    rpcEndpoint: 'https://api.devnet.solana.com',
    logLevel: 'debug'
  }
};

export function getModeConfig(mode: ServerMode): ModeConfig {
  return serverModes[mode] || serverModes['self-hosted'];
}

export function detectMode(): ServerMode {
  const envMode = process.env.NODE_ENV;
  const mcpMode = process.env.MCP_MODE as ServerMode;
  
  if (mcpMode && mcpMode in serverModes) {
    return mcpMode;
  }
  
  if (envMode === 'production') {
    return 'hosted';
  }
  
  if (envMode === 'development') {
    return 'development';
  }
  
  return 'self-hosted';
} 