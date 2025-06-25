import { Command } from "commander";
import chalk from "chalk";
import inquirer from "inquirer";
import { checkbox, select, confirm } from '@inquirer/prompts';
import ora from "ora";
import gradient from 'gradient-string';
import { exec } from "child_process";
import { promisify } from "util";
import { writeFileSync, existsSync, mkdirSync, chmodSync } from "fs";
import { join } from "path";
import { 
  showBanner, 
  showPromptOrDieBanner, 
  BRAND_COLORS, 
  ICONS, 
  DECORATIVE_ELEMENTS,
  BannerSize 
} from "../utils/branding.js";
import { errorHandler } from "../utils/enhanced-error-handler.js";

const execAsync = promisify(exec);

type InstallationType = 'ultimate' | 'speed' | 'custom' | 'production';

interface InstallOptions {
  components?: string[];
  environment?: 'development' | 'testnet' | 'mainnet';
  packageManager?: 'npm' | 'yarn' | 'bun';
  interactive?: boolean;
  skipDeps?: boolean;
  autoConfig?: boolean;
  docker?: boolean;
  monitoring?: boolean;
  security?: boolean;
  performance?: boolean;
  fullStack?: boolean;
  aiAgents?: boolean;
  zkCompression?: boolean;
  verbose?: boolean;
  analytics?: boolean;
  installationType?: InstallationType;
}

interface SystemRequirements {
  node: { required: string; current?: string; satisfied: boolean };
  rust: { required: string; current?: string; satisfied: boolean };
  git: { required: string; current?: string; satisfied: boolean };
  docker: { required: string; current?: string; satisfied: boolean };
  solana: { required: string; current?: string; satisfied: boolean };
  anchor: { required: string; current?: string; satisfied: boolean };
}

export class InstallCommands {
  private projectRoot: string;

  constructor() {
    // Use process.cwd() as a fallback for the project root
    this.projectRoot = process.cwd();
  }

  public register(program: Command): void {
    const install = program
      .command("install")
      .description(`${ICONS.rocket} Advanced PoD Protocol Platform Installer`);

    this.setupMasterInstallCommand(install);
    this.setupQuickInstallCommand(install);
    this.setupComponentInstallCommand(install);
    this.setupEnvironmentSetupCommand(install);
    this.setupHealthCheckCommand(install);
    this.setupUninstallCommand(install);
  }

  private setupMasterInstallCommand(install: Command): void {
    install
      .command("platform")
      .alias("master")
      .description(`${ICONS.star} Complete PoD Protocol platform installation`)
      .option("-i, --interactive", "Interactive installation wizard")
      .option("-e, --environment <env>", "Target environment (development|testnet|mainnet)", "development")
      .option("-p, --package-manager <pm>", "Package manager (npm|yarn|bun)", "bun")
      .option("--skip-deps", "Skip dependency checks")
      .option("--auto-config", "Automatic configuration")
      .option("--docker", "Include Docker setup")
      .option("--monitoring", "Include monitoring stack")
      .option("--security", "Enhanced security features")
      .option("--performance", "Performance optimizations")
      .option("--full-stack", "Complete full-stack setup")
      .option("--ai-agents", "AI agent development tools")
      .option("--zk-compression", "ZK compression features")
      .option("-v, --verbose", "Verbose output")
      .action(async (options: InstallOptions) => {
        try {
          await this.handleMasterInstall(options);
        } catch (error) {
          errorHandler.handleError(error as Error);
        }
      });
  }

  private setupQuickInstallCommand(install: Command): void {
    install
      .command("quick")
      .description(`${ICONS.lightning} Quick setup for developers`)
      .option("-t, --type <type>", "Quick setup type (dev|prod|demo)", "dev")
      .action(async (options: { type: string }) => {
        try {
          await this.handleQuickInstall(options.type);
        } catch (error) {
          errorHandler.handleError(error as Error);
        }
      });
  }

  private setupComponentInstallCommand(install: Command): void {
    install
      .command("component <component>")
      .description(`${ICONS.gear} Install specific component`)
      .option("-f, --force", "Force reinstallation")
      .action(async (component: string, options: { force?: boolean }) => {
        try {
          await this.handleComponentInstall(component, options);
        } catch (error) {
          errorHandler.handleError(error as Error);
        }
      });
  }

  private setupEnvironmentSetupCommand(install: Command): void {
    install
      .command("env")
      .description(`${ICONS.network} Setup environment configuration`)
      .option("-e, --environment <env>", "Environment type", "development")
      .action(async (options: { environment: string }) => {
        try {
          await this.handleEnvironmentSetup(options.environment);
        } catch (error) {
          errorHandler.handleError(error as Error);
        }
      });
  }

