import { describe, test, expect, beforeEach, mock } from "bun:test";
import { PodProtocolServiceImpl } from "../../services/podProtocolService.js";
import type { IAgentRuntime } from "@elizaos/core";

// Common test configuration
const testConfig = {
  walletPrivateKey: "oRMEki8zF3nQra3ToGaZtP7VRTGdEMHiHKSuwqBsbHpyjRY5eddP5vJdbtHWoJ8TYmmMDpFehm2KqU3cx5W3mtp",
  rpcEndpoint: "https://api.devnet.solana.com",
  programId: "HEpGLgYsE1kP8aoYKyLFc3JVVrofS7T4zEA6fWBJsZps",
  agentName: "Test Agent",
  capabilities: ["conversation", "analysis"],
  autoRegister: false,
  mcpEndpoint: "http://localhost:3000",
};

// Mock the blockchain service
const mockBlockchainService = {
  initialize: mock(() => Promise.resolve()),
  registerAgent: mock(() => Promise.resolve({
    agentId: "test_agent_123",
    name: "Test Agent",
    description: "Test agent for unit testing",
    capabilities: ["conversation", "analysis"],
    reputation: 50,
    walletAddress: "11111111111111111111111111111111",
    lastActive: new Date(),
    status: "online",
    framework: "ElizaOS",
  })),
  sendMessage: mock(() => Promise.resolve({
    id: "msg_test_123",
    senderId: "test_agent_123",
    recipientId: "recipient_123",
    content: "Test message",
    type: "text",
    priority: "normal",
    timestamp: new Date(),
    status: "delivered",
    encrypted: true,
    transactionHash: "tx_test_456",
  })),
  createChannel: mock(() => Promise.resolve({
    id: "channel_test_123",
    name: "Test Channel",
    description: "Test channel description",
    type: "public",
    creatorId: "test_agent_123",
    participants: ["test_agent_123"],
    maxParticipants: 1000,
    createdAt: new Date(),
    lastActivity: new Date(),
  })),
  joinChannel: mock(() => Promise.resolve(true)),
  healthCheck: mock(() => Promise.resolve(true)),
};

// Mock the runtime
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

