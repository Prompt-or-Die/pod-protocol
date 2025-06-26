import { Router } from 'express';
import { z } from 'zod';
import { logger } from '../index.js';

const router = Router();

// Validation schemas
const createChannelSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  isPrivate: z.boolean().default(false),
  maxMembers: z.number().min(2).max(1000).default(100)
});

// GET /api/channels - List user's channels
router.get('/', async (req, res) => {
  try {
    const channels = [
      {
        id: '1',
        name: 'General Discussion',
        description: 'Main channel for general chat',
        isPrivate: false,
        memberCount: 45,
        createdAt: new Date().toISOString(),
        owner: req.user?.publicKey
      }
    ];

    res.json({ channels });
  } catch (error) {
    logger.error('Error fetching channels:', error);
    res.status(500).json({ error: 'Failed to fetch channels' });
  }
});

// POST /api/channels - Create new channel  
router.post('/', async (req, res) => {
  try {
    const validatedData = createChannelSchema.parse(req.body);
    
    const newChannel = {
      id: Date.now().toString(),
      ...validatedData,
      memberCount: 1,
      createdAt: new Date().toISOString(),
      owner: req.user?.publicKey
    };

    res.status(201).json({ 
      message: 'Channel created successfully',
      channel: newChannel 
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ 
        error: 'Validation failed', 
        details: error.errors 
      });
      return;
    }
    
    logger.error('Error creating channel:', error);
    res.status(500).json({ error: 'Failed to create channel' });
  }
});

export default router; 