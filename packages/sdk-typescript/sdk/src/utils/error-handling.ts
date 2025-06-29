/**
 * Custom error types for PoD Protocol SDK
 * Provides specific error handling for different failure modes
 */

import { ErrorCode } from '../types';

// Re-export ErrorCode for convenience
export { ErrorCode };

// Type-safe interfaces for error details
interface ErrorDetails {
  [key: string]: string | number | boolean | undefined | null;
}

interface AccountErrorDetails extends ErrorDetails {
  address: string;
  accountType?: string;
  reason?: string;
}

interface ValidationErrorDetails extends ErrorDetails {
  field: string;
  value: string;
}

interface TimeoutErrorDetails extends ErrorDetails {
  operation: string;
  timeoutMs: number;
}

interface RateLimitErrorDetails extends ErrorDetails {
  retryAfterMs?: number;
}

interface OperationErrorDetails extends ErrorDetails {
  operation: string;
  required: string;
}

export class SDKError extends Error {
  public readonly code: ErrorCode;
  public readonly details?: ErrorDetails;
  public readonly retryable: boolean;
  public readonly timestamp: number;
  public cause?: Error;

  constructor(
    message: string,
    code: ErrorCode,
    options: {
      cause?: Error;
      details?: ErrorDetails;
      retryable?: boolean;
    } = {}
  ) {
    super(message);
    this.name = 'SDKError';
    this.code = code;
    this.details = options.details;
    this.retryable = options.retryable ?? false;
    this.timestamp = Date.now();

    if (options.cause) {
      this.cause = options.cause;
    }
  }
}

export class NetworkError extends SDKError {
  constructor(message: string, cause?: Error) {
    super(message, ErrorCode.NETWORK_ERROR, { 
      cause, 
      retryable: true 
    });
    this.name = 'NetworkError';
  }
}

export class RpcError extends SDKError {
  constructor(message: string, cause?: Error, details?: ErrorDetails) {
    super(message, ErrorCode.RPC_ERROR, { 
      cause, 
      details,
      retryable: true 
    });
    this.name = 'RpcError';
  }
}

export class AccountNotFoundError extends SDKError {
  constructor(address: string, accountType?: string) {
    const details: AccountErrorDetails = { address, accountType };
    super(
      `Account not found: ${address}${accountType ? ` (${accountType})` : ''}`,
      ErrorCode.ACCOUNT_NOT_FOUND,
      { 
        details,
        retryable: false 
      }
    );
    this.name = 'AccountNotFoundError';
  }
}

export class InvalidAccountDataError extends SDKError {
  constructor(address: string, reason: string) {
    const details: AccountErrorDetails = { address, reason };
    super(
      `Invalid account data for ${address}: ${reason}`,
      ErrorCode.INVALID_ACCOUNT_DATA,
      { 
        details,
        retryable: false 
      }
    );
    this.name = 'InvalidAccountDataError';
  }
}

/**
 * Transaction-related error
 */
export class TransactionError extends SDKError {
  constructor(message: string, cause?: Error) {
    super(message, ErrorCode.TRANSACTION_ERROR, { cause, retryable: true });
    this.name = 'TransactionError';
  }
}

/**
 * Validation-related error
 */
export class ValidationError extends SDKError {
  constructor(field: string, value: string, message: string, cause?: Error) {
    super(message, ErrorCode.VALIDATION_ERROR, { 
      cause, 
      retryable: false,
      details: { field, value }
    });
    this.name = 'ValidationError';
  }
}

export class TimeoutError extends SDKError {
  constructor(operation: string, timeoutMs: number) {
    super(
      `Operation timed out after ${timeoutMs}ms: ${operation}`,
      ErrorCode.TIMEOUT_ERROR,
      { 
        details: { operation, timeoutMs },
        retryable: true 
      }
    );
    this.name = 'TimeoutError';
  }
}

export class RateLimitError extends SDKError {
  constructor(retryAfterMs?: number) {
    super(
      `Rate limit exceeded${retryAfterMs ? `, retry after ${retryAfterMs}ms` : ''}`,
      ErrorCode.RATE_LIMIT_ERROR,
      { 
        details: { retryAfterMs },
        retryable: true 
      }
    );
    this.name = 'RateLimitError';
  }
}

