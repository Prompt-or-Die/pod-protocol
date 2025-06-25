/**
 * Discovery service for PoD Protocol SDK
 */

import { BaseService } from './base.js';
import { AGENT_CAPABILITIES, MessageType, ChannelVisibility } from '../types.js';

/**
 * Service for search and discovery in the PoD Protocol
 * 
 * @class DiscoveryService
 * @extends BaseService
 */
export class DiscoveryService extends BaseService {
  /**
   * Search for agents with filters
   * 
   * @param {Object} filters - Search filters
   * @param {number[]} [filters.capabilities] - Required capabilities
   * @param {number} [filters.minReputation] - Minimum reputation score
   * @param {string} [filters.query] - Search query for metadata
   * @param {number} [filters.limit=50] - Maximum results
   * @param {number} [filters.offset=0] - Result offset
   * @returns {Promise<Object>} Search results with agents and metadata
   * 
   * @example
   * ```javascript
   * const results = await client.discovery.searchAgents({
   *   capabilities: [AGENT_CAPABILITIES.TRADING, AGENT_CAPABILITIES.ANALYSIS],
   *   minReputation: 50,
   *   query: 'financial',
   *   limit: 20
   * });
   * ```
   */
  async searchAgents(filters = {}) {
    if (!this.isInitialized()) {
      throw new Error('Service not initialized. Call client.initialize() first.');
    }

    try {
      const accounts = await this.program.account.agentAccount.all();
      let agents = accounts.map(account => ({
        pubkey: account.publicKey,
        capabilities: account.account.capabilities.toNumber(),
        metadataUri: account.account.metadataUri,
        reputation: account.account.reputation?.toNumber() || 0,
        lastUpdated: account.account.lastUpdated?.toNumber() || Date.now()
      }));

      // Apply capability filters
      if (filters.capabilities && filters.capabilities.length > 0) {
        agents = agents.filter(agent => {
          return filters.capabilities.every(capability => 
            (agent.capabilities & capability) === capability
          );
        });
      }

      // Apply reputation filter
      if (filters.minReputation !== undefined) {
        agents = agents.filter(agent => agent.reputation >= filters.minReputation);
      }

      // Apply text search (simple metadata URI search)
      if (filters.query) {
        const query = filters.query.toLowerCase();
        agents = agents.filter(agent => 
          agent.metadataUri.toLowerCase().includes(query)
        );
      }

      // Sort by reputation (highest first)
      agents.sort((a, b) => b.reputation - a.reputation);

      // Apply pagination
      const offset = filters.offset || 0;
      const limit = filters.limit || 50;
      const totalCount = agents.length;
      const paginatedAgents = agents.slice(offset, offset + limit);

      return {
        items: paginatedAgents,
        totalCount,
        hasMore: offset + limit < totalCount,
        nextOffset: offset + limit < totalCount ? offset + limit : null
      };
    } catch (error) {
      throw new Error(`Failed to search agents: ${error.message}`);
    }
  }

  /**
   * Search for channels with filters
   * 
   * @param {Object} filters - Search filters
   * @param {ChannelVisibility} [filters.visibility] - Channel visibility
   * @param {number} [filters.minParticipants] - Minimum participants
   * @param {number} [filters.maxFee] - Maximum fee per message
   * @param {string} [filters.query] - Search query for name/description
   * @param {number} [filters.limit=50] - Maximum results
   * @param {number} [filters.offset=0] - Result offset
   * @returns {Promise<Object>} Search results with channels
   * 
   * @example
   * ```javascript
   * const results = await client.discovery.searchChannels({
   *   visibility: ChannelVisibility.PUBLIC,
   *   minParticipants: 5,
   *   query: 'trading',
   *   limit: 20
   * });
   * ```
   */
  async searchChannels(filters = {}) {
    if (!this.isInitialized()) {
      throw new Error('Service not initialized. Call client.initialize() first.');
    }

    try {
      const accounts = await this.program.account.channelAccount.all();
      let channels = accounts.map(account => ({
        pubkey: account.publicKey,
        creator: account.account.creator,
        name: account.account.name,
        description: account.account.description,
        visibility: this._convertChannelVisibilityFromProgram(account.account.visibility),
        participantCount: account.account.currentParticipants || 0,
        feePerMessage: account.account.feePerMessage?.toNumber() || 0,
        createdAt: account.account.createdAt?.toNumber() || Date.now()
      }));

      // Apply visibility filter
      if (filters.visibility) {
        channels = channels.filter(channel => channel.visibility === filters.visibility);
      }

      // Apply participant count filter
      if (filters.minParticipants !== undefined) {
        channels = channels.filter(channel => channel.participantCount >= filters.minParticipants);
      }

      // Apply fee filter
      if (filters.maxFee !== undefined) {
        channels = channels.filter(channel => channel.feePerMessage <= filters.maxFee);
      }

      // Apply text search
      if (filters.query) {
        const query = filters.query.toLowerCase();
        channels = channels.filter(channel => 
          channel.name.toLowerCase().includes(query) ||
          channel.description.toLowerCase().includes(query)
        );
      }

      // Sort by participant count (highest first)
      channels.sort((a, b) => b.participantCount - a.participantCount);

      // Apply pagination
      const offset = filters.offset || 0;
      const limit = filters.limit || 50;
      const totalCount = channels.length;
      const paginatedChannels = channels.slice(offset, offset + limit);

      return {
        items: paginatedChannels,
        totalCount,
        hasMore: offset + limit < totalCount,
        nextOffset: offset + limit < totalCount ? offset + limit : null
      };
    } catch (error) {
      throw new Error(`Failed to search channels: ${error.message}`);
    }
  }

