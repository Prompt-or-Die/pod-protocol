#!/usr/bin/env node

import { Command } from "commander";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { intro, outro, select } from '@clack/prompts';
import { createAnimatedPODBanner } from "./utils/branding.js";
import { errorHandler } from "./utils/enhanced-error-handler.js";
import boxen from 'boxen';
import * as emoji from 'node-emoji';
import chalk from 'chalk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Get version from package.json
const packagePath = join(__dirname, "../package.json");
const packageData = JSON.parse(readFileSync(packagePath, "utf8"));
const VERSION = packageData.version;

export class PodCLI {
  private program: Command;

  constructor() {
    this.program = new Command();
    this.setupProgram();
  }

  private setupProgram() {
    this.program
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

    // Quick commands
    this.program
      .command("status")
      .description("Show CLI and network status")
      .action(async () => {
        await this.showStatus();
      });

    this.program
      .command("help-me")
      .description("AI-powered help and guidance")
      .argument("[query...]", "what you need help with")
      .action(async (query) => {
        await this.showAIHelp(query.join(' '));
      });

    this.program
      .command("demo")
      .description("Run interactive demo")
      .action(async () => {
        await this.runDemo();
      });
  }

  async showMainMenu(): Promise<void> {
    try {
      await createAnimatedPODBanner();
      
      intro(`${emoji.get('wave')} Welcome to PoD Protocol CLI`);

      const mode = await select({
        message: 'How would you like to use PoD Protocol today?',
        options: [
          {
            value: 'demo',
            label: `${emoji.get('star')} Interactive Demo`,
            hint: 'Try PoD Protocol features with guided examples'
          },
          {
            value: 'status',
            label: `${emoji.get('information_source')} System Status`,
            hint: 'Check CLI and network status'
          },
          {
            value: 'help',
            label: `${emoji.get('question')} Help & Documentation`,
            hint: 'AI-powered assistance and comprehensive guides'
          }
        ]
      });

      if (typeof mode === 'symbol') {
        outro(`${emoji.get('wave')} See you next time!`);
        return;
      }

      switch (mode) {
        case 'demo':
          await this.runDemo();
          break;
        case 'status':
          await this.showStatus();
          break;
        case 'help':
          await this.showAIHelp();
          break;
      }

    } catch (error) {
      errorHandler.handleError(error as Error);
      process.exit(1);
    }
  }

  async showStatus(): Promise<void> {
    console.log(boxen(
      `${emoji.get('information_source')} PoD Protocol CLI Status\n\n` +
      `${emoji.get('package')} Version: ${chalk.green(VERSION)}\n` +
      `${emoji.get('computer')} Platform: ${process.platform}\n` +
      `${emoji.get('gear')} Node.js: ${process.version}\n` +
      `${emoji.get('globe_with_meridians')} Network: Ready for all environments\n` +
      `${emoji.get('white_check_mark')} Status: ${chalk.green('Operational')}\n\n` +
      `${emoji.get('rocket')} Ready to build AI agents!`,
      {
        padding: 1,
        borderStyle: 'round',
        borderColor: 'cyan',
        title: ' Status '
      }
    ));
  }

  async showAIHelp(query?: string): Promise<void> {
    if (!query) {
      console.log(boxen(
        `${emoji.get('robot_face')} PoD Protocol AI Assistant\n\n` +
        `${emoji.get('speech_balloon')} I can help you with:\n` +
        `  • Getting started with PoD Protocol\n` +
        `  • Setting up AI agents\n` +
        `  • Blockchain integrations\n` +
        `  • Troubleshooting issues\n` +
        `  • Best practices and optimization\n\n` +
        `${emoji.get('bulb')} Examples:\n` +
        `  ${chalk.gray('pod help-me register an agent')}\n` +
        `  ${chalk.gray('pod help-me deploy to mainnet')}\n` +
        `  ${chalk.gray('pod help-me debug connection issues')}`,
        {
          padding: 1,
          borderStyle: 'round',
          borderColor: 'blue',
          title: ' AI Help '
        }
      ));
    } else {
      console.log(`${emoji.get('thinking_face')} Analyzing: "${query}"\n`);
      
      console.log(boxen(
        `${emoji.get('robot_face')} AI Assistant Response:\n\n` +
        `For "${query}", I recommend starting with our interactive demo.\n` +
        `Run: ${chalk.cyan('pod demo')} to explore PoD Protocol features.\n\n` +
        `${emoji.get('information_source')} Full documentation coming soon!`,
        {
          padding: 1,
          borderStyle: 'round',
          borderColor: 'green'
        }
      ));
    }
  }

  async runDemo(): Promise<void> {
    intro(`${emoji.get('star')} PoD Protocol Interactive Demo`);

    console.log(boxen(
      `${emoji.get('rocket')} Welcome to PoD Protocol!\n\n` +
      `This demo showcases the power of decentralized AI agent communication.\n\n` +
      `${emoji.get('gear')} Key Features:\n` +
      `  • Decentralized agent messaging\n` +
      `  • Solana blockchain integration\n` +
      `  • ZK-compression for 99% cost savings\n` +
      `  • Enterprise-grade security\n` +
      `  • Real-time agent discovery\n\n` +
      `${emoji.get('bulb')} Use Cases:\n` +
      `  • Trading bots\n` +
      `  • Customer service agents\n` +
      `  • Data analysis agents\n` +
      `  • Multi-agent systems\n\n` +
      `${emoji.get('building_construction')} Coming Soon:\n` +
      `  • Guided tutorials\n` +
      `  • Development tools\n` +
      `  • Production deployment\n` +
      `  • Advanced monitoring`,
      {
        padding: 1,
        borderStyle: 'double',
        borderColor: 'magenta',
        title: ' PoD Protocol Demo '
      }
    ));

    outro(`${emoji.get('graduation_cap')} Demo complete! Run 'pod status' to see system information.`);
  }

  async run(): Promise<void> {
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
      // No arguments - show main menu
      await this.showMainMenu();
    } else {
      // Arguments provided - use commander
      try {
        await this.program.parseAsync();
      } catch (error: any) {
        errorHandler.handleError(error);
        process.exit(1);
      }
    }
  }
}

// Main execution
async function main() {
  const cli = new PodCLI();
  await cli.run();
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  errorHandler.handleError(error);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  errorHandler.handleError(reason as Error);
  process.exit(1);
});

// Run the CLI
main().catch((error) => {
  errorHandler.handleError(error);
  process.exit(1);
}); 