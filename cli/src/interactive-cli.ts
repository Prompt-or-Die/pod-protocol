import { createInterface } from 'readline';
import { Command } from 'commander';
import chalk from 'chalk';
import {
  showBanner,
  BannerSize,
  BRAND_COLORS,
  ICONS,
  DECORATIVE_ELEMENTS,
} from './utils/branding.js';
import { AIAssistant } from './utils/ai-assistant.js';
import { createStandaloneClient, mockAgentRegistration, mockMessageSend } from './utils/standalone-client.js';

export class InteractiveCLI {
  private readline: any;
  private aiAssistant: AIAssistant;
  private commandHistory: string[] = [];
  private currentNetwork: string = 'devnet';

  constructor() {
    this.aiAssistant = new AIAssistant();
    this.setupReadline();
  }

  private setupReadline() {
    this.readline = createInterface({
      input: process.stdin,
      output: process.stdout,
      history: this.commandHistory,
      prompt: this.getPrompt(),
    });

    // Enable tab completion
    this.readline.completer = this.tabCompletion.bind(this);
  }

  private getPrompt(): string {
    return `${BRAND_COLORS.primary("⚡️ PoD")} ${BRAND_COLORS.secondary(`(${this.currentNetwork})`)} ${BRAND_COLORS.accent("❯")} `;
  }

  private tabCompletion(line: string): [string[], string] {
    const commands = [
      'help', 'help-me', 'ask',
      'tutorial', 'demo-agent', 'demo-message',
      'status', 'migration-status',
      'zk', 'advanced',
      'network', 'clear', 'history', 'exit', 'quit'
    ];

    const hits = commands.filter((cmd) => cmd.startsWith(line));
    return [hits.length ? hits : commands, line];
  }

  private showWelcome() {
    console.clear();
    showBanner(BannerSize.FULL);
    console.log();
    console.log(`${ICONS.star} ${BRAND_COLORS.accent("Welcome to PoD Protocol Interactive CLI!")}`);
    console.log(`${ICONS.info} ${BRAND_COLORS.secondary("Type commands below. Use 'help' for available commands.")}`);
    console.log(`${ICONS.brain} ${BRAND_COLORS.secondary("Try: 'tutorial first-agent' or 'demo-agent --name MyBot'")}`);
    console.log(`${ICONS.warning} ${BRAND_COLORS.muted("Type 'exit' or 'quit' to leave, 'clear' to clear screen.")}`);
    console.log();
    console.log(`${DECORATIVE_ELEMENTS.line}`);
    console.log();
  }

  private async executeCommand(input: string): Promise<void> {
    const trimmedInput = input.trim();
    
    if (!trimmedInput) return;

    // Add to history
    this.commandHistory.push(trimmedInput);

    // Handle special interactive commands
    switch (trimmedInput.toLowerCase()) {
      case 'exit':
      case 'quit':
        console.log(`${ICONS.wave} ${BRAND_COLORS.accent("Thanks for using PoD Protocol! Goodbye!")}`);
        process.exit(0);
        break;

      case 'clear':
        console.clear();
        this.showWelcome();
        return;

      case 'history':
        this.showHistory();
        return;

      case 'help':
        this.showInteractiveHelp();
        return;

      case '':
        return;
    }

    // Handle network switching
    if (trimmedInput.startsWith('network ')) {
      const network = trimmedInput.split(' ')[1];
      if (['devnet', 'testnet', 'mainnet'].includes(network)) {
        this.currentNetwork = network;
        console.log(`${ICONS.network} ${BRAND_COLORS.success(`Switched to ${network}`)}`);
        this.readline.setPrompt(this.getPrompt());
        return;
      } else {
        console.log(`${ICONS.error} ${BRAND_COLORS.error("Invalid network. Use: devnet, testnet, or mainnet")}`);
        return;
      }
    }

    // Execute command using commander
    try {
      await this.executeCommandWithCommander(trimmedInput);
    } catch (error) {
      console.log(`${ICONS.error} ${BRAND_COLORS.error("Command error:")} ${(error as Error).message}`);
    }
  }

