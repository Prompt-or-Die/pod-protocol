/**
 * PoD Protocol MCP Session Manager
 * Handles multi-user sessions with proper isolation and OAuth 2.1 authentication
 */

import { EventEmitter } from 'events';
import { randomUUID } from 'crypto';
import jwt from 'jsonwebtoken';
import { PodComClient } from '../../sdk-typescript/sdk/dist/index.js';
import { createLogger } from './logger.js';
import { SolanaAuthUtils } from './utils/solana-auth.js';

const logger = createLogger();

export interface UserSession {
  sessionId: string;
  userId: string;
  walletAddress: string;
  publicKey: string;
  agentIds: string[];
  permissions: string[];
  createdAt: Date;
  lastActivity: Date;
  metadata: Record<string, any>;
  podClient?: PodComClient;
  isAuthenticated: boolean;
  userInfo: any;
  walletPublicKey: string;
  hasPermission(permission: string): boolean;
}

export interface SessionConfig {
  sessionTimeoutMs: number;
  maxSessionsPerUser: number;
  cleanupIntervalMs: number;
  requireWalletVerification: boolean;
}

export class SessionManager extends EventEmitter {
  private sessions: Map<string, UserSession> = new Map();
  private userSessions: Map<string, Set<string>> = new Map(); // userId -> sessionIds
  private config: SessionConfig;
  private cleanupTimer?: NodeJS.Timeout;

  constructor(config: Partial<SessionConfig> = {}) {
    super();
    this.config = {
      sessionTimeoutMs: 24 * 60 * 60 * 1000, // 24 hours
      maxSessionsPerUser: 10, // Max concurrent sessions per user
      cleanupIntervalMs: 5 * 60 * 1000, // Cleanup every 5 minutes
      requireWalletVerification: true,
      ...config
    };

    this.startCleanupTimer();
  }

