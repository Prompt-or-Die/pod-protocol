#!/usr/bin/env node

/**
 * PoD Protocol Developer Experience Enhancer
 * Advanced tooling for optimal development workflow
 */

import { watch } from 'chokidar';
import { spawn, exec } from 'child_process';
import { dirname, join, resolve } from 'path';
import { existsSync, writeFileSync, readFileSync } from 'fs';
import chalk from 'chalk';
import ora from 'ora';
import { WebSocketServer } from 'ws';

class DevExperienceEnhancer {
  constructor() {
    this.watchers = new Map();
    this.processes = new Map();
    this.wsServer = null;
    this.connectedClients = [];
  }

  async start() {
    console.log(chalk.magenta.bold('\n🚀 PoD Protocol Developer Experience Enhancer Starting...\n'));
    
    await this.startDevServer();
    await this.setupHotReloading();
    await this.startTypeGeneration();
    await this.setupIntelligentLogs();
    await this.startPerformanceMonitoring();
    
    console.log(chalk.green('\n✨ Enhanced development environment ready!\n'));
    this.showDevDashboard();
  }

  async startDevServer() {
    const spinner = ora('🌐 Starting development WebSocket server...').start();
    
    this.wsServer = new WebSocketServer({ port: 8080 });
    
    this.wsServer.on('connection', (ws) => {
      this.connectedClients.push(ws);
      ws.send(JSON.stringify({ 
        type: 'welcome', 
        message: '🎭 Connected to PoD Protocol Dev Server' 
      }));
      
      ws.on('close', () => {
        this.connectedClients = this.connectedClients.filter(client => client !== ws);
      });
    });
    
    spinner.succeed('🌐 Dev server running on ws://localhost:8080');
  }

  async setupHotReloading() {
    const spinner = ora('🔥 Setting up intelligent hot reloading...').start();
    
    // Watch SDK changes
    const sdkWatcher = watch(['sdk/src/**/*.ts', 'cli/src/**/*.ts'], {
      ignored: /node_modules/,
      persistent: true
    });
    
    sdkWatcher.on('change', async (path) => {
      const relativePath = path.replace(process.cwd(), '');
      console.log(chalk.blue(`\n🔄 File changed: ${relativePath}`));
      
      if (path.includes('sdk/')) {
        await this.rebuildSDK();
      } else if (path.includes('cli/')) {
        await this.rebuildCLI();
      }
      
      this.notifyClients('reload', { path: relativePath, timestamp: Date.now() });
    });
    
    this.watchers.set('sdk-cli', sdkWatcher);
    spinner.succeed('🔥 Hot reloading active for SDK and CLI');
  }

  async startTypeGeneration() {
    const spinner = ora('📝 Setting up automatic type generation...').start();
    
    // Watch Anchor program changes
    const programWatcher = watch(['programs/**/*.rs'], {
      ignored: /target/,
      persistent: true
    });
    
    programWatcher.on('change', async (path) => {
      console.log(chalk.yellow(`\n🔧 Rust program changed: ${path}`));
      await this.regenerateTypes();
    });
    
    this.watchers.set('program', programWatcher);
    spinner.succeed('📝 Auto type generation from Anchor programs');
  }

  async setupIntelligentLogs() {
    const spinner = ora('📊 Setting up intelligent logging...').start();
    
    // Enhanced logging with context and filtering
    const originalConsoleLog = console.log;
    const originalConsoleError = console.error;
    
    console.log = (...args) => {
      const timestamp = new Date().toISOString();
      const formattedArgs = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : arg
      );
      
      originalConsoleLog(
        chalk.dim(`[${timestamp}]`),
        chalk.blue('📝'),
        ...formattedArgs
      );
      
      this.notifyClients('log', {
        level: 'info',
        timestamp,
        message: formattedArgs.join(' ')
      });
    };
    
    console.error = (...args) => {
      const timestamp = new Date().toISOString();
      const formattedArgs = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : arg
      );
      
      originalConsoleError(
        chalk.dim(`[${timestamp}]`),
        chalk.red('🚨'),
        ...formattedArgs
      );
      
