import { Router } from 'express';
import { z } from 'zod';
import jwt from 'jsonwebtoken';
import { logger } from '../lib/logger.js';
import { optionalAuth } from '../middleware/auth.js';
import { SolanaAuthUtils } from '../utils/solana-auth.js';
import { UserService } from '../services/user.service.js';

const router = Router();

// Validation schemas
const getNonceSchema = z.object({
  publicKey: z.string().min(32).max(48)
});

const loginSchema = z.object({
  publicKey: z.string().min(32).max(48),
  signature: z.string().min(1),
  message: z.string().min(1)
});

const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1)
});

// In-memory nonce storage (in production, use Redis or database)
const nonceStore = new Map<string, { nonce: string, createdAt: Date }>();

// Clean up expired nonces every 15 minutes
setInterval(() => {
  const now = new Date();
  for (const [publicKey, data] of nonceStore.entries()) {
    const ageMinutes = (now.getTime() - data.createdAt.getTime()) / (1000 * 60);
    if (ageMinutes > 15) {
      nonceStore.delete(publicKey);
    }
  }
}, 15 * 60 * 1000);

// GET /api/auth/nonce - Get authentication nonce
router.get('/nonce/:publicKey', async (req, res) => {
  try {
    const { publicKey } = req.params;
    
    // Validate public key format
    if (!SolanaAuthUtils.isValidPublicKey(publicKey)) {
      res.status(400).json({ error: 'Invalid public key format' });
      return;
    }
    
    // Generate nonce
    const nonce = SolanaAuthUtils.generateNonce();
    const domain = req.get('host') || 'localhost:4000';
    
    // Store nonce temporarily
    nonceStore.set(publicKey, { nonce, createdAt: new Date() });
    
    // Create auth message
    const message = SolanaAuthUtils.createAuthMessage(publicKey, domain, nonce);
    
    logger.info('Nonce generated for authentication:', { publicKey: publicKey.slice(0, 8) + '...' });
    
    res.json({
      nonce,
      message,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10 minutes
    });
  } catch (error) {
    logger.error('Nonce generation error:', error);
    res.status(500).json({ error: 'Failed to generate nonce' });
  }
});

// POST /api/auth/login - Wallet-based authentication with real signature verification
router.post('/login', async (req, res) => {
  try {
    const validatedData = loginSchema.parse(req.body);
    const { publicKey, signature, message } = validatedData;
    
    // Validate public key format
    if (!SolanaAuthUtils.isValidPublicKey(publicKey)) {
      res.status(400).json({ error: 'Invalid public key format' });
      return;
    }
    
    // Parse and validate message
    const parsedMessage = SolanaAuthUtils.parseAuthMessage(message);
    if (!parsedMessage) {
      res.status(400).json({ error: 'Invalid message format' });
      return;
    }
    
    // Check if message is for the correct public key
    if (parsedMessage.address !== publicKey) {
      res.status(400).json({ error: 'Message address does not match public key' });
      return;
    }
    
    // Check message expiration (10 minutes max)
    if (SolanaAuthUtils.isMessageExpired(parsedMessage, 10)) {
      res.status(400).json({ error: 'Authentication message has expired' });
      return;
    }
    
    // Verify nonce was issued by us
    const storedNonce = nonceStore.get(publicKey);
    if (!storedNonce || storedNonce.nonce !== parsedMessage.nonce) {
      res.status(400).json({ error: 'Invalid or expired nonce' });
      return;
    }
    
    // Verify signature
    const isValidSignature = await SolanaAuthUtils.verifySignature(
      message,
      signature,
      publicKey
    );
    
    if (!isValidSignature) {
      res.status(401).json({ error: 'Invalid signature' });
      return;
    }
    
    // Clean up used nonce
    nonceStore.delete(publicKey);
    
    if (!process.env.JWT_SECRET) {
      res.status(500).json({ error: 'Server configuration error' });
      return;
    }
    
    // Create or get user in database
    const user = await UserService.createOrGetUser({
      publicKey,
      walletAddress: publicKey
    });
    
    // Create JWT token with database user ID
    const accessToken = jwt.sign(
      {
        publicKey: user.publicKey,
        id: user.id,
        walletAddress: user.walletAddress,
        authenticatedAt: new Date().toISOString()
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    // Create refresh token (longer lived)
    const refreshToken = jwt.sign(
      {
        publicKey: user.publicKey,
        id: user.id,
        type: 'refresh'
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    logger.info('User successfully authenticated:', { 
      publicKey: user.publicKey.slice(0, 8) + '...', 
      userId: user.id 
    });
    
    res.json({
      message: 'Authentication successful',
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        publicKey: user.publicKey,
        walletAddress: user.walletAddress,
        authenticatedAt: user.lastAuthenticatedAt?.toISOString(),
        createdAt: user.createdAt.toISOString()
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
    
    logger.error('Authentication error:', error);
    res.status(500).json({ error: 'Authentication failed' });
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
      
      // Validate public key is still valid
      if (!SolanaAuthUtils.isValidPublicKey(decoded.publicKey)) {
        res.status(401).json({ error: 'Invalid public key in token' });
        return;
      }
      
      // Create new access token
      const accessToken = jwt.sign(
        {
          publicKey: decoded.publicKey,
          id: decoded.id,
          walletAddress: decoded.publicKey,
          refreshedAt: new Date().toISOString()
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
    user: {
      ...req.user,
      publicKeyTruncated: req.user.publicKey.slice(0, 8) + '...' + req.user.publicKey.slice(-8)
    }
  });
});

// POST /api/auth/logout - Logout (client-side token removal)
router.post('/logout', optionalAuth, (req, res) => {
  // Since JWTs are stateless, we can't invalidate them server-side
  // This endpoint exists for consistency and future blacklist implementation
  
  if (req.user) {
    logger.info('User logged out:', { 
      userId: req.user.id,
      publicKey: req.user.publicKey.slice(0, 8) + '...'
    });
  }
  
  res.json({ message: 'Logout successful' });
});

export default router; 