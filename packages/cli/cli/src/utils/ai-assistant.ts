import { BRAND_COLORS, ICONS } from "./branding.js";

interface CommandSuggestion {
  command: string;
  description: string;
  confidence: number;
  category: string;
}

interface TutorialStep {
  title: string;
  description: string;
  command?: string;
  example?: string;
}

export class AIAssistant {
  private commandDatabase: Map<string, any>;
  private userContext: any;

  constructor() {
    this.commandDatabase = new Map();
    this.userContext = {};
    this.initializeCommands();
  }

  private initializeCommands() {
    // Build a searchable database of all commands and their purposes
    const commands = [
      {
        name: "agent register",
        keywords: ["create", "new", "register", "agent", "ai", "bot"],
        description: "Register a new AI agent on PoD Protocol",
        category: "Agent Management",
        examples: [
          "pod agent register --interactive",
          "pod agent register --capabilities analysis,trading"
        ],
        relatedCommands: ["agent info", "agent update", "agent list"]
      },
      {
        name: "agent info",
        keywords: ["show", "details", "info", "agent", "view", "display"],
        description: "View detailed information about an agent",
        category: "Agent Management",
        examples: ["pod agent info <address>"],
        relatedCommands: ["agent register", "agent update"]
      },
      {
        name: "message send",
        keywords: ["send", "message", "msg", "communicate", "chat", "talk"],
        description: "Send encrypted messages between agents",
        category: "Communication",
        examples: [
          "pod message send --interactive",
          "pod message send --recipient <address> --content 'Hello!'"
        ],
        relatedCommands: ["message list", "channel create"]
      },
      {
        name: "channel create",
        keywords: ["channel", "group", "room", "create", "community"],
        description: "Create communication channels for multiple agents",
        category: "Communication",
        examples: ["pod channel create --name 'AI Traders' --public"],
        relatedCommands: ["channel join", "channel list", "message send"]
      },
      {
        name: "zk compress",
        keywords: ["compress", "zk", "zero", "knowledge", "save", "cost", "cheap"],
        description: "Use ZK compression to reduce transaction costs by 99%",
        category: "Cost Optimization",
        examples: ["pod zk compress --data <ipfs-hash>"],
        relatedCommands: ["zk decompress", "analytics costs"]
      },
      {
        name: "escrow create",
        keywords: ["escrow", "payment", "secure", "money", "sol", "trust"],
        description: "Create secure escrow for agent transactions",
        category: "Payments",
        examples: ["pod escrow create --amount 1.5 --recipient <address>"],
        relatedCommands: ["escrow release", "escrow dispute"]
      },
      {
        name: "analytics network",
        keywords: ["analytics", "stats", "data", "network", "insights", "metrics"],
        description: "View network analytics and agent performance metrics",
        category: "Analytics",
        examples: ["pod analytics network --timeframe 7d"],
        relatedCommands: ["analytics agents", "discovery trending"]
      }
    ];

    commands.forEach(cmd => {
      this.commandDatabase.set(cmd.name, cmd);
    });
  }

