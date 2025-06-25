import { Address, address } from '@solana/web3.js';
import { BaseService } from "./base";
import {
  AgentAccount,
  MessageAccount,
  ChannelAccount,
  EscrowAccount,
  MessageStatus,
  ChannelVisibility,
} from "../types";
import {
  lamportsToSol,
  formatDuration,
  formatBytes,
  getCapabilityNames,
  hasCapability,
} from "../utils";

/**
 * Analytics and insights for agent activities, message patterns, and channel usage
 */

export interface AgentAnalytics {
  totalAgents: number;
  capabilityDistribution: Record<string, number>;
  averageReputation: number;
  topAgentsByReputation: AgentAccount[];
  recentlyActive: AgentAccount[];
}

export interface MessageAnalytics {
  totalMessages: number;
  messagesByStatus: Record<MessageStatus, number>;
  messagesByType: Record<string, number>;
  averageMessageSize: number;
  messagesPerDay: number;
  topSenders: Array<{ agent: Address; messageCount: number }>;
  recentMessages: MessageAccount[];
}

export interface ChannelAnalytics {
  totalChannels: number;
  channelsByVisibility: Record<ChannelVisibility, number>;
  averageParticipants: number;
  mostPopularChannels: ChannelAccount[];
  totalEscrowValue: number;
  averageChannelFee: number;
}

export interface NetworkAnalytics {
  totalTransactions: number;
  totalValueLocked: number;
  activeAgents24h: number;
  messageVolume24h: number;
  networkHealth: "healthy" | "moderate" | "congested";
  peakUsageHours: number[];
}

export interface DashboardData {
  agents: AgentAnalytics;
  messages: MessageAnalytics;
  channels: ChannelAnalytics;
  network: NetworkAnalytics;
  generatedAt: number;
}

export class AnalyticsService extends BaseService {
  /**
   * Get comprehensive analytics dashboard
   */
  async getDashboard(): Promise<DashboardData> {
    const [agents, messages, channels, network] = await Promise.all([
      this.getAgentAnalytics(),
      this.getMessageAnalytics(),
      this.getChannelAnalytics(),
      this.getNetworkAnalytics(),
    ]);

    return {
      agents,
      messages,
      channels,
      network,
      generatedAt: Date.now(),
    };
  }

  /**
   * Get agent ecosystem analytics
   */
  async getAgentAnalytics(limit: number = 100): Promise<AgentAnalytics> {
    try {
      // Use placeholder for getProgramAccounts until v2.0 API is properly implemented
      const agents: any[] = []; // TODO: Implement proper v2.0 getProgramAccounts call

      const agentData: AgentAccount[] = agents.map((acc) => {
        const account = this.ensureInitialized().coder.accounts.decode(
          "agentAccount",
          acc.account.data,
        );
        return {
          pubkey: acc.pubkey,
          capabilities: account.capabilities.toNumber(),
          metadataUri: account.metadataUri,
          reputation: account.reputation?.toNumber() || 0,
          lastUpdated: account.lastUpdated?.toNumber() || Date.now(),
          invitesSent: account.invitesSent?.toNumber() || 0,
          lastInviteAt: account.lastInviteAt?.toNumber() || 0,
          bump: account.bump,
        };
      });

      // Calculate capability distribution
      const capabilityDistribution: Record<string, number> = {};
      agentData.forEach((agent) => {
        const capabilities = getCapabilityNames(agent.capabilities);
        capabilities.forEach((cap) => {
          capabilityDistribution[cap] = (capabilityDistribution[cap] || 0) + 1;
        });
      });

      // Calculate average reputation
      const averageReputation =
        agentData.length > 0
          ? agentData.reduce((sum, agent) => sum + agent.reputation, 0) /
            agentData.length
          : 0;

      // Get top agents by reputation
      const topAgentsByReputation = agentData
        .sort((a, b) => b.reputation - a.reputation)
        .slice(0, 10);

      // Get recently active agents (last 24 hours)
      const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;
      const recentlyActive = agentData
        .filter((agent) => agent.lastUpdated * 1000 > twentyFourHoursAgo)
        .sort((a, b) => b.lastUpdated - a.lastUpdated)
        .slice(0, 20);

      return {
        totalAgents: agentData.length,
        capabilityDistribution,
        averageReputation,
        topAgentsByReputation,
        recentlyActive,
      };
    } catch (error: any) {
      throw new Error(`Failed to get agent analytics: ${error.message}`);
    }
  }

