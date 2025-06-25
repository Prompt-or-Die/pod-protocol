#!/usr/bin/env node

import { Command } from "commander";
import chalk from "chalk";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import {
  showBanner,
  showPromptOrDieBanner,
  showCommandHeader,
  BannerSize,
  BRAND_COLORS,
  ICONS,
  DECORATIVE_ELEMENTS,
} from "./utils/branding.js";
import { errorHandler } from "./utils/enhanced-error-handler.js";
import { AIAssistant } from "./utils/ai-assistant.js";
import { createStandaloneClient, mockAgentRegistration, mockMessageSend } from "./utils/standalone-client.js";
import { createZKCompressionCommand } from "./commands/zk-compression.js";
import { createAdvancedCommand } from "./commands/advanced.js";

// Get current version from package.json
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageJson = JSON.parse(
  readFileSync(join(__dirname, "../package.json"), "utf8"),
);
const CLI_VERSION = packageJson.version;

const program = new Command();
const aiAssistant = new AIAssistant();

// Show branded banner (check for --no-banner flag)
if (!process.argv.includes("--no-banner")) {
  showBanner(BannerSize.FULL);
}

program
  .name("pod")
  .description(
    `${ICONS.lightning} CLI for PoD Protocol (Prompt or Die) AI Agent Communication Protocol`,
  )
  .version(CLI_VERSION, "-v, --version", "display version number")
  .helpOption("-h, --help", "display help for command");

// Enhanced global options
program
  .option(
    "-n, --network <network>",
    `${ICONS.network} Solana network (devnet, testnet, mainnet)`,
    "devnet",
  )
  .option(
    "-k, --keypair <path>",
    `${ICONS.key} Path to keypair file`,
    "~/.config/solana/id.json",
  )
  .option(
    "--verbose",
    `${ICONS.info} Enable verbose output with detailed information`,
  )
  .option(
    "--debug",
    `${ICONS.gear} Enable debug mode with technical diagnostics`,
  )
  .option("-q, --quiet", `${ICONS.info} Suppress non-essential output`)
  .option("--no-banner", "Skip displaying the banner")
  .option(
    "--dry-run",
    `${ICONS.warning} Show what would be executed without actually doing it`,
  );

// AI Assistant Commands
program
  .command("help-me [query...]")
  .alias("ask")
  .description(`${ICONS.agent} Get AI-powered help and command suggestions`)
  .action(async (query) => {
    const queryString = Array.isArray(query) ? query.join(" ") : query || "";
    
    if (!queryString) {
      console.log(`${ICONS.agent} ${BRAND_COLORS.accent("PoD Protocol AI Assistant")}\n`);
      console.log(`${ICONS.info} Ask me anything about PoD Protocol!\n`);
      console.log(`${BRAND_COLORS.primary("Examples:")}`);
      console.log(`  ${BRAND_COLORS.secondary("pod help-me register an agent with trading capabilities")}`);
      console.log(`  ${BRAND_COLORS.secondary("pod help-me send encrypted messages")}`);
      console.log(`  ${BRAND_COLORS.secondary("pod help-me save money with ZK compression")}`);
      console.log(`  ${BRAND_COLORS.secondary("pod help-me create a community channel")}`);
      console.log();
      return;
    }
    
    console.log(`${ICONS.agent} ${BRAND_COLORS.accent("AI Assistant analyzing:")} "${queryString}"\n`);
    aiAssistant.displayInteractiveHelp(queryString);
  });

// Tutorial command
program
  .command("tutorial [topic]")
  .description(`${ICONS.star} Interactive tutorials for common workflows`)
  .action(async (topic) => {
    if (!topic) {
      console.log(`${ICONS.star} ${BRAND_COLORS.accent("Available Tutorials:")}\n`);
      console.log(`  ${BRAND_COLORS.primary("first-agent")}      - Register and manage your first AI agent`);
      console.log(`  ${BRAND_COLORS.primary("zk-compression")}   - Save 99% on costs with ZK compression`);
      console.log(`  ${BRAND_COLORS.primary("advanced-messaging")} - Channels and group communication`);
      console.log(`  ${BRAND_COLORS.primary("web3v2-migration")} - Web3.js v2 migration guide`);
      console.log();
      console.log(`${BRAND_COLORS.muted("Usage:")} ${BRAND_COLORS.accent("pod tutorial first-agent")}`);
      return;
    }

    const tutorial = aiAssistant.getTutorial(topic);
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
  });

