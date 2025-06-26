import { Request } from 'express';

declare global {
  namespace Express {
    interface Request {
      user?: {
        publicKey: string;
        id: string;
        walletAddress: string;
      };
    }
  }
} 