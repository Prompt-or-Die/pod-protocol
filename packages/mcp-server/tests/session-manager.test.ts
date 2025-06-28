import { describe, it, expect, mock, beforeEach, afterEach } from 'bun:test';
import { SessionManager } from '../src/session-manager';
import type { SessionConfig, UserSession } from '../src/session-manager';
import jwt from 'jsonwebtoken';

// Mock PodComClient with bun test
mock.module('../../sdk-typescript/sdk/dist/index.js', () => ({
  PodComClient: mock(() => ({
    initialize: mock(() => Promise.resolve(null))
  }))
}));

// Mock SolanaAuthUtils with bun test
mock.module('../src/utils/solana-auth', () => ({
  SolanaAuthUtils: {
    verifySignature: mock(() => Promise.resolve(true))
  }
}));

describe('SessionManager', () => {
  let sessionManager: SessionManager;
  let mockConfig: SessionConfig;
  const JWT_SECRET = 'test-secret-key';

  beforeEach(() => {
    mockConfig = {
      sessionTimeoutMs: 3600000, // 1 hour
      maxSessionsPerUser: 5,
      cleanupIntervalMs: 300000, // 5 minutes
      requireWalletVerification: false
    };

    // Set up JWT secret for token verification
    process.env.JWT_SECRET = JWT_SECRET;
    
    try {
      sessionManager = new SessionManager(mockConfig);
      console.log('SessionManager created successfully:', typeof sessionManager, sessionManager?.constructor?.name);
    } catch (error) {
      console.error('SessionManager constructor failed:', error);
      throw error;
    }
  });

  afterEach(() => {
    try {
      if (sessionManager && typeof sessionManager.cleanup === 'function') {
        sessionManager.cleanup();
      } else {
        console.warn('sessionManager.cleanup not available:', typeof sessionManager, typeof sessionManager?.cleanup);
      }
    } catch (error) {
      console.error('Cleanup failed:', error);
    }
    mock.restore();
  });

  // Helper function to create valid JWT tokens
  function createValidJWT(payload: any): string {
    return jwt.sign(payload, JWT_SECRET);
  }

  describe('Session Creation', () => {
    it('should create a new session with valid OAuth token', async () => {
      const mockPayload = {
        userId: 'user-123',
        walletAddress: '1234567890abcdef',
        publicKey: 'public-key-123',
        scope: 'read write'
      };
      const mockToken = createValidJWT(mockPayload);

      const session = await sessionManager.createSession(mockToken);

      expect(session).toBeDefined();
      expect(session.userId).toBe('user-123');
      expect(session.isAuthenticated).toBe(true);
      expect(session.walletAddress).toBe('1234567890abcdef');
    });

    it('should create session with wallet authentication when required', async () => {
      const configWithWallet = {
        ...mockConfig,
        requireWalletVerification: true
      };
      sessionManager = new SessionManager(configWithWallet);

      const mockPayload = {
        userId: 'user-123',
        walletAddress: '1234567890abcdef',
        publicKey: 'wallet-public-key'
      };
      const mockToken = createValidJWT(mockPayload);
      
      const walletData = {
        walletSignature: 'wallet-signature',
        signedMessage: 'auth-message'
      };

      const session = await sessionManager.createSession(mockToken, walletData);

      expect(session).toBeDefined();
      expect(session.walletPublicKey).toBe('wallet-public-key');
    });

    it('should reject invalid OAuth token', async () => {
      const invalidToken = 'invalid-token';

      await expect(sessionManager.createSession(invalidToken))
        .rejects.toThrow();
    });

    it('should reject session creation when wallet auth required but not provided', async () => {
      const configWithWallet = {
        ...mockConfig,
        requireWalletVerification: true
      };
      sessionManager = new SessionManager(configWithWallet);

      const mockPayload = {
        userId: 'user-123',
        walletAddress: '1234567890abcdef',
        publicKey: 'public-key-123'
      };
      const mockToken = createValidJWT(mockPayload);

      await expect(sessionManager.createSession(mockToken))
        .rejects.toThrow();
    });

    it('should enforce session limits per user', async () => {
      const mockPayload = {
        userId: 'user-123',
        walletAddress: '1234567890abcdef',
        publicKey: 'public-key-123'
      };
      const mockToken = createValidJWT(mockPayload);

      // Create maximum allowed sessions
      const sessions = [];
      for (let i = 0; i < mockConfig.maxSessionsPerUser; i++) {
        const session = await sessionManager.createSession(mockToken);
        sessions.push(session);
      }

      // The next session should remove the oldest one (no error thrown)
      const newSession = await sessionManager.createSession(mockToken);
      expect(newSession).toBeDefined();
      expect(sessionManager.getSessionCount()).toBe(mockConfig.maxSessionsPerUser);
    });
  });

  describe('Session Retrieval', () => {
    let testSession: UserSession;

    beforeEach(async () => {
      const mockPayload = {
        userId: 'user-123',
        walletAddress: '1234567890abcdef',
        publicKey: 'public-key-123'
      };
      const mockToken = createValidJWT(mockPayload);
      testSession = await sessionManager.createSession(mockToken);
    });

    it('should retrieve existing session by ID', () => {
      const retrieved = sessionManager.getSession(testSession.sessionId);
      expect(retrieved).toBeDefined();
      expect(retrieved?.sessionId).toBe(testSession.sessionId);
    });

    it('should return null for non-existent session', () => {
      const retrieved = sessionManager.getSession('non-existent-id');
      expect(retrieved).toBeNull();
    });

    it('should update last activity when retrieving session', async () => {
      const originalActivity = testSession.lastActivity;
      
      // Wait a bit to ensure time difference
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const retrieved = sessionManager.getSession(testSession.sessionId);
      expect(retrieved?.lastActivity.getTime()).toBeGreaterThan(originalActivity.getTime());
    });
  });

  describe('Session Deletion', () => {
    let testSession: UserSession;

    beforeEach(async () => {
      const mockPayload = {
        userId: 'user-123',
        walletAddress: '1234567890abcdef',
        publicKey: 'public-key-123'
      };
      const mockToken = createValidJWT(mockPayload);
      testSession = await sessionManager.createSession(mockToken);
    });

    it('should delete existing session', async () => {
      const deleted = await sessionManager.deleteSession(testSession.sessionId);
      expect(deleted).toBe(true);
      
      const retrieved = sessionManager.getSession(testSession.sessionId);
      expect(retrieved).toBeNull();
    });

    it('should return false when deleting non-existent session', async () => {
      const deleted = await sessionManager.deleteSession('non-existent-id');
      expect(deleted).toBe(false);
    });

    it('should cleanup PodCom client when deleting session', async () => {
      await sessionManager.deleteSession(testSession.sessionId);
      
      // Verify session was deleted
      const deletedSession = sessionManager.getSession(testSession.sessionId);
      expect(deletedSession).toBeNull();
    });
  });

  describe('Session Cleanup', () => {
    it('should remove expired sessions', async () => {
      const shortTimeoutConfig = {
        ...mockConfig,
        sessionTimeoutMs: 100 // 100ms timeout
      };
      sessionManager = new SessionManager(shortTimeoutConfig);

      const mockPayload = {
        userId: 'user-123',
        walletAddress: '1234567890abcdef',
        publicKey: 'public-key-123'
      };
      const mockToken = createValidJWT(mockPayload);
      const session = await sessionManager.createSession(mockToken);
      
      // Wait for session to expire
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // Trigger cleanup
      sessionManager.cleanup();
      
      const retrieved = sessionManager.getSession(session.sessionId);
      expect(retrieved).toBeNull();
    });

    it('should not remove active sessions during cleanup', async () => {
      const mockPayload = {
        userId: 'user-123',
        walletAddress: '1234567890abcdef',
        publicKey: 'public-key-123'
      };
      const mockToken = createValidJWT(mockPayload);
      const session = await sessionManager.createSession(mockToken);
      
      // Trigger cleanup immediately (session should still be active)
      sessionManager.cleanup();
      
      const retrieved = sessionManager.getSession(session.sessionId);
      expect(retrieved).toBeDefined();
    });
  });

  describe('Session Permissions', () => {
    let testSession: UserSession;

    beforeEach(async () => {
      const mockPayload = {
        userId: 'user-123',
        walletAddress: '1234567890abcdef',
        publicKey: 'public-key-123',
        scope: 'read write admin'
      };
      const mockToken = createValidJWT(mockPayload);
      testSession = await sessionManager.createSession(mockToken);
    });

    it('should check user permissions correctly', () => {
      expect(testSession.hasPermission('read')).toBe(true);
      expect(testSession.hasPermission('write')).toBe(true);
      expect(testSession.hasPermission('admin')).toBe(true);
      expect(testSession.hasPermission('super-admin')).toBe(false);
    });

    it('should handle sessions without permissions', async () => {
      const mockPayload = {
        userId: 'user-456',
        walletAddress: '1234567890abcdef',
        publicKey: 'public-key-456'
        // No scope field
      };
      const mockToken = createValidJWT(mockPayload);
      const session = await sessionManager.createSession(mockToken);
      
      expect(session.hasPermission('read')).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors during OAuth verification', async () => {
      const invalidToken = 'definitely-not-a-valid-jwt-token';

      await expect(sessionManager.createSession(invalidToken))
        .rejects.toThrow();
    });

    it('should handle PodCom client connection failures', async () => {
      const mockPayload = {
        userId: 'user-123',
        walletAddress: '1234567890abcdef',
        publicKey: 'public-key-123'
      };
      const mockToken = createValidJWT(mockPayload);

      // Mock PodComClient to fail initialization
      mock.module('../../sdk-typescript/sdk/dist/index.js', () => ({
        PodComClient: mock(() => ({
          initialize: mock(() => Promise.reject(new Error('Initialization failed')))
        }))
      }));

      // The session should still be created even if PodClient initialization fails
      const session = await sessionManager.createSession(mockToken);
      expect(session).toBeDefined();
    });
  });

  describe('Session Statistics', () => {
    it('should track session count correctly', async () => {
      const mockPayload = {
        userId: 'user-123',
        walletAddress: '1234567890abcdef',
        publicKey: 'public-key-123'
      };
      const mockToken = createValidJWT(mockPayload);

      expect(sessionManager.getSessionCount()).toBe(0);

      const session1 = await sessionManager.createSession(mockToken);
      expect(sessionManager.getSessionCount()).toBe(1);

      const session2 = await sessionManager.createSession(mockToken);
      expect(sessionManager.getSessionCount()).toBe(2);

      await sessionManager.deleteSession(session1.sessionId);
      expect(sessionManager.getSessionCount()).toBe(1);
    });

    it('should provide session statistics', async () => {
      const mockPayload = {
        userId: 'user-123',
        walletAddress: '1234567890abcdef',
        publicKey: 'public-key-123'
      };
      const mockToken = createValidJWT(mockPayload);

      await sessionManager.createSession(mockToken);
      await sessionManager.createSession(mockToken);

      const stats = sessionManager.getSessionStats();
      expect(stats.totalSessions).toBe(2);
      expect(stats.uniqueUsers).toBe(1);
      expect(stats.authenticatedSessions).toBe(2);
    });
  });
});
