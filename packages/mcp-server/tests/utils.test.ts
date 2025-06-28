import { describe, it, expect, mock, beforeEach, afterEach } from 'bun:test';
import { validateOAuthToken, verifySolanaSignature, OAuthUserInfo } from '../src/utils/solana-auth';
import { createLogger, LoggerConfig } from '../src/utils/logger';
import { validateConfig } from '../src/utils/config-validator';
import type { MCPServerConfig, ModernMCPServerConfig } from '../src/types';

// Mock external dependencies with bun test
mock.module('@solana/web3.js', () => ({}));
mock.module('tweetnacl', () => ({}));

describe('Utility Functions', () => {
  beforeEach(() => {
    mock.restore();
  });

  describe('OAuth Token Validation', () => {
    beforeEach(() => {
      global.fetch = mock(() => Promise.resolve({} as Response));
    });

    afterEach(() => {
      mock.restore();
    });

    it('should validate a valid OAuth token', async () => {
      const mockUserInfo = {
        id: 'user123',
        email: 'test@example.com',
        name: 'Test User',
        permissions: ['read', 'write']
      };

      (global.fetch as any) = mock(() => Promise.resolve({
        ok: true,
        json: mock(() => Promise.resolve(mockUserInfo))
      }));

      const result = await validateOAuthToken('valid-token');

      expect(result).toEqual(mockUserInfo);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/oauth/userinfo'),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer valid-token'
          })
        })
      );
    });

    it('should reject an invalid OAuth token', async () => {
      (global.fetch as jest.Mock) = mock(() => Promise.resolve({} as Response & {
        ok: false,
        status: 401,
        statusText: 'Unauthorized'
      });

      await expect(validateOAuthToken('invalid-token'))
        .rejects
        .toThrow('OAuth token validation failed');
    });

    it('should handle network errors during token validation', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error('Network error')
      );

      await expect(validateOAuthToken('token'))
        .rejects
        .toThrow('Network error');
    });

    it('should handle malformed response from OAuth provider', async () => {
      (global.fetch as jest.Mock) = mock(() => Promise.resolve({
        ok: true,
        json: mock() = mock(() => Promise.reject(new Error('Invalid JSON'))
      });

      await expect(validateOAuthToken('token'))
        .rejects
        .toThrow('Invalid JSON');
    });

    it('should validate token with custom OAuth endpoint', async () => {
      const customEndpoint = 'https://custom-oauth.example.com';
      const mockUserInfo: OAuthUserInfo = {
        id: 'user456',
        email: 'custom@example.com',
        name: 'Custom User',
        permissions: ['admin']
      };

      (global.fetch as jest.Mock) = mock(() => Promise.resolve({
        ok: true,
        json: mock().mockResolvedValue(mockUserInfo)
      });

      const result = await validateOAuthToken('token', customEndpoint);

      expect(result).toEqual(mockUserInfo);
      expect(global.fetch).toHaveBeenCalledWith(
        `${customEndpoint}/oauth/userinfo`,
        expect.any(Object)
      );
    });
  });

  describe('Solana Signature Verification', () => {
    const mockNacl = {
      sign: {
        detached: {
          verify: mock()
        }
      }
    };

    beforeEach(() => {
      mock.module('tweetnacl', () => mockNacl);
    });

    it('should verify a valid Solana signature', async () => {
      mockNacl.sign.detached.verify.mockReturnValue(true);

      const publicKey = 'valid-public-key';
      const signature = 'valid-signature';
      const message = 'test message';

      const result = await verifySolanaSignature(publicKey, signature, message);

      expect(result).toBe(true);
      expect(mockNacl.sign.detached.verify).toHaveBeenCalled();
    });

    it('should reject an invalid Solana signature', async () => {
      mockNacl.sign.detached.verify.mockReturnValue(false);

      const publicKey = 'valid-public-key';
      const signature = 'invalid-signature';
      const message = 'test message';

      const result = await verifySolanaSignature(publicKey, signature, message);

      expect(result).toBe(false);
    });

    it('should handle invalid public key format', async () => {
      const invalidPublicKey = 'invalid-key';
      const signature = 'signature';
      const message = 'message';

      await expect(verifySolanaSignature(invalidPublicKey, signature, message))
        .rejects
        .toThrow();
    });

    it('should handle invalid signature format', async () => {
      const publicKey = 'valid-public-key';
      const invalidSignature = 'invalid-signature-format';
      const message = 'message';

      await expect(verifySolanaSignature(publicKey, invalidSignature, message))
        .rejects
        .toThrow();
    });

    it('should handle empty message', async () => {
      mockNacl.sign.detached.verify.mockReturnValue(true);

      const publicKey = 'valid-public-key';
      const signature = 'valid-signature';
      const message = '';

      const result = await verifySolanaSignature(publicKey, signature, message);

      expect(result).toBe(true);
    });
  });

  describe('Logger Utility', () => {
    it('should create a logger with default configuration', () => {
      const logger = createLogger('test-service');

      expect(logger).toBeDefined();
      expect(typeof logger.info).toBe('function');
      expect(typeof logger.error).toBe('function');
      expect(typeof logger.warn).toBe('function');
      expect(typeof logger.debug).toBe('function');
    });

    it('should create a logger with custom configuration', () => {
      const config: LoggerConfig = {
        level: 'debug',
        format: 'json' as const,
        transports: ['console' as const, 'file' as const]
      };

      const logger = createLogger('test-service', config);

      expect(logger).toBeDefined();
    });

    it('should handle different log levels', () => {
      const logger = createLogger('test-service', { level: 'error' });
      
      // These should not throw
      expect(() => {
        logger.error('Error message');
        logger.warn('Warning message');
        logger.info('Info message');
        logger.debug('Debug message');
      }).not.toThrow();
    });

    it('should format log messages correctly', () => {
      const logger = createLogger('test-service');
      const consoleSpy = mock(() => {});

      logger.info('Test message', { extra: 'data' });

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should handle logger errors gracefully', () => {
      const logger = createLogger('test-service');
      
      // Should not throw even with invalid data
      expect(() => {
        logger.info(null as any);
        logger.error(undefined as any);
        logger.warn({ circular: {} });
      }).not.toThrow();
    });
  });

  describe('Config Validator', () => {
    let validConfig: ModernMCPServerConfig;

    beforeEach(() => {
      validConfig = {
        serverName: 'test-server',
        version: '1.0.0',
        podProtocol: {
          rpcEndpoint: 'http://localhost:8899',
          programId: 'test-program-id'
        },
        transports: {
          http: { enabled: true, port: 3000 },
          websocket: { enabled: true, port: 3001 },
          stdio: { enabled: false }
        },
        registry: { enabled: false },
        security: { enabled: false },
        a2a: {
          discoveryMode: 'passive' as const,
          coordinationPatterns: ['direct'] as const,
          trustFramework: 'reputation' as const
        },
        analytics: { enabled: false },
        performance: {
          caching: { enabled: true },
          prefetching: { enabled: true },
          connectionPooling: { enabled: true }
        }
      };
    });

    it('should validate a correct configuration', () => {
      expect(() => validateConfig(validConfig)).not.toThrow();
    });

    it('should reject configuration with missing required fields', () => {
      const invalidConfig = { ...validConfig };
      delete (invalidConfig as any).serverName;

      expect(() => validateConfig(invalidConfig as any))
        .toThrow(/serverName.*required/);
    });

    it('should reject configuration with invalid port numbers', () => {
      const invalidConfig = {
        ...validConfig,
        transports: {
          ...validConfig.transports,
          http: { enabled: true, port: -1 }
        }
      };

      expect(() => validateConfig(invalidConfig))
        .toThrow(/port.*invalid/);
    });

    it('should reject configuration with invalid RPC endpoint', () => {
      const invalidConfig = {
        ...validConfig,
        podProtocol: {
          ...validConfig.podProtocol,
          rpcEndpoint: 'invalid-url'
        }
      };

      expect(() => validateConfig(invalidConfig))
        .toThrow(/rpcEndpoint.*invalid/);
    });

    it('should validate configuration with optional fields', () => {
      const configWithOptionals = {
        ...validConfig,
        registry: {
          enabled: true,
          endpoint: 'https://registry.example.com',
          apiKey: 'test-key'
        },
        security: {
          enabled: true,
          rateLimiting: {
            enabled: true,
            maxRequests: 100,
            windowMs: 60000
          },
          cors: {
            enabled: true,
            origins: ['https://example.com']
          }
        }
      };

      expect(() => validateConfig(configWithOptionals)).not.toThrow();
    });

    it('should reject configuration with invalid enum values', () => {
      const invalidConfig = {
        ...validConfig,
        a2a: {
          ...validConfig.a2a,
          discoveryMode: 'invalid-mode' as any
        }
      };

      expect(() => validateConfig(invalidConfig))
        .toThrow(/discoveryMode.*invalid/);
    });

    it('should validate nested configuration objects', () => {
      const configWithNested = {
        ...validConfig,
        performance: {
          caching: {
            enabled: true,
            ttl: 300,
            maxSize: 1000
          },
          prefetching: {
            enabled: true,
            batchSize: 10
          },
          connectionPooling: {
            enabled: true,
            maxConnections: 50,
            idleTimeout: 30000
          }
        }
      };

      expect(() => validateConfig(configWithNested)).not.toThrow();
    });

    it('should provide helpful error messages for validation failures', () => {
      const invalidConfig = {
        ...validConfig,
        version: 123 // Should be string
      };

      try {
        validateConfig(invalidConfig as any);
        fail('Should have thrown validation error');
      } catch (error) {
        expect((error as Error).message).toContain('version');
        expect((error as Error).message).toContain('string');
      }
    });

    it('should handle deeply nested validation errors', () => {
      const invalidConfig = {
        ...validConfig,
        transports: {
          ...validConfig.transports,
          http: {
            enabled: true,
            port: 'invalid' as any // Should be number
          }
        }
      };

      try {
        validateConfig(invalidConfig);
        fail('Should have thrown validation error');
      } catch (error) {
        expect((error as Error).message).toContain('transports.http.port');
        expect((error as Error).message).toContain('number');
      }
    });
  });

  describe('Error Handling Utilities', () => {
    it('should format error messages consistently', () => {
      const { formatError } = require('../src/utils/error-formatter');
      
      const error = new Error('Test error');
      const formatted = formatError(error, 'TEST_CONTEXT');

      expect(formatted).toHaveProperty('message');
      expect(formatted).toHaveProperty('context');
      expect(formatted).toHaveProperty('timestamp');
      expect(formatted.context).toBe('TEST_CONTEXT');
    });

    it('should handle different error types', () => {
      const { formatError } = require('../src/utils/error-formatter');
      
      const stringError = 'String error';
      const objectError = { message: 'Object error', code: 'ERR_001' };
      const nullError = null;

      expect(() => formatError(stringError, 'STRING')).not.toThrow();
      expect(() => formatError(objectError, 'OBJECT')).not.toThrow();
      expect(() => formatError(nullError, 'NULL')).not.toThrow();
    });

    it('should sanitize sensitive information from errors', () => {
      const { formatError } = require('../src/utils/error-formatter');
      
      const sensitiveError = new Error('Database connection failed: password=secret123');
      const formatted = formatError(sensitiveError, 'DB');

      expect(formatted.message).not.toContain('secret123');
      expect(formatted.message).toContain('[REDACTED]');
    });
  });

  describe('Validation Utilities', () => {
    it('should validate email addresses', () => {
      const { isValidEmail } = require('../src/utils/validators');

      expect(isValidEmail('test@example.com')).toBe(true);
      expect(isValidEmail('user.name+tag@domain.co.uk')).toBe(true);
      expect(isValidEmail('invalid-email')).toBe(false);
      expect(isValidEmail('test@')).toBe(false);
      expect(isValidEmail('@example.com')).toBe(false);
      expect(isValidEmail('')).toBe(false);
    });

    it('should validate URLs', () => {
      const { isValidUrl } = require('../src/utils/validators');

      expect(isValidUrl('https://example.com')).toBe(true);
      expect(isValidUrl('http://localhost:3000')).toBe(true);
      expect(isValidUrl('ftp://files.example.com')).toBe(true);
      expect(isValidUrl('invalid-url')).toBe(false);
      expect(isValidUrl('http://')).toBe(false);
      expect(isValidUrl('')).toBe(false);
    });

    it('should validate Solana addresses', () => {
      const { isValidSolanaAddress } = require('../src/utils/validators');

      const validAddress = '11111111111111111111111111111112'; // System program
      const invalidAddress = 'invalid-address';
      const shortAddress = '123';

      expect(isValidSolanaAddress(validAddress)).toBe(true);
      expect(isValidSolanaAddress(invalidAddress)).toBe(false);
      expect(isValidSolanaAddress(shortAddress)).toBe(false);
      expect(isValidSolanaAddress('')).toBe(false);
    });

    it('should validate JSON schemas', () => {
      const { validateJsonSchema } = require('../src/utils/validators');

      const schema = {
        type: 'object',
        properties: {
          name: { type: 'string' },
          age: { type: 'number' }
        },
        required: ['name']
      };

      const validData = { name: 'John', age: 30 };
      const invalidData = { age: 'thirty' }; // Missing name, wrong type for age

      expect(validateJsonSchema(validData, schema)).toBe(true);
      expect(validateJsonSchema(invalidData, schema)).toBe(false);
    });
  });
});