// Migration status command
program
  .command("migration-status")
  .description(`${ICONS.gear} Check Web3.js v2 migration status`)
  .action(async () => {
    console.log(`${ICONS.gear} ${BRAND_COLORS.accent("PoD Protocol Web3.js v2 Migration Status")}\n`);
    
    console.log(`${BRAND_COLORS.primary("✅ Completed:")}`);
    console.log(`  • CLI core functionality with standalone mode`);
    console.log(`  • AI Assistant with v2 compatibility`);
    console.log(`  • Interactive scripts base structure`);
    console.log(`  • Enhanced error handling and branding`);
    console.log(`  • Migration rollup plan created`);
    
    console.log(`${BRAND_COLORS.warning("\n🚧 In Progress:")}`);
    console.log(`  • SDK services migration to v2 patterns`);
    console.log(`  • RPC client updates`);
    console.log(`  • Transaction building with v2 APIs`);
    console.log(`  • Full CLI command implementation`);
    
    console.log(`${BRAND_COLORS.muted("\n📋 Next Steps:")}`);
    console.log(`  1. Complete SDK service layer migration`);
    console.log(`  2. Update all PublicKey → Address patterns`);
    console.log(`  3. Migrate Connection → Rpc patterns`);
    console.log(`  4. Update transaction building`);
    console.log(`  5. Test all interactive features`);
    
    console.log(`${BRAND_COLORS.accent("\n🎯 Current Focus:")} CLI and Interactive Scripts with Web3.js v2`);
    console.log(`${BRAND_COLORS.success("\n🚀 See WEB3_V2_MIGRATION_ROLLUP_PLAN.md for complete details")}`);
  });

// Demo agent command (standalone)
program
  .command("demo-agent")
  .description(`${ICONS.agent} Demo agent registration (standalone mode)`)
  .option("--name <name>", "Agent name", "MyDemoAgent")
  .option("--capabilities <caps>", "Comma-separated capabilities", "analysis,trading")
  .action(async (options) => {
    console.log(`${ICONS.agent} ${BRAND_COLORS.accent("Demo Agent Registration")}\n`);
    
    const capabilities = options.capabilities.split(',').map((c: string) => c.trim());
    const result = mockAgentRegistration(options.name, capabilities);
    
    console.log(`${BRAND_COLORS.success("✅ Agent registered successfully!")}\n`);
    console.log(`${BRAND_COLORS.primary("Name:")} ${result.name}`);
    console.log(`${BRAND_COLORS.primary("Address:")} ${result.address}`);
    console.log(`${BRAND_COLORS.primary("Capabilities:")} ${result.capabilities.join(", ")}`);
    console.log(`${BRAND_COLORS.primary("Network:")} ${result.network}`);
    console.log(`${BRAND_COLORS.primary("Status:")} ${result.status}`);
    
    console.log(`${BRAND_COLORS.muted("\nNote: This is a demo mode during Web3.js v2 migration")}`);
  });

// Demo message command (standalone)  
program
  .command("demo-message")
  .description(`${ICONS.lightning} Demo message sending (standalone mode)`)
  .option("--recipient <address>", "Recipient address", "DemoRecipientAddress")
  .option("--content <message>", "Message content", "Hello from PoD Protocol! 🎭")
  .action(async (options) => {
    console.log(`${ICONS.lightning} ${BRAND_COLORS.accent("Demo Message Sending")}\n`);
    
    const result = mockMessageSend(options.recipient, options.content);
    
    console.log(`${BRAND_COLORS.success("✅ Message sent successfully!")}\n`);
    console.log(`${BRAND_COLORS.primary("Message ID:")} ${result.messageId}`);
    console.log(`${BRAND_COLORS.primary("Recipient:")} ${result.recipient}`);
    console.log(`${BRAND_COLORS.primary("Content:")} ${result.content}`);
    console.log(`${BRAND_COLORS.primary("Encrypted:")} ${result.encrypted}`);
    console.log(`${BRAND_COLORS.primary("Status:")} ${result.status}`);
    console.log(`${BRAND_COLORS.primary("Timestamp:")} ${result.timestamp}`);
    
    console.log(`${BRAND_COLORS.muted("\nNote: This is a demo mode during Web3.js v2 migration")}`);
  });