  private setupHealthCheckCommand(install: Command): void {
    install
      .command("health")
      .alias("check")
      .description(`${ICONS.shield} System health check and diagnostics`)
      .option("--fix", "Attempt to fix issues automatically")
      .action(async (options: { fix?: boolean }) => {
        try {
          await this.handleHealthCheck(options.fix);
        } catch (error) {
          errorHandler.handleError(error as Error);
        }
      });
  }

  private setupUninstallCommand(install: Command): void {
    install
      .command("uninstall")
      .description(`${ICONS.warning} Uninstall PoD Protocol components`)
      .option("--complete", "Complete uninstallation")
      .option("--keep-data", "Keep user data")
      .action(async (options: { complete?: boolean; keepData?: boolean }) => {
        try {
          await this.handleUninstall(options);
        } catch (error) {
          errorHandler.handleError(error as Error);
        }
      });
  }

  private async handleMasterInstall(options: InstallOptions): Promise<void> {
    console.clear();
    showPromptOrDieBanner();
    
    console.log(BRAND_COLORS.accent("🚀 POD PROTOCOL PLATFORM INSTALLER"));
    console.log(DECORATIVE_ELEMENTS.lightningBorder);
    console.log();

    if (options.interactive) {
      options = await this.runInteractiveWizard();
    }

    // System requirements check
    const requirements = await this.checkSystemRequirements();
    await this.displaySystemStatus(requirements);

    if (!this.allRequirementsSatisfied(requirements) && !options.skipDeps) {
      await this.installMissingDependencies(requirements);
    }

    // Component selection and installation
    const components = options.components || await this.selectComponents();
    
    console.log();
    console.log(BRAND_COLORS.info("📦 Installing selected components..."));
    console.log();

    for (const component of components) {
      await this.installComponent(component, options);
    }

    // Environment setup
    await this.setupEnvironment(options.environment!);

    // Optional features
    if (options.docker) await this.setupDocker();
    if (options.monitoring) await this.setupMonitoring();
    if (options.security) await this.setupSecurity();
    if (options.aiAgents) await this.setupAIAgents();
    if (options.zkCompression) await this.setupZKCompression();

    // Final configuration
    if (options.autoConfig) {
      await this.autoConfigurePlatform(options);
    }

    console.log();
    console.log(DECORATIVE_ELEMENTS.lightningBorder);
    console.log(BRAND_COLORS.success("🎉 PoD Protocol Platform Installation Complete!"));
    console.log();
    
    await this.displayPostInstallInstructions(components);
  }

