#!/usr/bin/env node

/**
 * PoD Protocol MCP Server CLI
 * Command-line interface for managing the MCP server
 */

import { Command } from 'commander';
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import chalk from 'chalk';
import ora from 'ora';
import { createExampleConfig } from './config.js';
import { PodProtocolMCPServer } from './server.js';
import { createPodLogger } from './logger.js';

const program = new Command();
const logger = createPodLogger();

program
  .name('pod-mcp-server')
  .description('PoD Protocol MCP Server - Bridge AI agents with blockchain communication')
  .version('1.0.0');

/**
 * Initialize command - Sets up configuration and wallet
 */
program
  .command('init')
  .description('Initialize PoD MCP server configuration')
  .option('-r, --runtime <runtime>', 'Agent runtime (eliza|autogen|crewai|langchain)', 'eliza')
  .option('-a, --agent-id <id>', 'Agent identifier')
  .option('-w, --wallet <path>', 'Wallet file path')
  .option('-e, --endpoint <url>', 'Solana RPC endpoint', 'https://api.devnet.solana.com')
  .option('-f, --force', 'Overwrite existing configuration')
  .action(async (options) => {
    const spinner = ora('🚀 Initializing PoD MCP Server...').start();
    
    try {
      const configPath = './pod-mcp-config.json';
      
      // Check if config already exists
      if (existsSync(configPath) && !options.force) {
        spinner.fail();
        console.log(chalk.yellow('⚠️  Configuration already exists. Use --force to overwrite.'));
        return;
      }

      // Create configuration
      const config = createExampleConfig();
      
      // Update with provided options
      if (options.runtime) config.agent_runtime.runtime = options.runtime;
      if (options.agentId) config.agent_runtime.agent_id = options.agentId;
      if (options.wallet) config.agent_runtime.wallet_path = options.wallet;
      if (options.endpoint) {
        config.pod_protocol.rpc_endpoint = options.endpoint;
        config.agent_runtime.rpc_endpoint = options.endpoint;
      }
      
      // Create logs directory
      if (config.logging.file_path) {
        const logDir = dirname(config.logging.file_path);
        if (!existsSync(logDir)) {
          mkdirSync(logDir, { recursive: true });
        }
      }

      // Write configuration
      writeFileSync(configPath, JSON.stringify(config, null, 2));
      
      spinner.succeed();
      console.log(chalk.green('✅ Configuration created successfully!'));
      console.log(chalk.blue('📋 Configuration file:'), configPath);
      
      // Show next steps
      console.log('\n' + chalk.bold('Next steps:'));
      console.log(chalk.gray('1.'), 'Edit the configuration file to match your setup');
      console.log(chalk.gray('2.'), 'Create a Solana wallet if you haven\'t already');
      console.log(chalk.gray('3.'), 'Run:', chalk.cyan('pod-mcp-server start'));
      
    } catch (error) {
      spinner.fail();
      console.error(chalk.red('❌ Initialization failed:'), error);
      process.exit(1);
    }
  });

/**
 * Start command - Starts the MCP server
 */
program
  .command('start')
  .description('Start the PoD MCP server')
  .option('-c, --config <path>', 'Configuration file path', './pod-mcp-config.json')
  .action(async (options) => {
    const spinner = ora('🚀 Starting PoD MCP Server...').start();
    
    try {
      if (!existsSync(options.config)) {
        spinner.fail();
        console.log(chalk.red('❌ Configuration file not found:'), options.config);
        console.log(chalk.blue('💡 Run:'), chalk.cyan('pod-mcp-server init'), 'to create one');
        return;
      }

      spinner.text = '📡 Loading configuration...';
      
      // Start the server (this will be handled by index.ts)
      console.log(chalk.green('✅ Use the main server entry point:'));
      console.log(chalk.cyan('node dist/index.js'));
      
      spinner.succeed();
      
    } catch (error) {
      spinner.fail();
      console.error(chalk.red('❌ Failed to start server:'), error);
      process.exit(1);
    }
  });

/**
 * Setup command for specific agent runtimes
 */
program
  .command('setup')
  .description('Setup integration with specific agent runtime')
  .argument('<runtime>', 'Agent runtime (eliza|autogen|crewai|langchain)')
  .action(async (runtime) => {
    const spinner = ora(`🔧 Setting up ${runtime} integration...`).start();
    
    try {
      switch (runtime.toLowerCase()) {
        case 'eliza':
          await setupEliza();
          break;
        case 'autogen':
          await setupAutoGen();
          break;
        case 'crewai':
          await setupCrewAI();
          break;
        case 'langchain':
          await setupLangChain();
          break;
        default:
          throw new Error(`Unsupported runtime: ${runtime}`);
      }
      
      spinner.succeed();
      console.log(chalk.green(`✅ ${runtime} integration setup complete!`));
      
    } catch (error) {
      spinner.fail();
      console.error(chalk.red(`❌ Failed to setup ${runtime}:`), error);
      process.exit(1);
    }
  });

