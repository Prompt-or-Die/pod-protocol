import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { ConfigLoader } from '../src/config-loader';
import * as fs from 'fs/promises';
import * as path from 'path';

// Mock fs module
jest.mock('fs/promises');
jest.mock('path');

const mockFs = fs as jest.Mocked<typeof fs>;
const mockPath = path as jest.Mocked<typeof path>;

describe('ConfigLoader', () => {
  let configLoader: ConfigLoader;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env };
    
    // Clear environment variables
    delete process.env.MCP_SERVER_NAME;
    delete process.env.POD_PROTOCOL_RPC_ENDPOINT;
    delete process.env.POD_PROTOCOL_PROGRAM_ID;
    delete process.env.HTTP_PORT;
    delete process.env.WS_PORT;
    delete process.env.STDIO_ENABLED;

    configLoader = new ConfigLoader();
    
    // Setup path mocks
    mockPath.join.mockImplementation((...args) => args.join('/'));
    mockPath.resolve.mockImplementation((...args) => '/' + args.join('/'));
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
    jest.clearAllMocks();
  });

  describe('Configuration Loading', () => {
    const mockHostedConfig = {
      server: {
        name: 'pod-protocol-mcp-hosted',
        version: '1.0.0',
        description: 'Hosted MCP server'
      },
      pod_protocol: {
        rpc_endpoint: 'https://api.mainnet-beta.solana.com',
        program_id: 'hosted-program-id',
        commitment: 'confirmed' as const
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
          requireAuth: true
        }
      },
      session: {
        sessionTimeoutMs: 300000,
        maxSessionsPerUser: 10,
        cleanupIntervalMs: 60000,
        enablePersistence: true
      },
      security: {
        jwtSecret: 'hosted-secret',
        rateLimitPerMinute: 100,
        maxMessageSize: 1048576,
        allowedOrigins: ['*']
      },
      logging: {
        level: 'info' as const,
        console: true,
        enableAnalytics: true
      }
    };

    const mockSelfHostedConfig = {
      server: {
        name: 'pod-protocol-mcp-self-hosted',
        version: '1.0.0',
        description: 'Self-hosted MCP server'
      },
      pod_protocol: {
        rpc_endpoint: 'http://localhost:8899',
        program_id: 'self-hosted-program-id',
        commitment: 'confirmed' as const
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
        stdio: { enabled: true },
        security: {
          rateLimitWindowMs: 60000,
          rateLimitMax: 100,
          requireAuth: false
        }
      },
      session: {
        sessionTimeoutMs: 300000,
        maxSessionsPerUser: 10,
        cleanupIntervalMs: 60000,
        enablePersistence: false
      },
      security: {
        jwtSecret: 'self-hosted-secret',
        rateLimitPerMinute: 100,
        maxMessageSize: 1048576,
        allowedOrigins: ['*']
      },
      logging: {
        level: 'info' as const,
        console: true,
        enableAnalytics: false
      }
    };

    const mockDevelopmentConfig = {
      server: {
        name: 'pod-protocol-mcp-dev',
        version: '1.0.0',
        description: 'Development MCP server'
      },
      pod_protocol: {
        rpc_endpoint: 'http://localhost:8899',
        program_id: 'dev-program-id',
        commitment: 'confirmed' as const
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
        stdio: { enabled: true },
        security: {
          rateLimitWindowMs: 60000,
          rateLimitMax: 100,
          requireAuth: false
        }
      },
      session: {
        sessionTimeoutMs: 300000,
        maxSessionsPerUser: 10,
        cleanupIntervalMs: 60000,
        enablePersistence: false
      },
      security: {
        jwtSecret: 'dev-secret',
        rateLimitPerMinute: 100,
        maxMessageSize: 1048576,
        allowedOrigins: ['*']
      },
      logging: {
        level: 'debug' as const,
        console: true,
        enableAnalytics: false
      }
    };

    it('should load hosted configuration', async () => {
      mockFs.readFile.mockResolvedValue(JSON.stringify(mockHostedConfig));
      
      const config = await configLoader.loadConfig('hosted');
      
      expect(config).toEqual(mockHostedConfig);
      expect(mockFs.readFile).toHaveBeenCalledWith(
        expect.stringContaining('hosted.json'),
        'utf-8'
      );
    });

    it('should load self-hosted configuration', async () => {
      mockFs.readFile.mockResolvedValue(JSON.stringify(mockSelfHostedConfig));
      
      const config = await configLoader.loadConfig('self-hosted');
      
      expect(config).toEqual(mockSelfHostedConfig);
      expect(mockFs.readFile).toHaveBeenCalledWith(
        expect.stringContaining('self-hosted.json'),
        'utf-8'
      );
    });

    it('should load development configuration', async () => {
      mockFs.readFile.mockResolvedValue(JSON.stringify(mockDevelopmentConfig));
      
      const config = await configLoader.loadConfig('development');
      
      expect(config).toEqual(mockDevelopmentConfig);
      expect(mockFs.readFile).toHaveBeenCalledWith(
        expect.stringContaining('development.json'),
        'utf-8'
      );
    });

    it('should load custom configuration file', async () => {
      const customConfig = { ...mockHostedConfig, serverName: 'custom-server' };
      mockFs.readFile.mockResolvedValue(JSON.stringify(customConfig));
      
      const config = await configLoader.loadConfig('hosted', '/custom/config.json');
      
      expect(config).toEqual(customConfig);
      expect(mockFs.readFile).toHaveBeenCalledWith('/custom/config.json', 'utf-8');
    });

    it('should throw error for invalid mode', async () => {
      await expect(configLoader.loadConfig('invalid' as any))
        .rejects.toThrow('Invalid deployment mode');
    });

    it('should throw error when config file not found', async () => {
      mockFs.readFile.mockRejectedValue(new Error('ENOENT: no such file or directory'));
      
      await expect(configLoader.loadConfig('hosted'))
        .rejects.toThrow('Configuration file not found');
    });

    it('should throw error for invalid JSON', async () => {
      mockFs.readFile.mockResolvedValue('invalid json content');
      
      await expect(configLoader.loadConfig('hosted'))
        .rejects.toThrow('Invalid configuration file format');
    });
  });

  describe('Environment Variable Overrides', () => {
    const baseConfig = {
      serverName: 'base-server',
      version: '1.0.0',
      podProtocol: {
        rpcEndpoint: 'http://localhost:8899',
        programId: 'base-program-id'
      },
      transports: {
        http: { enabled: true, port: 3000 },
        websocket: { enabled: true, port: 3001 },
        stdio: { enabled: false }
      }
    };

    beforeEach(() => {
      mockFs.readFile.mockResolvedValue(JSON.stringify(baseConfig));
    });

    it('should override server name from environment', async () => {
      process.env.MCP_SERVER_NAME = 'env-server-name';
      
      const config = await configLoader.loadConfig('development');
      
      expect(config.serverName).toBe('env-server-name');
    });

    it('should override PoD Protocol RPC endpoint from environment', async () => {
      process.env.POD_PROTOCOL_RPC_ENDPOINT = 'https://custom-rpc.com';
      
      const config = await configLoader.loadConfig('development');
      
      expect(config.podProtocol.rpcEndpoint).toBe('https://custom-rpc.com');
    });

    it('should override PoD Protocol program ID from environment', async () => {
      process.env.POD_PROTOCOL_PROGRAM_ID = 'env-program-id';
      
      const config = await configLoader.loadConfig('development');
      
      expect(config.podProtocol.programId).toBe('env-program-id');
    });

    it('should override HTTP port from environment', async () => {
      process.env.HTTP_PORT = '4000';
      
      const config = await configLoader.loadConfig('development');
      
      expect(config.transports.http.port).toBe(4000);
    });

    it('should override WebSocket port from environment', async () => {
      process.env.WS_PORT = '4001';
      
      const config = await configLoader.loadConfig('development');
      
      expect(config.transports.websocket.port).toBe(4001);
    });

    it('should override stdio enabled from environment', async () => {
      process.env.STDIO_ENABLED = 'true';
      
      const config = await configLoader.loadConfig('development');
      
      expect(config.transports.stdio.enabled).toBe(true);
    });

    it('should handle multiple environment overrides', async () => {
      process.env.MCP_SERVER_NAME = 'multi-env-server';
      process.env.HTTP_PORT = '5000';
      process.env.WS_PORT = '5001';
      
      const config = await configLoader.loadConfig('development');
      
      expect(config.serverName).toBe('multi-env-server');
      expect(config.transports.http.port).toBe(5000);
      expect(config.transports.websocket.port).toBe(5001);
    });
  });

  describe('Configuration Overrides', () => {
    const baseConfig = {
      serverName: 'base-server',
      version: '1.0.0',
      podProtocol: {
        rpcEndpoint: 'http://localhost:8899',
        programId: 'base-program-id'
      },
      transports: {
        http: { enabled: true, port: 3000 },
        websocket: { enabled: true, port: 3001 },
        stdio: { enabled: false }
      }
    };

    beforeEach(() => {
      mockFs.readFile.mockResolvedValue(JSON.stringify(baseConfig));
    });

    it('should apply simple overrides', async () => {
      const overrides = {
        serverName: 'override-server'
      };
      
      const config = await configLoader.loadConfig('development', undefined, overrides);
      
      expect(config.serverName).toBe('override-server');
    });

    it('should apply nested overrides', async () => {
      const overrides = {
        podProtocol: {
          rpcEndpoint: 'https://override-rpc.com'
        }
      };
      
      const config = await configLoader.loadConfig('development', undefined, overrides);
      
      expect(config.podProtocol.rpcEndpoint).toBe('https://override-rpc.com');
      expect(config.podProtocol.programId).toBe('base-program-id'); // Should preserve other fields
    });

    it('should apply deep nested overrides', async () => {
      const overrides = {
        transports: {
          http: {
            port: 8000
          }
        }
      };
      
      const config = await configLoader.loadConfig('development', undefined, overrides);
      
      expect(config.transports.http.port).toBe(8000);
      expect(config.transports.http.enabled).toBe(true); // Should preserve other fields
      expect(config.transports.websocket.port).toBe(3001); // Should preserve other transports
    });

    it('should prioritize environment variables over config overrides', async () => {
      process.env.MCP_SERVER_NAME = 'env-server';
      
      const overrides = {
        serverName: 'override-server'
      };
      
      const config = await configLoader.loadConfig('development', undefined, overrides);
      
      expect(config.serverName).toBe('env-server'); // Environment should win
    });
  });

  describe('Configuration Validation', () => {
    it('should validate required fields', async () => {
      const invalidConfig = {
        version: '1.0.0'
        // Missing serverName and podProtocol
      };
      
      mockFs.readFile.mockResolvedValue(JSON.stringify(invalidConfig));
      
      await expect(configLoader.loadConfig('development'))
        .rejects.toThrow('Invalid configuration');
    });

    it('should validate PoD Protocol configuration', async () => {
      const invalidConfig = {
        serverName: 'test-server',
        version: '1.0.0',
        podProtocol: {
          // Missing rpcEndpoint and programId
        }
      };
      
      mockFs.readFile.mockResolvedValue(JSON.stringify(invalidConfig));
      
      await expect(configLoader.loadConfig('development'))
        .rejects.toThrow('Invalid configuration');
    });

    it('should validate transport configuration', async () => {
      const invalidConfig = {
        serverName: 'test-server',
        version: '1.0.0',
        podProtocol: {
          rpcEndpoint: 'http://localhost:8899',
          programId: 'test-program-id'
        },
        transports: {
          http: {
            enabled: true
            // Missing port
          }
        }
      };
      
      mockFs.readFile.mockResolvedValue(JSON.stringify(invalidConfig));
      
      await expect(configLoader.loadConfig('development'))
        .rejects.toThrow('Invalid configuration');
    });
  });

  describe('Error Handling', () => {
    it('should handle file system errors gracefully', async () => {
      mockFs.readFile.mockRejectedValue(new Error('Permission denied'));
      
      await expect(configLoader.loadConfig('hosted'))
        .rejects.toThrow('Failed to load configuration');
    });

    it('should provide helpful error messages for common issues', async () => {
      // Test ENOENT error
      const enoentError = new Error('ENOENT: no such file or directory');
      (enoentError as any).code = 'ENOENT';
      mockFs.readFile.mockRejectedValue(enoentError);
      
      await expect(configLoader.loadConfig('hosted'))
        .rejects.toThrow('Configuration file not found');
    });

    it('should handle JSON parsing errors', async () => {
      mockFs.readFile.mockResolvedValue('{ invalid json }');
      
      await expect(configLoader.loadConfig('hosted'))
        .rejects.toThrow('Invalid configuration file format');
    });
  });

  describe('Configuration Merging', () => {
    it('should merge configurations correctly', () => {
      const base = {
        a: 1,
        b: {
          c: 2,
          d: 3
        },
        e: [1, 2, 3]
      };

      const override = {
        b: {
          c: 4
        },
        f: 5
      };

      const result = (configLoader as any).mergeConfigs(base, override);

      expect(result).toEqual({
        a: 1,
        b: {
          c: 4,
          d: 3
        },
        e: [1, 2, 3],
        f: 5
      });
    });

    it('should handle null and undefined values', () => {
      const base = {
        a: 1,
        b: null,
        c: undefined
      };

      const override = {
        b: 2,
        c: 3,
        d: null
      };

      const result = (configLoader as any).mergeConfigs(base, override);

      expect(result).toEqual({
        a: 1,
        b: 2,
        c: 3,
        d: null
      });
    });
  });
});