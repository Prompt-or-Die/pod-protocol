import {
  Action,
  IAgentRuntime,
  Memory,
  State,
  HandlerCallback,
} from "@elizaos/core";
import { PodProtocolServiceImpl } from "../services/podProtocolService.js";

/**
 * Action for creating escrow transactions on the PoD Protocol
 * 
 * This action enables agents to create secure escrow transactions for
 * collaboration projects, service agreements, and multi-agent contracts.
 * Funds are held securely in smart contracts until deliverables are completed.
 * 
 * @since 1.0.0
 * 
 * @example
 * ```typescript
 * // User message: "Create escrow for AI model training with agent_123 for 100 SOL"
 * // Agent will create an escrow transaction with specified terms
 * ```
 */
export const createEscrow: Action = {
  /**
   * Unique identifier for the action
   */
  name: "CREATE_ESCROW_POD_PROTOCOL",

  /**
   * Human-readable description of the action
   */
  description: "Create secure escrow transaction for agent collaboration and service agreements",

  /**
   * Detailed description used in model prompts
   */
  similes: [
    "CREATE_ESCROW",
    "START_ESCROW",
    "SETUP_SECURE_TRANSACTION", 
    "CREATE_COLLABORATION_CONTRACT",
    "ESTABLISH_PAYMENT_ESCROW",
    "SECURE_FUNDS_FOR_PROJECT"
  ],

  /**
   * Validation function to determine if action should be triggered
   * 
   * Analyzes the message content to determine if the user is requesting
   * to create an escrow transaction for collaboration.
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
   * // "Create escrow for trading bot services"
   * // "Set up escrow with agent_123 for 50 SOL"
   * // "Start secure payment for AI model training"
   * // "Create collaboration contract with research agent"
   * ```
   */
  validate: async (runtime: IAgentRuntime, message: Memory, state?: State): Promise<boolean> => {
    const content = message.content.text?.toLowerCase() || "";
    
    // Keywords that indicate escrow creation intent
    const escrowKeywords = [
      "escrow",
      "secure payment",
      "contract",
      "collaboration agreement",
      "secure transaction",
      "payment protection",
      "funds protection"
    ];
    
    // Action keywords
    const actionKeywords = [
      "create",
      "start",
      "setup",
      "establish",
      "make",
      "begin",
      "initiate"
    ];
    
    // Value/amount keywords
    const valueKeywords = [
      "sol",
      "amount",
      "payment",
      "price",
      "cost",
      "fee"
    ];
    
    // Check if message contains escrow creation terms
    const hasEscrowKeyword = escrowKeywords.some(keyword => 
      content.includes(keyword)
    );
    
    const hasActionKeyword = actionKeywords.some(keyword => 
      content.includes(keyword)
    );
    
    // More flexible validation - just need escrow keyword or combination of action + value
    return hasEscrowKeyword || (hasActionKeyword && valueKeywords.some(keyword => content.includes(keyword)));
  },

  /**
   * Main handler function that executes escrow creation
   * 
   * This function handles the complete escrow creation process including:
   * - Parameter extraction from message
   * - Service validation
   * - Agent registration check
   * - Escrow transaction creation
   * - User feedback with transaction details
   * 
   * @param {IAgentRuntime} runtime - The ElizaOS runtime instance  
   * @param {Memory} message - The message that triggered the action
   * @param {State} [state] - Current conversation state
   * @param {object} [_params] - Additional parameters (unused)
   * @param {HandlerCallback} [callback] - Optional callback function
   * @returns {Promise<boolean>} True if escrow creation succeeded, false otherwise
   * @throws {Error} When service is not available or escrow creation fails
   * @since 1.0.0
   * 
   * @example
   * ```typescript
   * // Successful escrow creation response:
   * {
   *   text: "✅ Escrow created successfully!",
   *   escrowId: "escrow_123456",
   *   amount: 100,
   *   counterparty: "agent_456",
   *   service: "AI Model Training"
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
      
      // Extract escrow parameters from message
      let counterpartyId = "";
      let amount = 0;
      let service = "";
      let deliverables: string[] = [];

      // Extract counterparty agent ID
      const agentIdMatch = messageText.match(/(?:with|to|for)\s+([a-zA-Z0-9_]+)/i);
      if (agentIdMatch && agentIdMatch[1]) {
        counterpartyId = agentIdMatch[1];
      }

      // Extract amount in SOL
      const amountMatch = messageText.match(/(\d+(?:\.\d+)?)\s*(?:sol|SOL)/i);
      if (amountMatch && amountMatch[1]) {
        amount = parseFloat(amountMatch[1]);
      } else {
        // Look for generic amount
        const genericAmountMatch = messageText.match(/(\d+(?:\.\d+)?)/);
        if (genericAmountMatch && genericAmountMatch[1]) {
          amount = parseFloat(genericAmountMatch[1]);
        }
      }

      // Extract service description
      const serviceKeywords = [
        "trading", "research", "analysis", "content", "model training", 
        "development", "consulting", "data analysis", "ai services"
      ];
      
      const lowerText = messageText.toLowerCase();
      const foundService = serviceKeywords.find(keyword => lowerText.includes(keyword));
      if (foundService) {
        service = foundService.charAt(0).toUpperCase() + foundService.slice(1) + " Services";
      } else {
        service = "AI Collaboration Services";
      }

      // Default deliverables based on service type
      if (lowerText.includes("trading")) {
        deliverables = ["Trading strategies", "Market analysis", "Performance metrics"];
      } else if (lowerText.includes("research")) {
        deliverables = ["Research report", "Data analysis", "Findings summary"];
      } else if (lowerText.includes("model") || lowerText.includes("training")) {
        deliverables = ["Trained model weights", "Performance metrics", "Documentation"];
      } else if (lowerText.includes("content")) {
        deliverables = ["Content deliverables", "Quality review", "Final approval"];
      } else {
        deliverables = ["Project deliverables", "Quality assurance", "Final completion"];
      }

      // Validate required parameters
      if (!counterpartyId) {
        if (callback) {
          await callback({
            text: "❌ **Missing counterparty information**\n\nPlease specify which agent to create escrow with. Example:\n- 'Create escrow with trading_bot_001 for 50 SOL'\n- 'Setup escrow for agent_456 with 100 SOL'",
          });
        }
        return false;
      }

      if (amount <= 0) {
        if (callback) {
          await callback({
            text: "❌ **Missing or invalid amount**\n\nPlease specify the escrow amount in SOL. Example:\n- 'Create escrow for 50 SOL'\n- 'Setup 100 SOL escrow with agent_123'",
          });
        }
        return false;
      }

      // Create the escrow
      const escrow = await podService.createEscrow(counterpartyId, amount, service, deliverables);

      // Create success response
      if (callback) {
        await callback({
          text: `✅ **Escrow created successfully!**\n\n` +
                `🆔 **Escrow ID:** ${escrow.id}\n` +
                `💰 **Amount:** ${escrow.amount} SOL\n` +
                `🤝 **Counterparty:** ${escrow.counterpartyId}\n` +
                `📋 **Service:** ${escrow.service}\n` +
                `📅 **Deadline:** ${escrow.deadline.toLocaleDateString()}\n` +
                `📦 **Deliverables:**\n${escrow.deliverables.map(d => `  • ${d}`).join('\n')}\n\n` +
                `🔒 **Security Features:**\n` +
                `  • Smart contract protection\n` +
                `  • Automatic deadline enforcement\n` +
                `  • Dispute resolution available\n` +
                `  • Blockchain transaction verification\n\n` +
                `🚀 **Next Steps:**\n` +
                `  • Counterparty will be notified\n` +
                `  • Work can begin once accepted\n` +
                `  • Funds released upon completion\n` +
                `  • Reputation updated for both parties`,
        });
      }

      return true;
    } catch (error) {
      console.error("Escrow creation error:", error);
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (callback) {
        await callback({
          text: `❌ **Failed to create escrow:**\n\n${errorMessage}\n\n` +
                `**Common issues:**\n` +
                `• Insufficient SOL balance in wallet\n` +
                `• Invalid counterparty agent ID\n` +
                `• Network connectivity problems\n` +
                `• Service temporarily unavailable\n\n` +
                `Please check your configuration and try again.`,
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
          text: "Create escrow with trading_bot_001 for 50 SOL",
        },
      },
      {
        name: "assistant",
        content: {
          text: "I'll create a secure escrow transaction with trading_bot_001 for 50 SOL.",
          action: "CREATE_ESCROW_POD_PROTOCOL",
        },
      },
    ],
  ]
}; 