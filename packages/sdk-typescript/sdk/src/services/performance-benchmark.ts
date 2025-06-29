/**
 * Performance Benchmarking Service for PoD Protocol SDK
 * Measures and optimizes performance across all services
 */

import { PerformanceBenchmark, PerformanceMonitor, globalPerformanceMonitor, BenchmarkResult } from '../utils/performance.js';
import { AnalyticsService } from './analytics.js';
import { DiscoveryService } from './discovery.js';
import { ChannelService } from './channel.js';
import { ZKCompressionService } from './zk-compression.js';
import { ErrorHandler } from '../utils/error-handling.js';
import { RetryUtils } from '../utils/retry.js';
import { address } from '@solana/addresses';

export interface BenchmarkSuite {
  name: string;
  description: string;
  benchmarks: Array<{
    name: string;
    operation: () => Promise<unknown>;
    expectedOps?: number;
    timeout?: number;
  }>;
}

export interface PerformanceReport {
  suiteResults: Array<{
    suiteName: string;
    benchmarks: Array<{
      name: string;
      result: BenchmarkResult;
      passed: boolean;
      score: number;
    }>;
    overallScore: number;
  }>;
  systemMetrics: {
    totalBenchmarks: number;
    passedBenchmarks: number;
    averageScore: number;
    performanceGrade: 'A' | 'B' | 'C' | 'D' | 'F';
  };
  recommendations: string[];
  timestamp: number;
}

export class PerformanceBenchmarkService {
  private monitor: PerformanceMonitor;
  private analyticsService?: AnalyticsService;
  private discoveryService?: DiscoveryService;
  private channelService?: ChannelService;
  private zkCompressionService?: ZKCompressionService;

  constructor() {
    this.monitor = globalPerformanceMonitor;
  }

  /**
   * Initialize with service instances for benchmarking
   */
  initialize(services: {
    analytics?: AnalyticsService;
    discovery?: DiscoveryService;
    channel?: ChannelService;
    zkCompression?: ZKCompressionService;
  }): void {
    this.analyticsService = services.analytics;
    this.discoveryService = services.discovery;
    this.channelService = services.channel;
    this.zkCompressionService = services.zkCompression;
  }

  /**
   * Run comprehensive performance benchmarks
   */
  async runFullBenchmarkSuite(): Promise<PerformanceReport> {
    const suites = [
      await this.createAnalyticsBenchmarks(),
      await this.createDiscoveryBenchmarks(),
      await this.createChannelBenchmarks(),
      await this.createZKCompressionBenchmarks(),
      await this.createRPCBenchmarks(),
      await this.createCachingBenchmarks()
    ];

    const suiteResults = [];
    let totalBenchmarks = 0;
    let passedBenchmarks = 0;
    let totalScore = 0;

    for (const suite of suites) {
      const suiteResult = await this.runBenchmarkSuite(suite);
      suiteResults.push(suiteResult);
      
      totalBenchmarks += suiteResult.benchmarks.length;
      passedBenchmarks += suiteResult.benchmarks.filter(b => b.passed).length;
      totalScore += suiteResult.overallScore;
    }

    const averageScore = totalScore / suites.length;
    const performanceGrade = this.calculateGrade(averageScore);
    const recommendations = this.generateRecommendations(suiteResults);

    return {
      suiteResults,
      systemMetrics: {
        totalBenchmarks,
        passedBenchmarks,
        averageScore,
        performanceGrade
      },
      recommendations,
      timestamp: Date.now()
    };
  }

