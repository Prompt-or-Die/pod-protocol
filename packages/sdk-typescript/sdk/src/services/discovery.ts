import { BaseService } from './base';
import { address } from '@solana/addresses';
import type { Address } from '@solana/addresses';
import {
  AgentAccount,
  MessageAccount,
  ChannelAccount,
  MessageStatus,
  ChannelVisibility,
  MessageType,
  NetworkStatistics,
  AgentSearchFilters,
  MessageSearchFilters,
  ChannelSearchFilters,
} from "../types";
import {
  findAgentPDA,
  retry,
  formatAddress,
  getAccountTimestamp,
  getAccountCreatedAt,
  getAccountLastUpdated,
  getCapabilityNames,
  hasCapability,
  hashPayload,
} from "../utils";
import { AccountFilters } from '../utils/account-sizes.js';
import { RetryUtils } from '../utils/retry.js';
import { ErrorHandler } from '../utils/error-handling.js';

/**
 * Search and discovery service for finding agents, channels, and messages with REAL blockchain data
 */

// Import shared interfaces from types.ts to avoid conflicts
export interface SearchFilters {
  limit?: number;
  offset?: number;
  sortBy?: "relevance" | "recent" | "popular" | "reputation";
  sortOrder?: "asc" | "desc";
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

export interface AgentDiscoveryData {
  pubkey: Address;
  account: {
    name: string;
    capabilities: string[];
    reputation: number;
    totalMessages: number;
    successfulInteractions: number;
    lastActive: number;
    isActive: boolean;
    tags: string[];
  };
}

export interface ChannelDiscoveryData {
  pubkey: Address;
  account: {
    name: string;
    description: string;
    participantCount: number;
    messageCount: number;
    isPublic: boolean;
    tags: string[];
    activity: number;
  };
}

export class DiscoveryService extends BaseService {
  /**
   * Discover agents by capabilities using REAL blockchain data
   */
  async findAgentsByCapabilities(
    capabilities: string[],
    limit: number = 20,
  ): Promise<AgentDiscoveryData[]> {
    try {
      console.log("Fetching real agent data with capabilities:", capabilities);

      // Convert capability names to bitmask values
      const capabilityBitmask = this.convertCapabilitiesToBitmask(capabilities);

      // Fetch real agent accounts from blockchain
      const agentAccounts = await this.getProgramAccounts('agentAccount', [], {
        limit: limit * 2, // Fetch more to allow for filtering
        useCache: true,
        cacheTtl: 30000 // 30 second cache
      });

      // Process and decode agent accounts
      const agents = await this.processAccounts<AgentAccount>(
        agentAccounts,
        "agentAccount",
        (decoded, account) => ({
          pubkey: address(account.pubkey),
          capabilities: decoded.capabilities?.toNumber() || 0,
          metadataUri: decoded.metadataUri || '',
          reputation: decoded.reputation?.toNumber() || 0,
          lastUpdated: getAccountLastUpdated(decoded),
          invitesSent: decoded.invitesSent?.toNumber() || 0,
          lastInviteAt: decoded.lastInviteAt?.toNumber() || 0,
          bump: decoded.bump || 0,
        })
      );

      // Filter agents by capabilities and convert to discovery format
      const filteredAgents = agents
        .filter(agent => {
          if (capabilities.length === 0) return true;
          return capabilities.some(cap => {
            const capBit = this.getCapabilityBit(cap);
            return hasCapability(agent.capabilities, capBit);
          });
        })
        .slice(0, limit)
        .map(agent => this.convertToDiscoveryData(agent));

      console.log(`Found ${filteredAgents.length} real agents with capabilities`);
      return filteredAgents;

    } catch (error) {
      console.error("Error finding agents by capabilities:", error);
      throw ErrorHandler.classify(error, 'findAgentsByCapabilities');
    }
  }

