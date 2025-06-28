import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { 
  ErrorHandler, 
  SDKError, 
  NetworkError, 
  RpcError, 
  AccountNotFoundError, 
  InvalidAccountDataError,
  ValidationError,
  TimeoutError,
  RateLimitError,
  InsufficientDataError,
  ErrorCode 
} from '../../src/utils/error-handling.js';

describe('ErrorHandler', () => {
  describe('classify', () => {
    it('should classify network errors correctly', () => {
      const networkError = new Error('Network request failed');
      
      const classified = ErrorHandler.classify(networkError, 'testOperation');
      
      expect(classified).toBeInstanceOf(NetworkError);
      expect(classified.retryable).toBe(true);
    });

    it('should classify RPC errors correctly', () => {
      const rpcError = new Error('RPC call failed');
      
      const classified = ErrorHandler.classify(rpcError, 'rpcCall');
      
      expect(classified).toBeInstanceOf(RpcError);
      expect(classified.retryable).toBe(true);
    });

    it('should classify account errors correctly', () => {
      const accountError = new Error('Account not found');
      
      const classified = ErrorHandler.classify(accountError, 'getAccount');
      
      expect(classified).toBeInstanceOf(AccountNotFoundError);
      expect(classified.retryable).toBe(false);
    });

    it('should classify rate limit errors correctly', () => {
      const rateLimitError = new Error('429 rate limit exceeded');
      
      const classified = ErrorHandler.classify(rateLimitError, 'apiCall');
      
      expect(classified).toBeInstanceOf(RateLimitError);
      expect(classified.retryable).toBe(true);
    });

    it('should handle unknown errors as SDKError', () => {
      const unknownError = new Error('Unknown error');
      
      const classified = ErrorHandler.classify(unknownError, 'unknownOp');
      
      expect(classified).toBeInstanceOf(SDKError);
      expect(classified.code).toBe(ErrorCode.PROGRAM_ERROR);
    });

    it('should handle string errors', () => {
      const classified = ErrorHandler.classify('String error', 'stringOp');
      
      expect(classified).toBeInstanceOf(SDKError);
      expect(classified.message).toBe('stringOp: String error');
    });

    it('should handle null/undefined errors', () => {
      const classified = ErrorHandler.classify(null, 'nullOp');
      
      expect(classified).toBeInstanceOf(SDKError);
      expect(classified.message).toBe('nullOp: null');
    });

    it('should preserve existing SDKError instances', () => {
      const originalError = new NetworkError('Network failed');
      const classified = ErrorHandler.classify(originalError, 'test');
      
      expect(classified).toBe(originalError);
    });
  });

  describe('isRetryable', () => {
    it('should identify retryable network errors', () => {
      const networkError = new NetworkError('Connection timeout');
      expect(ErrorHandler.isRetryable(networkError)).toBe(true);
    });

    it('should identify retryable RPC errors', () => {
      const rpcError = new RpcError('Rate limit exceeded');
      expect(ErrorHandler.isRetryable(rpcError)).toBe(true);
    });

    it('should identify non-retryable validation errors', () => {
      const validationError = new ValidationError('field', 'value', 'Invalid input');
      expect(ErrorHandler.isRetryable(validationError)).toBe(false);
    });

    it('should identify non-retryable account errors', () => {
      const accountError = new AccountNotFoundError('abc123', 'agent');
      expect(ErrorHandler.isRetryable(accountError)).toBe(false);
    });

    it('should return false for non-SDK errors', () => {
      const regularError = new Error('Regular error');
      expect(ErrorHandler.isRetryable(regularError)).toBe(false);
    });
  });

  describe('getRetryDelay', () => {
    it('should calculate exponential backoff correctly', () => {
      expect(ErrorHandler.getRetryDelay(0)).toBe(1000);
      expect(ErrorHandler.getRetryDelay(1)).toBe(2000);
      expect(ErrorHandler.getRetryDelay(2)).toBe(4000);
      expect(ErrorHandler.getRetryDelay(3)).toBe(8000);
    });

    it('should cap at maximum delay', () => {
      expect(ErrorHandler.getRetryDelay(10)).toBe(8000);
      expect(ErrorHandler.getRetryDelay(20)).toBe(8000);
    });

    it('should use custom retry delay for rate limit errors', () => {
      const rateLimitError = new RateLimitError(5000);
      expect(ErrorHandler.getRetryDelay(1, rateLimitError)).toBe(5000);
    });
  });

  describe('getUserMessage', () => {
    it('should provide user-friendly messages for different error types', () => {
      const networkError = new NetworkError('Connection failed');
      expect(ErrorHandler.getUserMessage(networkError)).toBe(
        'Network connection failed. Please check your internet connection and try again.'
      );

      const rateLimitError = new RateLimitError();
      expect(ErrorHandler.getUserMessage(rateLimitError)).toBe(
        'Too many requests. Please wait a moment and try again.'
      );

      const accountError = new AccountNotFoundError('abc123');
      expect(ErrorHandler.getUserMessage(accountError)).toBe(
        'The requested account was not found on the blockchain.'
      );

      const timeoutError = new TimeoutError('operation', 30000);
      expect(ErrorHandler.getUserMessage(timeoutError)).toBe(
        'The operation timed out. Please try again.'
      );
    });

    it('should provide generic message for unknown errors', () => {
      const unknownError = new Error('Unknown error');
      expect(ErrorHandler.getUserMessage(unknownError)).toBe(
        'An unexpected error occurred. Please try again.'
      );
    });
  });
});

