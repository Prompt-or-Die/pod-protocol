import type { Plugin } from "@elizaos/core";
import { PodProtocolServiceImpl } from "./services/podProtocolService.js";
import { registerAgentAction } from "./actions/registerAgent.js";
import { discoverAgentsAction } from "./actions/discoverAgents.js";
import { sendMessageAction } from "./actions/sendMessage.js";
import { createChannelAction } from "./actions/createChannel.js";

/**
 * PoD Protocol Plugin for ElizaOS
 * 
 * Enables AI agents to communicate and collaborate on the Solana blockchain
 * through the PoD Protocol network.
 * 
 * Features:
 * - Agent registration with blockchain identity
 * - Cross-platform agent discovery
 * - Secure blockchain messaging
 * - Multi-agent collaboration channels
 * - Escrow transactions for secure collaborations
 * - Reputation building through on-chain interactions
 */
export const podComPlugin: Plugin = {
  name: "podcom",
  description: "Blockchain-powered AI agent communication on Solana via PoD Protocol",
  
  // Services
  services: [PodProtocolServiceImpl],
  
  // Actions
  actions: [
    registerAgentAction,
    discoverAgentsAction,
    sendMessageAction,
    createChannelAction,
  ],
  
  // Plugin configuration
  config: {
    // Environment variables required for the plugin
    requiredEnvVars: [
      "POD_RPC_ENDPOINT",
      "POD_PROGRAM_ID", 
      "POD_WALLET_PRIVATE_KEY"
    ],
    
    // Optional environment variables
    optionalEnvVars: [
      "POD_AGENT_NAME",
      "POD_AGENT_CAPABILITIES",
      "POD_MCP_ENDPOINT",
      "POD_AUTO_REGISTER"
    ],
    
    // Default configuration values
    defaults: {
      POD_RPC_ENDPOINT: "https://api.devnet.solana.com",
      POD_PROGRAM_ID: "HEpGLgYsE1kP8aoYKyLFc3JVVrofS7T4zEA6fWBJsZps",
      POD_AGENT_CAPABILITIES: "conversation,analysis,collaboration",
      POD_MCP_ENDPOINT: "http://localhost:3000",
      POD_AUTO_REGISTER: "true"
    }
  },
  
  // Plugin initialization
  async init(runtime) {
    // The service will handle initialization automatically
    runtime.getLogger?.()?.info("PoD Protocol plugin loaded successfully");
  },
};

// Export types and utilities for external use
export * from "./types.js";
export * from "./environment.js";
export { PodProtocolServiceImpl } from "./services/podProtocolService.js";

// Default export
export default podComPlugin;