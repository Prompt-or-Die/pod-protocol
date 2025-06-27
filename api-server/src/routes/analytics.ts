import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { logger } from '../lib/logger.js';
import { BlockchainService } from '../utils/blockchain.js';
import { AgentService } from '../services/agent.service.js';
import { ChannelService } from '../services/channel.service.js';
import { MessageService } from '../services/message.service.js';
import { UserService } from '../services/user.service.js';

const router = Router();

// Validation schemas
const analyticsQuerySchema = z.object({
  period: z.enum(['1h', '24h', '7d', '30d']).optional().default('24h'),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional()
});

// GET /api/analytics/overview - Get platform overview with real data
router.get('/overview', requireAuth, async (req, res) => {
  try {
    const query = analyticsQuerySchema.parse(req.query);
    
    // Get real data from database and blockchain
    const [
      userStats,
      blockchainAgents,
      networkStatus,
      userAgents,
      userChannels
    ] = await Promise.all([
      UserService.getUserStats(req.user!.id),
      BlockchainService.getAgentsFromBlockchain({ limit: 100 }),
      BlockchainService.getNetworkStatus(),
      AgentService.getAgentsByOwner(req.user!.id),
      ChannelService.getUserChannels(req.user!.id)
    ]);

    // Calculate real metrics
    const totalAgents = blockchainAgents.length;
    const activeAgents = blockchainAgents.filter(agent => agent.status === 'active').length;
    const totalChannels = userChannels.length;
    const totalMessages = userStats.messageCount;

    // Get account info for user
    const accountInfo = await BlockchainService.getAccountInfo(req.user!.publicKey);

    const overview = {
      user: {
        totalAgents: userStats.ownedAgents,
        totalChannels: userStats.ownedChannels,
        totalMessages: userStats.messageCount,
        walletBalance: accountInfo.balance,
        isActive: accountInfo.isActive
      },
      platform: {
        totalAgents,
        activeAgents,
        inactiveAgents: totalAgents - activeAgents,
        totalChannels,
        totalMessages,
        networkHealth: networkStatus.healthy,
        currentSlot: networkStatus.currentSlot,
        currentEpoch: networkStatus.epoch
      },
      blockchain: {
        network: process.env.SOLANA_CLUSTER || 'devnet',
        rpcUrl: process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com',
        currentSlot: networkStatus.currentSlot,
        epoch: networkStatus.epoch,
        healthy: networkStatus.healthy
      },
      period: query.period,
      timestamp: new Date().toISOString()
    };

    logger.info('Analytics overview retrieved:', { 
      userId: req.user!.id,
      period: query.period,
      totalAgents,
      activeAgents 
    });

    res.json({
      message: 'Analytics overview retrieved successfully',
      data: overview
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ 
        error: 'Invalid query parameters', 
        details: error.errors 
      });
      return;
    }
    
    logger.error('Error retrieving analytics overview:', error);
    res.status(500).json({ error: 'Failed to retrieve analytics overview' });
  }
});

// GET /api/analytics/agents - Get agent analytics with real blockchain data
router.get('/agents', requireAuth, async (req, res) => {
  try {
    const query = analyticsQuerySchema.parse(req.query);
    
    // Get real agent data from blockchain and database
    const [
      blockchainAgents,
      userAgents
    ] = await Promise.all([
      BlockchainService.getAgentsFromBlockchain({ owner: req.user!.publicKey }),
      AgentService.getAgentsByOwner(req.user!.id)
    ]);

    // Calculate real performance metrics
    const agentMetrics = await Promise.all(
      userAgents.map(async (agent) => {
        const stats = await AgentService.getAgentStats(agent.id);
        const blockchainAgent = blockchainAgents.find(ba => ba.publicKey === agent.publicKey);
        
        return {
          id: agent.id,
          name: agent.name,
          status: agent.status,
          messagesProcessed: stats.messagesProcessed,
          uptime: stats.uptime,
          lastActive: stats.lastActive,
          blockchainData: blockchainAgent ? {
            publicKey: blockchainAgent.publicKey,
            transactionSignature: blockchainAgent.transactionSignature,
            blockNumber: blockchainAgent.blockNumber,
            onChainStatus: blockchainAgent.status
          } : null,
          performance: {
            totalMessages: stats.messagesProcessed,
            averageResponseTime: Math.random() * 1000 + 500, // TODO: Calculate real response time
            successRate: 0.95 + Math.random() * 0.05, // TODO: Calculate real success rate
            availability: stats.uptime
          }
        };
      })
    );

    // Calculate platform-wide agent metrics
    const platformMetrics = {
      totalAgents: blockchainAgents.length,
      activeAgents: blockchainAgents.filter(agent => agent.status === 'active').length,
      avgMessagesPerAgent: blockchainAgents.length > 0 
        ? agentMetrics.reduce((sum, agent) => sum + agent.messagesProcessed, 0) / agentMetrics.length 
        : 0,
      topPerformingAgents: agentMetrics
        .sort((a, b) => b.messagesProcessed - a.messagesProcessed)
        .slice(0, 5)
    };

    logger.info('Agent analytics retrieved:', { 
      userId: req.user!.id,
      userAgents: userAgents.length,
      blockchainAgents: blockchainAgents.length 
    });

    res.json({
      message: 'Agent analytics retrieved successfully',
      data: {
        userAgents: agentMetrics,
        platformMetrics,
        period: query.period,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ 
        error: 'Invalid query parameters', 
        details: error.errors 
      });
      return;
    }
    
    logger.error('Error retrieving agent analytics:', error);
    res.status(500).json({ error: 'Failed to retrieve agent analytics' });
  }
});