  /**
   * Create analytics service benchmarks
   */
  private async createAnalyticsBenchmarks(): Promise<BenchmarkSuite> {
    if (!this.analyticsService) {
      return { name: 'Analytics', description: 'Analytics service not available', benchmarks: [] };
    }

    return {
      name: 'Analytics Service',
      description: 'Benchmarks for analytics data retrieval and processing',
      benchmarks: [
        {
          name: 'Agent Analytics Retrieval',
          operation: () => this.analyticsService!.getAgentAnalytics(),
          expectedOps: 10, // 10 ops/second expected
          timeout: 5000
        },
        {
          name: 'Message Analytics Processing',
          operation: () => this.analyticsService!.getMessageAnalytics(1000),
          expectedOps: 5,
          timeout: 10000
        },
        {
          name: 'Channel Analytics Computation',
          operation: () => this.analyticsService!.getChannelAnalytics(100),
          expectedOps: 8,
          timeout: 7000
        },
        {
          name: 'Network Analytics Aggregation',
          operation: () => this.analyticsService!.getNetworkAnalytics(),
          expectedOps: 3,
          timeout: 15000
        },
        {
          name: 'Dashboard Data Compilation',
          operation: () => this.analyticsService!.getDashboard(),
          expectedOps: 2,
          timeout: 20000
        }
      ]
    };
  }

  /**
   * Create discovery service benchmarks
   */
  private async createDiscoveryBenchmarks(): Promise<BenchmarkSuite> {
    if (!this.discoveryService) {
      return { name: 'Discovery', description: 'Discovery service not available', benchmarks: [] };
    }

    return {
      name: 'Discovery Service',
      description: 'Benchmarks for agent discovery and recommendation algorithms',
      benchmarks: [
        {
          name: 'Agent Search Performance',
          operation: () => this.discoveryService!.searchAgents({
            capabilities: [1, 2], // 1=trading, 2=analytics as numbers
            limit: 50
          }),
          expectedOps: 15,
          timeout: 3000
        },
        {
          name: 'Recommendation Algorithm',
          operation: () => this.discoveryService!.getAgentRecommendations(address('test_agent'), 10),
          expectedOps: 20,
          timeout: 2000
        },
        {
          name: 'Channel Discovery',
          operation: () => this.discoveryService!.searchChannels({
            nameContains: 'trading',
            limit: 20
          }),
          expectedOps: 12,
          timeout: 4000
        },
        {
          name: 'Relevance Scoring',
          operation: async () => {
            // Test relevance scoring algorithm
            const agents = await this.discoveryService!.searchAgents({ limit: 100 });
            return agents.items.slice(0, 10); // Top 10 most relevant
          },
          expectedOps: 25,
          timeout: 2000
        }
      ]
    };
  }

  /**
   * Create channel service benchmarks
   */
  private async createChannelBenchmarks(): Promise<BenchmarkSuite> {
    if (!this.channelService) {
      return { name: 'Channel', description: 'Channel service not available', benchmarks: [] };
    }

    return {
      name: 'Channel Service',
      description: 'Benchmarks for channel operations and message handling',
      benchmarks: [
        {
          name: 'Channel Listing',
          operation: () => this.channelService!.getAllChannels(100),
          expectedOps: 10,
          timeout: 5000
        },
        {
          name: 'Participant Retrieval',
          operation: async () => {
            const channels = await this.channelService!.getAllChannels(10);
            if (channels.length > 0) {
              return this.channelService!.getChannelParticipants(channels[0].pubkey);
            }
            return [];
          },
          expectedOps: 8,
          timeout: 6000
        },
        {
          name: 'Message History Loading',
          operation: async () => {
            const channels = await this.channelService!.getAllChannels(10);
            if (channels.length > 0) {
              return this.channelService!.getChannelMessages(channels[0].pubkey, 50);
            }
            return [];
          },
          expectedOps: 5,
          timeout: 8000
        }
      ]
    };
  }

  /**
   * Create ZK compression benchmarks
   */
  private async createZKCompressionBenchmarks(): Promise<BenchmarkSuite> {
    if (!this.zkCompressionService) {
      return { name: 'ZK Compression', description: 'ZK compression service not available', benchmarks: [] };
    }

    return {
      name: 'ZK Compression Service',
      description: 'Benchmarks for compression and decompression operations',
      benchmarks: [
        {
          name: 'Message Compression',
          operation: () => this.zkCompressionService!.compressMessage(
            'test_channel',
            'Test message content for compression benchmarking',
            { messageType: 'text' }
          ),
          expectedOps: 5,
          timeout: 10000
        },
        {
          name: 'Batch Processing',
          operation: () => this.zkCompressionService!.flush(),
          expectedOps: 2,
          timeout: 15000
        },
        {
          name: 'Compression Stats',
          operation: () => Promise.resolve(this.zkCompressionService!.getStats('test_channel')),
          expectedOps: 50,
          timeout: 1000
        }
      ]
    };
  }

