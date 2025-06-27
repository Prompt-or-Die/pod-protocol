import { z } from 'zod';
import type { ModernMCPServerConfig } from '../modern-mcp-server';
import { createLogger } from './logger';

const logger = createLogger('config-validator');

// Zod schema for validating the complete configuration
const ConfigSchema = z.object({
  serverName: z.string().min(1, 'Server name is required'),
  version: z.string().regex(/^\d+\.\d+\.\d+$/, 'Version must be in semver format (x.y.z)'),
  
  podProtocol: z.object({
    rpcEndpoint: z.string().url('RPC endpoint must be a valid URL'),
    programId: z.string().min(1, 'Program ID is required'),
    commitment: z.enum(['processed', 'confirmed', 'finalized']).optional(),
    timeout: z.number().positive().optional()
  }),
  
  transports: z.object({
    http: z.object({
      enabled: z.boolean(),
      port: z.number().int().min(1).max(65535, 'Port must be between 1 and 65535').optional(),
      host: z.string().optional(),
      cors: z.object({
        enabled: z.boolean().optional(),
        origins: z.array(z.string()).optional(),
        methods: z.array(z.string()).optional(),
        headers: z.array(z.string()).optional()
      }).optional()
    }),
    websocket: z.object({
      enabled: z.boolean(),
      port: z.number().int().min(1).max(65535, 'Port must be between 1 and 65535').optional(),
      host: z.string().optional(),
      path: z.string().optional()
    }),
    stdio: z.object({
      enabled: z.boolean()
    })
  }),
  
  registry: z.object({
    enabled: z.boolean(),
    endpoint: z.string().url().optional(),
    apiKey: z.string().optional(),
    timeout: z.number().positive().optional(),
    retryAttempts: z.number().int().min(0).optional()
  }),
  
  security: z.object({
    enabled: z.boolean(),
    rateLimiting: z.object({
      enabled: z.boolean().optional(),
      maxRequests: z.number().int().positive().optional(),
      windowMs: z.number().int().positive().optional(),
      skipSuccessfulRequests: z.boolean().optional()
    }).optional(),
    cors: z.object({
      enabled: z.boolean().optional(),
      origins: z.array(z.string()).optional(),
      credentials: z.boolean().optional()
    }).optional(),
    helmet: z.object({
      enabled: z.boolean().optional(),
      contentSecurityPolicy: z.boolean().optional(),
      hsts: z.boolean().optional()
    }).optional(),
    authentication: z.object({
      required: z.boolean().optional(),
      methods: z.array(z.enum(['oauth', 'solana', 'apikey'])).optional(),
      oauthEndpoint: z.string().url().optional()
    }).optional()
  }),
  
  a2a: z.object({
    discoveryMode: z.enum(['active', 'passive', 'hybrid']),
    coordinationPatterns: z.array(z.enum(['direct', 'mediated', 'broadcast'])),
    trustFramework: z.enum(['reputation', 'cryptographic', 'hybrid']),
    networkTopology: z.enum(['mesh', 'hub', 'hierarchical']).optional(),
    protocolVersion: z.string().optional()
  }),
  
  analytics: z.object({
    enabled: z.boolean(),
    endpoint: z.string().url().optional(),
    apiKey: z.string().optional(),
    batchSize: z.number().int().positive().optional(),
    flushInterval: z.number().int().positive().optional(),
    retentionDays: z.number().int().positive().optional()
  }),
  
  performance: z.object({
    caching: z.object({
      enabled: z.boolean(),
      ttl: z.number().int().positive().optional(),
      maxSize: z.number().int().positive().optional(),
      strategy: z.enum(['lru', 'lfu', 'fifo']).optional()
    }),
    prefetching: z.object({
      enabled: z.boolean(),
      batchSize: z.number().int().positive().optional(),
      threshold: z.number().min(0).max(1).optional()
    }),
    connectionPooling: z.object({
      enabled: z.boolean(),
      maxConnections: z.number().int().positive().optional(),
      idleTimeout: z.number().int().positive().optional(),
      acquireTimeout: z.number().int().positive().optional()
    })
  }),
  
  // Optional fields
  description: z.string().optional(),
  author: z.string().optional(),
  license: z.string().optional(),
  repository: z.string().url().optional(),
  homepage: z.string().url().optional(),
  
  // Environment-specific overrides
  development: z.object({
    logLevel: z.string().optional(),
    enableDebugMode: z.boolean().optional(),
    mockExternalServices: z.boolean().optional()
  }).optional(),
  
  production: z.object({
    logLevel: z.string().optional(),
    enableMetrics: z.boolean().optional(),
    healthCheckInterval: z.number().int().positive().optional()
  }).optional(),
  
  testing: z.object({
    logLevel: z.string().optional(),
    mockAllServices: z.boolean().optional(),
    testTimeout: z.number().int().positive().optional()
  }).optional()
});

