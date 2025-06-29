/**
 * Performance optimization utilities for PoD Protocol SDK
 * Provides benchmarking, connection pooling, and performance monitoring
 */

import { ErrorHandler } from './error-handling.js';

// Type-safe interfaces for performance context data
interface PerformanceContext {
  [key: string]: string | number | boolean | undefined | null;
}

interface OperationContext extends PerformanceContext {
  operationType?: string;
  dataSize?: number;
  connectionId?: string;
  retry?: number;
  timeout?: number;
  endpoint?: string;
}

export interface PerformanceMetrics {
  /** Operation name */
  operation: string;
  /** Duration in milliseconds */
  duration: number;
  /** Success status */
  success: boolean;
  /** Timestamp when operation started */
  timestamp: number;
  /** Memory usage before operation (MB) */
  memoryBefore?: number;
  /** Memory usage after operation (MB) */
  memoryAfter?: number;
  /** Additional context data */
  context?: Record<string, unknown>;
}

export interface ConnectionPoolStats {
  /** Total connections in pool */
  totalConnections: number;
  /** Active connections currently in use */
  activeConnections: number;
  /** Idle connections available for use */
  idleConnections: number;
  /** Total requests served */
  totalRequests: number;
  /** Average response time in ms */
  averageResponseTime: number;
  /** Pool utilization percentage */
  utilization: number;
}

export interface BenchmarkResult {
  /** Benchmark name */
  name: string;
  /** Operations per second */
  opsPerSecond: number;
  /** Average operation time in ms */
  averageTime: number;
  /** Minimum operation time in ms */
  minTime: number;
  /** Maximum operation time in ms */
  maxTime: number;
  /** Standard deviation */
  standardDeviation: number;
  /** Total operations completed */
  totalOperations: number;
  /** Memory usage stats */
  memoryStats: {
    initial: number;
    peak: number;
    final: number;
    growth: number;
  };
}

/**
 * Performance monitor for tracking operation metrics
 */
export class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private maxMetrics: number = 1000;

  /**
   * Start timing an operation
   */
  startTimer(operation: string, context?: Record<string, unknown>): PerformanceTimer {
    return new PerformanceTimer(operation, context, this);
  }

  /**
   * Record a completed operation
   */
  recordMetric(metric: PerformanceMetrics): void {
    this.metrics.push(metric);
    
    // Trim old metrics to prevent memory leaks
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }
  }

  /**
   * Get performance statistics for operations
   */
  getStats(operation?: string, timeframe?: number): {
    count: number;
    averageDuration: number;
    successRate: number;
    minDuration: number;
    maxDuration: number;
    opsPerSecond: number;
  } {
    let filteredMetrics = this.metrics;

    // Filter by operation name
    if (operation) {
      filteredMetrics = filteredMetrics.filter(m => m.operation === operation);
    }

    // Filter by timeframe (last N milliseconds)
    if (timeframe) {
      const cutoff = Date.now() - timeframe;
      filteredMetrics = filteredMetrics.filter(m => m.timestamp > cutoff);
    }

    if (filteredMetrics.length === 0) {
      return {
        count: 0,
        averageDuration: 0,
        successRate: 0,
        minDuration: 0,
        maxDuration: 0,
        opsPerSecond: 0
      };
    }

    const durations = filteredMetrics.map(m => m.duration);
    const successes = filteredMetrics.filter(m => m.success).length;
    
    const totalDuration = durations.reduce((sum, d) => sum + d, 0);
    const averageDuration = totalDuration / filteredMetrics.length;
    
    const timeSpan = timeframe || (
      filteredMetrics.length > 1 
        ? filteredMetrics[filteredMetrics.length - 1].timestamp - filteredMetrics[0].timestamp
        : 1000
    );
    
    return {
      count: filteredMetrics.length,
      averageDuration,
      successRate: successes / filteredMetrics.length,
      minDuration: Math.min(...durations),
      maxDuration: Math.max(...durations),
      opsPerSecond: (filteredMetrics.length / timeSpan) * 1000
    };
  }

  /**
   * Get recent operation trends
   */
  getTrends(operation: string, buckets: number = 10): Array<{
    timeRange: string;
    count: number;
    averageDuration: number;
    successRate: number;
  }> {
    const now = Date.now();
    const bucketSize = 60000; // 1 minute buckets
    const trends: Array<{
      timeRange: string;
      count: number;
      averageDuration: number;
      successRate: number;
    }> = [];

    for (let i = 0; i < buckets; i++) {
      const bucketEnd = now - (i * bucketSize);
      const bucketStart = bucketEnd - bucketSize;
      
      const bucketMetrics = this.metrics.filter(m => 
        m.operation === operation &&
        m.timestamp >= bucketStart &&
        m.timestamp < bucketEnd
      );

      const successes = bucketMetrics.filter(m => m.success).length;
      const averageDuration = bucketMetrics.length > 0
        ? bucketMetrics.reduce((sum, m) => sum + m.duration, 0) / bucketMetrics.length
        : 0;

      trends.unshift({
        timeRange: `${new Date(bucketStart).toISOString().substr(11, 8)}-${new Date(bucketEnd).toISOString().substr(11, 8)}`,
        count: bucketMetrics.length,
        averageDuration,
        successRate: bucketMetrics.length > 0 ? successes / bucketMetrics.length : 0
      });
    }

    return trends;
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics = [];
  }

  /**
   * Get all operations being tracked
   */
  getTrackedOperations(): string[] {
    const operations = new Set(this.metrics.map(m => m.operation));
    return Array.from(operations);
  }
}

