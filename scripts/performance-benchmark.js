#!/usr/bin/env node

/**
 * 🏃‍♂️ PoD Protocol Performance Benchmarking Suite
 * 
 * Comprehensive benchmarking tool for testing and measuring the performance
 * of PoD Protocol components including:
 * - Agent registration and management
 * - Message throughput and latency
 * - Channel operations
 * - Blockchain interactions
 * - Memory and CPU usage
 */

import { performance } from 'perf_hooks';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { PoDProtocolSDK } from 'pod-protocol-sdk';
import chalk from 'chalk';
import ora from 'ora';
import Table from 'cli-table3';
import { writeFileSync } from 'fs';

class PerformanceBenchmark {
    constructor(config = {}) {
        this.config = {
            iterations: 100,
            concurrency: 10,
            warmupRounds: 5,
            outputFormat: 'json',
            saveResults: true,
            ...config
        };
        
        this.connection = new Connection(
            config.rpcUrl || 'https://api.devnet.solana.com',
            'confirmed'
        );
        
        this.results = {
            timestamp: new Date(),
            environment: this.getEnvironmentInfo(),
            tests: {},
            summary: {}
        };
        
        this.testAgents = [];
        this.testChannels = [];
    }

    /**
     * Run all benchmark tests
     */
    async runAllBenchmarks() {
        console.log(chalk.blue.bold('🏃‍♂️ PoD Protocol Performance Benchmark Suite'));
        console.log(chalk.gray('━'.repeat(80)));
        console.log();

        try {
            // Setup
            await this.setup();
            
            // Core benchmarks
            await this.benchmarkAgentOperations();
            await this.benchmarkMessageThroughput();
            await this.benchmarkChannelOperations();
            await this.benchmarkBlockchainInteractions();
            await this.benchmarkConcurrentOperations();
            await this.benchmarkMemoryUsage();
            
            // Stress tests
            await this.stressTestSystemLimits();
            
            // Generate summary
            this.generateSummary();
            
            // Save and display results
            await this.saveResults();
            this.displayResults();
            
        } catch (error) {
            console.error(chalk.red('❌ Benchmark failed:'), error);
        } finally {
            await this.cleanup();
        }
    }

    /**
     * Setup benchmark environment
     */
    async setup() {
        const spinner = ora('Setting up benchmark environment...').start();
        
        try {
            // Initialize SDK
            this.sdk = new PoDProtocolSDK(this.connection);
            
            // Create test wallets
            this.testWallets = Array.from({ length: this.config.concurrency }, () => Keypair.generate());
            
            // Fund test wallets (in devnet)
            for (const wallet of this.testWallets) {
                await this.requestAirdrop(wallet.publicKey);
            }
            
            spinner.succeed('✅ Benchmark environment ready');
        } catch (error) {
            spinner.fail('❌ Failed to setup benchmark environment');
            throw error;
        }
    }

    /**
     * Benchmark agent operations (creation, updates, queries)
     */
    async benchmarkAgentOperations() {
        console.log(chalk.blue('🤖 Benchmarking Agent Operations...'));
        
        const tests = {
            agentCreation: () => this.benchmarkAgentCreation(),
            agentQuery: () => this.benchmarkAgentQuery(),
            agentUpdate: () => this.benchmarkAgentUpdate(),
            agentDeletion: () => this.benchmarkAgentDeletion()
        };

        for (const [testName, testFunc] of Object.entries(tests)) {
            const result = await this.runTest(testName, testFunc);
            this.results.tests[`agent_${testName}`] = result;
        }
    }

    /**
     * Benchmark message throughput and latency
     */
    async benchmarkMessageThroughput() {
        console.log(chalk.blue('📨 Benchmarking Message Throughput...'));
        
        const tests = {
            singleMessage: () => this.benchmarkSingleMessage(),
            batchMessages: () => this.benchmarkBatchMessages(),
            concurrentMessages: () => this.benchmarkConcurrentMessages(),
            largeMessages: () => this.benchmarkLargeMessages()
        };

        for (const [testName, testFunc] of Object.entries(tests)) {
            const result = await this.runTest(testName, testFunc);
            this.results.tests[`message_${testName}`] = result;
        }
    }

    /**
     * Benchmark channel operations
     */
    async benchmarkChannelOperations() {
        console.log(chalk.blue('📡 Benchmarking Channel Operations...'));
        
        const tests = {
            channelCreation: () => this.benchmarkChannelCreation(),
            channelJoin: () => this.benchmarkChannelJoin(),
            channelBroadcast: () => this.benchmarkChannelBroadcast(),
            channelLeave: () => this.benchmarkChannelLeave()
        };

        for (const [testName, testFunc] of Object.entries(tests)) {
            const result = await this.runTest(testName, testFunc);
            this.results.tests[`channel_${testName}`] = result;
        }
    }

