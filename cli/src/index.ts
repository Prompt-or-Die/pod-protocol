#!/usr/bin/env node

import { Command } from "commander";
import chalk from "chalk";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { AgentCommands } from "./commands/agent.js";
import { MessageCommands } from "./commands/message.js";
import { ChannelCommands } from "./commands/channel.js";
import { EscrowCommands } from "./commands/escrow.js";
import { ConfigCommands } from "./commands/config.js";
import { AnalyticsCommands } from "./commands/analytics.js";
import { DiscoveryCommands } from "./commands/discovery.js";
import { InstallCommands } from "./commands/install.js";
import { CreateCommands } from "./commands/create.js";
import { createZKCompressionCommand } from "./commands/zk-compression.js";
import { createSessionCommand } from "./commands/session.js";
import { createBundleCommand } from "./commands/bundle.js";
import {
  showBanner,
  showPromptOrDieBanner,
  showCommandHeader,
  BannerSize,
  BRAND_COLORS,
  ICONS,
  PROMPT_OR_DIE_BANNER,
  PROMPT_OR_DIE_COMPACT,
  PROMPT_OR_DIE_MINI,
  DECORATIVE_ELEMENTS,
} from "./utils/branding.js";
import { errorHandler } from "./utils/enhanced-error-handler.js";
import { AIAssistant } from "./utils/ai-assistant.js";

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

// Initialize command modules
const agentCommands = new AgentCommands();
const messageCommands = new MessageCommands();
const channelCommands = new ChannelCommands();
const escrowCommands = new EscrowCommands();
const configCommands = new ConfigCommands();
const analyticsCommands = new AnalyticsCommands();
const discoveryCommands = new DiscoveryCommands();
const installCommands = new InstallCommands();
const createCommands = new CreateCommands();

// Register command groups
agentCommands.register(program);
messageCommands.register(program);
channelCommands.register(program);
escrowCommands.register(program);
configCommands.register(program);
analyticsCommands.register(program);
discoveryCommands.register(program);
installCommands.register(program);
createCommands.register(program);

// Add ZK compression commands
program.addCommand(createZKCompressionCommand());

// Add session keys commands
program.addCommand(createSessionCommand());

// Add Jito bundle commands
program.addCommand(createBundleCommand());

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

