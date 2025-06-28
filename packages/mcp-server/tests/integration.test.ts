import { describe, it, expect, mock, beforeEach, afterEach } from 'bun:test';
import { PodProtocolMCPServer } from '../src/mcp-server';
import { ServerMetadata } from '../src/registry-integration';
import supertest from 'supertest';
import WebSocket from 'ws';
import type { Express } from 'express';
import type { ModernMCPServerConfig } from '../src/types';

// Mock external dependencies with bun test
mock.module('@pod-protocol/core', () => ({}));
mock.module('../src/utils/solana-auth', () => ({}));

describe('Integration Tests', () => {
  let server: PodProtocolMCPServer;
  let httpServer: Express.Application;
  let wsServer: WebSocket.Server;
  let testConfig: ModernMCPServerConfig;
  let testServerMetadata: ServerMetadata;

  beforeEach(async () => {
    testConfig = {
      server: {
        name: 'test-integration-server',
        version: '1.0.0',
        description: 'Test integration server'
      },
      pod_protocol: {
        rpc_endpoint: 'http://localhost:8899',
        program_id: 'test-program-id',
        commitment: 'confirmed' as const
      },
      transports: {
        http: { 
          enabled: true, 
          port: 0, // Use random port
          path: '/mcp',
          corsOrigins: ['*']
        },
        websocket: { 
          enabled: true, 
          port: 0, // Use random port
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

    testServerMetadata = {
      name: 'test-integration-server',
      displayName: 'Test Integration Server',
      version: '1.0.0',
      description: 'Test server for integration tests',
      author: {
        name: 'Test Suite',
        email: 'test@example.com'
      },
      license: 'MIT',
      homepage: 'https://test.example.com',
      repository: {
        type: 'git',
        url: 'https://github.com/test/test'
      },
      keywords: ['test', 'integration'],
      categories: ['testing'],
      capabilities: {
        tools: [],
        resources: [],
        features: ['tools', 'resources']
      },
      installation: {
        npm: 'test-integration-server'
      },
      configuration: {
        required: false,
        environment: []
      },
      integrations: {
        frameworks: []
      },
      maturity: 'experimental' as const,
      maintained: true,
      tags: {
        test: true,
        integration: true
      }
    };

    // Mock OAuth verification
    (global.fetch as any) = mock(() => Promise.resolve({
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: new Headers(),
      redirected: false,
      type: 'basic',
      url: '',
      clone: mock(),
      body: null,
      bodyUsed: false,
      arrayBuffer: mock(),
      blob: mock(),
      formData: mock(),
      text: mock(),
      json: mock(() => Promise.resolve({
        id: 'test-user-123',
        email: 'test@example.com',
        name: 'Test User',
        permissions: ['read', 'write']
      }))
    } as Response));
  });

  afterEach(async () => {
    if (server) {
      await server.stop();
    }
    mock.restore();
  });

  describe('Server Startup and Shutdown', () => {
    it('should start and stop server successfully', async () => {
      server = new PodProtocolMCPServer(testConfig, testServerMetadata);
      
      await expect(server.start()).resolves.not.toThrow();
      expect(server.isRunning()).toBe(true);
      
      await expect(server.stop()).resolves.toBe(true);
      expect(server.isRunning()).toBe(false);
    });

    it('should handle multiple start calls gracefully', async () => {
      server = new PodProtocolMCPServer(testConfig, testServerMetadata);
      
      await server.start();
      await expect(server.start()).resolves.not.toThrow();
      
      expect(server.isRunning()).toBe(true);
    });

    it('should handle stop calls when not running', async () => {
      server = new PodProtocolMCPServer(testConfig, testServerMetadata);
      
      const result = await server.stop();
      expect(result).toBe(false);
    });
  });

  describe('HTTP Transport Integration', () => {
    beforeEach(async () => {
      server = new PodProtocolMCPServer(testConfig, testServerMetadata);
      await server.start();
      httpServer = (server as any).transportManager.httpServer;
    });

    it('should handle health check endpoint', async () => {
      const response = await supertest(httpServer)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'healthy');
      expect(response.body).toHaveProperty('uptime');
      expect(response.body).toHaveProperty('version');
    });

    it('should handle MCP tool calls via HTTP', async () => {
      // First create a session
      const sessionResponse = await supertest(httpServer)
        .post('/session')
        .send({ oauthToken: 'valid-test-token' })
        .expect(201);

      const sessionId = sessionResponse.body.sessionId;

      // Then make a tool call
      const toolResponse = await supertest(httpServer)
        .post('/tools/discover_agents')
        .set('X-Session-ID', sessionId)
        .send({ query: 'test agents' })
        .expect(200);

      expect(toolResponse.body).toHaveProperty('agents');
      expect(Array.isArray(toolResponse.body.agents)).toBe(true);
    });

    it('should handle resource requests via HTTP', async () => {
      // Create a session first
      const sessionResponse = await supertest(httpServer)
        .post('/session')
        .send({ oauthToken: 'valid-test-token' })
        .expect(201);

      const sessionId = sessionResponse.body.sessionId;

      // Request a resource
      const resourceResponse = await supertest(httpServer)
        .get('/resources/pod://server/health')
        .set('X-Session-ID', sessionId)
        .expect(200);

      expect(resourceResponse.body).toHaveProperty('contents');
      expect(Array.isArray(resourceResponse.body.contents)).toBe(true);
    });

    it('should require authentication for protected endpoints', async () => {
      await supertest(httpServer)
        .post('/tools/register_agent')
        .send({ name: 'Test Agent', description: 'Test', capabilities: ['chat'] })
        .expect(401);
    });

    it('should handle invalid session IDs', async () => {
      await supertest(httpServer)
        .post('/tools/discover_agents')
        .set('X-Session-ID', 'invalid-session-id')
        .send({ query: 'test' })
        .expect(401);
    });
  });

  describe('WebSocket Transport Integration', () => {
    let wsClient: WebSocket;
    let wsPort: number;

    beforeEach(async () => {
      server = new PodProtocolMCPServer(testConfig, testServerMetadata);
      await server.start();
      wsPort = (server as any).transportManager.wsPort;
    });

    afterEach(() => {
      if (wsClient && wsClient.readyState === WebSocket.OPEN) {
        wsClient.close();
      }
    });

    it('should accept WebSocket connections', (done) => {
      wsClient = new WebSocket(`ws://localhost:${wsPort}`);
      
      wsClient.on('open', () => {
        expect(wsClient.readyState).toBe(WebSocket.OPEN);
        done();
      });

      wsClient.on('error', done);
    });

    it('should handle MCP messages via WebSocket', (done) => {
      wsClient = new WebSocket(`ws://localhost:${wsPort}`);
      
      wsClient.on('open', () => {
        // Send authentication message
        const authMessage = {
          jsonrpc: '2.0',
          id: 1,
          method: 'session/create',
          params: { oauthToken: 'valid-test-token' }
        };
        
        wsClient.send(JSON.stringify(authMessage));
      });

      wsClient.on('message', (data) => {
        const message = JSON.parse(data.toString());
        
        if (message.id === 1) {
          // Authentication response
          expect(message.result).toHaveProperty('sessionId');
          
          // Send tool call
          const toolMessage = {
            jsonrpc: '2.0',
            id: 2,
            method: 'tools/call',
            params: {
              name: 'discover_agents',
              arguments: { query: 'test' },
              sessionId: message.result.sessionId
            }
          };
          
          wsClient.send(JSON.stringify(toolMessage));
        } else if (message.id === 2) {
          // Tool call response
          expect(message.result).toHaveProperty('agents');
          done();
        }
      });

      wsClient.on('error', done);
    });

    it('should handle connection errors gracefully', (done) => {
      // Try to connect to wrong port
      wsClient = new WebSocket(`ws://localhost:${wsPort + 1000}`);
      
      wsClient.on('error', (error) => {
        expect(error).toBeDefined();
        done();
      });
    });
  });

  describe('Session Management Integration', () => {
    beforeEach(async () => {
      server = new PodProtocolMCPServer(testConfig, testServerMetadata);
      await server.start();
      httpServer = (server as any).transportManager.httpServer;
    });

    it('should create and manage sessions correctly', async () => {
      // Create session
      const createResponse = await supertest(httpServer)
        .post('/session')
        .send({ oauthToken: 'valid-test-token' })
        .expect(201);

      const sessionId = createResponse.body.sessionId;
      expect(sessionId).toBeDefined();

      // Get session info
      const infoResponse = await supertest(httpServer)
        .get('/session')
        .set('X-Session-ID', sessionId)
        .expect(200);

      expect(infoResponse.body).toHaveProperty('userId', 'test-user-123');
      expect(infoResponse.body).toHaveProperty('isAuthenticated', true);

      // Delete session
      await supertest(httpServer)
        .delete('/session')
        .set('X-Session-ID', sessionId)
        .expect(200);

      // Verify session is deleted
      await supertest(httpServer)
        .get('/session')
        .set('X-Session-ID', sessionId)
        .expect(401);
    });

    it('should enforce session limits', async () => {
      const maxSessions = 5;
      const sessions = [];

      // Create maximum allowed sessions
      for (let i = 0; i < maxSessions; i++) {
        const response = await supertest(httpServer)
          .post('/session')
          .send({ oauthToken: 'valid-test-token' })
          .expect(201);
        
        sessions.push(response.body.sessionId);
      }

      // Try to create one more session
      await supertest(httpServer)
        .post('/session')
        .send({ oauthToken: 'valid-test-token' })
        .expect(429); // Too Many Requests
    });

    it('should handle session timeout', async () => {
      // This test would require modifying session timeout for testing
      // or using a mock timer, which is complex for integration tests
      // For now, we'll just verify the session exists
      
      const response = await supertest(httpServer)
        .post('/session')
        .send({ oauthToken: 'valid-test-token' })
        .expect(201);

      const sessionId = response.body.sessionId;
      
      // Verify session exists
      await supertest(httpServer)
        .get('/session')
        .set('X-Session-ID', sessionId)
        .expect(200);
    });
  });

  describe('Error Handling Integration', () => {
    beforeEach(async () => {
      server = new PodProtocolMCPServer(testConfig, testServerMetadata);
      await server.start();
      httpServer = (server as any).transportManager.httpServer;
    });

    it('should handle malformed requests', async () => {
      await supertest(httpServer)
        .post('/tools/register_agent')
        .send('invalid json')
        .expect(400);
    });

    it('should handle unknown tool calls', async () => {
      const sessionResponse = await supertest(httpServer)
        .post('/session')
        .send({ oauthToken: 'valid-test-token' })
        .expect(201);

      const sessionId = sessionResponse.body.sessionId;

      await supertest(httpServer)
        .post('/tools/unknown_tool')
        .set('X-Session-ID', sessionId)
        .send({})
        .expect(404);
    });

    it('should handle invalid resource URIs', async () => {
      const sessionResponse = await supertest(httpServer)
        .post('/session')
        .send({ oauthToken: 'valid-test-token' })
        .expect(201);

      const sessionId = sessionResponse.body.sessionId;

      await supertest(httpServer)
        .get('/resources/invalid://resource/uri')
        .set('X-Session-ID', sessionId)
        .expect(404);
    });

    it('should handle OAuth token validation failures', async () => {
      // Mock OAuth failure
      (global.fetch as any) = mock(() => Promise.resolve({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        headers: new Headers(),
        redirected: false,
        type: 'basic',
        url: '',
        clone: mock(),
        body: null,
        bodyUsed: false,
        arrayBuffer: mock(),
        blob: mock(),
        formData: mock(),
        text: mock(),
        json: mock()
      } as Response));

      await supertest(httpServer)
        .post('/session')
        .send({ oauthToken: 'invalid-token' })
        .expect(401);
    });
  });

  describe('Performance and Load Testing', () => {
    beforeEach(async () => {
      server = new PodProtocolMCPServer(testConfig, testServerMetadata);
      await server.start();
      httpServer = (server as any).transportManager.httpServer;
    });

    it('should handle multiple concurrent requests', async () => {
      // Create a session first
      const sessionResponse = await supertest(httpServer)
        .post('/session')
        .send({ oauthToken: 'valid-test-token' })
        .expect(201);

      const sessionId = sessionResponse.body.sessionId;

      // Make multiple concurrent requests
      const requests = Array(10).fill(null).map(() => 
        supertest(httpServer)
          .post('/tools/discover_agents')
          .set('X-Session-ID', sessionId)
          .send({ query: 'test' })
      );

      const responses = await Promise.all(requests);
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('agents');
      });
    });

    it('should handle rapid session creation and deletion', async () => {
      const operations = [];

      // Create and delete sessions rapidly
      for (let i = 0; i < 5; i++) {
        operations.push(
          supertest(httpServer)
            .post('/session')
            .send({ oauthToken: 'valid-test-token' })
            .then(response => {
              const sessionId = response.body.sessionId;
              return supertest(httpServer)
                .delete('/session')
                .set('X-Session-ID', sessionId);
            })
        );
      }

      const results = await Promise.all(operations);
      results.forEach(result => {
        expect(result.status).toBe(200);
      });
    });
  });
});