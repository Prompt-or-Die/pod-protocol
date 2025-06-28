/**
 * Debug and Development Utilities for PoD Protocol SDK
 * 
 * Provides enhanced error messages, logging, and debugging tools
 * to improve developer experience and troubleshooting
 */

import type { Address } from "@solana/addresses";

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  OFF = 4
}

export interface DebugConfig {
  logLevel: LogLevel;
  enableColors: boolean;
  showTimestamp: boolean;
  showStackTrace: boolean;
  logToFile: boolean;
  fileName?: string;
}

/**
 * Enhanced Debug Logger for PoD Protocol SDK
 */
export class DebugLogger {
  private static instance: DebugLogger;
  private config: DebugConfig;
  private logBuffer: string[] = [];

  private constructor(config: Partial<DebugConfig> = {}) {
    this.config = {
      logLevel: LogLevel.INFO,
      enableColors: true,
      showTimestamp: true,
      showStackTrace: false,
      logToFile: false,
      ...config
    };
  }

  static getInstance(config?: Partial<DebugConfig>): DebugLogger {
    if (!DebugLogger.instance) {
      DebugLogger.instance = new DebugLogger(config);
    }
    return DebugLogger.instance;
  }

  private formatMessage(level: LogLevel, message: string, data?: any): string {
    const timestamp = this.config.showTimestamp ? new Date().toISOString() : '';
    const levelStr = LogLevel[level];
    const color = this.getColor(level);
    
    let formatted = '';
    
    if (this.config.showTimestamp) {
      formatted += `[${timestamp}] `;
    }
    
    if (this.config.enableColors && typeof process !== 'undefined') {
      formatted += `${color}[${levelStr}]${this.getColor('reset')} `;
    } else {
      formatted += `[${levelStr}] `;
    }
    
    formatted += message;
    
    if (data !== undefined) {
      formatted += ` ${JSON.stringify(data, null, 2)}`;
    }
    
    return formatted;
  }

  private getColor(level: LogLevel | string): string {
    if (!this.config.enableColors) return '';
    
    const colors = {
      [LogLevel.DEBUG]: '\x1b[36m', // Cyan
      [LogLevel.INFO]: '\x1b[32m',  // Green
      [LogLevel.WARN]: '\x1b[33m',  // Yellow
      [LogLevel.ERROR]: '\x1b[31m', // Red
      reset: '\x1b[0m'
    };
    
    return colors[level as keyof typeof colors] || '';
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.config.logLevel;
  }

  debug(message: string, data?: any): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      const formatted = this.formatMessage(LogLevel.DEBUG, message, data);
      console.debug(formatted);
      this.logBuffer.push(formatted);
    }
  }

  info(message: string, data?: any): void {
    if (this.shouldLog(LogLevel.INFO)) {
      const formatted = this.formatMessage(LogLevel.INFO, message, data);
      console.info(formatted);
      this.logBuffer.push(formatted);
    }
  }

  warn(message: string, data?: any): void {
    if (this.shouldLog(LogLevel.WARN)) {
      const formatted = this.formatMessage(LogLevel.WARN, message, data);
      console.warn(formatted);
      this.logBuffer.push(formatted);
    }
  }

  error(message: string, error?: Error | any): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      let errorData = error;
      
      if (error instanceof Error) {
        errorData = {
          name: error.name,
          message: error.message,
          stack: this.config.showStackTrace ? error.stack : undefined
        };
      }
      
      const formatted = this.formatMessage(LogLevel.ERROR, message, errorData);
      console.error(formatted);
      this.logBuffer.push(formatted);
    }
  }

  getLogBuffer(): string[] {
    return [...this.logBuffer];
  }

  clearLogBuffer(): void {
    this.logBuffer = [];
  }

  updateConfig(config: Partial<DebugConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

/**
 * Enhanced Error Classes for Better Debugging
 */
export class PodProtocolError extends Error {
  public readonly code: string;
  public readonly context?: any;
  public readonly timestamp: Date;

  constructor(message: string, code: string, context?: any) {
    super(message);
    this.name = 'PodProtocolError';
    this.code = code;
    this.context = context;
    this.timestamp = new Date();
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      context: this.context,
      timestamp: this.timestamp.toISOString(),
      stack: this.stack
    };
  }
}

