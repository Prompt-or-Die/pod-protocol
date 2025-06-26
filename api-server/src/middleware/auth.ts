import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { logger } from '../index.js';

interface JWTPayload {
  publicKey: string;
  id: string;
  walletAddress: string;
  iat?: number;
  exp?: number;
}

export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'No valid authorization token provided' });
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    if (!process.env.JWT_SECRET) {
      logger.error('JWT_SECRET not configured');
      res.status(500).json({ error: 'Server configuration error' });
      return;
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET) as JWTPayload;
      
      // Attach user info to request
      req.user = {
        publicKey: decoded.publicKey,
        id: decoded.id,
        walletAddress: decoded.walletAddress
      };
      
      logger.debug('User authenticated', { 
        publicKey: decoded.publicKey,
        endpoint: req.path 
      });
      
      next();
    } catch (jwtError) {
      logger.warn('Invalid JWT token', { error: jwtError });
      res.status(401).json({ error: 'Invalid or expired token' });
      return;
    }
  } catch (error) {
    logger.error('Auth middleware error:', error);
    res.status(500).json({ error: 'Authentication error' });
    return;
  }
};

export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ') && process.env.JWT_SECRET) {
      const token = authHeader.substring(7);
      
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET) as JWTPayload;
        req.user = {
          publicKey: decoded.publicKey,
          id: decoded.id,
          walletAddress: decoded.walletAddress
        };
      } catch (jwtError) {
        // Ignore JWT errors for optional auth
        logger.debug('Optional auth failed, continuing without user', { error: jwtError });
      }
    }
    
    next();
  } catch (error) {
    logger.error('Optional auth middleware error:', error);
    next(); // Continue without auth for optional middleware
  }
}; 