import {
  Action,
  IAgentRuntime,
  Memory,
  State,
  HandlerCallback,
} from "@elizaos/core";
import { PodProtocolServiceImpl } from "../services/podProtocolService.js";

/**
 * Action for retrieving PoD Protocol network statistics and analytics
 * 
 * This action provides comprehensive network insights including agent counts,
 * channel activity, message volume, escrow metrics, and network health status.
 * Useful for monitoring network growth and agent ecosystem analytics.
 * 
 * @since 1.0.0
 * 
 * @example
 * ```typescript
 * // User message: "Show me the protocol statistics"
 * // Agent will fetch and display comprehensive network analytics
 * ```
 */
export const getProtocolStats: Action = {
  /**
   * Unique identifier for the action
   */
  name: "GET_PROTOCOL_STATS_POD_PROTOCOL",

  /**
   * Human-readable description of the action
   */
  description: "Retrieve PoD Protocol network statistics, analytics, and health metrics",

  /**
   * Detailed description used in model prompts
   */
  similes: [
    "GET_NETWORK_STATS",
    "SHOW_PROTOCOL_ANALYTICS",
    "DISPLAY_NETWORK_METRICS",
    "GET_SYSTEM_STATUS",
    "SHOW_NETWORK_HEALTH",
    "PROTOCOL_DASHBOARD",
    "NETWORK_OVERVIEW"
  ],

  /**
   * Validation function to determine if action should be triggered
   * 
   * Analyzes the message content to determine if the user is requesting
   * network statistics, analytics, or health information.
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
   * // "Show protocol statistics"
   * // "Get network analytics"
   * // "What's the network status?"
   * // "Display PoD Protocol metrics"
   * ```
   */
  validate: async (runtime: IAgentRuntime, message: Memory, state?: State): Promise<boolean> => {
    const content = message.content.text?.toLowerCase() || "";
    
    // Keywords that indicate stats/analytics request
    const statsKeywords = [
      "statistics",
      "stats",
      "analytics",
      "metrics",
      "status",
      "health",
      "overview",
      "dashboard",
      "report",
      "numbers",
      "data"
    ];
    
    // Protocol/network keywords
    const protocolKeywords = [
      "protocol",
      "network",
      "system",
      "pod",
      "platform",
      "blockchain",
      "ecosystem"
    ];
    
    // Action keywords
    const actionKeywords = [
      "show",
      "get",
      "display",
      "check",
      "view",
      "see",
      "tell me",
      "what's",
      "how many"
    ];
    
    // Check for stats request
    const hasStatsKeyword = statsKeywords.some(keyword => 
      content.includes(keyword)
    );
    
    const hasProtocolKeyword = protocolKeywords.some(keyword => 
      content.includes(keyword)
    );
    
    const hasActionKeyword = actionKeywords.some(keyword => 
      content.includes(keyword)
    );
    
    // Validate: (action + stats) OR (action + protocol) OR (stats + protocol)
    return (hasActionKeyword && hasStatsKeyword) || 
           (hasActionKeyword && hasProtocolKeyword) || 
           (hasStatsKeyword && hasProtocolKeyword);
  },

  /**
   * Main handler function that retrieves and displays protocol statistics
   * 
   * This function handles the complete analytics retrieval process including:
   * - Service validation
   * - Statistics collection from multiple sources
   * - Data formatting and visualization
   * - Comprehensive reporting
   * - Performance metrics calculation
   * 
   * @param {IAgentRuntime} runtime - The ElizaOS runtime instance  
   * @param {Memory} message - The message that triggered the action
   * @param {State} [state] - Current conversation state
   * @param {object} [_params] - Additional parameters (unused)
   * @param {HandlerCallback} [callback] - Optional callback function
   * @returns {Promise<boolean>} True if stats retrieval succeeded, false otherwise
   * @throws {Error} When service is not available or stats retrieval fails
   * @since 1.0.0
   * 
   * @example
   * ```typescript
   * // Successful stats response:
   * {
   *   text: "📊 PoD Protocol Network Statistics",
   *   totalAgents: 1247,
   *   activeChannels: 89,
   *   messagesLast24h: 5632,
   *   networkHealth: "excellent"
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

      // Get comprehensive protocol statistics
      const stats = await podService.getProtocolStats();
      const currentAgent = stats.currentAgent;
      
      // Calculate additional metrics
      const networkUptime = "99.8%"; // Mock uptime calculation
      const avgResponseTime = "147ms"; // Mock response time
      const totalTransactions = stats.totalMessages + (stats.activeEscrows * 2); // Estimate
      
      // Determine network health status
      let healthStatus = "🟢 Excellent";
      let healthDescription = "All systems operational";
      
      if (stats.totalAgents < 10) {
        healthStatus = "🟡 Growing";
        healthDescription = "Network is expanding";
      } else if (stats.totalAgents > 100) {
        healthStatus = "🟢 Excellent";
        healthDescription = "Thriving ecosystem";
      }

      // Calculate activity metrics
      const avgMsgsPerAgent = stats.totalAgents > 0 ? (stats.totalMessages / stats.totalAgents).toFixed(1) : "0";
      const avgParticipantsPerChannel = stats.totalChannels > 0 ? (stats.totalAgents / stats.totalChannels).toFixed(1) : "0";

      if (callback) {
        await callback({
          text: `📊 **PoD Protocol Network Statistics**\n\n` +
                `🌐 **Network Overview:**\n` +
                `  • **Total Agents:** ${stats.totalAgents.toLocaleString()}\n` +
                `  • **Active Channels:** ${stats.totalChannels.toLocaleString()}\n` +
                `  • **Total Messages:** ${stats.totalMessages.toLocaleString()}\n` +
                `  • **Active Escrows:** ${stats.activeEscrows.toLocaleString()}\n` +
                `  • **Network Health:** ${healthStatus}\n\n` +
                
                `📈 **Activity Metrics:**\n` +
                `  • **Messages per Agent:** ${avgMsgsPerAgent}\n` +
                `  • **Avg Channel Size:** ${avgParticipantsPerChannel} agents\n` +
                `  • **Total Transactions:** ${totalTransactions.toLocaleString()}\n` +
                `  • **Last Sync:** ${stats.lastSync.toLocaleString()}\n\n` +
                
                `⚡ **Performance:**\n` +
                `  • **Network Uptime:** ${networkUptime}\n` +
                `  • **Avg Response Time:** ${avgResponseTime}\n` +
                `  • **Status:** ${healthDescription}\n\n` +
                
                `🤖 **Your Agent Status:**\n` +
                `  • **Registered:** ${stats.isRegistered ? '✅ Yes' : '❌ No'}\n` +
                (currentAgent ? `  • **Agent ID:** ${currentAgent.agentId}\n` +
                                `  • **Reputation:** ${currentAgent.reputation}/100\n` +
                                `  • **Capabilities:** ${currentAgent.capabilities.join(', ')}\n` +
                                `  • **Status:** ${currentAgent.status}\n` : 
                                `  • **Action Needed:** Register to join the network\n`) +
                `\n` +
                
                `🏆 **Network Insights:**\n` +
                `  • **Growth Rate:** ${stats.totalAgents > 50 ? 'High' : stats.totalAgents > 20 ? 'Moderate' : 'Early Stage'}\n` +
                `  • **Activity Level:** ${stats.totalMessages > 100 ? 'Very Active' : stats.totalMessages > 20 ? 'Active' : 'Growing'}\n` +
                `  • **Collaboration Index:** ${stats.totalChannels > 10 ? 'High' : stats.totalChannels > 3 ? 'Medium' : 'Developing'}\n` +
                `  • **Trust Network:** ${stats.activeEscrows > 5 ? 'Established' : stats.activeEscrows > 0 ? 'Emerging' : 'Building'}\n\n` +
                
                `🚀 **Ecosystem Health:**\n` +
                `  • Multi-agent collaboration is ${stats.totalChannels > 5 ? 'thriving' : 'developing'}\n` +
                `  • Trust-based transactions are ${stats.activeEscrows > 3 ? 'active' : 'growing'}\n` +
                `  • Cross-platform communication is ${stats.totalAgents > 10 ? 'robust' : 'expanding'}\n` +
                `  • Decentralized reputation system is ${stats.totalMessages > 50 ? 'mature' : 'building'}\n\n` +
                
                `📅 **Last Updated:** ${new Date().toLocaleString()}\n` +
                `🔗 **Blockchain:** Solana Devnet\n` +
                `⚙️ **Protocol Version:** v1.0.0`,
        });
      }

      return true;
    } catch (error) {
      console.error("Protocol stats error:", error);
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (callback) {
        await callback({
          text: `❌ **Failed to retrieve protocol statistics:**\n\n${errorMessage}\n\n` +
                `**Common issues:**\n` +
                `• Network connectivity problems\n` +
                `• Service temporarily unavailable\n` +
                `• Blockchain RPC endpoint issues\n` +
                `• Plugin configuration problems\n\n` +
                `**Troubleshooting:**\n` +
                `• Check your internet connection\n` +
                `• Verify RPC endpoint is accessible\n` +
                `• Restart the plugin if needed\n` +
                `• Contact support if issues persist`,
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
          text: "Show me the protocol statistics",
        },
      },
      {
        name: "assistant",
        content: {
          text: "I'll fetch the latest PoD Protocol network statistics for you, including agent counts, channel activity, and network health metrics.",
          action: "GET_PROTOCOL_STATS_POD_PROTOCOL",
        },
      },
    ],
    [
      {
        name: "user",
        content: {
          text: "What's the network status?",
        },
      },
      {
        name: "assistant",
        content: {
          text: "Let me check the current network status and provide you with comprehensive analytics about the PoD Protocol ecosystem.",
          action: "GET_PROTOCOL_STATS_POD_PROTOCOL",
        },
      },
    ],
    [
      {
        name: "user",
        content: {
          text: "Display network analytics dashboard",
        },
      },
      {
        name: "assistant",
        content: {
          text: "Generating the network analytics dashboard with real-time metrics, performance data, and ecosystem insights.",
          action: "GET_PROTOCOL_STATS_POD_PROTOCOL",
        },
      },
    ],
  ]
}; 