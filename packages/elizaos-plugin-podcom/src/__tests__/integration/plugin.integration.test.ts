import { describe, test, expect, beforeEach, mock } from "bun:test";
import { podComPlugin } from "../../index.js";
import { PodProtocolServiceImpl } from "../../services/podProtocolService.js";

/**
 * Integration tests for the complete PoD Protocol plugin
 * Tests the full workflow from plugin initialization to blockchain operations
 */

// Mock environment variables
process.env.POD_WALLET_PRIVATE_KEY = "5J7XLk8JjEpQXvqiQFJ8QXvqiQFJ8QXvqiQFJ8QXvqiQFJ8QXvqi";
process.env.POD_RPC_ENDPOINT = "https://api.devnet.solana.com";
process.env.POD_AGENT_NAME = "Test Integration Agent";
process.env.POD_AGENT_CAPABILITIES = "conversation,analysis,blockchain";
process.env.POD_AUTO_REGISTER = "false"; // Disable auto-register for tests

// Mock blockchain operations
const mockBlockchainService = {
  initialize: mock(() => Promise.resolve()),
  registerAgent: mock(() => Promise.resolve({
    agentId: "integration_test_agent",
    name: "Test Integration Agent",
    description: "Agent for integration testing",
    capabilities: ["conversation", "analysis", "blockchain"],
    reputation: 50,
    walletAddress: "11111111111111111111111111111111",
    lastActive: new Date(),
    status: "online",
    framework: "ElizaOS",
  })),
  sendMessage: mock(() => Promise.resolve({
    id: "integration_msg_123",
    senderId: "integration_test_agent",
    recipientId: "target_agent_123",
    content: "Integration test message",
    type: "text",
    priority: "normal",
    timestamp: new Date(),
    status: "delivered",
    encrypted: true,
    transactionHash: "tx_integration_456",
  })),
  createChannel: mock(() => Promise.resolve({
    id: "integration_channel_123",
    name: "Integration Test Channel",
    description: "Channel for integration testing",
    type: "public",
    creatorId: "integration_test_agent",
    participants: ["integration_test_agent"],
    maxParticipants: 100,
    createdAt: new Date(),
    lastActivity: new Date(),
  })),
  joinChannel: mock(() => Promise.resolve(true)),
  healthCheck: mock(() => Promise.resolve(true)),
};

// Mock runtime for integration tests
const mockRuntime = {
  getSetting: mock((key: string) => process.env[key]),
  getService: mock((serviceType: string) => {
    if (serviceType === "pod_protocol") {
      const service = new PodProtocolServiceImpl();
      // Inject mocked blockchain service
      (service as any).blockchainService = mockBlockchainService;
      (service as any).state = {
        agent: null,
        isRegistered: false,
        connectedAgents: new Map(),
        channels: new Map(),
        messages: [],
        escrows: new Map(),
        lastSync: new Date(),
      };
      return service;
    }
    return null;
  }),
  character: {
    name: "TestIntegrationAgent",
    bio: ["Integration test agent for PoD Protocol"],
    system: "You are a test agent for integration testing",
    messageExamples: [],
    postExamples: [],
    topics: ["blockchain", "testing"],
    style: { all: [], chat: [], post: [] },
    adjectives: ["helpful", "reliable"],
  },
};

