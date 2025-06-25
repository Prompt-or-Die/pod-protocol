import { Address, KeyPairSigner, address } from "@solana/web3.js";
import { BaseService } from "./base.js";
import {
  AgentAccount,
  MessageAccount,
  ChannelAccount,
  MessageStatus,
  ChannelVisibility,
  MessageType,
} from "../types";
import {
  hasCapability,
  getCapabilityNames,
  formatPublicKey,
  isValidPublicKey,
  getAccountTimestamp,
  getAccountCreatedAt,
  getAccountLastUpdated,
} from "../utils";

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

// Mock filter type for Web3.js v2 compatibility
export interface ProgramAccountsFilter {
  memcmp?: {
    offset: number;
    bytes: string;
  };
  dataSize?: number;
}

export class DiscoveryService extends BaseService {
  /**
   * Discover agents by capabilities
   */
  async findAgentsByCapabilities(
    capabilities: string[],
    limit: number = 20,
  ): Promise<AgentDiscoveryData[]> {
    try {
      // TODO: Implement actual program account fetching with Web3.js v2
      console.log("Finding agents with capabilities:", capabilities);

      // Mock implementation for now
      const mockAgents: AgentDiscoveryData[] = [
        {
          pubkey: address("11111111111111111111111111111112"),
          account: {
            name: "TradingBot",
            capabilities: ["trading", "analysis"],
            reputation: 85,
            totalMessages: 150,
            successfulInteractions: 128,
            lastActive: Date.now() - 300000,
            isActive: true,
            tags: ["trading", "defi"],
          }
        },
        {
          pubkey: address("11111111111111111111111111111113"),
          account: {
            name: "AnalysisAgent",
            capabilities: ["analysis", "research"],
            reputation: 92,
            totalMessages: 200,
            successfulInteractions: 185,
            lastActive: Date.now() - 600000,
            isActive: true,
            tags: ["analysis", "research"],
          }
        }
      ];

      return mockAgents
        .filter(agent => 
          capabilities.some(cap => agent.account.capabilities.includes(cap))
        )
        .slice(0, limit);

    } catch (error) {
      console.error("Error finding agents by capabilities:", error);
      return [];
    }
  }

  /**
   * Find trending channels
   */
  async findTrendingChannels(
    timeframe: 'hour' | 'day' | 'week' = 'day',
    limit: number = 10,
  ): Promise<ChannelDiscoveryData[]> {
    try {
      // TODO: Implement actual program account fetching with Web3.js v2
      console.log("Finding trending channels for timeframe:", timeframe);

      // Mock implementation for now
      const mockChannels: ChannelDiscoveryData[] = [
        {
          pubkey: address("11111111111111111111111111111114"),
          account: {
            name: "DeFi Discussion",
            description: "Latest DeFi trends and strategies",
            participantCount: 45,
            messageCount: 1250,
            isPublic: true,
            tags: ["defi", "trading"],
            activity: 85,
          }
        },
        {
          pubkey: address("11111111111111111111111111111115"),
          account: {
            name: "AI Agents Hub",
            description: "AI agent coordination and strategies",
            participantCount: 32,
            messageCount: 890,
            isPublic: true,
            tags: ["ai", "agents"],
            activity: 72,
          }
        }
      ];

      return mockChannels
        .sort((a, b) => b.account.activity - a.account.activity)
        .slice(0, limit);

    } catch (error) {
      console.error("Error finding trending channels:", error);
      return [];
    }
  }

