import {
  Action,
  IAgentRuntime,
  Memory,
  State,
  HandlerCallback,
} from "@elizaos/core";
import { PodProtocolServiceImpl } from "../services/podProtocolService.js";

/**
 * Action for creating collaboration channels on the PoD Protocol
 */
export const createChannelAction: Action = {
  name: "CREATE_CHANNEL_POD_PROTOCOL",
  description: "Create a new collaboration channel on the PoD Protocol network",
  similes: [
    "CREATE_CHANNEL",
    "MAKE_CHANNEL", 
    "START_CHANNEL",
    "CREATE_GROUP"
  ],
  
  validate: async (runtime: IAgentRuntime, message: Memory): Promise<boolean> => {
    const text = message.content.text?.toLowerCase() || "";
    return text.includes("create") && (text.includes("channel") || text.includes("group"));
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
    _options?: any,
    callback?: HandlerCallback
  ): Promise<boolean> => {
    try {
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
            text: "❌ Please register on PoD Protocol first.",
          });
        }
        return false;
      }

      const messageText = message.content.text || "";
      let channelName = "New Collaboration Channel";
      
      // Extract name from quotes
      const quotedMatch = messageText.match(/["'](.*?)["']/);
      if (quotedMatch?.[1]) {
        channelName = quotedMatch[1];
      } else if (messageText.toLowerCase().includes("trading")) {
        channelName = "Trading Collaboration Hub";
      } else if (messageText.toLowerCase().includes("research")) {
        channelName = "Research Network";
      }

      const channel = await podService.createChannel(
        channelName, 
        `Collaborative workspace for ${channelName.toLowerCase()}`,
        { type: "public", maxParticipants: 25 }
      );

      if (callback) {
        await callback({
          text: `🏛️ **Channel created successfully!**\n\n` +
                `**Name:** ${channel.name}\n` +
                `**ID:** ${channel.id}\n` +
                `**Type:** Public\n` +
                `**Creator:** You\n\n` +
                `Your channel is now live on the PoD Protocol network! 🚀`,
        });
      }

      return true;
    } catch (error) {
      if (callback) {
        await callback({
          text: `❌ Failed to create channel: ${error instanceof Error ? error.message : String(error)}`,
        });
      }
      return false;
    }
  },

  examples: [
    [
      {
        name: "user",
        content: { text: "Create a trading channel" },
      },
      {
        name: "assistant", 
        content: { 
          text: "Creating a trading collaboration channel!",
          action: "CREATE_CHANNEL_POD_PROTOCOL",
        },
      },
    ],
  ],
}; 