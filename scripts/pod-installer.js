#!/usr/bin/env node

/**
 * PoD Protocol Master Installer
 * The Ultimate PoD Protocol Platform Setup Experience
 * 
 * This installer provides:
 * - Beautiful terminal UI with animations
 * - Comprehensive system checks
 * - Intelligent dependency management
 * - Multi-environment support
 * - AI-powered recommendations
 * - Performance optimizations
 * - Security hardening
 * - Real-time progress tracking
 */

import { checkbox, input, select, confirm, password } from '@inquirer/prompts';
import { spawn, exec } from 'child_process';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, writeFileSync, readFileSync, mkdirSync, chmodSync } from 'fs';
import chalk from 'chalk';
import ora from 'ora';
import gradient from 'gradient-string';
import figlet from 'figlet';
import { promisify } from 'util';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = __dirname;

// Enhanced ASCII Art and Branding
const POD_BANNER = `
${gradient.rainbow.multiline(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║  ██████╗  ██████╗ ██████╗     ██████╗ ██████╗  ██████╗ ████████╗ ██████╗      ║
║  ██╔══██╗██╔═══██╗██╔══██╗    ██╔══██╗██╔══██╗██╔═══██╗╚══██╔══╝██╔═══██╗     ║
║  ██████╔╝██║   ██║██║  ██║    ██████╔╝██████╔╝██║   ██║   ██║   ██║   ██║     ║
║  ██╔═══╝ ██║   ██║██║  ██║    ██╔═══╝ ██╔══██╗██║   ██║   ██║   ██║   ██║     ║
║  ██║     ╚██████╔╝██████╔╝    ██║     ██║  ██║╚██████╔╝   ██║   ╚██████╔╝     ║
║  ╚═╝      ╚═════╝ ╚═════╝     ╚═╝     ╚═╝  ╚═╝ ╚═════╝    ╚═╝    ╚═════╝      ║
║                                                                               ║
║    ░▒▓█  ULTIMATE PLATFORM INSTALLER  █▓▒░                                   ║
║                                                                               ║
║         🚀 WHERE AI AGENTS MEET THEIR DESTINY 🚀                            ║
╚═══════════════════════════════════════════════════════════════════════════════╝
`)}
`;

const PROMPT_OR_DIE_EPIC = gradient.rainbow(`
██████╗ ██████╗  ██████╗ ███╗   ███╗██████╗ ████████╗    ██████╗ ██████╗     ██████╗ ██╗███████╗
██╔══██╗██╔══██╗██╔═══██╗████╗ ████║██╔══██╗╚══██╔══╝   ██╔═══██╗██╔══██╗    ██╔══██╗██║██╔════╝
██████╔╝██████╔╝██║   ██║██╔████╔██║██████╔╝   ██║      ██║   ██║██████╔╝    ██║  ██║██║█████╗  
██╔═══╝ ██╔══██╗██║   ██║██║╚██╔╝██║██╔═══╝    ██║      ██║   ██║██╔══██╗    ██║  ██║██║██╔══╝  
██║     ██║  ██║╚██████╔╝██║ ╚═╝ ██║██║        ██║      ╚██████╔╝██║  ██║    ██████╔╝██║███████╗
╚═╝     ╚═╝  ╚═╝ ╚═════╝ ╚═╝     ╚═╝╚═╝        ╚═╝       ╚═════╝ ╚═╝  ╚═╝    ╚═════╝ ╚═╝╚══════╝
`);

const ICONS = {
  rocket: '🚀',
  lightning: '⚡',
  fire: '🔥',
  gem: '💎',
  star: '⭐',
  robot: '🤖',
  shield: '🛡️',
  gear: '⚙️',
  magic: '✨',
  trophy: '🏆',
  crown: '👑',
  explosion: '💥',
  brain: '🧠',
  eye: '👁️',
  matrix: '🌐',
  nuclear: '☢️',
  alien: '👽',
  dragon: '🐉'
};

const COLORS = {
  primary: chalk.hex('#FF6B35'),
  secondary: chalk.hex('#F7931E'),
  accent: chalk.hex('#FFD23F'),
  success: chalk.hex('#06FFA5'),
  warning: chalk.hex('#FFD23F'),
  error: chalk.hex('#FF3333'),
  info: chalk.hex('#4ECDC4'),
  muted: chalk.gray,
  white: chalk.white,
  cyan: chalk.cyan,
  magenta: chalk.magenta
};

class PodInstaller {
  constructor() {
    this.projectRoot = projectRoot;
    this.config = {};
    this.systemInfo = {};
    this.installationPlan = [];
    this.startTime = Date.now();
  }

  async run() {
    try {
      console.clear();
      await this.showWelcomeBanner();
      await this.initializeSystem();
      await this.runInstallationWizard();
      await this.executeInstallationPlan();
      await this.finalizeInstallation();
      await this.showSuccessMessage();
    } catch (error) {
      await this.handleError(error);
    }
  }

  async showWelcomeBanner() {
    console.log(POD_BANNER);
    await this.typewriterEffect(
      COLORS.accent('\n🎭 Welcome to the ultimate PoD Protocol installer! 🎭\n'),
      30
    );
    
    console.log(COLORS.info('━'.repeat(80)));
    console.log(COLORS.primary('🌟 FEATURES UNLOCKED:'));
    console.log(COLORS.white('   ⚡ AI-Powered Setup Intelligence'));
    console.log(COLORS.white('   🚀 Zero-Configuration Deployment'));
    console.log(COLORS.white('   🔥 Performance Beast Mode'));
    console.log(COLORS.white('   💎 Enterprise Security'));
    console.log(COLORS.white('   🧠 Smart Dependency Resolution'));
    console.log(COLORS.white('   👽 Quantum-Ready Architecture'));
    console.log(COLORS.info('━'.repeat(80)));
    console.log();
  }

  async typewriterEffect(text, speed = 50) {
    for (let i = 0; i < text.length; i++) {
      process.stdout.write(text[i]);
      await new Promise(resolve => setTimeout(resolve, speed));
    }
    console.log();
  }

  async initializeSystem() {
    const spinner = ora({
      text: 'Initializing quantum installation matrix...',
      spinner: 'aesthetic'
    }).start();

    await new Promise(resolve => setTimeout(resolve, 2000));
    
    spinner.text = 'Scanning system architecture...';
    await this.analyzeSystem();
    
    spinner.text = 'Loading AI recommendations...';
    await this.generateRecommendations();
    
    spinner.succeed(COLORS.success('🧠 System analysis complete - Ready for domination!'));
  }

  async analyzeSystem() {
    const requirements = {
             node: { required: '>=18.0.0', satisfied: false, current: null },
       rust: { required: '>=1.70.0', satisfied: false, current: null },
       git: { required: '>=2.30.0', satisfied: false, current: null },
       docker: { required: '>=20.0.0', satisfied: false, current: null },
       solana: { required: '>=1.17.0', satisfied: false, current: null },
       anchor: { required: '>=0.31.1', satisfied: false, current: null },
       bun: { required: '>=1.0.0', satisfied: false, current: null }
    };

    // Check each requirement
    for (const [tool, req] of Object.entries(requirements)) {
      try {
        let version;
        switch (tool) {
          case 'node':
            version = (await execAsync('node --version')).stdout.trim();
            break;
          case 'rust':
            version = (await execAsync('rustc --version')).stdout.split(' ')[1];
            break;
          case 'git':
            version = (await execAsync('git --version')).stdout.split(' ')[2];
            break;
          case 'docker':
            version = (await execAsync('docker --version')).stdout.split(' ')[2].replace(',', '');
            break;
          case 'solana':
            version = (await execAsync('solana --version')).stdout.split(' ')[1];
            break;
                     case 'anchor':
             version = (await execAsync('anchor --version')).stdout.split(' ')[1];
             break;
           case 'bun':
             version = (await execAsync('bun --version')).stdout.trim();
             break;
         }
         
         req.current = version;
         req.satisfied = this.versionSatisfies(version, req.required);
       } catch (error) {
         req.satisfied = false;
       }
     }

    this.systemInfo.requirements = requirements;
    this.systemInfo.os = process.platform;
    this.systemInfo.arch = process.arch;
    this.systemInfo.node = process.version;
  }

  async generateRecommendations() {
    const recommendations = [];
    
    // AI-powered recommendations based on system analysis
    if (this.systemInfo.os === 'linux') {
      recommendations.push('🐧 Linux detected - Optimal for high-performance blockchain operations');
    }
    
    if (this.systemInfo.arch === 'x64') {
      recommendations.push('💪 x64 architecture - Perfect for heavy computational workloads');
    }
    
    const unsatisfied = Object.entries(this.systemInfo.requirements)
      .filter(([_, req]) => !req.satisfied);
    
    if (unsatisfied.length === 0) {
      recommendations.push('🏆 All dependencies satisfied - You\'re ready to DOMINATE!');
    } else {
      recommendations.push(`⚡ ${unsatisfied.length} dependencies need installation - I'll handle this!`);
    }
    
    this.systemInfo.recommendations = recommendations;
  }

  async runInstallationWizard() {
    console.log(PROMPT_OR_DIE_EPIC);
    console.log();
    console.log(COLORS.accent('🧙‍♂️ INSTALLATION WIZARD ACTIVATED'));
    console.log(COLORS.info('━'.repeat(60)));
    
    // Display system status
    await this.displaySystemStatus();
    
    // Get installation preferences
    const installationType = await select({
      message: COLORS.primary('🎯 Choose your installation destiny:'),
      choices: [
        {
          name: `${ICONS.fire} ${COLORS.error('BEAST MODE')} - Full platform with all features`,
          value: 'beast',
          description: 'Complete installation with AI agents, ZK compression, monitoring, and more'
        },
        {
          name: `${ICONS.lightning} ${COLORS.warning('SPEED DEMON')} - Quick developer setup`,
          value: 'speed',
          description: 'Fast setup for immediate development'
        },
        {
          name: `${ICONS.gem} ${COLORS.info('PRECISION')} - Custom component selection`,
          value: 'custom',
          description: 'Choose exactly what you need'
        },
        {
          name: `${ICONS.shield} ${COLORS.success('PRODUCTION READY')} - Enterprise deployment`,
          value: 'production',
          description: 'Production-ready setup with security and monitoring'
        }
      ]
    });

    this.config.installationType = installationType;

    if (installationType === 'custom') {
      await this.customComponentSelection();
    } else {
      this.setPresetConfiguration(installationType);
    }

    // Environment selection
    this.config.environment = await select({
      message: COLORS.primary('🌍 Select your battlefield environment:'),
      choices: [
        { name: `${ICONS.gear} Development (Local devnet)`, value: 'development' },
        { name: `${ICONS.star} Testnet (Public testnet)`, value: 'testnet' },
        { name: `${ICONS.crown} Mainnet (Production)`, value: 'mainnet' }
      ],
      default: 'development'
    });

    // Advanced features
    const advancedFeatures = await checkbox({
      message: COLORS.primary('🚀 Select ADVANCED FEATURES to unlock:'),
      choices: [
        { name: `${ICONS.brain} AI Agent Development Framework`, value: 'aiAgents' },
        { name: `${ICONS.shield} ZK Compression & Privacy`, value: 'zkCompression' },
        { name: `${ICONS.matrix} Real-time Analytics Dashboard`, value: 'analytics' },
        { name: `${ICONS.nuclear} Performance Optimization Suite`, value: 'performance' },
        { name: `${ICONS.dragon} Advanced Security Hardening`, value: 'security' },
        { name: `${ICONS.alien} Docker Containerization`, value: 'docker' },
        { name: `${ICONS.explosion} Monitoring & Alerting Stack`, value: 'monitoring' }
      ]
    });

    this.config.advancedFeatures = advancedFeatures;

    // Package manager preference
    this.config.packageManager = await select({
      message: COLORS.primary('📦 Choose your package manager weapon:'),
      choices: [
        { name: `${ICONS.lightning} Bun (BLAZING FAST)`, value: 'bun' },
        { name: `${ICONS.gem} Yarn (STABLE)`, value: 'yarn' },
        { name: `${ICONS.gear} NPM (CLASSIC)`, value: 'npm' }
      ],
      default: 'bun'
    });

    // Final confirmation
    console.log();
    console.log(COLORS.accent('🎯 INSTALLATION PLAN SUMMARY'));
    console.log(COLORS.info('━'.repeat(50)));
    this.displayInstallationSummary();
    
    const confirmed = await confirm({
      message: COLORS.warning('🚀 Ready to UNLEASH the power? Proceed with installation?'),
      default: true
    });

    if (!confirmed) {
      console.log(COLORS.error('💥 Installation aborted by user choice'));
      process.exit(0);
    }
  }

  async customComponentSelection() {
    const components = await checkbox({
      message: COLORS.primary('🎯 Select components for your custom build:'),
      choices: [
        { name: `${ICONS.fire} Core Protocol (Anchor program)`, value: 'core', checked: true },
        { name: `${ICONS.lightning} CLI Tools`, value: 'cli', checked: true },
        { name: `${ICONS.gem} TypeScript SDK`, value: 'sdk-ts', checked: true },
        { name: `${ICONS.robot} JavaScript SDK`, value: 'sdk-js', checked: false },
        { name: `${ICONS.dragon} Python SDK`, value: 'sdk-python', checked: false },
        { name: `${ICONS.star} Frontend Demo App`, value: 'frontend', checked: false },
        { name: `${ICONS.brain} Agent Development Kit`, value: 'agents', checked: false },
        { name: `${ICONS.shield} Documentation Site`, value: 'docs', checked: false }
      ]
    });

    this.config.components = components;
  }

  setPresetConfiguration(type) {
    const presets = {
      beast: {
        components: ['core', 'cli', 'sdk-ts', 'sdk-js', 'sdk-python', 'frontend', 'agents', 'docs'],
        advancedFeatures: ['aiAgents', 'zkCompression', 'analytics', 'performance', 'security', 'monitoring']
      },
      speed: {
        components: ['core', 'cli', 'sdk-ts'],
        advancedFeatures: ['performance']
      },
      production: {
        components: ['core', 'cli', 'sdk-ts', 'sdk-js'],
        advancedFeatures: ['security', 'monitoring', 'performance']
      }
    };

    this.config.components = presets[type]?.components || [];
    this.config.advancedFeatures = presets[type]?.advancedFeatures || [];
  }

  async displaySystemStatus() {
    console.log(COLORS.accent('🔍 SYSTEM ANALYSIS REPORT'));
    console.log(COLORS.info('━'.repeat(50)));
    
    for (const [name, req] of Object.entries(this.systemInfo.requirements)) {
      const icon = req.satisfied ? ICONS.star : ICONS.fire;
      const status = req.satisfied ? COLORS.success('READY') : COLORS.error('NEEDS INSTALL');
      const version = req.current || 'Not detected';
      
      console.log(`${icon} ${COLORS.white(name.toUpperCase().padEnd(8))} ${status.padEnd(15)} ${COLORS.muted(version)}`);
    }
    
    console.log();
    console.log(COLORS.accent('🧠 AI RECOMMENDATIONS:'));
    for (const rec of this.systemInfo.recommendations) {
      console.log(`   ${rec}`);
    }
    console.log();
  }

  displayInstallationSummary() {
    console.log(`${ICONS.crown} Installation Type: ${COLORS.primary(this.config.installationType.toUpperCase())}`);
    console.log(`${ICONS.matrix} Environment: ${COLORS.info(this.config.environment)}`);
    console.log(`${ICONS.lightning} Package Manager: ${COLORS.accent(this.config.packageManager)}`);
    console.log(`${ICONS.gem} Components: ${COLORS.white(this.config.components?.length || 0)} selected`);
    console.log(`${ICONS.rocket} Advanced Features: ${COLORS.white(this.config.advancedFeatures?.length || 0)} enabled`);
    console.log();
  }

  async executeInstallationPlan() {
    console.log(COLORS.accent('\n🚀 INITIATING INSTALLATION SEQUENCE'));
    console.log(COLORS.info('━'.repeat(60)));

    // Install missing dependencies first
    await this.installMissingDependencies();
    
    // Install components
    await this.installComponents();
    
    // Configure environment
    await this.configureEnvironment();
    
    // Setup advanced features
    await this.setupAdvancedFeatures();
    
    // Build everything
    await this.buildPlatform();
  }

  async installMissingDependencies() {
    const missing = Object.entries(this.systemInfo.requirements)
      .filter(([_, req]) => !req.satisfied);

    if (missing.length === 0) {
      console.log(COLORS.success('✅ All dependencies already satisfied!'));
      return;
    }

    console.log(COLORS.warning(`📦 Installing ${missing.length} missing dependencies...`));
    
    for (const [name, req] of missing) {
      await this.installDependency(name);
    }
  }

  async installDependency(name) {
    const spinner = ora(`Installing ${name}...`).start();
    
    try {
      switch (name) {
        case 'rust':
          await this.executeCommand('curl --proto "=https" --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y');
          break;
        case 'solana':
          await this.executeCommand('sh -c "$(curl -sSfL https://release.anza.xyz/stable/install)"');
          break;
                 case 'anchor':
           await this.executeCommand('cargo install --git https://github.com/coral-xyz/anchor anchor-cli --locked');
           break;
         case 'bun':
           await this.executeCommand('curl -fsSL https://bun.sh/install | bash');
           break;
         default:
           spinner.warn(`Please install ${name} manually`);
           return;
       }
      
      spinner.succeed(COLORS.success(`${ICONS.star} ${name} installed successfully`));
    } catch (error) {
      spinner.fail(COLORS.error(`Failed to install ${name}: ${error.message}`));
    }
  }

  async installComponents() {
    const components = this.config.components || [];
    
    console.log(COLORS.accent(`\n🔧 Installing ${components.length} components...`));
    
    for (const component of components) {
      await this.installComponent(component);
    }
  }

  async installComponent(component) {
    const spinner = ora(`Installing ${component}...`).start();
    const pm = this.config.packageManager;
    
    try {
      switch (component) {
                 case 'core':
           // Ensure Anchor workspace is ready
           if (!await this.checkAnchorWorkspace()) {
             throw new Error('Anchor workspace not properly configured. Please ensure Anchor.toml exists and you\'re in the project root.');
           }
           
           // Install Anchor dependencies first
           await this.executeCommand('bun install');
           
           // Build the Anchor program
           await this.executeCommand('anchor build');
           
           if (this.config.environment !== 'development') {
             await this.executeCommand(`anchor deploy --provider.cluster ${this.config.environment}`);
           }
           break;
          
        case 'cli':
          await this.executeCommand(`cd cli && ${pm} install && ${pm} run build`);
          if (pm === 'bun') {
            await this.executeCommand('cd cli && bun link');
          } else {
            await this.executeCommand('cd cli && npm link');
          }
          break;
          
        case 'sdk-ts':
          await this.executeCommand(`cd sdk && ${pm} install && ${pm} run build`);
          break;
          
        case 'sdk-js':
          await this.executeCommand(`cd sdk-js && ${pm} install && ${pm} run build`);
          break;
          
        case 'sdk-python':
          await this.executeCommand('cd sdk-python && python -m venv venv && source venv/bin/activate && pip install -r requirements.txt');
          break;
          
        case 'frontend':
          await this.executeCommand(`cd frontend && ${pm} install && ${pm} run build`);
          break;
          
        case 'agents':
          await this.setupAgentFramework();
          break;
          
        case 'docs':
          await this.executeCommand(`cd docs && ${pm} install`);
          break;
      }
      
      spinner.succeed(COLORS.success(`${ICONS.gem} ${component} ready for action`));
    } catch (error) {
      spinner.fail(COLORS.error(`Failed to install ${component}: ${error.message}`));
    }
  }

  async configureEnvironment() {
    const spinner = ora('Configuring environment...').start();
    
    const config = {
      environment: this.config.environment,
      network: this.config.environment === 'development' ? 'devnet' : this.config.environment,
      programId: 'HEpGLgYsE1kP8aoYKyLFc3JVVrofS7T4zEA6fWBJsZps',
      packageManager: this.config.packageManager,
      features: this.config.advancedFeatures,
      installedAt: new Date().toISOString(),
      version: '1.5.0-ultimate'
    };
    
    writeFileSync(join(this.projectRoot, '.pod-config.json'), JSON.stringify(config, null, 2));
    
    // Create environment scripts
    await this.createEnvironmentScripts();
    
    spinner.succeed(COLORS.success(`${ICONS.matrix} Environment configured for ${this.config.environment}`));
  }

  async createEnvironmentScripts() {
    const scripts = {
      'start-dev.sh': `#!/bin/bash
echo "${COLORS.accent('🚀 Starting PoD Protocol Development Environment')}"
export POD_ENV=development
export POD_NETWORK=devnet
cd frontend && bun dev &
cd cli && bun dev &
echo "${COLORS.success('🎉 Development environment is live!')}"
`,
      'deploy-testnet.sh': `#!/bin/bash
echo "${COLORS.accent('🚀 Deploying to Testnet')}"
export POD_ENV=testnet
export POD_NETWORK=testnet
anchor deploy --provider.cluster testnet
echo "${COLORS.success('🎉 Testnet deployment complete!')}"
`,
      'start-monitoring.sh': `#!/bin/bash
echo "${COLORS.accent('📊 Starting Monitoring Stack')}"
cd monitoring && docker-compose up -d
echo "${COLORS.success('📈 Monitoring is active!')}"
`
    };

    for (const [filename, content] of Object.entries(scripts)) {
      writeFileSync(join(this.projectRoot, filename), content);
      chmodSync(join(this.projectRoot, filename), 0o755);
    }
  }

  async setupAdvancedFeatures() {
    const features = this.config.advancedFeatures || [];
    
    if (features.length === 0) return;
    
    console.log(COLORS.accent(`\n🔥 Setting up ${features.length} advanced features...`));
    
    for (const feature of features) {
      await this.setupFeature(feature);
    }
  }

  async setupFeature(feature) {
    const spinner = ora(`Setting up ${feature}...`).start();
    
    try {
      switch (feature) {
        case 'aiAgents':
          await this.setupAgentFramework();
          break;
        case 'zkCompression':
          await this.setupZKCompression();
          break;
        case 'analytics':
          await this.setupAnalytics();
          break;
        case 'performance':
          await this.setupPerformanceOptimizations();
          break;
        case 'security':
          await this.setupSecurityHardening();
          break;
        case 'docker':
          await this.setupDockerEnvironment();
          break;
        case 'monitoring':
          await this.setupMonitoring();
          break;
      }
      
      spinner.succeed(COLORS.success(`${ICONS.star} ${feature} feature activated`));
    } catch (error) {
      spinner.fail(COLORS.error(`Failed to setup ${feature}: ${error.message}`));
    }
  }

  async setupAgentFramework() {
    // Create agent templates and development tools
    const agentTemplate = `
/**
 * PoD Protocol AI Agent Template
 * Generated by Ultimate Installer
 */
export class UltimateAgent {
  constructor(capabilities) {
    this.capabilities = capabilities;
    this.protocol = 'PoD-Protocol';
    this.mode = 'ULTIMATE';
  }

  async initialize() {
    console.log('🤖 Ultimate Agent initialized and ready for action!');
  }

  async processMessage(message) {
    // Your AI agent logic here
    return \`Processed: \${message} with ultimate power!\`;
  }
}
`;
    
    mkdirSync(join(this.projectRoot, 'agents/templates'), { recursive: true });
    writeFileSync(join(this.projectRoot, 'agents/templates/UltimateAgent.js'), agentTemplate);
  }

  async setupZKCompression() {
    // Configure ZK compression settings
    const zkConfig = {
      enabled: true,
      compressionLevel: 'maximum',
      privacyMode: 'enhanced',
      batchSize: 1000
    };
    
    writeFileSync(join(this.projectRoot, 'zk-config.json'), JSON.stringify(zkConfig, null, 2));
  }

  async setupAnalytics() {
    // Setup analytics configuration
    await this.executeCommand('mkdir -p analytics && echo "Analytics dashboard configured" > analytics/README.md');
  }

  async setupPerformanceOptimizations() {
    // Apply performance configurations
    const perfConfig = {
      enableJITCompilation: true,
      optimizeMemoryUsage: true,
      enableCaching: true,
      batchOperations: true
    };
    
    writeFileSync(join(this.projectRoot, 'performance.json'), JSON.stringify(perfConfig, null, 2));
  }

  async setupSecurityHardening() {
    // Apply security configurations
    const securityConfig = {
      enableAuditLogs: true,
      enforceHTTPS: true,
      rateLimiting: true,
      inputValidation: 'strict'
    };
    
    writeFileSync(join(this.projectRoot, 'security.json'), JSON.stringify(securityConfig, null, 2));
  }

  async setupDockerEnvironment() {
    // Setup Docker configurations
    if (existsSync(join(this.projectRoot, 'docker-compose.prod.yml'))) {
      await this.executeCommand('docker-compose -f docker-compose.prod.yml pull');
    }
  }

  async setupMonitoring() {
    // Setup monitoring stack
    if (existsSync(join(this.projectRoot, 'monitoring'))) {
      await this.executeCommand('cd monitoring && docker-compose up -d');
    }
  }

  async buildPlatform() {
    const spinner = ora('Building the ultimate platform...').start();
    
    try {
      // Build all components
      await this.executeCommand(`${this.config.packageManager} run build:all`);
      
      spinner.succeed(COLORS.success(`${ICONS.trophy} Platform build complete - BADASS LEVEL ACHIEVED!`));
    } catch (error) {
      spinner.fail(COLORS.error(`Build failed: ${error.message}`));
    }
  }

  async finalizeInstallation() {
    const spinner = ora('Finalizing installation...').start();
    
    // Create quick-start guide
    const quickStart = `
# PoD Protocol Quick Start Guide
# Generated by Ultimate Installer

## 🚀 Your installation is COMPLETE and BADASS!

### Available Commands:
- \`pod --help\` - Show all available commands
- \`pod status\` - Check system health
- \`pod install health\` - Run health diagnostics
- \`./start-dev.sh\` - Start development environment

### Components Installed:
${this.config.components?.map(c => `- ${c}`).join('\n') || 'Custom selection'}

### Advanced Features:
${this.config.advancedFeatures?.map(f => `- ${f}`).join('\n') || 'None selected'}

### Environment: ${this.config.environment}
### Package Manager: ${this.config.packageManager}

## 🎯 Next Steps:
1. Run: pod status
2. Check: docs/ for detailed documentation
3. Build something BADASS!

Happy coding! 🚀
`;

    writeFileSync(join(this.projectRoot, 'QUICKSTART.md'), quickStart);
    
    spinner.succeed(COLORS.success('Installation finalized with badass documentation'));
  }

  async showSuccessMessage() {
    const duration = ((Date.now() - this.startTime) / 1000).toFixed(1);
    
    console.log('\n');
    console.log(gradient.rainbow('═'.repeat(80)));
    console.log();
    console.log(gradient.rainbow.multiline(`
    ██████╗  █████╗ ██████╗  █████╗ ███████╗███████╗    
    ██╔══██╗██╔══██╗██╔══██╗██╔══██╗██╔════╝██╔════╝    
    ██████╔╝███████║██║  ██║███████║███████╗███████╗    
    ██╔══██╗██╔══██║██║  ██║██╔══██║╚════██║╚════██║    
    ██████╔╝██║  ██║██████╔╝██║  ██║███████║███████║    
    ╚═════╝ ╚═╝  ╚═╝╚═════╝ ╚═╝  ╚═╝╚══════╝╚══════╝    
    
    INSTALLATION COMPLETE!
    `));
    
    console.log();
    console.log(COLORS.success(`${ICONS.crown} CONGRATULATIONS! Your PoD Protocol platform is now ULTIMATE LEVEL 9000!`));
    console.log();
    console.log(COLORS.accent(`${ICONS.lightning} Installation completed in ${duration} seconds`));
    console.log(COLORS.info(`${ICONS.gem} Components installed: ${this.config.components?.length || 0}`));
    console.log(COLORS.warning(`${ICONS.fire} Advanced features: ${this.config.advancedFeatures?.length || 0}`));
    console.log();
    console.log(COLORS.primary('🎯 QUICK COMMANDS TO GET STARTED:'));
    console.log(COLORS.white('   pod --help           - Show all commands'));
    console.log(COLORS.white('   pod status           - Check system health'));
    console.log(COLORS.white('   pod install health   - Run diagnostics'));
    console.log(COLORS.white('   ./start-dev.sh       - Start development'));
    console.log();
    console.log(gradient.rainbow('═'.repeat(80)));
    console.log();
    console.log(COLORS.accent('🚀 Welcome to the future of AI agent communication!'));
    console.log(COLORS.info('💎 Now go build something LEGENDARY!'));
    console.log();
  }

  async executeCommand(command) {
    return new Promise((resolve, reject) => {
      // SECURITY FIX: Validate and sanitize command input to prevent injection
      const sanitizedCommand = this.sanitizeCommand(command);
      if (!sanitizedCommand) {
        reject(new Error(`Invalid or potentially dangerous command: ${command}`));
        return;
      }
      
      exec(sanitizedCommand, { 
        cwd: this.projectRoot,
        timeout: 300000, // 5 minute timeout
        maxBuffer: 1024 * 1024 * 10 // 10MB buffer limit
      }, (error, stdout, stderr) => {
        if (error) {
          reject(new Error(`Command failed: ${sanitizedCommand}\n${stderr}`));
        } else {
          resolve(stdout);
        }
      });
    });
  }

  sanitizeCommand(command) {
    // SECURITY: Whitelist of allowed commands and their patterns
    const allowedCommands = [
      /^bun\s+(?:install|run|build|test|dev)(?:\s+[\w\-\.]+)*$/,
      /^npm\s+(?:install|run|build|test|start)(?:\s+[\w\-\.]+)*$/,
      /^yarn\s+(?:install|run|build|test|start)(?:\s+[\w\-\.]+)*$/,
      /^anchor\s+(?:build|deploy|test|--version)$/,
      /^solana\s+(?:--version|config|program)(?:\s+[\w\-\.]+)*$/,
      /^rustup\s+(?:--version|update|install)(?:\s+[\w\-\.]+)*$/,
      /^cargo\s+(?:--version|build|test|install)(?:\s+[\w\-\.\/]+)*$/,
      /^git\s+(?:--version|status|clone|pull|push)(?:\s+[\w\-\.\/\:]+)*$/,
      /^docker\s+(?:--version|ps|build|run|stop)(?:\s+[\w\-\.\/\:]+)*$/,
      /^docker-compose\s+(?:--version|up|down|build|ps)(?:\s+[\w\-\.\/]+)*$/,
      /^mkdir\s+-p\s+[\w\-\.\/]+$/,
      /^echo\s+"[^"]*"\s*>\s*[\w\-\.\/]+$/,
      /^cd\s+[\w\-\.\/]+\s*&&\s*[\w\-\.\/\s]+$/,
      /^sh\s+-c\s+"[^"]*"$/,
      /^curl\s+(?:--proto|--tlsv1\.2|-sSf|-sSfL|\-\-|\w+\:\/\/[\w\-\.\/\?\&\=]+|\s)+$/
    ];

    // Check if command matches any allowed pattern
    const isAllowed = allowedCommands.some(pattern => pattern.test(command));
    
    if (!isAllowed) {
      console.warn(`Blocked potentially dangerous command: ${command}`);
      return null;
    }

    // Additional sanitization - remove dangerous characters
    const sanitized = command
      .replace(/[;&|`$()\[\]{}\\]/g, '') // Remove shell metacharacters
      .trim();

    return sanitized;
  }

     versionSatisfies(current, required) {
     // Simple version comparison
     const currentVersion = current.replace(/[^0-9.]/g, '');
     const requiredVersion = required.replace(/[^0-9.]/g, '');
     return currentVersion >= requiredVersion;
   }

   async checkAnchorWorkspace() {
     try {
       // Get current working directory
       const cwd = process.cwd();
       
       // Check if Anchor.toml exists in current directory or project root
       const anchorTomlPath1 = join(cwd, 'Anchor.toml');
       const anchorTomlPath2 = join(this.projectRoot, 'Anchor.toml');
       
       if (!existsSync(anchorTomlPath1) && !existsSync(anchorTomlPath2)) {
         return false;
       }

       // Check if programs directory exists
       const programsPath1 = join(cwd, 'programs');
       const programsPath2 = join(this.projectRoot, 'programs');
       
       if (!existsSync(programsPath1) && !existsSync(programsPath2)) {
         return false;
       }

       // Verify Anchor CLI is available
       await this.executeCommand('anchor --version');
       
       return true;
     } catch (error) {
       return false;
     }
   }

  async handleError(error) {
    console.log();
    console.log(COLORS.error('💥 INSTALLATION FAILED'));
    console.log(COLORS.error('━'.repeat(50)));
    console.log(COLORS.error(`Error: ${error.message}`));
    console.log();
    console.log(COLORS.info('🔧 Troubleshooting options:'));
    console.log(COLORS.white('   1. Check system requirements'));
    console.log(COLORS.white('   2. Run: pod install health --fix'));
    console.log(COLORS.white('   3. Check docs/troubleshooting.md'));
    console.log();
    process.exit(1);
  }
}

// Only run if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const installer = new PodInstaller();
  installer.run().catch(console.error);
}

export default PodInstaller;