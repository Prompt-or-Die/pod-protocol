/**
 * Configuration management for PoD Protocol MCP Server
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { MCPServerConfig, AgentRuntimeConfig } from './types.js';

/**
 * Load configuration from environment variables and config files
 */
export async function loadConfig(): Promise<MCPServerConfig> {
  const config: MCPServerConfig = {
    pod_protocol: {
      rpc_endpoint: process.env.POD_RPC_ENDPOINT || 'https://api.devnet.solana.com',
      program_id: process.env.POD_PROGRAM_ID || 'HEpGLgYsE1kP8aoYKyLFc3JVVrofS7T4zEA6fWBJsZps',
      commitment: (process.env.POD_COMMITMENT as any) || 'confirmed'
    },
    agent_runtime: {
      runtime: (process.env.AGENT_RUNTIME as any) || 'custom',
      agent_id: process.env.AGENT_ID || `agent_${Date.now()}`,
      wallet_path: process.env.WALLET_PATH,
      rpc_endpoint: process.env.POD_RPC_ENDPOINT || 'https://api.devnet.solana.com',
      auto_respond: process.env.AUTO_RESPOND === 'true',
      response_delay_ms: parseInt(process.env.RESPONSE_DELAY_MS || '1000')
    },
    features: {
      auto_message_processing: process.env.AUTO_MESSAGE_PROCESSING !== 'false',
      real_time_notifications: process.env.REAL_TIME_NOTIFICATIONS !== 'false',
      cross_runtime_discovery: process.env.CROSS_RUNTIME_DISCOVERY !== 'false',
      analytics_tracking: process.env.ANALYTICS_TRACKING !== 'false'
    },
    security: {
      rate_limit_per_minute: parseInt(process.env.RATE_LIMIT_PER_MINUTE || '60'),
      max_message_size: parseInt(process.env.MAX_MESSAGE_SIZE || '10000'),
      allowed_origins: process.env.ALLOWED_ORIGINS?.split(',') || ['*'],
      require_signature_verification: process.env.REQUIRE_SIGNATURE_VERIFICATION !== 'false'
    },
    logging: {
      level: (process.env.LOG_LEVEL as any) || 'info',
      file_path: process.env.LOG_FILE_PATH,
      console_output: process.env.LOG_CONSOLE_OUTPUT !== 'false'
    }
  };

  // Try to load from config file if it exists
  const configPaths = [
    './pod-mcp-config.json',
    join(process.cwd(), 'pod-mcp-config.json'),
    join(process.env.HOME || '~', '.pod-mcp-config.json')
  ];

  for (const configPath of configPaths) {
    if (existsSync(configPath)) {
      try {
        const fileConfig = JSON.parse(readFileSync(configPath, 'utf-8'));
        Object.assign(config, mergeConfig(config, fileConfig));
        console.log(`📋 Loaded configuration from ${configPath}`);
        break;
      } catch (error) {
        console.warn(`⚠️  Failed to load config from ${configPath}:`, error);
      }
    }
  }

  // Validate configuration
  validateConfig(config);

  return config;
}

/**
 * Merge configuration objects deeply
 */
function mergeConfig(base: any, override: any): any {
  const result = { ...base };
  
  for (const key in override) {
    if (override[key] && typeof override[key] === 'object' && !Array.isArray(override[key])) {
      result[key] = mergeConfig(base[key] || {}, override[key]);
    } else {
      result[key] = override[key];
    }
  }
  
  return result;
}

/**
 * Validate configuration
 */
function validateConfig(config: MCPServerConfig): void {
  const errors: string[] = [];

  // Validate PoD Protocol config
  if (!config.pod_protocol.rpc_endpoint) {
    errors.push('POD_RPC_ENDPOINT is required');
  }
  
  if (!config.pod_protocol.program_id) {
    errors.push('POD_PROGRAM_ID is required');
  }

  // Validate agent runtime config
  if (!config.agent_runtime.agent_id) {
    errors.push('AGENT_ID is required');
  }

  const validRuntimes = ['eliza', 'autogen', 'crewai', 'langchain', 'custom'];
  if (!validRuntimes.includes(config.agent_runtime.runtime)) {
    errors.push(`AGENT_RUNTIME must be one of: ${validRuntimes.join(', ')}`);
  }

  // Validate wallet path if provided
  if (config.agent_runtime.wallet_path && !existsSync(config.agent_runtime.wallet_path)) {
    errors.push(`Wallet file not found: ${config.agent_runtime.wallet_path}`);
  }

  // Validate security settings
  if (config.security.rate_limit_per_minute < 1) {
    errors.push('RATE_LIMIT_PER_MINUTE must be at least 1');
  }

  if (config.security.max_message_size < 1) {
    errors.push('MAX_MESSAGE_SIZE must be at least 1');
  }

  // Validate logging settings
  const validLogLevels = ['debug', 'info', 'warn', 'error'];
  if (!validLogLevels.includes(config.logging.level)) {
    errors.push(`LOG_LEVEL must be one of: ${validLogLevels.join(', ')}`);
  }

  if (errors.length > 0) {
    throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
  }
}

/**
 * Create example configuration file
 */
export function createExampleConfig(): MCPServerConfig {
  return {
    pod_protocol: {
      rpc_endpoint: 'https://api.devnet.solana.com',
      program_id: 'HEpGLgYsE1kP8aoYKyLFc3JVVrofS7T4zEA6fWBJsZps',
      commitment: 'confirmed'
    },
    agent_runtime: {
      runtime: 'eliza',
      agent_id: 'my-trading-agent',
      wallet_path: './agent-wallet.json',
      auto_respond: true,
      response_delay_ms: 2000
    },
    features: {
      auto_message_processing: true,
      real_time_notifications: true,
      cross_runtime_discovery: true,
      analytics_tracking: true
    },
    security: {
      rate_limit_per_minute: 60,
      max_message_size: 10000,
      allowed_origins: ['*'],
      require_signature_verification: true
    },
    logging: {
      level: 'info',
      file_path: './logs/pod-mcp-server.log',
      console_output: true
    }
  };
} 