/**
 * Timer for measuring operation performance
 */
export class PerformanceTimer {
  private startTime: number;
  private startMemory?: number;

  constructor(
    private operation: string,
    private context: Record<string, unknown> = {},
    private monitor: PerformanceMonitor
  ) {
    this.startTime = performance.now();
    
    // Capture memory usage if available
    if (typeof process !== 'undefined' && process.memoryUsage) {
      this.startMemory = process.memoryUsage().heapUsed / 1024 / 1024; // MB
    }
  }

  /**
   * End timing and record metric
   */
  end(success: boolean = true, additionalContext?: Record<string, unknown>): PerformanceMetrics {
    const endTime = performance.now();
    const duration = endTime - this.startTime;
    
    let endMemory: number | undefined;
    if (typeof process !== 'undefined' && process.memoryUsage) {
      endMemory = process.memoryUsage().heapUsed / 1024 / 1024; // MB
    }

    const metric: PerformanceMetrics = {
      operation: this.operation,
      duration,
      success,
      timestamp: Date.now() - duration, // Start timestamp
      memoryBefore: this.startMemory,
      memoryAfter: endMemory,
      context: { ...this.context, ...additionalContext }
    };

    this.monitor.recordMetric(metric);
    return metric;
  }
}

/**
 * Connection pool for managing RPC connections
 */
export class ConnectionPool {
  private connections: Map<string, any> = new Map();
  private connectionStats: Map<string, {
    created: number;
    lastUsed: number;
    requestCount: number;
    totalResponseTime: number;
  }> = new Map();
  
  private maxConnections: number;
  private maxIdleTime: number;
  private cleanupInterval?: NodeJS.Timeout;

  constructor(maxConnections: number = 10, maxIdleTimeMs: number = 300000) { // 5 min idle timeout
    this.maxConnections = maxConnections;
    this.maxIdleTime = maxIdleTimeMs;
    
    // Start cleanup timer
    this.cleanupInterval = setInterval(() => {
      this.cleanupIdleConnections();
    }, 60000); // Check every minute
  }

  /**
   * Get or create a connection for the given URL
   */
  getConnection(url: string, createConnection: () => any): any {
    let connection = this.connections.get(url);
    
    if (!connection) {
      // Clean up old connections if at capacity
      if (this.connections.size >= this.maxConnections) {
        this.evictOldestConnection();
      }
      
      connection = createConnection();
      this.connections.set(url, connection);
      this.connectionStats.set(url, {
        created: Date.now(),
        lastUsed: Date.now(),
        requestCount: 0,
        totalResponseTime: 0
      });
    }

    // Update usage stats
    const stats = this.connectionStats.get(url)!;
    stats.lastUsed = Date.now();
    
    return connection;
  }

  /**
   * Record request completion for performance tracking
   */
  recordRequest(url: string, responseTime: number): void {
    const stats = this.connectionStats.get(url);
    if (stats) {
      stats.requestCount++;
      stats.totalResponseTime += responseTime;
    }
  }

  /**
   * Get connection pool statistics
   */
  getStats(): ConnectionPoolStats {
    const now = Date.now();
    const activeThreshold = 5000; // 5 seconds
    
    let activeConnections = 0;
    let totalRequests = 0;
    let totalResponseTime = 0;

    for (const stats of this.connectionStats.values()) {
      if (now - stats.lastUsed < activeThreshold) {
        activeConnections++;
      }
      totalRequests += stats.requestCount;
      totalResponseTime += stats.totalResponseTime;
    }

    return {
      totalConnections: this.connections.size,
      activeConnections,
      idleConnections: this.connections.size - activeConnections,
      totalRequests,
      averageResponseTime: totalRequests > 0 ? totalResponseTime / totalRequests : 0,
      utilization: (activeConnections / this.maxConnections) * 100
    };
  }

  /**
   * Clean up idle connections
   */
  private cleanupIdleConnections(): void {
    const now = Date.now();
    const urlsToRemove: string[] = [];

    for (const [url, stats] of this.connectionStats.entries()) {
      if (now - stats.lastUsed > this.maxIdleTime) {
        urlsToRemove.push(url);
      }
    }

    for (const url of urlsToRemove) {
      this.connections.delete(url);
      this.connectionStats.delete(url);
    }
  }