  /**
   * Create a new session for a user after OAuth 2.1 + Solana wallet verification
   */
  async createSession(authToken: string, additionalData?: Record<string, any>): Promise<UserSession> {
    try {
      // 1. Verify OAuth token
      const tokenPayload = this.verifyOAuthToken(authToken);
      
      // 2. Verify Solana wallet if required
      if (this.config.requireWalletVerification && additionalData?.walletSignature) {
        const isValidSignature = await this.verifyWalletSignature(
          tokenPayload.walletAddress,
          additionalData.walletSignature,
          additionalData.signedMessage
        );
        
        if (!isValidSignature) {
          throw new Error('Invalid wallet signature verification');
        }
      }

      // 3. Check session limits
      const existingSessions = this.userSessions.get(tokenPayload.userId) || new Set();
      if (existingSessions.size >= this.config.maxSessionsPerUser) {
        // Remove oldest session
        const oldestSessionId = Array.from(existingSessions)[0];
        await this.destroySession(oldestSessionId);
      }

      // 4. Create new session
      const sessionId = this.generateSessionId();
      const session: UserSession = {
        sessionId,
        userId: tokenPayload.userId,
        walletAddress: tokenPayload.walletAddress,
        publicKey: tokenPayload.publicKey,
        agentIds: tokenPayload.agentIds || [],
        permissions: tokenPayload.scope?.split(' ') || ['basic'],
        createdAt: new Date(),
        lastActivity: new Date(),
        metadata: additionalData || {},
        isAuthenticated: true,
        userInfo: tokenPayload,
        walletPublicKey: tokenPayload.publicKey,
        hasPermission: (permission: string) => session.permissions.includes(permission)
      };

      // 5. Initialize PoD client for this user
      if (session.walletAddress) {
        try {
          session.podClient = new PodComClient({
            endpoint: process.env.POD_RPC_ENDPOINT || 'https://api.devnet.solana.com',
            programId: process.env.POD_PROGRAM_ID || 'HEpGLgYsE1kP8aoYKyLFc3JVVrofS7T4zEA6fWBJsZps',
            commitment: 'confirmed'
          });
          
          // Initialize with user context (read-only for now)
          await session.podClient.initialize();
          logger.info('PoD client initialized for session', { sessionId });
        } catch (error) {
          logger.warn('Failed to initialize PoD client, continuing without it', { sessionId, error: error instanceof Error ? error.message : error });
          // Continue without PoD client - session is still valid
        }
      }

      // 6. Store session
      this.sessions.set(sessionId, session);
      if (!this.userSessions.has(session.userId)) {
        this.userSessions.set(session.userId, new Set());
      }
      this.userSessions.get(session.userId)!.add(sessionId);

      logger.info('Session created', {
        sessionId,
        userId: session.userId,
        walletAddress: session.walletAddress.slice(0, 8) + '...',
        permissions: session.permissions
      });

      this.emit('sessionCreated', session);
      return session;

    } catch (error) {
      logger.error('Failed to create session', { error, authToken: 'redacted' });
      throw new Error('Session creation failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  }

  /**
   * Get session by ID with activity update
   */
  getSession(sessionId: string): UserSession | null {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.lastActivity = new Date();
      return session;
    }
    return null;
  }

  /**
   * Validate session and check permissions
   */
  validateSession(sessionId: string, requiredPermission?: string): UserSession | null {
    const session = this.getSession(sessionId);
    if (!session) {
      return null;
    }

    // Check if session is expired
    const now = Date.now();
    const sessionAge = now - session.lastActivity.getTime();
    if (sessionAge > this.config.sessionTimeoutMs) {
      this.destroySession(sessionId);
      return null;
    }

    // Check permissions
    if (requiredPermission && !session.permissions.includes(requiredPermission) && !session.permissions.includes('admin')) {
      logger.warn('Permission denied', { sessionId, requiredPermission, userPermissions: session.permissions });
      return null;
    }

    return session;
  }

  /**
   * Update session metadata
   */
  updateSession(sessionId: string, updates: Partial<Pick<UserSession, 'agentIds' | 'metadata'>>): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return false;
    }

    if (updates.agentIds) {
      session.agentIds = updates.agentIds;
    }
    if (updates.metadata) {
      session.metadata = { ...session.metadata, ...updates.metadata };
    }
    session.lastActivity = new Date();

    this.emit('sessionUpdated', session);
    return true;
  }

