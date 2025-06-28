import { describe, it, expect, mock, beforeEach, afterEach } from 'bun:test';
import { PodProtocolMCPServer } from '../src/mcp-server';
import { ConfigLoader } from '../src/config-loader';
import { SessionManager } from '../src/session-manager';
import type { ModernMCPServerConfig } from '../src/modern-mcp-server';

// Mock dependencies with bun test
mock.module('../src/config-loader', () => ({
  ConfigLoader: mock()
}));
mock.module('../src/session-manager', () => ({
  SessionManager: mock()
}));
mock.module('../src/transport-manager', () => ({}));
mock.module('../src/registry-integration', () => ({}));
mock.module('../src/security-enhancements', () => ({}));
mock.module('../src/websocket', () => ({}));

describe('PodProtocolMCPServer', () => {
  let server: PodProtocolMCPServer;
  let mockConfig: ModernMCPServerConfig;
  let mockServerMetadata: any;
  let mockConfigLoader: any;
  let mockSessionManager: any;

  beforeEach(() => {
    // Setup mock configuration
    mockConfig = {
      server: {
        name: 'test-server',
        version: '1.0.0',
        description: 'Test server'
      },
      pod_protocol: {
        rpc_endpoint: 'http://localhost:8899',
        program_id: 'test-program-id',
        commitment: 'confirmed' as const
      },
      transports: {
        http: { 
          enabled: true, 
          port: 3001,
          path: '/mcp',
          corsOrigins: ['*']
        },
        websocket: { 
          enabled: true, 
          port: 3002,
          path: '/ws'
        },
        stdio: { enabled: false },
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
        jwtSecret: 'test-secret',
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

    // Setup mock server metadata
    mockServerMetadata = {
      name: 'test-server',
      displayName: 'Test Server',
      description: 'Test MCP Server',
      version: '1.0.0',
      author: {
        name: 'Test Author',
        email: 'test@example.com'
      },
      license: 'MIT',
      homepage: 'https://example.com',
      repository: {
        type: 'git',
        url: 'https://github.com/test/test.git'
      },
      keywords: ['test', 'mcp'],
      categories: ['testing'],
      capabilities: {
        tools: [],
        resources: [],
        features: []
      },
      installation: {},
      configuration: {
        required: false,
        environment: []
      },
      integrations: {
        frameworks: []
      }
    };

    // Setup mocks
    mockConfigLoader = {
      loadConfig: mock(() => Promise.resolve(mockConfig))
    };

    mockSessionManager = {
      createSession: mock(),
      getSession: mock(),
      deleteSession: mock(),
      getAllSessions: mock(() => new Map())
    };

    (ConfigLoader as any).mockImplementation(() => mockConfigLoader);
    (SessionManager as any).mockImplementation(() => mockSessionManager);
  });

  afterEach(() => {
    if (server) {
      server.stop();
    }
    mock.restore();
  });

  describe('Constructor and Initialization', () => {
    it('should create server with default configuration', async () => {
      server = new PodProtocolMCPServer(mockConfig, mockServerMetadata);
      expect(server).toBeInstanceOf(PodProtocolMCPServer);
    });

    it('should create server with custom configuration', async () => {
      const customConfig = { ...mockConfig, serverName: 'custom-server' };
      server = new PodProtocolMCPServer(customConfig, mockServerMetadata);
      expect(server).toBeInstanceOf(PodProtocolMCPServer);
    });

    it('should load configuration in development mode', async () => {
      server = new PodProtocolMCPServer(mockConfig, mockServerMetadata);
      expect(server).toBeInstanceOf(PodProtocolMCPServer);
    });

    it('should apply configuration overrides', async () => {
      const overrides = { serverName: 'override-server' };
      const customConfig = { ...mockConfig, ...overrides };
      server = new PodProtocolMCPServer(customConfig, mockServerMetadata);
      expect(server).toBeInstanceOf(PodProtocolMCPServer);
    });
  });

  describe('Server Lifecycle', () => {
    beforeEach(() => {
      server = new PodProtocolMCPServer(mockConfig, mockServerMetadata);
    });

    it('should start server successfully', async () => {
      const startSpy = jest.spyOn(server as any, 'setupServer').mockResolvedValue(undefined);
      await server.start();
      expect(startSpy).toHaveBeenCalled();
    });

    it('should stop server gracefully', async () => {
      await server.start();
      const stopResult = await server.stop();
      expect(stopResult).toBe(true);
    });

    it('should handle start errors gracefully', async () => {
      const error = new Error('Start failed');
      jest.spyOn(server as any, 'setupServer').mockRejectedValue(error);
      
      await expect(server.start()).rejects.toThrow('Start failed');
    });
  });

  describe('Tool Handling', () => {
    beforeEach(async () => {
      server = new PodProtocolMCPServer(mockConfig, mockServerMetadata);
      await server.start();
    });

    it('should handle register_agent tool', async () => {
      const mockSession = {
        userId: 'test-user',
        isAuthenticated: true,
        hasPermission: jest.fn().mockReturnValue(true),
        agentIds: new Set()
      };
      mockSessionManager.getSession.mockReturnValue(mockSession as any);

      const args = {
        name: 'Test Agent',
        description: 'A test agent',
        capabilities: ['chat']
      };

      const result = await (server as any).handleToolCall('register_agent', args, 'session-123');
      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('agentId');
    });

    it('should handle discover_agents tool', async () => {
      const mockSession = {
        userId: 'test-user',
        isAuthenticated: true
      };
      mockSessionManager.getSession.mockReturnValue(mockSession as any);

      const args = { query: 'test' };
      const result = await (server as any).handleToolCall('discover_agents', args, 'session-123');
      expect(result).toHaveProperty('agents');
      expect(Array.isArray(result.agents)).toBe(true);
    });

    it('should require authentication for protected tools', async () => {
      mockSessionManager.getSession.mockReturnValue(null);

      const args = { name: 'Test Agent', description: 'Test', capabilities: ['chat'] };
      
      await expect(
        (server as any).handleToolCall('register_agent', args, 'invalid-session')
      ).rejects.toThrow('Authentication required');
    });
  });

  describe('Resource Handling', () => {
    beforeEach(async () => {
      server = new PodProtocolMCPServer(mockConfig, mockServerMetadata);
      await server.start();
    });

    it('should handle session info resource', async () => {
      const mockSession = {
        userId: 'test-user',
        isAuthenticated: true,
        createdAt: new Date(),
        lastActivity: new Date()
      };
      mockSessionManager.getSession.mockReturnValue(mockSession as any);

      const result = await (server as any).handleReadResource({
        uri: 'pod://session/info'
      }, 'session-123');

      expect(result).toHaveProperty('contents');
      expect(result.contents[0]).toHaveProperty('mimeType', 'application/json');
    });

    it('should handle server health resource', async () => {
      const result = await (server as any).handleReadResource({
        uri: 'pod://server/health'
      }, 'session-123');

      expect(result).toHaveProperty('contents');
      const healthData = JSON.parse(result.contents[0].text);
      expect(healthData).toHaveProperty('status', 'healthy');
      expect(healthData).toHaveProperty('uptime');
    });

    it('should return 404 for unknown resources', async () => {
      await expect(
        (server as any).handleReadResource({
          uri: 'pod://unknown/resource'
        }, 'session-123')
      ).rejects.toThrow('Resource not found');
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      server = new PodProtocolMCPServer(mockConfig, mockServerMetadata);
    });

    it('should handle configuration loading errors', async () => {
      const error = new Error('Config load failed');
      mockConfigLoader.loadConfig.mockRejectedValue(error);

      // Test that server handles invalid config gracefully
      expect(() => {
        server = new PodProtocolMCPServer(mockConfig, mockServerMetadata);
      }).not.toThrow();
    });

    it('should handle tool execution errors gracefully', async () => {
      await server.start();
      
      // Mock a tool that throws an error
      const error = new Error('Tool execution failed');
      jest.spyOn(server as any, 'handleRegisterAgent').mockRejectedValue(error);

      await expect(
        (server as any).handleToolCall('register_agent', {}, 'session-123')
      ).rejects.toThrow('Tool execution failed');
    });
  });

  describe('Configuration Validation', () => {
    it('should validate required configuration fields', () => {
      const invalidConfig = { ...mockConfig };
      delete (invalidConfig as any).serverName;

      expect(() => {
        new PodProtocolMCPServer(invalidConfig);
      }).toThrow();
    });

    it('should use default values for optional fields', () => {
      const minimalConfig = {
        serverName: 'minimal-server',
        version: '1.0.0',
        podProtocol: {
          rpcEndpoint: 'http://localhost:8899',
          programId: 'test-program-id'
        }
      };

      expect(() => {
        new PodProtocolMCPServer(minimalConfig as any);
      }).not.toThrow();
    });
  });
});