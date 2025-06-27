import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { logger } from '../lib/logger.js';

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

export const optionalAuth = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }
  
  const token = authHeader.substring(7);
  
  if (!process.env.JWT_SECRET) {
    logger.error('JWT_SECRET not configured');
    return next();
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET) as any;
    req.user = {
      id: decoded.id,
      publicKey: decoded.publicKey,
      walletAddress: decoded.walletAddress,
      authenticatedAt: decoded.authenticatedAt,
      refreshedAt: decoded.refreshedAt
    };
  } catch (error) {
    logger.warn('Invalid JWT token:', error);
  }
  
  next();
};

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authorization header required' });
    return;
  }
  
  const token = authHeader.substring(7);
  
  if (!process.env.JWT_SECRET) {
    logger.error('JWT_SECRET not configured');
    res.status(500).json({ error: 'Server configuration error' });
    return;
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET) as any;
    
    req.user = {
      id: decoded.id,
      publicKey: decoded.publicKey,
      walletAddress: decoded.walletAddress,
      authenticatedAt: decoded.authenticatedAt,
      refreshedAt: decoded.refreshedAt
    };
    
    next();
  } catch (error) {
    logger.warn('Authentication failed:', error);
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}; 