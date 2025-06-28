import { IAgentRuntime, Memory, Provider, State } from "@elizaos/core";
import { PodProtocolServiceImpl } from "../services/podProtocolService.js";

/**
 * Provider that supplies current agent status and POD protocol information
 * to enhance decision-making and conversation context
 */
export const agentStatusProvider: Provider = {
  name: "podAgentStatus",
  description: "Provides current agent status and PoD Protocol network information",
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
          text: "PoD Protocol: Not initialized",
          values: { 
            isInitialized: false,
            error: "Service not found"
          },
        };
      }

      const pluginState = podService.getState();
      const config = podService.getConfig();

      if (!pluginState || !config) {
        return {
          text: "PoD Protocol: Service not ready",
          values: { 
            isInitialized: false,
            error: "Service not ready"
          },
        };
      }

      // Build status context
      const statusLines = [
        "=== PoD Protocol Agent Status ===",
      ];

      const values: any = {
        isInitialized: true,
        isRegistered: pluginState.isRegistered,
      };

      if (pluginState.isRegistered && pluginState.agent) {
        statusLines.push(
          `✅ Registered as: ${pluginState.agent.name} (${pluginState.agent.agentId})`,
          `🏆 Reputation: ${pluginState.agent.reputation}/100`,
          `🎯 Capabilities: ${pluginState.agent.capabilities.join(", ")}`,
          `📱 Status: ${pluginState.agent.status}`,
          `🌐 Framework: ${pluginState.agent.framework}`,
          `💼 Wallet: ${pluginState.agent.walletAddress.slice(0, 8)}...`,
          `📅 Last Active: ${pluginState.agent.lastActive.toLocaleString()}`
        );

        values.agent = {
          id: pluginState.agent.agentId,
          name: pluginState.agent.name,
          reputation: pluginState.agent.reputation,
          capabilities: pluginState.agent.capabilities,
          status: pluginState.agent.status,
          framework: pluginState.agent.framework,
          walletAddress: pluginState.agent.walletAddress,
        };
      } else {
        statusLines.push("❌ Not registered on PoD Protocol network");
      }

      // Add network statistics
      statusLines.push(
        "",
        "=== Network Activity ===",
        `👥 Connected Agents: ${pluginState.connectedAgents.size}`,
        `🏛️ Active Channels: ${pluginState.channels.size}`,
        `💬 Messages Exchanged: ${pluginState.messages.length}`,
        `💰 Active Escrows: ${Array.from(pluginState.escrows.values()).filter((e: any) => 
          e.status === "created" || e.status === "funded"
        ).length}`,
        `🔄 Last Sync: ${pluginState.lastSync.toLocaleString()}`
      );

      values.networkStats = {
        connectedAgents: pluginState.connectedAgents.size,
        activeChannels: pluginState.channels.size,
        messagesExchanged: pluginState.messages.length,
        activeEscrows: Array.from(pluginState.escrows.values()).filter((e: any) => 
          e.status === "created" || e.status === "funded"
        ).length,
        lastSync: pluginState.lastSync.toISOString(),
      };

      // Add configuration info
      statusLines.push(
        "",
        "=== Configuration ===",
        `🌐 RPC Endpoint: ${config.rpcEndpoint}`,
        `📋 Program ID: ${config.programId.slice(0, 8)}...`,
        `🔧 Auto Register: ${config.autoRegister ? "Enabled" : "Disabled"}`,
        config.mcpEndpoint ? `🔌 MCP Endpoint: ${config.mcpEndpoint}` : ""
      );

      values.config = {
        rpcEndpoint: config.rpcEndpoint,
        programId: config.programId,
        autoRegister: config.autoRegister,
        mcpEndpoint: config.mcpEndpoint,
      };

      return {
        text: statusLines.filter(line => line !== "").join("\n"),
        values,
      };

    } catch (error) {
      return {
        text: `PoD Protocol: Error retrieving status - ${error instanceof Error ? error.message : String(error)}`,
        values: { 
          isInitialized: false,
          error: error instanceof Error ? error.message : String(error)
        },
      };
    }
  },
}; 