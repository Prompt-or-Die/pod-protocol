import { test, expect, describe, beforeAll, afterAll, beforeEach } from "bun:test";
import { spawn, ChildProcess } from "child_process";
import { join } from "path";

// Test configuration
const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:8080";
const TEST_TIMEOUT = 30000;

let serverProcess: ChildProcess | null = null;

// Test utilities
class APITestClient {
  private baseUrl: string;
  
  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  async get(endpoint: string, headers: Record<string, string> = {}) {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    });
    return {
      status: response.status,
      data: await response.json().catch(() => ({})),
      headers: response.headers
    };
  }

  async post(endpoint: string, data: any = {}, headers: Record<string, string> = {}) {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      body: JSON.stringify(data)
    });
    return {
      status: response.status,
      data: await response.json().catch(() => ({})),
      headers: response.headers
    };
  }

  async put(endpoint: string, data: any = {}, headers: Record<string, string> = {}) {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      body: JSON.stringify(data)
    });
    return {
      status: response.status,
      data: await response.json().catch(() => ({})),
      headers: response.headers
    };
  }

  async delete(endpoint: string, headers: Record<string, string> = {}) {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    });
    return {
      status: response.status,
      data: await response.json().catch(() => ({})),
      headers: response.headers
    };
  }
}

// WebSocket test utilities
class WebSocketTestClient {
  private ws: WebSocket | null = null;
  private messages: any[] = [];

  async connect(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(url);
      this.ws.onopen = () => resolve();
      this.ws.onerror = (error) => reject(error);
      this.ws.onmessage = (event) => {
        this.messages.push(JSON.parse(event.data));
      };
    });
  }

  send(data: any) {
    if (this.ws) {
      this.ws.send(JSON.stringify(data));
    }
  }

  getMessages() {
    return this.messages;
  }

  close() {
    if (this.ws) {
      this.ws.close();
    }
  }
}