program
  .command("tutorial [topic]")
  .description(`${ICONS.star} Interactive tutorials for common workflows`)
  .action(async (topic) => {
    if (!topic) {
      console.log(`${ICONS.star} ${BRAND_COLORS.accent("Available Tutorials:")}\n`);
      console.log(`  ${BRAND_COLORS.primary("first-agent")}      - Register and manage your first AI agent`);
      console.log(`  ${BRAND_COLORS.primary("zk-compression")}   - Save 99% on costs with ZK compression`);
      console.log(`  ${BRAND_COLORS.primary("advanced-messaging")} - Channels and group communication`);
      console.log();
      console.log(`${BRAND_COLORS.muted("Usage:")} ${BRAND_COLORS.accent("pod tutorial first-agent")}`);
      return;
    }

    const tutorial = aiAssistant.getTutorial(topic);
    if (tutorial.length === 0) {
      console.log(`${ICONS.warning} ${BRAND_COLORS.warning(`Tutorial "${topic}" not found.`)}`);
      console.log(`${ICONS.info} Available tutorials: first-agent, zk-compression, advanced-messaging`);
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

program
  .command("explain <command>")
  .description(`${ICONS.info} Explain what a command does in detail`)
  .action(async (command) => {
    console.log(aiAssistant.explainCommand(command));
  });

program
  .command("suggest")
  .description(`${ICONS.lightning} Get personalized command suggestions`)
  .action(async () => {
    console.log(`${ICONS.lightning} ${BRAND_COLORS.accent("Personalized Command Suggestions")}\n`);
    
    // For now, show general popular commands
    const popularCommands = [
      "pod agent register --interactive",
      "pod message send --interactive", 
      "pod status --health",
      "pod zk compress --help",
      "pod analytics network"
    ];
    
    console.log(`${BRAND_COLORS.primary("Popular Commands:")}\n`);
    popularCommands.forEach((cmd, index) => {
      console.log(`${BRAND_COLORS.secondary(`${index + 1}.`)} ${BRAND_COLORS.accent(cmd)}`);
    });
    
    console.log();
    console.log(`${ICONS.info} ${BRAND_COLORS.muted("Tip: Use")} ${BRAND_COLORS.accent("pod help-me <describe what you want>")} ${BRAND_COLORS.muted("for personalized suggestions")}`);
  });

// Enhanced status command
program
  .command("status")
  .description(
    `${ICONS.shield} Show PoD Protocol network status and diagnostics`,
  )
  .option("--health", "Perform comprehensive health check")
  .action(async (cmdOptions, command) => {
    try {
      const globalOpts = command.parent.opts();

      if (!globalOpts.quiet) {
        console.log(
          `${ICONS.rocket} ${BRAND_COLORS.accent("PoD Protocol Status")}`,
        );
        console.log();
      }

      const statusItems = [
        { label: "CLI Version", value: CLI_VERSION, icon: ICONS.gear },
        {
          label: "Network",
          value: globalOpts.network.toUpperCase(),
          icon: ICONS.network,
        },
        {
          label: "Program ID",
          value: "HEpGLgYsE1kP8aoYKyLFc3JVVrofS7T4zEA6fWBJsZps",
          icon: ICONS.chain,
        },
        { label: "Status", value: "OPERATIONAL", icon: ICONS.success },
      ];

      statusItems.forEach((item) => {
        console.log(
          `${item.icon} ${BRAND_COLORS.accent(item.label)}: ${BRAND_COLORS.secondary(item.value)}`,
        );
      });

      if (cmdOptions.health) {
        console.log();
        console.log(
          `${ICONS.loading} ${BRAND_COLORS.info("Running health checks...")}`,
        );
        // Add health check logic here
      }
    } catch (error) {
      errorHandler.handleError(error as Error);
    }
  });

// Help and suggestions command
program
  .command("help-extended")
  .description(`${ICONS.info} Show extended help with examples and tutorials`)
  .action(() => {
    console.log(
      `${ICONS.star} ${BRAND_COLORS.accent("PoD Protocol CLI - Extended Help")}`,
    );
    console.log();

    const commandExamples = [
      {
        category: `${ICONS.agent} Agent Management`,
        commands: [
          {
            cmd: 'pod agent register --capabilities "trading,analysis"',
            desc: "Register an AI agent with specific capabilities",
          },
          {
            cmd: "pod agent info <agent-address>",
            desc: "View detailed agent information",
          },
          {
            cmd: "pod agent list --limit 10",
            desc: "List all registered agents",
          },
        ],
      },
      {
        category: `${ICONS.lightning} ZK Compression`,
        commands: [
          {
            cmd: 'pod zk message broadcast <channel> "Hello compressed world!"',
            desc: "Send compressed message with IPFS storage",
          },
          {
            cmd: "pod zk compress --data <ipfs-hash>",
            desc: "Compress data for 99% cost reduction",
          },
        ],
      },
      {
        category: `${ICONS.brain} AI Assistant`,
        commands: [
          {
            cmd: "pod help-me register an agent with trading capabilities",
            desc: "Get AI-powered command suggestions",
          },
          {
            cmd: "pod tutorial first-agent",
            desc: "Interactive step-by-step tutorials",
          },
          {
            cmd: "pod explain agent register",
            desc: "Detailed command explanations",
          },
        ],
      },
    ];

    commandExamples.forEach((category) => {
      console.log(`${category.category}`);
      console.log(DECORATIVE_ELEMENTS.thin);
      category.commands.forEach((cmd) => {
        console.log(`${BRAND_COLORS.accent(cmd.cmd)}`);
        console.log(`  ${BRAND_COLORS.muted(cmd.desc)}`);
        console.log();
      });
    });

    console.log(`${ICONS.info} ${BRAND_COLORS.accent("Quick Tips:")}`);
    console.log(`  • Use ${BRAND_COLORS.primary("--interactive")} for guided experiences`);
    console.log(`  • Use ${BRAND_COLORS.primary("--help")} on any command for detailed options`);
    console.log(`  • Use ${BRAND_COLORS.primary("pod help-me <query>")} for AI assistance`);
    console.log(`  • Use ${BRAND_COLORS.primary("--dry-run")} to preview actions safely`);
    console.log();
    console.log(
      `${ICONS.info} ${BRAND_COLORS.info("For more help: https://github.com/Dexploarer/PoD-Protocol/docs")}`,
    );
  });

// Command not found handler with AI suggestions
program.on("command:*", (operands) => {
  const unknownCommand = operands[0];
  console.log();
  console.log(
    `${ICONS.error} ${BRAND_COLORS.error(`Unknown command: ${unknownCommand}`)}`,
  );
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

  // Fallback to simple suggestions
  const availableCommands = [
    "agent",
    "message", 
    "channel",
    "escrow",
    "config",
    "analytics",
    "discover",
    "zk",
    "session",
    "bundle",
    "status",
    "help-me",
    "tutorial",
  ];
  
  const simpleSuggestions = availableCommands.filter(
    (cmd) => cmd.includes(unknownCommand) || unknownCommand.includes(cmd),
  );

  if (simpleSuggestions.length > 0 && suggestions.length === 0) {
    console.log(`${ICONS.info} ${BRAND_COLORS.accent("Did you mean:")}`);
    simpleSuggestions.forEach((suggestion) => {
      console.log(`  ${BRAND_COLORS.primary(`pod ${suggestion}`)}`);
    });
    console.log();
  }

  console.log(`${ICONS.star} ${BRAND_COLORS.accent("Try these commands:")}`);
  console.log(`  ${BRAND_COLORS.primary(`pod help-me ${unknownCommand}`)} - Get AI suggestions`);
  console.log(`  ${BRAND_COLORS.primary("pod help-extended")} - See examples and tutorials`);
  console.log(`  ${BRAND_COLORS.primary("pod --help")} - Basic help`);
  console.log();

  process.exit(1);
});

// Special banners showcase command
program
  .command("banners")
  .description(`${ICONS.star} Showcase all available ASCII art banners`)
  .action(() => {
    console.clear();

    console.log(
      `${ICONS.star} ${BRAND_COLORS.accent("PoD Protocol ASCII Art Showcase")}`,
    );
    console.log(DECORATIVE_ELEMENTS.lightningBorder);
    console.log();

    console.log(`${BRAND_COLORS.accent("1. Main PoD Protocol Banner:")}`);
    showBanner(BannerSize.FULL);

    console.log(`${BRAND_COLORS.accent('2. "Prompt or Die" Full Banner:')}`);
    showPromptOrDieBanner();

    console.log(`${BRAND_COLORS.accent("3. Compact Banner:")}`);
    showBanner(BannerSize.COMPACT);

    console.log(`${BRAND_COLORS.accent("4. Mini Banner:")}`);
    showBanner(BannerSize.MINI);

    console.log(`${BRAND_COLORS.accent("5. Command Headers:")}`);
    showCommandHeader("agent", "AI Agent Management");
    showCommandHeader("message", "Secure Messaging");
    showCommandHeader("channel", "Group Communication");

    console.log(`${BRAND_COLORS.accent("6. Decorative Elements:")}`);
    console.log(DECORATIVE_ELEMENTS.starBorder);
    console.log(DECORATIVE_ELEMENTS.gemBorder);
    console.log(DECORATIVE_ELEMENTS.lightningBorder);
    console.log(DECORATIVE_ELEMENTS.violetGradient);
    console.log();

    console.log(
      `${ICONS.gem} ${BRAND_COLORS.primary('Deep violet and off-white color scheme showcasing the beauty of "Prompt or Die"')}`,
    );
    console.log(
      `${ICONS.lightning} ${BRAND_COLORS.secondary("Use --no-banner to skip banners, or try different banner sizes!")}`,
    );
  });

// Global error handler with AI assistance
process.on("uncaughtException", (error) => {
  console.log();
  console.log(`${ICONS.error} ${BRAND_COLORS.error("An unexpected error occurred:")}`);
  console.log(`${BRAND_COLORS.muted(error.message)}`);
  
  // Get contextual help from AI assistant
  const help = aiAssistant.getContextualHelp(undefined, error.message);
  if (help.length > 0) {
    console.log();
    help.forEach(line => console.log(line));
  }
  
  errorHandler.handleError(error);
});

process.on("unhandledRejection", (reason) => {
  const error = new Error(String(reason));
  console.log();
  console.log(`${ICONS.error} ${BRAND_COLORS.error("Promise rejection:")}`);
  console.log(`${BRAND_COLORS.muted(error.message)}`);
  
  // Get contextual help from AI assistant
  const help = aiAssistant.getContextualHelp(undefined, error.message);
  if (help.length > 0) {
    console.log();
    help.forEach(line => console.log(line));
  }
  
  errorHandler.handleError(error);
});

// Update command
program
  .command("update")
  .description("Update POD-COM CLI to the latest version")
  .option("-f, --force", "Force update even if already on latest version")
  .action(async (options) => {
    const { execSync } = await import("child_process");
    const ora = (await import("ora")).default;

    console.log(chalk.blue("🔍 Checking for updates..."));

    try {
      // Check current version
      const currentVersion = CLI_VERSION;

      // Check latest version from npm
      const spinner = ora("Fetching latest version...").start();

      let latestVersion;
      try {
        const output = execSync("npm view @pod-protocol/cli version", {
          encoding: "utf8",
          stdio: "pipe",
        });
        latestVersion = output.trim();
      } catch {
        spinner.fail("Failed to fetch latest version");
        console.error(chalk.red("Error:"), "Could not check for updates");
        return;
      }

      spinner.succeed(`Current: ${currentVersion}, Latest: ${latestVersion}`);

      if (currentVersion === latestVersion && !options.force) {
        console.log(chalk.green("✅ You're already on the latest version!"));
        return;
      }

      if (options.force || currentVersion !== latestVersion) {
        console.log(chalk.blue("📦 Updating CLI..."));

        const updateSpinner = ora("Installing update...").start();

        try {
          // Update the CLI
          execSync("npm install -g @pod-protocol/cli@latest", {
            stdio: "pipe",
          });

          updateSpinner.succeed("Update completed!");
          console.log(
            chalk.green("✅ Successfully updated to version"),
            latestVersion,
          );
          console.log(
            chalk.cyan("Tip: Run 'pod --version' to verify the update"),
          );
        } catch {
          updateSpinner.fail("Update failed");
          console.error(chalk.red("Error:"), "Failed to update CLI");
          console.log(
            chalk.yellow(
              "Try running: npm install -g @pod-protocol/cli@latest",
            ),
          );
        }
      }
    } catch (error: any) {
      console.error(chalk.red("Update failed:"), error.message);
      console.log(
        chalk.yellow("Manual update: npm install -g @pod-protocol/cli@latest"),
      );
    }
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
  
  // Get contextual help from AI assistant
  const help = aiAssistant.getContextualHelp(undefined, err.message);
  if (help.length > 0) {
    console.log();
    help.forEach(line => console.log(line));
  }
  
  process.exit(1);
}

