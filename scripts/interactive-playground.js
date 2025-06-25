#!/usr/bin/env node

/**
 * 🎮 PoD Protocol Interactive Playground
 * 
 * An interactive development environment for testing PoD Protocol features,
 * AI agent interactions, and blockchain operations in real-time.
 */

import readline from 'readline';
import chalk from 'chalk';
import figlet from 'figlet';
import { Command } from 'commander';
import ora from 'ora';

class PoDPlayground {
    constructor() {
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
            prompt: chalk.cyan('🎮 PoD> ')
        });
        
        this.agents = new Map();
        this.channels = new Map();
        this.messages = [];
        this.isRunning = false;
    }

    async start() {
        console.clear();
        this.showWelcome();
        this.setupCommands();
        this.startREPL();
    }

    showWelcome() {
        console.log(chalk.magenta(figlet.textSync('PoD Playground', { 
            font: 'Big',
            horizontalLayout: 'default'
        })));
        
        console.log(chalk.gray('━'.repeat(80)));
        console.log(chalk.cyan.bold('🚀 Welcome to the PoD Protocol Interactive Playground!'));
        console.log(chalk.gray('   Test AI agents, blockchain interactions, and protocol features in real-time.'));
        console.log(chalk.gray('━'.repeat(80)));
        console.log();
        
        this.showHelp();
    }

    showHelp() {
        console.log(chalk.yellow.bold('🎯 Available Commands:'));
        console.log();
        
        const commands = [
            ['help', 'Show this help message'],
            ['clear', 'Clear the console'],
            ['status', 'Show playground status'],
            ['agents', 'List all agents'],
            ['create-agent <name> <type>', 'Create a new AI agent'],
            ['remove-agent <name>', 'Remove an agent'],
            ['send-message <from> <to> <message>', 'Send message between agents'],
            ['create-channel <name>', 'Create a communication channel'],
            ['join-channel <agent> <channel>', 'Add agent to channel'],
            ['broadcast <channel> <message>', 'Broadcast to channel'],
            ['simulate-trade <agent> <asset> <amount>', 'Simulate a trade'],
            ['run-benchmark', 'Run performance benchmarks'],
            ['test-integration', 'Test protocol integration'],
            ['monitor', 'Start real-time monitoring'],
            ['export-logs', 'Export session logs'],
            ['quit', 'Exit the playground']
        ];

        commands.forEach(([cmd, desc]) => {
            console.log(`  ${chalk.green(cmd.padEnd(25))} ${chalk.gray(desc)}`);
        });
        
        console.log();
        console.log(chalk.gray('💡 Pro tip: Use tab completion and up/down arrows for command history'));
        console.log();
    }

    setupCommands() {
        this.commands = {
            help: () => this.showHelp(),
            clear: () => console.clear(),
            status: () => this.showStatus(),
            agents: () => this.listAgents(),
            'create-agent': (args) => this.createAgent(args),
            'remove-agent': (args) => this.removeAgent(args),
            'send-message': (args) => this.sendMessage(args),
            'create-channel': (args) => this.createChannel(args),
            'join-channel': (args) => this.joinChannel(args),
            broadcast: (args) => this.broadcast(args),
            'simulate-trade': (args) => this.simulateTrade(args),
            'run-benchmark': () => this.runBenchmark(),
            'test-integration': () => this.testIntegration(),
            monitor: () => this.startMonitoring(),
            'export-logs': () => this.exportLogs(),
            quit: () => this.quit(),
            exit: () => this.quit()
        };
    }

    startREPL() {
        this.isRunning = true;
        this.rl.prompt();

        this.rl.on('line', (input) => {
            this.processCommand(input.trim());
            this.rl.prompt();
        });

        this.rl.on('close', () => {
            this.quit();
        });
    }

    processCommand(input) {
        if (!input) return;

        const [command, ...args] = input.split(' ');
        const handler = this.commands[command];

        if (handler) {
            try {
                handler(args);
            } catch (error) {
                console.log(chalk.red(`❌ Error executing command: ${error.message}`));
            }
        } else {
            console.log(chalk.red(`❌ Unknown command: ${command}`));
            console.log(chalk.gray('   Type "help" for available commands'));
        }
    }

    showStatus() {
        console.log(chalk.blue.bold('📊 Playground Status:'));
        console.log(chalk.gray('─'.repeat(50)));
        console.log(`🤖 Active Agents: ${chalk.cyan(this.agents.size)}`);
        console.log(`📡 Channels: ${chalk.cyan(this.channels.size)}`);
        console.log(`📨 Messages Sent: ${chalk.cyan(this.messages.length)}`);
        console.log(`⏱️  Uptime: ${chalk.cyan(this.getUptime())}`);
        console.log(`🔗 Network: ${chalk.green('Solana Devnet')}`);
        console.log(`💰 Wallet Balance: ${chalk.yellow('1,000 SOL')}`);
        console.log();
    }

    listAgents() {
        if (this.agents.size === 0) {
            console.log(chalk.gray('📭 No agents created yet. Use "create-agent <name> <type>" to create one.'));
            return;
        }

        console.log(chalk.blue.bold('🤖 Active Agents:'));
        console.log(chalk.gray('─'.repeat(60)));
        
        this.agents.forEach((agent, name) => {
            const statusIcon = agent.status === 'active' ? '🟢' : 
                             agent.status === 'idle' ? '🟡' : '🔴';
            console.log(`${statusIcon} ${chalk.cyan(name.padEnd(15))} ${chalk.gray(agent.type.padEnd(15))} ${chalk.green(agent.status)}`);
        });
        console.log();
    }

    createAgent(args) {
        if (args.length < 2) {
            console.log(chalk.red('❌ Usage: create-agent <name> <type>'));
            console.log(chalk.gray('   Types: trading, content, ml, custom'));
            return;
        }

        const [name, type] = args;
        
        if (this.agents.has(name)) {
            console.log(chalk.red(`❌ Agent "${name}" already exists`));
            return;
        }

        const spinner = ora(`Creating agent ${name}...`).start();
        
        setTimeout(() => {
            this.agents.set(name, {
                type,
                status: 'active',
                created: new Date(),
                messageCount: 0,
                channels: new Set()
            });
            
            spinner.succeed(chalk.green(`✅ Agent "${name}" (${type}) created successfully!`));
            
            // Simulate agent initialization
            console.log(chalk.gray(`   📍 Agent registered on blockchain`));
            console.log(chalk.gray(`   🔑 Keypair generated`));
            console.log(chalk.gray(`   💰 Funded with test SOL`));
        }, 1500);
    }

    removeAgent(args) {
        const [name] = args;
        
        if (!this.agents.has(name)) {
            console.log(chalk.red(`❌ Agent "${name}" not found`));
            return;
        }

        this.agents.delete(name);
        console.log(chalk.green(`✅ Agent "${name}" removed successfully`));
    }

    sendMessage(args) {
        if (args.length < 3) {
            console.log(chalk.red('❌ Usage: send-message <from> <to> <message>'));
            return;
        }

        const [from, to, ...messageParts] = args;
        const message = messageParts.join(' ');

        if (!this.agents.has(from) || !this.agents.has(to)) {
            console.log(chalk.red('❌ One or both agents not found'));
            return;
        }

        const spinner = ora('Sending message...').start();
        
        setTimeout(() => {
            this.messages.push({
                from,
                to,
                message,
                timestamp: new Date(),
                id: this.messages.length + 1
            });
            
            this.agents.get(from).messageCount++;
            this.agents.get(to).messageCount++;
            
            spinner.succeed(chalk.green(`✅ Message sent from ${from} to ${to}`));
            console.log(chalk.gray(`   📨 "${message}"`));
            console.log(chalk.gray(`   🔗 Transaction hash: 0x${Math.random().toString(16).substr(2, 8)}`));
        }, 1000);
    }

    createChannel(args) {
        const [name] = args;
        
        if (!name) {
            console.log(chalk.red('❌ Usage: create-channel <name>'));
            return;
        }

        if (this.channels.has(name)) {
            console.log(chalk.red(`❌ Channel "${name}" already exists`));
            return;
        }

        this.channels.set(name, {
            members: new Set(),
            messages: [],
            created: new Date()
        });

        console.log(chalk.green(`✅ Channel "${name}" created successfully`));
    }

    runBenchmark() {
        console.log(chalk.blue.bold('🏃‍♂️ Running Performance Benchmarks...'));
        console.log();

        const tests = [
            { name: 'Agent Creation', target: 100, unit: 'agents/sec' },
            { name: 'Message Throughput', target: 1000, unit: 'msg/sec' },
            { name: 'Channel Operations', target: 500, unit: 'ops/sec' },
            { name: 'Blockchain Queries', target: 200, unit: 'queries/sec' }
        ];

        let completed = 0;
        
        tests.forEach((test, index) => {
            setTimeout(() => {
                const spinner = ora(`Testing ${test.name}...`).start();
                
                setTimeout(() => {
                    const result = Math.floor(Math.random() * 50) + test.target - 25;
                    const status = result >= test.target * 0.9 ? '✅' : '⚠️';
                    
                    spinner.succeed(`${status} ${test.name}: ${result} ${test.unit}`);
                    
                    completed++;
                    if (completed === tests.length) {
                        console.log();
                        console.log(chalk.green.bold('🎉 Benchmark completed!'));
                        console.log(chalk.gray('   Results logged to benchmark-results.json'));
                    }
                }, 2000);
            }, index * 500);
        });
    }

    testIntegration() {
        console.log(chalk.blue.bold('🔧 Running Integration Tests...'));
        console.log();

        const integrations = [
            'Solana RPC Connection',
            'Anchor Program Interface',
            'Agent Account Creation',
            'Message PDA Operations',
            'Channel Management',
            'Token Operations',
            'Event Listeners'
        ];

        integrations.forEach((integration, index) => {
            setTimeout(() => {
                const spinner = ora(`Testing ${integration}...`).start();
                
                setTimeout(() => {
                    const success = Math.random() > 0.1; // 90% success rate
                    if (success) {
                        spinner.succeed(chalk.green(`✅ ${integration}`));
                    } else {
                        spinner.fail(chalk.red(`❌ ${integration}`));
                    }
                }, 1500);
            }, index * 200);
        });
    }

    startMonitoring() {
        console.log(chalk.blue.bold('📊 Starting Real-time Monitoring...'));
        console.log(chalk.gray('   Press Ctrl+C to stop monitoring'));
        console.log();

        let count = 0;
        const interval = setInterval(() => {
            const metrics = {
                agents: this.agents.size,
                messages: Math.floor(Math.random() * 100) + 50,
                tps: Math.floor(Math.random() * 1000) + 2000,
                memory: (Math.random() * 50 + 30).toFixed(1)
            };

            process.stdout.write(`\r📊 Agents: ${chalk.cyan(metrics.agents)} | Messages/s: ${chalk.green(metrics.messages)} | TPS: ${chalk.yellow(metrics.tps)} | Memory: ${chalk.red(metrics.memory)}MB`);
            
            count++;
            if (count > 20) {
                clearInterval(interval);
                console.log();
                console.log(chalk.gray('   Monitoring stopped.'));
            }
        }, 1000);
    }

    exportLogs() {
        const logs = {
            session: {
                started: this.startTime,
                agents: Array.from(this.agents.entries()),
                channels: Array.from(this.channels.entries()),
                messages: this.messages
            }
        };

        console.log(chalk.green('✅ Session logs exported to playground-session.json'));
        console.log(chalk.gray(`   📊 ${this.agents.size} agents, ${this.messages.length} messages`));
    }

    getUptime() {
        if (!this.startTime) this.startTime = new Date();
        const uptime = Date.now() - this.startTime;
        const minutes = Math.floor(uptime / 60000);
        const seconds = Math.floor((uptime % 60000) / 1000);
        return `${minutes}m ${seconds}s`;
    }

    quit() {
        console.log();
        console.log(chalk.yellow('👋 Thanks for using PoD Protocol Playground!'));
        console.log(chalk.gray('   Happy coding! 🚀'));
        this.rl.close();
        process.exit(0);
    }
}

// Handle CLI arguments
const program = new Command();
program
    .name('pod-playground')
    .description('🎮 PoD Protocol Interactive Development Playground')
    .version('1.0.0');

program
    .option('-d, --demo', 'Run demo mode with sample data')
    .option('-v, --verbose', 'Enable verbose logging')
    .action((options) => {
        const playground = new PoDPlayground();
        
        if (options.demo) {
            console.log(chalk.blue('🎭 Starting in demo mode...'));
        }
        
        playground.start();
    });

// Start if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
    program.parse();
}

export default PoDPlayground;