describe("API Server E2E Tests", () => {
  let client: APITestClient;

  beforeAll(async () => {
    // Start the API server for testing
    const serverPath = join(__dirname, "../../dist/index.js");
    serverProcess = spawn("node", [serverPath], {
      env: { 
        ...process.env, 
        PORT: "8080",
        NODE_ENV: "test",
        DATABASE_URL: "postgresql://test:test@localhost:5432/pod_test"
      },
      stdio: 'pipe'
    });

    // Wait for server to start
    await new Promise(resolve => setTimeout(resolve, 5000));
    client = new APITestClient(API_BASE_URL);
  }, TEST_TIMEOUT);

  afterAll(async () => {
    if (serverProcess) {
      serverProcess.kill();
    }
  });

  describe("Health Check", () => {
    test("should return health status", async () => {
      const response = await client.get("/health");
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty("status");
      expect(response.data.status).toBe("healthy");
    });

    test("should return detailed health info", async () => {
      const response = await client.get("/health/detailed");
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty("database");
      expect(response.data).toHaveProperty("redis");
      expect(response.data).toHaveProperty("uptime");
    });
  });

  describe("Agent Management", () => {
    let agentId: string;

    test("should create a new agent", async () => {
      const agentData = {
        name: "Test Agent",
        description: "A test agent for e2e testing",
        publicKey: "HEpGLgYsE1kP8aoYKyLFc3JVVrofS7T4zEA6fWBJsZps",
        capabilities: ["messaging", "escrow"]
      };

      const response = await client.post("/api/agents", agentData);
      expect(response.status).toBe(201);
      expect(response.data).toHaveProperty("id");
      expect(response.data.name).toBe(agentData.name);
      agentId = response.data.id;
    });

    test("should list all agents", async () => {
      const response = await client.get("/api/agents");
      expect(response.status).toBe(200);
      expect(Array.isArray(response.data)).toBe(true);
      expect(response.data.length).toBeGreaterThan(0);
    });

    test("should get agent by ID", async () => {
      const response = await client.get(`/api/agents/${agentId}`);
      expect(response.status).toBe(200);
      expect(response.data.id).toBe(agentId);
    });

    test("should update agent", async () => {
      const updateData = {
        description: "Updated test agent description"
      };

      const response = await client.put(`/api/agents/${agentId}`, updateData);
      expect(response.status).toBe(200);
      expect(response.data.description).toBe(updateData.description);
    });

    test("should delete agent", async () => {
      const response = await client.delete(`/api/agents/${agentId}`);
      expect(response.status).toBe(204);

      // Verify deletion
      const getResponse = await client.get(`/api/agents/${agentId}`);
      expect(getResponse.status).toBe(404);
    });
  });

  describe("Channel Management", () => {
    let channelId: string;

    test("should create a new channel", async () => {
      const channelData = {
        name: "Test Channel",
        description: "A test channel for e2e testing",
        isPrivate: false,
        maxParticipants: 100
      };

      const response = await client.post("/api/channels", channelData);
      expect(response.status).toBe(201);
      expect(response.data).toHaveProperty("id");
      expect(response.data.name).toBe(channelData.name);
      channelId = response.data.id;
    });

    test("should list all channels", async () => {
      const response = await client.get("/api/channels");
      expect(response.status).toBe(200);
      expect(Array.isArray(response.data)).toBe(true);
    });

    test("should join channel", async () => {
      const response = await client.post(`/api/channels/${channelId}/join`, {
        agentId: "test-agent-id"
      });
      expect(response.status).toBe(200);
    });
  });

  describe("Message Management", () => {
    let messageId: string;

    test("should send a message", async () => {
      const messageData = {
        content: "Hello, this is a test message",
        channelId: "test-channel-id",
        senderId: "test-agent-id",
        type: "text"
      };

      const response = await client.post("/api/messages", messageData);
      expect(response.status).toBe(201);
      expect(response.data).toHaveProperty("id");
      expect(response.data.content).toBe(messageData.content);
      messageId = response.data.id;
    });

    test("should get message history", async () => {
      const response = await client.get("/api/messages?channelId=test-channel-id");
      expect(response.status).toBe(200);
      expect(Array.isArray(response.data)).toBe(true);
    });
  });

  describe("Escrow Operations", () => {
    test("should create escrow", async () => {
      const escrowData = {
        amount: 1000000, // 0.001 SOL in lamports
        description: "Test escrow for e2e testing",
        participantA: "agent-a-pubkey",
        participantB: "agent-b-pubkey",
        conditions: {
          type: "message_delivery",
          messageCount: 10
        }
      };

      const response = await client.post("/api/escrow", escrowData);
      expect(response.status).toBe(201);
      expect(response.data).toHaveProperty("escrowId");
    });

    test("should list escrows", async () => {
      const response = await client.get("/api/escrow");
      expect(response.status).toBe(200);
      expect(Array.isArray(response.data)).toBe(true);
    });
  });

  describe("Analytics", () => {
    test("should get platform stats", async () => {
      const response = await client.get("/api/analytics/stats");
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty("totalAgents");
      expect(response.data).toHaveProperty("totalChannels");
      expect(response.data).toHaveProperty("totalMessages");
    });

    test("should get agent metrics", async () => {
      const response = await client.get("/api/analytics/agents/metrics");
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty("activeAgents");
      expect(response.data).toHaveProperty("messageVolume");
    });
  });

  describe("Real-time Communication", () => {
    test("should handle WebSocket connections", async () => {
      const wsClient = new WebSocketTestClient();
      
      try {
        await wsClient.connect("ws://localhost:8080/ws");
        
        // Send test message
        wsClient.send({
          type: "ping",
          data: { timestamp: Date.now() }
        });

        // Wait for response
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const messages = wsClient.getMessages();
        expect(messages.length).toBeGreaterThan(0);
        expect(messages[0].type).toBe("pong");
      } finally {
        wsClient.close();
      }
    });
  });

  describe("Security", () => {
    test("should require authentication for protected routes", async () => {
      const response = await client.get("/api/admin/users");
      expect(response.status).toBe(401);
    });

    test("should handle rate limiting", async () => {
      // Make multiple rapid requests to trigger rate limit
      const promises = Array(20).fill(0).map(() => 
        client.get("/api/agents")
      );
      
      const responses = await Promise.all(promises);
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });

    test("should validate input data", async () => {
      const invalidData = {
        name: "", // Invalid: empty name
        publicKey: "invalid-key" // Invalid: malformed key
      };

      const response = await client.post("/api/agents", invalidData);
      expect(response.status).toBe(400);
      expect(response.data).toHaveProperty("errors");
    });
  });

  describe("Performance", () => {
    test("should handle concurrent requests", async () => {
      const startTime = Date.now();
      
      const promises = Array(10).fill(0).map(() => 
        client.get("/api/agents")
      );
      
      const responses = await Promise.all(promises);
      const endTime = Date.now();
      
      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
      
      // Should complete within reasonable time
      expect(endTime - startTime).toBeLessThan(5000);
    });

    test("should handle large payloads", async () => {
      const largeData = {
        content: "x".repeat(10000), // 10KB message
        metadata: Array(100).fill(0).map((_, i) => ({
          key: `field_${i}`,
          value: `value_${i}_${"x".repeat(50)}`
        }))
      };

      const response = await client.post("/api/messages", largeData);
      expect(response.status).toBe(201);
    });
  });
}); 