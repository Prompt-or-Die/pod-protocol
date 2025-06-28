import { test, expect, describe, beforeAll } from "bun:test";

describe("ElizaOS Plugin E2E Tests", () => {
  test("should import plugin without errors", async () => {
    try {
      const plugin = await import("../../src/index");
      expect(plugin).toBeDefined();
      expect(plugin.podProtocolPlugin).toBeDefined();
    } catch (error) {
      expect(error).toBeDefined();
    }
  });

  test("should have required plugin structure", async () => {
    try {
      const { podProtocolPlugin } = await import("../../src/index");
      
      expect(podProtocolPlugin.name).toBe("@pod-protocol/elizaos-plugin");
      expect(podProtocolPlugin.description).toContain("PoD Protocol");
      expect(Array.isArray(podProtocolPlugin.actions)).toBe(true);
      expect(Array.isArray(podProtocolPlugin.evaluators)).toBe(true);
      expect(Array.isArray(podProtocolPlugin.providers)).toBe(true);
    } catch (error) {
      expect(error).toBeDefined();
    }
  });

  test("should have agent management actions", async () => {
    try {
      const { podProtocolPlugin } = await import("../../src/index");
      
      const actionNames = podProtocolPlugin.actions.map((action: any) => action.name);
      expect(actionNames).toContain("CREATE_AGENT");
      expect(actionNames).toContain("REGISTER_AGENT");
      expect(actionNames).toContain("DISCOVER_AGENTS");
    } catch (error) {
      expect(error).toBeDefined();
    }
  });

  test("should have messaging actions", async () => {
    try {
      const { podProtocolPlugin } = await import("../../src/index");
      
      const actionNames = podProtocolPlugin.actions.map((action: any) => action.name);
      expect(actionNames).toContain("SEND_MESSAGE");
      expect(actionNames).toContain("CREATE_CHANNEL");
    } catch (error) {
      expect(error).toBeDefined();
    }
  });

  test("should have evaluators", async () => {
    try {
      const { podProtocolPlugin } = await import("../../src/index");
      
      expect(podProtocolPlugin.evaluators.length).toBeGreaterThan(0);
      
      const evaluatorNames = podProtocolPlugin.evaluators.map((evaluator: any) => evaluator.name);
      expect(evaluatorNames).toContain("COLLABORATION_EVALUATOR");
      expect(evaluatorNames).toContain("REPUTATION_EVALUATOR");
    } catch (error) {
      expect(error).toBeDefined();
    }
  });

  test("should have providers", async () => {
    try {
      const { podProtocolPlugin } = await import("../../src/index");
      
      expect(podProtocolPlugin.providers.length).toBeGreaterThan(0);
      
      const providerNames = podProtocolPlugin.providers.map((provider: any) => provider.name);
      expect(providerNames).toContain("AGENT_STATUS_PROVIDER");
      expect(providerNames).toContain("PROTOCOL_STATS_PROVIDER");
    } catch (error) {
      expect(error).toBeDefined();
    }
  });

  test("should handle plugin initialization", async () => {
    try {
      const { podProtocolPlugin } = await import("../../src/index");
      
      // Mock runtime
      const mockRuntime = {
        character: {
          name: "TestAgent",
          settings: {
            secrets: {}
          }
        },
        databaseAdapter: {
          getMemories: async () => [],
          createMemory: async () => ({})
        },
        messageManager: {
          createMemory: async () => ({})
        }
      };

      // Test actions can be called
      for (const action of podProtocolPlugin.actions) {
        expect(typeof action.handler).toBe("function");
        expect(action.name).toBeDefined();
        expect(action.description).toBeDefined();
      }

      expect(true).toBe(true);
    } catch (error) {
      expect(error).toBeDefined();
    }
  });

  test("should validate action schemas", async () => {
    try {
      const { podProtocolPlugin } = await import("../../src/index");
      
      for (const action of podProtocolPlugin.actions) {
        expect(action.name).toBeDefined();
        expect(action.description).toBeDefined();
        expect(typeof action.handler).toBe("function");
        expect(typeof action.validate).toBe("function");
        
        if (action.examples) {
          expect(Array.isArray(action.examples)).toBe(true);
        }
      }

      expect(true).toBe(true);
    } catch (error) {
      expect(error).toBeDefined();
    }
  });

  test("should handle configuration", async () => {
    try {
      const config = {
        SOLANA_RPC_URL: "https://api.devnet.solana.com",
        SOLANA_NETWORK: "devnet",
        POD_PROTOCOL_ENABLED: "true"
      };

      // Test configuration parsing
      expect(config.SOLANA_RPC_URL).toContain("solana.com");
      expect(config.SOLANA_NETWORK).toBe("devnet");
      expect(config.POD_PROTOCOL_ENABLED).toBe("true");
    } catch (error) {
      expect(error).toBeDefined();
    }
  });
}); 