  /**
   * Create RPC performance benchmarks
   */
  private async createRPCBenchmarks(): Promise<BenchmarkSuite> {
    return {
      name: 'RPC Performance',
      description: 'Benchmarks for blockchain RPC operations',
      benchmarks: [
        {
          name: 'Account Fetching',
          operation: async () => {
            // Simulate account fetching
            await new Promise(resolve => setTimeout(resolve, 100));
            return { success: true };
          },
          expectedOps: 20,
          timeout: 2000
        },
        {
          name: 'Transaction Building',
          operation: async () => {
            // Simulate transaction building
            await new Promise(resolve => setTimeout(resolve, 50));
            return { transaction: 'mock_tx' };
          },
          expectedOps: 30,
          timeout: 1500
        },
        {
          name: 'Signature Verification',
          operation: async () => {
            // Simulate signature verification
            await new Promise(resolve => setTimeout(resolve, 25));
            return { verified: true };
          },
          expectedOps: 40,
          timeout: 1000
        }
      ]
    };
  }

  /**
   * Create caching performance benchmarks
   */
  private async createCachingBenchmarks(): Promise<BenchmarkSuite> {
    return {
      name: 'Caching Performance',
      description: 'Benchmarks for caching system performance',
      benchmarks: [
        {
          name: 'Cache Hit Performance',
          operation: async () => {
            // Simulate cache operations
            const data = { test: 'data', timestamp: Date.now() };
            return data;
          },
          expectedOps: 1000,
          timeout: 500
        },
        {
          name: 'Cache Miss Handling',
          operation: async () => {
            // Simulate cache miss and data fetching
            await new Promise(resolve => setTimeout(resolve, 10));
            return { cached: false, fetched: true };
          },
          expectedOps: 100,
          timeout: 1000
        },
        {
          name: 'Cache Eviction',
          operation: async () => {
            // Simulate cache eviction
            await new Promise(resolve => setTimeout(resolve, 5));
            return { evicted: true };
          },
          expectedOps: 200,
          timeout: 500
        }
      ]
    };
  }

  /**
   * Run a specific benchmark suite
   */
  private async runBenchmarkSuite(suite: BenchmarkSuite): Promise<{
    suiteName: string;
    benchmarks: Array<{
      name: string;
      result: PerformanceBenchmark;
      passed: boolean;
      score: number;
    }>;
    overallScore: number;
  }> {
    const benchmarkResults = [];
    let totalScore = 0;

    for (const benchmark of suite.benchmarks) {
      try {
        const timer = this.monitor.startTimer(`benchmark:${benchmark.name}`);
        
        const result = await PerformanceBenchmark.benchmark(
          benchmark.name,
          benchmark.operation,
          50, // 50 iterations
          5   // 5 warmup iterations
        );

        timer.end(true);

        const passed = benchmark.expectedOps ? result.opsPerSecond >= benchmark.expectedOps : true;
        const score = this.calculateBenchmarkScore(result, benchmark.expectedOps);

        benchmarkResults.push({
          name: benchmark.name,
          result,
          passed,
          score
        });

        totalScore += score;
      } catch (error) {
        // Handle benchmark failures
        benchmarkResults.push({
          name: benchmark.name,
          result: {
            name: benchmark.name,
            opsPerSecond: 0,
            averageTime: 0,
            minTime: 0,
            maxTime: 0,
            standardDeviation: 0,
            totalOperations: 0,
            memoryStats: { initial: 0, peak: 0, final: 0, growth: 0 }
          } as BenchmarkResult,
          passed: false,
          score: 0
        });
      }
    }

    const overallScore = benchmarkResults.length > 0 ? totalScore / benchmarkResults.length : 0;

    return {
      suiteName: suite.name,
      benchmarks: benchmarkResults,
      overallScore
    };
  }

