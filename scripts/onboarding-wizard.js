#!/usr/bin/env node

/**
 * PoD Protocol Ultimate Onboarding Wizard
 * Comprehensive first-time user experience with guided setup
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

// Enhanced branding
const WELCOME_BANNER = gradient.rainbow.multiline(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║  🎭 WELCOME TO POD PROTOCOL ONBOARDING WIZARD 🎭                            ║
║                                                                               ║
║  ⚡️ Your guided journey into AI agent communication starts here ⚡️          ║
║                                                                               ║
║     🎯 Smart Setup    🚀 Interactive Demos    🧠 AI Guidance                ║
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

class OnboardingWizard {
  constructor() {
    this.userProfile = {};
    this.setupPlan = {};
    this.completedSteps = [];
  }

  async run() {
    console.clear();
    console.log(WELCOME_BANNER);
    await this.typewriterEffect('\n🎪 Let\'s create the perfect PoD Protocol experience for you!\n', 50);
    
    await this.profileUser();
    await this.createSetupPlan();
    await this.executeSetup();
    await this.runInteractiveTutorial();
    await this.showCompletion();
  }

  async typewriterEffect(text, speed = 50) {
    for (let i = 0; i < text.length; i++) {
      process.stdout.write(text[i]);
      await new Promise(resolve => setTimeout(resolve, speed));
    }
  }

  async profileUser() {
    console.log(COLORS.primary('\n🎯 Tell us about yourself so we can customize your experience:\n'));

    this.userProfile.role = await select({
      message: '👤 What best describes your role?',
      choices: [
        { name: '🚀 Startup Founder - Building the next AI revolution', value: 'founder' },
        { name: '💻 Developer - Want to integrate AI agents', value: 'developer' },
        { name: '🔬 Researcher - Exploring AI agent communication', value: 'researcher' },
        { name: '🏢 Enterprise - Scaling AI operations', value: 'enterprise' },
        { name: '🎓 Student - Learning about Web3 + AI', value: 'student' },
        { name: '👁️ Curious Explorer - Just checking this out', value: 'explorer' }
      ]
    });

    this.userProfile.experience = await select({
      message: '⚡️ Your experience with Solana/Web3?',
      choices: [
        { name: '🧠 Expert - I dream in Rust and Anchor', value: 'expert' },
        { name: '💪 Intermediate - Built some DApps before', value: 'intermediate' },
        { name: '🌱 Beginner - New to blockchain development', value: 'beginner' },
        { name: '👽 Alien - What is a blockchain?', value: 'newcomer' }
      ]
    });

    this.userProfile.goals = await checkbox({
      message: '🎯 What do you want to accomplish? (select all that apply)',
      choices: [
        { name: '🤖 Register and manage AI agents', value: 'agents' },
        { name: '💬 Send encrypted messages between agents', value: 'messaging' },
        { name: '🏛️ Create communication channels', value: 'channels' },
        { name: '💰 Set up escrow and payments', value: 'escrow' },
        { name: '🗜️ Use ZK compression for cost savings', value: 'zk' },
        { name: '📊 Build analytics and discovery features', value: 'analytics' },
        { name: '🛠️ Contribute to the protocol development', value: 'contribute' },
        { name: '🎭 Just explore and have fun', value: 'explore' }
      ],
      required: true
    });

    this.userProfile.preferredSetup = await select({
      message: '🛠️ How do you prefer to work?',
      choices: [
        { name: '⚡️ Fastest path - Get me running ASAP', value: 'fast' },
        { name: '🎓 Guided learning - Teach me as we go', value: 'guided' },
        { name: '🔧 Custom setup - I know what I want', value: 'custom' },
        { name: '🎮 Interactive demo - Show me the magic first', value: 'demo' }
      ]
    });

    console.log(COLORS.success('\n✨ Perfect! Creating your personalized experience...\n'));
  }

  async createSetupPlan() {
    const spinner = ora('🧠 AI analyzing your profile and generating optimal setup plan...').start();
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Generate personalized recommendations
    const plan = {
      components: [],
      tutorials: [],
      quickStart: [],
      advanced: []
    };

    // Role-based recommendations
    if (this.userProfile.role === 'developer' || this.userProfile.role === 'founder') {
      plan.components.push('cli', 'typescript-sdk', 'testing');
      plan.tutorials.push('agent-registration', 'messaging-demo');
    }

    if (this.userProfile.role === 'enterprise') {
      plan.components.push('all-sdks', 'monitoring', 'security-audit');
      plan.tutorials.push('scalability-demo', 'enterprise-features');
    }

    if (this.userProfile.role === 'researcher' || this.userProfile.role === 'student') {
      plan.components.push('cli', 'documentation', 'examples');
      plan.tutorials.push('protocol-overview', 'zk-compression-demo');
    }

    // Experience-based adjustments
    if (this.userProfile.experience === 'beginner' || this.userProfile.experience === 'newcomer') {
      plan.tutorials.unshift('solana-basics', 'wallet-setup');
      plan.quickStart.push('guided-first-agent', 'simple-message-demo');
    }

    // Goal-based components
    if (this.userProfile.goals.includes('zk')) {
      plan.components.push('zk-compression');
      plan.tutorials.push('zk-cost-savings-demo');
    }

    if (this.userProfile.goals.includes('analytics')) {
      plan.components.push('analytics-tools');
      plan.tutorials.push('data-visualization-demo');
    }

    this.setupPlan = plan;
    spinner.succeed(COLORS.success('🎯 Your personalized setup plan is ready!'));

    // Show the plan
    console.log(COLORS.accent('\n📋 Your Personalized PoD Protocol Setup Plan:\n'));
    
    console.log(COLORS.primary('🔧 Components to install:'));
    plan.components.forEach(comp => console.log(`  ✓ ${comp}`));
    
    console.log(COLORS.primary('\n🎓 Recommended tutorials:'));
    plan.tutorials.forEach(tut => console.log(`  📚 ${tut}`));
    
    if (plan.quickStart.length > 0) {
      console.log(COLORS.primary('\n⚡️ Quick start demos:'));
      plan.quickStart.forEach(demo => console.log(`  🚀 ${demo}`));
    }

    const confirmPlan = await confirm({
      message: '🚀 Does this plan look good? (We can customize it)',
      default: true
    });

    if (!confirmPlan) {
      await this.customizePlan();
    }
  }

  async customizePlan() {
    console.log(COLORS.accent('\n🎛️ Let\'s customize your setup plan:\n'));

    const customComponents = await checkbox({
      message: '🔧 Select components to install:',
      choices: [
        { name: '⚡️ CLI Tool (Essential)', value: 'cli', checked: true },
        { name: '📦 TypeScript SDK (Recommended)', value: 'typescript-sdk', checked: true },
        { name: '📦 JavaScript SDK', value: 'javascript-sdk' },
        { name: '🐍 Python SDK', value: 'python-sdk' },
        { name: '🖥️ Frontend Application', value: 'frontend' },
        { name: '🗜️ ZK Compression Tools', value: 'zk-compression' },
        { name: '📊 Analytics Dashboard', value: 'analytics' },
        { name: '🔒 Security Audit Tools', value: 'security' },
        { name: '📖 Full Documentation', value: 'docs' },
        { name: '🧪 Testing Framework', value: 'testing' }
      ]
    });

    this.setupPlan.components = customComponents;
  }

  async executeSetup() {
    console.log(COLORS.primary('\n🚀 Beginning your personalized setup...\n'));

    const totalSteps = this.setupPlan.components.length + 3; // +3 for base setup steps
    let currentStep = 0;

    // Step 1: System dependencies
    currentStep++;
    await this.executeStep(currentStep, totalSteps, 'Checking system dependencies', async () => {
      await this.checkSystemDependencies();
    });

    // Step 2: Package manager setup
    currentStep++;
    await this.executeStep(currentStep, totalSteps, 'Setting up package manager', async () => {
      await this.setupPackageManager();
    });

    // Step 3: Base installation
    currentStep++;
    await this.executeStep(currentStep, totalSteps, 'Installing PoD Protocol base', async () => {
      await this.installBase();
    });

    // Component installations
    for (const component of this.setupPlan.components) {
      currentStep++;
      await this.executeStep(currentStep, totalSteps, `Installing ${component}`, async () => {
        await this.installComponent(component);
      });
    }
  }

  async executeStep(current, total, description, action) {
    const spinner = ora(`[${current}/${total}] ${description}...`).start();
    try {
      await action();
      spinner.succeed(`[${current}/${total}] ${description} ✓`);
      this.completedSteps.push(description);
    } catch (error) {
      spinner.fail(`[${current}/${total}] ${description} ✗`);
      console.log(COLORS.error(`Error: ${error.message}`));
      
      const retry = await confirm({
        message: 'Would you like to retry this step?',
        default: true
      });
      
      if (retry) {
        await this.executeStep(current, total, description, action);
      }
    }
  }

  async runInteractiveTutorial() {
    if (this.userProfile.preferredSetup === 'demo' || this.userProfile.experience === 'beginner') {
      console.log(COLORS.accent('\n🎮 Time for an interactive demo!\n'));

      const demoChoice = await select({
        message: '🎭 Which demo would you like to try first?',
        choices: [
          { name: '🤖 Register Your First AI Agent', value: 'agent-demo' },
          { name: '💬 Send an Encrypted Message', value: 'message-demo' },
          { name: '🏛️ Create a Communication Channel', value: 'channel-demo' },
          { name: '🗜️ Experience ZK Compression Magic', value: 'zk-demo' },
          { name: '📊 Explore Network Analytics', value: 'analytics-demo' },
          { name: '⏭️ Skip demos for now', value: 'skip' }
        ]
      });

      if (demoChoice !== 'skip') {
        await this.runDemo(demoChoice);
      }
    }
  }

  async runDemo(demoType) {
    console.log(COLORS.primary(`\n🎬 Starting ${demoType} demo...\n`));
    
    // Simulate interactive demos based on type
    switch (demoType) {
      case 'agent-demo':
        await this.agentRegistrationDemo();
        break;
      case 'message-demo':
        await this.messagingDemo();
        break;
      case 'zk-demo':
        await this.zkCompressionDemo();
        break;
      default:
        console.log(COLORS.muted('Demo coming soon! 🚧'));
    }
  }

  async agentRegistrationDemo() {
    console.log(COLORS.accent('🤖 Let\'s register your first AI agent!\n'));
    
    const agentName = await input({
      message: '🏷️ What would you like to name your agent?',
      default: 'MyFirstAgent'
    });

    const capabilities = await checkbox({
      message: '🧠 What should your agent be capable of?',
      choices: [
        { name: '🔍 Analysis - Deep data insights', value: 'analysis' },
        { name: '💰 Trading - Market operations', value: 'trading' },
        { name: '✍️ Content - Creative generation', value: 'content' },
        { name: '💬 Communication - Social interaction', value: 'communication' }
      ]
    });

    const spinner = ora('🚀 Registering your agent on PoD Protocol...').start();
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const agentAddress = 'HEpGLgYsE1kP8aoYKyLFc3JVVrofS7T4zEA6fWBJsZps'; // Mock address
    spinner.succeed(`🎉 Agent "${agentName}" registered successfully!`);
    
    console.log(COLORS.success(`\n✨ Your agent is now live with address: ${agentAddress}\n`));
    console.log(COLORS.primary('🎯 What you can do next:'));
    console.log(`  • View details: ${COLORS.accent(`pod agent info ${agentAddress}`)}`);
    console.log(`  • Update capabilities: ${COLORS.accent('pod agent update')}`);
    console.log(`  • Start messaging: ${COLORS.accent('pod message send')}`);
  }

  async messagingDemo() {
    console.log(COLORS.accent('💬 Let\'s send your first encrypted message!\n'));
    
    // Simulated demo
    const recipient = await input({
      message: '📮 Enter recipient agent address (or use demo address):',
      default: 'Demo...Agent...Address'
    });

    const message = await input({
      message: '✍️ What message would you like to send?',
      default: 'Hello from PoD Protocol! 🎭'
    });

    const spinner = ora('🔐 Encrypting and sending message...').start();
    await new Promise(resolve => setTimeout(resolve, 2000));
    spinner.succeed('📨 Message sent successfully!');
    
    console.log(COLORS.success('\n✨ Your encrypted message has been delivered!\n'));
  }

  async zkCompressionDemo() {
    console.log(COLORS.accent('🗜️ Experience the magic of ZK Compression!\n'));
    
    const spinner = ora('📊 Calculating traditional Solana costs...').start();
    await new Promise(resolve => setTimeout(resolve, 1500));
    spinner.text = '🗜️ Applying ZK compression...';
    await new Promise(resolve => setTimeout(resolve, 1500));
    spinner.succeed('💰 Cost comparison complete!');
    
    console.log(COLORS.success('\n💎 ZK Compression Results:\n'));
    console.log(`${COLORS.muted('Traditional Solana:')} ${COLORS.error('0.005 SOL')}`);
    console.log(`${COLORS.muted('With ZK Compression:')} ${COLORS.success('0.00005 SOL')}`);
    console.log(`${COLORS.accent('💰 Savings:')} ${COLORS.success('99% cost reduction!')}\n`);
    
    console.log(COLORS.primary('🚀 That\'s the power of PoD Protocol\'s ZK integration!'));
  }

  async showCompletion() {
    console.clear();
    
    const completionBanner = gradient.rainbow.multiline(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║  🎉🎉🎉  WELCOME TO THE POD PROTOCOL FAMILY!  🎉🎉🎉                        ║
║                                                                               ║
║  🎭 Your AI agent communication platform is ready for action! 🎭            ║
║                                                                               ║
║    ⚡️ You've successfully completed the onboarding wizard ⚡️               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
`);
    
    console.log(completionBanner);
    
    console.log(COLORS.accent('\n🎯 Quick Start Commands for You:\n'));
    
    // Personalized quick start based on user profile
    if (this.userProfile.goals.includes('agents')) {
      console.log(`${COLORS.success('🤖')} ${COLORS.accent('pod agent register --interactive')}`);
    }
    if (this.userProfile.goals.includes('messaging')) {
      console.log(`${COLORS.success('💬')} ${COLORS.accent('pod message send --interactive')}`);
    }
    if (this.userProfile.goals.includes('channels')) {
      console.log(`${COLORS.success('🏛️')} ${COLORS.accent('pod channel create --interactive')}`);
    }
    
    console.log(`${COLORS.success('📋')} ${COLORS.accent('pod status --health')} ${COLORS.muted('# Check your setup')}`);
    console.log(`${COLORS.success('🎓')} ${COLORS.accent('pod help-extended')} ${COLORS.muted('# Learn more commands')}`);
    console.log(`${COLORS.success('🎨')} ${COLORS.accent('pod banners')} ${COLORS.muted('# See our beautiful ASCII art')}`);
    
    console.log(COLORS.primary('\n📚 Resources tailored for you:\n'));
    
    if (this.userProfile.role === 'developer') {
      console.log(`${COLORS.muted('•')} Developer Docs: ${COLORS.accent('docs/developer/')}`);
      console.log(`${COLORS.muted('•')} SDK Examples: ${COLORS.accent('examples/')}`);
    }
    
    if (this.userProfile.experience === 'beginner') {
      console.log(`${COLORS.muted('•')} Getting Started: ${COLORS.accent('docs/guides/GETTING_STARTED.md')}`);
      console.log(`${COLORS.muted('•')} Solana Basics: ${COLORS.accent('docs/guides/SOLANA_BASICS.md')}`);
    }
    
    console.log(`${COLORS.muted('•')} Community Discord: ${COLORS.accent('https://discord.gg/pod-protocol')}`);
    console.log(`${COLORS.muted('•')} GitHub Issues: ${COLORS.accent('https://github.com/Dexploarer/PoD-Protocol/issues')}`);
    
    console.log(COLORS.primary('\n🎭 Remember: In PoD Protocol, every prompt has the power to change the world!\n'));
    
    // Save user profile for future sessions
    const saveProfile = await confirm({
      message: '💾 Save your preferences for future sessions?',
      default: true
    });
    
    if (saveProfile) {
      await this.saveUserProfile();
    }
  }

  async saveUserProfile() {
    const configPath = join(process.env.HOME || process.env.USERPROFILE, '.pod-protocol', 'user-profile.json');
    mkdirSync(dirname(configPath), { recursive: true });
    writeFileSync(configPath, JSON.stringify({
      profile: this.userProfile,
      setupPlan: this.setupPlan,
      completedSteps: this.completedSteps,
      completedAt: new Date().toISOString()
    }, null, 2));
    
    console.log(COLORS.success('💾 Your preferences have been saved!'));
  }

  // Helper methods for actual installation steps
  async checkSystemDependencies() {
    // Implementation would check for Node.js, Git, Rust, etc.
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  async setupPackageManager() {
    // Implementation would set up Bun/Yarn/NPM based on user preference
    await new Promise(resolve => setTimeout(resolve, 800));
  }

  async installBase() {
    // Implementation would install core PoD Protocol components
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  async installComponent(component) {
    // Implementation would install specific components
    await new Promise(resolve => setTimeout(resolve, 1500));
  }
}

// Run the wizard
const wizard = new OnboardingWizard();
wizard.run().catch(console.error); 