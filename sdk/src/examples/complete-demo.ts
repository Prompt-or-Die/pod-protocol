/**
 * Complete PoD Protocol SDK Demo
 * 
 * This comprehensive example demonstrates all major SDK features:
 * - Client initialization and configuration
 * - Agent registration and management
 * - Message sending and receiving
 * - Channel creation and management
 * - Escrow operations
 * - Debug utilities and error handling
 * - Performance monitoring
 * - Web3.js v2 compatibility
 */

import { PodComClient } from "../client.js";
import { 
  logger, 
  PerformanceMonitor, 
  DevUtils, 
  PodProtocolError 
} from "../utils/debug.js";
import { 
  TypeConverter, 
  WalletAdapter, 
  ValidationUtils 
} from "../utils/web3-compat.js";
import { 
  MessageType, 
  ChannelVisibility, 
  MessageStatus 
} from "../types.js";

/**
 * Demo Configuration
 */
interface DemoConfig {
  rpcEndpoint: string;
  programId?: string;
  enableDebugMode: boolean;
  skipWalletOperations: boolean;
  demoAgentName: string;
  demoChannelName: string;
}

const DEFAULT_CONFIG: DemoConfig = {
  rpcEndpoint: 'https://api.devnet.solana.com',
  programId: 'PoD1111111111111111111111111111111111111111',
  enableDebugMode: true,
  skipWalletOperations: true, // Skip actual wallet operations for demo
  demoAgentName: 'Demo AI Agent',
  demoChannelName: 'Demo Channel'
};

/**
 * Complete Demo Class
 */
export class PodProtocolDemo {
  private client: PodComClient;
  private config: DemoConfig;
  private startTime: number;

  constructor(config: Partial<DemoConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.startTime = Date.now();
    
    // Initialize client
    this.client = new PodComClient({
      endpoint: this.config.rpcEndpoint,
      programId: TypeConverter.toAddress(this.config.programId),
      commitment: 'confirmed'
    });

    // Configure debug logging
    if (this.config.enableDebugMode) {
      logger.updateConfig({
        logLevel: 0, // DEBUG level
        showTimestamp: true,
        showStackTrace: true
      });
    }
  }

  /**
   * Run the complete demo
   */
  async runDemo(): Promise<void> {
    const perfId = PerformanceMonitor.start('complete_demo');
    
    try {
      logger.info('🚀 Starting PoD Protocol SDK Complete Demo');
      logger.info('Configuration:', this.config);

      await this.step1_InitializeClient();
      await this.step2_DemonstrateUtilities();
      await this.step3_ValidateInputs();
      await this.step4_ExploreServices();
      await this.step5_ErrorHandlingDemo();
      await this.step6_PerformanceDemo();
      
      logger.info('✅ Demo completed successfully!');
      this.printSummary();
      
    } catch (error) {
      logger.error('❌ Demo failed:', error);
      throw error;
    } finally {
      PerformanceMonitor.end(perfId);
    }
  }

  /**
   * Step 1: Client Initialization
   */
  private async step1_InitializeClient(): Promise<void> {
    logger.info('\n📡 Step 1: Client Initialization');
    
    const perfId = PerformanceMonitor.start('client_init');
    
    try {
      // Initialize client (read-only mode for demo)
      await this.client.initialize();
      
      logger.info('✅ Client initialized successfully');
      logger.info('RPC Endpoint:', this.client.getRpc());
      logger.info('Program ID:', this.client.getProgramId().toString());
      logger.info('Commitment:', this.client.getCommitment());
      logger.info('Is Initialized:', this.client.isInitialized());
      
      // Demonstrate service access
      logger.info('Available Services:');
      logger.info('- Agents:', !!this.client.agents);
      logger.info('- Messages:', !!this.client.messages);
      logger.info('- Channels:', !!this.client.channels);
      logger.info('- Escrow:', !!this.client.escrow);
      logger.info('- Analytics:', !!this.client.analytics);
      logger.info('- Discovery:', !!this.client.discovery);
      logger.info('- IPFS:', !!this.client.ipfs);
      logger.info('- ZK Compression:', !!this.client.zkCompression);
      
    } catch (error) {
      logger.error('Failed to initialize client:', error);
      throw error;
    } finally {
      PerformanceMonitor.end(perfId);
    }
  }

