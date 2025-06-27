import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { PodProtocolMCPServer } from '../src/mcp-server';
import { SessionManager } from '../src/session-manager';
import { ServerMetadata } from '../src/registry-integration';
import supertest from 'supertest';
import { performance } from 'perf_hooks';
import type { ModernMCPServerConfig } from '../src/types';

// Mock external dependencies
jest.mock('@pod-protocol/core');
jest.mock('../src/utils/solana-auth');

describe('Performance Tests', () => {
  let server: PodProtocolMCPServer;
  let httpServer: any;
  let testConfig: ModernMCPServerConfig;
  let testServerMetadata: ServerMetadata;

  beforeEach(async () => {
    testConfig = {
      serverName: 'test-performance-server',
      version: '1.0.0',
      podProtocol: {
        rpcEndpoint: 'http://localhost:8899',
        programId: 'test-program-id'
      },
      transports: {
        http: { enabled: true, port: 0 },
        websocket: { enabled: true, port: 0 },
        stdio: { enabled: false }
      },
      registry: { enabled: false },
      security: { enabled: false },
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

    testServerMetadata = {
      name: 'test-performance-server',
      version: '1.0.0',
      description: 'Test server for performance tests',
      author: 'Test Suite',
      license: 'MIT',
      homepage: 'https://test.example.com',
      repository: 'https://github.com/test/test',
      tags: ['test', 'performance'],
      capabilities: ['tools', 'resources'],
      mcpVersion: '2025-01-07'
    };

    // Mock OAuth verification
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        id: 'test-user-123',
        email: 'test@example.com',
        name: 'Test User',
        permissions: ['read', 'write']
      })
    }) as jest.MockedFunction<typeof fetch>;

    server = new PodProtocolMCPServer(testConfig, testServerMetadata);
    await server.start();
    httpServer = (server as any).transportManager.httpServer;
  });

  afterEach(async () => {
    if (server) {
      await server.stop();
    }
    jest.clearAllMocks();
  });

  describe('Response Time Benchmarks', () => {
    let sessionId: string;

    beforeEach(async () => {
      const sessionResponse = await supertest(httpServer)
        .post('/session')
        .send({ oauthToken: 'valid-test-token' });
      sessionId = sessionResponse.body.sessionId;
    });

    it('should handle health checks within 50ms', async () => {
      const iterations = 100;
      const times: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        
        await supertest(httpServer)
          .get('/health')
          .expect(200);
        
        const end = performance.now();
        times.push(end - start);
      }

      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      const maxTime = Math.max(...times);
      const p95Time = times.sort((a, b) => a - b)[Math.floor(times.length * 0.95)];

      console.log(`Health check performance:`);
      console.log(`  Average: ${avgTime.toFixed(2)}ms`);
      console.log(`  Maximum: ${maxTime.toFixed(2)}ms`);
      console.log(`  95th percentile: ${p95Time.toFixed(2)}ms`);

      expect(avgTime).toBeLessThan(50);
      expect(p95Time).toBeLessThan(100);
    });

    it('should handle tool calls within 200ms', async () => {
      const iterations = 50;
      const times: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        
        await supertest(httpServer)
          .post('/tools/discover_agents')
          .set('X-Session-ID', sessionId)
          .send({ query: 'test agents' })
          .expect(200);
        
        const end = performance.now();
        times.push(end - start);
      }

      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      const maxTime = Math.max(...times);
      const p95Time = times.sort((a, b) => a - b)[Math.floor(times.length * 0.95)];

      console.log(`Tool call performance:`);
      console.log(`  Average: ${avgTime.toFixed(2)}ms`);
      console.log(`  Maximum: ${maxTime.toFixed(2)}ms`);
      console.log(`  95th percentile: ${p95Time.toFixed(2)}ms`);

      expect(avgTime).toBeLessThan(200);
      expect(p95Time).toBeLessThan(500);
    });

    it('should handle resource requests within 100ms', async () => {
      const iterations = 50;
      const times: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        
        await supertest(httpServer)
          .get('/resources/pod://server/health')
          .set('X-Session-ID', sessionId)
          .expect(200);
        
        const end = performance.now();
        times.push(end - start);
      }

      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      const maxTime = Math.max(...times);
      const p95Time = times.sort((a, b) => a - b)[Math.floor(times.length * 0.95)];

      console.log(`Resource request performance:`);
      console.log(`  Average: ${avgTime.toFixed(2)}ms`);
      console.log(`  Maximum: ${maxTime.toFixed(2)}ms`);
      console.log(`  95th percentile: ${p95Time.toFixed(2)}ms`);

      expect(avgTime).toBeLessThan(100);
      expect(p95Time).toBeLessThan(250);
    });
  });

  describe('Concurrent Load Testing', () => {
    it('should handle 100 concurrent health checks', async () => {
      const concurrentRequests = 100;
      const start = performance.now();

      const requests = Array(concurrentRequests).fill(null).map(() =>
        supertest(httpServer)
          .get('/health')
          .expect(200)
      );

      const responses = await Promise.all(requests);
      const end = performance.now();
      const totalTime = end - start;

      console.log(`Concurrent health checks (${concurrentRequests}):`);
      console.log(`  Total time: ${totalTime.toFixed(2)}ms`);
      console.log(`  Requests per second: ${(concurrentRequests / (totalTime / 1000)).toFixed(2)}`);

      expect(responses).toHaveLength(concurrentRequests);
      expect(totalTime).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should handle 50 concurrent tool calls', async () => {
      // Create session first
      const sessionResponse = await supertest(httpServer)
        .post('/session')
        .send({ oauthToken: 'valid-test-token' });
      const sessionId = sessionResponse.body.sessionId;

      const concurrentRequests = 50;
      const start = performance.now();

      const requests = Array(concurrentRequests).fill(null).map(() =>
        supertest(httpServer)
          .post('/tools/discover_agents')
          .set('X-Session-ID', sessionId)
          .send({ query: 'test agents' })
          .expect(200)
      );

      const responses = await Promise.all(requests);
      const end = performance.now();
      const totalTime = end - start;

      console.log(`Concurrent tool calls (${concurrentRequests}):`);
      console.log(`  Total time: ${totalTime.toFixed(2)}ms`);
      console.log(`  Requests per second: ${(concurrentRequests / (totalTime / 1000)).toFixed(2)}`);

      expect(responses).toHaveLength(concurrentRequests);
      expect(totalTime).toBeLessThan(10000); // Should complete within 10 seconds
    });

    it('should handle mixed concurrent requests', async () => {
      // Create session first
      const sessionResponse = await supertest(httpServer)
        .post('/session')
        .send({ oauthToken: 'valid-test-token' });
      const sessionId = sessionResponse.body.sessionId;

      const healthChecks = 30;
      const toolCalls = 20;
      const resourceRequests = 20;
      const start = performance.now();

      const requests = [
        // Health checks
        ...Array(healthChecks).fill(null).map(() =>
          supertest(httpServer).get('/health').expect(200)
        ),
        // Tool calls
        ...Array(toolCalls).fill(null).map(() =>
          supertest(httpServer)
            .post('/tools/discover_agents')
            .set('X-Session-ID', sessionId)
            .send({ query: 'test' })
            .expect(200)
        ),
        // Resource requests
        ...Array(resourceRequests).fill(null).map(() =>
          supertest(httpServer)
            .get('/resources/pod://server/health')
            .set('X-Session-ID', sessionId)
            .expect(200)
        )
      ];

      const responses = await Promise.all(requests);
      const end = performance.now();
      const totalTime = end - start;
      const totalRequests = healthChecks + toolCalls + resourceRequests;

      console.log(`Mixed concurrent requests (${totalRequests}):`);
      console.log(`  Health checks: ${healthChecks}`);
      console.log(`  Tool calls: ${toolCalls}`);
      console.log(`  Resource requests: ${resourceRequests}`);
      console.log(`  Total time: ${totalTime.toFixed(2)}ms`);
      console.log(`  Requests per second: ${(totalRequests / (totalTime / 1000)).toFixed(2)}`);

      expect(responses).toHaveLength(totalRequests);
      expect(totalTime).toBeLessThan(15000); // Should complete within 15 seconds
    });
  });

  describe('Memory Usage Testing', () => {
    it('should not leak memory during session creation/deletion', async () => {
      const initialMemory = process.memoryUsage();
      const iterations = 100;

      for (let i = 0; i < iterations; i++) {
        // Create session
        const createResponse = await supertest(httpServer)
          .post('/session')
          .send({ oauthToken: 'valid-test-token' })
          .expect(201);

        const sessionId = createResponse.body.sessionId;

        // Use session
        await supertest(httpServer)
          .post('/tools/discover_agents')
          .set('X-Session-ID', sessionId)
          .send({ query: 'test' })
          .expect(200);

        // Delete session
        await supertest(httpServer)
          .delete('/session')
          .set('X-Session-ID', sessionId)
          .expect(200);

        // Force garbage collection every 10 iterations
        if (i % 10 === 0 && global.gc) {
          global.gc();
        }
      }

      // Force final garbage collection
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      const memoryIncreasePercent = (memoryIncrease / initialMemory.heapUsed) * 100;

      console.log(`Memory usage after ${iterations} session cycles:`);
      console.log(`  Initial heap: ${(initialMemory.heapUsed / 1024 / 1024).toFixed(2)} MB`);
      console.log(`  Final heap: ${(finalMemory.heapUsed / 1024 / 1024).toFixed(2)} MB`);
      console.log(`  Increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)} MB (${memoryIncreasePercent.toFixed(2)}%)`);

      // Memory increase should be reasonable (less than 50% increase)
      expect(memoryIncreasePercent).toBeLessThan(50);
    });

    it('should handle large payloads efficiently', async () => {
      const sessionResponse = await supertest(httpServer)
        .post('/session')
        .send({ oauthToken: 'valid-test-token' });
      const sessionId = sessionResponse.body.sessionId;

      // Create a large query string
      const largeQuery = 'test '.repeat(1000); // ~5KB query
      const initialMemory = process.memoryUsage();
      const start = performance.now();

      await supertest(httpServer)
        .post('/tools/discover_agents')
        .set('X-Session-ID', sessionId)
        .send({ query: largeQuery })
        .expect(200);

      const end = performance.now();
      const finalMemory = process.memoryUsage();
      const responseTime = end - start;
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

      console.log(`Large payload handling:`);
      console.log(`  Payload size: ~${(largeQuery.length / 1024).toFixed(2)} KB`);
      console.log(`  Response time: ${responseTime.toFixed(2)}ms`);
      console.log(`  Memory increase: ${(memoryIncrease / 1024).toFixed(2)} KB`);

      expect(responseTime).toBeLessThan(1000); // Should handle within 1 second
      expect(memoryIncrease).toBeLessThan(1024 * 1024); // Should not increase by more than 1MB
    });
  });

  describe('Throughput Testing', () => {
    it('should maintain throughput under sustained load', async () => {
      const sessionResponse = await supertest(httpServer)
        .post('/session')
        .send({ oauthToken: 'valid-test-token' });
      const sessionId = sessionResponse.body.sessionId;

      const duration = 10000; // 10 seconds
      const requestInterval = 100; // Request every 100ms
      const expectedRequests = duration / requestInterval;
      
      let completedRequests = 0;
      let errors = 0;
      const responseTimes: number[] = [];
      const start = performance.now();

      const makeRequest = async () => {
        const requestStart = performance.now();
        try {
          await supertest(httpServer)
            .post('/tools/discover_agents')
            .set('X-Session-ID', sessionId)
            .send({ query: 'sustained load test' })
            .expect(200);
          
          const requestEnd = performance.now();
          responseTimes.push(requestEnd - requestStart);
          completedRequests++;
        } catch (error) {
          errors++;
        }
      };

      // Start sustained load
      const interval = setInterval(makeRequest, requestInterval);

      // Wait for test duration
      await new Promise(resolve => setTimeout(resolve, duration));
      clearInterval(interval);

      // Wait for any pending requests
      await new Promise(resolve => setTimeout(resolve, 1000));

      const end = performance.now();
      const actualDuration = end - start;
      const throughput = (completedRequests / (actualDuration / 1000));
      const errorRate = (errors / (completedRequests + errors)) * 100;
      const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;

      console.log(`Sustained load test results:`);
      console.log(`  Duration: ${(actualDuration / 1000).toFixed(2)}s`);
      console.log(`  Completed requests: ${completedRequests}`);
      console.log(`  Errors: ${errors}`);
      console.log(`  Throughput: ${throughput.toFixed(2)} req/s`);
      console.log(`  Error rate: ${errorRate.toFixed(2)}%`);
      console.log(`  Average response time: ${avgResponseTime.toFixed(2)}ms`);

      expect(completedRequests).toBeGreaterThan(expectedRequests * 0.8); // At least 80% of expected
      expect(errorRate).toBeLessThan(5); // Less than 5% error rate
      expect(avgResponseTime).toBeLessThan(500); // Average response time under 500ms
    });
  });

  describe('Resource Cleanup Testing', () => {
    it('should clean up expired sessions automatically', async () => {
      // This test would require modifying session timeout for testing
      // For now, we'll test the cleanup mechanism exists
      const sessionManager = (server as any).sessionManager as SessionManager;
      
      // Create multiple sessions
      const sessions = [];
      for (let i = 0; i < 5; i++) {
        const response = await supertest(httpServer)
          .post('/session')
          .send({ oauthToken: 'valid-test-token' });
        sessions.push(response.body.sessionId);
      }

      const initialCount = sessionManager.getSessionCount();
      expect(initialCount).toBe(5);

      // Trigger cleanup (this should not remove active sessions)
      sessionManager.cleanup();
      
      const afterCleanupCount = sessionManager.getSessionCount();
      expect(afterCleanupCount).toBe(5); // Should still have all sessions
    });

    it('should handle server shutdown gracefully', async () => {
      // Create some sessions and make requests
      const sessions = [];
      for (let i = 0; i < 3; i++) {
        const response = await supertest(httpServer)
          .post('/session')
          .send({ oauthToken: 'valid-test-token' });
        sessions.push(response.body.sessionId);
      }

      // Start some ongoing requests
      const ongoingRequests = sessions.map(sessionId =>
        supertest(httpServer)
          .post('/tools/discover_agents')
          .set('X-Session-ID', sessionId)
          .send({ query: 'shutdown test' })
      );

      // Wait a bit then shutdown
      setTimeout(async () => {
        const shutdownStart = performance.now();
        const result = await server.stop();
        const shutdownTime = performance.now() - shutdownStart;
        
        console.log(`Graceful shutdown completed in ${shutdownTime.toFixed(2)}ms`);
        expect(result).toBe(true);
        expect(shutdownTime).toBeLessThan(5000); // Should shutdown within 5 seconds
      }, 100);

      // Wait for ongoing requests to complete or be terminated
      await Promise.allSettled(ongoingRequests);
    });
  });
});