describe("PodProtocolServiceImpl", () => {
  let service: PodProtocolServiceImpl;

  beforeEach(() => {
    service = new PodProtocolServiceImpl();
    
    // Override initialize method to prevent real blockchain service creation
    service.initialize = async (runtime: IAgentRuntime): Promise<void> => {
      try {
        // Set up the service properties manually for testing
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (service as any).runtime = runtime;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (service as any).podConfig = {
          ...testConfig
        };
        
        // Mock connection and keypair (these are checked by some methods)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (service as any).connection = { } as any; // Mock connection object
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (service as any).keypair = { } as any; // Mock keypair object
        
        // Use our mock blockchain service
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (service as any).blockchainService = mockBlockchainService;
        
        // Initialize plugin state
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (service as any).state = {
          agent: null,
          isRegistered: false,
          connectedAgents: new Map(),
          channels: new Map(),
          messages: [],
          escrows: new Map(),
          lastSync: new Date(),
        };
        
        // Call mock initialize
        await mockBlockchainService.initialize();
        
        // eslint-disable-next-line no-console
        console.log("PoD Protocol service initialized successfully (mocked)");
        return Promise.resolve();
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error("Mock initialization error:", error);
        throw error;
      }
    };
  });

  describe("Service Initialization", () => {
    test("should initialize with valid configuration", async () => {
      try {
        await service.initialize(mockRuntime as IAgentRuntime);
        expect(mockBlockchainService.initialize).toHaveBeenCalled();
        // If we get here, initialization succeeded
        expect(true).toBe(true);
      } catch (error) {
        throw new Error(`Initialization should not throw: ${error}`);
      }
    });

    test("should have correct service type", () => {
      expect(PodProtocolServiceImpl.serviceType).toBe("pod_protocol");
    });

    test("should have capability description", () => {
      expect(service.capabilityDescription).toContain("PoD Protocol");
      expect(service.capabilityDescription).toContain("Solana blockchain");
    });

    test("should stop gracefully", async () => {
      await service.initialize(mockRuntime as IAgentRuntime);
      
      try {
        await service.stop();
        // Verify service state is cleared
        expect(service.getState()).toBeNull();
        expect(service.getConfig()).toBeNull();
        // If we get here, stop succeeded
        expect(true).toBe(true);
      } catch (error) {
        throw new Error(`Stop should not throw: ${error}`);
      }
    });
  });

  describe("Agent Registration", () => {
    test("should register agent successfully", async () => {
      await service.initialize(mockRuntime as IAgentRuntime);
      
      const config = { ...testConfig, autoRegister: true };
      const agent = await service.registerAgent(config);
      
      expect(mockBlockchainService.registerAgent).toHaveBeenCalledWith(config);
      expect(agent.agentId).toBe("test_agent_123");
      expect(agent.name).toBe("Test Agent");
      expect(agent.framework).toBe("ElizaOS");
      
      // Verify state is updated
      const state = service.getState();
      expect(state?.isRegistered).toBe(true);
      expect(state?.agent).toEqual(agent);
    });

    test("should throw error when service not initialized", async () => {
      await expect(service.registerAgent(testConfig)).rejects.toThrow("Service not initialized");
    });
  });

  describe("Message Operations", () => {
    test("should send message successfully", async () => {
      await service.initialize(mockRuntime as IAgentRuntime);
      await service.registerAgent(testConfig);

      const message = await service.sendMessage("recipient_123", "Hello, world!");
      
      expect(mockBlockchainService.sendMessage).toHaveBeenCalledWith("recipient_123", "Hello, world!", "text");
      expect(message.content).toBe("Test message");
      expect(message.status).toBe("delivered");
      expect(message.transactionHash).toBe("tx_test_456");
      
      // Verify message is added to state
      const state = service.getState();
      expect(state?.messages).toContain(message);
    });

    test("should get messages with filters", async () => {
      await service.initialize(mockRuntime as IAgentRuntime);
      await service.registerAgent(testConfig);

      // Send a message first
      await service.sendMessage("recipient_123", "Test message");

      // Get all messages
      const allMessages = await service.getMessages();
      expect(allMessages).toHaveLength(1);

      // Get messages with sender filter
      const senderMessages = await service.getMessages({ senderId: "test_agent_123" });
      expect(senderMessages).toHaveLength(1);

      // Get messages with recipient filter (should be empty)
      const recipientMessages = await service.getMessages({ recipientId: "other_agent" });
      expect(recipientMessages).toHaveLength(0);
    });
  });

  describe("Channel Operations", () => {
    test("should create channel successfully", async () => {
      await service.initialize(mockRuntime as IAgentRuntime);
      await service.registerAgent(testConfig);

      const channel = await service.createChannel("Test Channel", "A test channel");
      
      expect(mockBlockchainService.createChannel).toHaveBeenCalledWith("Test Channel", "A test channel", false);
      expect(channel.name).toBe("Test Channel");
      expect(channel.type).toBe("public");
      
      // Verify channel is added to state
      const state = service.getState();
      expect(state?.channels.has(channel.id)).toBe(true);
    });

    test("should join channel successfully", async () => {
      await service.initialize(mockRuntime as IAgentRuntime);
      await service.registerAgent(testConfig);

      const success = await service.joinChannel("channel_123");
      
      expect(mockBlockchainService.joinChannel).toHaveBeenCalledWith("channel_123");
      expect(success).toBe(true);
    });

    test("should leave channel successfully", async () => {
      await service.initialize(mockRuntime as IAgentRuntime);
      await service.registerAgent(testConfig);

      const success = await service.leaveChannel("channel_123");
      expect(success).toBe(true);
    });
  });

  describe("Agent Discovery", () => {
    test("should discover agents with no filters", async () => {
      await service.initialize(mockRuntime as IAgentRuntime);
      
      const agents = await service.discoverAgents();
      expect(agents).toHaveLength(3); // From mock data
      expect(agents[0].agentId).toBe("trading_bot_001");
    });

    test("should filter agents by capability", async () => {
      await service.initialize(mockRuntime as IAgentRuntime);
      
      const agents = await service.discoverAgents({
        capabilities: ["trading"]
      });
      
      expect(agents).toHaveLength(1);
      expect(agents[0].agentId).toBe("trading_bot_001");
    });

    test("should filter agents by framework", async () => {
      await service.initialize(mockRuntime as IAgentRuntime);
      
      const agents = await service.discoverAgents({
        framework: "AutoGen"
      });
      
      expect(agents).toHaveLength(1);
      expect(agents[0].agentId).toBe("research_pro_v2");
    });

    test("should filter agents by status", async () => {
      await service.initialize(mockRuntime as IAgentRuntime);
      
      const agents = await service.discoverAgents({
        status: "online"
      });
      
      expect(agents).toHaveLength(2); // trading_bot and research_pro
    });
  });

  describe("Reputation System", () => {
    test("should get agent reputation", async () => {
      await service.initialize(mockRuntime as IAgentRuntime);
      await service.registerAgent(testConfig);

      const reputation = await service.getAgentReputation();
      expect(reputation).toBe(50); // Starting reputation from mock
    });

    test("should get reputation for specific agent", async () => {
      await service.initialize(mockRuntime as IAgentRuntime);
      
      // Discover agents first to populate cache
      await service.discoverAgents();
      
      const reputation = await service.getAgentReputation("trading_bot_001");
      expect(reputation).toBe(95); // From mock data
    });
  });

  describe("Protocol Statistics", () => {
    test("should get protocol stats", async () => {
      await service.initialize(mockRuntime as IAgentRuntime);
      await service.registerAgent(testConfig);

      const stats = await service.getProtocolStats();
      
      expect(stats.isRegistered).toBe(true);
      expect(stats.currentAgent).toBeDefined();
      expect(stats.totalAgents).toBeGreaterThan(0);
      expect(stats.totalChannels).toBe(0);
      expect(stats.totalMessages).toBe(0);
      expect(stats.activeEscrows).toBe(0);
    });
  });

  describe("Health Check", () => {
    test("should perform health check", async () => {
      await service.initialize(mockRuntime as IAgentRuntime);
      
      const isHealthy = await service.healthCheck();
      expect(mockBlockchainService.healthCheck).toHaveBeenCalled();
      expect(isHealthy).toBe(true);
    });

    test("should return false when service not initialized", async () => {
      const isHealthy = await service.healthCheck();
      expect(isHealthy).toBe(false);
    });
  });

  describe("Escrow Operations", () => {
    test("should create escrow successfully", async () => {
      await service.initialize(mockRuntime as IAgentRuntime);
      await service.registerAgent(testConfig);

      const escrow = await service.createEscrow(
        "counterparty_123",
        100,
        "AI Analysis Service",
        ["Market analysis report", "Trading recommendations"]
      );
      
      expect(escrow.amount).toBe(100);
      expect(escrow.counterpartyId).toBe("counterparty_123");
      expect(escrow.service).toBe("AI Analysis Service");
      expect(escrow.deliverables).toHaveLength(2);
      expect(escrow.status).toBe("created");
      
      // Verify escrow is added to state
      const state = service.getState();
      expect(state?.escrows.has(escrow.id)).toBe(true);
    });
  });
}); 