  /**
   * Get message analytics and patterns
   */
  async getMessageAnalytics(limit: number = 1000): Promise<MessageAnalytics> {
    try {
      // Use placeholder for getProgramAccounts until v2.0 API is properly implemented
      const messages: any[] = []; // TODO: Implement proper v2.0 getProgramAccounts call

      const messageData: MessageAccount[] = messages
        .slice(0, limit)
        .map((acc) => {
          const account = this.ensureInitialized().coder.accounts.decode(
            "messageAccount",
            acc.account.data,
          );
          return {
            pubkey: acc.pubkey,
            sender: account.sender,
            recipient: account.recipient,
            payload: account.payload || "",
            payloadHash: account.payloadHash,
            messageType: this.convertMessageTypeFromProgram(
              account.messageType,
            ),
            status: this.convertMessageStatusFromProgram(account.status),
            timestamp: account.timestamp?.toNumber() || Date.now(),
            createdAt: account.createdAt?.toNumber() || Date.now(),
            expiresAt: account.expiresAt?.toNumber() || 0,
            bump: account.bump,
          };
        });

      // Group messages by status
      const messagesByStatus: Record<MessageStatus, number> = {
        [MessageStatus.Pending]: 0,
        [MessageStatus.Delivered]: 0,
        [MessageStatus.Read]: 0,
        [MessageStatus.Failed]: 0,
      };
      messageData.forEach((msg) => {
        messagesByStatus[msg.status]++;
      });

      // Group messages by type
      const messagesByType: Record<string, number> = {};
      messageData.forEach((msg) => {
        const type = msg.messageType;
        messagesByType[type] = (messagesByType[type] || 0) + 1;
      });

      // Calculate average message size
      const averageMessageSize =
        messageData.length > 0
          ? messageData.reduce((sum, msg) => sum + msg.payload.length, 0) /
            messageData.length
          : 0;

      // Calculate messages per day (last 7 days)
      const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      const recentMessages = messageData.filter(
        (msg) => msg.timestamp * 1000 > sevenDaysAgo,
      );
      const messagesPerDay = recentMessages.length / 7;

      // Get top senders
      const senderCounts: Record<string, number> = {};
      messageData.forEach((msg) => {
        const sender = msg.sender;
        senderCounts[sender] = (senderCounts[sender] || 0) + 1;
      });

      const topSenders = Object.entries(senderCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([agent, messageCount]) => ({
          agent: address(agent),
          messageCount,
        }));

      return {
        totalMessages: messageData.length,
        messagesByStatus,
        messagesByType,
        averageMessageSize,
        messagesPerDay,
        topSenders,
        recentMessages: messageData.slice(0, 20),
      };
    } catch (error: any) {
      throw new Error(`Failed to get message analytics: ${error.message}`);
    }
  }

  /**
   * Get channel usage analytics
   */
  async getChannelAnalytics(limit: number = 100): Promise<ChannelAnalytics> {
    try {
      // Use placeholder for getProgramAccounts until v2.0 API is properly implemented
      const channels: any[] = []; // TODO: Implement proper v2.0 getProgramAccounts call

      const channelData: ChannelAccount[] = channels
        .slice(0, limit)
        .map((acc) => {
          const account = this.ensureInitialized().coder.accounts.decode(
            "channelAccount",
            acc.account.data,
          );
          return {
            pubkey: acc.pubkey,
            creator: account.creator,
            name: account.name,
            description: account.description,
            visibility: this.convertChannelVisibilityFromProgram(
              account.visibility,
            ),
            maxParticipants: account.maxParticipants,
            participantCount: account.currentParticipants,
            currentParticipants: account.currentParticipants,
            feePerMessage: account.feePerMessage?.toNumber() || 0,
            escrowBalance: account.escrowBalance?.toNumber() || 0,
            createdAt: account.createdAt?.toNumber() || Date.now(),
            isActive: true,
            bump: account.bump,
          };
        });

      // Group channels by visibility
      const channelsByVisibility: Record<ChannelVisibility, number> = {
        [ChannelVisibility.Public]: 0,
        [ChannelVisibility.Private]: 0,
      };
      channelData.forEach((channel) => {
        channelsByVisibility[channel.visibility]++;
      });

      // Calculate average participants
      const averageParticipants =
        channelData.length > 0
          ? channelData.reduce(
              (sum, channel) => sum + channel.participantCount,
              0,
            ) / channelData.length
          : 0;

      // Get most popular channels by participant count
      const mostPopularChannels = channelData
        .sort((a, b) => b.participantCount - a.participantCount)
        .slice(0, 10);

      // Calculate total escrow value
      const totalEscrowValue = channelData.reduce(
        (sum, channel) => sum + channel.escrowBalance,
        0,
      );

      // Calculate average channel fee
      const averageChannelFee =
        channelData.length > 0
          ? channelData.reduce(
              (sum, channel) => sum + channel.feePerMessage,
              0,
            ) / channelData.length
          : 0;

      return {
        totalChannels: channelData.length,
        channelsByVisibility,
        averageParticipants,
        mostPopularChannels,
        totalEscrowValue,
        averageChannelFee,
      };
    } catch (error: any) {
      throw new Error(`Failed to get channel analytics: ${error.message}`);
    }
  }

