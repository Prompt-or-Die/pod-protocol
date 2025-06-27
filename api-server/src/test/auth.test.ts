import { SolanaAuthUtils } from '../utils/solana-auth.js';

describe('SolanaAuthUtils', () => {
  describe('isValidPublicKey', () => {
    test('should validate correct Solana public key', () => {
      const validKey = '11111111111111111111111111111112'; // System Program ID
      expect(SolanaAuthUtils.isValidPublicKey(validKey)).toBe(true);
    });

    test('should reject invalid public key', () => {
      const invalidKey = 'invalid-key';
      expect(SolanaAuthUtils.isValidPublicKey(invalidKey)).toBe(false);
    });
  });

  describe('generateNonce', () => {
    test('should generate a unique nonce', () => {
      const nonce1 = SolanaAuthUtils.generateNonce();
      const nonce2 = SolanaAuthUtils.generateNonce();
      
      expect(nonce1).not.toBe(nonce2);
      expect(nonce1.length).toBeGreaterThan(0);
    });
  });

  describe('createAuthMessage', () => {
    test('should create properly formatted auth message', () => {
      const address = '11111111111111111111111111111112';
      const domain = 'localhost:4000';
      const nonce = 'test-nonce';
      const issuedAt = '2024-01-01T00:00:00.000Z';
      
      const message = SolanaAuthUtils.createAuthMessage(address, domain, nonce, issuedAt);
      
      expect(message).toContain(domain);
      expect(message).toContain(address);
      expect(message).toContain(nonce);
      expect(message).toContain(issuedAt);
      expect(message).toContain('PoD Protocol');
    });
  });

  describe('parseAuthMessage', () => {
    test('should parse valid auth message', () => {
      const message = `localhost:4000 wants you to sign in with your Solana account:
11111111111111111111111111111112

Welcome to PoD Protocol! Click to sign in and accept the PoD Protocol Terms of Service.

URI: https://localhost:4000
Version: 1
Chain ID: mainnet
Nonce: test-nonce
Issued At: 2024-01-01T00:00:00.000Z`;

      const parsed = SolanaAuthUtils.parseAuthMessage(message);
      
      expect(parsed).not.toBeNull();
      expect(parsed?.domain).toBe('localhost:4000');
      expect(parsed?.address).toBe('11111111111111111111111111111112');
      expect(parsed?.nonce).toBe('test-nonce');
    });

    test('should return null for invalid message', () => {
      const invalidMessage = 'invalid message format';
      const parsed = SolanaAuthUtils.parseAuthMessage(invalidMessage);
      
      expect(parsed).toBeNull();
    });
  });

  describe('isMessageExpired', () => {
    test('should detect expired message', () => {
      const oldMessage = {
        domain: 'test',
        address: 'test',
        statement: 'test',
        uri: 'test',
        version: '1',
        chainId: 'mainnet',
        nonce: 'test',
        issuedAt: new Date(Date.now() - 15 * 60 * 1000).toISOString() // 15 minutes ago
      };
      
      expect(SolanaAuthUtils.isMessageExpired(oldMessage, 10)).toBe(true);
    });

    test('should accept fresh message', () => {
      const freshMessage = {
        domain: 'test',
        address: 'test',
        statement: 'test',
        uri: 'test',
        version: '1',
        chainId: 'mainnet',
        nonce: 'test',
        issuedAt: new Date().toISOString()
      };
      
      expect(SolanaAuthUtils.isMessageExpired(freshMessage, 10)).toBe(false);
    });
  });
}); 