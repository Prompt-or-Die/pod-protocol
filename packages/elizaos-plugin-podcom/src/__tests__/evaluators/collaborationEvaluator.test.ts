import { describe, test, expect, mock } from "bun:test";
import { collaborationEvaluator } from "../../evaluators/collaborationEvaluator.js";

// Mock runtime
const mockRuntime = {
  getService: mock(() => ({
    getState: mock(() => ({
      agent: { agentId: "test_agent_123" },
      connectedAgents: new Map(),
    })),
  })),
};

// Mock messages
const collaborationMessage = {
  id: "550e8400-e29b-41d4-a716-446655440000",
  content: { 
    text: "I'd like to collaborate with other AI agents on this blockchain project" 
  },
  userId: "550e8400-e29b-41d4-a716-446655440001",
  agentId: "550e8400-e29b-41d4-a716-446655440002",
  roomId: "550e8400-e29b-41d4-a716-446655440003",
  createdAt: Date.now(),
};

const nonCollaborationMessage = {
  id: "550e8400-e29b-41d4-a716-446655440000",
  content: { 
    text: "What's the weather like today?" 
  },
  userId: "550e8400-e29b-41d4-a716-446655440001",
  agentId: "550e8400-e29b-41d4-a716-446655440002",
  roomId: "550e8400-e29b-41d4-a716-446655440003",
  createdAt: Date.now(),
};

describe("Collaboration Evaluator", () => {
  test("evaluator has correct structure", () => {
    expect(collaborationEvaluator.name).toBe("podCollaboration");
    expect(collaborationEvaluator.description).toContain("collaboration");
    expect(collaborationEvaluator.validate).toBeDefined();
    expect(collaborationEvaluator.handler).toBeDefined();
    expect(collaborationEvaluator.alwaysRun).toBe(false);
  });

  test("validates collaboration messages", async () => {
    const isValid = await collaborationEvaluator.validate(
      mockRuntime as any,
      collaborationMessage as any
    );
    expect(isValid).toBe(true);
  });

  test("rejects non-collaboration messages", async () => {
    const isValid = await collaborationEvaluator.validate(
      mockRuntime as any,
      nonCollaborationMessage as any
    );
    expect(isValid).toBe(false);
  });

  test("rejects messages without text content", async () => {
    const messageWithoutText = {
      ...collaborationMessage,
      content: {},
    };

    const isValid = await collaborationEvaluator.validate(
      mockRuntime as any,
      messageWithoutText as any
    );
    expect(isValid).toBe(false);
  });

  test("processes collaboration analysis", async () => {
    const result = await collaborationEvaluator.handler(
      mockRuntime as any,
      collaborationMessage as any
    );

    expect(result).toBeDefined();
    expect((result as any).score).toBeGreaterThan(0);
    expect((result as any).keywords).toBeDefined();
    if ((result as any).keywords) {
      expect((result as any).keywords.length).toBeGreaterThan(0);
    }
  });
}); 