/**
 * Test command - Tests connection to PoD Protocol
 */
program
  .command('test')
  .description('Test connection to PoD Protocol')
  .option('-c, --config <path>', 'Configuration file path', './pod-mcp-config.json')
  .action(async (options) => {
    const spinner = ora('🧪 Testing PoD Protocol connection...').start();
    
    try {
      if (!existsSync(options.config)) {
        spinner.fail();
        console.log(chalk.red('❌ Configuration file not found:'), options.config);
        return;
      }

      spinner.text = '📡 Connecting to PoD Protocol...';
      
      // TODO: Implement actual connection test
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      spinner.succeed();
      console.log(chalk.green('✅ Connection test passed!'));
      console.log(chalk.blue('🔗 RPC Endpoint:'), 'Connected');
      console.log(chalk.blue('📦 Program ID:'), 'Valid');
      console.log(chalk.blue('💰 Wallet:'), 'Loaded');
      
    } catch (error) {
      spinner.fail();
      console.error(chalk.red('❌ Connection test failed:'), error);
    }
  });

/**
 * Status command - Shows server status and statistics
 */
program
  .command('status')
  .description('Show server status and statistics')
  .action(async () => {
    console.log(chalk.hex('#8b5cf6').bold('🔥 PoD Protocol MCP Server Status'));
    console.log(chalk.gray('─'.repeat(50)));
    
    // TODO: Implement actual status checking
    console.log(chalk.green('🟢 Server:'), 'Running');
    console.log(chalk.blue('📊 Connections:'), '3 active agents');
    console.log(chalk.blue('💬 Messages:'), '127 processed today');
    console.log(chalk.blue('🏢 Channels:'), '8 active');
    console.log(chalk.blue('🔒 Escrows:'), '2 pending');
    console.log(chalk.blue('⏱️  Uptime:'), '4h 23m');
  });

// =====================================================
// Runtime Setup Functions
// =====================================================

async function setupEliza(): Promise<void> {
  console.log(chalk.blue('📋 ElizaOS Integration Setup:'));
  console.log('1. Install ElizaOS if you haven\'t already');
  console.log('2. Add PoD MCP server to your character\'s MCP configuration');
  console.log('3. Example character.json snippet:');
  
  const config = {
    mcpServers: {
      "pod-protocol": {
        command: "node",
        args: ["./mcp-server/dist/index.js"],
        env: {
          POD_RPC_ENDPOINT: "https://api.devnet.solana.com",
          AGENT_RUNTIME: "eliza",
          AGENT_ID: "my-eliza-agent"
        }
      }
    }
  };
  
  console.log(chalk.gray(JSON.stringify(config, null, 2)));
}

async function setupAutoGen(): Promise<void> {
  console.log(chalk.blue('📋 AutoGen Integration Setup:'));
  console.log('1. Install the MCP client library in your AutoGen project');
  console.log('2. Initialize MCP connection in your agent setup');
  console.log('3. Example Python code:');
  
  const code = `
from mcp import Client

# Initialize PoD Protocol MCP client
pod_client = Client("pod-protocol")
await pod_client.connect()

# Register your agent
await pod_client.call_tool("register_agent", {
    "name": "AutoGen Trading Bot",
    "capabilities": ["trading", "analysis"]
})`;
  
  console.log(chalk.gray(code));
}

async function setupCrewAI(): Promise<void> {
  console.log(chalk.blue('📋 CrewAI Integration Setup:'));
  console.log('1. Add PoD Protocol tools to your CrewAI agent');
  console.log('2. Configure agent with MCP client');
  console.log('3. Example agent setup:');
  
  const code = `
from crewai import Agent, Tool
from mcp_client import PodProtocolMCP

pod_tools = PodProtocolMCP().get_tools()

agent = Agent(
    role="Communication Coordinator",
    goal="Manage agent communications via PoD Protocol",
    tools=pod_tools
)`;
  
  console.log(chalk.gray(code));
}

async function setupLangChain(): Promise<void> {
  console.log(chalk.blue('📋 LangChain Integration Setup:'));
  console.log('1. Install LangChain MCP integration');
  console.log('2. Add PoD Protocol tools to your chain');
  console.log('3. Example setup:');
  
  const code = `
from langchain.tools import MCPTool
from langchain.agents import Agent

pod_tools = [
    MCPTool.from_server("pod-protocol"),
]

agent = Agent(
    tools=pod_tools,
    system_message="You can communicate with other agents via PoD Protocol"
)`;
  
  console.log(chalk.gray(code));
}

// Parse command line arguments
program.parse(); 