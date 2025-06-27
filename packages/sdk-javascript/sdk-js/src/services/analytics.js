/**
 * Analytics service for PoD Protocol SDK
 */

import { BaseService } from './base.js';
import { findAgentPDA } from '../utils/pda.js';
import { AGENT_CAPABILITIES, MessageStatus, ChannelVisibility } from '../types.js';
import { lamportsToSol } from '../utils/crypto.js';

/**
 * Service for analytics and insights in the PoD Protocol
 * 
 * @class AnalyticsService
 * @extends BaseService
 */
export class AnalyticsService extends BaseService {
  /**
   * Get comprehensive analytics dashboard
   * 
   * @returns {Promise<Object>} Dashboard data with all analytics
   * 
   * @example
   * ```javascript
   * const dashboard = await client.analytics.getDashboard();
   * console.log('Total agents:', dashboard.agents.totalAgents);
   * console.log('Total messages:', dashboard.messages.totalMessages);
   * ```
   */
  async getDashboard() {
    const [agents, messages, channels, network] = await Promise.all([
      this.getAgentAnalytics(),
      this.getMessageAnalytics(),
      this.getChannelAnalytics(),
      this.getNetworkAnalytics()
    ]);

    return {
      agents,
      messages,
      channels,
      network,
      generatedAt: Date.now()
    };
  }

  /**
   * Get agent ecosystem analytics
   * 
   * @param {Object} [options] - Analytics options
   * @param {number} [options.limit=100] - Maximum number of agents to analyze
   * @returns {Promise<Object>} Agent analytics data
   * 
   * @example
   * ```javascript
   * const agentAnalytics = await client.analytics.getAgentAnalytics({ limit: 50 });
   * console.log('Capability distribution:', agentAnalytics.capabilityDistribution);
   * ```
   */
  async getAgentAnalytics(options = {}) {
    if (!this.isInitialized()) {
      throw new Error('Service not initialized. Call client.initialize() first.');
    }

    try {
      const accounts = await this.program.account.agentAccount.all();
      const agents = accounts.map(account => ({
        pubkey: account.publicKey,
        capabilities: account.account.capabilities.toNumber(),
        reputation: account.account.reputation?.toNumber() || 0,
        lastUpdated: account.account.lastUpdated?.toNumber() || Date.now(),
        invitesSent: account.account.invitesSent?.toNumber() || 0
      }));

      // Calculate capability distribution
      const capabilityDistribution = {};
      agents.forEach(agent => {
        const capabilities = this._getCapabilityNames(agent.capabilities);
        capabilities.forEach(cap => {
          capabilityDistribution[cap] = (capabilityDistribution[cap] || 0) + 1;
        });
      });

      // Calculate average reputation
      const averageReputation = agents.length > 0
        ? agents.reduce((sum, agent) => sum + agent.reputation, 0) / agents.length
        : 0;

      // Get top agents by reputation
      const topAgentsByReputation = agents
        .sort((a, b) => b.reputation - a.reputation)
        .slice(0, 10);

      // Get recently active agents (last 24 hours)
      const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;
      const recentlyActive = agents
        .filter(agent => agent.lastUpdated * 1000 > twentyFourHoursAgo)
        .sort((a, b) => b.lastUpdated - a.lastUpdated)
        .slice(0, 20);

      return {
        totalAgents: agents.length,
        capabilityDistribution,
        averageReputation,
        topAgentsByReputation,
        recentlyActive
      };
    } catch (error) {
      throw new Error(`Failed to get agent analytics: ${error.message}`);
    }
  }

