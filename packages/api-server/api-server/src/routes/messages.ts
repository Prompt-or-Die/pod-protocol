import { Router } from 'express';
import { z } from 'zod';
import { logger } from '../lib/logger.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// Validation schemas
const sendMessageSchema = z.object({
  channelId: z.string().min(1),
  content: z.string().min(1).max(2000),
  type: z.enum(['text', 'image', 'file']).default('text')
});

// GET /api/messages - List messages for a channel (requires authentication)
router.get('/', requireAuth, async (req, res) => {
  try {
    const { channelId, page = 1, limit = 50 } = req.query;
    
    if (!channelId) {
      res.status(400).json({ error: 'channelId is required' });
      return;
    }
    
    // In a real implementation, this would:
    // 1. Verify user has access to the channel
    // 2. Query messages from database for that channel
    // 3. Filter by user permissions
    
    const messages = [
      {
        id: '1',
        channelId: channelId as string,
        content: 'Hello everyone! Welcome to the channel.',
        type: 'text',
        sender: {
          id: req.user!.id,
          publicKey: req.user!.publicKey,
          name: 'User'
        },
        timestamp: new Date().toISOString(),
        status: 'delivered'
      }
    ].filter(message => message.sender.id === req.user!.id); // Only show user's messages for now

    logger.info('Messages retrieved:', { 
      userId: req.user!.id,
      channelId: channelId as string,
      messageCount: messages.length 
    });

    res.json({
      messages,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: messages.length
      }
    });
  } catch (error) {
    logger.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// POST /api/messages - Send a new message (requires authentication)
router.post('/', requireAuth, async (req, res) => {
  try {
    const validatedData = sendMessageSchema.parse(req.body);
    
    // In a real implementation, this would:
    // 1. Verify user has permission to send messages to this channel
    // 2. Save message to database with proper user association
    // 3. Broadcast to channel members via WebSocket
    
    const newMessage = {
      id: Date.now().toString(),
      ...validatedData,
      sender: {
        id: req.user!.id,
        publicKey: req.user!.publicKey,
        name: 'User'
      },
      timestamp: new Date().toISOString(),
      status: 'sent'
    };

    logger.info('Message sent:', { 
      messageId: newMessage.id, 
      channelId: validatedData.channelId,
      senderId: req.user!.id,
      senderPublicKey: req.user!.publicKey 
    });

    res.status(201).json({ 
      message: 'Message sent successfully',
      data: newMessage 
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ 
        error: 'Validation failed', 
        details: error.errors 
      });
      return;
    }
    
    logger.error('Error sending message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

export default router; 