    /**
     * Benchmark blockchain interactions
     */
    async benchmarkBlockchainInteractions() {
        console.log(chalk.blue('⛓️ Benchmarking Blockchain Interactions...'));
        
        const tests = {
            transactionSubmission: () => this.benchmarkTransactionSubmission(),
            accountQueries: () => this.benchmarkAccountQueries(),
            programCalls: () => this.benchmarkProgramCalls(),
            eventListening: () => this.benchmarkEventListening()
        };

        for (const [testName, testFunc] of Object.entries(tests)) {
            const result = await this.runTest(testName, testFunc);
            this.results.tests[`blockchain_${testName}`] = result;
        }
    }

    /**
     * Benchmark concurrent operations
     */
    async benchmarkConcurrentOperations() {
        console.log(chalk.blue('🔄 Benchmarking Concurrent Operations...'));
        
        const result = await this.runTest('concurrent_mixed_operations', async () => {
            const operations = [];
            
            // Mix of different operations running concurrently
            for (let i = 0; i < this.config.concurrency; i++) {
                const wallet = this.testWallets[i % this.testWallets.length];
                
                operations.push(
                    this.createTestAgent(`concurrent_agent_${i}`, wallet),
                    this.sendTestMessage(`test_message_${i}`, wallet),
                    this.createTestChannel(`concurrent_channel_${i}`, wallet)
                );
            }
            
            const start = performance.now();
            await Promise.all(operations);
            const end = performance.now();
            
            return { duration: end - start, operations: operations.length };
        });
        
        this.results.tests.concurrent_operations = result;
    }

    /**
     * Benchmark memory usage
     */
    async benchmarkMemoryUsage() {
        console.log(chalk.blue('💾 Benchmarking Memory Usage...'));
        
        const memoryTest = async () => {
            const startMemory = process.memoryUsage();
            
            // Create many agents and messages to test memory usage
            const agents = [];
            for (let i = 0; i < 1000; i++) {
                agents.push(await this.createTestAgent(`memory_test_${i}`));
            }
            
            const peakMemory = process.memoryUsage();
            
            // Cleanup
            agents.length = 0; // Clear references
            if (global.gc) global.gc(); // Force garbage collection if available
            
            const endMemory = process.memoryUsage();
            
            return {
                startMemory,
                peakMemory,
                endMemory,
                memoryIncrease: peakMemory.heapUsed - startMemory.heapUsed,
                memoryPerAgent: (peakMemory.heapUsed - startMemory.heapUsed) / 1000
            };
        };
        
        const result = await this.runTest('memory_usage', memoryTest);
        this.results.tests.memory_usage = result;
    }

    /**
     * Stress test system limits
     */
    async stressTestSystemLimits() {
        console.log(chalk.blue('🔥 Running Stress Tests...'));
        
        const stressTests = {
            maxAgents: () => this.stressTestMaxAgents(),
            maxChannels: () => this.stressTestMaxChannels(),
            maxConcurrentMessages: () => this.stressTestMaxConcurrentMessages(),
            sustainedLoad: () => this.stressTestSustainedLoad()
        };

        for (const [testName, testFunc] of Object.entries(stressTests)) {
            try {
                const result = await this.runTest(testName, testFunc);
                this.results.tests[`stress_${testName}`] = result;
            } catch (error) {
                console.log(chalk.yellow(`⚠️ Stress test ${testName} reached system limits`));
                this.results.tests[`stress_${testName}`] = { error: error.message };
            }
        }
    }

    /**
     * Run a single test with timing and error handling
     */
    async runTest(testName, testFunction) {
        const spinner = ora(`Running ${testName}...`).start();
        
        try {
            // Warmup
            for (let i = 0; i < this.config.warmupRounds; i++) {
                await testFunction();
            }
            
            // Actual test
            const times = [];
            let errors = 0;
            
            for (let i = 0; i < this.config.iterations; i++) {
                try {
                    const start = performance.now();
                    const result = await testFunction();
                    const end = performance.now();
                    
                    times.push(end - start);
                    
                    if (result && result.duration !== undefined) {
                        times[times.length - 1] = result.duration;
                    }
                } catch (error) {
                    errors++;
                }
            }
            
            const stats = this.calculateStatistics(times);
            stats.errors = errors;
            stats.successRate = ((this.config.iterations - errors) / this.config.iterations) * 100;
            
            spinner.succeed(`✅ ${testName}: ${stats.avg.toFixed(2)}ms avg`);
            return stats;
            
        } catch (error) {
            spinner.fail(`❌ ${testName} failed: ${error.message}`);
            return { error: error.message };
        }
    }

