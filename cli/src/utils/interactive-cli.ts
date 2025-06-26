import { createInterface } from 'readline';
import {
  showBanner,
  BannerSize,
  BRAND_COLORS,
  ICONS,
  DECORATIVE_ELEMENTS,
} from './branding.js';
import { AIAssistant } from './ai-assistant.js';

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
      const trimmedInput = input.trim();
      
      if (!trimmedInput) {
        this.readline.prompt();
        return;
      }

      // Add to history
      this.commandHistory.push(trimmedInput);

      // Handle commands
      if (trimmedInput === 'exit' || trimmedInput === 'quit') {
        console.log(`${ICONS.wave} ${BRAND_COLORS.accent("Thanks for using PoD Protocol! Goodbye!")}`);
        process.exit(0);
      }

      if (trimmedInput === 'clear') {
        this.showWelcome();
        this.readline.prompt();
        return;
      }

      if (trimmedInput === 'help') {
        this.showInteractiveHelp();
        this.readline.prompt();
        return;
      }

      if (trimmedInput === 'history') {
        console.log(`${ICONS.history} ${BRAND_COLORS.accent("Command History:")}\n`);
        this.commandHistory.forEach((cmd, index) => {
          console.log(`${BRAND_COLORS.primary(`${index + 1}.`)} ${cmd}`);
        });
        console.log();
        this.readline.prompt();
        return;
      }

      // For now, show available commands for any other input
      console.log(`${ICONS.brain} ${BRAND_COLORS.warning(`Command: ${trimmedInput}`)}`);
      console.log(`${ICONS.info} ${BRAND_COLORS.secondary("Interactive CLI is starting up! Try 'help' for available commands")}`);
      console.log();
      
      this.readline.prompt();
    });

    this.readline.on('close', () => {
      console.log(`\n${ICONS.wave} ${BRAND_COLORS.accent("Thanks for using PoD Protocol! Goodbye!")}`);
      process.exit(0);
    });

    this.readline.on('SIGINT', () => {
      console.log(`\n${ICONS.warning} ${BRAND_COLORS.warning("Use 'exit' or 'quit' to leave the interactive CLI")}`);
      this.readline.prompt();
    });

    this.readline.prompt();
  }
}
