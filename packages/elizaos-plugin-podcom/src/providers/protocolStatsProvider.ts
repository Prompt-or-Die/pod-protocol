import { IAgentRuntime, Memory, Provider, State } from "@elizaos/core";

/**
 * Provider that supplies PoD Protocol network statistics and basic context
 * to enhance agent decision-making
 */
export const protocolStatsProvider: Provider = {
  name: "podProtocolStats",
  description: "Provides PoD Protocol network statistics and connection status",
  get: async (
    runtime: IAgentRuntime,
    message: Memory,
    state: State
  ) => {
    try {
      // Get POD Protocol service
      const podService = runtime.getService("pod_protocol") as any;

      if (!podService) {
        return {
          text: "PoD Protocol: Not connected to network",
          values: { 
            connected: false,
            status: "disconnected"
          },
        };
      }

      // Check if service has required methods
      if (typeof podService.getState !== 'function' || typeof podService.getConfig !== 'function') {
        return {
          text: "PoD Protocol: Service not properly initialized",
          values: { 
            connected: false,
            status: "invalid_service"
          },
        };
      }

      const pluginState = podService.getState();
      const config = podService.getConfig();

      if (!pluginState) {
        return {
          text: "PoD Protocol: Service state not available",
          values: { 
            connected: false,
            status: "no_state"
          },
        };
      }

      // Build status information
      const isRegistered = pluginState.isRegistered || false;
      const connectedAgents = pluginState.connectedAgents ? pluginState.connectedAgents.size : 0;
      const activeChannels = pluginState.channels ? pluginState.channels.size : 0;
      const totalMessages = pluginState.messages ? pluginState.messages.length : 0;

      const contextLines = [
        "=== PoD Protocol Network Status ===",
      ];

      if (isRegistered) {
        contextLines.push("✅ Connected to PoD Protocol network");
        if (pluginState.agent) {
          contextLines.push(`🤖 Agent: ${pluginState.agent.name || 'Unknown'}`);
          contextLines.push(`🏆 Reputation: ${pluginState.agent.reputation || 50}/100`);
        }
      } else {
        contextLines.push("❌ Not registered on PoD Protocol network");
        contextLines.push("💡 Use 'register on PoD Protocol' to join the network");
      }

      contextLines.push(
        "",
        "=== Network Activity ===",
        `👥 Discovered Agents: ${connectedAgents}`,
        `🏛️ Active Channels: ${activeChannels}`,
        `💬 Total Messages: ${totalMessages}`
      );

      if (config && config.rpcEndpoint) {
        contextLines.push(
          "",
          "=== Network Configuration ===",
          `🌐 Network: ${config.rpcEndpoint.includes('devnet') ? 'Devnet' : 'Mainnet'}`
        );
      }

      const values = {
        connected: true,
        status: "connected",
        isRegistered,
        networkStats: {
          connectedAgents,
          activeChannels,
          totalMessages,
        },
        agent: pluginState.agent ? {
          name: pluginState.agent.name,
          reputation: pluginState.agent.reputation,
          capabilities: pluginState.agent.capabilities,
        } : null,
      };

      return {
        text: contextLines.join("\n"),
        values,
      };

    } catch (error) {
      return {
        text: "PoD Protocol: Error retrieving network status",
        values: { 
          connected: false,
          status: "error",
          error: error instanceof Error ? error.message : String(error)
        },
      };
    }
  },
}; 