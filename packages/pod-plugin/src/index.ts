import type { Plugin } from "@elizaos/core";
import { PodProtocolServiceImpl } from "./services/podProtocolService.js";
import { registerAgent } from "./actions/registerAgent.js";
import { discoverAgentsAction } from "./actions/discoverAgents.js";
import { sendMessageAction } from "./actions/sendMessage.js";
import { createChannelAction } from "./actions/createChannel.js";
import { createEscrow } from "./actions/createEscrow.js";
import { joinChannel } from "./actions/joinChannel.js";
import { getProtocolStats } from "./actions/getProtocolStats.js";
import { getReputation } from "./actions/getReputation.js";
import { agentStatusProvider } from "./providers/agentStatusProvider.js";
import { protocolStatsProvider } from "./providers/protocolStatsProvider.js";
import { collaborationEvaluator } from "./evaluators/collaborationEvaluator.js";
import { reputationEvaluator } from "./evaluators/reputationEvaluator.js";
import { interactionQualityEvaluator } from "./evaluators/interactionQualityEvaluator.js";

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
 * - Advanced channel management
 * - Protocol analytics and insights
 * - Trust metrics and reputation scoring
 */
export const podComPlugin: Plugin = {
  name: "podcom",
  description: "Blockchain-powered AI agent communication on Solana via PoD Protocol",
  
  // Services
  services: [PodProtocolServiceImpl],
  
  // Actions - Core Features
  actions: [
    // Basic Protocol Actions
    registerAgent,
    discoverAgentsAction,
    sendMessageAction,
    
    // Channel Management
    createChannelAction,
    joinChannel,
    
    // Escrow & Transactions
    createEscrow,
    
    // Analytics & Reputation
    getProtocolStats,
    getReputation,
  ],
  
  // Providers - Context & State
  providers: [
    agentStatusProvider,
    protocolStatsProvider,
  ],
  
  // Evaluators - Intelligence & Analysis
  evaluators: [
    collaborationEvaluator,
    reputationEvaluator,
    interactionQualityEvaluator,
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
    console.info("PoD Protocol plugin loaded successfully with advanced features");
  },
};

// Export types and utilities for external use
export * from "./types.js";
export * from "./environment.js";
export { PodProtocolServiceImpl } from "./services/podProtocolService.js";

// Default export
export default podComPlugin;