import { Address } from '@solana/addresses';
import { BaseService } from "./base";
import { AgentAccount, MessageAccount, ChannelAccount, MessageStatus, ChannelVisibility } from "../types";
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
    topSenders: Array<{
        agent: Address;
        messageCount: number;
    }>;
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
export declare class AnalyticsService extends BaseService {
    /**
     * Get comprehensive analytics dashboard
     */
    getDashboard(): Promise<DashboardData>;
    /**
     * Get agent ecosystem analytics
     */
    getAgentAnalytics(limit?: number): Promise<AgentAnalytics>;
    /**
     * Get message analytics and patterns
     */
    getMessageAnalytics(limit?: number): Promise<MessageAnalytics>;
    /**
     * Get channel usage analytics
     */
    getChannelAnalytics(limit?: number): Promise<ChannelAnalytics>;
    /**
     * Get network-wide analytics
     */
    getNetworkAnalytics(): Promise<NetworkAnalytics>;
    /**
     * Generate analytics report
     */
    generateReport(): Promise<string>;
    /**
     * Track a user action
     */
    trackAction(user: Address, action: string, metadata?: any): Promise<void>;
    /**
     * Get usage statistics for a user
     */
    getUserStats(user: Address): Promise<any>;
    /**
     * Get global protocol statistics
     */
    getGlobalStats(): Promise<any>;
    /**
     * Track message delivery
     */
    trackMessageDelivery(sender: Address, recipient: Address, messageType: string): Promise<void>;
    /**
     * Get delivery statistics
     */
    getDeliveryStats(user?: Address): Promise<any>;
    private getDiscriminator;
    private convertMessageTypeFromProgram;
    private convertMessageStatusFromProgram;
    private convertChannelVisibilityFromProgram;
}
//# sourceMappingURL=analytics.d.ts.map