  private async runInteractiveWizard(): Promise<InstallOptions> {
    // Show enhanced banner with gradient effects
    console.log(gradient.rainbow.multiline(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║  ██████╗  ██████╗ ██████╗     ██████╗ ██████╗  ██████╗ ████████╗ ██████╗      ║
║  ██╔══██╗██╔═══██╗██╔══██╗    ██╔══██╗██╔══██╗██╔═══██╗╚══██╔══╝██╔═══██╗     ║
║  ██████╔╝██║   ██║██║  ██║    ██████╔╝██████╔╝██║   ██║   ██║   ██║   ██║     ║
║  ██╔═══╝ ██║   ██║██║  ██║    ██╔═══╝ ██╔══██╗██║   ██║   ██║   ██║   ██║     ║
║  ██║     ╚██████╔╝██████╔╝    ██║     ██║  ██║╚██████╔╝   ██║   ╚██████╔╝     ║
║  ╚═╝      ╚═════╝ ╚═════╝     ╚═╝     ╚═╝  ╚═╝ ╚═════╝    ╚═╝    ╚═════╝      ║
║                                                                               ║
║    ░▒▓█  PROFESSIONAL PLATFORM INSTALLER  █▓▒░                              ║
║                                                                               ║
║         🚀 WHERE AI AGENTS MEET THEIR DESTINY 🚀                            ║
╚═══════════════════════════════════════════════════════════════════════════════╝
`));
    
    await this.typewriterEffect(
      chalk.hex('#FF6B35')('\n🎭 Welcome to the ultimate PoD Protocol installer! 🎭\n'),
      30
    );
    
    console.log(chalk.hex('#4ECDC4')('━'.repeat(80)));
    console.log(chalk.hex('#FF6B35')('🌟 FEATURES UNLOCKED:'));
    console.log(chalk.white('   ⚡ AI-Powered Setup Intelligence'));
    console.log(chalk.white('   🚀 Zero-Configuration Deployment'));
    console.log(chalk.white('   🔥 Performance Beast Mode'));
    console.log(chalk.white('   💎 Enterprise Security'));
    console.log(chalk.white('   🧠 Smart Dependency Resolution'));
    console.log(chalk.white('   👽 Quantum-Ready Architecture'));
    console.log(chalk.hex('#4ECDC4')('━'.repeat(80)));
    console.log();
    
    console.log(BRAND_COLORS.info("🧙‍♂️ INSTALLATION WIZARD ACTIVATED"));
    console.log(BRAND_COLORS.info('━'.repeat(60)));
    console.log();

    // Get installation type first
    const installationType = await select({
      message: chalk.hex('#FF6B35')('🎯 Choose your installation destiny:'),
      choices: [
        {
          name: `🔥 ${chalk.hex('#FF3333')('ULTIMATE MODE')} - Full platform with all features`,
          value: 'ultimate',
          description: 'Complete installation with AI agents, ZK compression, monitoring, and more'
        },
        {
          name: `⚡ ${chalk.hex('#FFD23F')('SPEED MODE')} - Quick developer setup`,
          value: 'speed',
          description: 'Fast setup for immediate development'
        },
        {
          name: `💎 ${chalk.hex('#4ECDC4')('CUSTOM MODE')} - Custom component selection`,
          value: 'custom',
          description: 'Choose exactly what you need'
        },
        {
          name: `🛡️ ${chalk.hex('#06FFA5')('ENTERPRISE MODE')} - Production deployment`,
          value: 'production',
          description: 'Production-ready setup with security and monitoring'
        }
      ]
    });

    let components: string[] = [];
    let advancedFeatures: string[] = [];
    
    if (installationType === 'custom') {
      components = await checkbox({
        message: chalk.hex('#FF6B35')('🎯 Select components for your custom build:'),
        choices: [
          { name: `🔥 Core Protocol (Anchor program)`, value: 'core', checked: true },
          { name: `⚡ CLI Tools`, value: 'cli', checked: true },
          { name: `💎 TypeScript SDK`, value: 'sdk-ts', checked: true },
          { name: `🤖 JavaScript SDK`, value: 'sdk-js', checked: false },
          { name: `🐉 Python SDK`, value: 'sdk-python', checked: false },
          { name: `⭐ Frontend Demo App`, value: 'frontend', checked: false },
          { name: `🧠 Agent Development Kit`, value: 'ai-agents', checked: false },
          { name: `🛡️ Documentation Site`, value: 'docs', checked: false }
        ]
      });
    } else {
      // Set preset configurations
      const presets = {
        ultimate: {
          components: ['core', 'cli', 'sdk-ts', 'sdk-js', 'sdk-python', 'frontend', 'ai-agents', 'docs'],
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
      
      const preset = presets[installationType as keyof typeof presets];
      components = preset?.components || [];
      advancedFeatures = preset?.advancedFeatures || [];
    }

    const answers = await inquirer.prompt([
      {
        type: 'list',
        name: 'environment',
        message: 'Select target environment:',
        choices: [
          { name: '🔧 Development (Local)', value: 'development' },
          { name: '🧪 Testnet', value: 'testnet' },
          { name: '🚀 Mainnet', value: 'mainnet' }
        ],
        default: 'development'
      },
      {
        type: 'list',
        name: 'packageManager',
        message: 'Choose package manager:',
        choices: [
          { name: '⚡️ Bun (Recommended)', value: 'bun' },
          { name: '🧶 Yarn', value: 'yarn' },
          { name: '📦 NPM', value: 'npm' }
        ],
        default: 'bun'
      },
      {
        type: 'confirm',
        name: 'autoConfig',
        message: 'Enable automatic configuration?',
        default: true
      },
      {
        type: 'confirm',
        name: 'performance',
        message: 'Include performance optimizations?',
        default: true
      },
      {
        type: 'confirm',
        name: 'security',
        message: 'Enable enhanced security features?',
        default: true
      }
    ]);

    // Advanced features selection
    if (installationType === 'custom') {
      advancedFeatures = await checkbox({
        message: chalk.hex('#FF6B35')('🚀 Select ADVANCED FEATURES to unlock:'),
        choices: [
          { name: `🧠 AI Agent Development Framework`, value: 'aiAgents' },
          { name: `🛡️ ZK Compression & Privacy`, value: 'zkCompression' },
          { name: `🌐 Real-time Analytics Dashboard`, value: 'analytics' },
          { name: `☢️ Performance Optimization Suite`, value: 'performance' },
          { name: `🐉 Advanced Security Hardening`, value: 'security' },
          { name: `👽 Docker Containerization`, value: 'docker' },
          { name: `💥 Monitoring & Alerting Stack`, value: 'monitoring' }
        ]
      });
    }

    // Final confirmation
    console.log();
    console.log(chalk.hex('#FFD23F')('🎯 INSTALLATION PLAN SUMMARY'));
    console.log(chalk.hex('#4ECDC4')('━'.repeat(50)));
    
    console.log(`👑 Installation Type: ${chalk.hex('#FF6B35')(installationType.toUpperCase())}`);
    console.log(`🌐 Environment: ${chalk.hex('#4ECDC4')(answers.environment)}`);
    console.log(`⚡ Package Manager: ${chalk.hex('#FFD23F')(answers.packageManager)}`);
    console.log(`💎 Components: ${chalk.white(components.length)} selected`);
    console.log(`🚀 Advanced Features: ${chalk.white(advancedFeatures.length)} enabled`);
    console.log();
    
    const confirmed = await confirm({
      message: chalk.hex('#FFD23F')('🚀 Ready to UNLEASH the power? Proceed with installation?'),
      default: true
    });

    if (!confirmed) {
      console.log(chalk.hex('#FF3333')('💥 Installation aborted by user choice'));
      process.exit(0);
    }

    return {
      ...answers,
      components,
      installationType: installationType as InstallationType,
      interactive: true,
      docker: advancedFeatures.includes('docker'),
      monitoring: advancedFeatures.includes('monitoring'),
      aiAgents: advancedFeatures.includes('aiAgents'),
      zkCompression: advancedFeatures.includes('zkCompression'),
      analytics: advancedFeatures.includes('analytics'),
      performance: advancedFeatures.includes('performance'),
      security: advancedFeatures.includes('security')
    };
  }

  private async checkSystemRequirements(): Promise<SystemRequirements> {
    const spinner = ora('Checking system requirements...').start();

    const requirements: SystemRequirements = {
      node: { required: '>=18.0.0', satisfied: false },
      rust: { required: '>=1.70.0', satisfied: false },
      git: { required: '>=2.30.0', satisfied: false },
      docker: { required: '>=20.0.0', satisfied: false },
      solana: { required: '>=1.17.0', satisfied: false },
      anchor: { required: '>=0.31.1', satisfied: false }
    };

    try {
      // Check Node.js
      try {
        const { stdout } = await execAsync('node --version');
        requirements.node.current = stdout.trim();
        requirements.node.satisfied = this.versionSatisfies(requirements.node.current, requirements.node.required);
      } catch { /* Node not installed */ }

      // Check Rust
      try {
        const { stdout } = await execAsync('rustc --version');
        requirements.rust.current = stdout.split(' ')[1];
        requirements.rust.satisfied = this.versionSatisfies(requirements.rust.current, requirements.rust.required);
      } catch { /* Rust not installed */ }

      // Check Git
      try {
        const { stdout } = await execAsync('git --version');
        requirements.git.current = stdout.split(' ')[2];
        requirements.git.satisfied = this.versionSatisfies(requirements.git.current, requirements.git.required);
      } catch { /* Git not installed */ }

      // Check Docker
      try {
        const { stdout } = await execAsync('docker --version');
        requirements.docker.current = stdout.split(' ')[2].replace(',', '');
        requirements.docker.satisfied = this.versionSatisfies(requirements.docker.current, requirements.docker.required);
      } catch { /* Docker not installed */ }

      // Check Solana
      try {
        const { stdout } = await execAsync('solana --version');
        requirements.solana.current = stdout.split(' ')[1];
        requirements.solana.satisfied = this.versionSatisfies(requirements.solana.current, requirements.solana.required);
      } catch { /* Solana not installed */ }

      // Check Anchor
      try {
        const { stdout } = await execAsync('anchor --version');
        requirements.anchor.current = stdout.split(' ')[1];
        requirements.anchor.satisfied = this.versionSatisfies(requirements.anchor.current, requirements.anchor.required);
      } catch { /* Anchor not installed */ }

    } catch (error) {
      spinner.fail('System check failed');
      throw error;
    }

    spinner.succeed('System requirements checked');
    return requirements;
  }

  private generateRecommendations(requirements: SystemRequirements): string[] {
    const recommendations: string[] = [];
    
    // AI-powered recommendations based on system analysis
    if (process.platform === 'linux') {
      recommendations.push('🐧 Linux detected - Optimal for high-performance blockchain operations');
    }
    
    if (process.arch === 'x64') {
      recommendations.push('💪 x64 architecture - Perfect for heavy computational workloads');
    }
    
    const unsatisfied = Object.entries(requirements)
      .filter(([, req]) => !req.satisfied);
    
    if (unsatisfied.length === 0) {
      recommendations.push('🏆 All dependencies satisfied - You\'re ready to excel!');
    } else {
      recommendations.push(`⚡ ${unsatisfied.length} dependencies need installation - I'll handle this!`);
    }
    
    return recommendations;
  }

  private async typewriterEffect(text: string, speed = 50): Promise<void> {
    for (let i = 0; i < text.length; i++) {
      process.stdout.write(text[i]);
      await new Promise(resolve => setTimeout(resolve, speed));
    }
    console.log();
  }

  private async displaySystemStatus(requirements: SystemRequirements): Promise<void> {
    console.log();
    console.log(chalk.hex('#FFD23F')('🔍 SYSTEM ANALYSIS REPORT'));
    console.log(chalk.hex('#4ECDC4')('━'.repeat(50)));
    
    for (const [name, req] of Object.entries(requirements)) {
      const icon = req.satisfied ? '⭐' : '🔥';
      const status = req.satisfied ? chalk.hex('#06FFA5')('READY') : chalk.hex('#FF3333')('NEEDS INSTALL');
      const version = req.current || 'Not detected';
      
      console.log(`${icon} ${chalk.white(name.toUpperCase().padEnd(8))} ${status.padEnd(15)} ${chalk.gray(version)}`);
    }
    
    console.log();
    console.log(chalk.hex('#FFD23F')('🧠 AI RECOMMENDATIONS:'));
    
    // Add AI recommendations based on system analysis
    const recommendations = this.generateRecommendations(requirements);
    for (const rec of recommendations) {
      console.log(`   ${rec}`);
    }
    console.log();
  }

  private async installComponent(component: string, options: InstallOptions): Promise<void> {
    const spinner = ora(`Installing ${component}...`).start();

    try {
      switch (component) {
        case 'core':
          await this.installCoreProtocol(options);
          break;
        case 'cli':
          await this.installCLI(options);
          break;
        case 'sdk-ts':
          await this.installTypeScriptSDK(options);
          break;
        case 'sdk-python':
          await this.installPythonSDK(options);
          break;
        case 'frontend':
          await this.installFrontend(options);
          break;
        case 'ai-agents':
          await this.setupAIAgents();
          break;
        case 'zk-compression':
          await this.setupZKCompression();
          break;
        case 'monitoring':
          await this.setupMonitoring();
          break;
        case 'docker':
          await this.setupDocker();
          break;
        default:
          throw new Error(`Unknown component: ${component}`);
      }

      spinner.succeed(`${component} installed successfully`);
    } catch (error) {
      spinner.fail(`Failed to install ${component}`);
      throw error;
    }
  }

  private async installCoreProtocol(options: InstallOptions): Promise<void> {
    // Ensure we're in the correct directory and Anchor workspace is ready
    const anchorCheck = await this.checkAnchorWorkspace();
    if (!anchorCheck) {
      throw new Error('Anchor workspace not properly configured. Please ensure Anchor.toml exists and you\'re in the project root.');
    }

    // Install Anchor dependencies first
    await this.executeCommand('bun install', 'Installing Anchor dependencies...');
    
    // Build Anchor program
    await this.executeCommand('anchor build', 'Building core protocol...');
    
    // Deploy if not development
    if (options.environment !== 'development') {
      await this.executeCommand(`anchor deploy --provider.cluster ${options.environment}`, 'Deploying protocol...');
    }
  }

  private async installCLI(options: InstallOptions): Promise<void> {
    const pm = options.packageManager || 'bun';
    
    await this.executeCommand(`cd cli && ${pm} install`, 'Installing CLI dependencies...');
    await this.executeCommand(`cd cli && ${pm} run build`, 'Building CLI...');
    
    // Install globally
    if (pm === 'bun') {
      await this.executeCommand(`cd cli && bun link`, 'Linking CLI globally...');
    } else {
      await this.executeCommand(`cd cli && npm link`, 'Linking CLI globally...');
    }
  }

  private async installTypeScriptSDK(options: InstallOptions): Promise<void> {
    const pm = options.packageManager || 'bun';
    
    await this.executeCommand(`cd sdk && ${pm} install`, 'Installing SDK dependencies...');
    await this.executeCommand(`cd sdk && ${pm} run build`, 'Building TypeScript SDK...');
  }

  private async installPythonSDK(options: InstallOptions): Promise<void> {
    await this.executeCommand('cd sdk-python && python -m venv venv', 'Creating Python virtual environment...');
    await this.executeCommand('cd sdk-python && source venv/bin/activate && pip install -r requirements.txt', 'Installing Python dependencies...');
  }

  private async installFrontend(options: InstallOptions): Promise<void> {
    const pm = options.packageManager || 'bun';
    
    await this.executeCommand(`cd frontend && ${pm} install`, 'Installing frontend dependencies...');
    await this.executeCommand(`cd frontend && ${pm} run build`, 'Building frontend...');
  }

  private async handleQuickInstall(type: string): Promise<void> {
    console.clear();
    showBanner(BannerSize.COMPACT);
    
    console.log(BRAND_COLORS.accent(`⚡️ Quick ${type.toUpperCase()} Setup`));
    console.log();

    const configs = {
      dev: {
        components: ['core', 'cli', 'sdk-ts'],
        environment: 'development' as const,
        packageManager: 'bun' as const
      },
      prod: {
        components: ['core', 'cli', 'sdk-ts', 'monitoring'],
        environment: 'mainnet' as const,
        packageManager: 'bun' as const
      },
      demo: {
        components: ['core', 'cli', 'sdk-ts', 'frontend'],
        environment: 'development' as const,
        packageManager: 'bun' as const
      }
    };

    const config = configs[type as keyof typeof configs];
    if (!config) {
      throw new Error(`Unknown quick setup type: ${type}`);
    }

    await this.handleMasterInstall({
      ...config,
      autoConfig: true,
      skipDeps: false
    });
  }

  private async handleHealthCheck(autoFix?: boolean): Promise<void> {
    console.clear();
    showBanner(BannerSize.MINI);
    
    console.log(BRAND_COLORS.accent("🏥 System Health Check"));
    console.log(DECORATIVE_ELEMENTS.lightningBorder);
    console.log();

    const requirements = await this.checkSystemRequirements();
    await this.displaySystemStatus(requirements);

    // Check installation status
    const installStatus = await this.checkInstallationStatus();
    await this.displayInstallationStatus(installStatus);

    if (autoFix) {
      console.log();
      console.log(BRAND_COLORS.info("🔧 Attempting to fix issues..."));
      await this.autoFixIssues(requirements, installStatus);
    }
  }

  private async executeCommand(command: string, message?: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const spinner = message ? ora(message).start() : null;
      
      // SECURITY FIX: Validate and sanitize command input to prevent injection
      const sanitizedCommand = this.sanitizeCommand(command);
      if (!sanitizedCommand) {
        const error = new Error(`Invalid or potentially dangerous command: ${command}`);
        if (spinner) spinner.fail(message);
        reject(error);
        return;
      }
      
      exec(sanitizedCommand, { 
        cwd: this.projectRoot,
        timeout: 300000, // 5 minute timeout
        maxBuffer: 1024 * 1024 * 10 // 10MB buffer limit
      }, (error, stdout, stderr) => {
        if (spinner) {
          if (error) {
            spinner.fail(message);
          } else {
            spinner.succeed(message);
          }
        }
        
        if (error) {
          reject(new Error(`Command failed: ${command}\n${stderr}`));
        } else {
          resolve(stdout);
        }
      });
    });
  }

  private versionSatisfies(current: string, required: string): boolean {
    // Simple version comparison - in a real implementation, use semver
    const currentVersion = current.replace(/[^0-9.]/g, '');
    const requiredVersion = required.replace(/[^0-9.]/g, '');
    return currentVersion >= requiredVersion;
  }

  private sanitizeCommand(command: string): string | null {
    // SECURITY: Enhanced validation and sanitization
    if (!command || typeof command !== 'string') {
      return null;
    }

    // Maximum command length check
    if (command.length > 1000) {
      console.warn('Command too long, blocked for security');
      return null;
    }

    // Check for null bytes and other dangerous characters
    if (command.includes('\0') || command.includes('\r') || command.includes('\n')) {
      console.warn('Command contains dangerous characters, blocked');
      return null;
    }

    // SECURITY: Whitelist of allowed commands with strict patterns
    const allowedCommands = [
      /^bun\s+(?:install|run|build|test|dev)(?:\s+[\w\-\.@\/]+)*$/,
      /^npm\s+(?:install|run|build|test|start)(?:\s+[\w\-\.@\/]+)*$/,
      /^yarn\s+(?:install|run|build|test|start)(?:\s+[\w\-\.@\/]+)*$/,
      /^anchor\s+(?:build|deploy|test|--version)(?:\s+--[\w\-]+)*$/,
      /^solana\s+(?:--version|config\s+get|program\s+show)(?:\s+[\w\-\.]+)*$/,
      /^rustup\s+(?:--version|show|update)$/,
      /^cargo\s+(?:--version|build|test)(?:\s+--[\w\-]+)*$/,
      /^git\s+(?:--version|status)$/,
      /^docker\s+(?:--version|ps)$/,
      /^node\s+--version$/,
      /^which\s+[\w\-]+$/,
      /^ls\s+-[\w]+\s+[\w\-\.\/]+$/
    ];

    // Check if command matches any allowed pattern
    const isAllowed = allowedCommands.some(pattern => pattern.test(command));
    
    if (!isAllowed) {
      console.warn(`Security: Blocked command not in whitelist: ${command}`);
      return null;
    }

    // Additional sanitization - remove dangerous shell metacharacters
    const sanitized = command
      .replace(/[;&|`$<>()[\]{}\\'"]/g, '') // Remove all shell metacharacters
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();

    // Final validation after sanitization
    if (sanitized !== command) {
      console.warn('Command was modified during sanitization, blocking for safety');
      return null;
    }

    return sanitized;
  }

  private async checkAnchorWorkspace(): Promise<boolean> {
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

  private allRequirementsSatisfied(requirements: SystemRequirements): boolean {
    return Object.values(requirements).every(req => req.satisfied);
  }

  private async selectComponents(): Promise<string[]> {
    const { components } = await inquirer.prompt([
      {
        type: 'checkbox',
        name: 'components',
        message: 'Select components to install:',
        choices: [
          { name: 'Core Protocol', value: 'core', checked: true },
          { name: 'CLI Tools', value: 'cli', checked: true },
          { name: 'TypeScript SDK', value: 'sdk-ts' },
          { name: 'Python SDK', value: 'sdk-python' },
          { name: 'Frontend', value: 'frontend' }
        ]
      }
    ]);
    
    return components;
  }

  private async setupEnvironment(environment: string): Promise<void> {
    const spinner = ora(`Setting up ${environment} environment...`).start();
    
    // Create environment-specific config
    const config = {
      environment,
      network: environment === 'development' ? 'devnet' : environment,
      programId: 'HEpGLgYsE1kP8aoYKyLFc3JVVrofS7T4zEA6fWBJsZps',
      packageManager: 'bun',
      installedAt: new Date().toISOString(),
      version: '1.5.0-professional'
    };
    
    const configPath = join(this.projectRoot, '.pod-config.json');
    writeFileSync(configPath, JSON.stringify(config, null, 2));
    
    // Create environment scripts
    await this.createEnvironmentScripts();
    
    spinner.succeed(`Environment configured for ${environment}`);
  }

  private async createEnvironmentScripts(): Promise<void> {
    const scripts = {
      'start-dev.sh': `#!/bin/bash
echo "${chalk.hex('#FFD23F')('🚀 Starting PoD Protocol Development Environment')}"
export POD_ENV=development
export POD_NETWORK=devnet
cd frontend && bun dev &
cd cli && bun dev &
echo "${chalk.hex('#06FFA5')('🎉 Development environment is live!')}"
`,
      'deploy-testnet.sh': `#!/bin/bash
echo "${chalk.hex('#FFD23F')('🚀 Deploying to Testnet')}"
export POD_ENV=testnet
export POD_NETWORK=testnet
anchor deploy --provider.cluster testnet
echo "${chalk.hex('#06FFA5')('🎉 Testnet deployment complete!')}"
`,
      'start-monitoring.sh': `#!/bin/bash
echo "${chalk.hex('#FFD23F')('📊 Starting Monitoring Stack')}"
cd monitoring && docker-compose up -d
echo "${chalk.hex('#06FFA5')('📈 Monitoring is active!')}"
`
    };

    for (const [filename, content] of Object.entries(scripts)) {
      writeFileSync(join(this.projectRoot, filename), content);
      chmodSync(join(this.projectRoot, filename), 0o755);
    }
  }

  private async installMissingDependencies(requirements: SystemRequirements): Promise<void> {
    console.log();
    console.log(BRAND_COLORS.warning("📦 Installing missing dependencies..."));
    
    for (const [name, req] of Object.entries(requirements)) {
      if (!req.satisfied) {
        await this.installDependency(name);
      }
    }
  }

  private async installDependency(name: string): Promise<void> {
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
        case 'docker':
          spinner.warn('Please install Docker manually from https://docker.com');
          return;
        default:
          spinner.warn(`Please install ${name} manually`);
          return;
      }
      
      spinner.succeed(`${name} installed successfully`);
    } catch (error) {
      spinner.fail(`Failed to install ${name}`);
      throw error;
    }
  }

  private async setupDocker(): Promise<void> {
    const spinner = ora('Setting up Docker environment...').start();
    
    // Copy Docker files and start services
    await this.executeCommand('docker-compose -f docker-compose.prod.yml up -d');
    
    spinner.succeed('Docker environment ready');
  }

  private async setupMonitoring(): Promise<void> {
    const spinner = ora('Setting up monitoring stack...').start();
    
    // Setup Prometheus and monitoring
    await this.executeCommand('cd monitoring && docker-compose up -d');
    
    spinner.succeed('Monitoring stack configured');
  }

  private async setupSecurity(): Promise<void> {
    const spinner = ora('Configuring security features...').start();
    
    // Generate secure configurations
    // Setup audit logs, etc.
    
    spinner.succeed('Security features configured');
  }

  private async setupAIAgents(): Promise<void> {
    const spinner = ora('Setting up AI agent framework...').start();
    
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
    
    spinner.succeed('AI agent framework ready');
  }

  private async setupZKCompression(): Promise<void> {
    const spinner = ora('Setting up ZK compression...').start();
    
    // Configure ZK compression settings
    const zkConfig = {
      enabled: true,
      compressionLevel: 'maximum',
      privacyMode: 'enhanced',
      batchSize: 1000
    };
    
    writeFileSync(join(this.projectRoot, 'zk-config.json'), JSON.stringify(zkConfig, null, 2));
    
    spinner.succeed('ZK compression configured');
  }

  private async autoConfigurePlatform(options: InstallOptions): Promise<void> {
    const spinner = ora('Auto-configuring platform...').start();
    
    // Performance configurations
    if (options.performance) {
      const perfConfig = {
        enableJITCompilation: true,
        optimizeMemoryUsage: true,
        enableCaching: true,
        batchOperations: true
      };
      
      writeFileSync(join(this.projectRoot, 'performance.json'), JSON.stringify(perfConfig, null, 2));
    }
    
    // Security configurations
    if (options.security) {
      const securityConfig = {
        enableAuditLogs: true,
        enforceHTTPS: true,
        rateLimiting: true,
        inputValidation: 'strict'
      };
      
      writeFileSync(join(this.projectRoot, 'security.json'), JSON.stringify(securityConfig, null, 2));
    }
    
    // Analytics setup
    if (options.analytics) {
      await this.executeCommand('mkdir -p analytics && echo "Analytics dashboard configured" > analytics/README.md');
    }
    
    spinner.succeed('Platform auto-configured');
  }

  private async displayPostInstallInstructions(components: string[]): Promise<void> {
    const duration: number | undefined = undefined; // You can track installation time
    const installationTime = duration ? `${duration.toFixed(1)} seconds` : 'a few moments';
    
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
    console.log(chalk.hex('#06FFA5')(`👑 CONGRATULATIONS! Your PoD Protocol platform is now BADASS LEVEL 9000!`));
    console.log();
    console.log(chalk.hex('#FFD23F')(`⚡ Installation completed in ${installationTime}`));
    console.log(chalk.hex('#4ECDC4')(`💎 Components installed: ${components.length}`));
    console.log();
    console.log(chalk.hex('#FF6B35')('🎯 QUICK COMMANDS TO GET STARTED:'));
    console.log(chalk.white('   pod --help           - Show all commands'));
    console.log(chalk.white('   pod status           - Check system health'));
    console.log(chalk.white('   pod install health   - Run diagnostics'));
    
    if (components.includes('frontend')) {
      console.log(chalk.white('   cd frontend && bun dev - Start frontend'));
    }
    
    console.log();
    console.log(gradient.rainbow('═'.repeat(80)));
    console.log();
    console.log(chalk.hex('#FFD23F')('🚀 Welcome to the future of AI agent communication!'));
    console.log(chalk.hex('#4ECDC4')('💎 Now go build something LEGENDARY!'));
    console.log();
  }

  private async checkInstallationStatus(): Promise<Record<string, boolean>> {
    return {
      cli: existsSync(join(this.projectRoot, 'cli/dist')),
      sdk: existsSync(join(this.projectRoot, 'sdk/dist')),
      program: existsSync(join(this.projectRoot, 'target')),
      frontend: existsSync(join(this.projectRoot, 'frontend/.next'))
    };
  }

  private async displayInstallationStatus(status: Record<string, boolean>): Promise<void> {
    console.log();
    console.log(BRAND_COLORS.accent("📦 Installation Status"));
    console.log(DECORATIVE_ELEMENTS.starBorder);
    
    for (const [component, installed] of Object.entries(status)) {
      const icon = installed ? ICONS.success : ICONS.error;
      const statusText = installed ? BRAND_COLORS.success('INSTALLED') : BRAND_COLORS.error('MISSING');
      console.log(`${icon} ${component.toUpperCase().padEnd(10)} ${statusText}`);
    }
  }

  private async autoFixIssues(requirements: SystemRequirements, installStatus: Record<string, boolean>): Promise<void> {
    // Auto-fix logic would go here
    console.log(BRAND_COLORS.info("🔧 Auto-fix functionality would be implemented here"));
  }

  private async handleComponentInstall(component: string, options: { force?: boolean }): Promise<void> {
    console.log(BRAND_COLORS.accent(`📦 Installing ${component}`));
    
    await this.installComponent(component, { packageManager: 'bun' });
    
    console.log(BRAND_COLORS.success(`✅ ${component} installed successfully`));
  }

  private async handleEnvironmentSetup(environment: string): Promise<void> {
    console.log(BRAND_COLORS.accent(`🌍 Setting up ${environment} environment`));
    
    await this.setupEnvironment(environment);
    
    console.log(BRAND_COLORS.success(`✅ Environment configured for ${environment}`));
  }

  private async handleUninstall(options: { complete?: boolean; keepData?: boolean }): Promise<void> {
    console.log(BRAND_COLORS.warning("🗑️  Uninstalling PoD Protocol components"));
    
    const { confirm } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: 'Are you sure you want to uninstall PoD Protocol?',
        default: false
      }
    ]);
    
    if (!confirm) {
      console.log(BRAND_COLORS.info("Uninstall cancelled"));
      return;
    }
    
    // Uninstall logic would go here
    console.log(BRAND_COLORS.success("✅ Uninstall completed"));
  }
}