/**
 * Validates a configuration object against the schema
 * @param config - The configuration object to validate
 * @throws Error if validation fails with detailed error messages
 * @returns The validated configuration (with type safety)
 */
export function validateConfig(config: any): ModernMCPServerConfig {
  try {
    logger.debug('Validating configuration', { 
      serverName: config?.serverName,
      version: config?.version 
    });
    
    const result = ConfigSchema.parse(config);
    
    // Additional custom validations
    validateCustomRules(result);
    
    logger.info('Configuration validation successful', {
      serverName: result.serverName,
      version: result.version,
      transports: Object.keys(result.transports).filter(t => result.transports[t as keyof typeof result.transports].enabled)
    });
    
    return result as ModernMCPServerConfig;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const formattedErrors = formatZodErrors(error);
      logger.error('Configuration validation failed', { errors: formattedErrors });
      throw new Error(`Configuration validation failed:\n${formattedErrors.join('\n')}`);
    }
    
    logger.error('Configuration validation error', { error: error instanceof Error ? error.message : String(error) });
    throw error;
  }
}

/**
 * Validates a partial configuration (useful for updates)
 * @param partialConfig - Partial configuration object
 * @returns Validation result with errors if any
 */
export function validatePartialConfig(partialConfig: any): {
  isValid: boolean;
  errors: string[];
} {
  try {
    // Use partial schema for validation
    const PartialConfigSchema = ConfigSchema.partial();
    PartialConfigSchema.parse(partialConfig);
    
    return { isValid: true, errors: [] };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        isValid: false,
        errors: formatZodErrors(error)
      };
    }
    
    return {
      isValid: false,
      errors: [error instanceof Error ? error.message : String(error)]
    };
  }
}

/**
 * Performs additional custom validation rules
 * @param config - The validated configuration
 */
function validateCustomRules(config: ModernMCPServerConfig): void {
  // Ensure at least one transport is enabled
  const enabledTransports = Object.values(config.transports)
    .filter((transport: any) => transport.enabled);
  
  if (enabledTransports.length === 0) {
    throw new Error('At least one transport must be enabled');
  }
  
  // Validate port conflicts
  const ports: number[] = [];
  if (config.transports.http.enabled && config.transports.http.port) {
    ports.push(config.transports.http.port);
  }
  if (config.transports.websocket.enabled && config.transports.websocket.port) {
    ports.push(config.transports.websocket.port);
  }
  
  const duplicatePorts = ports.filter((port, index) => ports.indexOf(port) !== index);
  if (duplicatePorts.length > 0) {
    throw new Error(`Port conflicts detected: ${duplicatePorts.join(', ')}`);
  }
  
  // Validate registry configuration
  if (config.registry.enabled) {
    if (!config.registry.endpoint) {
      throw new Error('Registry endpoint is required when registry is enabled');
    }
  }
  
  // Validate security configuration
  if (config.security.enabled) {
    if (config.security.authentication?.required && 
        (!config.security.authentication.methods || config.security.authentication.methods.length === 0)) {
      throw new Error('Authentication methods must be specified when authentication is required');
    }
    
    if (config.security.authentication?.methods?.includes('oauth') && 
        !config.security.authentication.oauthEndpoint) {
      throw new Error('OAuth endpoint is required when OAuth authentication is enabled');
    }
  }
  
  // Validate analytics configuration
  if (config.analytics.enabled && !config.analytics.endpoint) {
    throw new Error('Analytics endpoint is required when analytics is enabled');
  }
  
  // Validate performance configuration
  if (config.performance.caching.enabled && config.performance.caching.maxSize && config.performance.caching.maxSize <= 0) {
    throw new Error('Cache max size must be positive when caching is enabled');
  }
  
  // Validate A2A configuration
  if (config.a2a.coordinationPatterns.length === 0) {
    throw new Error('At least one coordination pattern must be specified');
  }
}

/**
 * Formats Zod validation errors into human-readable messages
 * @param error - The Zod error object
 * @returns Array of formatted error messages
 */
function formatZodErrors(error: z.ZodError): string[] {
  return error.errors.map(err => {
    const path = err.path.length > 0 ? err.path.join('.') : 'root';
    return `${path}: ${err.message}`;
  });
}