  /**
   * Search for messages with filters
   * 
   * @param {Object} filters - Search filters
   * @param {MessageType} [filters.messageType] - Type of message
   * @param {string} [filters.status] - Message status
   * @param {Object} [filters.dateRange] - Date range filter
   * @param {number} [filters.dateRange.start] - Start timestamp
   * @param {number} [filters.dateRange.end] - End timestamp
   * @param {string} [filters.query] - Search query for content
   * @param {number} [filters.limit=50] - Maximum results
   * @param {number} [filters.offset=0] - Result offset
   * @returns {Promise<Object>} Search results with messages
   * 
   * @example
   * ```javascript
   * const results = await client.discovery.searchMessages({
   *   messageType: MessageType.DATA,
   *   query: 'trading signals',
   *   dateRange: {
   *     start: Date.now() - 7 * 24 * 60 * 60 * 1000, // 7 days ago
   *     end: Date.now()
   *   },
   *   limit: 100
   * });
   * ```
   */
  async searchMessages(filters = {}) {
    if (!this.isInitialized()) {
      throw new Error('Service not initialized. Call client.initialize() first.');
    }

    try {
      const accounts = await this.program.account.messageAccount.all();
      let messages = accounts.map(account => ({
        pubkey: account.publicKey,
        sender: account.account.sender,
        recipient: account.account.recipient,
        payload: account.account.payload || '',
        messageType: account.account.messageType,
        status: account.account.status,
        timestamp: account.account.timestamp?.toNumber() || Date.now()
      }));

      // Apply message type filter
      if (filters.messageType) {
        messages = messages.filter(message => message.messageType === filters.messageType);
      }

      // Apply status filter
      if (filters.status) {
        messages = messages.filter(message => message.status === filters.status);
      }

      // Apply date range filter
      if (filters.dateRange) {
        const { start, end } = filters.dateRange;
        messages = messages.filter(message => {
          const messageTime = message.timestamp * 1000;
          return (!start || messageTime >= start) && (!end || messageTime <= end);
        });
      }

      // Apply content search
      if (filters.query) {
        const query = filters.query.toLowerCase();
        messages = messages.filter(message => 
          message.payload.toLowerCase().includes(query)
        );
      }

      // Sort by timestamp (newest first)
      messages.sort((a, b) => b.timestamp - a.timestamp);

      // Apply pagination
      const offset = filters.offset || 0;
      const limit = filters.limit || 50;
      const totalCount = messages.length;
      const paginatedMessages = messages.slice(offset, offset + limit);

      return {
        items: paginatedMessages,
        totalCount,
        hasMore: offset + limit < totalCount,
        nextOffset: offset + limit < totalCount ? offset + limit : null
      };
    } catch (error) {
      throw new Error(`Failed to search messages: ${error.message}`);
    }
  }

  /**
   * Get recommendations for agents, channels, or content
   * 
   * @param {Object} options - Recommendation options
   * @param {string} options.type - Type: 'agents', 'channels', or 'messages'
   * @param {Address} [options.basedOn] - Base recommendations on this entity
   * @param {number} [options.limit=10] - Maximum recommendations
   * @param {string} [options.algorithm='collaborative_filtering'] - Algorithm to use
   * @returns {Promise<Array>} Array of recommendations
   * 
   * @example
   * ```javascript
   * const recommendations = await client.discovery.getRecommendations({
   *   type: 'agents',
   *   basedOn: myAgentAddress,
   *   limit: 10
   * });
   * ```
   */
  async getRecommendations(options) {
    if (!this.isInitialized()) {
      throw new Error('Service not initialized. Call client.initialize() first.');
    }

    try {
      switch (options.type) {
        case 'agents':
          return this._getAgentRecommendations(options);
        case 'channels':
          return this._getChannelRecommendations(options);
        case 'messages':
          return this._getMessageRecommendations(options);
        default:
          throw new Error(`Unknown recommendation type: ${options.type}`);
      }
    } catch (error) {
      throw new Error(`Failed to get recommendations: ${error.message}`);
    }
  }

