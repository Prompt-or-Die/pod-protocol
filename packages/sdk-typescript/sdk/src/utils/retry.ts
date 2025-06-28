/**
 * Retry logic with exponential backoff for PoD Protocol SDK
 * Handles network failures and RPC errors with intelligent retry strategies
 */

import { ErrorHandler, SDKError, NetworkError, RpcError, RateLimitError, TimeoutError } from './error-handling.js';

export interface RetryOptions {
  maxAttempts?: number;
  baseDelay?: number;
  maxDelay?: number;
  backoffFactor?: number;
  jitter?: boolean;
  retryCondition?: (error: unknown, attempt: number) => boolean;
  onRetry?: (error: unknown, attempt: number) => void;
  timeout?: number;
}

export interface RetryResult<T> {
  result: T;
  attempts: number;
  totalTime: number;
  lastError?: unknown;
}

/**
 * Default retry configuration for different operation types
 */
export const RetryConfig = {
  // Fast operations (account fetches, simple queries)
  fast: {
    maxAttempts: 3,
    baseDelay: 500,
    maxDelay: 2000,
    backoffFactor: 2,
    jitter: true,
    timeout: 10000
  },
  
  // Medium operations (multiple account fetches, analytics)
  medium: {
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 5000,
    backoffFactor: 2,
    jitter: true,
    timeout: 30000
  },
  
  // Slow operations (large data fetches, complex calculations)
  slow: {
    maxAttempts: 2,
    baseDelay: 2000,
    maxDelay: 10000,
    backoffFactor: 2,
    jitter: true,
    timeout: 60000
  },
  
  // Critical operations (transactions, state changes)
  critical: {
    maxAttempts: 5,
    baseDelay: 1000,
    maxDelay: 8000,
    backoffFactor: 1.5,
    jitter: true,
    timeout: 120000
  }
} as const;

/**
 * Retry a function with exponential backoff
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    baseDelay = 1000,
    maxDelay = 8000,
    backoffFactor = 2,
    jitter = true,
    retryCondition = defaultRetryCondition,
    onRetry,
    timeout = 30000
  } = options;

  const startTime = Date.now();
  let lastError: unknown;
  let attempt = 0;

  while (attempt < maxAttempts) {
    attempt++;
    
    try {
      // Apply timeout to the operation
      const result = await withTimeout(fn(), timeout);
      
      return result;
    } catch (error) {
      lastError = error;
      
      // Check if we should retry this error
      if (!retryCondition(error, attempt) || attempt >= maxAttempts) {
        throw ErrorHandler.classify(error, 'retry');
      }
      
      // Calculate delay for next attempt
      const delay = calculateDelay(attempt, baseDelay, maxDelay, backoffFactor, jitter);
      
      // Handle rate limiting
      if (error instanceof RateLimitError && error.details?.retryAfterMs) {
        const rateLimitDelay = error.details.retryAfterMs as number;
        await sleep(Math.max(delay, rateLimitDelay));
      } else {
        await sleep(delay);
      }
      
      // Call retry callback if provided
      if (onRetry) {
        onRetry(error, attempt);
      }
    }
  }

  // If we get here, all attempts failed
  throw ErrorHandler.classify(lastError, `retry after ${attempt} attempts`);
}

/**
 * Retry with predefined configuration
 */
export async function retryWithConfig<T>(
  fn: () => Promise<T>,
  configName: keyof typeof RetryConfig,
  additionalOptions: Partial<RetryOptions> = {}
): Promise<T> {
  const config = RetryConfig[configName];
  return retry(fn, { ...config, ...additionalOptions });
}

/**
 * Default retry condition - determines if an error should trigger a retry
 */
export function defaultRetryCondition(error: unknown, attempt: number): boolean {
  // Don't retry on the last attempt
  if (attempt >= 3) return false;
  
  // Always retry network and RPC errors
  if (error instanceof NetworkError || error instanceof RpcError) {
    return true;
  }
  
  // Retry timeout errors
  if (error instanceof TimeoutError) {
    return true;
  }
  
  // Retry rate limit errors
  if (error instanceof RateLimitError) {
    return true;
  }
  
  // For non-SDK errors, check error message
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes('network') ||
      message.includes('timeout') ||
      message.includes('connection') ||
      message.includes('enotfound') ||
      message.includes('rate limit') ||
      message.includes('too many requests') ||
      message.includes('502') ||
      message.includes('503') ||
      message.includes('504')
    );
  }
  
  return false;
}

