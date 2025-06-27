/**
 * Interactive PoD Protocol SDK Playground
 * 
 * A development playground for testing SDK features interactively
 * Run with: npm run playground
 */

import * as readline from 'readline';
import { PodComClient } from "../client.js";
import { logger, DevUtils, PerformanceMonitor } from "../utils/debug.js";
import { TypeConverter, ValidationUtils } from "../utils/web3-compat.js";

interface PlaygroundState {
  client?: PodComClient;
  config: {
    rpcEndpoint: string;
    programId: string;
    debugMode: boolean;
  };
  history: string[];
}

export class InteractivePlayground {
  private rl: readline.Interface;
  private state: PlaygroundState;

  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: '🎮 PoD SDK > '
    });

    this.state = {
      config: {
        rpcEndpoint: 'https://api.devnet.solana.com',
        programId: 'PoD1111111111111111111111111111111111111111',
        debugMode: true
      },
      history: []
    };

    this.setupEventHandlers();
    this.displayWelcome();
  }

  private setupEventHandlers(): void {
    this.rl.on('line', async (input) => {
      const command = input.trim();
      
      if (command) {
        this.state.history.push(command);
        await this.processCommand(command);
      }
      
      this.rl.prompt();
    });

    this.rl.on('close', () => {
      console.log('\n👋 Goodbye! Thanks for using PoD Protocol SDK Playground');
      process.exit(0);
    });

    // Handle Ctrl+C gracefully
    process.on('SIGINT', () => {
      console.log('\n\n🛑 Interrupted. Type "exit" to quit gracefully.');
      this.rl.prompt();
    });
  }

  private displayWelcome(): void {
    console.log('🎮 Welcome to PoD Protocol SDK Interactive Playground!');
    console.log('=' .repeat(60));
    console.log('Type "help" for available commands');
    console.log('Type "exit" to quit');
    console.log(`Current RPC: ${this.state.config.rpcEndpoint}`);
    console.log(`Debug Mode: ${this.state.config.debugMode ? 'ON' : 'OFF'}`);
    console.log('='.repeat(60));
    this.rl.prompt();
  }

  private async processCommand(command: string): Promise<void> {
    const [cmd, ...args] = command.split(' ');
    const perfId = PerformanceMonitor.start(`command_${cmd}`);

    try {
      switch (cmd.toLowerCase()) {
        case 'help':
          this.showHelp();
          break;
        
        case 'init':
          await this.initializeClient(args);
          break;
        
        case 'status':
          this.showStatus();
          break;
        
        case 'config':
          await this.handleConfig(args);
          break;
        
        case 'validate':
          this.handleValidation(args);
          break;
        
        case 'convert':
          this.handleConversion(args);
          break;
        
        case 'debug':
          this.handleDebug(args);
          break;
        
        case 'perf':
          this.showPerformanceStats();
          break;
        
        case 'services':
          this.listServices();
          break;
        
        case 'history':
          this.showHistory();
          break;
        
        case 'clear':
          console.clear();
          this.displayWelcome();
          break;
        
        case 'exit':
        case 'quit':
          this.rl.close();
          break;
        
        default:
          console.log(`❌ Unknown command: ${cmd}`);
          console.log('Type "help" for available commands');
      }
    } catch (error) {
      console.error(`❌ Command failed: ${error}`);
    } finally {
      PerformanceMonitor.end(perfId);
    }
  }

  private showHelp(): void {
    console.log('\n📚 Available Commands:');
    console.log('=' .repeat(40));
    console.log('🔧 Client Management:');
    console.log('  init [endpoint]     - Initialize SDK client');
    console.log('  status              - Show client status');
    console.log('  services            - List available services');
    console.log('');
    console.log('⚙️  Configuration:');
    console.log('  config show         - Show current configuration');
    console.log('  config set <key> <value> - Set configuration value');
    console.log('  config reset        - Reset to defaults');
    console.log('');
    console.log('✅ Validation & Conversion:');
    console.log('  validate address <addr>  - Validate Solana address');
    console.log('  validate number <num>    - Validate number');
    console.log('  convert bigint <num>     - Convert to BigInt');
    console.log('  convert address <str>    - Convert to Address');
    console.log('');
    console.log('🐛 Debug & Performance:');
    console.log('  debug on|off        - Toggle debug mode');
    console.log('  debug logs          - Show recent logs');
    console.log('  perf                - Show performance stats');
    console.log('');
    console.log('📜 Utility:');
    console.log('  history             - Show command history');
    console.log('  clear               - Clear screen');
    console.log('  help                - Show this help');
    console.log('  exit                - Quit playground');
    console.log('=' .repeat(40));
  }

  private async initializeClient(args: string[]): Promise<void> {
    const endpoint = args[0] || this.state.config.rpcEndpoint;
    
    console.log(`🔄 Initializing client with endpoint: ${endpoint}`);
    
    try {
             this.state.client = new PodComClient({
         endpoint,
         programId: TypeConverter.toAddress(this.state.config.programId),
         commitment: 'confirmed'
       });

      await this.state.client.initialize();
      
      console.log('✅ Client initialized successfully!');
      this.state.config.rpcEndpoint = endpoint;
      
    } catch (error) {
      console.error('❌ Failed to initialize client:', error);
    }
  }

  private showStatus(): void {
    console.log('\n📊 Current Status:');
    console.log('=' .repeat(30));
    
    if (this.state.client) {
      console.log('✅ Client: Initialized');
      console.log(`📡 RPC: ${this.state.config.rpcEndpoint}`);
      console.log(`🏷️  Program ID: ${this.state.client.getProgramId()}`);
      console.log(`🔒 Commitment: ${this.state.client.getCommitment()}`);
    } else {
      console.log('❌ Client: Not initialized');
      console.log('💡 Run "init" to initialize the client');
    }
    
    console.log(`🐛 Debug Mode: ${this.state.config.debugMode ? 'ON' : 'OFF'}`);
    console.log(`🌍 Environment: ${DevUtils.getEnvironment()}`);
    console.log(`💾 Memory: ${JSON.stringify(DevUtils.getMemoryUsage())}`);
    console.log(`📜 Commands Run: ${this.state.history.length}`);
  }

  private async handleConfig(args: string[]): Promise<void> {
    const [action, key, ...values] = args;
    
    switch (action?.toLowerCase()) {
      case 'show':
        console.log('\n⚙️ Current Configuration:');
        console.log(JSON.stringify(this.state.config, null, 2));
        break;
        
      case 'set':
        if (!key || values.length === 0) {
          console.log('❌ Usage: config set <key> <value>');
          return;
        }
        
        const value = values.join(' ');
        
        if (key === 'debugMode') {
          this.state.config.debugMode = value.toLowerCase() === 'true';
          logger.updateConfig({ logLevel: this.state.config.debugMode ? 0 : 1 });
        } else if (key in this.state.config) {
          (this.state.config as any)[key] = value;
        } else {
          console.log(`❌ Unknown config key: ${key}`);
          return;
        }
        
        console.log(`✅ Set ${key} = ${value}`);
        break;
        
      case 'reset':
        this.state.config = {
          rpcEndpoint: 'https://api.devnet.solana.com',
          programId: 'PoD1111111111111111111111111111111111111111',
          debugMode: true
        };
        console.log('✅ Configuration reset to defaults');
        break;
        
      default:
        console.log('❌ Usage: config show|set|reset');
    }
  }

  private handleValidation(args: string[]): void {
    const [type, value] = args;
    
    if (!type || !value) {
      console.log('❌ Usage: validate <type> <value>');
      console.log('Types: address, number');
      return;
    }
    
    switch (type.toLowerCase()) {
      case 'address':
        const isValidAddress = ValidationUtils.isValidAddress(value);
        console.log(`Address validation: ${isValidAddress ? '✅ Valid' : '❌ Invalid'}`);
        if (isValidAddress) {
          console.log(`Formatted: ${DevUtils.formatAddress(value)}`);
        }
        break;
        
      case 'number':
        const numValue = parseFloat(value);
        const isValidNumber = ValidationUtils.isValidNumber(numValue);
        console.log(`Number validation: ${isValidNumber ? '✅ Valid' : '❌ Invalid'}`);
        if (isValidNumber) {
          console.log(`Value: ${numValue}`);
          console.log(`BigInt: ${BigInt(Math.floor(numValue))}`);
        }
        break;
        
      default:
        console.log(`❌ Unknown validation type: ${type}`);
    }
  }

  private handleConversion(args: string[]): void {
    const [type, value] = args;
    
    if (!type || !value) {
      console.log('❌ Usage: convert <type> <value>');
      console.log('Types: bigint, address');
      return;
    }
    
    try {
      switch (type.toLowerCase()) {
        case 'bigint':
          const bigintValue = TypeConverter.toBigInt(value);
          console.log(`✅ BigInt: ${bigintValue}`);
          console.log(`Back to number: ${TypeConverter.toNumber(bigintValue)}`);
          break;
          
        case 'address':
          const addressValue = TypeConverter.toAddress(value);
          console.log(`✅ Address: ${addressValue}`);
          console.log(`String: ${TypeConverter.toString(addressValue)}`);
          console.log(`Formatted: ${DevUtils.formatAddress(addressValue.toString())}`);
          break;
          
        default:
          console.log(`❌ Unknown conversion type: ${type}`);
      }
    } catch (error) {
      console.log(`❌ Conversion failed: ${error}`);
    }
  }

  private handleDebug(args: string[]): void {
    const [action] = args;
    
    switch (action?.toLowerCase()) {
      case 'on':
        this.state.config.debugMode = true;
        logger.updateConfig({ logLevel: 0 });
        console.log('✅ Debug mode enabled');
        break;
        
      case 'off':
        this.state.config.debugMode = false;
        logger.updateConfig({ logLevel: 1 });
        console.log('✅ Debug mode disabled');
        break;
        
      case 'logs':
        const logs = logger.getLogBuffer();
        console.log(`\n📝 Recent Logs (${logs.length} entries):`);
        logs.slice(-10).forEach(log => console.log(log));
        break;
        
      default:
        console.log('❌ Usage: debug on|off|logs');
    }
  }

  private showPerformanceStats(): void {
    const stats = PerformanceMonitor.getAllStats();
    
    console.log('\n⚡ Performance Statistics:');
    console.log('=' .repeat(40));
    
    if (Object.keys(stats).length === 0) {
      console.log('No performance data available yet');
      return;
    }
    
    Object.entries(stats).forEach(([name, stat]) => {
      if (stat) {
        console.log(`${name}:`);
        console.log(`  Average: ${stat.avg.toFixed(2)}ms`);
        console.log(`  Min: ${stat.min.toFixed(2)}ms`);
        console.log(`  Max: ${stat.max.toFixed(2)}ms`);
        console.log(`  Count: ${stat.count}`);
        console.log('');
      }
    });
  }

  private listServices(): void {
    if (!this.state.client) {
      console.log('❌ Client not initialized. Run "init" first.');
      return;
    }
    
    console.log('\n🎯 Available Services:');
    console.log('=' .repeat(30));
    console.log('📋 Agents Service');
    console.log('💬 Messages Service');
    console.log('📢 Channels Service');
    console.log('🔒 Escrow Service');
    console.log('📊 Analytics Service');
    console.log('🔍 Discovery Service');
    console.log('🌐 IPFS Service');
    console.log('🗜️  ZK Compression Service');
    console.log('🔑 Session Keys Service');
    console.log('⚡ Jito Bundles Service');
  }

  private showHistory(): void {
    console.log('\n📜 Command History:');
    console.log('=' .repeat(20));
    
    if (this.state.history.length === 0) {
      console.log('No commands run yet');
      return;
    }
    
    this.state.history.forEach((cmd, index) => {
      console.log(`${index + 1}. ${cmd}`);
    });
  }

  /**
   * Start the interactive playground
   */
  start(): void {
    // Playground is already started in constructor
    this.rl.prompt();
  }
}

// Start playground if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const playground = new InteractivePlayground();
  playground.start();
}

export default InteractivePlayground; 