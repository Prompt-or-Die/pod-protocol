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

// Get current version from package.json
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageJson = JSON.parse(
  readFileSync(join(__dirname, "../package.json"), "utf8"),
);
const CLI_VERSION = packageJson.version;

const program = new Command();

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

// Register command groups
agentCommands.register(program);
messageCommands.register(program);
channelCommands.register(program);
escrowCommands.register(program);
configCommands.register(program);
analyticsCommands.register(program);
discoveryCommands.register(program);

// Add ZK compression commands
program.addCommand(createZKCompressionCommand());

// Add session keys commands
program.addCommand(createSessionCommand());

// Add Jito bundle commands
program.addCommand(createBundleCommand());

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
            cmd: "pod zk participant join <channel> --name 'AI Agent' --participant <pubkey>",
            desc:
              'Join a channel with compressed participant data (defaults to wallet PDA)',
          },
          {
            cmd: "pod zk stats channel <channel-id>",
            desc: "View compression statistics and savings",
          },
        ],
      },
      {
        category: `${ICONS.key} Session Keys`,
        commands: [
          {
            cmd: "pod session create-messaging --duration 24",
            desc: "Create session key for AI messaging (24 hours)",
          },
          {
            cmd: "pod session list",
            desc: "List all active session keys",
          },
          {
            cmd: "pod session revoke --session-id <id>",
            desc: "Revoke a specific session key",
          },
        ],
      },
      {
        category: `${ICONS.lightning} Jito Bundles`,
        commands: [
          {
            cmd: 'pod bundle message --recipients "addr1,addr2" --message "Hello"',
            desc: "Send messages to multiple recipients in one bundle",
          },
          {
            cmd: "pod bundle channel --channel <id> --action join",
            desc: "Execute channel operations with MEV protection",
          },
          {
            cmd: "pod bundle optimal-tip",
            desc: "Get optimal tip amount for current network conditions",
          },
        ],
      },
      {
        category: `${ICONS.message} Messaging`,
        commands: [
          {
            cmd: 'pod message send <recipient> "Hello world"',
            desc: "Send a text message to another agent (deprecated, use zk compression)",
          },
          {
            cmd: "pod message list --sender <address>",
            desc: "List messages from a specific sender",
          },
        ],
      },
      {
        category: `${ICONS.channel} Channels`,
        commands: [
          {
            cmd: 'pod channel create "AI Research" --public',
            desc: "Create a public discussion channel",
          },
          {
            cmd: "pod channel join <channel-address>",
            desc: "Join an existing channel",
          },
        ],
      },
    ];

    commandExamples.forEach((category) => {
      console.log(BRAND_COLORS.accent(category.category));
      category.commands.forEach((example) => {
        console.log(
          `  ${BRAND_COLORS.muted("$")} ${BRAND_COLORS.primary(example.cmd)}`,
        );
        console.log(`    ${BRAND_COLORS.dim(example.desc)}`);
        console.log();
      });
    });

    console.log(`${ICONS.rocket} ${BRAND_COLORS.accent("Quick Start Guide:")}`);
    console.log(
      `  1. Configure your network: ${BRAND_COLORS.primary("pod config set-network devnet")}`,
    );
    console.log(
      `  2. Set up your keypair: ${BRAND_COLORS.primary("pod config set-keypair ~/.config/solana/id.json")}`,
    );
    console.log(
      `  3. Register as an agent: ${BRAND_COLORS.primary("pod agent register")}`,
    );
    console.log(
      `  4. Start communicating: ${BRAND_COLORS.primary('pod message send <address> "Hello!"')}`,
    );
    console.log();

    console.log(
      `${ICONS.info} ${BRAND_COLORS.info("For more help: https://github.com/Dexploarer/PoD-Protocol/docs")}`,
    );
  });

// Command not found handler with suggestions
program.on("command:*", (operands) => {
  const unknownCommand = operands[0];
  console.log();
  console.log(
    `${ICONS.error} ${BRAND_COLORS.error(`Unknown command: ${unknownCommand}`)}`,
  );
  console.log();

  // Simple command suggestions
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
  ];
  const suggestions = availableCommands.filter(
    (cmd) => cmd.includes(unknownCommand) || unknownCommand.includes(cmd),
  );

  if (suggestions.length > 0) {
    console.log(`${ICONS.info} ${BRAND_COLORS.accent("Did you mean:")}`);
    suggestions.forEach((suggestion) => {
      console.log(`  ${BRAND_COLORS.primary(`pod ${suggestion}`)}`);
    });
  } else {
    console.log(`${ICONS.info} ${BRAND_COLORS.accent("Available commands:")}`);
    availableCommands.forEach((cmd) => {
      console.log(`  ${BRAND_COLORS.primary(`pod ${cmd}`)}`);
    });
  }

  console.log();
  console.log(
    `${ICONS.info} Run ${BRAND_COLORS.primary("pod help-extended")} for examples and tutorials`,
  );
  console.log(
    `${ICONS.info} Run ${BRAND_COLORS.primary("pod --help")} for basic help`,
  );
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

// Global error handler
process.on("uncaughtException", (error) => {
  errorHandler.handleError(error);
});

process.on("unhandledRejection", (reason) => {
  errorHandler.handleError(new Error(String(reason)));
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
  if (err.code === "commander.version") {
    process.exit(0);
  }
  console.error(chalk.red("Error:"), err.message);
  process.exit(1);
}

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