  /**
   * Evict the oldest connection
   */
  private evictOldestConnection(): void {
    let oldestUrl: string | null = null;
    let oldestTime = Date.now();

    for (const [url, stats] of this.connectionStats.entries()) {
      if (stats.created < oldestTime) {
        oldestTime = stats.created;
        oldestUrl = url;
      }
    }

    if (oldestUrl) {
      this.connections.delete(oldestUrl);
      this.connectionStats.delete(oldestUrl);
    }
  }

  /**
   * Destroy the connection pool
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.connections.clear();
    this.connectionStats.clear();
  }
}

/**
 * Benchmarking utility for performance testing
 */
export class PerformanceBenchmark {
  /**
   * Run a benchmark on an async operation
   */
  static async benchmark<T>(
    name: string,
    operation: () => Promise<T>,
    iterations: number = 100,
    warmupIterations: number = 10
  ): Promise<BenchmarkResult> {
    // Warmup
    for (let i = 0; i < warmupIterations; i++) {
      try {
        await operation();
      } catch (error) {
        // Ignore warmup errors
      }
    }

    // Force garbage collection if available
    if (typeof global !== 'undefined' && (global as any).gc) {
      (global as any).gc();
    }

    const times: number[] = [];
    const initialMemory = this.getMemoryUsage();
    let peakMemory = initialMemory;
    let successCount = 0;

    for (let i = 0; i < iterations; i++) {
      const startTime = performance.now();
      
      try {
        await operation();
        const endTime = performance.now();
        times.push(endTime - startTime);
        successCount++;
      } catch (error) {
        const endTime = performance.now();
        times.push(endTime - startTime); // Include failed operations in timing
      }

      // Track peak memory usage
      const currentMemory = this.getMemoryUsage();
      if (currentMemory > peakMemory) {
        peakMemory = currentMemory;
      }
    }

    const finalMemory = this.getMemoryUsage();
    
    // Calculate statistics
    const totalTime = times.reduce((sum, time) => sum + time, 0);
    const averageTime = totalTime / times.length;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    
    // Calculate standard deviation
    const variance = times.reduce((sum, time) => sum + Math.pow(time - averageTime, 2), 0) / times.length;
    const standardDeviation = Math.sqrt(variance);

    return {
      name,
      opsPerSecond: (successCount / totalTime) * 1000,
      averageTime,
      minTime,
      maxTime,
      standardDeviation,
      totalOperations: iterations,
      memoryStats: {
        initial: initialMemory,
        peak: peakMemory,
        final: finalMemory,
        growth: finalMemory - initialMemory
      }
    };
  }

  /**
   * Get current memory usage in MB
   */
  private static getMemoryUsage(): number {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      return process.memoryUsage().heapUsed / 1024 / 1024;
    }
    return 0;
  }

  /**
   * Compare two benchmark results
   */
  static compare(benchmark1: BenchmarkResult, benchmark2: BenchmarkResult): {
    speedImprovement: number;
    memoryImprovement: number;
    winner: string;
    summary: string;
  } {
    const speedImprovement = (benchmark2.opsPerSecond - benchmark1.opsPerSecond) / benchmark1.opsPerSecond;
    const memoryImprovement = (benchmark1.memoryStats.growth - benchmark2.memoryStats.growth) / benchmark1.memoryStats.growth;
    
    const speedWinner = speedImprovement > 0 ? benchmark2.name : benchmark1.name;
    const memoryWinner = memoryImprovement > 0 ? benchmark2.name : benchmark1.name;
    
    const winner = speedImprovement > 0 && memoryImprovement > 0 ? benchmark2.name :
                   speedImprovement < 0 && memoryImprovement < 0 ? benchmark1.name :
                   speedImprovement > Math.abs(memoryImprovement) ? benchmark2.name : benchmark1.name;

    const summary = `${benchmark2.name} vs ${benchmark1.name}: ` +
                   `${(speedImprovement * 100).toFixed(1)}% speed change, ` +
                   `${(memoryImprovement * 100).toFixed(1)}% memory improvement`;

    return {
      speedImprovement,
      memoryImprovement,
      winner,
      summary
    };
  }
}

/**
 * Performance decorator for automatic method timing
 */
export function measurePerformance(monitor: PerformanceMonitor, operation?: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const operationName = operation || `${target.constructor.name}.${propertyKey}`;

    descriptor.value = async function (...args: any[]) {
      const timer = monitor.startTimer(operationName, { args: args.length });
      
      try {
        const result = await originalMethod.apply(this, args);
        timer.end(true);
        return result;
      } catch (error) {
        timer.end(false, { error: error instanceof Error ? error.message : String(error) });
        throw error;
      }
    };

    return descriptor;
  };
}

/**
 * Global performance monitor instance
 */
export const globalPerformanceMonitor = new PerformanceMonitor(); 