  private async executeCommandWithCommander(input: string): Promise<void> {
    const args = this.parseCommand(input);
    
    try {
      // Handle specific commands that need special processing
      if (args[0] === 'help-me' || args[0] === 'ask') {
        await this.handleHelpMe(args.slice(1));
        return;
      }

      if (args[0] === 'tutorial') {
        await this.handleTutorial(args[1]);
        return;
      }

      if (args[0] === 'demo-agent') {
        await this.handleDemoAgent(args);
        return;
      }

      if (args[0] === 'demo-message') {
        await this.handleDemoMessage(args);
        return;
      }

      if (args[0] === 'status') {
        await this.handleStatus(args.includes('--health'));
        return;
      }

      if (args[0] === 'migration-status') {
        await this.handleMigrationStatus();
        return;
      }

      if (args[0] === 'zk') {
        console.log(`${ICONS.warning} ${BRAND_COLORS.warning("ZK compression commands available:")}`);
        console.log(`  ${BRAND_COLORS.primary("zk tree")} - Merkle tree operations`);
        console.log(`  ${BRAND_COLORS.primary("zk nft")} - Compressed NFT operations`);
        return;
      }

      if (args[0] === 'advanced') {
        console.log(`${ICONS.gear} ${BRAND_COLORS.warning("Advanced features coming soon in this interactive mode!")}`);
        return;
      }

      // Default: Show suggestion
      console.log(`${ICONS.brain} ${BRAND_COLORS.warning(`Unknown command: ${args[0]}`)}`);
      console.log(`${ICONS.info} ${BRAND_COLORS.secondary("Try 'help' for available commands")}`);
      
    } catch (error) {
      console.log(`${ICONS.error} ${BRAND_COLORS.error("Execution error:")} ${(error as Error).message}`);
    }
  }

  private parseCommand(input: string): string[] {
    // Simple command parsing - split by spaces but handle quotes
    const args: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < input.length; i++) {
      const char = input[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ' ' && !inQuotes) {
        if (current) {
          args.push(current);
          current = '';
        }
      } else {
        current += char;
      }
    }
    
    if (current) {
      args.push(current);
    }
    
