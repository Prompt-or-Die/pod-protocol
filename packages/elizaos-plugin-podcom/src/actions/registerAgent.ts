import {
  Action,
  IAgentRuntime,
  Memory,
  State,
  HandlerCallback,
} from "@elizaos/core";
import { parseConfig, validateConfig } from "../environment.js";
import { PodProtocolServiceImpl } from "../services/podProtocolService.js";

/**
 * Action for registering an agent on the PoD Protocol blockchain
 * 
 * This action allows agents to register themselves on the PoD Protocol network,
 * creating a blockchain identity with specified capabilities and metadata.
 * The registration enables the agent to participate in the decentralized
 * communication network.
 * 
 * @since 1.0.0
 * 
 * @example
 * ```typescript
 * // User message: "Register me on the PoD Protocol"
 * // Agent will automatically register with configured capabilities
 * ```
 */
export const registerAgent: Action = {
  /**
   * Unique identifier for the action
   */
  name: "REGISTER_AGENT_POD_PROTOCOL",

  /**
   * Human-readable description of the action
   */
  description: "Register agent on PoD Protocol network with blockchain identity and capabilities",

  /**
   * Detailed description used in model prompts
   */
  similes: [
    "CREATE_BLOCKCHAIN_IDENTITY",
    "JOIN_POD_NETWORK", 
    "REGISTER_ON_PROTOCOL",
    "CREATE_AGENT_PROFILE",
    "ESTABLISH_AGENT_PRESENCE"
  ],

  /**
   * Validation function to determine if action should be triggered
   * 
   * Analyzes the message content to determine if the user is requesting
   * agent registration on the PoD Protocol network.
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
   * // "Register me on PoD Protocol"
   * // "Join the pod network"
   * // "Create my blockchain identity"
   * // "Register my agent"
   * ```
   */
  validate: async (runtime: IAgentRuntime, message: Memory, state?: State): Promise<boolean> => {
    const content = message.content.text?.toLowerCase() || "";
    
    // Keywords that indicate registration intent
    const registrationKeywords = [
      "register",
      "join",
      "create",
      "setup",
      "initialize",
      "enroll",
      "sign up",
      "onboard"
    ];
    
    // PoD Protocol related keywords
    const podKeywords = [
      "pod protocol",
      "pod network", 
      "blockchain",
      "protocol",
      "network",
      "identity",
      "agent",
      "profile"
    ];
    
    // Check if message contains both registration and pod-related terms
    const hasRegistrationKeyword = registrationKeywords.some(keyword => 
      content.includes(keyword)
    );
    
    const hasPodKeyword = podKeywords.some(keyword => 
      content.includes(keyword)
    );
    
    return hasRegistrationKeyword && hasPodKeyword;
  },

  /**
   * Main handler function that executes the agent registration
   * 
   * This function handles the complete registration process including:
   * - Configuration validation
   * - Service initialization check
   * - Blockchain registration
   * - Error handling and user feedback
   * 
   * @param {IAgentRuntime} runtime - The ElizaOS runtime instance  
   * @param {Memory} message - The message that triggered the action
   * @param {State} [state] - Current conversation state
   * @param {object} [_params] - Additional parameters (unused)
   * @param {HandlerCallback} [callback] - Optional callback function
   * @returns {Promise<boolean>} True if registration succeeded, false otherwise
   * @throws {Error} When configuration is invalid or registration fails
   * @since 1.0.0
   * 
   * @example
   * ```typescript
   * // Successful registration response:
   * {
   *   text: "Successfully registered agent 'TradingBot' on PoD Protocol!",
   *   details: {
   *     agentId: "agent_123456",
   *     capabilities: ["trading", "analysis"],
   *     reputation: 50,
   *     walletAddress: "8vK2...mN8p"
   *   }
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
            text: "❌ PoD Protocol service is not available. Please check the plugin configuration.",
          });
        }
        return false;
      }

      // Parse and validate configuration
      const config = parseConfig(runtime);
      const validation = validateConfig(config);
      
      if (!validation.isValid) {
        if (callback) {
          await callback({
            text: `❌ Configuration validation failed:\n${validation.errors.map(err => `• ${err}`).join('\n')}\n\nPlease check your environment variables.`,
          });
        }
        return false;
      }

      // Check if agent is already registered
      const currentState = podService.getState();
      if (currentState?.isRegistered) {
        if (callback) {
          await callback({
            text: `✅ Agent '${currentState.agent?.name}' is already registered on PoD Protocol!\n\n` +
                  `🆔 Agent ID: ${currentState.agent?.agentId}\n` +
                  `🏆 Reputation: ${currentState.agent?.reputation}\n` +
                  `💼 Capabilities: ${currentState.agent?.capabilities.join(', ')}\n` +
                  `💰 Wallet: ${currentState.agent?.walletAddress}`,
          });
        }
        return true;
      }

      // Perform registration
      const agent = await podService.registerAgent(config);

      // Create success response
      if (callback) {
        await callback({
          text: `🎉 Successfully registered agent '${agent.name}' on PoD Protocol!\n\n` +
                `🆔 Agent ID: ${agent.agentId}\n` +
                `🏆 Initial Reputation: ${agent.reputation}\n` +
                `💼 Capabilities: ${agent.capabilities.join(', ')}\n` +
                `💰 Wallet Address: ${agent.walletAddress}\n` +
                `📅 Registration Time: ${new Date().toLocaleString()}\n\n` +
                `Your agent is now ready to communicate with other AI agents on the blockchain! 🚀`,
        });
      }

      return true;
    } catch (error) {
      console.error("Registration error:", error);
      
      // Create error response
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (callback) {
        await callback({
          text: `❌ Failed to register agent on PoD Protocol:\n\n${errorMessage}\n\n` +
                `Please check your configuration and try again. If the problem persists, ` +
                `verify your wallet has sufficient SOL balance and the RPC endpoint is accessible.`,
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
          text: "I want to join the pod network",
        },
      },
      {
        user: "{{agentName}}",
        content: {
          text: "Perfect! I'll join the PoD Protocol network to enable blockchain-based communication with other AI agents.",
          action: "REGISTER_AGENT_POD_PROTOCOL",
        },
      },
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Create my blockchain identity for the agent",
        },
      },
      {
        user: "{{agentName}}",
        content: {
          text: "Creating your blockchain identity on PoD Protocol now. This will allow me to communicate with other AI agents across different platforms!",
          action: "REGISTER_AGENT_POD_PROTOCOL",
        },
      },
    ],
  ]
};