describe('Specialized Error Classes', () => {
  describe('SDKError', () => {
    it('should create SDK error with correct properties', () => {
      const error = new SDKError('Test error', ErrorCode.VALIDATION_ERROR, {
        details: { field: 'test' },
        retryable: false
      });
      
      expect(error.name).toBe('SDKError');
      expect(error.message).toBe('Test error');
      expect(error.code).toBe(ErrorCode.VALIDATION_ERROR);
      expect(error.details).toEqual({ field: 'test' });
      expect(error.retryable).toBe(false);
      expect(error.timestamp).toBeDefined();
    });

    it('should include cause when provided', () => {
      const cause = new Error('Underlying error');
      const error = new SDKError('Wrapper error', ErrorCode.NETWORK_ERROR, { cause });
      
      expect(error.cause).toBe(cause);
    });
  });

  describe('NetworkError', () => {
    it('should create network error with correct properties', () => {
      const error = new NetworkError('Network failed');
      
      expect(error.name).toBe('NetworkError');
      expect(error.message).toBe('Network failed');
      expect(error.code).toBe(ErrorCode.NETWORK_ERROR);
      expect(error.retryable).toBe(true);
    });
  });

  describe('RpcError', () => {
    it('should create RPC error with details', () => {
      const error = new RpcError('RPC failed', undefined, { code: -32601 });
      
      expect(error.name).toBe('RpcError');
      expect(error.code).toBe(ErrorCode.RPC_ERROR);
      expect(error.details).toEqual({ code: -32601 });
      expect(error.retryable).toBe(true);
    });
  });

  describe('AccountNotFoundError', () => {
    it('should create account error with address', () => {
      const error = new AccountNotFoundError('abc123', 'agent');
      
      expect(error.name).toBe('AccountNotFoundError');
      expect(error.details?.address).toBe('abc123');
      expect(error.details?.accountType).toBe('agent');
      expect(error.retryable).toBe(false);
    });
  });

  describe('ValidationError', () => {
    it('should create validation error with field details', () => {
      const error = new ValidationError('email', 'invalid@', 'Invalid email format');
      
      expect(error.name).toBe('ValidationError');
      expect(error.details?.field).toBe('email');
      expect(error.details?.value).toBe('invalid@');
      expect(error.details?.reason).toBe('Invalid email format');
      expect(error.retryable).toBe(false);
    });
  });

  describe('TimeoutError', () => {
    it('should create timeout error with operation details', () => {
      const error = new TimeoutError('fetchAccount', 5000);
      
      expect(error.name).toBe('TimeoutError');
      expect(error.details?.operation).toBe('fetchAccount');
      expect(error.details?.timeoutMs).toBe(5000);
      expect(error.retryable).toBe(true);
    });
  });

  describe('RateLimitError', () => {
    it('should create rate limit error with retry delay', () => {
      const error = new RateLimitError(3000);
      
      expect(error.name).toBe('RateLimitError');
      expect(error.details?.retryAfterMs).toBe(3000);
      expect(error.retryable).toBe(true);
    });
  });
});

describe('Error Classification Edge Cases', () => {
  it('should handle complex error messages', () => {
    const complexError = new Error('network timeout occurred during RPC call');
    const classified = ErrorHandler.classify(complexError, 'complexOp');
    
    expect(classified).toBeInstanceOf(NetworkError);
  });

  it('should handle error with mixed casing', () => {
    const mixedError = new Error('NETWORK CONNECTION FAILED');
    const classified = ErrorHandler.classify(mixedError, 'mixedOp');
    
    expect(classified).toBeInstanceOf(NetworkError);
  });

  it('should preserve error details in classification', () => {
    const originalError = new Error('Test error');
    (originalError as any).customProperty = 'custom value';
    
    const classified = ErrorHandler.classify(originalError, 'testOp');
    
    expect(classified.cause).toBe(originalError);
  });
}); 