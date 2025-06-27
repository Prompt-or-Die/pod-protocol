import { Router } from 'express';
import { z } from 'zod';
import { logger } from '../lib/logger.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// Validation schemas
const createChannelSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  isPrivate: z.boolean().default(false),
  maxMembers: z.number().min(2).max(1000).default(100)
});

// GET /api/channels - List user's channels (requires authentication)
router.get('/', requireAuth, async (req, res) => {
  try {
    // In a real implementation, this would query the database for channels
    // where the user is a member or owner
    const channels = [
      {
        id: '1',
        name: 'General Discussion',
        description: 'Main channel for general chat',
        isPrivate: false,
        memberCount: 45,
        createdAt: new Date().toISOString(),
        owner: req.user!.publicKey, // Only show user's channels
        ownerId: req.user!.id
      }
    ].filter(channel => channel.ownerId === req.user!.id);

    logger.info('User channels retrieved:', { 
      userId: req.user!.id,
      channelCount: channels.length 
    });

    res.json({ 
      channels,
      count: channels.length 
    });
  } catch (error) {
    logger.error('Error fetching channels:', error);
    res.status(500).json({ error: 'Failed to fetch channels' });
  }
});

// POST /api/channels - Create new channel (requires authentication)
router.post('/', requireAuth, async (req, res) => {
  try {
    const validatedData = createChannelSchema.parse(req.body);
    
    const newChannel = {
      id: Date.now().toString(),
      ...validatedData,
      memberCount: 1,
      createdAt: new Date().toISOString(),
      owner: req.user!.publicKey,
      ownerId: req.user!.id // Associate with authenticated user
    };

    // In a real implementation, this would save to database with proper user association
    logger.info('Channel created:', { 
      channelId: newChannel.id,
      channelName: newChannel.name,
      ownerId: req.user!.id,
      ownerPublicKey: req.user!.publicKey 
    });

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