    /**
     * Calculate statistics from timing data
     */
    calculateStatistics(times) {
        if (times.length === 0) return { error: 'No successful runs' };
        
        const sorted = times.sort((a, b) => a - b);
        
        return {
            count: times.length,
            avg: times.reduce((a, b) => a + b, 0) / times.length,
            min: sorted[0],
            max: sorted[sorted.length - 1],
            p50: sorted[Math.floor(sorted.length * 0.5)],
            p95: sorted[Math.floor(sorted.length * 0.95)],
            p99: sorted[Math.floor(sorted.length * 0.99)],
            std: this.standardDeviation(times)
        };
    }

    /**
     * Individual test implementations
     */
    async benchmarkAgentCreation() {
        const wallet = this.testWallets[Math.floor(Math.random() * this.testWallets.length)];
        return this.createTestAgent(`bench_agent_${Date.now()}`, wallet);
    }

    async benchmarkSingleMessage() {
        const wallet = this.testWallets[0];
        return this.sendTestMessage(`bench_msg_${Date.now()}`, wallet);
    }

    async benchmarkChannelCreation() {
        const wallet = this.testWallets[0];
        return this.createTestChannel(`bench_channel_${Date.now()}`, wallet);
    }

    async createTestAgent(name, wallet = this.testWallets[0]) {
        const start = performance.now();
        
        await this.sdk.registerAgent({
            name,
            agentType: 'benchmark_test',
            capabilities: ['testing'],
            metadata: { benchmark: true }
        }, wallet);
        
        const end = performance.now();
        this.testAgents.push(name);
        
        return { duration: end - start };
    }

    async sendTestMessage(content, wallet = this.testWallets[0]) {
        const start = performance.now();
        
        await this.sdk.sendMessage({
            to: 'benchmark_receiver',
            type: 'test',
            data: { content, timestamp: Date.now() }
        }, wallet);
        
        const end = performance.now();
        return { duration: end - start };
    }

    async createTestChannel(name, wallet = this.testWallets[0]) {
        const start = performance.now();
        
        await this.sdk.createChannel({
            name,
            description: 'Benchmark test channel',
            isPrivate: false
        }, wallet);
        
        const end = performance.now();
        this.testChannels.push(name);
        
        return { duration: end - start };
    }

    /**
     * Stress test implementations
     */
    async stressTestMaxAgents() {
        let count = 0;
        const maxAttempts = 10000;
        
        while (count < maxAttempts) {
            try {
                await this.createTestAgent(`stress_agent_${count}`);
                count++;
                
                if (count % 100 === 0) {
                    console.log(`  Created ${count} agents...`);
                }
            } catch (error) {
                break;
            }
        }
        
        return { maxAgents: count };
    }

    async stressTestSustainedLoad() {
        const duration = 60000; // 1 minute
        const start = Date.now();
        let operations = 0;
        
        while (Date.now() - start < duration) {
            try {
                await Promise.all([
                    this.createTestAgent(`sustained_${operations}_agent`),
                    this.sendTestMessage(`sustained_${operations}_msg`),
                    operations % 10 === 0 ? this.createTestChannel(`sustained_${operations}_channel`) : Promise.resolve()
                ]);
                operations++;
            } catch (error) {
                // Continue on errors during stress test
            }
        }
        
        return {
            duration: Date.now() - start,
            totalOperations: operations,
            operationsPerSecond: operations / (duration / 1000)
        };
    }

    /**
     * Generate benchmark summary
     */
    generateSummary() {
        const tests = this.results.tests;
        
        this.results.summary = {
            totalTests: Object.keys(tests).length,
            averageLatency: this.calculateAverageLatency(tests),
            highestThroughput: this.findHighestThroughput(tests),
            memoryEfficiency: tests.memory_usage?.result?.memoryPerAgent || 'N/A',
            reliabilityScore: this.calculateReliabilityScore(tests)
        };
    }

    calculateAverageLatency(tests) {
        const latencies = Object.values(tests)
            .filter(t => t.avg && !isNaN(t.avg))
            .map(t => t.avg);
        
        return latencies.length > 0 
            ? latencies.reduce((a, b) => a + b, 0) / latencies.length 
            : 0;
    }