export class ValidationError extends PodProtocolError {
  constructor(message: string, context?: any) {
    super(message, 'VALIDATION_ERROR', context);
    this.name = 'ValidationError';
  }
}

export class NetworkError extends PodProtocolError {
  constructor(message: string, context?: any) {
    super(message, 'NETWORK_ERROR', context);
    this.name = 'NetworkError';
  }
}

export class ConfigurationError extends PodProtocolError {
  constructor(message: string, context?: any) {
    super(message, 'CONFIGURATION_ERROR', context);
    this.name = 'ConfigurationError';
  }
}

/**
 * SDK Information interface
 */
export interface SDKInfo {
  timestamp: number;
  sdkVersion: string;
}

/**
 * Development Utilities
 */
export class DevUtils {
  private static logger = DebugLogger.getInstance();

  /**
   * Validate Solana address format
   */
  static validateAddress(address: string | Address): boolean {
    try {
      const addressStr = typeof address === 'string' ? address : String(address);
      // Basic validation - should be base58 and 32-44 characters
      return /^[A-HJ-NP-Z1-9]{32,44}$/.test(addressStr);
    } catch {
      return false;
    }
  }

  /**
   * Format address for display (truncate middle)
   */
  static formatAddress(address: string | Address, length: number = 8): string {
    const addressStr = typeof address === 'string' ? address : String(address);
    if (addressStr.length <= length * 2) return addressStr;
    return `${addressStr.slice(0, length)}...${addressStr.slice(-length)}`;
  }

  /**
   * Convert lamports to SOL with formatting
   */
  static formatSOL(lamports: number | bigint): string {
    const sol = typeof lamports === 'bigint' ? 
      Number(lamports) / 1_000_000_000 : 
      lamports / 1_000_000_000;
    return `${sol.toFixed(6)} SOL`;
  }

  /**
   * Performance timer utility
   */
  static timer(name: string) {
    const start = Date.now();
    return {
      end: () => {
        const duration = Date.now() - start;
        this.logger.debug(`Timer [${name}]: ${duration}ms`);
        return duration;
      }
    };
  }

  /**
   * Retry utility with exponential backoff
   */
  static async retry<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    let lastError: Error;
    
    for (let i = 0; i <= maxRetries; i++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;
        
        if (i === maxRetries) {
          this.logger.error(`Retry failed after ${maxRetries} attempts`, error);
          throw lastError;
        }
        
        const delay = baseDelay * Math.pow(2, i);
        this.logger.warn(`Retry attempt ${i + 1}/${maxRetries} failed, retrying in ${delay}ms`, error);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError!;
  }

  /**
   * Environment detection
   */
  static getEnvironment(): 'browser' | 'node' | 'unknown' {
    if (typeof window !== 'undefined') return 'browser';
    if (typeof process !== 'undefined' && process.versions?.node) return 'node';
    return 'unknown';
  }

  /**
   * Memory usage (Node.js only)
   */
  static getMemoryUsage(): any {
    if (this.getEnvironment() !== 'node') return null;
    
    try {
      const usage = (process as any).memoryUsage();
      return {
        rss: `${Math.round(usage.rss / 1024 / 1024 * 100) / 100} MB`,
        heapTotal: `${Math.round(usage.heapTotal / 1024 / 1024 * 100) / 100} MB`,
        heapUsed: `${Math.round(usage.heapUsed / 1024 / 1024 * 100) / 100} MB`,
        external: `${Math.round(usage.external / 1024 / 1024 * 100) / 100} MB`
      };
    } catch {
      return null;
    }
  }

  /**
   * Generate development report
   */
  static generateReport(): string {
    const report = {
      timestamp: new Date().toISOString(),
      environment: this.getEnvironment(),
      memoryUsage: this.getMemoryUsage(),
      logBuffer: this.logger.getLogBuffer().slice(-10), // Last 10 log entries
      sdkVersion: this.getSDKVersion(), // Real implementation instead of TODO
      nodeVersion: this.getEnvironment() === 'node' ? (process as any).version : 'N/A'
    };
    
    return JSON.stringify(report, null, 2);
  }