      this.notifyClients('log', {
        level: 'error',
        timestamp,
        message: formattedArgs.join(' ')
      });
    };
    
    spinner.succeed('📊 Intelligent logging system active');
  }

  async startPerformanceMonitoring() {
    const spinner = ora('⚡ Starting performance monitoring...').start();
    
    // Monitor build times, test execution, etc.
    this.performanceMetrics = {
      buildTimes: [],
      testTimes: [],
      deployTimes: []
    };
    
    setInterval(() => {
      this.checkPerformanceMetrics();
    }, 30000); // Check every 30 seconds
    
    spinner.succeed('⚡ Performance monitoring active');
  }

  async rebuildSDK() {
    const startTime = Date.now();
    const spinner = ora('🔨 Rebuilding SDK...').start();
    
    try {
      await this.execCommand('cd sdk && bun run build');
      const buildTime = Date.now() - startTime;
      this.performanceMetrics.buildTimes.push(buildTime);
      
      spinner.succeed(`🔨 SDK rebuilt in ${buildTime}ms`);
      this.notifyClients('build-complete', { component: 'sdk', time: buildTime });
    } catch (error) {
      spinner.fail('🔨 SDK build failed');
      console.error(chalk.red('Build error:'), error.message);
    }
  }

  async rebuildCLI() {
    const startTime = Date.now();
    const spinner = ora('⚡ Rebuilding CLI...').start();
    
    try {
      await this.execCommand('cd cli && bun run build');
      const buildTime = Date.now() - startTime;
      
      spinner.succeed(`⚡ CLI rebuilt in ${buildTime}ms`);
      this.notifyClients('build-complete', { component: 'cli', time: buildTime });
    } catch (error) {
      spinner.fail('⚡ CLI build failed');
      console.error(chalk.red('Build error:'), error.message);
    }
  }

  async regenerateTypes() {
    const spinner = ora('🔄 Regenerating types from Anchor programs...').start();
    
    try {
      await this.execCommand('anchor build');
      await this.execCommand('cd sdk && bun run generate-types');
      
      spinner.succeed('🔄 Types regenerated successfully');
      this.notifyClients('types-updated', { timestamp: Date.now() });
    } catch (error) {
      spinner.fail('🔄 Type generation failed');
      console.error(chalk.red('Type generation error:'), error.message);
    }
  }

  checkPerformanceMetrics() {
    const avgBuildTime = this.performanceMetrics.buildTimes.length > 0 
      ? this.performanceMetrics.buildTimes.reduce((a, b) => a + b, 0) / this.performanceMetrics.buildTimes.length 
      : 0;
    
    if (avgBuildTime > 5000) { // If builds are taking > 5 seconds
      console.log(chalk.yellow('⚠️  Build times are getting slow. Consider optimizing.'));
      this.suggestOptimizations();
    }
  }

  suggestOptimizations() {
    console.log(chalk.blue('\n💡 Performance Optimization Suggestions:'));
    console.log('  • Run: bun run clean && bun run build');
    console.log('  • Check for circular dependencies');
    console.log('  • Consider using incremental builds');
    console.log('  • Review TypeScript compiler options\n');
  }

  showDevDashboard() {
    console.log(chalk.magenta.bold('🎛️  PoD Protocol Developer Dashboard\n'));
    console.log(`${chalk.blue('🌐 Dev Server:')} ws://localhost:8080`);
    console.log(`${chalk.green('🔥 Hot Reload:')} Active`);
    console.log(`${chalk.yellow('📝 Type Gen:')} Watching Rust programs`);
    console.log(`${chalk.purple('📊 Logging:')} Enhanced with context`);
    console.log(`${chalk.cyan('⚡ Performance:')} Monitoring enabled`);
    
    console.log(chalk.blue('\n🛠️  Available Dev Commands:\n'));
    console.log(`${chalk.white('dev:watch')}     - Start file watching`);
    console.log(`${chalk.white('dev:test')}      - Run tests with hot reload`);
    console.log(`${chalk.white('dev:debug')}     - Start with debugger`);
    console.log(`${chalk.white('dev:profile')}   - Performance profiling`);
    console.log(`${chalk.white('dev:docs')}      - Auto-rebuild docs`);
    
    console.log(chalk.green('\n✨ Ready for development! File changes will trigger automatic rebuilds.\n'));
  }

  notifyClients(type, data) {
    const message = JSON.stringify({ type, data, timestamp: Date.now() });
    this.connectedClients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }

  async execCommand(command) {
    return new Promise((resolve, reject) => {
      exec(command, (error, stdout, stderr) => {
        if (error) {
          reject(error);
        } else {
          resolve(stdout);
        }
      });
    });
  }

  async stop() {
    console.log(chalk.yellow('\n🛑 Stopping development enhancer...\n'));
    
    // Close all watchers
    this.watchers.forEach(watcher => watcher.close());
    
    // Close WebSocket server
    if (this.wsServer) {
      this.wsServer.close();
    }
    
    // Stop all processes
    this.processes.forEach(process => process.kill());
    
    console.log(chalk.green('✅ Development enhancer stopped cleanly\n'));
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  if (global.devEnhancer) {
    await global.devEnhancer.stop();
  }
  process.exit(0);
});

// Start the enhancer
const enhancer = new DevExperienceEnhancer();
global.devEnhancer = enhancer;
enhancer.start().catch(console.error); 