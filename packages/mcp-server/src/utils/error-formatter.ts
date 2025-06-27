import { createLogger } from './logger';

const logger = createLogger('error-formatter');

export interface FormattedError {
  message: string;
  context: string;
  timestamp: string;
  stack?: string;
  code?: string;
  statusCode?: number;
  details?: any;
}

/**
 * Formats an error object into a consistent structure
 * @param error - The error to format (can be Error, string, or any object)
 * @param context - The context where the error occurred
 * @param includeStack - Whether to include stack trace (default: true in development)
 * @returns Formatted error object
 */
export function formatError(
  error: any,
  context: string,
  includeStack: boolean = process.env.NODE_ENV === 'development'
): FormattedError {
  const timestamp = new Date().toISOString();
  
  // Handle different error types
  if (error instanceof Error) {
    return {
      message: sanitizeErrorMessage(error.message),
      context,
      timestamp,
      stack: includeStack ? error.stack : undefined,
      code: (error as any).code,
      statusCode: (error as any).statusCode,
      details: extractErrorDetails(error)
    };
  }
  
  if (typeof error === 'string') {
    return {
      message: sanitizeErrorMessage(error),
      context,
      timestamp
    };
  }
  
  if (error && typeof error === 'object') {
    return {
      message: sanitizeErrorMessage(error.message || error.toString() || 'Unknown error'),
      context,
      timestamp,
      code: error.code,
      statusCode: error.statusCode,
      details: extractErrorDetails(error)
    };
  }
  
  // Fallback for null, undefined, or other types
  return {
    message: 'Unknown error occurred',
    context,
    timestamp,
    details: { originalError: error }
  };
}

/**
 * Sanitizes error messages by removing sensitive information
 * @param message - The original error message
 * @returns Sanitized error message
 */
export function sanitizeErrorMessage(message: string): string {
  if (!message || typeof message !== 'string') {
    return 'Invalid error message';
  }
  
  // Patterns to redact sensitive information
  const sensitivePatterns = [
    // Passwords
    /password[=:]\s*[^\s]+/gi,
    /pwd[=:]\s*[^\s]+/gi,
    // API keys
    /api[_-]?key[=:]\s*[^\s]+/gi,
    /token[=:]\s*[^\s]+/gi,
    // Database connection strings
    /mongodb:\/\/[^\s]+/gi,
    /postgres:\/\/[^\s]+/gi,
    /mysql:\/\/[^\s]+/gi,
    // Private keys
    /-----BEGIN [A-Z ]+PRIVATE KEY-----[\s\S]*?-----END [A-Z ]+PRIVATE KEY-----/gi,
    // Credit card numbers (basic pattern)
    /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g,
    // Social security numbers
    /\b\d{3}-\d{2}-\d{4}\b/g,
    // Email addresses in some contexts
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g
  ];
  
  let sanitized = message;
  
  sensitivePatterns.forEach(pattern => {
    sanitized = sanitized.replace(pattern, '[REDACTED]');
  });
  
  return sanitized;
}

/**
 * Extracts additional details from an error object
 * @param error - The error object
 * @returns Object containing relevant error details
 */
function extractErrorDetails(error: any): any {
  const details: any = {};
  
  // Common error properties to extract
  const relevantProps = [
    'name',
    'code',
    'errno',
    'syscall',
    'hostname',
    'port',
    'address',
    'path',
    'dest',
    'info',
    'cause'
  ];
  
  relevantProps.forEach(prop => {
    if (error[prop] !== undefined) {
      details[prop] = error[prop];
    }
  });
  
  // Handle specific error types
  if (error.name === 'ValidationError' && error.errors) {
    details.validationErrors = error.errors;
  }
  
  if (error.name === 'MongoError' || error.name === 'MongoServerError') {
    details.mongoErrorInfo = {
      codeName: error.codeName,
      index: error.index,
      keyPattern: error.keyPattern,
      keyValue: error.keyValue
    };
  }
  
  if (error.name === 'AxiosError') {
    details.httpError = {
      status: error.response?.status,
      statusText: error.response?.statusText,
      url: error.config?.url,
      method: error.config?.method
    };
  }
  
  return Object.keys(details).length > 0 ? details : undefined;
}