  /**
   * Destroy a session
   */
  async destroySession(sessionId: string): Promise<boolean> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return false;
    }

    // Cleanup PoD client
    if (session.podClient) {
      try {
        // Graceful cleanup if needed
        session.podClient = undefined;
      } catch (error) {
        logger.warn('Error cleaning up PoD client', { error, sessionId });
      }
    }

    // Remove from maps
    this.sessions.delete(sessionId);
    const userSessionSet = this.userSessions.get(session.userId);
    if (userSessionSet) {
      userSessionSet.delete(sessionId);
      if (userSessionSet.size === 0) {
        this.userSessions.delete(session.userId);
      }
    }

    logger.info('Session destroyed', { sessionId, userId: session.userId });
    this.emit('sessionDestroyed', { sessionId, userId: session.userId });
    return true;
  }

  /**
   * Get all sessions for a user
   */
  getUserSessions(userId: string): UserSession[] {
    const sessionIds = this.userSessions.get(userId);
    if (!sessionIds) {
      return [];
    }

    return Array.from(sessionIds)
      .map(id => this.sessions.get(id))
      .filter((session): session is UserSession => session !== undefined);
  }

  /**
   * Get session statistics
   */
  getStats(): {
    totalSessions: number;
    totalUsers: number;
    avgSessionsPerUser: number;
    oldestSession: Date | null;
    newestSession: Date | null;
  } {
    const sessions = Array.from(this.sessions.values());
    
    return {
      totalSessions: sessions.length,
      totalUsers: this.userSessions.size,
      avgSessionsPerUser: this.userSessions.size > 0 ? sessions.length / this.userSessions.size : 0,
      oldestSession: sessions.length > 0 ? new Date(Math.min(...sessions.map(s => s.createdAt.getTime()))) : null,
      newestSession: sessions.length > 0 ? new Date(Math.max(...sessions.map(s => s.createdAt.getTime()))) : null
    };
  }

  /**
   * Generate secure session ID
   */
  private generateSessionId(): string {
    return `pod_session_${randomUUID().replace(/-/g, '')}_${Date.now().toString(36)}`;
  }

  /**
   * Verify OAuth 2.1 token
   */
  private verifyOAuthToken(token: string): any {
    try {
      const secret = process.env.JWT_SECRET;
      if (!secret) {
        throw new Error('JWT_SECRET not configured');
      }

      const decoded = jwt.verify(token, secret) as any;
      
      // Validate required fields
      if (!decoded.userId || !decoded.walletAddress) {
        throw new Error('Invalid token payload: missing required fields');
      }

      return decoded;
    } catch (error) {
      logger.error('OAuth token verification failed', { error });
      throw new Error('Invalid authentication token');
    }
  }

  /**
   * Verify Solana wallet signature
   */
  private async verifyWalletSignature(
    walletAddress: string,
    signature: string,
    message: string
  ): Promise<boolean> {
    try {
      return await SolanaAuthUtils.verifySignature(message, signature, walletAddress);
    } catch (error) {
      logger.error('Wallet signature verification failed', { error, walletAddress });
      return false;
    }
  }

  /**
   * Start cleanup timer for expired sessions
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanupExpiredSessions();
    }, this.config.cleanupIntervalMs);
  }

  /**
   * Cleanup expired sessions
   */
  private cleanupExpiredSessions(): void {
    const now = Date.now();
    const expiredSessions: string[] = [];

    for (const [sessionId, session] of this.sessions.entries()) {
      const sessionAge = now - session.lastActivity.getTime();
      if (sessionAge > this.config.sessionTimeoutMs) {
        expiredSessions.push(sessionId);
      }
    }

    if (expiredSessions.length > 0) {
      logger.info('Cleaning up expired sessions', { count: expiredSessions.length });
      expiredSessions.forEach(sessionId => {
        this.destroySession(sessionId);
      });
    }
  }

  /**
   * Delete a session by ID
   */
  async deleteSession(sessionId: string): Promise<boolean> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return false;
    }
    
    await this.destroySession(sessionId);
    return true;
  }

  /**
   * Get total session count
   */
  getSessionCount(): number {
    return this.sessions.size;
  }

  /**
   * Get session statistics
   */
  getSessionStats(): { totalSessions: number; activeUsers: number; averageSessionAge: number; uniqueUsers: number; authenticatedSessions: number } {
    const now = Date.now();
    let totalAge = 0;
    let authenticatedCount = 0;
    const uniqueUserIds = new Set<string>();
    
    for (const session of this.sessions.values()) {
      totalAge += now - session.createdAt.getTime();
      if (session.isAuthenticated) {
        authenticatedCount++;
      }
      if (session.userId) {
        uniqueUserIds.add(session.userId);
      }
    }
    
    return {
      totalSessions: this.sessions.size,
      activeUsers: this.userSessions.size,
      averageSessionAge: this.sessions.size > 0 ? totalAge / this.sessions.size : 0,
      uniqueUsers: uniqueUserIds.size,
      authenticatedSessions: authenticatedCount
    };
  }

  /**
   * Manual cleanup trigger
   */
  cleanup(): void {
    this.cleanupExpiredSessions();
  }

  /**
   * Shutdown session manager
   */
  async shutdown(): Promise<void> {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }

    // Destroy all sessions
    const sessionIds = Array.from(this.sessions.keys());
    await Promise.all(sessionIds.map(id => this.destroySession(id)));

    logger.info('Session manager shutdown complete');
  }
}

// Singleton instance
export const sessionManager = new SessionManager();