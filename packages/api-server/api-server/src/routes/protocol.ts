import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import { logger } from '../lib/logger.js';
import { 
  AgentProtocolService, 
  AgentDiscoveryMessageSchema, 
  AgentProtocolMessageSchema 
} from '../utils/agent-protocol.js';

const router = Router();

// Validation schemas
const discoverAgentsSchema = z.object({
  capability: z.string().optional(),
  limit: z.string().transform(Number).optional(),
  includeInactive: z.string().transform(Boolean).optional()
});

const registerAgentSchema = AgentDiscoveryMessageSchema;
const protocolMessageSchema = AgentProtocolMessageSchema;

// GET /api/protocol/discover - Discover available agents
router.get('/discover', optionalAuth, async (req, res) => {
  try {
    const query = discoverAgentsSchema.parse(req.query);
    const { capability, limit = 50, includeInactive = true } = query;
    
    let agents = await AgentProtocolService.discoverAgents(capability);
    
    // Filter by active status if requested
    if (!includeInactive) {
      agents = agents.filter(agent => 
        agent.metadata?.status === 'active' || 
        Date.now() - new Date(agent.lastSeen).getTime() < 300000 // 5 minutes
      );
    }
    
    // Apply limit
    agents = agents.slice(0, limit);
    
    logger.info('Agent discovery request:', { 
      capability: capability || 'all',
      found: agents.length,
      userId: req.user?.id || 'anonymous'
    });
    
    res.json({
      message: 'Agents discovered successfully',
      data: {
        agents,
        count: agents.length,
        capability: capability || null,
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
    
    logger.error('Error discovering agents:', error);
    res.status(500).json({ error: 'Failed to discover agents' });
  }
});

// POST /api/protocol/register - Register an agent with the protocol
router.post('/register', requireAuth, async (req, res) => {
  try {
    const agentData = registerAgentSchema.parse(req.body);
    
    // Ensure the agent belongs to the authenticated user
    if (agentData.publicKey !== req.user!.publicKey) {
      // Allow registration of agents owned by the user
      // TODO: Verify ownership through database or blockchain
    }
    
    const success = await AgentProtocolService.registerAgent(agentData);
    
    if (!success) {
      res.status(400).json({ error: 'Failed to register agent' });
      return;
    }
    
    // Broadcast discovery after registration
    await AgentProtocolService.broadcastDiscovery(agentData.agentId);
    
    logger.info('Agent registered with protocol:', { 
      agentId: agentData.agentId,
      name: agentData.name,
      capabilities: agentData.capabilities.length,
      userId: req.user!.id 
    });
    
    res.status(201).json({
      message: 'Agent registered successfully',
      data: {
        agentId: agentData.agentId,
        name: agentData.name,
        capabilities: agentData.capabilities.length,
        registeredAt: new Date().toISOString()
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ 
        error: 'Validation failed', 
        details: error.errors 
      });
      return;
    }
    
    logger.error('Error registering agent:', error);
    res.status(500).json({ error: 'Failed to register agent' });
  }
});

// POST /api/protocol/message - Send a protocol message
router.post('/message', requireAuth, async (req, res) => {
  try {
    const messageData = protocolMessageSchema.parse(req.body);
    
    // Ensure the message is from the authenticated user
    if (messageData.from !== req.user!.publicKey) {
      res.status(403).json({ error: 'Cannot send message from different public key' });
      return;
    }
    
    const success = await AgentProtocolService.routeMessage(messageData);
    
    if (!success) {
      res.status(400).json({ error: 'Failed to route message' });
      return;
    }
    
    logger.info('Protocol message sent:', { 
      type: messageData.type,
      from: messageData.from.slice(0, 8) + '...',
      to: messageData.to?.slice(0, 8) + '...',
      messageId: messageData.id,
      userId: req.user!.id 
    });
    
    res.json({
      message: 'Protocol message sent successfully',
      data: {
        messageId: messageData.id,
        type: messageData.type,
        timestamp: messageData.timestamp
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ 
        error: 'Validation failed', 
        details: error.errors 
      });
      return;
    }
    
    logger.error('Error sending protocol message:', error);
    res.status(500).json({ error: 'Failed to send protocol message' });
  }
});

// GET /api/protocol/capabilities - Get standard capability definitions
router.get('/capabilities', (req, res) => {
  try {
    const standardCapabilities = AgentProtocolService.getStandardCapabilities();
    
    res.json({
      message: 'Standard capabilities retrieved successfully',
      data: {
        capabilities: standardCapabilities,
        count: Object.keys(standardCapabilities).length,
        version: '1.0'
      }
    });
  } catch (error) {
    logger.error('Error retrieving capabilities:', error);
    res.status(500).json({ error: 'Failed to retrieve capabilities' });
  }
});

// GET /api/protocol/stats - Get protocol statistics
router.get('/stats', optionalAuth, async (req, res) => {
  try {
    const stats = AgentProtocolService.getProtocolStats();
    
    logger.info('Protocol stats requested:', { 
      userId: req.user?.id || 'anonymous',
      totalAgents: stats.totalAgents 
    });
    
    res.json({
      message: 'Protocol statistics retrieved successfully',
      data: {
        ...stats,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Error retrieving protocol stats:', error);
    res.status(500).json({ error: 'Failed to retrieve protocol statistics' });
  }
});

// GET /api/protocol/agent/:agentId/capabilities - Get specific agent capabilities
router.get('/agent/:agentId/capabilities', optionalAuth, (req, res) => {
  try {
    const { agentId } = req.params;
    const capabilities = AgentProtocolService.getAgentCapabilities(agentId);
    
    logger.info('Agent capabilities requested:', { 
      agentId: agentId.slice(0, 8) + '...',
      capabilityCount: capabilities.length,
      userId: req.user?.id || 'anonymous'
    });
    
    res.json({
      message: 'Agent capabilities retrieved successfully',
      data: {
        agentId,
        capabilities,
        count: capabilities.length,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Error retrieving agent capabilities:', error);
    res.status(500).json({ error: 'Failed to retrieve agent capabilities' });
  }
});

// PUT /api/protocol/agent/:agentId/ping - Update agent last seen timestamp
router.put('/agent/:agentId/ping', requireAuth, (req, res) => {
  try {
    const { agentId } = req.params;
    
    // TODO: Verify the user owns this agent
    
    AgentProtocolService.updateAgentLastSeen(agentId);
    
    logger.info('Agent ping updated:', { 
      agentId: agentId.slice(0, 8) + '...',
      userId: req.user!.id 
    });
    
    res.json({
      message: 'Agent last seen updated successfully',
      data: {
        agentId,
        lastSeen: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Error updating agent ping:', error);
    res.status(500).json({ error: 'Failed to update agent ping' });
  }
});

export default router; 