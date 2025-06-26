import { Request, Response, NextFunction } from 'express';
import { logger } from '../index.js';

export const requestLogger = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const startTime = Date.now();
  
  // Log request details
  logger.info('Incoming Request:', {
    method: req.method,
    path: req.path,
    query: req.query,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    contentType: req.get('Content-Type'),
    userId: req.user?.id || 'anonymous'
  });

  // Log response when finished
  res.on('finish', () => {
    const responseTime = Date.now() - startTime;
    
    logger.info('Request Completed:', {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      responseTime: `${responseTime}ms`,
      contentLength: res.get('Content-Length'),
      userId: req.user?.id || 'anonymous'
    });
  });

  next();
}; 