  /**
   * Step 2: Utility Demonstrations
   */
  private async step2_DemonstrateUtilities(): Promise<void> {
    logger.info('\n🛠️ Step 2: Utility Demonstrations');
    
    // Type Conversion Examples
    logger.info('Type Conversion Examples:');
    
    const testAddress = 'PoD1111111111111111111111111111111111111111';
    const convertedAddress = TypeConverter.toAddress(testAddress);
    logger.info('Address Conversion:', { original: testAddress, converted: convertedAddress.toString() });
    
    const testNumber = '12345';
    const convertedBigInt = TypeConverter.toBigInt(testNumber);
    logger.info('BigInt Conversion:', { original: testNumber, converted: convertedBigInt.toString() });
    
    // Development Utilities
    logger.info('\nDevelopment Utilities:');
    logger.info('Environment:', DevUtils.getEnvironment());
    logger.info('Memory Usage:', DevUtils.getMemoryUsage());
    logger.info('Formatted Address:', DevUtils.formatAddress(testAddress));
    logger.info('Formatted SOL:', DevUtils.formatSOL(1000000000));
    
    // Validation Examples
    logger.info('\nValidation Examples:');
    logger.info('Valid Address?', ValidationUtils.isValidAddress(testAddress));
    logger.info('Valid Number?', ValidationUtils.isValidNumber(42));
    logger.info('Valid BigInt?', ValidationUtils.isValidNumber(BigInt(42)));
  }

  /**
   * Step 3: Input Validation
   */
  private async step3_ValidateInputs(): Promise<void> {
    logger.info('\n✅ Step 3: Input Validation');
    
    const testCases = [
      { name: 'Valid Address', value: 'PoD1111111111111111111111111111111111111111', validator: ValidationUtils.isValidAddress },
      { name: 'Invalid Address', value: 'invalid-address', validator: ValidationUtils.isValidAddress },
      { name: 'Valid Number', value: 42, validator: ValidationUtils.isValidNumber },
      { name: 'Invalid Number', value: 'not-a-number', validator: ValidationUtils.isValidNumber },
    ];
    
    testCases.forEach(testCase => {
      const isValid = testCase.validator(testCase.value);
      const status = isValid ? '✅' : '❌';
      logger.info(`${status} ${testCase.name}: ${isValid}`);
    });
  }

  /**
   * Step 4: Explore Services
   */
  private async step4_ExploreServices(): Promise<void> {
    logger.info('\n🎯 Step 4: Service Exploration');
    
    if (this.config.skipWalletOperations) {
      logger.info('⚠️ Skipping wallet operations (demo mode)');
      logger.info('Available service methods:');
      
      // Agent Service
      logger.info('\n📋 Agent Service Methods:');
      const agentMethods = Object.getOwnPropertyNames(Object.getPrototypeOf(this.client.agents))
        .filter(name => name !== 'constructor' && typeof this.client.agents[name as keyof typeof this.client.agents] === 'function');
      agentMethods.forEach(method => logger.info(`- ${method}`));
      
      // Message Service
      logger.info('\n💬 Message Service Methods:');
      const messageMethods = Object.getOwnPropertyNames(Object.getPrototypeOf(this.client.messages))
        .filter(name => name !== 'constructor' && typeof this.client.messages[name as keyof typeof this.client.messages] === 'function');
      messageMethods.forEach(method => logger.info(`- ${method}`));
      
      // Channel Service
      logger.info('\n📢 Channel Service Methods:');
      const channelMethods = Object.getOwnPropertyNames(Object.getPrototypeOf(this.client.channels))
        .filter(name => name !== 'constructor' && typeof this.client.channels[name as keyof typeof this.client.channels] === 'function');
      channelMethods.forEach(method => logger.info(`- ${method}`));
      
      return;
    }
    
    // If wallet operations were enabled, we would demonstrate:
    // - Agent registration
    // - Message sending
    // - Channel creation
    // - Escrow deposits
    logger.info('Full service demonstrations would run here with actual wallet');
  }