    findHighestThroughput(tests) {
        let highest = 0;
        let testName = '';
        
        Object.entries(tests).forEach(([name, result]) => {
            if (result.operationsPerSecond && result.operationsPerSecond > highest) {
                highest = result.operationsPerSecond;
                testName = name;
            }
        });
        
        return { value: highest, test: testName };
    }

    calculateReliabilityScore(tests) {
        const successRates = Object.values(tests)
            .filter(t => t.successRate !== undefined)
            .map(t => t.successRate);
        
        return successRates.length > 0
            ? successRates.reduce((a, b) => a + b, 0) / successRates.length
            : 100;
    }

    /**
     * Display results in a formatted table
     */
    displayResults() {
        console.log(chalk.green.bold('\n📊 Benchmark Results Summary'));
        console.log(chalk.gray('━'.repeat(80)));
        
        // Summary table
        const summaryTable = new Table({
            head: ['Metric', 'Value'],
            style: { head: ['cyan'] }
        });
        
        summaryTable.push(
            ['Total Tests', this.results.summary.totalTests],
            ['Average Latency', `${this.results.summary.averageLatency.toFixed(2)}ms`],
            ['Highest Throughput', `${this.results.summary.highestThroughput.value.toFixed(2)} ops/sec`],
            ['Reliability Score', `${this.results.summary.reliabilityScore.toFixed(1)}%`]
        );
        
        console.log(summaryTable.toString());
        
        // Detailed results table
        console.log(chalk.blue.bold('\n📈 Detailed Test Results'));
        console.log(chalk.gray('━'.repeat(80)));
        
        const detailTable = new Table({
            head: ['Test', 'Avg (ms)', 'Min (ms)', 'Max (ms)', 'P95 (ms)', 'Success Rate'],
            style: { head: ['cyan'] }
        });
        
        Object.entries(this.results.tests).forEach(([testName, result]) => {
            if (result.avg) {
                detailTable.push([
                    testName,
                    result.avg.toFixed(2),
                    result.min.toFixed(2),
                    result.max.toFixed(2),
                    result.p95.toFixed(2),
                    `${result.successRate.toFixed(1)}%`
                ]);
            }
        });
        
        console.log(detailTable.toString());
    }

    /**
     * Save results to file
     */
    async saveResults() {
        if (!this.config.saveResults) return;
        
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `benchmark-results-${timestamp}.json`;
        
        try {
            writeFileSync(filename, JSON.stringify(this.results, null, 2));
            console.log(chalk.green(`\n💾 Results saved to ${filename}`));
        } catch (error) {
            console.log(chalk.yellow(`⚠️ Failed to save results: ${error.message}`));
        }
    }

    /**
     * Utility functions
     */
    standardDeviation(values) {
        const avg = values.reduce((a, b) => a + b, 0) / values.length;
        const squareDiffs = values.map(value => Math.pow(value - avg, 2));
        const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / squareDiffs.length;
        return Math.sqrt(avgSquareDiff);
    }

    getEnvironmentInfo() {
        return {
            nodeVersion: process.version,
            platform: process.platform,
            arch: process.arch,
            memory: process.memoryUsage(),
            cpu: require('os').cpus()[0]?.model || 'Unknown',
            timestamp: new Date()
        };
    }

    async requestAirdrop(publicKey) {
        try {
            await this.connection.requestAirdrop(publicKey, 1000000000); // 1 SOL
            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for confirmation
        } catch (error) {
            // Ignore airdrop errors in benchmark
        }
    }

    async cleanup() {
        console.log(chalk.blue('\n🧹 Cleaning up benchmark environment...'));
        
        // Clean up test data
        this.testAgents.length = 0;
        this.testChannels.length = 0;
        this.testWallets.length = 0;
        
        console.log(chalk.green('✅ Cleanup complete'));
    }
}

// CLI interface
async function main() {
    const args = process.argv.slice(2);
    const config = {};
    
    // Parse command line arguments
    for (let i = 0; i < args.length; i += 2) {
        const key = args[i].replace('--', '');
        const value = args[i + 1];
        
        if (value && !value.startsWith('--')) {
            config[key] = isNaN(value) ? value : parseInt(value);
        }
    }
    
    console.log(chalk.blue('Starting PoD Protocol Performance Benchmark...'));
    console.log(chalk.gray(`Configuration: ${JSON.stringify(config, null, 2)}`));
    console.log();
    
    const benchmark = new PerformanceBenchmark(config);
    await benchmark.runAllBenchmarks();
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch(console.error);
}

export default PerformanceBenchmark;
