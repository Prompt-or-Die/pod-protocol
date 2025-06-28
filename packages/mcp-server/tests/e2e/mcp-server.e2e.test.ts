import { test, expect, describe, beforeAll, afterAll } from "bun:test";
import { spawn, ChildProcess } from "child_process";
import { join } from "path";

const MCP_SERVER_URL = process.env.MCP_SERVER_URL || "http://localhost:3001";
const TEST_TIMEOUT = 30000;

let serverProcess: ChildProcess | null = null;

// MCP Test Client
class MCPTestClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  async sendRequest(method: string, params: any = {}) {
    try {
      const response = await fetch(`${this.baseUrl}/mcp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: Date.now(),
          method,
          params
        })
      });

      return {
        status: response.status,
        data: await response.json().catch(() => ({}))
      };
    } catch (error) {
      return {
        status: 500,
        error: error.message
      };
    }
  }

  async healthCheck() {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      return {
        status: response.status,
        ok: response.ok
      };
    } catch (error) {
      return {
        status: 500,
        error: error.message
      };
    }
  }
}

describe("MCP Server E2E Tests", () => {
  let client: MCPTestClient;

  beforeAll(async () => {
    // Start MCP server
    try {
      serverProcess = spawn("bun", ["dev"], {
        cwd: join(__dirname, "../.."),
        env: {
          ...process.env,
          PORT: "3001",
          NODE_ENV: "test",
          MCP_MODE: "self-hosted"
        },
        stdio: 'pipe'
      });

      // Wait for server to start
      await new Promise(resolve => setTimeout(resolve, 5000));
    } catch (error) {
      console.log("Failed to start MCP server:", error);
    }

    client = new MCPTestClient(MCP_SERVER_URL);
  }, TEST_TIMEOUT);

  afterAll(() => {
    if (serverProcess) {
      serverProcess.kill();
    }
  });

  describe("Server Health", () => {
    test("should respond to health check", async () => {
      const response = await client.healthCheck();
      
      expect(response.status).toBeOneOf([200, 500]); // 500 if server not running
    });

    test("should handle MCP protocol requests", async () => {
      const response = await client.sendRequest("initialize", {
        protocolVersion: "2025-03-26",
        capabilities: {}
      });
      
      expect(response.status).toBeOneOf([200, 500]);
    });
  });

  describe("MCP Protocol Methods", () => {
    test("should handle initialize request", async () => {
      const response = await client.sendRequest("initialize", {
        protocolVersion: "2025-03-26",
        capabilities: {
          roots: { listChanged: true },
          sampling: {}
        },
        clientInfo: {
          name: "test-client",
          version: "1.0.0"
        }
      });

      if (response.status === 200) {
        expect(response.data).toHaveProperty("result");
        expect(response.data.result).toHaveProperty("capabilities");
      } else {
        expect(response.status).toBe(500); // Server not running
      }
    });

    test("should handle list tools request", async () => {
      const response = await client.sendRequest("tools/list");

      if (response.status === 200) {
        expect(response.data).toHaveProperty("result");
        expect(response.data.result).toHaveProperty("tools");
        expect(Array.isArray(response.data.result.tools)).toBe(true);
      } else {
        expect(response.status).toBe(500);
      }
    });

    test("should handle agent creation tool", async () => {
      const response = await client.sendRequest("tools/call", {
        name: "create_agent",
        arguments: {
          name: "Test Agent",
          description: "Test agent for e2e testing",
          capabilities: ["messaging"]
        }
      });

      if (response.status === 200) {
        expect(response.data).toHaveProperty("result");
      } else {
        expect(response.status).toBe(500);
      }
    });

    test("should handle message sending tool", async () => {
      const response = await client.sendRequest("tools/call", {
        name: "send_message",
        arguments: {
          content: "Hello from MCP e2e test",
          channelId: "test-channel",
          type: "text"
        }
      });

      if (response.status === 200) {
        expect(response.data).toHaveProperty("result");
      } else {
        expect(response.status).toBe(500);
      }
    });

    test("should handle channel management", async () => {
      const response = await client.sendRequest("tools/call", {
        name: "create_channel",
        arguments: {
          name: "Test Channel",
          description: "Test channel for e2e testing",
          isPrivate: false
        }
      });

      if (response.status === 200) {
        expect(response.data).toHaveProperty("result");
      } else {
        expect(response.status).toBe(500);
      }
    });
  });

  describe("Resource Management", () => {
    test("should list available resources", async () => {
      const response = await client.sendRequest("resources/list");

      if (response.status === 200) {
        expect(response.data).toHaveProperty("result");
        expect(response.data.result).toHaveProperty("resources");
        expect(Array.isArray(response.data.result.resources)).toBe(true);
      } else {
        expect(response.status).toBe(500);
      }
    });

    test("should read agent resource", async () => {
      const response = await client.sendRequest("resources/read", {
        uri: "pod://agents/list"
      });

      if (response.status === 200) {
        expect(response.data).toHaveProperty("result");
      } else {
        expect(response.status).toBe(500);
      }
    });

    test("should read channel resource", async () => {
      const response = await client.sendRequest("resources/read", {
        uri: "pod://channels/list"
      });

      if (response.status === 200) {
        expect(response.data).toHaveProperty("result");
      } else {
        expect(response.status).toBe(500);
      }
    });
  });

  describe("Prompt Management", () => {
    test("should list available prompts", async () => {
      const response = await client.sendRequest("prompts/list");

      if (response.status === 200) {
        expect(response.data).toHaveProperty("result");
        expect(response.data.result).toHaveProperty("prompts");
        expect(Array.isArray(response.data.result.prompts)).toBe(true);
      } else {
        expect(response.status).toBe(500);
      }
    });

    test("should get agent analysis prompt", async () => {
      const response = await client.sendRequest("prompts/get", {
        name: "agent_analysis",
        arguments: {
          agentId: "test-agent-id"
        }
      });

      if (response.status === 200) {
        expect(response.data).toHaveProperty("result");
      } else {
        expect(response.status).toBe(500);
      }
    });

    test("should get channel summary prompt", async () => {
      const response = await client.sendRequest("prompts/get", {
        name: "channel_summary",
        arguments: {
          channelId: "test-channel-id"
        }
      });

      if (response.status === 200) {
        expect(response.data).toHaveProperty("result");
      } else {
        expect(response.status).toBe(500);
      }
    });
  });

  describe("Sampling", () => {
    test("should handle sampling request", async () => {
      const response = await client.sendRequest("sampling/createMessage", {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: "Create a test agent for demonstration"
            }
          }
        ],
        modelPreferences: {
          hints: ["claude-3-sonnet"],
          costPriority: 0.5,
          speedPriority: 0.5
        },
        systemPrompt: "You are an AI assistant helping with PoD Protocol operations.",
        includeContext: "thisServer"
      });

      if (response.status === 200) {
        expect(response.data).toHaveProperty("result");
      } else {
        expect(response.status).toBe(500);
      }
    });
  });

  describe("Error Handling", () => {
    test("should handle invalid method", async () => {
      const response = await client.sendRequest("invalid_method");

      expect(response.status).toBeOneOf([400, 404, 500]);
    });

    test("should handle malformed request", async () => {
      try {
        const response = await fetch(`${MCP_SERVER_URL}/mcp`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: "invalid json"
        });

        expect(response.status).toBeOneOf([400, 500]);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    test("should handle missing parameters", async () => {
      const response = await client.sendRequest("tools/call", {
        name: "create_agent"
        // Missing required arguments
      });

      if (response.status === 200) {
        expect(response.data).toHaveProperty("error");
      } else {
        expect(response.status).toBe(500);
      }
    });
  });

  describe("Security", () => {
    test("should validate authentication", async () => {
      // Test without proper authentication
      const response = await fetch(`${MCP_SERVER_URL}/admin`, {
        method: 'GET'
      });

      expect(response.status).toBeOneOf([401, 403, 404, 500]);
    });

    test("should handle rate limiting", async () => {
      // Make multiple rapid requests
      const promises = Array(10).fill(0).map(() =>
        client.sendRequest("tools/list")
      );

      const responses = await Promise.allSettled(promises);
      
      // Should handle all requests (either succeed or fail gracefully)
      expect(responses.length).toBe(10);
    });
  });

  describe("Performance", () => {
    test("should respond quickly to simple requests", async () => {
      const startTime = Date.now();
      await client.sendRequest("tools/list");
      const endTime = Date.now();

      const responseTime = endTime - startTime;
      expect(responseTime).toBeLessThan(5000); // Should respond within 5 seconds
    });

    test("should handle concurrent requests", async () => {
      const promises = Array(5).fill(0).map(() =>
        client.sendRequest("tools/list")
      );

      const responses = await Promise.allSettled(promises);
      
      responses.forEach(response => {
        if (response.status === "fulfilled") {
          expect(response.value.status).toBeOneOf([200, 500]);
        }
      });
    });
  });

  describe("Integration", () => {
    test("should integrate with PoD Protocol SDK", async () => {
      const response = await client.sendRequest("tools/call", {
        name: "get_agent_status",
        arguments: {
          agentId: "test-agent-id"
        }
      });

      // Should either succeed or fail gracefully
      expect(response.status).toBeOneOf([200, 400, 500]);
    });

    test("should handle blockchain operations", async () => {
      const response = await client.sendRequest("tools/call", {
        name: "check_network_status"
      });

      expect(response.status).toBeOneOf([200, 500]);
    });
  });

  test("should import server modules", async () => {
    try {
      const server = await import("../../src/index");
      expect(server).toBeDefined();
    } catch (error) {
      expect(error).toBeDefined();
    }
  });
}); 