  /**
   * Search agents by keywords
   */
  async searchAgents(
    query: string,
    filters?: {
      capabilities?: string[];
      minReputation?: number;
      isActive?: boolean;
    },
    limit: number = 20,
  ): Promise<AgentDiscoveryData[]> {
    try {
      // TODO: Implement actual search with Web3.js v2
      console.log("Searching agents with query:", query, "filters:", filters);

      // Mock search implementation
      const allAgents = await this.findAgentsByCapabilities([], 100);
      
      return allAgents
        .filter(agent => {
          const matchesQuery = agent.account.name.toLowerCase().includes(query.toLowerCase()) ||
                              agent.account.tags.some(tag => tag.toLowerCase().includes(query.toLowerCase()));
          
          const matchesFilters = !filters || (
            (!filters.capabilities || filters.capabilities.some(cap => 
              agent.account.capabilities.includes(cap))) &&
            (!filters.minReputation || agent.account.reputation >= filters.minReputation) &&
            (!filters.isActive || agent.account.isActive === filters.isActive)
          );

          return matchesQuery && matchesFilters;
        })
        .slice(0, limit);

    } catch (error) {
      console.error("Error searching agents:", error);
      return [];
    }
  }

  /**
   * Get agent recommendations based on interaction history
   */
  async getAgentRecommendations(
    forAgent: Address,
    limit: number = 10,
  ): Promise<AgentDiscoveryData[]> {
    try {
      // TODO: Implement recommendation algorithm with interaction history
      console.log("Getting recommendations for agent:", forAgent);

      // Mock recommendation based on popular agents
      const popularAgents = await this.findAgentsByCapabilities([], limit * 2);
      
      return popularAgents
        .sort((a, b) => b.account.reputation - a.account.reputation)
        .slice(0, limit);

    } catch (error) {
      console.error("Error getting agent recommendations:", error);
      return [];
    }
  }

  /**
   * Get channel recommendations
   */
  async getChannelRecommendations(
    forAgent: Address,
    limit: number = 10,
  ): Promise<ChannelDiscoveryData[]> {
    try {
      // TODO: Implement channel recommendation algorithm
      console.log("Getting channel recommendations for agent:", forAgent);

      // Mock recommendation based on trending channels
      return await this.findTrendingChannels('day', limit);

    } catch (error) {
      console.error("Error getting channel recommendations:", error);
      return [];
    }
  }

  /**
   * Get network statistics
   */
  async getNetworkStats(): Promise<{
    totalAgents: number;
    activeAgents: number;
    totalChannels: number;
    totalMessages: number;
    averageReputation: number;
  }> {
    try {
      // TODO: Implement actual network statistics calculation
      console.log("Getting network statistics");

      // Mock statistics
      return {
        totalAgents: 1250,
        activeAgents: 890,
        totalChannels: 180,
        totalMessages: 25600,
        averageReputation: 78.5,
      };

    } catch (error) {
      console.error("Error getting network stats:", error);
      return {
        totalAgents: 0,
        activeAgents: 0,
        totalChannels: 0,
        totalMessages: 0,
        averageReputation: 0,
      };
    }
  }

  /**
   * Search for agents with advanced filtering
   */
  async searchAgents(
    filters: AgentSearchFilters = {},
  ): Promise<SearchResult<AgentAccount>> {
    const startTime = Date.now();

    try {
      const programFilters: any[] = [
        {
          memcmp: {
            offset: 0,
            bytes: this.getDiscriminator("agentAccount"),
          },
        },
      ];

      // Implement proper v2.0 getProgramAccounts call for agents
      const accounts = await this.rpc.getProgramAccounts(
        address(this.programId),
        {
          filters: programFilters,
          commitment: this.commitment,
        },
      );

      let agents: AgentAccount[] = accounts.map((acc) => {
        const account = this.ensureInitialized().coder.accounts.decode(
          "agentAccount",
          acc.account.data,
        );
        return {
          pubkey: acc.pubkey,
          capabilities: account.capabilities.toNumber(),
          metadataUri: account.metadataUri,
          reputation: account.reputation?.toNumber() || 0,
          lastUpdated: getAccountLastUpdated(account),
          invitesSent: account.invitesSent?.toNumber() || 0,
          lastInviteAt: account.lastInviteAt?.toNumber() || 0,
          bump: account.bump,
        };
      });

      // Add capability filters (bitmask matching)
      if (filters.capabilities && filters.capabilities.length > 0) {
        agents = agents.filter(agent =>
          filters.capabilities!.every(cap => (agent.capabilities & cap) === cap),
        );
      }

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
      throw new Error(`Agent search failed: ${error.message}`);
    }
  }

