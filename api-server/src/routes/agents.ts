import { Router } from 'express';
import { z } from 'zod';
import { PodComClient } from '@pod-protocol/sdk';
import { logger } from '../index.js';

const router = Router();

// Validation schemas
const createAgentSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500),
  capabilities: z.array(z.string()),
  metadata: z.record(z.any()).optional()
});

const updateAgentSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  capabilities: z.array(z.string()).optional(),
  metadata: z.record(z.any()).optional()
});

// GET /api/agents - List all agents
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    
    // TODO: Connect to actual PodComClient
    const agents = [
      {
        id: '1',
        name: 'Trading Bot',
        description: 'Automated trading assistant',
        capabilities: ['trading', 'analysis', 'notifications'],
        status: 'active',
        createdAt: new Date().toISOString(),
        owner: req.user?.publicKey
      }
    ];

    res.json({
      agents,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: agents.length,
        totalPages: Math.ceil(agents.length / Number(limit))
      }
    });
  } catch (error) {
    logger.error('Error fetching agents:', error);
    res.status(500).json({ error: 'Failed to fetch agents' });
  }
});

// GET /api/agents/:id - Get specific agent
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // TODO: Connect to actual PodComClient
    const agent = {
      id,
      name: 'Trading Bot',
      description: 'Automated trading assistant',
      capabilities: ['trading', 'analysis', 'notifications'],
      status: 'active',
      createdAt: new Date().toISOString(),
      owner: req.user?.publicKey,
      stats: {
        messagesProcessed: 1250,
        uptime: '99.5%',
        lastActive: new Date().toISOString()
      }
    };

    res.json({ agent });
  } catch (error) {
    logger.error('Error fetching agent:', error);
    res.status(500).json({ error: 'Failed to fetch agent' });
  }
});

// POST /api/agents - Create new agent
router.post('/', async (req, res) => {
  try {
    const validatedData = createAgentSchema.parse(req.body);
    
    // TODO: Connect to actual PodComClient
    const newAgent = {
      id: Date.now().toString(),
      ...validatedData,
      status: 'active',
      createdAt: new Date().toISOString(),
      owner: req.user?.publicKey
    };

    logger.info('Agent created:', { agentId: newAgent.id, owner: req.user?.publicKey });
    
    res.status(201).json({ 
      message: 'Agent created successfully',
      agent: newAgent 
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: error.errors 
      });
    }
    
    logger.error('Error creating agent:', error);
    res.status(500).json({ error: 'Failed to create agent' });
  }
});

// PUT /api/agents/:id - Update agent
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const validatedData = updateAgentSchema.parse(req.body);
    
    // TODO: Connect to actual PodComClient and verify ownership
    const updatedAgent = {
      id,
      name: 'Updated Trading Bot',
      description: 'Updated automated trading assistant',
      capabilities: ['trading', 'analysis', 'notifications'],
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      owner: req.user?.publicKey,
      ...validatedData
    };

    logger.info('Agent updated:', { agentId: id, owner: req.user?.publicKey });
    
    res.json({ 
      message: 'Agent updated successfully',
      agent: updatedAgent 
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: error.errors 
      });
    }
    
    logger.error('Error updating agent:', error);
    res.status(500).json({ error: 'Failed to update agent' });
  }
});

// DELETE /api/agents/:id - Delete agent
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // TODO: Connect to actual PodComClient and verify ownership
    logger.info('Agent deleted:', { agentId: id, owner: req.user?.publicKey });
    
    res.json({ message: 'Agent deleted successfully' });
  } catch (error) {
    logger.error('Error deleting agent:', error);
    res.status(500).json({ error: 'Failed to delete agent' });
  }
});

export default router; 