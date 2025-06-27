import winston from 'winston';
import path from 'path';

export interface LoggerConfig {
  level?: string;
  format?: 'json' | 'simple' | 'combined';
  transports?: ('console' | 'file')[];
  filename?: string;
  maxFiles?: number;
  maxSize?: string;
  colorize?: boolean;
}

const defaultConfig: LoggerConfig = {
  level: process.env.LOG_LEVEL || 'info',
  format: 'combined',
  transports: ['console'],
  colorize: true
};

/**
 * Creates a Winston logger instance with the specified configuration
 * @param service - The service name to include in log messages
 * @param config - Optional logger configuration
 * @returns Configured Winston logger instance
 */
export function createLogger(service: string, config: LoggerConfig = {}): winston.Logger {
  const finalConfig = { ...defaultConfig, ...config };
  
  // Create custom format
  const customFormat = winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
    winston.format.errors({ stack: true }),
    winston.format.label({ label: service }),
    finalConfig.format === 'json' 
      ? winston.format.json()
      : winston.format.printf(({ timestamp, level, message, label, ...meta }) => {
          const metaStr = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
          return `${timestamp} [${label}] ${level.toUpperCase()}: ${message}${metaStr}`;
        })
  );

  // Configure transports
  const transports: winston.transport[] = [];

  if (finalConfig.transports?.includes('console')) {
    transports.push(new winston.transports.Console({
      format: finalConfig.colorize 
        ? winston.format.combine(
            winston.format.colorize(),
            customFormat
          )
        : customFormat
    }));
  }

  if (finalConfig.transports?.includes('file')) {
    const logDir = process.env.LOG_DIR || './logs';
    const filename = finalConfig.filename || `${service}.log`;
    const logPath = path.join(logDir, filename);

    transports.push(new winston.transports.File({
      filename: logPath,
      format: customFormat,
      maxFiles: finalConfig.maxFiles || 5,
      maxsize: parseSize(finalConfig.maxSize || '10MB'),
      tailable: true
    }));

    // Also create an error-only log file
    transports.push(new winston.transports.File({
      filename: path.join(logDir, `${service}-error.log`),
      level: 'error',
      format: customFormat,
      maxFiles: finalConfig.maxFiles || 5,
      maxsize: parseSize(finalConfig.maxSize || '10MB'),
      tailable: true
    }));
  }

  // Create logger instance
  const logger = winston.createLogger({
    level: finalConfig.level,
    format: customFormat,
    transports,
    // Handle uncaught exceptions and rejections
    exceptionHandlers: finalConfig.transports?.includes('file') ? [
      new winston.transports.File({
        filename: path.join(process.env.LOG_DIR || './logs', `${service}-exceptions.log`)
      })
    ] : undefined,
    rejectionHandlers: finalConfig.transports?.includes('file') ? [
      new winston.transports.File({
        filename: path.join(process.env.LOG_DIR || './logs', `${service}-rejections.log`)
      })
    ] : undefined
  });

  // Add request ID tracking for HTTP requests
  logger.addRequestId = function(requestId: string) {
    return logger.child({ requestId });
  };

  // Add session ID tracking
  logger.addSessionId = function(sessionId: string) {
    return logger.child({ sessionId });
  };

  // Add user ID tracking
  logger.addUserId = function(userId: string) {
    return logger.child({ userId });
  };

  return logger;
}

/**
 * Parse size string to bytes
 * @param sizeStr - Size string like '10MB', '1GB', etc.
 * @returns Size in bytes
 */
function parseSize(sizeStr: string): number {
  const units: { [key: string]: number } = {
    'B': 1,
    'KB': 1024,
    'MB': 1024 * 1024,
    'GB': 1024 * 1024 * 1024
  };

  const match = sizeStr.match(/^(\d+)\s*(B|KB|MB|GB)$/i);
  if (!match) {
    throw new Error(`Invalid size format: ${sizeStr}`);
  }

  const [, size, unit] = match;
  return parseInt(size, 10) * units[unit.toUpperCase()];
}

/**
 * Creates a logger specifically for HTTP requests
 * @param service - The service name
 * @returns Logger configured for HTTP request logging
 */
export function createHttpLogger(service: string): winston.Logger {
  return createLogger(`${service}-http`, {
    level: 'info',
    format: 'combined',
    transports: ['console', 'file']
  });
}

/**
 * Creates a logger specifically for database operations
 * @param service - The service name
 * @returns Logger configured for database logging
 */
export function createDbLogger(service: string): winston.Logger {
  return createLogger(`${service}-db`, {
    level: 'debug',
    format: 'json',
    transports: ['file']
  });
}

/**
 * Creates a logger specifically for security events
 * @param service - The service name
 * @returns Logger configured for security logging
 */
export function createSecurityLogger(service: string): winston.Logger {
  return createLogger(`${service}-security`, {
    level: 'info',
    format: 'json',
    transports: ['console', 'file'],
    colorize: false // Security logs should not be colorized
  });
}

/**
 * Creates a logger specifically for performance monitoring
 * @param service - The service name
 * @returns Logger configured for performance logging
 */
export function createPerformanceLogger(service: string): winston.Logger {
  return createLogger(`${service}-perf`, {
    level: 'info',
    format: 'json',
    transports: ['file']
  });
}

/**
 * Log levels in order of severity
 */
export const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  verbose: 4,
  debug: 5,
  silly: 6
};

/**
 * Default logger instance for the MCP server
 */
export const defaultLogger = createLogger('mcp-server');

// Extend Winston Logger interface to include our custom methods
declare module 'winston' {
  interface Logger {
    addRequestId?(requestId: string): winston.Logger;
    addSessionId?(sessionId: string): winston.Logger;
    addUserId?(userId: string): winston.Logger;
  }
}