import {
  Action,
  IAgentRuntime,
  Memory,
  State,
  HandlerCallback,
} from "@elizaos/core";
import { validateConfigForRuntime } from "../environment.js";
import { PodProtocolServiceImpl } from "../services/podProtocolService.js";

/**
 * Action for discovering other agents on the PoD Protocol network
 */
export const discoverAgentsAction: Action = {
  name: "DISCOVER_AGENTS_POD_PROTOCOL",
  description: "Discover and connect with other AI agents on the PoD Protocol network",
  similes: [
    "DISCOVER_AGENTS",
    "FIND_AGENTS",
    "SEARCH_AGENTS",
    "LIST_AGENTS",
    "SHOW_AGENTS"
  ],
  
  validate: async (runtime: IAgentRuntime, _message: Memory): Promise<boolean> => {
    const validation = validateConfigForRuntime(runtime);
    if (!validation.isValid) {
      console.error(`PoD Protocol configuration invalid: ${validation.errors.join(", ")}`);
      return false;
    }
    return true;
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state?: State,
    _options?: any,
    callback?: HandlerCallback
  ): Promise<boolean> => {
    try {
      console.info("Starting agent discovery on PoD Protocol...");

      const podService = runtime.getService("pod_protocol") as PodProtocolServiceImpl;
      
      if (!podService) {
        if (callback) {
          await callback({
            text: "❌ PoD Protocol service not available.",
          });
        }
        return false;
      }

      const currentState = podService.getState();
      if (!currentState?.isRegistered) {
        if (callback) {
          await callback({
            text: "❌ Please register on PoD Protocol first to discover agents.",
          });
        }
        return false;
      }

      const messageText = (message.content.text || "").toLowerCase();
      
      // Parse search criteria
      let capability = "";
      if (messageText.includes("trading")) capability = "trading";
      else if (messageText.includes("research")) capability = "research";
      else if (messageText.includes("content")) capability = "content";
      
      const filter = capability ? { capabilities: [capability] } : {};
      
      // Discover agents
      const agents = await podService.discoverAgents(filter);

      if (agents.length === 0) {
        if (callback) {
          await callback({
            text: `🔍 **No agents found**\n\nNo agents matching your criteria were found on the PoD Protocol network.\n\n**Try:**\n- Broadening your search criteria\n- Checking back later as more agents join\n- Registering first if you haven't already`,
          });
        }
        return true;
      }

      const agentList = agents.slice(0, 10).map((agent, index) => 
        `${index + 1}. **${agent.name || agent.agentId}**\n` +
        `   • ID: ${agent.agentId}\n` +
        `   • Framework: ${agent.framework}\n` +
        `   • Capabilities: ${agent.capabilities.join(", ")}\n` +
        `   • Reputation: ${agent.reputation}/100\n` +
        `   • Status: ${agent.status}`
      ).join("\n\n");

      if (callback) {
        await callback({
          text: `🤖 **Discovered ${agents.length} Agent${agents.length === 1 ? '' : 's'}**\n\n${agentList}\n\n` +
                `🚀 **Next Steps:**\n` +
                `• Send messages: "Send message to [agent_id]"\n` +
                `• Create channels: "Create channel with [agent_id]"\n` +
                `• Check reputation: "Get reputation for [agent_id]"\n` +
                `• Start collaborations: "Create escrow with [agent_id]"`,
        });
      }

      console.info(`Discovered ${agents.length} agents`);
      return true;
    } catch (error) {
      console.error(`Agent discovery failed: ${error instanceof Error ? error.message : String(error)}`);
      
      if (callback) {
        await callback({
          text: `❌ **Agent discovery failed:**\n\n${error instanceof Error ? error.message : String(error)}`,
        });
      }
      return false;
    }
  },

  examples: [
    [
      {
        name: "user",
        content: { text: "Find trading agents" },
      },
      {
        name: "assistant",
        content: { 
          text: "I'll search for trading agents on the PoD Protocol network.",
          action: "DISCOVER_AGENTS_POD_PROTOCOL",
        },
      },
    ],
  ],
};