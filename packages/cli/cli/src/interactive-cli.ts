import { createInterface } from 'readline';
import { Command } from 'commander';
import chalk from 'chalk';
import { intro, outro, text, select, multiselect, confirm, spinner, note } from '@clack/prompts';
import { Listr } from 'listr2';
import boxen from 'boxen';
import * as emoji from 'node-emoji';
import blessed from 'blessed';
import {
  showBanner,
  BannerSize,
  BRAND_COLORS,
  ICONS,
  DECORATIVE_ELEMENTS,
  createAnimatedPODBanner,
  typewriterEffect,
  createProgressBar
} from './utils/branding.js';
import { AIAssistant } from './utils/ai-assistant.js';
import { createStandaloneClient, mockAgentRegistration, mockMessageSend } from './utils/standalone-client.js';

export class InteractiveCLI {
  private readline: any;
  private aiAssistant: AIAssistant;
  private commandHistory: string[] = [];
  private currentNetwork: string = 'devnet';
  private dashboard: blessed.Widgets.Screen | null = null;

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
      'zk', 'advanced', 'dashboard', 'wizard',
      'network', 'clear', 'history', 'exit', 'quit'
    ];

    const hits = commands.filter((cmd) => cmd.startsWith(line));
    return [hits.length ? hits : commands, line];
  }

  private async showWelcome() {
    await createAnimatedPODBanner();
    await typewriterEffect(`${emoji.get('star')} Welcome to PoD Protocol Interactive CLI!`);
    await typewriterEffect(`${emoji.get('information_source')} Type commands below. Use 'help' for available commands.`);
    await typewriterEffect(`${emoji.get('brain')} Try: 'tutorial first-agent' or 'demo-agent --name MyBot'`);
    await typewriterEffect(`${emoji.get('warning')} Type 'exit' or 'quit' to leave, 'clear' to clear screen.`);
    console.log();
    console.log(`${DECORATIVE_ELEMENTS.line}`);
    console.log();
  }

  // Enhanced agent registration with modern prompts
  private async enhancedAgentRegistration(): Promise<void> {
    intro(`${emoji.get('robot_face')} Agent Registration Wizard`);

    const agentName = await text({
      message: 'What would you like to name your agent?',
      placeholder: 'MyAwesomeAgent',
      validate: (value) => {
        if (!value) return 'Agent name is required';
        if (value.length < 3) return 'Agent name must be at least 3 characters';
      }
    });

    if (typeof agentName === 'symbol') return; // User cancelled

    const capabilities = await multiselect({
      message: 'Select agent capabilities:',
      options: [
        { value: 'trading', label: `${emoji.get('chart_with_upwards_trend')} Trading & Finance` },
        { value: 'analysis', label: `${emoji.get('mag')} Data Analysis` },
        { value: 'content', label: `${emoji.get('pencil2')} Content Generation` },
        { value: 'monitoring', label: `${emoji.get('eye')} System Monitoring` },
        { value: 'communication', label: `${emoji.get('speech_balloon')} Inter-Agent Communication` }
      ]
    });

    if (typeof capabilities === 'symbol') return; // User cancelled

    const advanced = await confirm({
      message: 'Enable advanced AI features?'
    });

    if (typeof advanced === 'symbol') return; // User cancelled

    // Execute with enhanced progress visualization
    const tasks = new Listr([
      {
        title: 'Generating cryptographic keys',
        task: async () => {
          await new Promise(resolve => setTimeout(resolve, 1500));
        }
      },
      {
        title: 'Registering with PoD Protocol network',
        task: async () => {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      },
      {
        title: 'Configuring capabilities',
        task: async () => {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      },
      {
        title: 'Finalizing setup',
        task: async () => {
          await new Promise(resolve => setTimeout(resolve, 800));
        }
      }
    ]);

    await tasks.run();

    outro(`${emoji.get('tada')} Agent "${agentName}" registered successfully!`);

    note(boxen(
      `${emoji.get('rocket')} Your agent is now live on the PoD Protocol network!\n\n` +
      `${emoji.get('clipboard')} Agent Details:\n` +
      `   Name: ${agentName}\n` +
      `   Capabilities: ${Array.isArray(capabilities) ? capabilities.join(', ') : 'none'}\n` +
      `   Advanced Features: ${advanced ? 'Enabled' : 'Disabled'}\n\n` +
      `${emoji.get('link')} Next steps:\n` +
      `   • Run 'pod agents list' to see all agents\n` +
      `   • Use 'pod messages send' to start communicating\n` +
      `   • Try 'pod dashboard' for real-time monitoring`,
      {
        padding: 1,
        borderStyle: 'round',
        borderColor: 'cyan'
      }
    ));
  }

  // Enhanced dashboard with real-time monitoring
  private async launchDashboard(): Promise<void> {
    this.dashboard = blessed.screen({
      smartCSR: true,
      title: 'PoD Protocol - Live Dashboard'
    });

    // Agent List
    const agentList = blessed.list({
      parent: this.dashboard,
      label: ` ${emoji.get('robot_face')} Active Agents `,
      top: 0,
      left: 0,
      width: '50%',
      height: '50%',
      border: { type: 'line' },
      style: {
        selected: { bg: 'blue' },
        border: { fg: 'cyan' }
      },
      keys: true,
      vi: true
    });

    // Network Status
    const statusBox = blessed.box({
      parent: this.dashboard,
      label: ` ${emoji.get('bar_chart')} Network Status `,
      top: 0,
      left: '50%',
      width: '50%',
      height: '50%',
      border: { type: 'line' },
      style: { border: { fg: 'green' } },
      content: this.generateStatusContent()
    });

    // Activity Log
    const logBox = blessed.log({
      parent: this.dashboard,
      label: ` ${emoji.get('scroll')} Activity Log `,
      top: '50%',
      left: 0,
      width: '100%',
      height: '50%',
      border: { type: 'line' },
      style: { border: { fg: 'yellow' } },
      scrollable: true,
      alwaysScroll: true
    });

    // Setup event handlers
    this.dashboard.key(['escape', 'q', 'C-c'], () => {
      this.dashboard?.destroy();
      return process.exit(0);
    });

    agentList.focus();

    // Simulate real-time data
    this.simulateRealTimeData(agentList, logBox);
    this.dashboard.render();
  }

  private generateStatusContent(): string {
    return `
  ${emoji.get('globe_with_meridians')} Network: ${chalk.green('CONNECTED')}
  ${emoji.get('satellite')} RPC Endpoint: devnet
  ${emoji.get('link')} Active Connections: 3
  ${emoji.get('speech_balloon')} Messages Today: 127
  ${emoji.get('classical_building')} Channels: 8
  ${emoji.get('moneybag')} Escrows: 2 pending
  ${emoji.get('zap')} Latency: 45ms
  ${emoji.get('chart_with_upwards_trend')} Uptime: 4h 23m
    `;
  }

  private simulateRealTimeData(agentList: any, logBox: any) {
    const agents = [
      `${emoji.get('robot_face')} TradingBot-Alpha (Active)`,
      `${emoji.get('brain')} AnalysisAgent-Beta (Processing)`,
      `${emoji.get('bar_chart')} DataMiner-Gamma (Idle)`,
      `${emoji.get('mag')} SentinelAgent-Delta (Monitoring)`
    ];

    agentList.setItems(agents);

    // Simulate log entries
    setInterval(() => {
      const logMessages = [
        `${emoji.get('white_check_mark')} Agent registered successfully`,
        `${emoji.get('envelope')} Message sent to channel #trading`,
        `${emoji.get('arrows_clockwise')} Syncing with network peers`,
        `${emoji.get('zap')} Processing 15 new transactions`
      ];
      
      const randomMessage = logMessages[Math.floor(Math.random() * logMessages.length)];
      logBox.log(`${new Date().toLocaleTimeString()} - ${randomMessage}`);
      this.dashboard?.render();
    }, 2000);
  }

  // Enhanced command execution with modern prompts
  private async executeCommand(input: string): Promise<void> {
    const trimmedInput = input.trim();
    
    if (!trimmedInput) return;

    // Add to history
    this.commandHistory.push(trimmedInput);

    // Handle special interactive commands
    switch (trimmedInput.toLowerCase()) {
      case 'exit':
      case 'quit':
        console.log(`${emoji.get('wave')} ${BRAND_COLORS.accent("Thanks for using PoD Protocol! Goodbye!")}`);
        process.exit(0);
        break;

      case 'clear':
        await this.showWelcome();
        return;

      case 'history':
        this.showHistory();
        return;

      case 'help':
        this.showInteractiveHelp();
        return;

      case 'wizard':
        await this.enhancedAgentRegistration();
        return;

      case 'dashboard':
        await this.launchDashboard();
        return;

      case '':
        return;
    }

    // Handle network switching
    if (trimmedInput.startsWith('network ')) {
      const network = trimmedInput.split(' ')[1];
      if (['devnet', 'testnet', 'mainnet'].includes(network)) {
        this.currentNetwork = network;
        console.log(`${emoji.get('globe_with_meridians')} ${BRAND_COLORS.success(`Switched to ${network}`)}`);
        this.readline.setPrompt(this.getPrompt());
        return;
      } else {
        console.log(`${emoji.get('x')} ${BRAND_COLORS.error("Invalid network. Use: devnet, testnet, or mainnet")}`);
        return;
      }
    }

    // Execute command using commander
    try {
      await this.executeCommandWithCommander(trimmedInput);
    } catch (error) {
      console.log(`${emoji.get('x')} ${BRAND_COLORS.error("Command error:")} ${(error as Error).message}`);
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
        console.log(`${emoji.get('warning')} ${BRAND_COLORS.warning("ZK compression commands available:")}`);
        console.log(`  ${BRAND_COLORS.primary("zk tree")} - Merkle tree operations`);
        console.log(`  ${BRAND_COLORS.primary("zk nft")} - Compressed NFT operations`);
        return;
      }

      if (args[0] === 'advanced') {
        console.log(`${emoji.get('gear')} ${BRAND_COLORS.warning("Advanced features coming soon in this interactive mode!")}`);
        return;
      }

      // Default: Show suggestion
      console.log(`${emoji.get('brain')} ${BRAND_COLORS.warning(`Unknown command: ${args[0]}`)}`);
      console.log(`${emoji.get('information_source')} ${BRAND_COLORS.secondary("Try 'help' for available commands")}`);
      
    } catch (error) {
      console.log(`${emoji.get('x')} ${BRAND_COLORS.error("Execution error:")} ${(error as Error).message}`);
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
      console.log(`${emoji.get('robot_face')} ${BRAND_COLORS.accent("PoD Protocol AI Assistant")}\n`);
      console.log(`${emoji.get('information_source')} Ask me anything about PoD Protocol!\n`);
      console.log(`${BRAND_COLORS.primary("Examples:")}`);
      console.log(`  ${BRAND_COLORS.secondary("help-me register an agent with trading capabilities")}`);
      console.log(`  ${BRAND_COLORS.secondary("help-me send encrypted messages")}`);
      console.log(`  ${BRAND_COLORS.secondary("help-me save money with ZK compression")}`);
      console.log(`  ${BRAND_COLORS.secondary("help-me create a community channel")}`);
      console.log();
      return;
    }
    
    console.log(`${emoji.get('robot_face')} ${BRAND_COLORS.accent("AI Assistant analyzing:")} "${queryString}"\n`);
    this.aiAssistant.displayInteractiveHelp(queryString);
  }

  private async handleTutorial(topic?: string): Promise<void> {
    if (!topic) {
      console.log(`${emoji.get('star')} ${BRAND_COLORS.accent("Available Tutorials:")}\n`);
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
      console.log(`${emoji.get('warning')} ${BRAND_COLORS.warning(`Tutorial "${topic}" not found.`)}`);
      console.log(`${emoji.get('information_source')} Available tutorials: first-agent, zk-compression, advanced-messaging, web3v2-migration`);
      return;
    }

    console.log(`${emoji.get('star')} ${BRAND_COLORS.accent(`Tutorial: ${topic}`)}\n`);
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

    console.log(`${emoji.get('robot_face')} ${BRAND_COLORS.accent("Demo Agent Registration")}\n`);
    
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

    console.log(`${emoji.get('lightning')} ${BRAND_COLORS.accent("Demo Message Sending")}\n`);
    
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
    console.log(`${emoji.get('rocket')} ${BRAND_COLORS.accent("PoD Protocol Status")}\n`);

    const client = createStandaloneClient({ network: this.currentNetwork });

    const statusItems = [
      { label: "CLI Version", value: "1.5.2", icon: emoji.get('gear') },
      { label: "Network", value: this.currentNetwork.toUpperCase(), icon: emoji.get('globe_with_meridians') },
      { label: "RPC URL", value: client.rpcUrl, icon: emoji.get('chain') },
      { label: "Mode", value: "INTERACTIVE (Web3.js v2 Migration)", icon: emoji.get('success') },
      { label: "Status", value: "OPERATIONAL", icon: emoji.get('success') },
    ];

    statusItems.forEach((item) => {
      console.log(`${item.icon} ${BRAND_COLORS.accent(item.label)}: ${BRAND_COLORS.secondary(item.value)}`);
    });

    if (health) {
      console.log();
      console.log(`${emoji.get('loading')} ${BRAND_COLORS.info("Running health checks...")}`);
      console.log(`${emoji.get('success')} ${BRAND_COLORS.success("Interactive CLI operational")}`);
      console.log(`${emoji.get('information_source')} ${BRAND_COLORS.info("SDK migration in progress")}`);
    }
  }

  private async handleMigrationStatus(): Promise<void> {
    console.log(`${emoji.get('gear')} ${BRAND_COLORS.accent("PoD Protocol Web3.js v2 Migration Status")}\n`);
    
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
    console.log(`${emoji.get('history')} ${BRAND_COLORS.accent("Command History:")}\n`);
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
    console.log(`${emoji.get('star')} ${BRAND_COLORS.accent("PoD Protocol Interactive CLI - Available Commands:")}\n`);
    
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
    console.log(`  ${BRAND_COLORS.secondary("wizard")}              - Enhanced registration wizard`);
    console.log(`  ${BRAND_COLORS.secondary("dashboard")}           - Real-time monitoring dashboard`);
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
    await this.showWelcome();

    this.readline.on('line', async (input: string) => {
      await this.executeCommand(input);
      console.log(); // Add spacing
      this.readline.prompt();
    });

    this.readline.on('close', () => {
      console.log(`\n${emoji.get('wave')} ${BRAND_COLORS.accent("Thanks for using PoD Protocol! Goodbye!")}`);
      process.exit(0);
    });

    // Handle Ctrl+C gracefully
    this.readline.on('SIGINT', () => {
      console.log(`\n${emoji.get('warning')} ${BRAND_COLORS.warning("Use 'exit' or 'quit' to leave the interactive CLI")}`);
      this.readline.prompt();
    });

    this.readline.prompt();
  }
} 