#!/usr/bin/env node

import { createInterface } from 'readline';

// Simple colors for demo
const colors = {
  primary: '\x1b[35m',    // Magenta
  secondary: '\x1b[36m',  // Cyan
  accent: '\x1b[97m',     // Bright White
  success: '\x1b[32m',    // Green
  warning: '\x1b[33m',    // Yellow
  error: '\x1b[31m',      // Red
  muted: '\x1b[90m',      // Gray
  reset: '\x1b[0m'        // Reset
};

const icons = {
  lightning: '⚡️',
  star: '⭐',
  agent: '🤖',
  brain: '🧠',
  rocket: '🚀',
  gear: '⚙️',
  info: 'ℹ️',
  wave: '👋',
  warning: '⚠️',
  error: '❌',
  success: '✅'
};

class PoDInteractiveCLI {
  constructor() {
    this.commandHistory = [];
    this.currentNetwork = 'devnet';
    this.setupReadline();
  }

  setupReadline() {
    this.readline = createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: this.getPrompt(),
    });

    // Enable tab completion
    this.readline.completer = this.tabCompletion.bind(this);
  }

  getPrompt() {
    return `${colors.primary}${icons.lightning} PoD${colors.reset} ${colors.secondary}(${this.currentNetwork})${colors.reset} ${colors.accent}❯${colors.reset} `;
  }

  tabCompletion(line) {
    const commands = [
      'help', 'demo-agent', 'demo-message', 'tutorial', 'status', 'network', 'clear', 'history', 'exit', 'quit'
    ];

    const hits = commands.filter(cmd => cmd.startsWith(line));
    return [hits.length ? hits : commands, line];
  }

  showWelcome() {
    console.clear();
    console.log(`
${colors.primary}██████╗  ██████╗ ██████╗     ██████╗ ██████╗  ██████╗ ████████╗ ██████╗  ██████╗ ██████╗ ██╗     
██╔══██╗██╔═══██╗██╔══██╗    ██╔══██╗██╔══██╗██╔═══██╗╚══██╔══╝██╔═══██╗██╔════╝██╔═══██╗██║     
██████╔╝██║   ██║██║  ██║    ██████╔╝██████╔╝██║   ██║   ██║   ██║   ██║██║     ██║   ██║██║     
██╔═══╝ ██║   ██║██║  ██║    ██╔═══╝ ██╔══██╗██║   ██║   ██║   ██║   ██║██║     ██║   ██║██║     
██║     ╚██████╔╝██████╔╝    ██║     ██║  ██║╚██████╔╝   ██║   ╚██████╔╝╚██████╗╚██████╔╝███████╗
╚═╝      ╚═════╝ ╚═════╝     ╚═╝     ╚═╝  ╚═╝ ╚═════╝    ╚═╝    ╚═════╝  ╚═════╝ ╚═════╝ ╚══════╝${colors.reset}

${colors.accent}                    The Ultimate AI Agent Communication Protocol${colors.reset}
${colors.secondary}                          Where prompts become prophecy ${icons.lightning}${colors.reset}

────────────────────────────────────────────────────────────

${icons.star} ${colors.accent}Welcome to PoD Protocol Interactive CLI!${colors.reset}
${icons.info} ${colors.secondary}Type commands below. Use 'help' for available commands.${colors.reset}
${icons.brain} ${colors.secondary}Try: 'demo-agent MyBot' or 'tutorial first-agent'${colors.reset}
${icons.warning} ${colors.muted}Type 'exit' or 'quit' to leave, 'clear' to clear screen.${colors.reset}

────────────────────────────────────────────────────────────
`);
  }

  showHelp() {
    console.log(`${icons.star} ${colors.accent}PoD Protocol Interactive CLI - Available Commands:${colors.reset}\n`);
    
    console.log(`${colors.primary}🤖 Demo Commands:${colors.reset}`);
    console.log(`  ${colors.secondary}demo-agent [name]${colors.reset}     - Register a demo AI agent`);
    console.log(`  ${colors.secondary}demo-message [content]${colors.reset} - Send a demo message`);
    console.log(`  ${colors.secondary}tutorial [topic]${colors.reset}      - Interactive tutorials`);
    console.log();
    
    console.log(`${colors.primary}📊 System Commands:${colors.reset}`);
    console.log(`  ${colors.secondary}status${colors.reset}                - Show system status`);
    console.log(`  ${colors.secondary}network [devnet|testnet|mainnet]${colors.reset} - Switch network`);
    console.log();
    
    console.log(`${colors.primary}📋 Session Commands:${colors.reset}`);
    console.log(`  ${colors.secondary}clear${colors.reset}                 - Clear the screen`);
    console.log(`  ${colors.secondary}history${colors.reset}               - Show command history`);
    console.log(`  ${colors.secondary}help${colors.reset}                  - Show this help`);
    console.log(`  ${colors.secondary}exit / quit${colors.reset}           - Exit interactive mode`);
    console.log();
    
    console.log(`${colors.accent}💡 Pro Tips:${colors.reset}`);
    console.log(`  ${colors.muted}• Use Tab for command completion${colors.reset}`);
    console.log(`  ${colors.muted}• Use Up/Down arrows for command history${colors.reset}`);
    console.log(`  ${colors.muted}• Commands persist across the session${colors.reset}`);
    console.log();
  }

  handleCommand(input) {
    const trimmedInput = input.trim();
    
    if (!trimmedInput) return;

    // Add to history
    this.commandHistory.push(trimmedInput);

    const args = trimmedInput.split(' ');
    const command = args[0].toLowerCase();

    switch (command) {
      case 'exit':
      case 'quit':
        console.log(`${icons.wave} ${colors.accent}Thanks for using PoD Protocol! Goodbye!${colors.reset}`);
        process.exit(0);
        break;

      case 'clear':
        this.showWelcome();
        return;

      case 'help':
        this.showHelp();
        return;

      case 'history':
        console.log(`${icons.info} ${colors.accent}Command History:${colors.reset}\n`);
        this.commandHistory.forEach((cmd, index) => {
          console.log(`${colors.primary}${index + 1}.${colors.reset} ${cmd}`);
        });
        console.log();
        return;

      case 'status':
        console.log(`${icons.rocket} ${colors.accent}PoD Protocol Status${colors.reset}\n`);
        console.log(`${icons.gear} ${colors.accent}CLI Version:${colors.reset} ${colors.secondary}1.5.2${colors.reset}`);
        console.log(`${icons.gear} ${colors.accent}Network:${colors.reset} ${colors.secondary}${this.currentNetwork.toUpperCase()}${colors.reset}`);
        console.log(`${icons.gear} ${colors.accent}Mode:${colors.reset} ${colors.secondary}INTERACTIVE DEMO${colors.reset}`);
        console.log(`${icons.success} ${colors.accent}Status:${colors.reset} ${colors.success}OPERATIONAL${colors.reset}`);
        console.log();
        return;

      case 'network':
        if (args[1] && ['devnet', 'testnet', 'mainnet'].includes(args[1])) {
          this.currentNetwork = args[1];
          console.log(`${icons.gear} ${colors.success}Switched to ${args[1]}${colors.reset}`);
          this.readline.setPrompt(this.getPrompt());
        } else {
          console.log(`${icons.error} ${colors.error}Invalid network. Use: devnet, testnet, or mainnet${colors.reset}`);
        }
        return;

      case 'demo-agent':
        const agentName = args[1] || 'MyDemoAgent';
        console.log(`${icons.agent} ${colors.accent}Demo Agent Registration${colors.reset}\n`);
        console.log(`${colors.success}${icons.success} Agent registered successfully!${colors.reset}\n`);
        console.log(`${colors.primary}Name:${colors.reset} ${agentName}`);
        console.log(`${colors.primary}Address:${colors.reset} Demo${Math.random().toString(36).substr(2, 9)}`);
        console.log(`${colors.primary}Capabilities:${colors.reset} analysis, trading`);
        console.log(`${colors.primary}Network:${colors.reset} ${this.currentNetwork}`);
        console.log(`${colors.primary}Status:${colors.reset} registered`);
        console.log(`${colors.muted}\nNote: This is a demo mode${colors.reset}`);
        console.log();
        return;

      case 'demo-message':
        const content = args.slice(1).join(' ') || 'Hello from PoD Interactive CLI!';
        console.log(`${icons.lightning} ${colors.accent}Demo Message Sending${colors.reset}\n`);
        console.log(`${colors.success}${icons.success} Message sent successfully!${colors.reset}\n`);
        console.log(`${colors.primary}Message ID:${colors.reset} msg_${Math.random().toString(36).substr(2, 9)}`);
        console.log(`${colors.primary}Content:${colors.reset} ${content}`);
        console.log(`${colors.primary}Encrypted:${colors.reset} true`);
        console.log(`${colors.primary}Status:${colors.reset} sent`);
        console.log(`${colors.primary}Timestamp:${colors.reset} ${new Date().toISOString()}`);
        console.log(`${colors.muted}\nNote: This is a demo mode${colors.reset}`);
        console.log();
        return;

      case 'tutorial':
        const topic = args[1] || '';
        if (!topic) {
          console.log(`${icons.star} ${colors.accent}Available Tutorials:${colors.reset}\n`);
          console.log(`  ${colors.primary}first-agent${colors.reset}      - Register and manage your first AI agent`);
          console.log(`  ${colors.primary}zk-compression${colors.reset}   - Save 99% on costs with ZK compression`);
          console.log(`  ${colors.primary}advanced-messaging${colors.reset} - Channels and group communication`);
          console.log(`${colors.muted}\nUsage:${colors.reset} ${colors.accent}tutorial first-agent${colors.reset}`);
        } else {
          console.log(`${icons.star} ${colors.accent}Tutorial: ${topic}${colors.reset}\n`);
          console.log(`${colors.primary}Step 1:${colors.reset} ${icons.agent} Register Your First Agent`);
          console.log(`  Create an AI agent with specific capabilities for trading, analysis, or content generation.`);
          console.log(`  ${colors.accent}Command:${colors.reset} ${colors.secondary}demo-agent MyTradingBot${colors.reset}`);
          console.log();
          console.log(`${colors.primary}Step 2:${colors.reset} ${icons.lightning} Send Your First Message`);
          console.log(`  Send encrypted messages between agents using the PoD Protocol network.`);
          console.log(`  ${colors.accent}Command:${colors.reset} ${colors.secondary}demo-message "Hello from my agent!"${colors.reset}`);
          console.log();
        }
        return;

      default:
        console.log(`${icons.brain} ${colors.warning}Unknown command: ${command}${colors.reset}`);
        console.log(`${icons.info} ${colors.secondary}Try 'help' for available commands${colors.reset}`);
        console.log();
    }
  }

  start() {
    this.showWelcome();

    this.readline.on('line', (input) => {
      this.handleCommand(input);
      this.readline.prompt();
    });

    this.readline.on('close', () => {
      console.log(`\n${icons.wave} ${colors.accent}Thanks for using PoD Protocol! Goodbye!${colors.reset}`);
      process.exit(0);
    });

    this.readline.on('SIGINT', () => {
      console.log(`\n${icons.warning} ${colors.warning}Use 'exit' or 'quit' to leave the interactive CLI${colors.reset}`);
      this.readline.prompt();
    });

    this.readline.prompt();
  }
}

// Start the interactive CLI
const cli = new PoDInteractiveCLI();
cli.start(); 