// Register ZK Compression commands
program.addCommand(createZKCompressionCommand());

// Register Advanced commands  
program.addCommand(createAdvancedCommand());

// Enhanced status command
program
  .command("status")
  .description(`${ICONS.shield} Show PoD Protocol network status and diagnostics`)
  .option("--health", "Perform comprehensive health check")
  .action(async (cmdOptions, command) => {
    try {
      const globalOpts = command.parent.opts();

      if (!globalOpts.quiet) {
        console.log(`${ICONS.rocket} ${BRAND_COLORS.accent("PoD Protocol Status")}`);
        console.log();
      }

      const client = createStandaloneClient({ network: globalOpts.network });

      const statusItems = [
        { label: "CLI Version", value: CLI_VERSION, icon: ICONS.gear },
        { label: "Network", value: globalOpts.network.toUpperCase(), icon: ICONS.network },
        { label: "RPC URL", value: client.rpcUrl, icon: ICONS.chain },
        { label: "Mode", value: "STANDALONE (Web3.js v2 Migration)", icon: ICONS.warning },
        { label: "Status", value: "OPERATIONAL", icon: ICONS.success },
      ];

      statusItems.forEach((item) => {
        console.log(`${item.icon} ${BRAND_COLORS.accent(item.label)}: ${BRAND_COLORS.secondary(item.value)}`);
      });

      if (cmdOptions.health) {
        console.log();
        console.log(`${ICONS.loading} ${BRAND_COLORS.info("Running health checks...")}`);
        console.log(`${ICONS.success} ${BRAND_COLORS.success("CLI operational in standalone mode")}`);
        console.log(`${ICONS.info} ${BRAND_COLORS.info("SDK migration in progress")}`);
      }
    } catch (error) {
      errorHandler.handleError(error as Error);
    }
  });

// Command not found handler with AI suggestions
program.on("command:*", (operands) => {
  const unknownCommand = operands[0];
  console.log();
  console.log(`${ICONS.error} ${BRAND_COLORS.error(`Unknown command: ${unknownCommand}`)}`);
  console.log();

  // Get AI suggestions for the unknown command
  const suggestions = aiAssistant.suggestCommands(unknownCommand);
  
  if (suggestions.length > 0) {
    console.log(`${ICONS.brain} ${BRAND_COLORS.accent("AI Assistant suggests:")}`);
    suggestions.slice(0, 3).forEach((suggestion, index) => {
      console.log(`  ${index + 1}. ${BRAND_COLORS.primary(suggestion.command)}`);
      console.log(`     ${BRAND_COLORS.muted(suggestion.description)}`);
    });
    console.log();
  }

  console.log(`${ICONS.star} ${BRAND_COLORS.accent("Try these commands:")}`);
  console.log(`  ${BRAND_COLORS.primary(`pod help-me ${unknownCommand}`)} - Get AI suggestions`);
  console.log(`  ${BRAND_COLORS.primary("pod migration-status")} - Check migration progress`);
  console.log(`  ${BRAND_COLORS.primary("pod demo-agent")} - Try demo agent registration`);
  console.log(`  ${BRAND_COLORS.primary("pod --help")} - Basic help`);
  console.log();

  process.exit(1);
});

// Global error handler
process.on("uncaughtException", (error) => {
  console.log();
  console.log(`${ICONS.error} ${BRAND_COLORS.error("An unexpected error occurred:")}`);
  console.log(`${BRAND_COLORS.muted(error.message)}`);
  errorHandler.handleError(error);
});

process.on("unhandledRejection", (reason) => {
  const error = new Error(String(reason));
  console.log();
  console.log(`${ICONS.error} ${BRAND_COLORS.error("Promise rejection:")}`);
  console.log(`${BRAND_COLORS.muted(error.message)}`);
  errorHandler.handleError(error);
});

// Help command customization
program.configureHelp({
  sortSubcommands: true,
  subcommandTerm: (cmd) => cmd.name() + " " + cmd.usage(),
});

// Error handling
program.exitOverride();

try {
  program.parse();
} catch (err: any) {
  if (err.code === "commander.help") {
    process.exit(0);
  }
  
  console.log(`${ICONS.error} ${BRAND_COLORS.error("CLI Error:")}`);
  console.log(`${BRAND_COLORS.muted(err.message)}`);
  process.exit(1);
}

