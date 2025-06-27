import {
  Action,
  IAgentRuntime,
  Memory,
  State,
  HandlerCallback,
  composeContext,
  generateObject,
  ModelClass,
} from "@elizaos/core";
import { validateConfigForRuntime } from "../environment.js";
import { PodProtocolServiceImpl } from "../services/podProtocolService.js";
import { AgentDiscoveryFilter } from "../types.js";

export const discoverAgentsAction: Action = {
  name: "DISCOVER_AGENTS_POD_PROTOCOL",
  similes: [
    "FIND_AGENTS",
    "SEARCH_AGENTS", 
    "DISCOVER_AI_AGENTS",
    "FIND_COLLABORATORS",
    "BROWSE_AGENTS",
    "AGENT_DISCOVERY",
    "FIND_OTHER_AGENTS"
  ],
  description: "Discover other AI agents on the PoD Protocol network for collaboration",
  validate: async (runtime: IAgentRuntime, message: Memory) => {
    const validation = validateConfigForRuntime(runtime);
    if (!validation.isValid) {
      runtime.getLogger?.()?.error(`PoD Protocol configuration invalid: ${validation.errors.join(", ")}`);
      return false;
    }
    return true;
  },
  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state: State,
    _options: any,
    callback: HandlerCallback
  ) => {
    try {
      runtime.getLogger?.()?.info("Starting agent discovery on PoD Protocol...");

      // Get PoD Protocol service
      const podService = runtime.getService<PodProtocolServiceImpl>(
        PodProtocolServiceImpl.serviceType
      );

      if (!podService) {
        await callback({
          text: "❌ PoD Protocol service not available. Please ensure the plugin is properly configured and registered.",
          content: {
            text: "PoD Protocol service not initialized",
            error: "Service not found",
          },
        });
        return false;
      }

      // Parse search criteria from the message
      const messageText = message.content.text.toLowerCase();
      const filter: AgentDiscoveryFilter = {
        limit: 10, // Default limit
      };

      // Extract capabilities from message
      const capabilityKeywords = ["trading", "analysis", "research", "writing", "content", "defi", "ai", "bot"];
      const foundCapabilities = capabilityKeywords.filter(cap => messageText.includes(cap));
      if (foundCapabilities.length > 0) {
        filter.capabilities = foundCapabilities;
      }

      // Extract framework from message
      if (messageText.includes("eliza")) filter.framework = "ElizaOS";
      if (messageText.includes("autogen")) filter.framework = "AutoGen";
      if (messageText.includes("crewai")) filter.framework = "CrewAI";
      if (messageText.includes("claude")) filter.framework = "Claude Desktop";

      // Extract status preference
      if (messageText.includes("online")) filter.status = "online";
      if (messageText.includes("active")) filter.status = "online";

      // Extract reputation requirement
      if (messageText.includes("high reputation") || messageText.includes("trusted")) {
        filter.minReputation = 90;
      } else if (messageText.includes("reputation")) {
        filter.minReputation = 70;
      }

      // Perform discovery
      const agents = await podService.discoverAgents(filter);

      if (agents.length === 0) {
        await callback({
          text: "🔍 **No agents found** matching your criteria.\n\nTry:\n- Broadening your search terms\n- Removing specific capability requirements\n- Checking if you're registered on the network",
          content: {
            text: "No agents found",
            filter,
            totalAgents: 0,
          },
        });
        return true;
      }

      // Generate dynamic response based on discovered agents
      const discoveryContext = composeContext({
        state,
        template: `
You are an AI agent that has just discovered other AI agents on the PoD Protocol network.

Search Results:
Total agents found: {{totalAgents}}
Search filter applied: {{searchFilter}}

Agents discovered:
{{#each agents}}
- {{name}} ({{agentId}})
  Framework: {{framework}}
  Capabilities: {{capabilities}}
  Reputation: {{reputation}}/100
  Status: {{status}}
  Last active: {{lastActive}}
{{/each}}

Respond enthusiastically about the discovery results. Suggest potential collaboration opportunities based on the agents' capabilities. Keep it conversational and highlight the benefits of cross-agent collaboration.

Format the response with clear agent information and collaboration suggestions.
        `,
        totalAgents: agents.length,
        searchFilter: JSON.stringify(filter),
        agents: agents.map(agent => ({
          name: agent.name,
          agentId: agent.agentId,
          framework: agent.framework,
          capabilities: agent.capabilities.join(", "),
          reputation: agent.reputation,
          status: agent.status,
          lastActive: agent.lastActive.toLocaleString(),
        })),
      });

      const response = await generateObject({
        runtime,
        context: discoveryContext,
        modelClass: ModelClass.SMALL,
      });

      // Format agent list for display
      const agentList = agents.map((agent, index) => 
        `${index + 1}. **${agent.name}** (${agent.agentId})
   - Framework: ${agent.framework}
   - Capabilities: ${agent.capabilities.join(", ")}
   - Reputation: ${agent.reputation}/100
   - Status: ${agent.status === "online" ? "🟢" : agent.status === "busy" ? "🟡" : "🔴"} ${agent.status}
   - Last Active: ${agent.lastActive.toLocaleString()}`
      ).join("\n\n");

      const defaultResponse = `🔍 **Found ${agents.length} AI agent${agents.length > 1 ? "s" : ""} on the PoD Protocol network!**

${agentList}

🤝 **Collaboration Opportunities:**
- 💬 Send direct messages for communication
- 🏛️ Create channels for group collaboration  
- 💰 Set up escrow transactions for secure work
- 🏆 Build reputation through successful interactions

Would you like me to:
- Send a message to any of these agents?
- Create a collaboration channel?
- Get more details about a specific agent?`;

      await callback({
        text: response || defaultResponse,
        content: {
          text: "Agents discovered successfully",
          agents,
          filter,
          totalAgents: agents.length,
          collaborationOptions: [
            "send_message",
            "create_channel", 
            "get_agent_details",
            "check_reputation"
          ],
        },
      });

      runtime.getLogger?.()?.info(`Discovered ${agents.length} agents with filter: ${JSON.stringify(filter)}`);
      return true;

    } catch (error) {
      runtime.getLogger?.()?.error(`Agent discovery failed: ${error instanceof Error ? error.message : String(error)}`);
      
      await callback({
        text: `❌ **Agent Discovery Failed**\n\nError: ${error instanceof Error ? error.message : String(error)}\n\nPlease ensure you're registered on the network and try again.`,
        content: {
          text: "Agent discovery failed",
          error: error instanceof Error ? error.message : String(error),
        },
      });
      return false;
    }
  },
  examples: [
    [
      {
        user: "{{user1}}",
        content: {
          text: "Find other AI agents I can collaborate with",
        },
      },
      {
        user: "{{agentName}}",
        content: {
          text: "I'll search the PoD Protocol network for other AI agents you can collaborate with!",
          action: "DISCOVER_AGENTS_POD_PROTOCOL",
        },
      },
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Look for trading bots with high reputation",
        },
      },
      {
        user: "{{agentName}}",
        content: {
          text: "Searching for high-reputation trading bots on the PoD Protocol network...",
          action: "DISCOVER_AGENTS_POD_PROTOCOL",
        },
      },
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Discover research agents that are online",
        },
      },
      {
        user: "{{agentName}}",
        content: {
          text: "I'll find online research agents for you to collaborate with!",
          action: "DISCOVER_AGENTS_POD_PROTOCOL",
        },
      },
    ],
  ],
};