  /**
   * Get trending content
   * 
   * @param {Object} [options] - Options
   * @param {string} [options.timeframe='24h'] - Timeframe: '1h', '24h', '7d', '30d'
   * @param {number} [options.limit=20] - Maximum results
   * @returns {Promise<Object>} Trending content
   * 
   * @example
   * ```javascript
   * const trending = await client.discovery.getTrending({
   *   timeframe: '24h',
   *   limit: 10
   * });
   * ```
   */
  async getTrending(options = {}) {
    const timeframe = options.timeframe || '24h';
    const limit = options.limit || 20;

    // Calculate timeframe in milliseconds
    const timeframes = {
      '1h': 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000
    };

    const timeframeMs = timeframes[timeframe] || timeframes['24h'];
    const since = Date.now() - timeframeMs;

    try {
      // Get trending agents (by recent activity)
      const trendingAgents = await this.searchAgents({
        limit: limit
      });

      // Get trending channels (by recent participant growth)
      const trendingChannels = await this.searchChannels({
        limit: limit
      });

      // Get trending messages (by recent activity)
      const trendingMessages = await this.searchMessages({
        dateRange: { start: since, end: Date.now() },
        limit: limit
      });

      return {
        agents: trendingAgents.items.slice(0, limit),
        channels: trendingChannels.items.slice(0, limit),
        messages: trendingMessages.items.slice(0, limit),
        timeframe,
        generatedAt: Date.now()
      };
    } catch (error) {
      throw new Error(`Failed to get trending content: ${error.message}`);
    }
  }

  // Private helper methods
  async _getAgentRecommendations(options) {
    // Simple recommendation based on similar capabilities
    const allAgents = await this.searchAgents({ limit: 1000 });
    
    if (!options.basedOn) {
      // Return top agents by reputation
      return allAgents.items
        .sort((a, b) => b.reputation - a.reputation)
        .slice(0, options.limit || 10)
        .map(agent => ({
          itemId: agent.pubkey,
          score: agent.reputation / 100,
          reason: 'High reputation agent',
          metadata: { type: 'agent', capabilities: agent.capabilities }
        }));
    }

    // Get base agent
    const baseAgent = allAgents.items.find(agent => agent.pubkey.equals(options.basedOn));
    if (!baseAgent) {
      return [];
    }

    // Find agents with similar capabilities
    return allAgents.items
      .filter(agent => !agent.pubkey.equals(options.basedOn))
      .map(agent => {
        const similarityScore = this._calculateCapabilitySimilarity(
          baseAgent.capabilities, 
          agent.capabilities
        );
        return {
          itemId: agent.pubkey,
          score: similarityScore,
          reason: 'Similar capabilities',
          metadata: { type: 'agent', capabilities: agent.capabilities }
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, options.limit || 10);
  }

  async _getChannelRecommendations(options) {
    const allChannels = await this.searchChannels({ limit: 1000 });
    
    // Return most popular channels
    return allChannels.items
      .sort((a, b) => b.participantCount - a.participantCount)
      .slice(0, options.limit || 10)
      .map(channel => ({
        itemId: channel.pubkey,
        score: channel.participantCount / 100,
        reason: 'Popular channel',
        metadata: { type: 'channel', participantCount: channel.participantCount }
      }));
  }

  async _getMessageRecommendations(options) {
    const recentMessages = await this.searchMessages({
      dateRange: { start: Date.now() - 24 * 60 * 60 * 1000, end: Date.now() },
      limit: options.limit || 10
    });
    
    return recentMessages.items.map(message => ({
      itemId: message.pubkey,
      score: 1.0,
      reason: 'Recent message',
      metadata: { type: 'message', messageType: message.messageType }
    }));
  }

  _calculateCapabilitySimilarity(capabilities1, capabilities2) {
    // Calculate Jaccard similarity for capabilities
    const common = capabilities1 & capabilities2;
    const total = capabilities1 | capabilities2;
    
    if (total === 0) return 0;
    
    const commonCount = this._countBits(common);
    const totalCount = this._countBits(total);
    
    return commonCount / totalCount;
  }

  _countBits(n) {
    let count = 0;
    while (n) {
      count += n & 1;
      n >>= 1;
    }
    return count;
  }

  _convertChannelVisibilityFromProgram(programVisibility) {
    if (programVisibility.public !== undefined) return ChannelVisibility.PUBLIC;
    if (programVisibility.private !== undefined) return ChannelVisibility.PRIVATE;
    return ChannelVisibility.PUBLIC;
  }
}