describe("PoD Protocol Plugin - Integration Tests", () => {
  let service: PodProtocolServiceImpl;

  beforeEach(() => {
    service = new PodProtocolServiceImpl();
    (service as any).blockchainService = mockBlockchainService;
  });

  test("complete plugin workflow - registration to messaging", async () => {
    // Step 1: Initialize service
    await service.initialize(mockRuntime as any);
    
    // Step 2: Register agent
    const agent = await service.registerAgent({
      walletPrivateKey: process.env.POD_WALLET_PRIVATE_KEY!,
      rpcEndpoint: process.env.POD_RPC_ENDPOINT!,
      agentName: process.env.POD_AGENT_NAME!,
      capabilities: process.env.POD_AGENT_CAPABILITIES!.split(","),
      autoRegister: false,
      programId: "HEpGLgYsE1kP8aoYKyLFc3JVVrofS7T4zEA6fWBJsZps",
    });

    expect(agent.agentId).toBe("integration_test_agent");
    expect(mockBlockchainService.registerAgent).toHaveBeenCalled();

    // Step 3: Discover other agents
    const discoveredAgents = await service.discoverAgents();
    expect(discoveredAgents).toBeDefined();
    expect(Array.isArray(discoveredAgents)).toBe(true);

    // Step 4: Send a message
    const message = await service.sendMessage("target_agent_123", "Hello from integration test!");
    expect(message.content).toBe("Integration test message");
    expect(mockBlockchainService.sendMessage).toHaveBeenCalled();

    // Step 5: Create a channel
    const channel = await service.createChannel("Test Channel", "Integration test channel");
    expect(channel.name).toBe("Integration Test Channel");
    expect(mockBlockchainService.createChannel).toHaveBeenCalled();

    // Step 6: Join a channel
    const joinSuccess = await service.joinChannel("another_channel_123");
    expect(joinSuccess).toBe(true);
    expect(mockBlockchainService.joinChannel).toHaveBeenCalled();

    // Step 7: Check health
    const isHealthy = await service.healthCheck();
    expect(isHealthy).toBe(true);
    expect(mockBlockchainService.healthCheck).toHaveBeenCalled();

    // Step 8: Get protocol stats
    const stats = await service.getProtocolStats();
    expect(stats.isRegistered).toBe(true);
    expect(stats.currentAgent).toEqual(agent);
  });

  test("plugin components work together", () => {
    // Test that all plugin components are properly integrated
    expect(podComPlugin.name).toBe("podcom");
    expect(podComPlugin.services).toContain(PodProtocolServiceImpl);
    expect(podComPlugin.actions).toHaveLength(4);
    expect(podComPlugin.providers).toHaveLength(2);
    expect(podComPlugin.evaluators).toHaveLength(3);
  });

  test("actions can access service", async () => {
    const registerAction = podComPlugin.actions?.find(
      action => action.name === "REGISTER_AGENT_POD_PROTOCOL"
    );
    
    expect(registerAction).toBeDefined();
    expect(registerAction?.validate).toBeDefined();
    expect(registerAction?.handler).toBeDefined();
  });

  test("providers can access service state", async () => {
    const agentStatusProvider = podComPlugin.providers?.find(
      provider => provider.name === "podAgentStatus"
    );

    expect(agentStatusProvider).toBeDefined();
    expect(agentStatusProvider?.get).toBeDefined();
  });

  test("evaluators analyze messages correctly", async () => {
    const collaborationEvaluator = podComPlugin.evaluators?.find(
      evaluator => evaluator.name === "podCollaboration"
    );

    expect(collaborationEvaluator).toBeDefined();
    expect(collaborationEvaluator?.validate).toBeDefined();
    expect(collaborationEvaluator?.handler).toBeDefined();
  });

  test("error handling works throughout the workflow", async () => {
    // Test service without blockchain service
    const serviceWithoutBlockchain = new PodProtocolServiceImpl();
    
    await expect(serviceWithoutBlockchain.registerAgent({
      walletPrivateKey: "test_key",
      rpcEndpoint: "test_endpoint",
      agentName: "Test",
      capabilities: ["test"],
      autoRegister: false,
      programId: "HEpGLgYsE1kP8aoYKyLFc3JVVrofS7T4zEA6fWBJsZps",
    })).rejects.toThrow("Service not initialized");

    await expect(serviceWithoutBlockchain.sendMessage("test", "message")).rejects.toThrow();
    await expect(serviceWithoutBlockchain.createChannel("test", "desc")).rejects.toThrow();
  });

  test("configuration validation", () => {
    expect(podComPlugin.config).toBeDefined();
    if (podComPlugin.config) {
      expect(podComPlugin.config.requiredEnvVars).toContain("POD_WALLET_PRIVATE_KEY");
      expect(podComPlugin.config.requiredEnvVars).toContain("POD_RPC_ENDPOINT");
      expect(podComPlugin.config.defaults).toBeDefined();
    }
  });

  test("service lifecycle management", async () => {
    // Initialize
    await service.initialize(mockRuntime as any);
    expect(service.getState()).toBeDefined();

    // Stop
    await service.stop();
    expect(service.getState()).toBeNull();
    expect(service.getConfig()).toBeNull();
  });
}); 