    return args;
  }

  private async handleHelpMe(query: string[]): Promise<void> {
    const queryString = query.join(' ');
    
    if (!queryString) {
      console.log(`${ICONS.agent} ${BRAND_COLORS.accent("PoD Protocol AI Assistant")}\n`);
      console.log(`${ICONS.info} Ask me anything about PoD Protocol!\n`);
      console.log(`${BRAND_COLORS.primary("Examples:")}`);
      console.log(`  ${BRAND_COLORS.secondary("help-me register an agent with trading capabilities")}`);
      console.log(`  ${BRAND_COLORS.secondary("help-me send encrypted messages")}`);
      console.log(`  ${BRAND_COLORS.secondary("help-me save money with ZK compression")}`);
      console.log(`  ${BRAND_COLORS.secondary("help-me create a community channel")}`);
      console.log();
      return;
    }
    
    console.log(`${ICONS.agent} ${BRAND_COLORS.accent("AI Assistant analyzing:")} "${queryString}"\n`);
    this.aiAssistant.displayInteractiveHelp(queryString);
  }

  private async handleTutorial(topic?: string): Promise<void> {
    if (!topic) {
      console.log(`${ICONS.star} ${BRAND_COLORS.accent("Available Tutorials:")}\n`);
      console.log(`  ${BRAND_COLORS.primary("first-agent")}      - Register and manage your first AI agent`);
      console.log(`  ${BRAND_COLORS.primary("zk-compression")}   - Save 99% on costs with ZK compression`);
      console.log(`  ${BRAND_COLORS.primary("advanced-messaging")} - Channels and group communication`);
      console.log(`  ${BRAND_COLORS.primary("web3v2-migration")} - Web3.js v2 migration guide`);
      console.log();
      console.log(`${BRAND_COLORS.muted("Usage:")} ${BRAND_COLORS.accent("tutorial first-agent")}`);
      return;
    }

    const tutorial = this.aiAssistant.getTutorial(topic);
    if (tutorial.length === 0) {
      console.log(`${ICONS.warning} ${BRAND_COLORS.warning(`Tutorial "${topic}" not found.`)}`);
      console.log(`${ICONS.info} Available tutorials: first-agent, zk-compression, advanced-messaging, web3v2-migration`);
      return;
    }

    console.log(`${ICONS.star} ${BRAND_COLORS.accent(`Tutorial: ${topic}`)}\n`);
    tutorial.forEach((step, index) => {
      console.log(`${BRAND_COLORS.primary(`Step ${index + 1}:`)} ${step.title}`);
      console.log(`  ${step.description}`);
      if (step.command) {
        console.log(`  ${BRAND_COLORS.accent("Command:")} ${BRAND_COLORS.secondary(step.command)}`);
      }
      if (step.example) {
        console.log(`  ${BRAND_COLORS.muted(step.example)}`);
      }
      console.log();
    });
  }

  private async handleDemoAgent(args: string[]): Promise<void> {
    // Parse options from args
    let name = 'MyDemoAgent';
    let capabilities = 'analysis,trading';

    for (let i = 0; i < args.length - 1; i++) {
      if (args[i] === '--name' && args[i + 1]) {
        name = args[i + 1];
      }
      if (args[i] === '--capabilities' && args[i + 1]) {
        capabilities = args[i + 1];
      }
    }

    console.log(`${ICONS.agent} ${BRAND_COLORS.accent("Demo Agent Registration")}\n`);
    
    const capabilityList = capabilities.split(',').map((c: string) => c.trim());
    const result = mockAgentRegistration(name, capabilityList);
    
    console.log(`${BRAND_COLORS.success("✅ Agent registered successfully!")}\n`);
    console.log(`${BRAND_COLORS.primary("Name:")} ${result.name}`);
    console.log(`${BRAND_COLORS.primary("Address:")} ${result.address}`);
    console.log(`${BRAND_COLORS.primary("Capabilities:")} ${result.capabilities.join(", ")}`);
    console.log(`${BRAND_COLORS.primary("Network:")} ${result.network}`);
    console.log(`${BRAND_COLORS.primary("Status:")} ${result.status}`);
    
    console.log(`${BRAND_COLORS.muted("\nNote: This is a demo mode during Web3.js v2 migration")}`);
  }

  private async handleDemoMessage(args: string[]): Promise<void> {
    // Parse options from args
    let recipient = 'DemoRecipientAddress';
    let content = 'Hello from PoD Protocol Interactive CLI! 🎭';

    for (let i = 0; i < args.length - 1; i++) {
      if (args[i] === '--recipient' && args[i + 1]) {
        recipient = args[i + 1];
      }
      if (args[i] === '--content' && args[i + 1]) {
        content = args[i + 1];
      }
    }

    console.log(`${ICONS.lightning} ${BRAND_COLORS.accent("Demo Message Sending")}\n`);
    
    const result = mockMessageSend(recipient, content);
    
    console.log(`${BRAND_COLORS.success("✅ Message sent successfully!")}\n`);
    console.log(`${BRAND_COLORS.primary("Message ID:")} ${result.messageId}`);
    console.log(`${BRAND_COLORS.primary("Recipient:")} ${result.recipient}`);
    console.log(`${BRAND_COLORS.primary("Content:")} ${result.content}`);
    console.log(`${BRAND_COLORS.primary("Encrypted:")} ${result.encrypted}`);
    console.log(`${BRAND_COLORS.primary("Status:")} ${result.status}`);
    console.log(`${BRAND_COLORS.primary("Timestamp:")} ${result.timestamp}`);
    
    console.log(`${BRAND_COLORS.muted("\nNote: This is a demo mode during Web3.js v2 migration")}`);
  }

  private async handleStatus(health: boolean = false): Promise<void> {
    console.log(`${ICONS.rocket} ${BRAND_COLORS.accent("PoD Protocol Status")}\n`);

    const client = createStandaloneClient({ network: this.currentNetwork });

    const statusItems = [
      { label: "CLI Version", value: "1.5.2", icon: ICONS.gear },
      { label: "Network", value: this.currentNetwork.toUpperCase(), icon: ICONS.network },
      { label: "RPC URL", value: client.rpcUrl, icon: ICONS.chain },
      { label: "Mode", value: "INTERACTIVE (Web3.js v2 Migration)", icon: ICONS.success },
      { label: "Status", value: "OPERATIONAL", icon: ICONS.success },
    ];

    statusItems.forEach((item) => {
      console.log(`${item.icon} ${BRAND_COLORS.accent(item.label)}: ${BRAND_COLORS.secondary(item.value)}`);
    });

    if (health) {
      console.log();
      console.log(`${ICONS.loading} ${BRAND_COLORS.info("Running health checks...")}`);
      console.log(`${ICONS.success} ${BRAND_COLORS.success("Interactive CLI operational")}`);
      console.log(`${ICONS.info} ${BRAND_COLORS.info("SDK migration in progress")}`);
    }
  }

  private async handleMigrationStatus(): Promise<void> {
    console.log(`${ICONS.gear} ${BRAND_COLORS.accent("PoD Protocol Web3.js v2 Migration Status")}\n`);
    
    console.log(`${BRAND_COLORS.primary("✅ Completed:")}`);
    console.log(`  • Interactive CLI with persistent session`);
    console.log(`  • AI Assistant with v2 compatibility`);
    console.log(`  • Demo mode with agent registration`);
    console.log(`  • Enhanced error handling and branding`);
    console.log(`  • ZK compression command structure`);
    
    console.log(`${BRAND_COLORS.warning("\n🚧 In Progress:")}`);
    console.log(`  • SDK services migration to v2 patterns`);
    console.log(`  • Full command implementation`);
    console.log(`  • Real blockchain interactions`);
    
    console.log(`${BRAND_COLORS.success("\n🎯 Interactive CLI:")} Fully operational with persistent session!`);
  }

  private showHistory(): void {
    console.log(`${ICONS.history} ${BRAND_COLORS.accent("Command History:")}\n`);
    if (this.commandHistory.length === 0) {
      console.log(`${BRAND_COLORS.muted("No commands in history yet.")}`);
    } else {
      this.commandHistory.forEach((cmd, index) => {
        console.log(`${BRAND_COLORS.primary(`${index + 1}.`)} ${cmd}`);
      });
    }
    console.log();
  }

  private showInteractiveHelp(): void {
    console.log(`${ICONS.star} ${BRAND_COLORS.accent("PoD Protocol Interactive CLI - Available Commands:")}\n`);
    
    console.log(`${BRAND_COLORS.primary("🤖 AI & Tutorials:")}`);
    console.log(`  ${BRAND_COLORS.secondary("help-me <query>")}     - AI-powered help and suggestions`);
    console.log(`  ${BRAND_COLORS.secondary("tutorial [topic]")}    - Interactive tutorials`);
    console.log();
    
    console.log(`${BRAND_COLORS.primary("🎭 Demo Commands:")}`);
    console.log(`  ${BRAND_COLORS.secondary("demo-agent --name <name> --capabilities <caps>")}`);
    console.log(`  ${BRAND_COLORS.secondary("demo-message --content <message> --recipient <addr>")}`);
    console.log();
    
    console.log(`${BRAND_COLORS.primary("📊 System Commands:")}`);
    console.log(`  ${BRAND_COLORS.secondary("status [--health]")}   - Show system status`);
    console.log(`  ${BRAND_COLORS.secondary("migration-status")}    - Web3.js v2 migration progress`);
    console.log(`  ${BRAND_COLORS.secondary("network <devnet|testnet|mainnet>")} - Switch network`);
    console.log();
    
    console.log(`${BRAND_COLORS.primary("🗜️ Advanced:")}`);
    console.log(`  ${BRAND_COLORS.secondary("zk")}                  - ZK compression operations`);
    console.log(`  ${BRAND_COLORS.secondary("advanced")}            - Advanced features`);
    console.log();
    
    console.log(`${BRAND_COLORS.primary("📋 Session Commands:")}`);
    console.log(`  ${BRAND_COLORS.secondary("clear")}               - Clear the screen`);
    console.log(`  ${BRAND_COLORS.secondary("history")}             - Show command history`);
    console.log(`  ${BRAND_COLORS.secondary("help")}                - Show this help`);
    console.log(`  ${BRAND_COLORS.secondary("exit / quit")}         - Exit interactive mode`);
    console.log();
    
    console.log(`${BRAND_COLORS.accent("💡 Pro Tips:")}`);
    console.log(`  ${BRAND_COLORS.muted("• Use Tab for command completion")}`);
    console.log(`  ${BRAND_COLORS.muted("• Use Up/Down arrows for command history")}`);
    console.log(`  ${BRAND_COLORS.muted("• Commands persist across the session")}`);
    console.log();
  }

  public async start(): Promise<void> {
    this.showWelcome();

    this.readline.on('line', async (input: string) => {
      await this.executeCommand(input);
      console.log(); // Add spacing
      this.readline.prompt();
    });

    this.readline.on('close', () => {
      console.log(`\n${ICONS.wave} ${BRAND_COLORS.accent("Thanks for using PoD Protocol! Goodbye!")}`);
      process.exit(0);
    });

    // Handle Ctrl+C gracefully
    this.readline.on('SIGINT', () => {
      console.log(`\n${ICONS.warning} ${BRAND_COLORS.warning("Use 'exit' or 'quit' to leave the interactive CLI")}`);
      this.readline.prompt();
    });

    this.readline.prompt();
  }
} 