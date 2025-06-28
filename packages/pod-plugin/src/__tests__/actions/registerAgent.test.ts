import { describe, test, expect, mock } from "bun:test";
import { registerAgent } from "../../actions/registerAgent.js";
import type { IAgentRuntime, Memory, State } from "@elizaos/core";

// Mock service that matches PodProtocolServiceImpl interface
const mockPodService = {
  registerAgent: mock(() => Promise.resolve({
    agentId: "test_agent_123",
    name: "Test Agent",
    capabilities: ["conversation", "analysis"],
    reputation: 50,
    walletAddress: "8vK2abc123def456ghi789jkl012mno345pqr678stN8p",
  })),
  getState: mock(() => ({
    isRegistered: false,
    agent: null,
    connectedAgents: new Map(),
    channels: new Map(),
    messages: [],
    escrows: new Map(),
    lastSync: new Date(),
  })),
};

// Mock runtime
const mockRuntime: Partial<IAgentRuntime> = {
  getSetting: mock((key: string) => {
    const settings: Record<string, string> = {
      POD_WALLET_PRIVATE_KEY: "oRMEki8zF3nQra3ToGaZtP7VRTGdEMHiHKSuwqBsbHpyjRY5eddP5vJdbtHWoJ8TYmmMDpFehm2KqU3cx5W3mtp",
      POD_RPC_ENDPOINT: "https://api.devnet.solana.com",
      POD_PROGRAM_ID: "HEpGLgYsE1kP8aoYKyLFc3JVVrofS7T4zEA6fWBJsZps",
      POD_AGENT_NAME: "Test Agent",
      POD_AGENT_CAPABILITIES: "conversation,analysis",
      POD_AUTO_REGISTER: "false",
      POD_MCP_ENDPOINT: "http://localhost:3000",
    };
    return settings[key];
  }),
  getService: mock((serviceName: string) => {
    if (serviceName === "pod_protocol") {
      return mockPodService as unknown;
    }
    return null;
  }),
  character: {
    name: "TestAgent",
    bio: [],
    system: "",
    messageExamples: [],
    postExamples: [],
    topics: [],
    style: { all: [], chat: [], post: [] },
    adjectives: [],
  },
};

// Mock message with proper UUID format
const mockMessage: Memory = {
  id: "12345678-1234-1234-1234-123456789abc" as `${string}-${string}-${string}-${string}-${string}`,
  content: {
    text: "Register me as an AI agent on the PoD Protocol",
  },
  agentId: "agent-1234-1234-1234-123456789abc" as `${string}-${string}-${string}-${string}-${string}`,
  entityId: "entity-1234-1234-1234-123456789abc" as `${string}-${string}-${string}-${string}-${string}`,
  roomId: "room-1234-1234-1234-123456789abc" as `${string}-${string}-${string}-${string}-${string}`,
  createdAt: Date.now(),
};

// Mock state with proper structure
const mockState: State = {
  values: {},
  data: {},
  text: "",
};

describe("Register Agent Action", () => {
  test("action has correct structure", () => {
    expect(registerAgent.name).toBe("REGISTER_AGENT_POD_PROTOCOL");
    expect(registerAgent.description).toContain("Register agent");
    expect(registerAgent.validate).toBeDefined();
    expect(registerAgent.handler).toBeDefined();
    expect(registerAgent.examples).toBeDefined();
  });

  test("action has required examples with correct format", () => {
    expect(registerAgent.examples).toBeDefined();
    
    if (registerAgent.examples && registerAgent.examples.length > 0) {
      expect(registerAgent.examples.length).toBeGreaterThan(0);
      
      // Check that examples use 'user' field  
      const firstExample = registerAgent.examples[0];
      if (firstExample && firstExample[0]) {
        expect(firstExample[0]).toHaveProperty('user');
        expect(firstExample[0]).toHaveProperty('content');
      }
    }
  });

  test("validate returns true for registration requests", async () => {
    const isValid = await registerAgent.validate(
      mockRuntime as IAgentRuntime,
      mockMessage,
      mockState
    );
    expect(isValid).toBe(true);
  });

  test("validate returns false for non-registration requests", async () => {
    const nonRegistrationMessage: Memory = {
      ...mockMessage,
      content: {
        text: "What's the weather like today?",
      },
    };

    const isValid = await registerAgent.validate(
      mockRuntime as IAgentRuntime,
      nonRegistrationMessage,
      mockState
    );
    expect(isValid).toBe(false);
  });

  test("handler processes registration successfully", async () => {
    const response = await registerAgent.handler(
      mockRuntime as IAgentRuntime,
      mockMessage,
      mockState
    );

    expect(response).toBeDefined();
    expect(typeof response).toBe("boolean");
  });

  test("handler works without state parameter", async () => {
    const response = await registerAgent.handler(
      mockRuntime as IAgentRuntime,
      mockMessage
    );

    expect(response).toBeDefined();
    expect(typeof response).toBe("boolean");
  });
}); 