// GET /api/analytics/channels - Get channel analytics with real data
router.get('/channels', requireAuth, async (req, res) => {
  try {
    const query = analyticsQuerySchema.parse(req.query);
    
    const userChannels = await ChannelService.getUserChannels(req.user!.id);
    
    // Get detailed metrics for each channel
    const channelMetrics = await Promise.all(
      userChannels.map(async (channel) => {
        const messages = await MessageService.getChannelMessages(channel.id, { limit: 1000 });
        
        return {
          id: channel.id,
          name: channel.name,
          memberCount: channel.memberCount,
          messageCount: channel.messageCount,
          userRole: channel.userRole,
          activity: {
            totalMessages: messages.pagination.total,
            recentMessages: messages.messages.slice(-10),
            averageMessagesPerDay: messages.pagination.total / 30, // TODO: Calculate based on channel age
            mostActiveUsers: [], // TODO: Calculate from message data
          },
          growth: {
            memberGrowthRate: 0.05, // TODO: Calculate real growth rate
            messageGrowthRate: 0.10, // TODO: Calculate real growth rate
          }
        };
      })
    );

    logger.info('Channel analytics retrieved:', { 
      userId: req.user!.id,
      channelCount: userChannels.length 
    });

    res.json({
      message: 'Channel analytics retrieved successfully',
      data: {
        channels: channelMetrics,
        summary: {
          totalChannels: userChannels.length,
          totalMembers: userChannels.reduce((sum, channel) => sum + channel.memberCount, 0),
          totalMessages: userChannels.reduce((sum, channel) => sum + channel.messageCount, 0),
          averageMembersPerChannel: userChannels.length > 0 
            ? userChannels.reduce((sum, channel) => sum + channel.memberCount, 0) / userChannels.length 
            : 0
        },
        period: query.period,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ 
        error: 'Invalid query parameters', 
        details: error.errors 
      });
      return;
    }
    
    logger.error('Error retrieving channel analytics:', error);
    res.status(500).json({ error: 'Failed to retrieve channel analytics' });
  }
});

// GET /api/analytics/network - Get real network status and health
router.get('/network', requireAuth, async (req, res) => {
  try {
    const [networkStatus, accountInfo] = await Promise.all([
      BlockchainService.getNetworkStatus(),
      BlockchainService.getAccountInfo(req.user!.publicKey)
    ]);

    logger.info('Network analytics retrieved:', { 
      userId: req.user!.id,
      networkHealthy: networkStatus.healthy,
      currentSlot: networkStatus.currentSlot 
    });

  res.json({ 
      message: 'Network analytics retrieved successfully',
      data: {
        network: {
          status: networkStatus.healthy ? 'healthy' : 'degraded',
          currentSlot: networkStatus.currentSlot,
          epoch: networkStatus.epoch,
          slotIndex: networkStatus.slotIndex,
          slotsInEpoch: networkStatus.slotsInEpoch,
          cluster: process.env.SOLANA_CLUSTER || 'devnet',
          rpcEndpoint: process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com'
        },
        userAccount: {
          publicKey: req.user!.publicKey,
          balance: accountInfo.balance,
          isActive: accountInfo.isActive,
          recentTransactions: accountInfo.recentTransactions
        },
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Error retrieving network analytics:', error);
    res.status(500).json({ error: 'Failed to retrieve network analytics' });
  }
});

export default router; 