import { Address } from '@solana/addresses';
import { BaseService } from "./base";
import { AgentAccount, MessageAccount, ChannelAccount, MessageStatus, ChannelVisibility, MessageType } from "../types";
/**
 * Search and discovery service for finding agents, channels, and messages
 */
export interface SearchFilters {
    limit?: number;
    offset?: number;
    sortBy?: "relevance" | "recent" | "popular" | "reputation";
    sortOrder?: "asc" | "desc";
}
export interface AgentSearchFilters extends SearchFilters {
    capabilities?: number[];
    minReputation?: number;
    maxReputation?: number;
    metadataContains?: string;
    lastActiveAfter?: number;
    lastActiveBefore?: number;
}
export interface MessageSearchFilters extends SearchFilters {
    sender?: Address;
    recipient?: Address;
    status?: MessageStatus[];
    messageType?: MessageType[];
    createdAfter?: number;
    createdBefore?: number;
    payloadContains?: string;
}
export interface ChannelSearchFilters extends SearchFilters {
    creator?: Address;
    visibility?: ChannelVisibility[];
    nameContains?: string;
    descriptionContains?: string;
    minParticipants?: number;
    maxParticipants?: number;
    maxFeePerMessage?: number;
    hasEscrow?: boolean;
    createdAfter?: number;
    createdBefore?: number;
}
export interface SearchResult<T> {
    items: T[];
    total: number;
    hasMore: boolean;
    searchParams: any;
    executionTime: number;
}
export interface RecommendationOptions {
    forAgent?: Address;
    limit?: number;
    includeReason?: boolean;
}
export interface Recommendation<T> {
    item: T;
    score: number;
    reason?: string;
}
export declare class DiscoveryService extends BaseService {
    /**
     * Search for agents with advanced filtering
     */
    searchAgents(filters?: AgentSearchFilters): Promise<SearchResult<AgentAccount>>;
    /**
     * Search for messages with advanced filtering
     */
    searchMessages(filters?: MessageSearchFilters): Promise<SearchResult<MessageAccount>>;
    /**
     * Search for channels with advanced filtering
     */
    searchChannels(filters?: ChannelSearchFilters): Promise<SearchResult<ChannelAccount>>;
    /**
     * Get recommended agents based on similarity and activity
     */
    getRecommendedAgents(options?: RecommendationOptions): Promise<Recommendation<AgentAccount>[]>;
    /**
     * Get recommended channels for an agent
     */
    getRecommendedChannels(options?: RecommendationOptions): Promise<Recommendation<ChannelAccount>[]>;
    /**
     * Find similar agents based on capabilities
     */
    findSimilarAgents(targetAgent: AgentAccount, limit?: number): Promise<AgentAccount[]>;
    /**
     * Get trending channels based on recent activity
     */
    getTrendingChannels(limit?: number): Promise<ChannelAccount[]>;
    /**
     * Search for agents by capabilities
     */
    searchAgentsByCapabilities(capabilities: number, limit?: number): Promise<any[]>;
    /**
     * Search for agents by metadata
     */
    searchAgentsByMetadata(query: string, limit?: number): Promise<any[]>;
    /**
     * Get recommended agents for a user
     */
    getRecommendedAgentsForUser(user: Address, limit?: number): Promise<any[]>;
    /**
     * Search for public channels
     */
    searchPublicChannels(query?: string, limit?: number): Promise<any[]>;
    /**
     * Get channels by category/tags
     */
    getChannelsByCategory(category: string, limit?: number): Promise<any[]>;
    private applyAgentFilters;
    private applyMessageFilters;
    private applyChannelFilters;
    private sortAgents;
    private sortMessages;
    private sortChannels;
    private calculateCapabilitySimilarity;
    private countSetBits;
    private getDiscriminator;
    private convertMessageTypeFromProgram;
    private convertMessageStatusFromProgram;
    private convertChannelVisibilityFromProgram;
}
//# sourceMappingURL=discovery.d.ts.map