  /**
   * Parse natural language input and suggest relevant commands
   */
  public suggestCommands(input: string): CommandSuggestion[] {
    const normalizedInput = input.toLowerCase();
    const suggestions: CommandSuggestion[] = [];

    this.commandDatabase.forEach((cmd, name) => {
      let confidence = 0;

      // Check for exact keyword matches
      cmd.keywords.forEach((keyword: string) => {
        if (normalizedInput.includes(keyword)) {
          confidence += 0.3;
        }
      });

      // Check for semantic similarity (simplified)
      if (this.hasSemanticMatch(normalizedInput, cmd.description.toLowerCase())) {
        confidence += 0.2;
      }

      // Boost confidence for popular commands
      if (["agent register", "message send"].includes(name)) {
        confidence += 0.1;
      }

      if (confidence > 0.2) {
        suggestions.push({
          command: `pod ${name}`,
          description: cmd.description,
          confidence,
          category: cmd.category
        });
      }
    });

    return suggestions
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 5);
  }

  private hasSemanticMatch(input: string, description: string): boolean {
    const inputWords = input.split(/\s+/);
    const descWords = description.split(/\s+/);
    
    let matches = 0;
    inputWords.forEach(word => {
      if (descWords.some(descWord => descWord.includes(word) || word.includes(descWord))) {
        matches++;
      }
    });
    
    return matches >= 2;
  }

  /**
   * Provide contextual help based on user's current situation
   */
  public getContextualHelp(command?: string, error?: string): string[] {
    const help: string[] = [];

    if (error) {
      if (error.includes("wallet") || error.includes("keypair")) {
        help.push(`${ICONS.key} ${BRAND_COLORS.warning("Wallet Issue Detected:")}`);
        help.push(`  • Check your keypair path: ${BRAND_COLORS.accent("pod config init")}`);
        help.push(`  • Verify wallet has SOL: ${BRAND_COLORS.accent("solana balance")}`);
        help.push(`  • Switch networks: ${BRAND_COLORS.accent("pod --network devnet")}`);
      }

      if (error.includes("network") || error.includes("rpc")) {
        help.push(`${ICONS.network} ${BRAND_COLORS.warning("Network Issue Detected:")}`);
        help.push(`  • Check network status: ${BRAND_COLORS.accent("pod status --health")}`);
        help.push(`  • Try different RPC: ${BRAND_COLORS.accent("pod config set-rpc")}`);
        help.push(`  • Switch to devnet: ${BRAND_COLORS.accent("pod --network devnet")}`);
      }

      if (error.includes("insufficient")) {
        help.push(`${ICONS.warning} ${BRAND_COLORS.warning("Insufficient Funds:")}`);
        help.push(`  • Get devnet SOL: ${BRAND_COLORS.accent("solana airdrop 2")}`);
        help.push(`  • Use ZK compression: ${BRAND_COLORS.accent("pod zk --help")}`);
        help.push(`  • Check balance: ${BRAND_COLORS.accent("solana balance")}`);
      }
    }

    if (command) {
      const cmd = this.commandDatabase.get(command);
      if (cmd) {
        help.push(`${ICONS.info} ${BRAND_COLORS.accent("Related Commands:")}`);
        cmd.relatedCommands.forEach((relatedCmd: string) => {
          help.push(`  • ${BRAND_COLORS.primary(`pod ${relatedCmd}`)}`);
        });

        help.push(`${ICONS.star} ${BRAND_COLORS.accent("Examples:")}`);
        cmd.examples.forEach((example: string) => {
          help.push(`  • ${BRAND_COLORS.secondary(example)}`);
        });
      }
    }

    return help;
  }

  /**
   * Generate step-by-step tutorials for common workflows
   */
  public getTutorial(topic: string): TutorialStep[] {
    const tutorials: Record<string, TutorialStep[]> = {
      "first-agent": [
        {
          title: "🤖 Register Your First Agent",
          description: "Let's create your AI agent on PoD Protocol",
          command: "pod agent register --interactive",
          example: "This will guide you through selecting capabilities and metadata"
        },
        {
          title: "📋 View Your Agent",
          description: "Check your agent's details and address",
          command: "pod agent info <your-agent-address>",
          example: "You'll see capabilities, reputation, and metadata"
        },
        {
          title: "💬 Send Your First Message",
          description: "Test communication with another agent",
          command: "pod message send --interactive",
          example: "Send encrypted messages to other agents"
        }
      ],
      "zk-compression": [
        {
          title: "💰 Understanding ZK Compression",
          description: "Learn how to save 99% on transaction costs",
          command: "pod zk --help",
          example: "See all ZK compression options available"
        },
        {
          title: "🗜️ Compress Your Data",
          description: "Compress messages or metadata using ZK proofs",
          command: "pod zk compress --data 'Your message here'",
          example: "Creates IPFS hash with ZK proof for verification"
        },
        {
          title: "📊 Compare Costs",
          description: "See the dramatic cost savings",
          command: "pod analytics costs --with-zk",
          example: "Traditional: 0.005 SOL → ZK: 0.00005 SOL"
        }
      ],
      "advanced-messaging": [
        {
          title: "🏛️ Create a Channel",
          description: "Set up group communication",
          command: "pod channel create --name 'AI Traders' --description 'Trading strategies'",
          example: "Creates a public or private channel for multiple agents"
        },
        {
          title: "👥 Invite Agents",
          description: "Add agents to your channel",
          command: "pod channel invite --channel <channel-id> --agent <agent-address>",
          example: "Agents can join and participate in group discussions"
        },
        {
          title: "📢 Broadcast Messages",
          description: "Send messages to all channel members",
          command: "pod message broadcast --channel <channel-id> --content 'Hello everyone!'",
          example: "All channel members receive the encrypted message"
        }
      ]
    };

    return tutorials[topic] || [];
  }

  /**
   * Provide smart completion suggestions for partial commands
   */
  public getCompletions(partialCommand: string): string[] {
    const completions: string[] = [];
    
    this.commandDatabase.forEach((cmd, name) => {
      if (name.startsWith(partialCommand) || name.includes(partialCommand)) {
        completions.push(`pod ${name}`);
      }
    });

    return completions.slice(0, 8);
  }

  /**
   * Explain what a command does in simple terms
   */
  public explainCommand(command: string): string {
    const cmd = this.commandDatabase.get(command.replace('pod ', ''));
    if (!cmd) {
      return `${ICONS.warning} Command not found. Try ${BRAND_COLORS.accent("pod help")} for available commands.`;
    }

    let explanation = `${ICONS.info} ${BRAND_COLORS.accent(cmd.description)}\n\n`;
    explanation += `${BRAND_COLORS.primary("Category:")} ${cmd.category}\n\n`;
    explanation += `${BRAND_COLORS.primary("Examples:")}\n`;
    cmd.examples.forEach((example: string) => {
      explanation += `  ${BRAND_COLORS.secondary(example)}\n`;
    });

    return explanation;
  }

  /**
   * Generate personalized quick start commands based on user goals
   */
  public getQuickStart(userGoals: string[]): string[] {
    const commands: string[] = [];

    if (userGoals.includes("agents") || userGoals.includes("register")) {
      commands.push("pod agent register --interactive");
    }
    
    if (userGoals.includes("messaging") || userGoals.includes("communicate")) {
      commands.push("pod message send --interactive");
    }
    
    if (userGoals.includes("channels") || userGoals.includes("groups")) {
      commands.push("pod channel create --interactive");
    }
    
    if (userGoals.includes("cost") || userGoals.includes("zk")) {
      commands.push("pod zk compress --help");
    }
    
    if (userGoals.includes("analytics") || userGoals.includes("data")) {
      commands.push("pod analytics network");
    }

    // Always include status check
    commands.push("pod status --health");

    return commands;
  }

  /**
   * Display help in a beautiful, interactive format
   */
  public displayInteractiveHelp(input?: string): void {
    if (input) {
      console.log(`${ICONS.brain} ${BRAND_COLORS.accent("AI Assistant Understanding:")} "${input}"\n`);
      
      const suggestions = this.suggestCommands(input);
      if (suggestions.length > 0) {
        console.log(`${ICONS.lightning} ${BRAND_COLORS.primary("Suggested Commands:")}\n`);
        suggestions.forEach((suggestion, index) => {
          const confidence = Math.round(suggestion.confidence * 100);
          console.log(`${BRAND_COLORS.secondary(`${index + 1}.`)} ${BRAND_COLORS.accent(suggestion.command)}`);
          console.log(`   ${suggestion.description}`);
          console.log(`   ${BRAND_COLORS.muted(`${suggestion.category} • ${confidence}% match`)}\n`);
        });
      } else {
        console.log(`${ICONS.warning} ${BRAND_COLORS.warning("No direct matches found.")}`);
        console.log(`${ICONS.info} Try: ${BRAND_COLORS.accent("pod help-extended")} for all commands\n`);
      }
    }

    console.log(`${ICONS.star} ${BRAND_COLORS.accent("AI Assistant Features:")}\n`);
    console.log(`  ${BRAND_COLORS.primary("pod help me <describe what you want>")}`);
    console.log(`  ${BRAND_COLORS.primary("pod tutorial <topic>")}`);
    console.log(`  ${BRAND_COLORS.primary("pod explain <command>")}`);
    console.log(`  ${BRAND_COLORS.primary("pod suggest")}`);
    console.log();
  }
} 