/**
 * Validates environment-specific configuration
 * @param config - The base configuration
 * @param environment - The environment name ('development', 'production', 'testing')
 * @returns Merged configuration with environment overrides
 */
export function validateEnvironmentConfig(
  config: ModernMCPServerConfig,
  environment: 'development' | 'production' | 'testing'
): ModernMCPServerConfig {
  const envConfig = config[environment];
  if (!envConfig) {
    return config;
  }
  
  // Apply environment-specific overrides
  const mergedConfig = { ...config };
  
  if (envConfig.logLevel) {
    // Override log level in logger configuration
    process.env.LOG_LEVEL = envConfig.logLevel;
  }
  
  if (environment === 'development' && envConfig.enableDebugMode) {
    // Enable debug mode specific settings
    mergedConfig.security.enabled = false;
    mergedConfig.analytics.enabled = false;
  }
  
  if (environment === 'testing' && envConfig.mockAllServices) {
    // Disable external services for testing
    mergedConfig.registry.enabled = false;
    mergedConfig.analytics.enabled = false;
  }
  
  return mergedConfig;
}

/**
 * Validates configuration file format and structure
 * @param configPath - Path to the configuration file
 * @returns True if file format is valid
 */
export function validateConfigFile(configPath: string): boolean {
  try {
    const fs = require('fs');
    const path = require('path');
    
    if (!fs.existsSync(configPath)) {
      throw new Error(`Configuration file not found: ${configPath}`);
    }
    
    const ext = path.extname(configPath).toLowerCase();
    if (!['.json', '.js', '.ts'].includes(ext)) {
      throw new Error(`Unsupported configuration file format: ${ext}`);
    }
    
    // Try to parse the file
    if (ext === '.json') {
      const content = fs.readFileSync(configPath, 'utf8');
      JSON.parse(content);
    }
    
    return true;
  } catch (error) {
    logger.error('Configuration file validation failed', {
      configPath,
      error: error instanceof Error ? error.message : String(error)
    });
    return false;
  }
}

/**
 * Gets default configuration for a specific environment
 * @param environment - The target environment
 * @returns Default configuration object
 */
export function getDefaultConfig(environment: 'development' | 'production' | 'testing'): Partial<ModernMCPServerConfig> {
  const baseConfig = {
    serverName: 'pod-protocol-mcp-server',
    version: '1.0.0',
    podProtocol: {
      rpcEndpoint: 'http://localhost:8899',
      programId: 'PodProtocol1111111111111111111111111111111'
    },
    transports: {
      http: { 
        enabled: true, 
        port: 3000,
        path: '/mcp',
        corsOrigins: ['*']
      },
      websocket: { 
        enabled: true, 
        port: 3001,
        path: '/ws'
      },
      stdio: { enabled: false },
      security: {
        rateLimitWindowMs: 60000,
        rateLimitMax: 100,
        requireAuth: false
      }
    },
    registry: { enabled: false },
    security: { 
      enabled: false,
      jwtSecret: 'default-jwt-secret',
      rateLimitPerMinute: 60,
      maxMessageSize: 1048576,
      allowedOrigins: ['*']
    },
    a2a: {
      discoveryMode: 'passive' as const,
      coordinationPatterns: ['direct'] as const,
      trustFramework: 'reputation' as const
    },
    analytics: { enabled: false },
    performance: {
      caching: { enabled: true },
      prefetching: { enabled: true },
      connectionPooling: { enabled: true }
    }
  };
  
  switch (environment) {
    case 'development':
      return {
        ...baseConfig,
        development: {
          logLevel: 'debug',
          enableDebugMode: true,
          mockExternalServices: true
        }
      };
      
    case 'production':
      return {
        ...baseConfig,
        security: { 
          enabled: true,
          jwtSecret: process.env.JWT_SECRET || 'production-jwt-secret',
          rateLimitPerMinute: 30,
          maxMessageSize: 1048576,
          allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') || ['https://yourdomain.com']
        },
        analytics: { enabled: true },
        production: {
          logLevel: 'info',
          enableMetrics: true,
          healthCheckInterval: 30000
        }
      };
      
    case 'testing':
      return {
        ...baseConfig,
        transports: {
          http: { 
            enabled: true, 
            port: 0, // Random port
            path: '/mcp',
            corsOrigins: ['*']
          },
          websocket: { 
            enabled: true, 
            port: 0, // Random port
            path: '/ws'
          },
          stdio: { enabled: false },
          security: {
            rateLimitWindowMs: 60000,
            rateLimitMax: 100,
            requireAuth: false
          }
        }
      };
      
    default:
      return baseConfig;
  }
}