import { describe, test, expect, mock } from "bun:test";
import { agentStatusProvider } from "../../providers/agentStatusProvider.js";

// Mock runtime
const mockRuntime = {
  getService: mock(() => ({
    getState: mock(() => ({
      agent: {
        agentId: "test_agent_123",
        name: "Test Agent",
        reputation: 85,
        capabilities: ["conversation", "analysis"],
        walletAddress: "11111111111111111111111111111111",
      },
      connectedAgents: new Map(),
      channels: new Map(),
      messages: [],
      escrows: new Map(),
    })),
  })),
};

// Mock message
const mockMessage = {
  id: "550e8400-e29b-41d4-a716-446655440000",
  content: { text: "What's my agent status?" },
  userId: "550e8400-e29b-41d4-a716-446655440001",
  agentId: "550e8400-e29b-41d4-a716-446655440002",
  roomId: "550e8400-e29b-41d4-a716-446655440003",
  createdAt: Date.now(),
};

// Mock state
const mockState = {
  values: new Map(),
  data: new Map(),
  text: "",
};

describe("Agent Status Provider", () => {
  test("provider has correct structure", () => {
    expect(agentStatusProvider.name).toBe("podAgentStatus");
    expect(agentStatusProvider.description).toContain("agent status");
    expect(agentStatusProvider.get).toBeDefined();
  });

  test("provider returns agent status information", async () => {
    const result = await agentStatusProvider.get(
      mockRuntime as any,
      mockMessage as any,
      mockState as any
    );

    expect(result).toBeDefined();
    expect(result.text).toContain("Agent Status");
    expect(result.values).toBeDefined();
    if (result.values) {
      expect(result.values.agentId).toBe("test_agent_123");
    }
  });

  test("provider handles missing service gracefully", async () => {
    const runtimeWithoutService = {
      getService: mock(() => null),
    };

    const result = await agentStatusProvider.get(
      runtimeWithoutService as any,
      mockMessage as any,
      mockState as any
    );

    expect(result).toBeDefined();
    expect(result.text).toContain("not available");
  });
}); 