  /**
   * Get network-wide analytics
   */
  async getNetworkAnalytics(): Promise<NetworkAnalytics> {
    try {
      // Use placeholder network analytics until v2.0 API is properly implemented
      const recentSlots: any[] = []; // TODO: Implement proper v2.0 performance samples

      const averageTps = 0; // TODO: Calculate from performance samples

      // Determine network health based on TPS
      let networkHealth: "healthy" | "moderate" | "congested" = "healthy";
      if (averageTps < 1000) {
        networkHealth = "congested";
      } else if (averageTps < 2000) {
        networkHealth = "moderate";
      }

      // Get total value locked (from escrow accounts)
      const escrows: any[] = []; // TODO: Implement proper v2.0 getProgramAccounts call

      const totalValueLocked = escrows.reduce((sum, acc) => {
        try {
          const account = this.ensureInitialized().coder.accounts.decode(
            "escrowAccount",
            acc.account.data,
          );
          return sum + (account.balance?.toNumber() || 0);
        } catch {
          return sum;
        }
      }, 0);

      // Historical metrics: placeholder until proper indexer integration
      const messageVolume24h = 0; // TODO: Query from indexer
      const activeAgents24h = 0; // TODO: Query from indexer
      const peakUsageHours: number[] = []; // TODO: Calculate from historical data

      return {
        totalTransactions: recentSlots.reduce(
          (sum, slot) => sum + (slot.numTransactions || 0),
          0,
        ),
        totalValueLocked,
        activeAgents24h,
        messageVolume24h,
        networkHealth,
        peakUsageHours,
      };
    } catch (error: any) {
      throw new Error(`Failed to get network analytics: ${error.message}`);
    }
  }

  /**
   * Generate analytics report
   */
  async generateReport(): Promise<string> {
    const dashboard = await this.getDashboard();

    let report = "# PoD Protocol Analytics Report\n\n";
    report += `Generated: ${new Date(dashboard.generatedAt).toISOString()}\n\n`;

    // Agent Analytics
    report += "## Agent Analytics\n";
    report += `- Total Agents: ${dashboard.agents.totalAgents}\n`;
    report += `- Average Reputation: ${dashboard.agents.averageReputation.toFixed(2)}\n`;
    report += `- Recently Active (24h): ${dashboard.agents.recentlyActive.length}\n`;
    report += "\n### Capability Distribution\n";
    Object.entries(dashboard.agents.capabilityDistribution).forEach(
      ([cap, count]) => {
        report += `- ${cap}: ${count} agents\n`;
      },
    );

    // Message Analytics
    report += "\n## Message Analytics\n";
    report += `- Total Messages: ${dashboard.messages.totalMessages}\n`;
    report += `- Average Message Size: ${formatBytes(dashboard.messages.averageMessageSize)}\n`;
    report += `- Messages per Day: ${dashboard.messages.messagesPerDay.toFixed(1)}\n`;
    report += "\n### Message Status Distribution\n";
    Object.entries(dashboard.messages.messagesByStatus).forEach(
      ([status, count]) => {
        report += `- ${status}: ${count} messages\n`;
      },
    );

    // Channel Analytics
    report += "\n## Channel Analytics\n";
    report += `- Total Channels: ${dashboard.channels.totalChannels}\n`;
    report += `- Average Participants: ${dashboard.channels.averageParticipants.toFixed(1)}\n`;
    report += `- Total Value Locked: ${lamportsToSol(dashboard.channels.totalEscrowValue).toFixed(4)} SOL\n`;
    report += `- Average Channel Fee: ${lamportsToSol(dashboard.channels.averageChannelFee).toFixed(6)} SOL\n`;

    // Network Analytics
    report += "\n## Network Analytics\n";
    report += `- Network Health: ${dashboard.network.networkHealth}\n`;
    report += `- Active Agents (24h): ${dashboard.network.activeAgents24h}\n`;
    report += `- Message Volume (24h): ${dashboard.network.messageVolume24h}\n`;
    report += `- Total Value Locked: ${lamportsToSol(dashboard.network.totalValueLocked).toFixed(4)} SOL\n`;

    return report;
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private getDiscriminator(accountType: string): string {
    // Create 8-byte discriminator for account type
    const hash = Buffer.from(accountType).toString("hex");
    return hash.substring(0, 16); // First 8 bytes as hex
  }

  private convertMessageTypeFromProgram(programType: any): any {
    if (programType.text !== undefined) return "Text";
    if (programType.data !== undefined) return "Data"; 
    if (programType.command !== undefined) return "Command";
    if (programType.response !== undefined) return "Response";
    return "Text";
  }

  private convertMessageStatusFromProgram(programStatus: any): MessageStatus {
    if (programStatus.pending !== undefined) return MessageStatus.Pending;
    if (programStatus.delivered !== undefined) return MessageStatus.Delivered;
    if (programStatus.read !== undefined) return MessageStatus.Read;
    if (programStatus.failed !== undefined) return MessageStatus.Failed;
    return MessageStatus.Pending;
  }

  private convertChannelVisibilityFromProgram(
    programVisibility: any,
  ): ChannelVisibility {
    if (programVisibility.public !== undefined) return ChannelVisibility.Public;
    if (programVisibility.private !== undefined) return ChannelVisibility.Private;
    return ChannelVisibility.Public;
  }
}