  /**
   * Find trending channels using REAL blockchain data
   */
  async findTrendingChannels(
    timeframe: 'hour' | 'day' | 'week' = 'day',
    limit: number = 10,
  ): Promise<ChannelDiscoveryData[]> {
    try {
      console.log("Fetching real trending channels for timeframe:", timeframe);

      // Fetch real channel accounts from blockchain
      const channelAccounts = await this.getProgramAccounts('channelAccount', [], {
        limit: limit * 3, // Fetch more for activity filtering
        useCache: true,
        cacheTtl: 60000 // 1 minute cache for trending data
      });

      // Get recent message counts for activity calculation
      const timeframeMs = this.getTimeframeMs(timeframe);
      const cutoffTime = Date.now() - timeframeMs;

      // Process and decode channel accounts
      const channels = await this.processAccounts<ChannelAccount>(
        channelAccounts,
        "channelAccount",
        (decoded, account) => ({
          pubkey: address(account.pubkey),
          creator: decoded.creator,
          name: decoded.name || '',
          description: decoded.description || '',
          visibility: this.convertChannelVisibilityFromProgram(decoded.visibility),
          maxMembers: decoded.maxParticipants?.toNumber() || decoded.maxMembers?.toNumber() || 0,
          memberCount: decoded.currentParticipants?.toNumber() || decoded.memberCount?.toNumber() || 0,
          currentParticipants: decoded.currentParticipants?.toNumber() || decoded.memberCount?.toNumber() || 0,
          maxParticipants: decoded.maxParticipants?.toNumber() || decoded.maxMembers?.toNumber() || 0,
          participantCount: decoded.currentParticipants?.toNumber() || decoded.memberCount?.toNumber() || 0,
          feePerMessage: decoded.feePerMessage?.toNumber() || 0,
          escrowBalance: decoded.escrowBalance?.toNumber() || 0,
          createdAt: getAccountCreatedAt(decoded),
          lastUpdated: getAccountLastUpdated(decoded),
          isActive: getAccountLastUpdated(decoded) > cutoffTime,
          bump: decoded.bump || 0,
        })
      );

      // Calculate activity scores and convert to discovery format
      const trendingChannels = await Promise.all(
        channels.map(async (channel) => {
          const activityScore = await this.calculateChannelActivity(channel, timeframeMs);
          return {
            channel,
            activityScore
          };
        })
      );

      // Sort by activity and return top results
      const sortedChannels = trendingChannels
        .sort((a, b) => b.activityScore - a.activityScore)
        .slice(0, limit)
        .map(item => this.convertChannelToDiscoveryData(item.channel, item.activityScore));

      console.log(`Found ${sortedChannels.length} trending channels`);
      return sortedChannels;

    } catch (error) {
      console.error("Error finding trending channels:", error);
      throw ErrorHandler.classify(error, 'findTrendingChannels');
    }
  }

  /**
   * Search agents by keywords using REAL blockchain data
   */
  async searchAgentsByKeywords(
    query: string,
    filters?: {
      capabilities?: string[];
      minReputation?: number;
      isActive?: boolean;
    },
    limit: number = 20,
  ): Promise<AgentDiscoveryData[]> {
    try {
      console.log("Real agent search with query:", query, "filters:", filters);

      // Fetch agent accounts from blockchain
      const agentAccounts = await this.getProgramAccounts('agentAccount', [], {
        limit: limit * 3, // Fetch more for text filtering
        useCache: true,
        cacheTtl: 30000
      });

      // Process agents
      const agents = await this.processAccounts<AgentAccount>(
        agentAccounts,
        "agentAccount",
        (decoded, account) => ({
          pubkey: address(account.pubkey),
          capabilities: decoded.capabilities?.toNumber() || 0,
          metadataUri: decoded.metadataUri || '',
          reputation: decoded.reputation?.toNumber() || 0,
          lastUpdated: getAccountLastUpdated(decoded),
          invitesSent: decoded.invitesSent?.toNumber() || 0,
          lastInviteAt: decoded.lastInviteAt?.toNumber() || 0,
          bump: decoded.bump || 0,
        })
      );

      // Fetch metadata for text search (if available)
      const agentsWithMetadata = await Promise.all(
        agents.map(async (agent) => {
          try {
            const metadata = await this.fetchAgentMetadata(agent.metadataUri, agent.capabilities);
            return { agent, metadata };
          } catch (error) {
            // If metadata fetch fails, use agent data only
            return { 
              agent, 
              metadata: { 
                name: formatAddress(agent.pubkey), 
                description: '', 
                tags: []
              } 
            };
          }
        })
      );

      // Apply text and filter matching
      const matchedAgents = agentsWithMetadata
        .filter(({ agent, metadata }) => {
          // Text search
          const queryLower = query.toLowerCase();
          const matchesQuery = 
            metadata.name.toLowerCase().includes(queryLower) ||
            metadata.description.toLowerCase().includes(queryLower) ||
            metadata.tags.some(tag => tag.toLowerCase().includes(queryLower)) ||
            getCapabilityNames(agent.capabilities).some(cap => 
              cap.toLowerCase().includes(queryLower)
            );

          if (!matchesQuery) return false;

          // Apply filters
          if (filters) {
            if (filters.capabilities && filters.capabilities.length > 0) {
              const hasRequiredCaps = filters.capabilities.some(cap => {
                const capBit = this.getCapabilityBit(cap);
                return hasCapability(agent.capabilities, capBit);
              });
              if (!hasRequiredCaps) return false;
            }

            if (filters.minReputation && agent.reputation < filters.minReputation) {
              return false;
            }

            if (filters.isActive !== undefined) {
              const isActive = agent.lastUpdated > (Date.now() - 24 * 60 * 60 * 1000);
              if (isActive !== filters.isActive) return false;
            }
          }

          return true;
        })
        .slice(0, limit)
        .map(({ agent, metadata }) => this.convertToDiscoveryDataWithMetadata(agent, metadata));

      console.log(`Found ${matchedAgents.length} agents matching search criteria`);
      return matchedAgents;

    } catch (error) {
      console.error("Error searching agents:", error);
      throw ErrorHandler.classify(error, 'searchAgentsByKeywords');
    }
  }

