import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { logger } from '../lib/logger.js';
import { AgentService } from '../services/agent.service.js';
import { AgentStatus } from '@prisma/client';

const router = Router();

// Validation schemas
const createAgentSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  capabilities: z.array(z.string()).min(1).max(20),
  metadata: z.record(z.any()).optional(),
  publicKey: z.string().optional(),
  programId: z.string().optional()
});

const updateAgentSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  capabilities: z.array(z.string()).min(1).max(20).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'MAINTENANCE', 'DISABLED']).optional(),
  metadata: z.record(z.any()).optional()
});

const querySchema = z.object({
  page: z.string().transform(Number).optional(),
  limit: z.string().transform(Number).optional(),
  search: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'MAINTENANCE', 'DISABLED']).optional(),
  owned: z.string().transform(Boolean).optional()
});

// GET /api/agents - Get all agents with pagination and filtering
router.get('/', requireAuth, async (req, res) => {
  try {
    const query = querySchema.parse(req.query);
    const { page = 1, limit = 20, search, status, owned } = query;
    
    const options = {
      page,
      limit: Math.min(limit, 100), // Cap at 100 per page
      search,
      status: status as AgentStatus | undefined,
      ownerId: owned ? req.user!.id : undefined
    };
    
    const result = await AgentService.getAgents(options);
    
    logger.info('Agents retrieved:', { 
      count: result.agents.length, 
      total: result.pagination.total,
      userId: req.user!.id 
    });
    
    res.json({
      message: 'Agents retrieved successfully',
      data: result.agents,
      pagination: result.pagination
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ 
        error: 'Invalid query parameters', 
        details: error.errors 
      });
      return;
    }
    
    logger.error('Error retrieving agents:', error);
    res.status(500).json({ error: 'Failed to retrieve agents' });
  }
});

// GET /api/agents/:id - Get agent by ID
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    
    const agent = await AgentService.getAgentById(id, true); // Include stats
    
    if (!agent) {
      res.status(404).json({ error: 'Agent not found' });
      return;
    }
    
    logger.info('Agent retrieved:', { agentId: id, userId: req.user!.id });
    
    res.json({
      message: 'Agent retrieved successfully',
      data: agent
    });
  } catch (error) {
    logger.error('Error retrieving agent:', error);
    res.status(500).json({ error: 'Failed to retrieve agent' });
  }
});

// POST /api/agents - Create new agent
router.post('/', requireAuth, async (req, res) => {
  try {
    const validatedData = createAgentSchema.parse(req.body);
    
    const agent = await AgentService.createAgent({
      ...validatedData,
      ownerId: req.user!.id
    });
    
    logger.info('Agent created:', { 
      agentId: agent.id, 
      name: agent.name,
      ownerId: req.user!.id 
    });
    
    res.status(201).json({
      message: 'Agent created successfully',
      data: agent
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ 
        error: 'Validation failed', 
        details: error.errors 
      });
      return;
    }
    
    logger.error('Error creating agent:', error);
    res.status(500).json({ error: 'Failed to create agent' });
  }
});

// PUT /api/agents/:id - Update agent
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const validatedData = updateAgentSchema.parse(req.body);
    
    // Check if agent exists and user owns it
    const existingAgent = await AgentService.getAgentById(id);
    if (!existingAgent) {
      res.status(404).json({ error: 'Agent not found' });
      return;
    }
    
    if (existingAgent.ownerId !== req.user!.id) {
      res.status(403).json({ error: 'Not authorized to update this agent' });
      return;
    }
    
    const agent = await AgentService.updateAgent(id, validatedData);
    
    logger.info('Agent updated:', { 
      agentId: id, 
      updates: Object.keys(validatedData),
      userId: req.user!.id 
    });
    
    res.json({
      message: 'Agent updated successfully',
      data: agent
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ 
        error: 'Validation failed', 
        details: error.errors 
      });
      return;
    }
    
    logger.error('Error updating agent:', error);
    res.status(500).json({ error: 'Failed to update agent' });
  }
});

// DELETE /api/agents/:id - Delete agent
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if agent exists and user owns it
    const agent = await AgentService.getAgentById(id);
    if (!agent) {
      res.status(404).json({ error: 'Agent not found' });
      return;
    }
    
    if (agent.ownerId !== req.user!.id) {
      res.status(403).json({ error: 'Not authorized to delete this agent' });
      return;
    }
    
    await AgentService.deleteAgent(id);
    
    logger.info('Agent deleted:', { agentId: id, userId: req.user!.id });
    
    res.json({ message: 'Agent deleted successfully' });
  } catch (error) {
    logger.error('Error deleting agent:', error);
    res.status(500).json({ error: 'Failed to delete agent' });
  }
});

// GET /api/agents/my/owned - Get user's owned agents
router.get('/my/owned', requireAuth, async (req, res) => {
  try {
    const agents = await AgentService.getAgentsByOwner(req.user!.id);
    
    logger.info('User owned agents retrieved:', { 
      count: agents.length, 
      userId: req.user!.id 
    });
    
    res.json({
      message: 'Owned agents retrieved successfully',
      data: agents
    });
  } catch (error) {
    logger.error('Error retrieving owned agents:', error);
    res.status(500).json({ error: 'Failed to retrieve owned agents' });
  }
});

export default router; 