  /**
   * Step 5: Error Handling Demo
   */
  private async step5_ErrorHandlingDemo(): Promise<void> {
    logger.info('\n⚠️ Step 5: Error Handling Demonstration');
    
    // Demonstrate custom error types
    try {
      throw new PodProtocolError('Demo error', 'DEMO_ERROR', { context: 'error handling demo' });
    } catch (error) {
      if (error instanceof PodProtocolError) {
        logger.info('✅ Caught PodProtocolError:');
        logger.info('- Code:', error.code);
        logger.info('- Message:', error.message);
        logger.info('- Context:', error.context);
        logger.info('- Timestamp:', error.timestamp);
      }
    }
    
    // Demonstrate retry utility
    logger.info('\n🔄 Retry Utility Demo:');
    let attemptCount = 0;
    
    try {
      await DevUtils.retry(async () => {
        attemptCount++;
        logger.info(`Attempt ${attemptCount}`);
        
        if (attemptCount < 3) {
          throw new Error('Simulated failure');
        }
        
        return 'Success!';
      }, 3, 100);
      
      logger.info(`✅ Retry succeeded after ${attemptCount} attempts`);
    } catch (error) {
      logger.error('❌ Retry failed:', error);
    }
  }

  /**
   * Step 6: Performance Monitoring Demo
   */
  private async step6_PerformanceDemo(): Promise<void> {
    logger.info('\n⚡ Step 6: Performance Monitoring');
    
    // Simulate some operations
    const operations = ['operation_a', 'operation_b', 'operation_c'];
    
    for (const op of operations) {
      const perfId = PerformanceMonitor.start(op);
      
      // Simulate work
      await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
      
      PerformanceMonitor.end(perfId);
    }
    
    // Get performance stats
    logger.info('\n📊 Performance Statistics:');
    const allStats = PerformanceMonitor.getAllStats();
    
    Object.entries(allStats).forEach(([name, stats]) => {
      if (stats) {
        logger.info(`${name}:`, {
          average: `${stats.avg.toFixed(2)}ms`,
          min: `${stats.min.toFixed(2)}ms`,
          max: `${stats.max.toFixed(2)}ms`,
          count: stats.count
        });
      }
    });
  }

  /**
   * Print Demo Summary
   */
  private printSummary(): void {
    const totalTime = Date.now() - this.startTime;
    const allStats = PerformanceMonitor.getAllStats();
    
    logger.info('\n📋 Demo Summary:');
    logger.info('='.repeat(50));
    logger.info('Total Time:', `${totalTime}ms`);
    logger.info('Environment:', DevUtils.getEnvironment());
    logger.info('Memory Usage:', DevUtils.getMemoryUsage());
    logger.info('Performance Measurements:', Object.keys(allStats).length);
    logger.info('Log Entries:', logger.getLogBuffer().length);
    
    // Generate development report
    const report = DevUtils.generateReport();
    logger.info('\n📄 Development Report Generated');
    logger.debug('Report:', report);
    
    logger.info('='.repeat(50));
    logger.info('🎉 PoD Protocol SDK Demo Complete!');
  }
}

/**
 * Run the demo if this file is executed directly
 */
async function main() {
  try {
    const demo = new PodProtocolDemo({
      enableDebugMode: true,
      skipWalletOperations: true
    });
    
    await demo.runDemo();
    
  } catch (error) {
    console.error('Demo failed:', error);
    process.exit(1);
  }
}

// Run demo if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export default PodProtocolDemo; 