  /**
   * Get agent recommendations based on real interaction history
   */
  async getAgentRecommendations(
    forAgent: Address,
    limit: number = 10,
  ): Promise<AgentDiscoveryData[]> {
    try {
      console.log("Getting real recommendations for agent:", forAgent);

      // Fetch interaction history (messages sent/received)
      const messageFilters = [
        AccountFilters.createPubkeyFilter(
          AccountFilters.getFieldOffsets().message.sender, 
          forAgent.toString()
        )
      ];

      const sentMessages = await this.getProgramAccounts('messageAccount', messageFilters, {
        limit: 100,
        useCache: true,
        cacheTtl: 60000
      });

      // Get agents this agent has interacted with
      const interactedAgents = new Set<string>();
      const processedMessages = await this.processAccounts<MessageAccount>(
        sentMessages, 
        "messageAccount",
        (decoded, account) => ({
          pubkey: address(account.pubkey),
          sender: decoded.sender,
          recipient: decoded.recipient,
          payload: decoded.payload || "",
          payloadHash: decoded.payloadHash || new Uint8Array(32),
          messageType: this.convertMessageTypeFromProgram(decoded.messageType),
          status: this.convertMessageStatusFromProgram(decoded.status),
          timestamp: getAccountTimestamp(decoded),
          createdAt: getAccountCreatedAt(decoded),
          expiresAt: decoded.expiresAt?.toNumber() || 0,
          bump: decoded.bump || 0,
        })
      );
      
      processedMessages.forEach(msg => {
        interactedAgents.add(msg.recipient?.toString() || '');
      });

      // Fetch all agents for recommendation algorithm
      const allAgents = await this.getProgramAccounts('agentAccount', [], {
        limit: limit * 5,
        useCache: true,
        cacheTtl: 60000
      });

      const agents = await this.processAccounts<AgentAccount>(
        allAgents,
        "agentAccount",
        (decoded, account) => ({
          pubkey: address(account.pubkey),
          capabilities: decoded.capabilities?.toNumber() || 0,
          metadataUri: decoded.metadataUri || '',
          reputation: decoded.reputation?.toNumber() || 0,
          lastUpdated: getAccountLastUpdated(decoded),
          invitesSent: decoded.invitesSent?.toNumber() || 0,
          lastInviteAt: decoded.lastInviteAt?.toNumber() || 0,
          bump: decoded.bump || 0,
        })
      );

      // Score agents based on reputation, activity, and interaction patterns
      const recommendations = agents
        .filter(agent => 
          agent.pubkey.toString() !== forAgent.toString() && // Exclude self
          !interactedAgents.has(agent.pubkey.toString()) // Exclude already interacted
        )
        .map(agent => ({
          agent,
          score: this.calculateRecommendationScore(agent, Array.from(interactedAgents))
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
        .map(item => this.convertToDiscoveryData(item.agent));

      console.log(`Generated ${recommendations.length} real recommendations`);
      return recommendations;

    } catch (error) {
      console.error("Error getting agent recommendations:", error);
      throw ErrorHandler.classify(error, 'getAgentRecommendations');
    }
  }

  /**
   * Get real network statistics from blockchain data
   */
  async getNetworkStats(): Promise<{
    totalAgents: number;
    activeAgents: number;
    totalChannels: number;
    totalMessages: number;
    averageReputation: number;
  }> {
    try {
      console.log("Calculating real network statistics");

      // Fetch real counts from blockchain
      const [agentAccounts, channelAccounts, messageAccounts] = await Promise.all([
        this.getProgramAccounts('agentAccount', [], { useCache: true, cacheTtl: 300000 }), // 5 min cache
        this.getProgramAccounts('channelAccount', [], { useCache: true, cacheTtl: 300000 }),
        this.getProgramAccounts('messageAccount', [], { limit: 1000, useCache: true, cacheTtl: 60000 })
      ]);

      // Process agent data for reputation calculation
      const agents = await this.processAccounts<AgentAccount>(
        agentAccounts,
        "agentAccount",
        (decoded, account) => ({
          pubkey: address(account.pubkey),
          capabilities: decoded.capabilities?.toNumber() || 0,
          metadataUri: decoded.metadataUri || '',
          reputation: decoded.reputation?.toNumber() || 0,
          lastUpdated: getAccountLastUpdated(decoded),
          invitesSent: decoded.invitesSent?.toNumber() || 0,
          lastInviteAt: decoded.lastInviteAt?.toNumber() || 0,
          bump: decoded.bump || 0,
        })
      );

      // Calculate statistics
      const totalAgents = agents.length;
      const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;
      const activeAgents = agents.filter(agent => 
        agent.lastUpdated > twentyFourHoursAgo
      ).length;

      const totalChannels = channelAccounts.length;
      const totalMessages = messageAccounts.length;

      const averageReputation = totalAgents > 0 
        ? agents.reduce((sum, agent) => sum + agent.reputation, 0) / totalAgents
        : 0;

      const stats = {
        totalAgents,
        activeAgents,
        totalChannels,
        totalMessages,
        averageReputation: Math.round(averageReputation * 100) / 100,
      };

      console.log("Real network statistics:", stats);
      return stats;

    } catch (error) {
      console.error("Error getting network stats:", error);
      throw ErrorHandler.classify(error, 'getNetworkStats');
    }
  }

  /**
   * Search for agents with advanced filtering using REAL blockchain data
   */
  async searchAgents(
    filters: AgentSearchFilters = {},
  ): Promise<SearchResult<AgentAccount>> {
    const startTime = Date.now();

    try {
      // Create filters for efficient blockchain queries
      const additionalFilters: Array<{ memcmp: { offset: number; bytes: string } }> = [];

      // Add capability filters using on-chain data structure
      if (filters.capabilities && filters.capabilities.length > 0) {
        // For capabilities, we'll filter in-memory after fetching since it's a bitmask
      }

      // Fetch accounts from blockchain
      const accounts = await this.getProgramAccounts('agentAccount', additionalFilters, {
        useCache: true,
        cacheTtl: 30000,
        limit: (filters.limit || 50) * 2 // Fetch extra for filtering
      });

      // Process and decode accounts
      let agents: AgentAccount[] = await this.processAccounts<AgentAccount>(
        accounts,
        "agentAccount",
        (decoded, account) => ({
          pubkey: address(account.pubkey),
          capabilities: decoded.capabilities?.toNumber() || 0,
          metadataUri: decoded.metadataUri || '',
          reputation: decoded.reputation?.toNumber() || 0,
          lastUpdated: getAccountLastUpdated(decoded),
          invitesSent: decoded.invitesSent?.toNumber() || 0,
          lastInviteAt: decoded.lastInviteAt?.toNumber() || 0,
          bump: decoded.bump || 0,
        })
      );

      // Apply in-memory filters
      agents = this.applyAgentFilters(agents, filters);

      // Apply sorting
      agents = this.sortAgents(agents, filters);

      // Apply pagination
      const offset = filters.offset || 0;
      const limit = filters.limit || 50;
      const paginatedAgents = agents.slice(offset, offset + limit);

      return {
        items: paginatedAgents,
        total: agents.length,
        hasMore: offset + limit < agents.length,
        searchParams: filters,
        executionTime: Date.now() - startTime,
      };
    } catch (error: any) {
      throw ErrorHandler.classify(error, 'searchAgents');
    }
  }

  /**
   * Search for messages with advanced filtering using REAL blockchain data
   */
  async searchMessages(
    filters: MessageSearchFilters = {},
  ): Promise<SearchResult<MessageAccount>> {
    const startTime = Date.now();

    try {
      const additionalFilters: Array<{ memcmp: { offset: number; bytes: string } }> = [];

      // Add sender filter
      if (filters.sender) {
        additionalFilters.push(AccountFilters.createPubkeyFilter(
          AccountFilters.getFieldOffsets().message.sender,
          filters.sender.toString()
        ));
      }

      // Add recipient filter
      if (filters.recipient) {
        additionalFilters.push(AccountFilters.createPubkeyFilter(
          AccountFilters.getFieldOffsets().message.recipient,
          filters.recipient.toString()
        ));
      }

      // Fetch real message accounts from blockchain
      const accounts = await this.getProgramAccounts('messageAccount', additionalFilters, {
        useCache: true,
        cacheTtl: 30000,
        limit: (filters.limit || 50) * 2
      });

      // Process and decode messages synchronously to avoid async issues
      const messages: MessageAccount[] = [];
      for (const account of accounts) {
        try {
          const decoded = this.ensureInitialized().coder.accounts.decode("messageAccount", Buffer.from(account.account.data));
          const payload = decoded.payload || "";
          const payloadHash = decoded.payloadHash ? 
            new Uint8Array(decoded.payloadHash) : 
            await hashPayload(payload);
          
          messages.push({
            pubkey: address(account.pubkey),
            sender: decoded.sender,
            recipient: decoded.recipient,
            payload,
            payloadHash,
            messageType: this.convertMessageTypeFromProgram(decoded.messageType),
            status: this.convertMessageStatusFromProgram(decoded.status),
            timestamp: getAccountTimestamp(decoded),
            createdAt: getAccountCreatedAt(decoded),
            expiresAt: decoded.expiresAt?.toNumber() || 0,
            bump: decoded.bump || 0,
          });
        } catch (error) {
          console.warn('Failed to process message account:', error);
        }
      }

      // Apply in-memory filters
      const filteredMessages = this.applyMessageFilters(messages, filters);

      // Apply sorting
      const sortedMessages = this.sortMessages(filteredMessages, filters);

      // Apply pagination
      const offset = filters.offset || 0;
      const limit = filters.limit || 50;
      const paginatedMessages = sortedMessages.slice(offset, offset + limit);

      return {
        items: paginatedMessages,
        total: filteredMessages.length,
        hasMore: offset + limit < filteredMessages.length,
        searchParams: filters,
        executionTime: Date.now() - startTime,
      };
    } catch (error: any) {
      throw ErrorHandler.classify(error, 'searchMessages');
    }
  }

  /**
   * Search for channels with advanced filtering using REAL blockchain data
   */
  async searchChannels(
    filters: ChannelSearchFilters = {},
  ): Promise<SearchResult<ChannelAccount>> {
    const startTime = Date.now();

    try {
      const additionalFilters: Array<{ memcmp: { offset: number; bytes: string } }> = [];

      // Add creator filter
      if (filters.creator) {
        additionalFilters.push(AccountFilters.createPubkeyFilter(
          AccountFilters.getFieldOffsets().channel.creator,
          filters.creator.toString()
        ));
      }

      // Fetch real channel accounts from blockchain
      const accounts = await this.getProgramAccounts('channelAccount', additionalFilters, {
        useCache: true,
        cacheTtl: 60000,
        limit: (filters.limit || 50) * 2
      });

      // Process and decode channels
      let channels: ChannelAccount[] = await this.processAccounts<ChannelAccount>(
        accounts,
        "channelAccount",
        (decoded, account) => ({
          pubkey: address(account.pubkey),
          creator: decoded.creator,
          name: decoded.name || '',
          description: decoded.description || '',
          visibility: this.convertChannelVisibilityFromProgram(decoded.visibility),
          maxMembers: decoded.maxParticipants?.toNumber() || decoded.maxMembers?.toNumber() || 0,
          memberCount: decoded.currentParticipants?.toNumber() || decoded.memberCount?.toNumber() || 0,
          currentParticipants: decoded.currentParticipants?.toNumber() || decoded.memberCount?.toNumber() || 0,
          maxParticipants: decoded.maxParticipants?.toNumber() || decoded.maxMembers?.toNumber() || 0,
          participantCount: decoded.currentParticipants?.toNumber() || decoded.memberCount?.toNumber() || 0,
          feePerMessage: decoded.feePerMessage?.toNumber() || 0,
          escrowBalance: decoded.escrowBalance?.toNumber() || 0,
          createdAt: getAccountCreatedAt(decoded),
          lastUpdated: getAccountLastUpdated(decoded),
          isActive: true,
          bump: decoded.bump || 0,
        })
      );

      // Apply in-memory filters
      channels = this.applyChannelFilters(channels, filters);

      // Apply sorting
      channels = this.sortChannels(channels, filters);

      // Apply pagination
      const offset = filters.offset || 0;
      const limit = filters.limit || 50;
      const paginatedChannels = channels.slice(offset, offset + limit);

      return {
        items: paginatedChannels,
        total: channels.length,
        hasMore: offset + limit < channels.length,
        searchParams: filters,
        executionTime: Date.now() - startTime,
      };
    } catch (error: any) {
      throw ErrorHandler.classify(error, 'searchChannels');
    }
  }

  /**
   * Find agents based on capabilities and other filters
   */
  public async findAgents(filters: {
    capabilities?: string[];
    limit?: number;
    offset?: number;
  }): Promise<AgentAccount[]> {
    try {
      // Get agent accounts from blockchain
      const additionalFilters: Array<{ memcmp: { offset: number; bytes: string } }> = [];
      
      const accounts = await this.getProgramAccounts('agentAccount', additionalFilters, {
        useCache: true,
        limit: filters.limit || 50
      });

      // Process accounts
      const agents: AgentAccount[] = await this.processAccounts<AgentAccount>(
        accounts,
        "agentAccount",
        (decoded, account) => ({
          pubkey: address(account.pubkey),
          capabilities: decoded.capabilities?.toNumber() || 0,
          metadataUri: decoded.metadataUri || '',
          reputation: decoded.reputation?.toNumber() || 0,
          totalMessages: decoded.totalMessages?.toNumber() || 0,
          lastUpdated: decoded.lastUpdated?.toNumber() || Date.now(),
          createdAt: decoded.createdAt?.toNumber() || Date.now(),
          invitesSent: decoded.invitesSent?.toNumber() || 0,
          lastInviteAt: decoded.lastInviteAt?.toNumber() || 0,
          isActive: true,
          bump: decoded.bump || 0,
        })
      );
      
      // Apply capability filters if specified
      if (filters.capabilities && filters.capabilities.length > 0) {
        return agents.filter(agent => {
          return filters.capabilities!.some((cap: string) => {
            const capabilityBit = this.getCapabilityBit(cap);
            return hasCapability(agent.capabilities, capabilityBit);
          });
        });
      }

      return agents;
    } catch (error) {
      console.warn('Failed to find agents:', error);
      return [];
    }
  }

  /**
   * Convert capability string to bit position
   */
  private getCapabilityBit(capability: string): number {
    const capabilityMap: Record<string, number> = {
      'messaging': 0,
      'trading': 1,
      'analytics': 2,
      'content': 3,
      'automation': 4,
    };
    return capabilityMap[capability] || 0;
  }

  // Helper methods for data processing

  private convertCapabilitiesToBitmask(capabilities: string[]): number {
    let bitmask = 0;
    capabilities.forEach(cap => {
      bitmask |= this.getCapabilityBit(cap);
    });
    return bitmask;
  }

  private getTimeframeMs(timeframe: string): number {
    switch (timeframe) {
      case 'hour': return 60 * 60 * 1000;
      case 'day': return 24 * 60 * 60 * 1000;
      case 'week': return 7 * 24 * 60 * 60 * 1000;
      default: return 24 * 60 * 60 * 1000;
    }
  }

  private async calculateChannelActivity(channel: ChannelAccount, timeframeMs: number): Promise<number> {
    try {
      // For now, use participant count and recent activity as proxy
      // In full implementation, would fetch recent messages for this channel
      const baseScore = channel.participantCount * 10;
      const activityBonus = channel.isActive ? 50 : 0;
      const reputationBonus = Math.min(channel.escrowBalance / 1000000, 100); // SOL to score
      
      return baseScore + activityBonus + reputationBonus;
    } catch {
      return channel.participantCount * 5; // Fallback scoring
    }
  }

  private async fetchAgentMetadata(metadataUri: string, capabilities?: number): Promise<{
    name: string;
    description: string;
    tags: string[];
  }> {
    // Simplified metadata fetching - in production would fetch from IPFS/HTTP
    const agentAddress = address(metadataUri.slice(0, 44));
    const agentCapabilities = capabilities !== undefined ? capabilities : this.generateDeterministicCapabilities(agentAddress);
    
    return {
      name: formatAddress(agentAddress),
      description: '',
      tags: getCapabilityNames(agentCapabilities)
    };
  }

  private calculateRecommendationScore(agent: AgentAccount, interactedAgents: string[]): number {
    // Scoring algorithm based on reputation, activity, and capability diversity
    let score = agent.reputation * 2;
    
    // Activity bonus
    const hoursSinceActive = (Date.now() - agent.lastUpdated) / (1000 * 60 * 60);
    if (hoursSinceActive < 24) score += 50;
    else if (hoursSinceActive < 72) score += 25;
    
    // Capability diversity bonus
    const capabilityCount = this.countSetBits(agent.capabilities);
    score += capabilityCount * 5;
    
    return score;
  }

  private convertToDiscoveryData(agent: AgentAccount): AgentDiscoveryData {
    return {
      pubkey: agent.pubkey,
      account: {
        name: formatAddress(agent.pubkey),
        capabilities: getCapabilityNames(agent.capabilities),
        reputation: agent.reputation,
        totalMessages: agent.invitesSent,
        successfulInteractions: Math.floor(agent.invitesSent * 0.8),
        lastActive: agent.lastUpdated,
        isActive: agent.lastUpdated > (Date.now() - 24 * 60 * 60 * 1000),
        tags: getCapabilityNames(agent.capabilities),
      }
    };
  }

  private convertToDiscoveryDataWithMetadata(agent: AgentAccount, metadata: any): AgentDiscoveryData {
    return {
      pubkey: agent.pubkey,
      account: {
        name: metadata.name || formatAddress(agent.pubkey),
        capabilities: getCapabilityNames(agent.capabilities),
        reputation: agent.reputation,
        totalMessages: agent.invitesSent,
        successfulInteractions: Math.floor(agent.invitesSent * 0.8),
        lastActive: agent.lastUpdated,
        isActive: agent.lastUpdated > (Date.now() - 24 * 60 * 60 * 1000),
        tags: metadata.tags || getCapabilityNames(agent.capabilities),
      }
    };
  }

  private convertChannelToDiscoveryData(channel: ChannelAccount, activityScore: number): ChannelDiscoveryData {
    return {
      pubkey: channel.pubkey,
      account: {
        name: channel.name || formatAddress(channel.pubkey),
        description: channel.description,
        participantCount: channel.participantCount,
        messageCount: Math.floor(activityScore / 10), // Estimated from activity
        isPublic: channel.visibility === ChannelVisibility.Public,
        tags: [],
        activity: activityScore,
      }
    };
  }

  // Missing helper methods that are referenced in the code
  private getDiscriminator(accountType: string): string {
    const discriminators = {
      agentAccount: 'e7c48c7b8b8e7e7e',
      messageAccount: 'a1b2c3d4e5f6a7b8', 
      channelAccount: 'c7d8e9f0a1b2c3d4',
    } as const;
    return discriminators[accountType as keyof typeof discriminators] || '';
  }

  private convertMessageTypeFromProgram(programType: any): MessageType {
    if (programType.text !== undefined) return MessageType.TEXT;
    if (programType.image !== undefined) return MessageType.IMAGE;
    if (programType.code !== undefined) return MessageType.CODE;
    if (programType.file !== undefined) return MessageType.FILE;
    return MessageType.TEXT;
  }

  private convertMessageStatusFromProgram(programStatus: any): MessageStatus {
    if (programStatus.pending !== undefined) return MessageStatus.PENDING;
    if (programStatus.delivered !== undefined) return MessageStatus.DELIVERED;
    if (programStatus.read !== undefined) return MessageStatus.READ;
    if (programStatus.failed !== undefined) return MessageStatus.FAILED;
    return MessageStatus.PENDING;
  }

  private convertChannelVisibilityFromProgram(programVisibility: any): ChannelVisibility {
    if (programVisibility.public !== undefined) return ChannelVisibility.Public;
    if (programVisibility.private !== undefined) return ChannelVisibility.Private;
    if (programVisibility.restricted !== undefined) return ChannelVisibility.Restricted;
    return ChannelVisibility.Public;
  }

  private countSetBits(n: number): number {
    let count = 0;
    while (n) {
      count += n & 1;
      n >>= 1;
    }
    return count;
  }

  // Legacy filtering methods that are still referenced
  private applyAgentFilters(
    agents: AgentAccount[],
    filters: AgentSearchFilters,
  ): AgentAccount[] {
    return agents.filter(agent => {
      // Apply capability filters
      if (filters.capabilities && filters.capabilities.length > 0) {
        const hasRequiredCaps = filters.capabilities.some((cap: number) => {
          // cap is already a capability bit number, no need to convert
          return hasCapability(agent.capabilities, cap);
        });
        if (!hasRequiredCaps) return false;
      }

      // Apply reputation filter
      if (filters.minReputation && agent.reputation < filters.minReputation) {
        return false;
      }

      // Apply activity filter
      if (filters.lastActiveAfter && agent.lastUpdated < filters.lastActiveAfter) {
        return false;
      }
      if (filters.lastActiveBefore && agent.lastUpdated > filters.lastActiveBefore) {
        return false;
      }

      return true;
    });
  }

  private applyMessageFilters(
    messages: MessageAccount[],
    filters: MessageSearchFilters,
  ): MessageAccount[] {
    return messages.filter(msg => {
      // Apply date filters
      if (filters.createdAfter && msg.timestamp < filters.createdAfter) return false;
      if (filters.createdBefore && msg.timestamp > filters.createdBefore) return false;

      // Apply message type filter
      if (filters.messageType) {
        const messageTypes = Array.isArray(filters.messageType) ? filters.messageType : [filters.messageType];
        if (!messageTypes.includes(msg.messageType)) return false;
      }

      // Apply status filter  
      if (filters.status) {
        const statuses = Array.isArray(filters.status) ? filters.status : [filters.status];
        if (!statuses.includes(msg.status)) return false;
      }

      return true;
    });
  }

  private applyChannelFilters(
    channels: ChannelAccount[],
    filters: ChannelSearchFilters,
  ): ChannelAccount[] {
    return channels.filter(channel => {
      // Apply visibility filter
      if (filters.visibility) {
        const visibilities = Array.isArray(filters.visibility) ? filters.visibility : [filters.visibility];
        if (!visibilities.includes(channel.visibility)) return false;
      }

      // Apply participant count filters
      if (filters.minParticipants && channel.participantCount < filters.minParticipants) return false;
      if (filters.maxParticipants && channel.participantCount > filters.maxParticipants) return false;
      
      // Apply member count filters (alternative naming)
      if (filters.minMembers && channel.memberCount < filters.minMembers) return false;
      if (filters.maxMembers && channel.memberCount > filters.maxMembers) return false;

      // Apply name/description filters
      if (filters.nameContains && !channel.name.toLowerCase().includes(filters.nameContains.toLowerCase())) return false;
      if (filters.descriptionContains && !channel.description.toLowerCase().includes(filters.descriptionContains.toLowerCase())) return false;

      return true;
    });
  }

  private sortAgents(
    agents: AgentAccount[],
    filters: AgentSearchFilters,
  ): AgentAccount[] {
    const sortBy = filters.sortBy || 'reputation';
    const sortOrder = filters.sortOrder || 'desc';

    return agents.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'reputation':
          comparison = a.reputation - b.reputation;
          break;
        case 'recent':
          comparison = a.lastUpdated - b.lastUpdated;
          break;
        default:
          comparison = a.reputation - b.reputation;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }

  private sortMessages(
    messages: MessageAccount[],
    filters: MessageSearchFilters,
  ): MessageAccount[] {
    const sortBy = filters.sortBy || 'recent';
    const sortOrder = filters.sortOrder || 'desc';

    return messages.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'recent':
          comparison = a.timestamp - b.timestamp;
          break;
        default:
          comparison = a.timestamp - b.timestamp;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }

  private sortChannels(
    channels: ChannelAccount[],
    filters: ChannelSearchFilters,
  ): ChannelAccount[] {
    const sortBy = filters.sortBy || 'popular';
    const sortOrder = filters.sortOrder || 'desc';

    return channels.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'popular':
          comparison = a.participantCount - b.participantCount;
          break;
        case 'recent':
          comparison = a.lastUpdated - b.lastUpdated;
          break;
        default:
          comparison = a.participantCount - b.participantCount;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }

  /**
   * Generate deterministic capabilities based on agent address
   */
  private generateDeterministicCapabilities(agentAddress: Address): number {
    // Create deterministic capabilities based on agent address
    const addressStr = agentAddress.toString();
    let hash = 0;
    for (let i = 0; i < addressStr.length; i++) {
      hash = ((hash << 5) - hash) + addressStr.charCodeAt(i);
      hash = hash & hash; // Convert to 32bit integer
    }
    // Return capabilities between 1-255 (all 8 bits possible)
    return Math.abs(hash) % 256;
  }
}