/**
 * Creates a user-friendly error message from a technical error
 * @param error - The technical error
 * @param context - The context where the error occurred
 * @returns User-friendly error message
 */
export function createUserFriendlyMessage(error: any, context: string): string {
  const errorMap: { [key: string]: string } = {
    // Network errors
    'ECONNREFUSED': 'Unable to connect to the service. Please try again later.',
    'ENOTFOUND': 'Service temporarily unavailable. Please check your connection.',
    'ETIMEDOUT': 'Request timed out. Please try again.',
    
    // Authentication errors
    'UNAUTHORIZED': 'Authentication failed. Please check your credentials.',
    'FORBIDDEN': 'You do not have permission to perform this action.',
    'TOKEN_EXPIRED': 'Your session has expired. Please log in again.',
    
    // Validation errors
    'VALIDATION_ERROR': 'The provided data is invalid. Please check your input.',
    'MISSING_REQUIRED_FIELD': 'Required information is missing. Please complete all fields.',
    
    // Business logic errors
    'INSUFFICIENT_FUNDS': 'Insufficient funds to complete this transaction.',
    'RATE_LIMIT_EXCEEDED': 'Too many requests. Please wait before trying again.',
    'RESOURCE_NOT_FOUND': 'The requested resource could not be found.',
    
    // System errors
    'INTERNAL_SERVER_ERROR': 'An internal error occurred. Please try again later.',
    'SERVICE_UNAVAILABLE': 'Service is temporarily unavailable. Please try again later.',
    'DATABASE_ERROR': 'A database error occurred. Please try again later.'
  };
  
  // Extract error code or name
  let errorCode = '';
  if (error instanceof Error) {
    errorCode = (error as any).code || error.name || '';
  } else if (typeof error === 'object' && error.code) {
    errorCode = error.code;
  }
  
  // Return user-friendly message if available
  if (errorCode && errorMap[errorCode]) {
    return errorMap[errorCode];
  }
  
  // Context-specific messages
  switch (context) {
    case 'AUTHENTICATION':
      return 'Authentication failed. Please check your credentials and try again.';
    case 'AUTHORIZATION':
      return 'You do not have permission to perform this action.';
    case 'VALIDATION':
      return 'The provided information is invalid. Please check your input.';
    case 'NETWORK':
      return 'Network error occurred. Please check your connection and try again.';
    case 'DATABASE':
      return 'A database error occurred. Please try again later.';
    case 'EXTERNAL_SERVICE':
      return 'External service is temporarily unavailable. Please try again later.';
    default:
      return 'An unexpected error occurred. Please try again later.';
  }
}

/**
 * Logs an error with appropriate level and context
 * @param error - The error to log
 * @param context - The context where the error occurred
 * @param additionalInfo - Additional information to include in the log
 */
export function logError(
  error: any,
  context: string,
  additionalInfo?: any
): void {
  const formattedError = formatError(error, context);
  
  // Determine log level based on error type
  let logLevel: 'error' | 'warn' | 'info' = 'error';
  
  if (error instanceof Error) {
    const errorCode = (error as any).code;
    const statusCode = (error as any).statusCode;
    
    // Client errors (4xx) are warnings, server errors (5xx) are errors
    if (statusCode >= 400 && statusCode < 500) {
      logLevel = 'warn';
    }
    
    // Some specific codes are just informational
    if (['ECONNRESET', 'EPIPE'].includes(errorCode)) {
      logLevel = 'info';
    }
  }
  
  // Log with appropriate level
  logger[logLevel]('Error occurred', {
    ...formattedError,
    additionalInfo
  });
}

