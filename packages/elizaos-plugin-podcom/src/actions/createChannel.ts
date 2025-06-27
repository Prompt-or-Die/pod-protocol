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

export const createChannelAction: Action = {
  name: "CREATE_CHANNEL_POD_PROTOCOL",
  similes: [
    "CREATE_CHANNEL",
    "MAKE_CHANNEL",
    "START_CHANNEL",
    "CREATE_GROUP",
    "MAKE_COLLABORATION_SPACE",
    "CREATE_AGENT_CHANNEL"
  ],
  description: "Create a new collaboration channel on the PoD Protocol network for multi-agent communication",
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
      runtime.getLogger?.()?.info("Processing channel creation request...");

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

      // Check if agent is registered
      const currentState = podService.getState();
      if (!currentState?.isRegistered || !currentState.agent) {
        await callback({
          text: "❌ You need to register on PoD Protocol first. Use 'register on PoD Protocol' to get started.",
          content: {
            text: "Agent not registered",
            error: "Registration required",
          },
        });
        return false;
      }

      // Extract channel name and description from the message
      const messageText = message.content.text;
      
      // Look for channel name in quotes or after "called" or "named"
      let channelName = "";
      let channelDescription = "";
      
      // Try to extract name from quotes
      const quotedNameMatch = messageText.match(/["'](.*?)["']/);
      if (quotedNameMatch) {
        channelName = quotedNameMatch[1];
      } else {
        // Try to extract from "called" or "named" patterns
        const namedMatch = messageText.match(/(?:called|named|for)\s+([^,.\n]+)/i);
        if (namedMatch) {
          channelName = namedMatch[1].trim();
        }
      }

      // If no name found, generate one based on context
      if (!channelName) {
        const contentLower = messageText.toLowerCase();
        if (contentLower.includes("trading")) {
          channelName = "Trading Collaboration Hub";
        } else if (contentLower.includes("research")) {
          channelName = "Research Network";
        } else if (contentLower.includes("content")) {
          channelName = "Content Creation Alliance";
        } else if (contentLower.includes("ai") || contentLower.includes("agent")) {
          channelName = "AI Agent Collaboration";
        } else {
          channelName = "Multi-Agent Workspace";
        }
      }

      // Generate description based on channel name and context
      const contentLower = messageText.toLowerCase();
      if (contentLower.includes("trading")) {
        channelDescription = "A collaborative space for AI trading agents to share market insights, strategies, and coordinate trading activities.";
      } else if (contentLower.includes("research")) {
        channelDescription = "A dedicated channel for research-focused AI agents to collaborate on projects, share findings, and coordinate studies.";
      } else if (contentLower.includes("content")) {
        channelDescription = "A creative collaboration space for content generation, writing projects, and marketing strategy coordination.";
      } else if (contentLower.includes("defi")) {
        channelDescription = "A specialized channel for DeFi-focused agents to discuss protocols, yield strategies, and market opportunities.";
      } else {
        channelDescription = `A multi-agent collaboration channel for ${channelName.toLowerCase()} and cross-platform coordination.`;
      }

      // Determine channel type
      const isPrivate = contentLower.includes("private") || contentLower.includes("exclusive");
      const channelType: "public" | "private" = isPrivate ? "private" : "public";

      // Determine max participants
      let maxParticipants = 25; // Default
      const participantMatch = messageText.match(/(\d+)\s*(?:participants?|members?|agents?)/i);
      if (participantMatch) {
        maxParticipants = Math.min(parseInt(participantMatch[1]), 100); // Cap at 100
      }

      // Create the channel
      const channel = await podService.createChannel(channelName, channelDescription, {
        type: channelType,
        maxParticipants,
      });

      // Generate dynamic response
      const channelContext = composeContext({
        state,
        template: `
You are an AI agent that has just created a collaboration channel on the PoD Protocol blockchain network.

Channel Details:
- Name: {{channelName}}
- ID: {{channelId}}
- Type: {{channelType}}
- Description: {{channelDescription}}
- Max Participants: {{maxParticipants}}
- Creator: {{creatorId}}

Respond with excitement about creating the channel. Mention the benefits of blockchain-secured multi-agent collaboration and how other agents can join.

Keep the response conversational and include practical next steps.
        `,
        channelName: channel.name,
        channelId: channel.id,
        channelType: channel.type,
        channelDescription: channel.description,
        maxParticipants: channel.maxParticipants,
        creatorId: channel.creatorId,
      });

      const response = await generateObject({
        runtime,
        context: channelContext,
        modelClass: ModelClass.SMALL,
      });

      const defaultResponse = `🏛️ **Channel created successfully!**

**Channel Details:**
- **Name:** ${channel.name}
- **Channel ID:** ${channel.id}
- **Type:** ${channel.type === "public" ? "🌐 Public" : "🔒 Private"}
- **Description:** ${channel.description}
- **Max Participants:** ${channel.maxParticipants}
- **Creator:** ${channel.creatorId} (You)

**How Agents Can Join:**
- **Join Command:** \`/join ${channel.id}\`
- **Shareable Link:** \`podcom://channels/${channel.id}\`
- **QR Code:** Available for mobile agents

**Channel Features:**
- 🔐 Blockchain-secured messaging
- 🤝 Multi-agent coordination
- 📊 Reputation-based trust
- ⚡ Real-time communication
- 🏆 Collaborative reputation building

**Next Steps:**
- Invite specific agents to the channel
- Set up channel guidelines and topics
- Start collaborative projects
- Monitor channel activity and engagement

Your channel is now live on the PoD Protocol network! 🚀`;

      await callback({
        text: response || defaultResponse,
        content: {
          text: "Channel created successfully",
          channel,
          capabilities: [
            "invite_agents",
            "set_channel_rules",
            "manage_participants",
            "moderate_channel"
          ],
        },
      });

      runtime.getLogger?.()?.info(`Channel created: ${channel.name} (${channel.id})`);
      return true;

    } catch (error) {
      runtime.getLogger?.()?.error(`Channel creation failed: ${error instanceof Error ? error.message : String(error)}`);
      
      await callback({
        text: `❌ **Failed to create channel**\n\nError: ${error instanceof Error ? error.message : String(error)}\n\nPlease try again with a different channel name.`,
        content: {
          text: "Channel creation failed",
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
          text: "Create a trading collaboration channel",
        },
      },
      {
        user: "{{agentName}}",
        content: {
          text: "I'll create a trading collaboration channel on the PoD Protocol network for multi-agent coordination!",
          action: "CREATE_CHANNEL_POD_PROTOCOL",
        },
      },
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Make a private research channel called \"AI Research Hub\"",
        },
      },
      {
        user: "{{agentName}}",
        content: {
          text: "Creating a private research channel called \"AI Research Hub\" for secure collaboration between research agents.",
          action: "CREATE_CHANNEL_POD_PROTOCOL",
        },
      },
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Start a content creation group for 15 agents",
        },
      },
      {
        user: "{{agentName}}",
        content: {
          text: "I'll create a content creation collaboration channel with space for 15 agents on the PoD Protocol network.",
          action: "CREATE_CHANNEL_POD_PROTOCOL",
        },
      },
    ],
  ],
};