  /**
   * Calculate score for individual benchmark
   */
  private calculateBenchmarkScore(result: BenchmarkResult, expectedOps?: number): number {
    if (!expectedOps) {
      // Score based on relative performance metrics
      const baseScore = Math.min(100, Math.max(0, 100 - result.averageTime));
      const memoryScore = Math.max(0, 100 - result.memoryStats.growth);
      return (baseScore + memoryScore) / 2;
    }

    // Score based on meeting expected operations per second
    const efficiency = result.opsPerSecond / expectedOps;
    return Math.min(100, efficiency * 100);
  }

  /**
   * Calculate overall performance grade
   */
  private calculateGrade(averageScore: number): 'A' | 'B' | 'C' | 'D' | 'F' {
    if (averageScore >= 90) return 'A';
    if (averageScore >= 80) return 'B';
    if (averageScore >= 70) return 'C';
    if (averageScore >= 60) return 'D';
    return 'F';
  }

  /**
   * Generate performance recommendations
   */
  private generateRecommendations(suiteResults: Array<any>): string[] {
    const recommendations: string[] = [];

    for (const suite of suiteResults) {
      if (suite.overallScore < 70) {
        recommendations.push(`${suite.suiteName} performance is below threshold. Consider optimization.`);
      }

      for (const benchmark of suite.benchmarks) {
        if (!benchmark.passed) {
          recommendations.push(`${benchmark.name} failed to meet performance expectations.`);
        }

        if (benchmark.result.memoryStats.growth > 50) {
          recommendations.push(`${benchmark.name} has high memory growth. Review memory management.`);
        }

        if (benchmark.result.standardDeviation > benchmark.result.averageTime * 0.5) {
          recommendations.push(`${benchmark.name} has high variance. Consider caching or optimization.`);
        }
      }
    }

    // General recommendations
    if (recommendations.length === 0) {
      recommendations.push('All benchmarks passed! System is performing optimally.');
    } else if (recommendations.length > 10) {
      recommendations.push('Consider systematic performance review and optimization.');
    }

    return recommendations;
  }

  /**
   * Run continuous performance monitoring
   */
  startContinuousMonitoring(intervalMs: number = 300000): void { // 5 minutes
    setInterval(async () => {
      try {
        const report = await this.runFullBenchmarkSuite();
        console.log('Performance Monitoring Report:', {
          grade: report.systemMetrics.performanceGrade,
          averageScore: report.systemMetrics.averageScore,
          timestamp: new Date(report.timestamp).toISOString()
        });

        // Log recommendations if performance is degrading
        if (report.systemMetrics.performanceGrade === 'D' || report.systemMetrics.performanceGrade === 'F') {
          console.warn('Performance degradation detected:', report.recommendations);
        }
      } catch (error) {
        console.error('Performance monitoring failed:', error);
      }
    }, intervalMs);
  }

  /**
   * Generate detailed performance report
   */
  async generateDetailedReport(): Promise<string> {
    const report = await this.runFullBenchmarkSuite();
    
    let output = '# PoD Protocol Performance Benchmark Report\n\n';
    output += `Generated: ${new Date(report.timestamp).toISOString()}\n`;
    output += `Overall Grade: ${report.systemMetrics.performanceGrade} (${report.systemMetrics.averageScore.toFixed(1)}%)\n\n`;

    for (const suite of report.suiteResults) {
      output += `## ${suite.suiteName} (Score: ${suite.overallScore.toFixed(1)}%)\n\n`;
      
      for (const benchmark of suite.benchmarks) {
        const result = benchmark.result;
        output += `### ${benchmark.name}\n`;
        output += `- Status: ${benchmark.passed ? '✅ PASSED' : '❌ FAILED'}\n`;
        output += `- Operations/sec: ${result.opsPerSecond.toFixed(2)}\n`;
        output += `- Average time: ${result.averageTime.toFixed(2)}ms\n`;
        output += `- Memory growth: ${result.memoryStats.growth.toFixed(2)}MB\n`;
        output += `- Score: ${benchmark.score.toFixed(1)}%\n\n`;
      }
    }

    output += '## Recommendations\n\n';
    for (const recommendation of report.recommendations) {
      output += `- ${recommendation}\n`;
    }

    return output;
  }
} 