/**
 * Configuration Loader for Modern MCP Server
 * Supports hosted and self-hosted configurations
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { ModernMCPServerConfig } from './modern-mcp-server.js';

export interface ConfigOptions {
  mode?: 'hosted' | 'self-hosted' | 'development';
  configPath?: string;
  overrides?: Partial<ModernMCPServerConfig>;
}

export class ConfigLoader {
  /**
   * Load configuration based on environment and options
   */
  static async load(options: ConfigOptions = {}): Promise<ModernMCPServerConfig> {
    const {
      mode = process.env.NODE_ENV === 'production' ? 'hosted' : 'self-hosted',
      configPath,
      overrides = {}
    } = options;

    // Base configuration
    let config: ModernMCPServerConfig;

    // Load configuration based on mode
    if (configPath && existsSync(configPath)) {
      config = this.loadFromFile(configPath);
    } else {
      config = this.loadPresetConfig(mode);
    }

    // Apply environment variable overrides
    config = this.applyEnvironmentOverrides(config);

    // Apply manual overrides
    config = this.mergeConfig(config, overrides);

    // Validate configuration
    this.validateConfig(config);

    return config;
  }

  /**
   * Load preset configuration
   */
  private static loadPresetConfig(mode: 'hosted' | 'self-hosted' | 'development'): ModernMCPServerConfig {
    const configMap = {
      hosted: './config/hosted.json',
      'self-hosted': './config/self-hosted.json',
      development: './config/self-hosted.json' // Use self-hosted for development
    };

    const configPath = join(process.cwd(), configMap[mode]);
    return this.loadFromFile(configPath);
  }

  /**
   * Load configuration from file
   */
  private static loadFromFile(filePath: string): ModernMCPServerConfig {
    try {
      const configData = readFileSync(filePath, 'utf-8');
      return JSON.parse(configData) as ModernMCPServerConfig;
    } catch (error) {
      throw new Error(`Failed to load configuration from ${filePath}: ${error}`);
    }
  }

  /**
   * Apply environment variable overrides
   */
  private static applyEnvironmentOverrides(config: ModernMCPServerConfig): ModernMCPServerConfig {
    const envOverrides: Partial<ModernMCPServerConfig> = {};

    // Server overrides
    if (process.env.SERVER_NAME) {
      envOverrides.server = { ...config.server, name: process.env.SERVER_NAME };
    }

    // PoD Protocol overrides
    if (process.env.POD_RPC_ENDPOINT || process.env.POD_PROGRAM_ID) {
      envOverrides.pod_protocol = {
        ...config.pod_protocol,
        ...(process.env.POD_RPC_ENDPOINT && { rpc_endpoint: process.env.POD_RPC_ENDPOINT }),
        ...(process.env.POD_PROGRAM_ID && { program_id: process.env.POD_PROGRAM_ID })
      };
    }

    // Transport overrides
    if (process.env.HTTP_PORT || process.env.WS_PORT) {
      envOverrides.transports = {
        ...config.transports,
        ...(process.env.HTTP_PORT && {
          http: { ...config.transports.http, port: parseInt(process.env.HTTP_PORT) }
        }),
        ...(process.env.WS_PORT && {
          websocket: { ...config.transports.websocket, port: parseInt(process.env.WS_PORT) }
        })
      };
    }

    // Security overrides
    if (process.env.JWT_SECRET) {
      envOverrides.security = {
        ...config.security,
        jwtSecret: process.env.JWT_SECRET
      };
    }

    // Logging overrides
    if (process.env.LOG_LEVEL || process.env.LOG_FILE) {
      envOverrides.logging = {
        ...config.logging,
        ...(process.env.LOG_LEVEL && { level: process.env.LOG_LEVEL as any }),
        ...(process.env.LOG_FILE && { file: process.env.LOG_FILE })
      };
    }

    return this.mergeConfig(config, envOverrides);
  }

  /**
   * Deep merge configuration objects
   */
  private static mergeConfig(
    base: ModernMCPServerConfig, 
    override: Partial<ModernMCPServerConfig>
  ): ModernMCPServerConfig {
    const result = { ...base };

    for (const key in override) {
      const value = override[key as keyof ModernMCPServerConfig];
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        result[key as keyof ModernMCPServerConfig] = {
          ...base[key as keyof ModernMCPServerConfig],
          ...value
        } as any;
      } else if (value !== undefined) {
        result[key as keyof ModernMCPServerConfig] = value as any;
      }
    }

    return result;
  }

  /**
   * Validate configuration
   */
  private static validateConfig(config: ModernMCPServerConfig): void {
    const errors: string[] = [];

    // Validate server config
    if (!config.server.name) {
      errors.push('Server name is required');
    }
    if (!config.server.version) {
      errors.push('Server version is required');
    }

    // Validate PoD Protocol config
    if (!config.pod_protocol.rpc_endpoint) {
      errors.push('PoD Protocol RPC endpoint is required');
    }
    if (!config.pod_protocol.program_id) {
      errors.push('PoD Protocol program ID is required');
    }

    // Validate security config
    if (!config.security.jwtSecret || config.security.jwtSecret === 'ENV:JWT_SECRET') {
      errors.push('JWT secret must be provided (set JWT_SECRET environment variable)');
    }

    // Validate transport config
    if (!config.transports.http.enabled && !config.transports.websocket.enabled && !config.transports.stdio.enabled) {
      errors.push('At least one transport must be enabled');
    }

    // Validate ports
    if (config.transports.http.enabled && (!config.transports.http.port || config.transports.http.port < 1 || config.transports.http.port > 65535)) {
      errors.push('Valid HTTP port is required when HTTP transport is enabled');
    }
    if (config.transports.websocket.enabled && (!config.transports.websocket.port || config.transports.websocket.port < 1 || config.transports.websocket.port > 65535)) {
      errors.push('Valid WebSocket port is required when WebSocket transport is enabled');
    }

    // Validate session config
    if (config.session.sessionTimeoutMs < 60000) { // Minimum 1 minute
      errors.push('Session timeout must be at least 60 seconds');
    }
    if (config.session.maxSessionsPerUser < 1) {
      errors.push('Max sessions per user must be at least 1');
    }

    // Validate logging config
    const validLogLevels = ['debug', 'info', 'warn', 'error'];
    if (!validLogLevels.includes(config.logging.level)) {
      errors.push(`Log level must be one of: ${validLogLevels.join(', ')}`);
    }

    if (errors.length > 0) {
      throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
    }
  }

  /**
   * Create example configuration files
   */
  static createExampleConfigs(): void {
    // This would generate example config files for users
    console.log('Example configuration files available in ./config/ directory');
    console.log('- hosted.json: For production deployment');
    console.log('- self-hosted.json: For private/development deployment');
  }

  /**
   * Get configuration schema for validation
   */
  static getConfigSchema(): any {
    return {
      type: 'object',
      required: ['server', 'pod_protocol', 'transports', 'session', 'security', 'logging'],
      properties: {
        server: {
          type: 'object',
          required: ['name', 'version', 'description'],
          properties: {
            name: { type: 'string', minLength: 1 },
            version: { type: 'string', pattern: '^\\d+\\.\\d+\\.\\d+$' },
            description: { type: 'string', minLength: 1 }
          }
        },
        pod_protocol: {
          type: 'object',
          required: ['rpc_endpoint', 'program_id', 'commitment'],
          properties: {
            rpc_endpoint: { type: 'string', format: 'uri' },
            program_id: { type: 'string', minLength: 32 },
            commitment: { enum: ['processed', 'confirmed', 'finalized'] }
          }
        },
        transports: {
          type: 'object',
          required: ['http', 'websocket', 'stdio', 'security'],
          properties: {
            http: {
              type: 'object',
              required: ['enabled', 'port', 'path', 'corsOrigins'],
              properties: {
                enabled: { type: 'boolean' },
                port: { type: 'number', minimum: 1, maximum: 65535 },
                path: { type: 'string', pattern: '^/' },
                corsOrigins: { type: 'array', items: { type: 'string' } }
              }
            },
            websocket: {
              type: 'object',
              required: ['enabled', 'port', 'path'],
              properties: {
                enabled: { type: 'boolean' },
                port: { type: 'number', minimum: 1, maximum: 65535 },
                path: { type: 'string', pattern: '^/' }
              }
            },
            stdio: {
              type: 'object',
              required: ['enabled'],
              properties: {
                enabled: { type: 'boolean' }
              }
            },
            security: {
              type: 'object',
              required: ['rateLimitWindowMs', 'rateLimitMax', 'requireAuth'],
              properties: {
                rateLimitWindowMs: { type: 'number', minimum: 1000 },
                rateLimitMax: { type: 'number', minimum: 1 },
                requireAuth: { type: 'boolean' }
              }
            }
          }
        }
      }
    };
  }
}