  /**
   * Get message analytics and patterns
   * 
   * @param {Object} [options] - Analytics options
   * @param {number} [options.limit=1000] - Maximum number of messages to analyze
   * @returns {Promise<Object>} Message analytics data
   * 
   * @example
   * ```javascript
   * const messageAnalytics = await client.analytics.getMessageAnalytics({ limit: 500 });
   * console.log('Messages by status:', messageAnalytics.messagesByStatus);
   * ```
   */
  async getMessageAnalytics(options = {}) {
    if (!this.isInitialized()) {
      throw new Error('Service not initialized. Call client.initialize() first.');
    }

    try {
      const accounts = await this.program.account.messageAccount.all();
      const messages = accounts
        .slice(0, options.limit || 1000)
        .map(account => ({
          pubkey: account.publicKey,
          sender: account.account.sender,
          recipient: account.account.recipient,
          messageType: account.account.messageType,
          status: account.account.status,
          timestamp: account.account.timestamp?.toNumber() || Date.now(),
          payload: account.account.payload || ''
        }));

      // Calculate messages by status
      const messagesByStatus = {};
      Object.values(MessageStatus).forEach(status => {
        messagesByStatus[status] = 0;
      });
      
      messages.forEach(message => {
        if (messagesByStatus[message.status] !== undefined) {
          messagesByStatus[message.status]++;
        }
      });

      // Calculate messages by type
      const messagesByType = {};
      messages.forEach(message => {
        const type = message.messageType || 'text';
        messagesByType[type] = (messagesByType[type] || 0) + 1;
      });

      // Calculate average message size
      const totalSize = messages.reduce((sum, message) => sum + message.payload.length, 0);
      const averageMessageSize = messages.length > 0 ? totalSize / messages.length : 0;

      // Calculate messages per day (last 7 days)
      const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      const recentMessages = messages.filter(message => message.timestamp * 1000 > sevenDaysAgo);
      const messagesPerDay = recentMessages.length / 7;

      // Get top senders
      const senderCounts = {};
      messages.forEach(message => {
        const sender = message.sender;
        senderCounts[sender] = (senderCounts[sender] || 0) + 1;
      });

      const topSenders = Object.entries(senderCounts)
        .map(([agent, messageCount]) => ({ agent, messageCount }))
        .sort((a, b) => b.messageCount - a.messageCount)
        .slice(0, 10);

      // Get recent messages
      const recentMessagesList = messages
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 20);

      return {
        totalMessages: messages.length,
        messagesByStatus,
        messagesByType,
        averageMessageSize,
        messagesPerDay,
        topSenders,
        recentMessages: recentMessagesList
      };
    } catch (error) {
      throw new Error(`Failed to get message analytics: ${error.message}`);
    }
  }

  /**
   * Get channel analytics
   * 
   * @param {Object} [options] - Analytics options
   * @param {number} [options.limit=100] - Maximum number of channels to analyze
   * @returns {Promise<Object>} Channel analytics data
   * 
   * @example
   * ```javascript
   * const channelAnalytics = await client.analytics.getChannelAnalytics({ limit: 50 });
   * console.log('Most popular channels:', channelAnalytics.mostPopularChannels);
   * ```
   */
  async getChannelAnalytics(options = {}) {
    if (!this.isInitialized()) {
      throw new Error('Service not initialized. Call client.initialize() first.');
    }

    try {
      const accounts = await this.program.account.channelAccount.all();
      const channels = accounts.map(account => ({
        pubkey: account.publicKey,
        name: account.account.name,
        visibility: account.account.visibility,
        participantCount: account.account.currentParticipants || 0,
        feePerMessage: account.account.feePerMessage?.toNumber() || 0,
        escrowBalance: account.account.escrowBalance?.toNumber() || 0,
        createdAt: account.account.createdAt?.toNumber() || Date.now()
      }));

      // Calculate channels by visibility
      const channelsByVisibility = {};
      Object.values(ChannelVisibility).forEach(visibility => {
        channelsByVisibility[visibility] = 0;
      });

      channels.forEach(channel => {
        const visibility = this._convertChannelVisibilityFromProgram(channel.visibility);
        if (channelsByVisibility[visibility] !== undefined) {
          channelsByVisibility[visibility]++;
        }
      });

      // Calculate average participants
      const averageParticipants = channels.length > 0
        ? channels.reduce((sum, channel) => sum + channel.participantCount, 0) / channels.length
        : 0;

      // Get most popular channels
      const mostPopularChannels = channels
        .sort((a, b) => b.participantCount - a.participantCount)
        .slice(0, 10);

      // Calculate total escrow value
      const totalEscrowValue = channels.reduce((sum, channel) => sum + channel.escrowBalance, 0);

      // Calculate average channel fee
      const averageChannelFee = channels.length > 0
        ? channels.reduce((sum, channel) => sum + channel.feePerMessage, 0) / channels.length
        : 0;

      return {
        totalChannels: channels.length,
        channelsByVisibility,
        averageParticipants,
        mostPopularChannels,
        totalEscrowValue,
        averageChannelFee
      };
    } catch (error) {
      throw new Error(`Failed to get channel analytics: ${error.message}`);
    }
  }

  /**
   * Get network-wide analytics
   * 
   * @returns {Promise<Object>} Network analytics data
   * 
   * @example
   * ```javascript
   * const networkAnalytics = await client.analytics.getNetworkAnalytics();
   * console.log('Network health:', networkAnalytics.networkHealth);
   * ```
   */
  async getNetworkAnalytics() {
    try {
      const [agentAnalytics, messageAnalytics, channelAnalytics] = await Promise.all([
        this.getAgentAnalytics(),
        this.getMessageAnalytics(),
        this.getChannelAnalytics()
      ]);

      // Calculate active agents in last 24 hours
      const activeAgents24h = agentAnalytics.recentlyActive.length;

      // Calculate message volume in last 24 hours
      const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;
      const messages24h = messageAnalytics.recentMessages.filter(
        message => message.timestamp * 1000 > twentyFourHoursAgo
      ).length;

      // Calculate network health score
      let networkHealth = 'healthy';
      if (activeAgents24h < 10 || messages24h < 50) {
        networkHealth = 'moderate';
      }
      if (activeAgents24h < 5 || messages24h < 20) {
        networkHealth = 'congested';
      }

      // Calculate peak usage hours (simplified)
      const peakUsageHours = [9, 10, 11, 14, 15, 16, 20, 21]; // Mock data

      return {
        totalTransactions: messageAnalytics.totalMessages + agentAnalytics.totalAgents + channelAnalytics.totalChannels,
        totalValueLocked: lamportsToSol(channelAnalytics.totalEscrowValue),
        activeAgents24h,
        messageVolume24h: messages24h,
        networkHealth,
        peakUsageHours
      };
    } catch (error) {
      throw new Error(`Failed to get network analytics: ${error.message}`);
    }
  }

  /**
   * Get analytics for a specific agent
   * 
   * @param {string} agentPubkey - Agent's public key
   * @returns {Promise<Object>} Agent-specific analytics
   * 
   * @example
   * ```javascript
   * const agentStats = await client.analytics.getAgentStats(agentAddress);
   * console.log('Messages sent:', agentStats.messagesSent);
   * ```
   */
  async getAgentStats(agentPubkey) {
    if (!this.isInitialized()) {
      throw new Error('Service not initialized. Call client.initialize() first.');
    }

    try {
      // Get agent info
      const agent = await this.program.account.agentAccount.fetch(
        (await findAgentPDA(agentPubkey, this.programId))[0]
      );

      // Get messages sent by agent
      const allMessages = await this.program.account.messageAccount.all();
      const messagesSent = allMessages.filter(
        account => account.account.sender.equals(agentPubkey)
      ).length;

      const messagesReceived = allMessages.filter(
        account => account.account.recipient.equals(agentPubkey)
      ).length;

      // Get channels created and joined (simplified)
      const allChannels = await this.program.account.channelAccount.all();
      const channelsCreated = allChannels.filter(
        account => account.account.creator.equals(agentPubkey)
      ).length;

      return {
        agentId: agentPubkey,
        messagesSent,
        messagesReceived,
        channelsCreated,
        channelsJoined: 0, // Would need participant data
        reputation: agent.reputation?.toNumber() || 0,
        activityScore: messagesSent + messagesReceived + channelsCreated,
        lastActive: agent.lastUpdated?.toNumber() || 0
      };
    } catch (error) {
      throw new Error(`Failed to get agent stats: ${error.message}`);
    }
  }

  // Private helper methods
  _getCapabilityNames(capabilities) {
    const names = [];
    Object.entries(AGENT_CAPABILITIES).forEach(([name, value]) => {
      if (capabilities & value) {
        names.push(name);
      }
    });
    return names;
  }

  _convertChannelVisibilityFromProgram(programVisibility) {
    if (programVisibility.public !== undefined) return ChannelVisibility.PUBLIC;
    if (programVisibility.private !== undefined) return ChannelVisibility.PRIVATE;
    return ChannelVisibility.PUBLIC;
  }
}
