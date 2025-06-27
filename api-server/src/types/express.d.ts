import { Request } from 'express';

declare global {
  namespace Express {
    interface User {
      id: string;
      publicKey: string;
      walletAddress: string;
      authenticatedAt?: string;
      refreshedAt?: string;
    }

    interface Request {
      user?: User;
    }
  }
}

export {}; 