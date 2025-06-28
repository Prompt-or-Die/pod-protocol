/**
 * Custom error types for PoD Protocol SDK
 * Provides specific error handling for different failure modes
 */

export enum ErrorCode {
  NETWORK_ERROR = 'NETWORK_ERROR',
  RPC_ERROR = 'RPC_ERROR',
  ACCOUNT_NOT_FOUND = 'ACCOUNT_NOT_FOUND',
  INVALID_ACCOUNT_DATA = 'INVALID_ACCOUNT_DATA',
  PROGRAM_ERROR = 'PROGRAM_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  CACHE_ERROR = 'CACHE_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  RATE_LIMIT_ERROR = 'RATE_LIMIT_ERROR',
  INSUFFICIENT_DATA = 'INSUFFICIENT_DATA'
}

export class SDKError extends Error {
  public readonly code: ErrorCode;
  public readonly details?: Record<string, unknown>;
  public readonly retryable: boolean;
  public readonly timestamp: number;

  constructor(
    message: string,
    code: ErrorCode,
    options: {
      cause?: Error;
      details?: Record<string, unknown>;
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
  constructor(message: string, cause?: Error, details?: Record<string, unknown>) {
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
    super(
      `Account not found: ${address}${accountType ? ` (${accountType})` : ''}`,
      ErrorCode.ACCOUNT_NOT_FOUND,
      { 
        details: { address, accountType },
        retryable: false 
      }
    );
    this.name = 'AccountNotFoundError';
  }
}

export class InvalidAccountDataError extends SDKError {
  constructor(address: string, reason: string) {
    super(
      `Invalid account data for ${address}: ${reason}`,
      ErrorCode.INVALID_ACCOUNT_DATA,
      { 
        details: { address, reason },
        retryable: false 
      }
    );
    this.name = 'InvalidAccountDataError';
  }
}

export class ValidationError extends SDKError {
  constructor(field: string, value: unknown, reason: string) {
    super(
      `Validation failed for ${field}: ${reason}`,
      ErrorCode.VALIDATION_ERROR,
      { 
        details: { field, value, reason },
        retryable: false 
      }
    );
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
   * Classify an error and wrap it in appropriate SDK error type
   */
  static classify(error: unknown, context?: string): SDKError {
    if (error instanceof SDKError) {
      return error;
    }

    const message = error instanceof Error ? error.message : String(error);
    const contextMessage = context ? `${context}: ${message}` : message;

    // Network-related errors
    if (message.includes('network') || message.includes('connection') || message.includes('ENOTFOUND')) {
      return new NetworkError(contextMessage, error instanceof Error ? error : undefined);
    }

    // RPC-related errors
    if (message.includes('RPC') || message.includes('request failed') || message.includes('429')) {
      if (message.includes('429') || message.includes('rate limit')) {
        return new RateLimitError();
      }
      return new RpcError(contextMessage, error instanceof Error ? error : undefined);
    }

    // Account-related errors
    if (message.includes('Account not found') || message.includes('Invalid account owner')) {
      return new AccountNotFoundError('unknown');
    }

    if (message.includes('Invalid account data') || message.includes('failed to deserialize')) {
      return new InvalidAccountDataError('unknown', message);
    }

    // Timeout errors
    if (message.includes('timeout') || message.includes('timed out')) {
      return new TimeoutError(context || 'unknown operation', 30000);
    }

    // Default to generic SDK error
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