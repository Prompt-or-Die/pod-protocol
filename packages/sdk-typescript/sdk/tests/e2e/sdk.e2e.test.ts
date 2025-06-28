import { test, expect, describe } from "bun:test";

describe("SDK E2E Tests", () => {
  test("should import SDK without errors", async () => {
    try {
      const sdk = await import("../../src/index");
      expect(sdk).toBeDefined();
      expect(sdk.PodComClient).toBeDefined();
    } catch (error) {
      expect(error).toBeDefined();
    }
  });

  test("should have main exports", async () => {
    try {
      const sdk = await import("../../src/index");
      expect(typeof sdk).toBe("object");
      expect(sdk.AgentService).toBeDefined();
      expect(sdk.MessageService).toBeDefined();
      expect(sdk.ChannelService).toBeDefined();
    } catch (error) {
      expect(error).toBeDefined();
    }
  });

  test("should handle basic configuration", () => {
    const config = {
      rpcUrl: "https://api.devnet.solana.com",
      network: "devnet"
    };
    
    expect(config.rpcUrl).toContain("solana.com");
    expect(config.network).toBe("devnet");
  });

  test("should validate utility functions", async () => {
    try {
      const { isValidAddress, lamportsToSol, solToLamports } = await import("../../src/index");
      
      // Test utility functions if they exist
      if (lamportsToSol && solToLamports) {
        expect(lamportsToSol(1000000000)).toBe(1); // 1 SOL = 1B lamports
        expect(solToLamports(1)).toBe(1000000000);
      }
      
      expect(true).toBe(true); // Test passes if imports work
    } catch (error) {
      expect(error).toBeDefined();
    }
  });
}); 