  /**
   * Search for messages with advanced filtering
   */
  async searchMessages(
    filters: MessageSearchFilters = {},
  ): Promise<SearchResult<MessageAccount>> {
    const startTime = Date.now();

    try {
      const programFilters: any[] = [
        {
          memcmp: {
            offset: 0,
            bytes: this.getDiscriminator("messageAccount"),
          },
        },
      ];

      // Add sender filter
      if (filters.sender) {
        programFilters.push({
          memcmp: {
            offset: 8 + 32, // After discriminator and first field
            bytes: filters.sender,
          },
        });
      }

      // Add recipient filter
      if (filters.recipient) {
        programFilters.push({
          memcmp: {
            offset: 8 + 32 + 32, // After discriminator, sender, and recipient
            bytes: filters.recipient,
          },
        });
      }

      // Implement proper v2.0 getProgramAccounts call for messages
      const accounts = await this.rpc.getProgramAccounts(
        address(this.programId),
        {
          filters: programFilters,
          commitment: this.commitment,
        },
      );

      let messages: MessageAccount[] = accounts.map((acc) => {
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
          messageType: this.convertMessageTypeFromProgram(account.messageType),
          status: this.convertMessageStatusFromProgram(account.status),
          timestamp: getAccountTimestamp(account),
          createdAt: getAccountCreatedAt(account),
          expiresAt: account.expiresAt?.toNumber() || 0,
          bump: account.bump,
        };
      });

      // Apply in-memory filters
      messages = this.applyMessageFilters(messages, filters);

      // Apply sorting
      messages = this.sortMessages(messages, filters);

      // Apply pagination
      const offset = filters.offset || 0;
      const limit = filters.limit || 50;
      const paginatedMessages = messages.slice(offset, offset + limit);

      return {
        items: paginatedMessages,
        total: messages.length,
        hasMore: offset + limit < messages.length,
        searchParams: filters,
        executionTime: Date.now() - startTime,
      };
    } catch (error: any) {
      throw new Error(`Message search failed: ${error.message}`);
    }
  }

  /**
   * Search for channels with advanced filtering
   */
  async searchChannels(
    filters: ChannelSearchFilters = {},
  ): Promise<SearchResult<ChannelAccount>> {
    const startTime = Date.now();

    try {
      const programFilters: GetProgramAccountsFilter[] = [
        {
          memcmp: {
            offset: 0,
            bytes: this.getDiscriminator("channelAccount"),
          },
        },
      ];

      // Add creator filter
      if (filters.creator) {
        programFilters.push({
          memcmp: {
            offset: 8, // After discriminator
            bytes: filters.creator,
          },
        });
      }

      const accounts = await this.rpc.getProgramAccounts(
        address(this.programId),
        {
          filters: programFilters,
          commitment: this.commitment,
        },
      );

      let channels: ChannelAccount[] = accounts.map((acc) => {
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
          createdAt: getAccountCreatedAt(account),
          isActive: true,
          bump: account.bump,
        };
      });

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
      throw new Error(`Channel search failed: ${error.message}`);
    }
  }

  /**
   * Get recommended agents based on similarity and activity
   */
  async getRecommendedAgents(
    options: RecommendationOptions = {},
  ): Promise<Recommendation<AgentAccount>[]> {
    const agents = await this.searchAgents({ limit: 100 });

    const recommendations: Recommendation<AgentAccount>[] = agents.items.map(
      (agent) => {
        let score = 0;
        const reasons: string[] = [];

        // Score based on reputation
        score += Math.min(agent.reputation / 100, 1) * 0.3;
        if (agent.reputation > 50) {
          reasons.push("High reputation");
        }

        // Score based on capabilities diversity
        const capabilityCount = getCapabilityNames(agent.capabilities).length;
        score += Math.min(capabilityCount / 4, 1) * 0.2;
        if (capabilityCount >= 3) {
          reasons.push("Versatile capabilities");
        }

        // Score based on recent activity
        const daysSinceUpdate =
          (Date.now() - agent.lastUpdated * 1000) / (1000 * 60 * 60 * 24);
        if (daysSinceUpdate < 7) {
          score += 0.3;
          reasons.push("Recently active");
        } else if (daysSinceUpdate < 30) {
          score += 0.1;
        }

        // Random factor for discovery
        score += Math.random() * 0.2;

        return {
          item: agent,
          score,
          reason: options.includeReason ? reasons.join(", ") : undefined,
        };
      },
    );

    return recommendations
      .sort((a, b) => b.score - a.score)
      .slice(0, options.limit || 10);
  }

  /**
   * Get recommended channels for an agent
   */
  async getRecommendedChannels(
    options: RecommendationOptions = {},
  ): Promise<Recommendation<ChannelAccount>[]> {
    const channels = await this.searchChannels({
      limit: 100,
      visibility: [ChannelVisibility.Public],
    });

    const recommendations: Recommendation<ChannelAccount>[] =
      channels.items.map((channel) => {
        let score = 0;
        const reasons: string[] = [];

        // Score based on participant count
        const participantRatio =
          channel.participantCount / channel.maxParticipants;
        if (participantRatio > 0.1 && participantRatio < 0.8) {
          score += 0.3;
          reasons.push("Active community");
        }

        // Score based on low fees
        if (channel.feePerMessage === 0) {
          score += 0.2;
          reasons.push("No fees");
        } else if (channel.feePerMessage < 1000) {
          // Less than 0.000001 SOL
          score += 0.1;
          reasons.push("Low fees");
        }

        // Score based on escrow balance (indicates activity)
        if (channel.escrowBalance > 0) {
          score += 0.2;
          reasons.push("Funded channel");
        }

        // Score based on recent creation (discovery factor)
        const daysSinceCreation =
          (Date.now() - channel.createdAt * 1000) / (1000 * 60 * 60 * 24);
        if (daysSinceCreation < 30) {
          score += 0.2;
          reasons.push("New channel");
        }

        // Random factor for discovery
        score += Math.random() * 0.1;

        return {
          item: channel,
          score,
          reason: options.includeReason ? reasons.join(", ") : undefined,
        };
      });

    return recommendations
      .sort((a, b) => b.score - a.score)
      .slice(0, options.limit || 10);
  }

  /**
   * Find similar agents based on capabilities
   */
  async findSimilarAgents(
    targetAgent: AgentAccount,
    limit: number = 10,
  ): Promise<AgentAccount[]> {
    const agents = await this.searchAgents({ limit: 200 });

    const similarities = agents.items
      .filter((agent) => agent.pubkey !== targetAgent.pubkey)
      .map((agent) => {
        const similarity = this.calculateCapabilitySimilarity(
          targetAgent.capabilities,
          agent.capabilities,
        );
        return { agent, similarity };
      })
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);

    return similarities.map((item) => item.agent);
  }

  /**
   * Get trending channels based on recent activity
   */
  async getTrendingChannels(limit: number = 10): Promise<ChannelAccount[]> {
    const channels = await this.searchChannels({ limit: 100 });

    // Score channels based on multiple factors
    const scoredChannels = channels.items.map((channel) => {
      let trendScore = 0;

      // Growth rate (participants / days since creation)
      const daysSinceCreation = Math.max(
        1,
        (Date.now() - channel.createdAt * 1000) / (1000 * 60 * 60 * 24),
      );
      const growthRate = channel.participantCount / daysSinceCreation;
      trendScore += growthRate * 10;

      // Participation ratio
      const participationRatio =
        channel.participantCount / channel.maxParticipants;
      trendScore += participationRatio * 20;

      // Escrow activity
      if (channel.escrowBalance > 0) {
        trendScore += Math.log(channel.escrowBalance) * 0.1;
      }

      return { channel, trendScore };
    });

    return scoredChannels
      .sort((a, b) => b.trendScore - a.trendScore)
      .slice(0, limit)
      .map((item) => item.channel);
  }

  // ============================================================================
  // Private Filter and Sort Methods
  // ============================================================================

  private applyAgentFilters(
    agents: AgentAccount[],
    filters: AgentSearchFilters,
  ): AgentAccount[] {
    return agents.filter((agent) => {
      // Reputation filters
      if (
        filters.minReputation !== undefined &&
        agent.reputation < filters.minReputation
      ) {
        return false;
      }
      if (
        filters.maxReputation !== undefined &&
        agent.reputation > filters.maxReputation
      ) {
        return false;
      }

      // Metadata contains filter
      if (filters.metadataContains) {
        const metadata = agent.metadataUri?.toLowerCase() || "";
        if (!metadata.includes(filters.metadataContains.toLowerCase())) {
          return false;
        }
      }

      // Last active filters
      if (filters.lastActiveAfter) {
        if (agent.lastUpdated * 1000 < filters.lastActiveAfter) {
          return false;
        }
      }
      if (filters.lastActiveBefore) {
        if (agent.lastUpdated * 1000 > filters.lastActiveBefore) {
          return false;
        }
      }

      return true;
    });
  }

  private applyMessageFilters(
    messages: MessageAccount[],
    filters: MessageSearchFilters,
  ): MessageAccount[] {
    return messages.filter((message) => {
      // Status filter
      if (filters.status && filters.status.length > 0) {
        if (!filters.status.includes(message.status)) {
          return false;
        }
      }

      // Message type filter
      if (filters.messageType && filters.messageType.length > 0) {
        if (!filters.messageType.includes(message.messageType)) {
          return false;
        }
      }

      // Created date filters
      if (filters.createdAfter) {
        if (message.createdAt * 1000 < filters.createdAfter) {
          return false;
        }
      }
      if (filters.createdBefore) {
        if (message.createdAt * 1000 > filters.createdBefore) {
          return false;
        }
      }

      // Payload contains filter
      if (filters.payloadContains) {
        if (!message.payload.toLowerCase().includes(filters.payloadContains.toLowerCase())) {
          return false;
        }
      }

      return true;
    });
  }

  private applyChannelFilters(
    channels: ChannelAccount[],
    filters: ChannelSearchFilters,
  ): ChannelAccount[] {
    return channels.filter((channel) => {
      // Visibility filter
      if (filters.visibility && filters.visibility.length > 0) {
        if (!filters.visibility.includes(channel.visibility)) {
          return false;
        }
      }

      // Name contains filter
      if (filters.nameContains) {
        if (!channel.name.toLowerCase().includes(filters.nameContains.toLowerCase())) {
          return false;
        }
      }

      // Description contains filter
      if (filters.descriptionContains) {
        if (!channel.description.toLowerCase().includes(filters.descriptionContains.toLowerCase())) {
          return false;
        }
      }

      // Participant count filters
      if (filters.minParticipants !== undefined) {
        if (channel.participantCount < filters.minParticipants) {
          return false;
        }
      }
      if (filters.maxParticipants !== undefined) {
        if (channel.participantCount > filters.maxParticipants) {
          return false;
        }
      }

      // Fee filter
      if (filters.maxFeePerMessage !== undefined) {
        if (channel.feePerMessage > filters.maxFeePerMessage) {
          return false;
        }
      }

      // Escrow filter
      if (filters.hasEscrow !== undefined) {
        const hasEscrow = channel.escrowBalance > 0;
        if (filters.hasEscrow !== hasEscrow) {
          return false;
        }
      }

      // Created date filters
      if (filters.createdAfter) {
        if (channel.createdAt * 1000 < filters.createdAfter) {
          return false;
        }
      }
      if (filters.createdBefore) {
        if (channel.createdAt * 1000 > filters.createdBefore) {
          return false;
        }
      }

      return true;
    });
  }

  private sortAgents(
    agents: AgentAccount[],
    filters: AgentSearchFilters,
  ): AgentAccount[] {
    const sortBy = filters.sortBy || "relevance";
    const sortOrder = filters.sortOrder || "desc";

    const sorted = [...agents].sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case "reputation":
          comparison = a.reputation - b.reputation;
          break;
        case "recent":
          comparison = a.lastUpdated - b.lastUpdated;
          break;
        case "popular":
          // Use invites sent as popularity metric
          comparison = a.invitesSent - b.invitesSent;
          break;
        case "relevance":
        default:
          // Combine reputation and recent activity for relevance
          const scoreA = a.reputation * 0.7 + (a.lastUpdated / 1000000) * 0.3;
          const scoreB = b.reputation * 0.7 + (b.lastUpdated / 1000000) * 0.3;
          comparison = scoreA - scoreB;
          break;
      }

      return sortOrder === "asc" ? comparison : -comparison;
    });

    return sorted;
  }

  private sortMessages(
    messages: MessageAccount[],
    filters: MessageSearchFilters,
  ): MessageAccount[] {
    const sortBy = filters.sortBy || "recent";
    const sortOrder = filters.sortOrder || "desc";

    const sorted = [...messages].sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case "recent":
          comparison = a.timestamp - b.timestamp;
          break;
        case "relevance":
        default:
          // Use timestamp for relevance by default
          comparison = a.timestamp - b.timestamp;
          break;
      }

      return sortOrder === "asc" ? comparison : -comparison;
    });

    return sorted;
  }

  private sortChannels(
    channels: ChannelAccount[],
    filters: ChannelSearchFilters,
  ): ChannelAccount[] {
    const sortBy = filters.sortBy || "popular";
    const sortOrder = filters.sortOrder || "desc";

    const sorted = [...channels].sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case "popular":
          comparison = a.participantCount - b.participantCount;
          break;
        case "recent":
          comparison = a.createdAt - b.createdAt;
          break;
        case "relevance":
        default:
          // Combine popularity and recent activity for relevance
          const scoreA = a.participantCount * 0.6 + (a.createdAt / 1000000) * 0.4;
          const scoreB = b.participantCount * 0.6 + (b.createdAt / 1000000) * 0.4;
          comparison = scoreA - scoreB;
          break;
      }

      return sortOrder === "asc" ? comparison : -comparison;
    });

    return sorted;
  }

  private calculateCapabilitySimilarity(caps1: number, caps2: number): number {
    // Calculate Jaccard similarity for capability bitmasks
    const intersection = caps1 & caps2;
    const union = caps1 | caps2;

    if (union === 0) return 1; // Both have no capabilities - perfectly similar
    return this.countSetBits(intersection) / this.countSetBits(union);
  }

  private countSetBits(n: number): number {
    let count = 0;
    while (n) {
      count += n & 1;
      n >>= 1;
    }
    return count;
  }

  private getDiscriminator(accountType: string): string {
    // Create 8-byte discriminator for account type
    const hash = Buffer.from(accountType).toString("hex");
    return hash.substring(0, 16); // First 8 bytes as hex
  }

  private convertMessageTypeFromProgram(programType: any): MessageType {
    if (programType.text !== undefined) return MessageType.Text;
    if (programType.data !== undefined) return MessageType.Data;
    if (programType.command !== undefined) return MessageType.Command;
    if (programType.response !== undefined) return MessageType.Response;
    return MessageType.Text;
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