/**
 * Creates an error response object for HTTP APIs
 * @param error - The error to format
 * @param context - The context where the error occurred
 * @returns HTTP error response object
 */
export function createErrorResponse(
  error: any,
  context: string
): {
  error: {
    message: string;
    code?: string;
    details?: any;
  };
  statusCode: number;
} {
  const formattedError = formatError(error, context, false); // Don't include stack in response
  
  // Determine HTTP status code
  let statusCode = 500; // Default to internal server error
  
  if (error instanceof Error) {
    const errorStatusCode = (error as any).statusCode;
    const errorCode = (error as any).code;
    
    if (errorStatusCode) {
      statusCode = errorStatusCode;
    } else {
      // Map common error codes to HTTP status codes
      const statusMap: { [key: string]: number } = {
        'UNAUTHORIZED': 401,
        'FORBIDDEN': 403,
        'NOT_FOUND': 404,
        'VALIDATION_ERROR': 400,
        'RATE_LIMIT_EXCEEDED': 429,
        'CONFLICT': 409,
        'GONE': 410,
        'PAYLOAD_TOO_LARGE': 413,
        'UNSUPPORTED_MEDIA_TYPE': 415,
        'UNPROCESSABLE_ENTITY': 422,
        'TOO_MANY_REQUESTS': 429,
        'SERVICE_UNAVAILABLE': 503,
        'GATEWAY_TIMEOUT': 504
      };
      
      statusCode = statusMap[errorCode] || 500;
    }
  }
  
  return {
    error: {
      message: createUserFriendlyMessage(error, context),
      code: formattedError.code,
      details: process.env.NODE_ENV === 'development' ? formattedError.details : undefined
    },
    statusCode
  };
}

/**
 * Wraps an async function to catch and format errors
 * @param fn - The async function to wrap
 * @param context - The context for error formatting
 * @returns Wrapped function that handles errors
 */
export function withErrorHandling<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  context: string
): T {
  return (async (...args: any[]) => {
    try {
      return await fn(...args);
    } catch (error) {
      logError(error, context, { args });
      throw formatError(error, context);
    }
  }) as T;
}

/**
 * Error classes for common scenarios
 */
export class ValidationError extends Error {
  constructor(message: string, public field?: string, public value?: any) {
    super(message);
    this.name = 'ValidationError';
    (this as any).code = 'VALIDATION_ERROR';
    (this as any).statusCode = 400;
  }
}

export class AuthenticationError extends Error {
  constructor(message: string = 'Authentication failed') {
    super(message);
    this.name = 'AuthenticationError';
    (this as any).code = 'UNAUTHORIZED';
    (this as any).statusCode = 401;
  }
}

export class AuthorizationError extends Error {
  constructor(message: string = 'Insufficient permissions') {
    super(message);
    this.name = 'AuthorizationError';
    (this as any).code = 'FORBIDDEN';
    (this as any).statusCode = 403;
  }
}

export class NotFoundError extends Error {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`);
    this.name = 'NotFoundError';
    (this as any).code = 'NOT_FOUND';
    (this as any).statusCode = 404;
  }
}

export class ConflictError extends Error {
  constructor(message: string = 'Resource conflict') {
    super(message);
    this.name = 'ConflictError';
    (this as any).code = 'CONFLICT';
    (this as any).statusCode = 409;
  }
}

export class RateLimitError extends Error {
  constructor(message: string = 'Rate limit exceeded') {
    super(message);
    this.name = 'RateLimitError';
    (this as any).code = 'RATE_LIMIT_EXCEEDED';
    (this as any).statusCode = 429;
  }
}

export class ServiceUnavailableError extends Error {
  constructor(service: string = 'Service') {
    super(`${service} is temporarily unavailable`);
    this.name = 'ServiceUnavailableError';
    (this as any).code = 'SERVICE_UNAVAILABLE';
    (this as any).statusCode = 503;
  }
}