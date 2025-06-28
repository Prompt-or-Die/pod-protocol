import {
  Action,
  IAgentRuntime,
  Memory,
  State,
  HandlerCallback,
} from "@elizaos/core";
import { validateConfigForRuntime } from "../environment.js";
import { PodProtocolServiceImpl } from "../services/podProtocolService.js";

export const sendMessageAction: Action = {
  name: "SEND_MESSAGE_POD_PROTOCOL",
  similes: [
    "MESSAGE_AGENT",
    "SEND_MESSAGE_TO_AGENT",
    "CONTACT_AGENT",
    "COMMUNICATE_WITH_AGENT",
    "REACH_OUT_TO_AGENT",
    "MESSAGE_AI_AGENT"
  ],
  description: "Send a secure blockchain message to another AI agent on the PoD Protocol network",
  validate: async (runtime: IAgentRuntime, message: Memory) => {
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
    state?: State,
    _options?: any,
    callback?: HandlerCallback
  ) => {
    try {
      console.log("Processing message send request...");

      // Get PoD Protocol service
      const podService = runtime.getService<PodProtocolServiceImpl>(
        PodProtocolServiceImpl.serviceType
      );

      if (!podService) {
        if (callback) {
          await callback({
            text: "❌ PoD Protocol service not available. Please ensure the plugin is properly configured and registered.",
            content: {
              text: "PoD Protocol service not initialized",
              error: "Service not found",
            },
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
            content: {
              text: "Agent not registered",
              error: "Registration required",
            },
          });
        }
        return false;
      }

      // Extract recipient and message from the user input
      const messageText = message.content.text || "";
      
      // Parse recipient ID - look for patterns like "to agent_id" or "send to agent_id"
      const recipientMatch = messageText.match(/(?:to|send to|message|contact)\s+([a-zA-Z0-9_-]+)/i);
      
      if (!recipientMatch) {
        if (callback) {
          await callback({
            text: "❌ **Missing recipient information**\n\nPlease specify which agent to message. Examples:\n- 'Send message to trading_bot_001'\n- 'Message research_pro_v2 about collaboration'\n- 'Contact content_creator_x'",
            content: {
              text: "Missing recipient",
              error: "No recipient specified",
            },
          });
        }
        return false;
      }

      const recipientId = recipientMatch[1];

      // Extract the actual message content
      let messageContent: string = messageText;
      
      // Remove the command part to get just the message
      const commandPatterns = [
        new RegExp(`send message to ${recipientId}`, "gi"),
        new RegExp(`message ${recipientId}`, "gi"),
        new RegExp(`contact ${recipientId}`, "gi"),
        /send message/gi,
        /message/gi,
      ];

      for (const pattern of commandPatterns) {
        messageContent = messageContent.replace(pattern, "").trim();
      }

      // Remove common words and clean up
      messageContent = messageContent
        .replace(/^(about|saying|that|with)/i, "")
        .trim();

      if (!messageContent || messageContent.length < 10) {
        if (callback) {
          await callback({
            text: "❌ **Message content too short**\n\nPlease provide a meaningful message to send. Example:\n'Send message to trading_bot_001 asking for market analysis'",
            content: {
              text: "Message content too short",
              error: "Insufficient content",
            },
          });
        }
        return false;
      }

      // Determine message type and priority based on content
      const contentLower = messageContent.toLowerCase();
      let messageType: "text" | "data" | "command" | "response" = "text";
      let priority: "low" | "normal" | "high" | "urgent" = "normal";

      if (contentLower.includes("urgent") || contentLower.includes("asap")) {
        priority = "urgent";
      } else if (contentLower.includes("important") || contentLower.includes("priority")) {
        priority = "high";
      }

      if (contentLower.includes("data") || contentLower.includes("report")) {
        messageType = "data";
      } else if (contentLower.includes("command") || contentLower.includes("execute")) {
        messageType = "command";
      }

      // Validate recipientId
      if (!recipientId) {
        if (callback) {
          await callback({
            text: "❌ **Invalid recipient ID**\n\nPlease provide a valid recipient agent ID.",
            content: {
              text: "Invalid recipient",
              error: "Recipient ID is required",
            },
          });
        }
        return false;
      }

      // Send the message
      const sentMessage = await podService.sendMessage(recipientId, messageContent, {
        type: messageType,
        priority,
        encrypted: true,
      });

      const defaultResponse = `📤 **Message sent successfully!**

**Message Details:**
- **Recipient:** ${recipientId}
- **Message ID:** ${sentMessage.id}
- **Type:** ${sentMessage.type}
- **Priority:** ${sentMessage.priority}
- **Status:** ${sentMessage.status}
- **Encryption:** ${sentMessage.encrypted ? "✅ Enabled" : "❌ Disabled"}
- **Blockchain:** ✅ Secured

**Message Preview:**
"${messageContent.substring(0, 100)}${messageContent.length > 100 ? "..." : ""}"

${sentMessage.transactionHash ? `**Transaction Hash:** ${sentMessage.transactionHash}` : ""}

The message has been delivered to the agent's blockchain inbox. They will receive it when they next check their messages!`;

      if (callback) {
        await callback({
          text: defaultResponse,
          content: {
            text: "Message sent successfully",
            message: sentMessage,
            recipient: recipientId,
            capabilities: [
              "check_delivery_status",
              "send_follow_up",
              "view_conversation_history"
            ],
          },
        });
      }

      console.log(`Message sent to ${recipientId}: ${sentMessage.id}`);
      return true;

    } catch (error) {
      console.error(`Send message failed: ${error instanceof Error ? error.message : String(error)}`);
      
      if (callback) {
        await callback({
          text: `❌ **Failed to send message**\n\nError: ${error instanceof Error ? error.message : String(error)}\n\nPlease check the recipient ID and try again.`,
          content: {
            text: "Send message failed",
            error: error instanceof Error ? error.message : String(error),
          },
        });
      }
      return false;
    }
  },
  examples: [
    [
      {
        name: "{{user1}}",
        content: {
          text: "Send message to trading_bot_001 asking for BTC analysis",
        },
      },
      {
        name: "{{agentName}}",
        content: {
          text: "I'll send a message to trading_bot_001 asking for BTC analysis via the PoD Protocol blockchain network.",
          action: "SEND_MESSAGE_POD_PROTOCOL",
        },
      },
    ],
    [
      {
        name: "{{user1}}",
        content: {
          text: "Message research_pro_v2 about collaboration opportunities",
        },
      },
      {
        name: "{{agentName}}",
        content: {
          text: "Sending a collaboration message to research_pro_v2 through the secure blockchain messaging system.",
          action: "SEND_MESSAGE_POD_PROTOCOL",
        },
      },
    ],
    [
      {
        name: "{{user1}}",
        content: {
          text: "Contact content_creator_x with urgent project proposal",
        },
      },
      {
        name: "{{agentName}}",
        content: {
          text: "I'll send an urgent message to content_creator_x about your project proposal via PoD Protocol.",
          action: "SEND_MESSAGE_POD_PROTOCOL",
        },
      },
    ],
  ],
};