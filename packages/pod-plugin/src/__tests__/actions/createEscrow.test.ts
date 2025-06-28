import { describe, it, expect, beforeEach, jest } from "bun:test";
import type { IAgentRuntime, Memory, State, HandlerCallback } from "@elizaos/core";
import { createEscrow } from "../../actions/createEscrow.js";
import { PodProtocolServiceImpl } from "../../services/podProtocolService.js";

// Mock the service
const mockPodService = {
  getState: jest.fn(),
  createEscrow: jest.fn(),
} as unknown as PodProtocolServiceImpl;

// Mock runtime
const mockRuntime = {
  getService: jest.fn().mockReturnValue(mockPodService),
} as unknown as IAgentRuntime;

// Mock memory/message
const createMockMemory = (text: string): Memory => ({
  id: "12345678-1234-1234-1234-123456789abc" as `${string}-${string}-${string}-${string}-${string}`,
  agentId: "agent-1234-1234-1234-123456789abc" as `${string}-${string}-${string}-${string}-${string}`,
  entityId: "entity-1234-1234-1234-123456789abc" as `${string}-${string}-${string}-${string}-${string}`,
  roomId: "room-1234-1234-1234-123456789abc" as `${string}-${string}-${string}-${string}-${string}`,
  content: {
    text,
    source: "direct",
  },
  createdAt: new Date().getTime(),
  embedding: [],
});

// Mock state
const mockState: State = {
  values: {},
  data: {},
  text: "",
};

// Mock callback
const mockCallback = jest.fn() as unknown as HandlerCallback;