/**
 * Conservative retry condition for critical operations
 */
export function conservativeRetryCondition(error: unknown, attempt: number): boolean {
  // Only retry network-level errors for critical operations
  return (
    attempt < 2 && 
    (error instanceof NetworkError || error instanceof TimeoutError)
  );
}

/**
 * Aggressive retry condition for non-critical operations
 */
export function aggressiveRetryCondition(error: unknown, attempt: number): boolean {
  if (attempt >= 5) return false;
  
  // Retry most errors except validation and account not found
  if (error instanceof SDKError) {
    return error.retryable;
  }
  
  // For unknown errors, be more aggressive
  return true;
}

/**
 * Calculate delay with exponential backoff and optional jitter
 */
function calculateDelay(
  attempt: number,
  baseDelay: number,
  maxDelay: number,
  backoffFactor: number,
  jitter: boolean
): number {
  let delay = baseDelay * Math.pow(backoffFactor, attempt - 1);
  
  // Apply maximum delay cap
  delay = Math.min(delay, maxDelay);
  
  // Add jitter to prevent thundering herd
  if (jitter) {
    delay = delay * (0.5 + Math.random() * 0.5);
  }
  
  return Math.floor(delay);
}

/**
 * Sleep utility function
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Add timeout to any promise
 */
function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new TimeoutError('Operation', timeoutMs));
      }, timeoutMs);
    })
  ]);
}

/**
 * Retry decorator for class methods
 */
export function retryable(options: RetryOptions = {}) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      return retry(() => originalMethod.apply(this, args), options);
    };

    return descriptor;
  };
}

/**
 * Retry with circuit breaker pattern
 */
export class CircuitBreaker<T> {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';
  
  constructor(
    private threshold: number = 5,
    private resetTime: number = 60000 // 1 minute
  ) {}

  async execute(fn: () => Promise<T>, retryOptions?: RetryOptions): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime > this.resetTime) {
        this.state = 'half-open';
      } else {
        throw new SDKError(
          'Circuit breaker is open - too many recent failures',
          'CIRCUIT_BREAKER_OPEN' as any,
          { retryable: false }
        );
      }
    }

    try {
      const result = await retry(fn, retryOptions);
      
      // Reset on success
      if (this.state === 'half-open') {
        this.state = 'closed';
        this.failures = 0;
      }
      
      return result;
    } catch (error) {
      this.failures++;
      this.lastFailureTime = Date.now();
      
      if (this.failures >= this.threshold) {
        this.state = 'open';
      }
      
      throw error;
    }
  }

  reset(): void {
    this.state = 'closed';
    this.failures = 0;
    this.lastFailureTime = 0;
  }

  getState(): { state: string; failures: number; lastFailureTime: number } {
    return {
      state: this.state,
      failures: this.failures,
      lastFailureTime: this.lastFailureTime
    };
  }
}

/**
 * Utility functions for specific retry scenarios
 */
export const RetryUtils = {
  /**
   * Retry RPC calls with appropriate backoff
   */
  rpcCall: <T>(fn: () => Promise<T>) => 
    retryWithConfig(fn, 'fast', {
      retryCondition: (error, attempt) => {
        if (attempt >= 3) return false;
        return error instanceof RpcError || error instanceof NetworkError;
      }
    }),

  /**
   * Retry account fetching operations
   */
  accountFetch: <T>(fn: () => Promise<T>) =>
    retryWithConfig(fn, 'medium', {
      retryCondition: defaultRetryCondition
    }),

  /**
   * Retry analytics calculations
   */
  analytics: <T>(fn: () => Promise<T>) =>
    retryWithConfig(fn, 'slow', {
      retryCondition: aggressiveRetryCondition
    }),

  /**
   * Retry transaction operations
   */
  transaction: <T>(fn: () => Promise<T>) =>
    retryWithConfig(fn, 'critical', {
      retryCondition: conservativeRetryCondition
    })
}; 