  /**
   * Get SDK version from package.json
   */
  private static getSDKVersion(): string {
    // Real implementation to get version from package.json
    try {
      if (this.getEnvironment() === 'node') {
        // Node.js environment - try to read package.json
        const fs = require('fs');
        const path = require('path');
        
        // Try different paths to find package.json
        const possiblePaths = [
          path.join(__dirname, '../../package.json'),
          path.join(__dirname, '../package.json'),
          path.join(process.cwd(), 'package.json')
        ];
        
        for (const packagePath of possiblePaths) {
          try {
            if (fs.existsSync(packagePath)) {
              const packageData = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
              if (packageData.version) {
                return packageData.version;
              }
            }
          } catch {
            // Continue to next path
          }
        }
      }
      
      // Fallback: try to get from global if available
      if (typeof globalThis !== 'undefined' && (globalThis as any).__SDK_VERSION__) {
        return (globalThis as any).__SDK_VERSION__;
      }
      
      // Final fallback
      return '1.0.0';
    } catch {
      return '1.0.0';
    }
  }

  async getSDKInfo(): Promise<SDKInfo> {
    // Get SDK version from package.json
    let sdkVersion = '1.0.0';
    try {
      if (typeof window === 'undefined') {
        // Node.js environment
        const fs = await import('fs');
        const path = await import('path');
        const { fileURLToPath } = await import('url');
        
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = path.dirname(__filename);
        const packagePath = path.join(__dirname, '../../package.json');
        
        if (fs.existsSync(packagePath)) {
          const packageData = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
          sdkVersion = packageData.version || '1.0.0';
        }
      }
    } catch (error) {
      // Fallback to default version
    }

    return {
      timestamp: Date.now(),
      sdkVersion,
    };
  }
}

/**
 * Performance Monitoring
 */
export class PerformanceMonitor {
  private static measurements: Map<string, number[]> = new Map();
  private static logger = DebugLogger.getInstance();

  static start(name: string): string {
    const id = `${name}_${Date.now()}_${Math.random()}`;
    (performance as any).mark(`${id}_start`);
    return id;
  }

  static end(id: string): number {
    try {
      (performance as any).mark(`${id}_end`);
      (performance as any).measure(id, `${id}_start`, `${id}_end`);
      
      const entries = (performance as any).getEntriesByName(id);
      const duration = entries[entries.length - 1]?.duration || 0;
      
      // Store measurement
      const baseName = id.split('_')[0];
      if (!this.measurements.has(baseName)) {
        this.measurements.set(baseName, []);
      }
      this.measurements.get(baseName)!.push(duration);
      
      this.logger.debug(`Performance [${baseName}]: ${duration.toFixed(2)}ms`);
      return duration;
    } catch (error) {
      this.logger.warn('Performance measurement failed', error);
      return 0;
    }
  }

  static getStats(name: string): { avg: number; min: number; max: number; count: number } | null {
    const measurements = this.measurements.get(name);
    if (!measurements || measurements.length === 0) return null;
    
    const avg = measurements.reduce((sum, val) => sum + val, 0) / measurements.length;
    const min = Math.min(...measurements);
    const max = Math.max(...measurements);
    
    return { avg, min, max, count: measurements.length };
  }

  static getAllStats(): Record<string, ReturnType<typeof PerformanceMonitor.getStats>> {
    const stats: Record<string, any> = {};
    for (const [name] of this.measurements) {
      stats[name] = this.getStats(name);
    }
    return stats;
  }

  static reset(name?: string): void {
    if (name) {
      this.measurements.delete(name);
    } else {
      this.measurements.clear();
    }
  }
}

// Create default logger instance
export const logger = DebugLogger.getInstance({
  logLevel: process?.env?.NODE_ENV === 'development' ? LogLevel.DEBUG : LogLevel.INFO,
  enableColors: true,
  showTimestamp: true,
  showStackTrace: process?.env?.NODE_ENV === 'development'
});

// Export for global use
export const debug = {
  logger,
  DevUtils,
  PerformanceMonitor,
  PodProtocolError,
  ValidationError,
  NetworkError,
  ConfigurationError
};

export default debug; 