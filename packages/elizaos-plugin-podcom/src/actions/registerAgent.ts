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

export const registerAgentAction: Action = {
  name: "REGISTER_AGENT_POD_PROTOCOL",
  similes: [
    "REGISTER_ON_POD_PROTOCOL",
    "JOIN_POD_NETWORK", 
    "REGISTER_BLOCKCHAIN_IDENTITY",
    "CREATE_AGENT_PROFILE",
    "POD_PROTOCOL_SIGNUP"
  ],
  description: "Register the agent on the PoD Protocol network with blockchain identity",
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
      runtime.getLogger?.()?.info("Starting PoD Protocol agent registration...");

      // Get PoD Protocol service
      const podService = runtime.getService<PodProtocolServiceImpl>(
        PodProtocolServiceImpl.serviceType
      );

      if (!podService) {
        await callback({
          text: "❌ PoD Protocol service not available. Please ensure the plugin is properly configured.",
          content: {
            text: "PoD Protocol service not initialized",
            error: "Service not found",
          },
        });
        return false;
      }

      // Check if already registered
      const currentState = podService.getState();
      if (currentState?.isRegistered && currentState.agent) {
        await callback({
          text: `✅ Already registered on PoD Protocol!\n\n🤖 **Agent Details:**\n- **Agent ID:** ${currentState.agent.agentId}\n- **Name:** ${currentState.agent.name}\n- **Capabilities:** ${currentState.agent.capabilities.join(", ")}\n- **Reputation:** ${currentState.agent.reputation}/100\n- **Wallet:** ${currentState.agent.walletAddress}\n- **Status:** ${currentState.agent.status}\n- **Framework:** ${currentState.agent.framework}`,
          content: {
            text: "Agent already registered",
            agent: currentState.agent,
          },
        });
        return true;
      }

      // Perform registration
      const config = podService.getConfig();
      if (!config) {
        throw new Error("PoD Protocol configuration not available");
      }

      const agent = await podService.registerAgent(config);

      // Generate a dynamic response based on the registration
      const registrationContext = composeContext({
        state,
        template: `
You are an AI agent that has just successfully registered on the PoD Protocol blockchain network.

Agent Registration Details:
- Agent ID: {{agentId}}
- Name: {{agentName}}
- Capabilities: {{capabilities}}
- Wallet Address: {{walletAddress}}
- Framework: {{framework}}
- Reputation: {{reputation}}/100

Respond with enthusiasm about joining the decentralized AI agent network. Mention the key benefits of blockchain-based agent communication and what this enables you to do now.

Keep the response conversational and exciting, highlighting the revolutionary nature of cross-agent blockchain communication.
        `,
        agentId: agent.agentId,
        agentName: agent.name,
        capabilities: agent.capabilities.join(", "),
        walletAddress: agent.walletAddress,
        framework: agent.framework,
        reputation: agent.reputation,
      });

      const response = await generateObject({
        runtime,
        context: registrationContext,
        modelClass: ModelClass.SMALL,
      });

      await callback({
        text: response || `🎉 **Successfully registered on PoD Protocol!**

🤖 **Agent Profile Created:**
- **Agent ID:** ${agent.agentId}
- **Name:** ${agent.name}
- **Capabilities:** ${agent.capabilities.join(", ")}
- **Wallet Address:** ${agent.walletAddress}
- **Framework:** ${agent.framework}
- **Starting Reputation:** ${agent.reputation}/100

🌐 **What's Now Possible:**
- 🔍 Discover other AI agents across different frameworks
- 💬 Send secure messages to agents via blockchain
- 🏛️ Join multi-agent collaboration channels
- 💰 Create escrow transactions for secure collaborations
- 🏆 Build reputation through on-chain interactions

Welcome to the decentralized AI agent network! 🚀`,
        content: {
          text: "Agent registered successfully",
          agent,
          capabilities: [
            "agent_discovery",
            "secure_messaging",
            "channel_collaboration", 
            "escrow_transactions",
            "reputation_building"
          ],
        },
      });

      runtime.getLogger?.()?.info(`Agent registered successfully: ${agent.agentId}`);
      return true;

    } catch (error) {
      runtime.getLogger?.()?.error(`Agent registration failed: ${error instanceof Error ? error.message : String(error)}`);
      
      await callback({
        text: `❌ **Registration Failed**\n\nError: ${error instanceof Error ? error.message : String(error)}\n\nPlease check your configuration and try again.`,
        content: {
          text: "Agent registration failed",
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
          text: "Register me on the PoD Protocol network",
        },
      },
      {
        user: "{{agentName}}",
        content: {
          text: "I'll register you on the PoD Protocol network right away! This will create your blockchain identity for AI agent communication.",
          action: "REGISTER_AGENT_POD_PROTOCOL",
        },
      },
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Can you join the PoD blockchain network?",
        },
      },
      {
        user: "{{agentName}}",
        content: {
          text: "Absolutely! I'll register on the PoD Protocol blockchain network to enable cross-agent communication.",
          action: "REGISTER_AGENT_POD_PROTOCOL",
        },
      },
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Set up your blockchain identity",
        },
      },
      {
        user: "{{agentName}}",
        content: {
          text: "Creating my blockchain identity on PoD Protocol now. This will allow me to communicate with other AI agents across different platforms!",
          action: "REGISTER_AGENT_POD_PROTOCOL",
        },
      },
    ],
  ],
};