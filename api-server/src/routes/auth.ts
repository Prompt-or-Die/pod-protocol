import { Router } from 'express';
import { z } from 'zod';
import jwt from 'jsonwebtoken';
import { logger } from '../index.js';
import { optionalAuth } from '../middleware/auth.js';

const router = Router();

// Validation schemas
const loginSchema = z.object({
  publicKey: z.string().min(32).max(48),
  signature: z.string().min(1),
  message: z.string().min(1)
});

const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1)
});

// POST /api/auth/login - Wallet-based authentication
router.post('/login', async (req, res) => {
  try {
    const validatedData = loginSchema.parse(req.body);
    const { publicKey, signature, message } = validatedData;
    
    // TODO: Verify signature against message using Solana crypto
    // For now, we'll create a token if the publicKey is provided
    
    if (!process.env.JWT_SECRET) {
      res.status(500).json({ error: 'Server configuration error' });
      return;
    }
    
    const userId = `user_${publicKey.slice(0, 8)}`;
    
    // Create JWT token
    const accessToken = jwt.sign(
      {
        publicKey,
        id: userId,
        walletAddress: publicKey
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    // Create refresh token (longer lived)
    const refreshToken = jwt.sign(
      {
        publicKey,
        id: userId,
        type: 'refresh'
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    logger.info('User logged in:', { publicKey, userId });
    
    res.json({
      message: 'Login successful',
      accessToken,
      refreshToken,
      user: {
        id: userId,
        publicKey,
        walletAddress: publicKey
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
    
    logger.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// POST /api/auth/refresh - Refresh access token
router.post('/refresh', async (req, res) => {
  try {
    const validatedData = refreshTokenSchema.parse(req.body);
    const { refreshToken } = validatedData;
    
    if (!process.env.JWT_SECRET) {
      res.status(500).json({ error: 'Server configuration error' });
      return;
    }
    
    try {
      const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET) as any;
      
      if (decoded.type !== 'refresh') {
        res.status(401).json({ error: 'Invalid refresh token' });
        return;
      }
      
      // Create new access token
      const accessToken = jwt.sign(
        {
          publicKey: decoded.publicKey,
          id: decoded.id,
          walletAddress: decoded.publicKey
        },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );
      
      res.json({
        message: 'Token refreshed successfully',
        accessToken
      });
    } catch (jwtError) {
      res.status(401).json({ error: 'Invalid or expired refresh token' });
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ 
        error: 'Validation failed', 
        details: error.errors 
      });
      return;
    }
    
    logger.error('Token refresh error:', error);
    res.status(500).json({ error: 'Token refresh failed' });
  }
});

// GET /api/auth/me - Get current user info
router.get('/me', optionalAuth, (req, res) => {
  if (!req.user) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }
  
  res.json({
    user: req.user
  });
});

// POST /api/auth/logout - Logout (client-side token removal)
router.post('/logout', optionalAuth, (req, res) => {
  // Since JWTs are stateless, we can't invalidate them server-side
  // This endpoint exists for consistency and future blacklist implementation
  
  if (req.user) {
    logger.info('User logged out:', { userId: req.user.id });
  }
  
  res.json({ message: 'Logout successful' });
});

export default router; 