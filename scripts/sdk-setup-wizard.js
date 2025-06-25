#!/usr/bin/env node

/**
 * PoD Protocol SDK Setup Wizard
 * Interactive configuration for all SDKs with Web3.js v2 support
 */

import { select, input, confirm, checkbox } from '@inquirer/prompts';
import { spawn, exec } from 'child_process';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, writeFileSync, readFileSync, mkdirSync } from 'fs';
import chalk from 'chalk';
import ora from 'ora';
import gradient from 'gradient-string';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Web3.js v2 imports - note these should be imported correctly
// For now using dynamic imports due to module compatibility
const createKeyPair = async () => {
  try {
    const { generateKeyPairSigner } = await import("@solana/web3.js");
    return generateKeyPairSigner();
  } catch (error) {
    console.warn("Using fallback keypair generation");
    return null;
  }
};

const createAddress = async (addressString) => {
  try {
    const { address } = await import("@solana/web3.js");
    return address(addressString);
  } catch (error) {
    console.warn("Using fallback address creation");
    return addressString;
  }
};

// Enhanced PoD Protocol branding
const SDK_BANNER = gradient.rainbow.multiline(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║  ⚡ POD PROTOCOL SDK SETUP WIZARD ⚡                                          ║
║                                                                               ║
║  🎭 Choose Your Language - Build AI Agents That Communicate or Die 🎭       ║
║                                                                               ║
║     📦 TypeScript    🐍 Python    ⚙️ JavaScript    🦀 Rust (Coming)        ║
╚═══════════════════════════════════════════════════════════════════════════════╝
`);

const COLORS = {
  primary: chalk.hex('#9D4EDD'),
  secondary: chalk.hex('#00D9FF'), 
  success: chalk.hex('#00FF7F'),
  warning: chalk.hex('#FFD700'),
  error: chalk.hex('#FF4444'),
  accent: chalk.white.bold,
  muted: chalk.gray
};

class SDKSetupWizard {
  constructor() {
    this.selectedLanguage = null;
    this.projectName = '';
    this.agentConfig = {};
    this.setupOptions = {};
  }

  async run() {
    console.clear();
    console.log(SDK_BANNER);
    console.log();

    await this.showWelcome();
    await this.selectLanguage();
    await this.configureProject();
    await this.selectSDKComponents();
    await this.setupDevelopmentEnvironment();
    await this.generateSampleCode();
    await this.showCompletion();
  }

  async showWelcome() {
    console.log(COLORS.accent('🎯 Welcome to the PoD Protocol SDK Setup Experience!\n'));
    console.log(COLORS.primary('This wizard will help you:'));
    console.log(COLORS.muted('  ⚡ Choose the perfect SDK for your language'));
    console.log(COLORS.muted('  🤖 Configure your first AI agent'));
    console.log(COLORS.muted('  🎨 Set up a complete development environment'));
    console.log(COLORS.muted('  🚀 Generate ready-to-run sample code'));
    console.log();

    const shouldContinue = await confirm({
      message: '🎭 Ready to build AI agents that change the world?',
      default: true
    });

    if (!shouldContinue) {
      console.log(COLORS.warning('🎭 Another time then... The revolution will wait for you!'));
      process.exit(0);
    }

    console.log();
  }

  async selectLanguage() {
    console.log(COLORS.accent('🔥 Choose your weapon of choice:\n'));

    this.selectedLanguage = await select({
      message: '💻 Which programming language speaks to your soul?',
      choices: [
        {
          name: '⚡ TypeScript - Type-safe, enterprise-ready, lightning fast',
          value: 'typescript',
          description: 'Perfect for production apps, full type safety, best ecosystem'
        },
        {
          name: '🐍 Python - Data science powerhouse, async/await elegance',
          value: 'python', 
          description: 'Ideal for ML/AI agents, data processing, scientific computing'
        },
        {
          name: '⚙️ JavaScript - Universal, flexible, rapid development',
          value: 'javascript',
          description: 'Great for prototyping, web integration, simple deployment'
        },
        {
          name: '🦀 Rust - Coming Soon! Ultimate performance & memory safety',
          value: 'rust',
          description: 'For when you need maximum speed and zero compromises'
        }
      ]
    });

    if (this.selectedLanguage === 'rust') {
      console.log(COLORS.warning('🦀 Rust SDK is coming soon! For now, choose TypeScript for similar performance benefits.'));
      return this.selectLanguage();
    }

    console.log(COLORS.success(`\n✨ Excellent choice! ${this.getLanguageEmoji()} ${this.selectedLanguage.toUpperCase()} it is!`));
    console.log();
  }

  async configureProject() {
    console.log(COLORS.accent('🎯 Let\'s configure your AI agent project:\n'));

    this.projectName = await input({
      message: '📦 What should we call your project?',
      default: 'my-pod-agent',
      validate: (input) => {
        if (!input || input.trim().length === 0) {
          return 'Project name cannot be empty';
        }
        if (!/^[a-z0-9-_]+$/.test(input)) {
          return 'Use only lowercase letters, numbers, hyphens, and underscores';
        }
        return true;
      }
    });

    const agentType = await select({
      message: '🤖 What type of AI agent are you building?',
      choices: [
        { name: '💰 Trading Bot - Financial market analysis & trading', value: 'trading' },
        { name: '🧠 Data Analyst - Process and analyze information', value: 'analysis' },
        { name: '💬 Communication Hub - Multi-agent coordination', value: 'communication' },
        { name: '🎨 Content Creator - Generate text, images, media', value: 'content' },
        { name: '🔧 Custom Agent - I know exactly what I want', value: 'custom' }
      ]
    });

    // Configure capabilities based on agent type
    this.agentConfig = await this.configureAgentCapabilities(agentType);
    console.log();
  }

  async configureAgentCapabilities(agentType) {
    const capabilityPresets = {
      trading: ['trading', 'analysis', 'data-processing'],
      analysis: ['analysis', 'data-processing', 'machine-learning'],
      communication: ['communication', 'coordination', 'messaging'],
      content: ['content-generation', 'analysis', 'communication'],
      custom: []
    };

    let selectedCapabilities = capabilityPresets[agentType] || [];

    if (agentType === 'custom') {
      selectedCapabilities = await checkbox({
        message: '🎯 Select your agent\'s capabilities:',
        choices: [
          { name: '💰 Trading & Financial Analysis', value: 'trading' },
          { name: '🧠 Data Analysis & Insights', value: 'analysis' },
          { name: '📊 Large-scale Data Processing', value: 'data-processing' },
          { name: '🎨 Content & Media Generation', value: 'content-generation' },
          { name: '💬 Inter-agent Communication', value: 'communication' },
          { name: '🤖 Machine Learning & AI', value: 'machine-learning' },
          { name: '⚙️ Process Automation', value: 'automation' },
          { name: '🔍 Discovery & Search', value: 'discovery' }
        ],
        required: true
      });
    }

    return {
      type: agentType,
      capabilities: selectedCapabilities,
      name: this.projectName.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
    };
  }

  async selectSDKComponents() {
    console.log(COLORS.accent('📦 Choose SDK components to install:\n'));

    const components = await checkbox({
      message: '🔧 Select components for your project:',
      choices: [
        { name: '⚡ Core SDK (Required)', value: 'core', checked: true },
        { name: '🧪 Testing Framework', value: 'testing', checked: true },
        { name: '📖 Documentation Generator', value: 'docs', checked: false },
        { name: '🎨 UI Components (React/Svelte)', value: 'ui', checked: false },
        { name: '🗜️ ZK Compression Tools', value: 'zk-compression', checked: false },
        { name: '📊 Analytics & Monitoring', value: 'analytics', checked: false },
        { name: '🔒 Security Audit Tools', value: 'security', checked: false },
        { name: '🚀 Deployment Helpers', value: 'deployment', checked: true }
      ]
    });

    this.setupOptions.components = components;
    console.log();
  }

  async setupDevelopmentEnvironment() {
    console.log(COLORS.accent('🛠️ Setting up your development environment...\n'));

    const spinner = ora('🔧 Installing SDK and dependencies...').start();

    try {
      // Create project directory
      if (!existsSync(this.projectName)) {
        mkdirSync(this.projectName, { recursive: true });
      }

      process.chdir(this.projectName);

      // Install SDK based on language
      await this.installSDK();
      
      // Generate package configuration
      await this.generatePackageConfig();
      
      // Create project structure
      await this.createProjectStructure();

      spinner.succeed(COLORS.success('✅ Development environment ready!'));
    } catch (error) {
      spinner.fail(COLORS.error(`❌ Setup failed: ${error.message}`));
      throw error;
    }

    console.log();
  }

  async installSDK() {
    const sdkPackages = {
      typescript: '@pod-protocol/sdk',
      javascript: '@pod-protocol/sdk-js', 
      python: 'pod-protocol-sdk'
    };

    const packageName = sdkPackages[this.selectedLanguage];

    if (this.selectedLanguage === 'python') {
      // Python setup
      await execAsync('python -m venv venv');
      await execAsync('pip install ' + packageName);
      
      if (this.setupOptions.components.includes('testing')) {
        await execAsync('pip install pytest pytest-asyncio');
      }
    } else {
      // Node.js setup
      const packageManager = await this.detectPackageManager();
      
      if (packageManager === 'bun') {
        await execAsync(`bun add ${packageName}`);
      } else if (packageManager === 'yarn') {
        await execAsync(`yarn add ${packageName}`);
      } else {
        await execAsync(`npm install ${packageName}`);
      }

      if (this.setupOptions.components.includes('testing')) {
        await execAsync(`${packageManager} add -D jest @types/jest`);
      }
    }
  }

  async detectPackageManager() {
    try {
      await execAsync('bun --version');
      return 'bun';
    } catch {
      try {
        await execAsync('yarn --version');
        return 'yarn';
      } catch {
        return 'npm';
      }
    }
  }

  async generatePackageConfig() {
    if (this.selectedLanguage === 'python') {
      // Generate pyproject.toml or requirements.txt
      const requirements = [
        'pod-protocol-sdk',
        'solders>=0.21.0',
        'anchorpy>=0.20.0'
      ];

      if (this.setupOptions.components.includes('testing')) {
        requirements.push('pytest>=7.4.0', 'pytest-asyncio>=0.21.0');
      }

      writeFileSync('requirements.txt', requirements.join('\n'));
    } else {
      // Generate package.json for Node.js
      const packageJson = {
        name: this.projectName,
        version: '1.0.0',
        description: `${this.agentConfig.name} - PoD Protocol AI Agent`,
        type: 'module',
        main: this.selectedLanguage === 'typescript' ? 'dist/index.js' : 'src/index.js',
        scripts: {
          start: this.selectedLanguage === 'typescript' ? 'node dist/index.js' : 'node src/index.js',
          dev: this.selectedLanguage === 'typescript' ? 'tsx watch src/index.ts' : 'node --watch src/index.js',
          build: this.selectedLanguage === 'typescript' ? 'tsc' : 'echo "No build needed for JavaScript"',
          test: 'jest'
        },
        keywords: ['pod-protocol', 'ai-agent', 'solana', 'blockchain'],
        author: 'PoD Protocol Developer',
        license: 'MIT'
      };

      writeFileSync('package.json', JSON.stringify(packageJson, null, 2));

      if (this.selectedLanguage === 'typescript') {
        const tsConfig = {
          compilerOptions: {
            target: 'ES2022',
            module: 'ESNext',
            moduleResolution: 'node',
            esModuleInterop: true,
            allowSyntheticDefaultImports: true,
            strict: true,
            outDir: './dist',
            rootDir: './src'
          },
          include: ['src/**/*'],
          exclude: ['node_modules', 'dist']
        };

        writeFileSync('tsconfig.json', JSON.stringify(tsConfig, null, 2));
      }
    }
  }

  async createProjectStructure() {
    const dirs = ['src'];
    
    if (this.setupOptions.components.includes('testing')) {
      dirs.push('tests');
    }
    
    if (this.setupOptions.components.includes('docs')) {
      dirs.push('docs');
    }

    dirs.forEach(dir => {
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
    });

    // Create .env template
    const envTemplate = `# PoD Protocol Configuration
SOLANA_RPC_URL=https://api.devnet.solana.com
SOLANA_COMMITMENT=confirmed
AGENT_NAME=${this.agentConfig.name}

# Wallet Configuration
# SOLANA_PRIVATE_KEY=[1,2,3,...] # Array of bytes from Keypair.secretKey

# Optional: Custom program ID
# PROGRAM_ID=your_program_id_here

# Optional: IPFS configuration
# IPFS_URL=https://ipfs.infura.io:5001
# IPFS_GATEWAY=https://ipfs.io/ipfs/

# Optional: ZK Compression
# LIGHT_RPC_URL=https://devnet.helius-rpc.com
`;

    writeFileSync('.env.example', envTemplate);
  }

  async generateSampleCode() {
    console.log(COLORS.accent('🎨 Generating sample code for your agent...\n'));

    const spinner = ora('🎭 Creating your first AI agent...').start();

    try {
      const sampleCode = this.generateSampleCodeForLanguage();
      const fileName = this.getSampleFileName();
      
      writeFileSync(`src/${fileName}`, sampleCode);
      
      if (this.setupOptions.components.includes('testing')) {
        const testCode = this.generateTestCode();
        const testFileName = this.getTestFileName();
        writeFileSync(`tests/${testFileName}`, testCode);
      }

      // Generate README
      const readme = this.generateReadme();
      writeFileSync('README.md', readme);

      spinner.succeed(COLORS.success('✅ Sample code generated!'));
    } catch (error) {
      spinner.fail(COLORS.error(`❌ Code generation failed: ${error.message}`));
      throw error;
    }

    console.log();
  }

  generateSampleCodeForLanguage() {
    switch (this.selectedLanguage) {
      case 'typescript':
        return this.generateTypeScriptSample();
      case 'javascript':
        return this.generateJavaScriptSample();
      case 'python':
        return this.generatePythonSample();
      default:
        throw new Error(`Unsupported language: ${this.selectedLanguage}`);
    }
  }

  generateTypeScriptSample() {
    return `import { PodComClient, AGENT_CAPABILITIES, MessageType } from "@pod-protocol/sdk";
import { Keypair } from "@solana/web3.js";
import * as dotenv from "dotenv";

dotenv.config();

/**
 * ${this.agentConfig.name} - PoD Protocol AI Agent
 * 🎭 Prompt or Die - ${this.agentConfig.type} Agent
 */

class ${this.projectName.replace(/-/g, '')}Agent {
  private client: PodComClient;
  private wallet: Keypair;

  constructor() {
    this.client = new PodComClient({
      endpoint: process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com",
      commitment: "confirmed"
    });
    
    // Load wallet from environment or generate new one
    const privateKeyString = process.env.SOLANA_PRIVATE_KEY;
    if (privateKeyString) {
      try {
        const privateKeyBytes = JSON.parse(privateKeyString);
        this.wallet = Keypair.fromSecretKey(new Uint8Array(privateKeyBytes));
        console.log("✅ Loaded wallet from environment");
      } catch (error) {
        console.warn("⚠️ Failed to load wallet from environment, generating new one");
        this.wallet = Keypair.generate();
      }
    } else {
      this.wallet = Keypair.generate();
      console.log("💡 Generated new wallet. Add SOLANA_PRIVATE_KEY to .env to persist");
    }
  }

  async initialize(): Promise<void> {
    console.log("⚡ Initializing ${this.agentConfig.name}...");
    await this.client.initialize();
    
    // Register agent with capabilities
    const capabilities = ${this.generateCapabilitiesCode()};
    
    const registerTx = await this.client.registerAgent(this.wallet, {
      capabilities,
      metadataUri: "https://your-metadata-uri.json"
    });
    
    console.log("🎉 Agent registered:", registerTx);
  }

  async sendMessage(recipient: string, content: string): Promise<void> {
    await this.client.sendMessage(this.wallet, {
      recipient: new PublicKey(recipient),
      messageType: MessageType.Text,
      payload: content
    });
    
    console.log("💬 Message sent successfully!");
  }

  async start(): Promise<void> {
    try {
      await this.initialize();
      console.log("🚀 ${this.agentConfig.name} is now online and ready!");
      
      // Agent main logic - customize based on your agent type
      console.log("🤖 Starting ${this.agentConfig.type} agent behavior...");
      
      // Example: Listen for incoming messages
      await this.startMessageListener();
      
      // Example: Perform periodic tasks based on capabilities
      this.startPeriodicTasks();
      
      // Keep the agent running
      await this.keepAlive();
      
    } catch (error) {
      console.error("❌ Agent failed to start:", error);
      process.exit(1);
    }
  }

  private async startMessageListener(): Promise<void> {
    console.log("👂 Starting message listener...");
    // TODO: Implement message polling or subscription
    // This could poll for new messages every few seconds
    setInterval(async () => {
      try {
        // Check for new messages
        const messages = await this.client.getMessagesForAgent(this.wallet.publicKey);
        for (const message of messages) {
          await this.handleIncomingMessage(message);
        }
      } catch (error) {
        console.error("Error checking messages:", error);
      }
    }, 5000); // Check every 5 seconds
  }

  private async handleIncomingMessage(message: any): Promise<void> {
    console.log(\`📨 Received message from \${message.sender}\`);
    
    // TODO: Implement message handling based on your agent's capabilities
    // Example responses based on agent type:
    ${this.generateMessageHandlingLogic()}
  }

  private startPeriodicTasks(): void {
    console.log("⏰ Starting periodic tasks...");
    
    // Example: Agent health check every minute
    setInterval(() => {
      console.log("💓 Agent heartbeat - still running...");
    }, 60000);

    ${this.generatePeriodicTasksLogic()}
  }

  private async keepAlive(): Promise<void> {
    console.log("🔄 Agent is now running. Press Ctrl+C to stop.");
    
    // Keep the process alive
    return new Promise((resolve) => {
      process.on('SIGINT', () => {
        console.log("\\n👋 Shutting down agent gracefully...");
        resolve();
        process.exit(0);
      });
    });
  }

  generateMessageHandlingLogic() {
    const typeToLogic = {
      trading: `
    if (message.payload.includes('price') || message.payload.includes('trade')) {
      // Handle trading-related messages
      await this.sendMessage(message.sender, "I can help with trading analysis!");
    }`,
      analysis: `
    if (message.payload.includes('analyze') || message.payload.includes('data')) {
      // Handle analysis requests
      await this.sendMessage(message.sender, "I can analyze that data for you!");
    }`,
      communication: `
    // Echo back all messages as a communication hub
    await this.sendMessage(message.sender, \`Received: \${message.payload}\`);`,
      content: `
    if (message.payload.includes('generate') || message.payload.includes('create')) {
      // Handle content generation requests
      await this.sendMessage(message.sender, "I can generate content for you!");
    }`,
      custom: `
    // Handle messages based on your custom logic
    console.log("Processing custom message logic...");`
    };

    return typeToLogic[this.agentConfig.type] || typeToLogic.custom;
  }

  generatePeriodicTasksLogic() {
    const typeToTasks = {
      trading: `
    // Trading agents might want to check market conditions periodically
    setInterval(async () => {
      console.log("📈 Checking market conditions...");
      // TODO: Implement market analysis
    }, 30000); // Every 30 seconds`,
      analysis: `
    // Analysis agents might process data queues periodically
    setInterval(async () => {
      console.log("🔍 Processing analysis queue...");
      // TODO: Implement data processing
    }, 60000); // Every minute`,
      communication: `
    // Communication hubs might broadcast status updates
    setInterval(async () => {
      console.log("📡 Broadcasting status update...");
      // TODO: Implement status broadcasts
    }, 300000); // Every 5 minutes`,
      content: `
    // Content generators might check for content requests
    setInterval(async () => {
      console.log("🎨 Checking for content requests...");
      // TODO: Implement content generation queue
    }, 120000); // Every 2 minutes`,
      custom: `
    // Add your custom periodic tasks here
    setInterval(async () => {
      console.log("⚙️ Running custom periodic task...");
      // TODO: Implement your custom logic
    }, 60000); // Every minute`
    };

    return typeToTasks[this.agentConfig.type] || typeToTasks.custom;
  }
}

// Start the agent
const agent = new ${this.projectName.replace(/-/g, '')}Agent();
agent.start().catch(console.error);
`;
  }

  generateJavaScriptSample() {
    return `import { PodComClient, AGENT_CAPABILITIES, MessageType } from "@pod-protocol/sdk-js";
import { Keypair, PublicKey } from "@solana/web3.js";
import dotenv from "dotenv";

dotenv.config();

/**
 * ${this.agentConfig.name} - PoD Protocol AI Agent
 * 🎭 Prompt or Die - ${this.agentConfig.type} Agent
 */

class ${this.projectName.replace(/-/g, '')}Agent {
  constructor() {
    this.client = new PodComClient({
      endpoint: process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com",
      commitment: "confirmed"
    });
    
    // Load wallet from environment or generate new one
    const privateKeyString = process.env.SOLANA_PRIVATE_KEY;
    if (privateKeyString) {
      try {
        const privateKeyBytes = JSON.parse(privateKeyString);
        this.wallet = Keypair.fromSecretKey(new Uint8Array(privateKeyBytes));
        console.log("✅ Loaded wallet from environment");
      } catch (error) {
        console.warn("⚠️ Failed to load wallet from environment, generating new one");
        this.wallet = Keypair.generate();
      }
    } else {
      this.wallet = Keypair.generate();
      console.log("💡 Generated new wallet. Add SOLANA_PRIVATE_KEY to .env to persist");
    }
  }

  async initialize() {
    console.log("⚡ Initializing ${this.agentConfig.name}...");
    await this.client.initialize(this.wallet);
    
    // Register agent with capabilities
    const capabilities = ${this.generateCapabilitiesCode()};
    
    const registerTx = await this.client.agents.register({
      capabilities,
      metadataUri: "https://your-metadata-uri.json"
    }, this.wallet);
    
    console.log("🎉 Agent registered:", registerTx);
  }

  async sendMessage(recipient, content) {
    await this.client.messages.send({
      recipient: new PublicKey(recipient),
      content,
      messageType: MessageType.TEXT
    }, this.wallet);
    
    console.log("💬 Message sent successfully!");
  }

  async start() {
    try {
      await this.initialize();
      console.log("🚀 ${this.agentConfig.name} is now online and ready!");
      
      // TODO: Implement your agent's main logic here
      
    } catch (error) {
      console.error("❌ Agent failed to start:", error);
      process.exit(1);
    }
  }
}

// Start the agent
const agent = new ${this.projectName.replace(/-/g, '')}Agent();
agent.start().catch(console.error);
`;
  }

  generatePythonSample() {
    return `"""
${this.agentConfig.name} - PoD Protocol AI Agent
🎭 Prompt or Die - ${this.agentConfig.type} Agent
"""

import asyncio
import os
from typing import Optional
from pod_protocol import PodComClient, AGENT_CAPABILITIES
from solders.keypair import Keypair
from solders.pubkey import Pubkey

class ${this.projectName.replace(/-/g, '').title()}Agent:
    """
    ${this.agentConfig.name} - Advanced AI Agent
    """
    
    def __init__(self):
        self.client = PodComClient({
            'endpoint': os.getenv('SOLANA_RPC_URL', 'https://api.devnet.solana.com'),
            'commitment': 'confirmed'
        })
        
        # Load wallet from environment or generate new one
        import json
        private_key_string = os.getenv('SOLANA_PRIVATE_KEY')
        if private_key_string:
            try:
                private_key_bytes = json.loads(private_key_string)
                self.wallet = Keypair.from_bytes(bytes(private_key_bytes))
                print("✅ Loaded wallet from environment")
            except Exception as error:
                print(f"⚠️ Failed to load wallet from environment: {error}")
                self.wallet = Keypair()
        else:
            self.wallet = Keypair()
            print("💡 Generated new wallet. Add SOLANA_PRIVATE_KEY to .env to persist")
    
    async def initialize(self) -> None:
        """Initialize the agent and register on PoD Protocol."""
        print("⚡ Initializing ${this.agentConfig.name}...")
        await self.client.initialize(self.wallet)
        
        # Register agent with capabilities
        capabilities = ${this.generateCapabilitiesCodePython()}
        
        register_tx = await self.client.agents.register({
            'capabilities': capabilities,
            'metadata_uri': 'https://your-metadata-uri.json'
        }, self.wallet)
        
        print(f"🎉 Agent registered: {register_tx}")
    
    async def send_message(self, recipient: str, content: str) -> None:
        """Send a message to another agent."""
        await self.client.messages.send({
            'recipient': Pubkey.from_string(recipient),
            'content': content,
            'message_type': 'text'
        }, self.wallet)
        
        print("💬 Message sent successfully!")
    
    async def start(self) -> None:
        """Start the agent."""
        try:
            await self.initialize()
            print("🚀 ${this.agentConfig.name} is now online and ready!")
            
            # TODO: Implement your agent's main logic here
            
        except Exception as error:
            print(f"❌ Agent failed to start: {error}")
            raise

async def main():
    """Main entry point."""
    agent = ${this.projectName.replace(/-/g, '').title()}Agent()
    await agent.start()

if __name__ == '__main__':
    asyncio.run(main())
`;
  }

  generateCapabilitiesCode() {
    const capabilityMap = {
      'trading': 'AGENT_CAPABILITIES.Trading',
      'analysis': 'AGENT_CAPABILITIES.Analysis',
      'data-processing': 'AGENT_CAPABILITIES.DataProcessing',
      'content-generation': 'AGENT_CAPABILITIES.ContentGeneration',
      'communication': 'AGENT_CAPABILITIES.Communication',
      'machine-learning': 'AGENT_CAPABILITIES.Learning',
      'automation': 'AGENT_CAPABILITIES.Custom1',
      'discovery': 'AGENT_CAPABILITIES.Custom2'
    };

    const capabilities = this.agentConfig.capabilities
      .map(cap => capabilityMap[cap])
      .filter(Boolean);

    return capabilities.length > 1 
      ? capabilities.join(' | ')
      : capabilities[0] || 'AGENT_CAPABILITIES.Custom1';
  }

  generateCapabilitiesCodePython() {
    const capabilityMap = {
      'trading': 'AGENT_CAPABILITIES.TRADING',
      'analysis': 'AGENT_CAPABILITIES.ANALYSIS',
      'data-processing': 'AGENT_CAPABILITIES.DATA_PROCESSING',
      'content-generation': 'AGENT_CAPABILITIES.CONTENT_GENERATION',
      'communication': 'AGENT_CAPABILITIES.COMMUNICATION',
      'machine-learning': 'AGENT_CAPABILITIES.LEARNING',
      'automation': 'AGENT_CAPABILITIES.CUSTOM_1',
      'discovery': 'AGENT_CAPABILITIES.CUSTOM_2'
    };

    const capabilities = this.agentConfig.capabilities
      .map(cap => capabilityMap[cap])
      .filter(Boolean);

    return capabilities.length > 1 
      ? capabilities.join(' | ')
      : capabilities[0] || 'AGENT_CAPABILITIES.CUSTOM_1';
  }

  getSampleFileName() {
    switch (this.selectedLanguage) {
      case 'typescript': return 'index.ts';
      case 'javascript': return 'index.js';
      case 'python': return 'main.py';
    }
  }

  getTestFileName() {
    switch (this.selectedLanguage) {
      case 'typescript': return 'agent.test.ts';
      case 'javascript': return 'agent.test.js';
      case 'python': return 'test_agent.py';
    }
  }

  generateTestCode() {
    // Generate basic test template based on language
    switch (this.selectedLanguage) {
      case 'typescript':
      case 'javascript':
        return `describe('${this.agentConfig.name}', () => {
  test('should initialize successfully', async () => {
    const agent = new ${this.projectName.replace(/-/g, '')}Agent();
    expect(agent).toBeDefined();
    expect(agent.wallet).toBeDefined();
    expect(agent.client).toBeDefined();
  });

  test('should connect to Solana network', async () => {
    const agent = new ${this.projectName.replace(/-/g, '')}Agent();
    // Test network connectivity
    const version = await agent.client.rpc.getVersion();
    expect(version).toBeDefined();
  });

  test('should handle wallet operations', async () => {
    const agent = new ${this.projectName.replace(/-/g, '')}Agent();
    expect(agent.wallet.publicKey).toBeDefined();
    // Add more wallet-specific tests based on your agent's requirements
  });
});`;
      case 'python':
        return `"""
Tests for ${this.agentConfig.name}
"""

import pytest
from main import ${this.projectName.replace(/-/g, '').title()}Agent

@pytest.mark.asyncio
async def test_agent_initialization():
    """Test agent initialization."""
    agent = ${this.projectName.replace(/-/g, '').title()}Agent()
    assert agent is not None
    assert agent.wallet is not None
    assert agent.client is not None

@pytest.mark.asyncio
async def test_wallet_operations():
    """Test wallet functionality."""
    agent = ${this.projectName.replace(/-/g, '').title()}Agent()
    assert agent.wallet.pubkey() is not None

@pytest.mark.asyncio
async def test_client_connection():
    """Test Solana network connection."""
    agent = ${this.projectName.replace(/-/g, '').title()}Agent()
    # Add network connectivity tests based on your requirements
    assert hasattr(agent.client, 'initialize')
`;
    }
  }

  generateReadme() {
    return `# ${this.agentConfig.name}

> **🎭 Prompt or Die** - ${this.agentConfig.type} AI Agent powered by PoD Protocol

## 🚀 Quick Start

### Installation

\`\`\`bash
${this.selectedLanguage === 'python' ? 'pip install -r requirements.txt' : 'npm install'}
\`\`\`

### Configuration

1. Copy \`.env.example\` to \`.env\`
2. Configure your Solana RPC endpoint and wallet
3. Customize agent settings

### Running

\`\`\`bash
${this.selectedLanguage === 'python' ? 'python src/main.py' : 'npm start'}
\`\`\`

## 🎯 Agent Capabilities

This agent is configured with the following capabilities:
${this.agentConfig.capabilities.map(cap => `- ${cap.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}`).join('\n')}

## 🛠️ Development

### Running in Development Mode

\`\`\`bash
${this.selectedLanguage === 'python' ? 'python src/main.py' : 'npm run dev'}
\`\`\`

### Running Tests

\`\`\`bash
${this.selectedLanguage === 'python' ? 'pytest' : 'npm test'}
\`\`\`

## 📚 Documentation

- [PoD Protocol Docs](https://docs.pod-protocol.com)
- [${this.selectedLanguage.toUpperCase()} SDK Guide](https://docs.pod-protocol.com/sdk/${this.selectedLanguage})

## 🎭 About PoD Protocol

**Prompt or Die** - The ultimate AI agent communication protocol on Solana.

---

*Built with ⚡ and 🎭 by the PoD Protocol community*
`;
  }

  getLanguageEmoji() {
    const emojis = {
      typescript: '⚡',
      javascript: '⚙️',
      python: '🐍',
      rust: '🦀'
    };
    return emojis[this.selectedLanguage] || '💻';
  }

  async showCompletion() {
    console.log(COLORS.success('🎉 Your PoD Protocol AI Agent is ready!\n'));
    
    console.log(COLORS.accent('📂 Project created at:'), COLORS.primary(process.cwd()));
    console.log();
    
    console.log(COLORS.accent('🚀 Next steps:'));
    console.log(COLORS.muted(`  1. cd ${this.projectName}`));
    console.log(COLORS.muted('  2. Copy .env.example to .env and configure'));
    console.log(COLORS.muted('  3. Add your Solana wallet'));
    console.log(COLORS.muted(`  4. ${this.selectedLanguage === 'python' ? 'python src/main.py' : 'npm start'}`));
    console.log();
    
    console.log(COLORS.accent('🎭 Welcome to the PoD Protocol revolution!'));
    console.log(COLORS.primary('Your AI agent will communicate with the speed of thought or face digital extinction.'));
    console.log();
    
    console.log(COLORS.muted('📚 Resources:'));
    console.log(COLORS.muted('  • Docs: https://docs.pod-protocol.com'));
    console.log(COLORS.muted('  • Discord: https://discord.gg/pod-protocol'));
    console.log(COLORS.muted('  • GitHub: https://github.com/Dexploarer/PoD-Protocol'));
    console.log();
    
    console.log(COLORS.accent('⚡ Prompt or Die! ⚡'));
  }
}

// Run the wizard
const wizard = new SDKSetupWizard();
wizard.run().catch(console.error); 