describe("createEscrow Action", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("validation", () => {
    it("should validate escrow creation requests", async () => {
      const validMessages = [
        "Create escrow with trading_bot_001 for 50 SOL",
        "Setup secure payment for AI model training",
        "Start escrow for research collaboration",
        "Create collaboration contract with agent_456",
      ];

      for (const text of validMessages) {
        const memory = createMockMemory(text);
        const result = await createEscrow.validate(mockRuntime, memory, mockState);
        expect(result).toBe(true);
      }
    });

    it("should not validate non-escrow requests", async () => {
      const invalidMessages = [
        "Hello there",
        "How are you today?",
        "Tell me about the weather",
        "Register me on the protocol",
      ];

      for (const text of invalidMessages) {
        const memory = createMockMemory(text);
        const result = await createEscrow.validate(mockRuntime, memory, mockState);
        expect(result).toBe(false);
      }
    });
  });

  describe("handler", () => {
    const mockAgent = {
      agentId: "test-agent-123",
      name: "Test Agent",
      capabilities: ["escrow", "trading"],
      reputation: 85,
      walletAddress: "8vK2...mN8p",
      status: "online" as const,
      framework: "ElizaOS",
      lastActive: new Date(),
    };

    const mockServiceState = {
      isRegistered: true,
      agent: mockAgent,
      connectedAgents: new Map(),
      channels: new Map(),
      messages: [],
      escrows: new Map(),
      lastSync: new Date(),
      values: {},
      data: {},
      text: "",
    };

    beforeEach(() => {
      (mockPodService.getState as jest.Mock).mockReturnValue(mockServiceState);
    });

    it("should handle service not available", async () => {
      (mockRuntime.getService as jest.Mock).mockReturnValue(null);
      
      const memory = createMockMemory("Create escrow with agent_456 for 100 SOL");
      const result = await createEscrow.handler(mockRuntime, memory, mockState, {}, mockCallback);
      
      expect(result).toBe(false);
      expect(mockCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining("PoD Protocol service is not available")
        })
      );
    });

    it("should handle agent not registered", async () => {
      (mockPodService.getState as jest.Mock).mockReturnValue({
        isRegistered: false,
        agent: null,
        values: {},
        data: {},
        text: "",
      });
      
      const memory = createMockMemory("Create escrow with agent_456 for 100 SOL");
      const result = await createEscrow.handler(mockRuntime, memory, mockState, {}, mockCallback);
      
      expect(result).toBe(false);
      expect(mockCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining("You need to register on PoD Protocol first")
        })
      );
    });

    it("should handle missing counterparty", async () => {
      const memory = createMockMemory("Create escrow for 100 SOL");
      const result = await createEscrow.handler(mockRuntime, memory, mockState, {}, mockCallback);
      
      expect(result).toBe(false);
      expect(mockCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining("Missing counterparty information")
        })
      );
    });

    it("should handle missing amount", async () => {
      const memory = createMockMemory("Create escrow with agent_456");
      const result = await createEscrow.handler(mockRuntime, memory, mockState, {}, mockCallback);
      
      expect(result).toBe(false);
      expect(mockCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining("Missing or invalid amount")
        })
      );
    });

    it("should successfully create escrow", async () => {
      const mockEscrow = {
        id: "escrow_123456",
        amount: 100,
        counterpartyId: "agent_456",
        service: "AI Model Training Services",
        deliverables: ["Trained model weights", "Performance metrics", "Documentation"],
        deadline: new Date(Date.now() + 24 * 60 * 60 * 1000),
        status: "created" as const,
        transactionHash: "tx_abc123",
      };

      (mockPodService.createEscrow as jest.Mock).mockResolvedValue(mockEscrow);
      
      const memory = createMockMemory("Create escrow with agent_456 for 100 SOL for model training");
      const result = await createEscrow.handler(mockRuntime, memory, mockState, {}, mockCallback);
      
      expect(result).toBe(true);
      expect(mockPodService.createEscrow).toHaveBeenCalledWith(
        "agent_456",
        100,
        expect.stringContaining("Services"),
        expect.arrayContaining(["Trained model weights"])
      );
      expect(mockCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining("Escrow created successfully")
        })
      );
    });

    it("should extract different service types", async () => {
      const testCases = [
        { message: "Create escrow for trading services", expectedService: "Trading Services" },
        { message: "Setup escrow for research work", expectedService: "Research Services" },
        { message: "Create escrow for content creation", expectedService: "Content Services" },
      ];

      const mockEscrow = {
        id: "escrow_123",
        amount: 50,
        counterpartyId: "agent_123",
        service: "Test Services",
        deliverables: ["Test deliverable"],
        deadline: new Date(),
        status: "created" as const,
        transactionHash: "tx_123",
      };

      for (const testCase of testCases) {
        (mockPodService.createEscrow as jest.Mock).mockResolvedValue(mockEscrow);
        
        const memory = createMockMemory(`${testCase.message} with agent_123 for 50 SOL`);
        await createEscrow.handler(mockRuntime, memory, mockState, {}, mockCallback);
        
        expect(mockPodService.createEscrow).toHaveBeenCalledWith(
          "agent_123",
          50,
          testCase.expectedService,
          expect.any(Array)
        );
      }
    });

    it("should handle escrow creation error", async () => {
      (mockPodService.createEscrow as jest.Mock).mockRejectedValue(new Error("Insufficient funds"));
      
      const memory = createMockMemory("Create escrow with agent_456 for 100 SOL");
      const result = await createEscrow.handler(mockRuntime, memory, mockState, {}, mockCallback);
      
      expect(result).toBe(false);
      expect(mockCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining("Failed to create escrow")
        })
      );
    });
  });

  describe("examples", () => {
    it("should have valid examples", () => {
      expect(createEscrow.examples).toBeDefined();
      
      if (createEscrow.examples && Array.isArray(createEscrow.examples)) {
        expect(createEscrow.examples.length).toBeGreaterThan(0);
        
        // Check example structure
        for (const example of createEscrow.examples) {
          expect(Array.isArray(example)).toBe(true);
          expect(example.length).toBe(2);
          expect(example[0]).toHaveProperty("name");
          expect(example[0]).toHaveProperty("content");
          expect(example[1]).toHaveProperty("name");
          expect(example[1]).toHaveProperty("content");
        }
      }
    });
  });
}); 