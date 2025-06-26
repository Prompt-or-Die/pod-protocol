#!/usr/bin/env node

import { Command } from "commander";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { ICONS } from "./utils/branding.js";
import { errorHandler } from "./utils/enhanced-error-handler.js";
import { mockAgentRegistration, mockMessageSend } from "./utils/standalone-client.js";
import { createZKCompressionCommand } from "./commands/zk-compression.js";
import { createAdvancedCommand } from "./commands/advanced.js";
import { InteractiveCLI } from "./utils/interactive-cli.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Get version from package.json
const packagePath = join(__dirname, "../package.json");
const packageData = JSON.parse(readFileSync(packagePath, "utf8"));
const VERSION = packageData.version;

const program = new Command();

program
  .name("pod")
  .description("PoD Protocol CLI - The Ultimate AI Agent Communication Protocol")
  .version(VERSION, "-v, --version", "show version number")
  .option("-n, --network <network>", "specify network (devnet, testnet, mainnet)", "devnet")
  .option("-k, --keypair <path>", "path to keypair file", "~/.config/solana/id.json")
  .option("--dry-run", "simulate operations without executing")
  .option("--verbose", "enable verbose logging")
  .hook("preAction", (thisCommand) => {
    const opts = thisCommand.opts();
    if (opts.verbose) {
      process.env.VERBOSE = "true";
    }
  });

// Add basic demo commands that work without SDK imports
program
  .command("demo-agent")
  .description("Demo agent registration (mock)")
  .option("--name <name>", "agent name", "DemoAgent")
  .option("--capabilities <caps>", "agent capabilities", "trading,analysis")
  .action(async (options) => {
    try {
      console.log(`${ICONS.rocket} Demonstrating agent registration...`);
      const result = await mockAgentRegistration(options.name, options.capabilities);
      console.log(`${ICONS.success} Mock agent registered:`, result);
    } catch (error: any) {
      console.error(`${ICONS.error} Demo failed:`, error.message);
    }
  });

program
  .command("demo-message")
  .description("Demo message sending (mock)")
  .option("--content <content>", "message content", "Hello from PoD Protocol!")
  .option("--recipient <recipient>", "recipient name", "DemoAgent")
  .action(async (options) => {
    try {
      console.log(`${ICONS.message} Demonstrating message sending...`);
      const result = await mockMessageSend(options.content, options.recipient);
      console.log(`${ICONS.success} Mock message sent:`, result);
    } catch (error: any) {
      console.error(`${ICONS.error} Demo failed:`, error.message);
    }
  });

program
  .command("status")
  .description("Show CLI and network status")
  .action(async () => {
    try {
      console.log(`${ICONS.info} PoD Protocol CLI Status:`);
      console.log(`  Version: ${VERSION}`);
      console.log(`  Network: devnet (demo mode)`);
      console.log(`  Status: ${ICONS.success} Operational`);
      console.log(`  Features: Demo commands available`);
      console.log(`  Note: Full functionality available after SDK migration completion`);
    } catch (error: any) {
      console.error(`${ICONS.error} Status check failed:`, error.message);
    }
  });

program
  .command("tutorial")
  .description("Show tutorial for getting started")
  .action(async () => {
    try {
      console.log(`${ICONS.star} Welcome to PoD Protocol!`);
      console.log("Getting Started:");
      console.log("1. Try: pod demo-agent --name MyBot");
      console.log("2. Try: pod demo-message --content 'Hello World'");
      console.log("3. Try: pod status");
      console.log("4. For interactive mode: pod (with no arguments)");
      console.log(`${ICONS.info} Full functionality coming soon after SDK migration!`);
    } catch (error: any) {
      console.error(`${ICONS.error} Tutorial failed:`, error.message);
    }
  });

// Add ZK compression and advanced commands
program.addCommand(createZKCompressionCommand());
program.addCommand(createAdvancedCommand());

// Interactive mode
const args = process.argv.slice(2);
if (args.length === 0) {
  const interactiveCLI = new InteractiveCLI();
  await interactiveCLI.start();
} else {
  try {
    await program.parseAsync();
  } catch (error: any) {
    errorHandler.handleError(error);
    process.exit(1);
  }
}