export class InsufficientDataError extends SDKError {
  constructor(operation: string, required: string) {
    super(
      `Insufficient data for ${operation}: missing ${required}`,
      ErrorCode.INSUFFICIENT_DATA,
      { 
        details: { operation, required },
        retryable: false 
      }
    );
    this.name = 'InsufficientDataError';
  }
}

/**
 * Error handler utility functions
 */
export class ErrorHandler {
  /**
   * Classify an error into appropriate SDK error type
   */
  static classify(error: unknown, operation?: string): SDKError {
    // If already an SDKError, return as-is
    if (error instanceof SDKError) {
      return error;
    }

    const errorMessage = error instanceof Error ? error.message : String(error);
    const lowerMessage = errorMessage.toLowerCase();
    const contextMessage = operation ? `${operation}: ${errorMessage}` : errorMessage;

    // Network errors
    if (lowerMessage.includes('network') || 
        lowerMessage.includes('connection') || 
        lowerMessage.includes('fetch') ||
        lowerMessage.includes('timeout') ||
        lowerMessage.includes('unreachable')) {
      return new NetworkError(contextMessage, error instanceof Error ? error : undefined);
    }

    // RPC errors
    if (lowerMessage.includes('rpc') || 
        lowerMessage.includes('jsonrpc') || 
        lowerMessage.includes('method not found') ||
        lowerMessage.includes('invalid request')) {
      return new RpcError(contextMessage, error instanceof Error ? error : undefined);
    }

    // Account errors
    if (lowerMessage.includes('account') && 
        (lowerMessage.includes('not found') || lowerMessage.includes('does not exist'))) {
      return new AccountNotFoundError('unknown');
    }

    // Transaction errors
    if (lowerMessage.includes('transaction') || 
        lowerMessage.includes('signature') ||
        lowerMessage.includes('blockhash')) {
      return new TransactionError(contextMessage);
    }

    // Validation errors
    if (lowerMessage.includes('invalid') || 
        lowerMessage.includes('validation') ||
        lowerMessage.includes('required') ||
        lowerMessage.includes('missing')) {
      return new ValidationError('unknown', 'unknown', contextMessage);
    }

    // Rate limit errors
    if (lowerMessage.includes('rate limit') || 
        lowerMessage.includes('too many requests') ||
        lowerMessage.includes('429')) {
      return new RateLimitError();
    }

    // Default to SDKError for unknown errors with PROGRAM_ERROR code
    return new SDKError(
      contextMessage,
      ErrorCode.PROGRAM_ERROR,
      {
        cause: error instanceof Error ? error : undefined,
        retryable: false
      }
    );
  }

  /**
   * Check if an error is retryable
   */
  static isRetryable(error: unknown): boolean {
    if (error instanceof SDKError) {
      return error.retryable;
    }
    return false;
  }

  /**
   * Get retry delay for retryable errors
   */
  static getRetryDelay(attempt: number, error?: SDKError): number {
    if (error instanceof RateLimitError && error.details?.retryAfterMs) {
      return error.details.retryAfterMs as number;
    }

    // Exponential backoff: 1s, 2s, 4s
    return Math.min(1000 * Math.pow(2, attempt), 8000);
  }

  /**
   * Create a user-friendly error message
   */
  static getUserMessage(error: unknown): string {
    if (error instanceof NetworkError) {
      return 'Network connection failed. Please check your internet connection and try again.';
    }

    if (error instanceof RateLimitError) {
      return 'Too many requests. Please wait a moment and try again.';
    }

    if (error instanceof AccountNotFoundError) {
      return 'The requested account was not found on the blockchain.';
    }

    if (error instanceof TimeoutError) {
      return 'The operation timed out. Please try again.';
    }

    if (error instanceof SDKError) {
      return error.message;
    }

    return 'An unexpected error occurred. Please try again.';
  }
}

/**
 * Utility decorator for automatic error handling
 */
export function handleErrors(context?: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      try {
        return await originalMethod.apply(this, args);
      } catch (error) {
        throw ErrorHandler.classify(error, context || `${target.constructor.name}.${propertyKey}`);
      }
    };

    return descriptor;
  };
} 