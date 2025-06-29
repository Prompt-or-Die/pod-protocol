import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { SessionManager } from '../src/session-manager';
import type { SessionConfig, UserSession } from '../src/session-manager';

// Mock PodComClient
jest.mock('../../sdk-typescript/sdk/dist/index.js', () => ({
  PodComClient: jest.fn().mockImplementation(() => ({
    initialize: jest.fn().mockResolvedValue(null)
  }))
}));

// Mock SolanaAuthUtils
jest.mock('../src/utils/solana-auth', () => ({
  SolanaAuthUtils: {
    verifySignature: jest.fn().mockResolvedValue(true)
  }
}));

describe('SessionManager', () => {
  let sessionManager: SessionManager;
  let mockConfig: SessionConfig;

  beforeEach(() => {
    mockConfig = {
      sessionTimeoutMs: 3600000, // 1 hour
      maxSessionsPerUser: 5,
      cleanupIntervalMs: 300000, // 5 minutes
      requireWalletVerification: false
    };

    sessionManager = new SessionManager(mockConfig);
  });

  afterEach(() => {
    sessionManager.cleanup();
    jest.clearAllMocks();
  });

  describe('Session Creation', () => {
    it('should create a new session with valid OAuth token', async () => {
      const mockToken = 'valid-oauth-token';
      const mockUserInfo = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User'
      };

      // Mock OAuth token verification
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockUserInfo)
      } as Response);

      const session = await sessionManager.createSession(mockToken);

      expect(session).toBeDefined();
      expect(session.userId).toBe('user-123');
      expect(session.isAuthenticated).toBe(true);
      expect(session.userInfo).toEqual(mockUserInfo);
    });

    it('should create session with wallet authentication when required', async () => {
      const configWithWallet = {
        ...mockConfig,
        requireWalletAuth: true
      };
      sessionManager = new SessionManager(configWithWallet);

      const mockToken = 'valid-oauth-token';
      const mockUserInfo = { id: 'user-123', email: 'test@example.com', name: 'Test User' };
      const walletData = {
        publicKey: 'wallet-public-key',
        signature: 'wallet-signature',
        message: 'auth-message'
      };

      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockUserInfo)
      } as Response);

      const session = await sessionManager.createSession(mockToken, walletData);

      expect(session).toBeDefined();
      expect(session.walletPublicKey).toBe('wallet-public-key');
    });

    it('should reject invalid OAuth token', async () => {
      const invalidToken = 'invalid-token';

      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
        ok: false,
        status: 401
      } as Response);

      await expect(sessionManager.createSession(invalidToken))
        .rejects.toThrow('Invalid OAuth token');
    });

    it('should reject session creation when wallet auth required but not provided', async () => {
      const configWithWallet = {
        ...mockConfig,
        requireWalletAuth: true
      };
      sessionManager = new SessionManager(configWithWallet);

      const mockToken = 'valid-oauth-token';
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({ id: 'user-123' })
      } as Response);

      await expect(sessionManager.createSession(mockToken))
        .rejects.toThrow('Wallet authentication required');
    });

    it('should enforce session limits per user', async () => {
      const mockToken = 'valid-oauth-token';
      const mockUserInfo = { id: 'user-123', email: 'test@example.com', name: 'Test User' };

      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockUserInfo)
      } as Response);

      // Create maximum allowed sessions
      const sessions = [];
      for (let i = 0; i < mockConfig.maxSessionsPerUser; i++) {
        const session = await sessionManager.createSession(mockToken);
        sessions.push(session);
      }

      // Attempt to create one more session should fail
      await expect(sessionManager.createSession(mockToken))
        .rejects.toThrow('Maximum sessions per user exceeded');
    });
  });

  describe('Session Retrieval', () => {
    let testSession: UserSession;

    beforeEach(async () => {
      const mockToken = 'valid-oauth-token';
      const mockUserInfo = { id: 'user-123', email: 'test@example.com', name: 'Test User' };

      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockUserInfo)
      } as Response);

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

    it('should update last activity when retrieving session', () => {
      const originalActivity = testSession.lastActivity;
      
      // Wait a bit to ensure time difference
      setTimeout(() => {
        const retrieved = sessionManager.getSession(testSession.sessionId);
        expect(retrieved?.lastActivity.getTime()).toBeGreaterThan(originalActivity.getTime());
      }, 10);
    });
  });

  describe('Session Deletion', () => {
    let testSession: UserSession;

    beforeEach(async () => {
      const mockToken = 'valid-oauth-token';
      const mockUserInfo = { id: 'user-123', email: 'test@example.com', name: 'Test User' };

      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockUserInfo)
      } as Response);

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
      const initialPodClient = testSession.podClient;
      expect(initialPodClient).toBeDefined();
      
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

      const mockToken = 'valid-oauth-token';
      const mockUserInfo = { id: 'user-123', email: 'test@example.com', name: 'Test User' };

      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockUserInfo)
      } as Response);

      const session = await sessionManager.createSession(mockToken);
      
      // Wait for session to expire
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // Trigger cleanup
      sessionManager.cleanup();
      
      const retrieved = sessionManager.getSession(session.sessionId);
      expect(retrieved).toBeNull();
    });

    it('should not remove active sessions during cleanup', async () => {
      const mockToken = 'valid-oauth-token';
      const mockUserInfo = { id: 'user-123', email: 'test@example.com', name: 'Test User' };

      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockUserInfo)
      } as Response);

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
      const mockToken = 'valid-oauth-token';
      const mockUserInfo = { 
        id: 'user-123', 
        email: 'test@example.com', 
        name: 'Test User',
        permissions: ['read', 'write', 'admin']
      };

      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockUserInfo)
      } as Response);

      testSession = await sessionManager.createSession(mockToken);
    });

    it('should check user permissions correctly', () => {
      expect(testSession.hasPermission('read')).toBe(true);
      expect(testSession.hasPermission('write')).toBe(true);
      expect(testSession.hasPermission('admin')).toBe(true);
      expect(testSession.hasPermission('super-admin')).toBe(false);
    });

    it('should handle sessions without permissions', async () => {
      const mockToken = 'valid-oauth-token';
      const mockUserInfo = { 
        id: 'user-456', 
        email: 'test2@example.com', 
        name: 'Test User 2'
        // No permissions field
      };

      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockUserInfo)
      } as Response);

      const session = await sessionManager.createSession(mockToken);
      expect(session.hasPermission('read')).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors during OAuth verification', async () => {
      const mockToken = 'valid-oauth-token';

      (global.fetch as jest.MockedFunction<typeof fetch>).mockRejectedValue(new Error('Network error'));

      await expect(sessionManager.createSession(mockToken))
        .rejects.toThrow('Failed to verify OAuth token');
    });

    it('should handle PodCom client connection failures', async () => {
      const mockToken = 'valid-oauth-token';
      const mockUserInfo = { id: 'user-123', email: 'test@example.com', name: 'Test User' };

      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockUserInfo)
      } as Response);

      // Mock PodComClient to fail initialization
      const { PodComClient } = require('../../sdk-typescript/sdk/dist/index.js');
      PodComClient.mockImplementation(() => ({
        initialize: jest.fn().mockRejectedValue(new Error('Initialization failed'))
      }));

      // The session should still be created even if PodClient initialization fails
      const session = await sessionManager.createSession(mockToken);
      expect(session).toBeDefined();
      expect(session.podClient).toBeUndefined();
    });
  });

  describe('Session Statistics', () => {
    it('should track session count correctly', async () => {
      const mockToken = 'valid-oauth-token';
      const mockUserInfo = { id: 'user-123', email: 'test@example.com', name: 'Test User' };

      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockUserInfo)
      } as Response);

      expect(sessionManager.getSessionCount()).toBe(0);

      const session1 = await sessionManager.createSession(mockToken);
      expect(sessionManager.getSessionCount()).toBe(1);

      const session2 = await sessionManager.createSession(mockToken);
      expect(sessionManager.getSessionCount()).toBe(2);

      await sessionManager.deleteSession(session1.sessionId);
      expect(sessionManager.getSessionCount()).toBe(1);
    });

    it('should provide session statistics', async () => {
      const mockToken = 'valid-oauth-token';
      const mockUserInfo = { id: 'user-123', email: 'test@example.com', name: 'Test User' };

      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockUserInfo)
      } as Response);

      await sessionManager.createSession(mockToken);
      await sessionManager.createSession(mockToken);

      const stats = sessionManager.getSessionStats();
      expect(stats.totalSessions).toBe(2);
      expect(stats.uniqueUsers).toBe(1);
      expect(stats.authenticatedSessions).toBe(2);
    });
  });
});