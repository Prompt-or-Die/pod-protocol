/**
 * Advanced Connection Pooling for PoD Protocol SDK
 * Provides intelligent connection management with load balancing and health monitoring
 */

import { createSolanaRpc } from '@solana/rpc';
import type { Rpc } from '@solana/rpc';
import { ErrorHandler, NetworkError } from './error-handling.js';
import { RetryUtils } from './retry.js';

export interface ConnectionPoolConfig {
  /** RPC endpoints to pool */
  endpoints: string[];
  /** Maximum connections per endpoint */
  maxConnectionsPerEndpoint?: number;
  /** Connection timeout in milliseconds */
  connectionTimeout?: number;
  /** Health check interval in milliseconds */
  healthCheckInterval?: number;
  /** Request timeout in milliseconds */
  requestTimeout?: number;
  /** Enable load balancing */
  enableLoadBalancing?: boolean;
  /** Load balancing strategy */
  loadBalancingStrategy?: 'round-robin' | 'weighted' | 'least-connections' | 'response-time';
  /** Enable automatic failover */
  enableFailover?: boolean;
  /** Circuit breaker configuration */
  circuitBreaker?: {
    failureThreshold: number;
    recoveryTimeout: number;
    monitoringPeriod: number;
  };
}

export interface ConnectionMetrics {
  endpoint: string;
  status: 'healthy' | 'degraded' | 'failed';
  activeConnections: number;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  lastSuccessfulRequest: number;
  lastFailedRequest: number;
  circuitBreakerState: 'closed' | 'open' | 'half-open';
}

export interface PoolStats {
  totalEndpoints: number;
  healthyEndpoints: number;
  totalConnections: number;
  activeRequests: number;
  totalRequests: number;
  successRate: number;
  averageResponseTime: number;
  uptime: number;
}

interface ConnectionInstance {
  rpc: Rpc<any>;
  endpoint: string;
  createdAt: number;
  lastUsed: number;
  requestCount: number;
  isHealthy: boolean;
}

interface CircuitBreakerState {
  state: 'closed' | 'open' | 'half-open';
  failureCount: number;
  lastFailureTime: number;
  nextAttemptTime: number;
}

export class AdvancedConnectionPool {
  private config: Required<ConnectionPoolConfig>;
  private connections: Map<string, ConnectionInstance[]> = new Map();
  private endpointMetrics: Map<string, ConnectionMetrics> = new Map();
  private circuitBreakers: Map<string, CircuitBreakerState> = new Map();
  private healthCheckInterval?: NodeJS.Timeout;
  private roundRobinIndex = 0;
  private startTime = Date.now();

  constructor(config: ConnectionPoolConfig) {
    this.config = {
      endpoints: config.endpoints,
      maxConnectionsPerEndpoint: config.maxConnectionsPerEndpoint || 10,
      connectionTimeout: config.connectionTimeout || 30000,
      healthCheckInterval: config.healthCheckInterval || 60000,
      requestTimeout: config.requestTimeout || 15000,
      enableLoadBalancing: config.enableLoadBalancing ?? true,
      loadBalancingStrategy: config.loadBalancingStrategy || 'round-robin',
      enableFailover: config.enableFailover ?? true,
      circuitBreaker: config.circuitBreaker || {
        failureThreshold: 5,
        recoveryTimeout: 60000,
        monitoringPeriod: 300000
      }
    };

    this.initializePool();
    this.startHealthMonitoring();
  }

  /**
   * Initialize connection pool for all endpoints
   */
  private initializePool(): void {
    for (const endpoint of this.config.endpoints) {
      this.connections.set(endpoint, []);
      this.endpointMetrics.set(endpoint, {
        endpoint,
        status: 'healthy',
        activeConnections: 0,
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        averageResponseTime: 0,
        lastSuccessfulRequest: 0,
        lastFailedRequest: 0,
        circuitBreakerState: 'closed'
      });
      this.circuitBreakers.set(endpoint, {
        state: 'closed',
        failureCount: 0,
        lastFailureTime: 0,
        nextAttemptTime: 0
      });
    }
  }

  /**
   * Get optimal connection for request
   */
  async getConnection(): Promise<Rpc<any>> {
    const endpoint = this.selectOptimalEndpoint();
    if (!endpoint) {
      throw new NetworkError('No healthy endpoints available');
    }

    const connection = await this.getConnectionForEndpoint(endpoint);
    return connection.rpc;
  }

