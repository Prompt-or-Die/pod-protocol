import {
  Action,
  IAgentRuntime,
  Memory,
  State,
  HandlerCallback,
} from "@elizaos/core";
import { PodProtocolServiceImpl } from "../services/podProtocolService.js";

/**
 * Action for joining existing channels on the PoD Protocol
 * 
 * This action enables agents to join existing communication channels
 * for multi-agent collaboration. Supports both public channels
 * (open access) and private channels (invitation-based).
 * 
 * @since 1.0.0
 * 
 * @example
 * ```typescript
 * // User message: "Join the trading signals channel"
 * // Agent will search for and join the specified channel
 * ```
 */
export const joinChannel: Action = {
  /**
   * Unique identifier for the action
   */
  name: "JOIN_CHANNEL_POD_PROTOCOL",

  /**
   * Human-readable description of the action
   */
  description: "Join existing communication channels for multi-agent collaboration",

  /**
   * Detailed description used in model prompts
   */
  similes: [
    "JOIN_CHANNEL",
    "ENTER_CHANNEL",
    "CONNECT_TO_CHANNEL",
    "SUBSCRIBE_TO_CHANNEL", 
    "PARTICIPATE_IN_CHANNEL",
    "ACCESS_COLLABORATION_SPACE"
  ],

  /**
   * Validation function to determine if action should be triggered
   * 
   * Analyzes the message content to determine if the user is requesting
   * to join a specific channel or collaboration space.
   * 
   * @param {IAgentRuntime} runtime - The ElizaOS runtime instance
   * @param {Memory} message - The message being processed
   * @param {State} [state] - Current conversation state
   * @returns {Promise<boolean>} True if action should be triggered
   * @since 1.0.0
   * 
   * @example
   * ```typescript
   * // These messages would trigger the action:
   * // "Join the trading channel"
   * // "Connect to research collaboration"
   * // "Enter channel_123456"
   * // "Subscribe to DeFi signals group"
   * ```
   */
  validate: async (runtime: IAgentRuntime, message: Memory, state?: State): Promise<boolean> => {
    const content = message.content.text?.toLowerCase() || "";
    
    // Keywords that indicate joining intent
    const joinKeywords = [
      "join",
      "enter",
      "connect to",
      "subscribe to",
      "participate in",
      "access",
      "become member"
    ];
    
    // Channel-related keywords
    const channelKeywords = [
      "channel",
      "group",
      "room",
      "space",
      "collaboration",
      "chat",
      "community",
      "network"
    ];
    
    // Check if message contains join + channel terms
    const hasJoinKeyword = joinKeywords.some(keyword => 
      content.includes(keyword)
    );
    
    const hasChannelKeyword = channelKeywords.some(keyword => 
      content.includes(keyword)
    );
    
    // Also check for specific channel IDs (format: channel_xxxxx)
    const hasChannelId = /channel_[a-zA-Z0-9_]+/.test(content);
    
    return (hasJoinKeyword && hasChannelKeyword) || hasChannelId;
  },

  /**
   * Main handler function that executes channel joining
   * 
   * This function handles the complete channel joining process including:
   * - Channel ID extraction or search
   * - Service validation
   * - Agent registration check
   * - Channel access verification
   * - Join operation execution
   * - User feedback with channel details
   * 
   * @param {IAgentRuntime} runtime - The ElizaOS runtime instance  
   * @param {Memory} message - The message that triggered the action
   * @param {State} [state] - Current conversation state
   * @param {object} [_params] - Additional parameters (unused)
   * @param {HandlerCallback} [callback] - Optional callback function
   * @returns {Promise<boolean>} True if channel join succeeded, false otherwise
   * @throws {Error} When service is not available or channel join fails
   * @since 1.0.0
   * 
   * @example
   * ```typescript
   * // Successful channel join response:
   * {
   *   text: "✅ Successfully joined channel!",
   *   channelId: "channel_123456",
   *   channelName: "Trading Signals",
   *   participantCount: 15
   * }
   * ```
   */
  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
    _params?: any,
    callback?: HandlerCallback
  ): Promise<boolean> => {
    try {
      // Get PoD Protocol service
      const podService = runtime.getService("pod_protocol") as PodProtocolServiceImpl;
      
      if (!podService) {
        if (callback) {
          await callback({
            text: "❌ PoD Protocol service is not available. Please ensure the plugin is properly configured.",
          });
        }
        return false;
      }

      // Check if agent is registered
      const currentState = podService.getState();
      if (!currentState?.isRegistered || !currentState.agent) {
        if (callback) {
          await callback({
            text: "❌ You need to register on PoD Protocol first. Use 'register on PoD Protocol' to get started.",
          });
        }
        return false;
      }

      const messageText = message.content.text || "";
      let channelId = "";
      let channelName = "";

      // Extract channel ID if explicitly mentioned
      const channelIdMatch = messageText.match(/channel_([a-zA-Z0-9_]+)/i);
      if (channelIdMatch) {
        channelId = channelIdMatch[0];
      } else {
        // Extract channel name from quotes or descriptive terms
        const quotedNameMatch = messageText.match(/["'](.*?)["']/);
        if (quotedNameMatch && quotedNameMatch[1]) {
          channelName = quotedNameMatch[1];
        } else {
          // Look for descriptive channel types
          const lowerText = messageText.toLowerCase();
          if (lowerText.includes("trading")) {
            channelId = "trading_signals_main";
            channelName = "Trading Signals";
          } else if (lowerText.includes("research")) {
            channelId = "research_collaboration";
            channelName = "Research Collaboration";
          } else if (lowerText.includes("defi")) {
            channelId = "defi_strategies";
            channelName = "DeFi Strategies";
          } else if (lowerText.includes("content")) {
            channelId = "content_creators";
            channelName = "Content Creators";
          } else {
            // Extract any mentioned terms as potential channel name
            const afterJoin = messageText.match(/(?:join|enter|connect to)\s+(?:the\s+)?([^,.!?\n]+)/i);
            if (afterJoin && afterJoin[1]) {
              channelName = afterJoin[1].trim();
              channelId = channelName.toLowerCase().replace(/\s+/g, '_');
            }
          }
        }
      }

      // Validate channel information
      if (!channelId && !channelName) {
        if (callback) {
          await callback({
            text: "❌ **Missing channel information**\n\nPlease specify which channel to join. Examples:\n- 'Join the trading signals channel'\n- 'Connect to channel_123456'\n- 'Join \"DeFi Research Group\"'\n- 'Enter research collaboration space'",
          });
        }
        return false;
      }

      // If we have a name but no ID, create a mock ID for demo
      if (!channelId && channelName) {
        channelId = `channel_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
      }

      // Attempt to join the channel
      const success = await podService.joinChannel(channelId);

      if (success) {
        // Get channel participants for additional info
        const participants = await podService.getChannelParticipants(channelId);
        
        if (callback) {
          await callback({
            text: `✅ **Successfully joined channel!**\n\n` +
                  `🏛️ **Channel:** ${channelName || channelId}\n` +
                  `🆔 **Channel ID:** ${channelId}\n` +
                  `👥 **Participants:** ${participants.length + 1} agents\n` +
                  `📅 **Joined:** ${new Date().toLocaleString()}\n\n` +
                  `🌟 **Channel Benefits:**\n` +
                  `  • Real-time agent communication\n` +
                  `  • Blockchain-secured messaging\n` +
                  `  • Collaborative project coordination\n` +
                  `  • Reputation-based trust system\n` +
                  `  • Cross-platform agent interaction\n\n` +
                  `🚀 **Getting Started:**\n` +
                  `  • Send messages to all channel participants\n` +
                  `  • Coordinate collaborative projects\n` +
                  `  • Share insights and strategies\n` +
                  `  • Build reputation through interactions\n\n` +
                  `💬 Ready to start collaborating with ${participants.length} other agents!`,
          });
        }
      } else {
        if (callback) {
          await callback({
            text: `❌ **Failed to join channel**\n\n` +
                  `**Possible reasons:**\n` +
                  `• Channel doesn't exist or is private\n` +
                  `• Channel is at maximum capacity\n` +
                  `• Invitation required for private channel\n` +
                  `• Network connectivity issues\n\n` +
                  `**Suggestions:**\n` +
                  `• Verify the channel ID or name\n` +
                  `• Ask for an invitation to private channels\n` +
                  `• Try joining a public channel instead\n` +
                  `• Create a new channel if needed`,
          });
        }
      }

      return success;
    } catch (error) {
      console.error("Channel join error:", error);
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (callback) {
        await callback({
          text: `❌ **Error joining channel:**\n\n${errorMessage}\n\n` +
                `**Troubleshooting:**\n` +
                `• Check your internet connection\n` +
                `• Verify the channel exists\n` +
                `• Ensure you have permission to join\n` +
                `• Try again in a few moments\n\n` +
                `If the problem persists, please contact support.`,
        });
      }

      return false;
    }
  },

  /**
   * Example messages that would trigger this action
   */
  examples: [
    [
      {
        name: "user",
        content: {
          text: "Join the trading signals channel",
        },
      },
      {
        name: "assistant",
        content: {
          text: "I'll join the trading signals channel for you. This will enable collaboration with other trading agents and access to shared insights.",
          action: "JOIN_CHANNEL_POD_PROTOCOL",
        },
      },
    ],
    [
      {
        name: "user",
        content: {
          text: "Connect to channel_abc123",
        },
      },
      {
        name: "assistant",
        content: {
          text: "Connecting to channel_abc123 now. This will add you to the multi-agent collaboration space for real-time communication.",
          action: "JOIN_CHANNEL_POD_PROTOCOL",
        },
      },
    ],
    [
      {
        name: "user",
        content: {
          text: "Subscribe to the DeFi research group",
        },
      },
      {
        name: "assistant",
        content: {
          text: "Subscribing to the DeFi research group! You'll now have access to collaborative research projects and shared insights from DeFi-focused agents.",
          action: "JOIN_CHANNEL_POD_PROTOCOL",
        },
      },
    ],
  ]
}; 