  /**
   * Execute RPC call with intelligent routing and retry
   */
  async executeRpcCall<T>(
    method: (rpc: Rpc<any>) => Promise<T>,
    maxRetries: number = 3
  ): Promise<T> {
    let lastError: Error | null = null;
    let attempts = 0;

    while (attempts < maxRetries) {
      const endpoint = this.selectOptimalEndpoint();
      if (!endpoint) {
        throw new NetworkError('No healthy endpoints available');
      }

      const startTime = performance.now();
      const connection = await this.getConnectionForEndpoint(endpoint);
      const metrics = this.endpointMetrics.get(endpoint)!;

      try {
        metrics.activeConnections++;
        metrics.totalRequests++;
        
        const result = await Promise.race([
          method(connection.rpc),
          new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('Request timeout')), this.config.requestTimeout)
          )
        ]);

        // Record successful request
        const responseTime = performance.now() - startTime;
        this.recordSuccess(endpoint, responseTime);
        connection.lastUsed = Date.now();
        connection.requestCount++;

        return result;
      } catch (error) {
        this.recordFailure(endpoint, error as Error);
        lastError = error as Error;
        attempts++;
      } finally {
        metrics.activeConnections--;
      }
    }

    throw ErrorHandler.classify(lastError || new Error('All retry attempts failed'), 'executeRpcCall');
  }

  /**
   * Select optimal endpoint based on strategy
   */
  private selectOptimalEndpoint(): string | null {
    const healthyEndpoints = this.getHealthyEndpoints();
    if (healthyEndpoints.length === 0) {
      return null;
    }

    switch (this.config.loadBalancingStrategy) {
      case 'round-robin':
        return this.selectRoundRobin(healthyEndpoints);
      
      case 'least-connections':
        return this.selectLeastConnections(healthyEndpoints);
      
      case 'response-time':
        return this.selectFastestResponseTime(healthyEndpoints);
      
      case 'weighted':
        return this.selectWeighted(healthyEndpoints);
      
      default:
        return healthyEndpoints[0];
    }
  }

  /**
   * Round-robin endpoint selection
   */
  private selectRoundRobin(endpoints: string[]): string {
    const endpoint = endpoints[this.roundRobinIndex % endpoints.length];
    this.roundRobinIndex++;
    return endpoint;
  }

  /**
   * Select endpoint with least active connections
   */
  private selectLeastConnections(endpoints: string[]): string {
    return endpoints.reduce((optimal, current) => {
      const currentMetrics = this.endpointMetrics.get(current)!;
      const optimalMetrics = this.endpointMetrics.get(optimal)!;
      
      return currentMetrics.activeConnections < optimalMetrics.activeConnections 
        ? current 
        : optimal;
    });
  }

  /**
   * Select endpoint with fastest average response time
   */
  private selectFastestResponseTime(endpoints: string[]): string {
    return endpoints.reduce((optimal, current) => {
      const currentMetrics = this.endpointMetrics.get(current)!;
      const optimalMetrics = this.endpointMetrics.get(optimal)!;
      
      // Prefer endpoints with recent successful requests and low response times
      if (currentMetrics.averageResponseTime === 0) return optimal;
      if (optimalMetrics.averageResponseTime === 0) return current;
      
      return currentMetrics.averageResponseTime < optimalMetrics.averageResponseTime 
        ? current 
        : optimal;
    });
  }

  /**
   * Weighted selection based on success rate and performance
   */
  private selectWeighted(endpoints: string[]): string {
    const weights = endpoints.map(endpoint => {
      const metrics = this.endpointMetrics.get(endpoint)!;
      const successRate = metrics.totalRequests > 0 
        ? metrics.successfulRequests / metrics.totalRequests 
        : 1;
      
      const responseScore = metrics.averageResponseTime > 0 
        ? 1000 / metrics.averageResponseTime 
        : 1;
      
      return successRate * responseScore;
    });

    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    const random = Math.random() * totalWeight;
    
    let weightSum = 0;
    for (let i = 0; i < endpoints.length; i++) {
      weightSum += weights[i];
      if (random <= weightSum) {
        return endpoints[i];
      }
    }
    
    return endpoints[endpoints.length - 1];
  }

  /**
   * Get healthy endpoints based on circuit breaker state
   */
  private getHealthyEndpoints(): string[] {
    return this.config.endpoints.filter(endpoint => {
      const circuitBreaker = this.circuitBreakers.get(endpoint)!;
      const metrics = this.endpointMetrics.get(endpoint)!;
      
      // Check circuit breaker state
      if (circuitBreaker.state === 'open') {
        if (Date.now() >= circuitBreaker.nextAttemptTime) {
          circuitBreaker.state = 'half-open';
          return true;
        }
        return false;
      }
      
      return metrics.status !== 'failed';
    });
  }

  /**
   * Get or create connection for specific endpoint
   */
  private async getConnectionForEndpoint(endpoint: string): Promise<ConnectionInstance> {
    const connections = this.connections.get(endpoint)!;
    
    // Find available connection
    const availableConnection = connections.find(conn => 
      conn.isHealthy && 
      Date.now() - conn.lastUsed < 300000 // 5 minutes idle timeout
    );
    
    if (availableConnection) {
      return availableConnection;
    }

    // Create new connection if under limit
    if (connections.length < this.config.maxConnectionsPerEndpoint) {
      const newConnection = await this.createConnection(endpoint);
      connections.push(newConnection);
      return newConnection;
    }

    // Reuse oldest connection
    const oldestConnection = connections.reduce((oldest, current) => 
      current.lastUsed < oldest.lastUsed ? current : oldest
    );
    
    return oldestConnection;
  }

  /**
   * Create new connection instance
   */
  private async createConnection(endpoint: string): Promise<ConnectionInstance> {
    try {
      const rpc = createSolanaRpc(endpoint);
      
      return {
        rpc,
        endpoint,
        createdAt: Date.now(),
        lastUsed: Date.now(),
        requestCount: 0,
        isHealthy: true
      };
    } catch (error) {
      throw new NetworkError(`Failed to create connection to ${endpoint}: ${error}`);
    }
  }

  /**
   * Record successful request
   */
  private recordSuccess(endpoint: string, responseTime: number): void {
    const metrics = this.endpointMetrics.get(endpoint)!;
    const circuitBreaker = this.circuitBreakers.get(endpoint)!;

    metrics.successfulRequests++;
    metrics.lastSuccessfulRequest = Date.now();
    
    // Update average response time
    const totalResponseTime = metrics.averageResponseTime * (metrics.successfulRequests - 1) + responseTime;
    metrics.averageResponseTime = totalResponseTime / metrics.successfulRequests;

    // Update status
    if (metrics.status === 'failed') {
      metrics.status = 'healthy';
    }

    // Reset circuit breaker on successful request
    if (circuitBreaker.state === 'half-open') {
      circuitBreaker.state = 'closed';
      circuitBreaker.failureCount = 0;
    }
    
    metrics.circuitBreakerState = circuitBreaker.state;
  }

  /**
   * Record failed request
   */
  private recordFailure(endpoint: string, error: Error): void {
    const metrics = this.endpointMetrics.get(endpoint)!;
    const circuitBreaker = this.circuitBreakers.get(endpoint)!;

    metrics.failedRequests++;
    metrics.lastFailedRequest = Date.now();
    
    // Update circuit breaker
    circuitBreaker.failureCount++;
    circuitBreaker.lastFailureTime = Date.now();

    // Check if circuit breaker should open
    if (circuitBreaker.failureCount >= this.config.circuitBreaker.failureThreshold) {
      circuitBreaker.state = 'open';
      circuitBreaker.nextAttemptTime = Date.now() + this.config.circuitBreaker.recoveryTimeout;
      metrics.status = 'failed';
    } else if (circuitBreaker.state === 'half-open') {
      circuitBreaker.state = 'open';
      circuitBreaker.nextAttemptTime = Date.now() + this.config.circuitBreaker.recoveryTimeout;
    }
    
    metrics.circuitBreakerState = circuitBreaker.state;
  }

  /**
   * Start health monitoring
   */
  private startHealthMonitoring(): void {
    this.healthCheckInterval = setInterval(async () => {
      await this.performHealthChecks();
      this.updateCircuitBreakers();
    }, this.config.healthCheckInterval);
  }

  /**
   * Perform health checks on all endpoints
   */
  private async performHealthChecks(): Promise<void> {
    const healthCheckPromises = this.config.endpoints.map(async endpoint => {
      try {
        const connection = await this.getConnectionForEndpoint(endpoint);
        
        // Simple health check - get slot  
        await Promise.race([
          (connection.rpc as any).getSlot().send(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Health check timeout')), 5000)
          )
        ]);
        
        const metrics = this.endpointMetrics.get(endpoint)!;
        if (metrics.status === 'failed') {
          metrics.status = 'healthy';
        }
      } catch (error) {
        const metrics = this.endpointMetrics.get(endpoint)!;
        metrics.status = 'degraded';
      }
    });

    await Promise.allSettled(healthCheckPromises);
  }

  /**
   * Update circuit breaker states
   */
  private updateCircuitBreakers(): void {
    for (const [endpoint, circuitBreaker] of this.circuitBreakers.entries()) {
      const metrics = this.endpointMetrics.get(endpoint)!;
      
      // Reset failure count after monitoring period
      if (Date.now() - circuitBreaker.lastFailureTime > this.config.circuitBreaker.monitoringPeriod) {
        circuitBreaker.failureCount = 0;
      }

      // Transition from open to half-open if recovery timeout passed
      if (circuitBreaker.state === 'open' && Date.now() >= circuitBreaker.nextAttemptTime) {
        circuitBreaker.state = 'half-open';
      }
      
      metrics.circuitBreakerState = circuitBreaker.state;
    }
  }

  /**
   * Get connection pool statistics
   */
  getStats(): PoolStats {
    const healthyEndpoints = this.getHealthyEndpoints().length;
    const totalConnections = Array.from(this.connections.values())
      .reduce((total, connections) => total + connections.length, 0);
    
    const allMetrics = Array.from(this.endpointMetrics.values());
    const totalRequests = allMetrics.reduce((sum, m) => sum + m.totalRequests, 0);
    const successfulRequests = allMetrics.reduce((sum, m) => sum + m.successfulRequests, 0);
    const activeRequests = allMetrics.reduce((sum, m) => sum + m.activeConnections, 0);
    
    const totalResponseTime = allMetrics.reduce((sum, m) => 
      sum + (m.averageResponseTime * m.successfulRequests), 0
    );
    const averageResponseTime = successfulRequests > 0 ? totalResponseTime / successfulRequests : 0;

    return {
      totalEndpoints: this.config.endpoints.length,
      healthyEndpoints,
      totalConnections,
      activeRequests,
      totalRequests,
      successRate: totalRequests > 0 ? successfulRequests / totalRequests : 0,
      averageResponseTime,
      uptime: Date.now() - this.startTime
    };
  }

  /**
   * Get detailed metrics for all endpoints
   */
  getDetailedMetrics(): ConnectionMetrics[] {
    return Array.from(this.endpointMetrics.values());
  }

  /**
   * Add new endpoint to pool
   */
  async addEndpoint(endpoint: string): Promise<void> {
    if (this.connections.has(endpoint)) {
      return;
    }

    this.config.endpoints.push(endpoint);
    this.connections.set(endpoint, []);
    this.endpointMetrics.set(endpoint, {
      endpoint,
      status: 'healthy',
      activeConnections: 0,
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      lastSuccessfulRequest: 0,
      lastFailedRequest: 0,
      circuitBreakerState: 'closed'
    });
    this.circuitBreakers.set(endpoint, {
      state: 'closed',
      failureCount: 0,
      lastFailureTime: 0,
      nextAttemptTime: 0
    });

    // Test new endpoint
    try {
      await this.createConnection(endpoint);
    } catch (error) {
      console.warn(`Failed to initialize connection to new endpoint ${endpoint}:`, error);
    }
  }

  /**
   * Remove endpoint from pool
   */
  removeEndpoint(endpoint: string): void {
    const connections = this.connections.get(endpoint);
    if (connections) {
      // Close all connections for this endpoint
      connections.length = 0;
    }

    this.connections.delete(endpoint);
    this.endpointMetrics.delete(endpoint);
    this.circuitBreakers.delete(endpoint);
    
    const index = this.config.endpoints.indexOf(endpoint);
    if (index > -1) {
      this.config.endpoints.splice(index, 1);
    }
  }

  /**
   * Clean up pool resources
   */
  destroy(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    // Clear all connections
    for (const connections of this.connections.values()) {
      connections.length = 0;
    }

    this.connections.clear();
    this.endpointMetrics.clear();
    this.circuitBreakers.clear();
  }
} 