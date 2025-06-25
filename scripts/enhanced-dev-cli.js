#!/usr/bin/env node

/**
 * 🛠️ PoD Protocol Enhanced Development CLI
 * Advanced development tooling for smooth developer experience
 */

const { Command } = require('commander');
const chalk = require('chalk');
const ora = require('ora');
const inquirer = require('inquirer');
const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const program = new Command();

// Emojis and colors for better UX
const EMOJIS = {
  rocket: '🚀',
  gear: '⚙️',
  check: '✅',
  cross: '❌',
  warning: '⚠️',
  info: 'ℹ️',
  package: '📦',
  wrench: '🔧',
  star: '⭐',
  fire: '🔥',
  lightning: '⚡'
};

const log = {
  success: (msg) => console.log(chalk.green(`${EMOJIS.check} ${msg}`)),
  error: (msg) => console.log(chalk.red(`${EMOJIS.cross} ${msg}`)),
  warning: (msg) => console.log(chalk.yellow(`${EMOJIS.warning} ${msg}`)),
  info: (msg) => console.log(chalk.blue(`${EMOJIS.info} ${msg}`)),
  header: (msg) => console.log(chalk.magenta.bold(`\n${EMOJIS.rocket} ${msg}\n`))
};

// Utility functions
const runCommand = (command, options = {}) => {
  try {
    const result = execSync(command, { 
      encoding: 'utf8', 
      stdio: options.silent ? 'pipe' : 'inherit',
      ...options 
    });
    return result;
  } catch (error) {
    if (!options.silent) {
      log.error(`Command failed: ${command}`);
    }
    throw error;
  }
};

const checkCommand = (command) => {
  try {
    execSync(`which ${command}`, { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
};

const getProjectRoot = () => {
  let dir = process.cwd();
  while (dir !== path.dirname(dir)) {
    if (fs.existsSync(path.join(dir, 'package.json'))) {
      const pkg = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8'));
      if (pkg.name === 'pod-protocol' || pkg.name === '@pod-protocol/monorepo') {
        return dir;
      }
    }
    dir = path.dirname(dir);
  }
  throw new Error('Not in a PoD Protocol project directory');
};

// Status command
program
  .command('status')
  .description('Check development environment status')
  .action(async () => {
    log.header('Development Environment Status');
    
    const checks = [
      { name: 'Node.js', cmd: 'node --version', required: true },
      { name: 'npm', cmd: 'npm --version', required: true },
      { name: 'Rust', cmd: 'rustc --version', required: false },
      { name: 'Solana CLI', cmd: 'solana --version', required: false },
      { name: 'Anchor', cmd: 'anchor --version', required: false },
      { name: 'Git', cmd: 'git --version', required: true },
      { name: 'Python3', cmd: 'python3 --version', required: false }
    ];
    
    const results = {};
    
    for (const check of checks) {
      try {
        const version = runCommand(check.cmd, { silent: true }).trim();
        results[check.name] = { status: 'installed', version };
        log.success(`${check.name}: ${version}`);
      } catch {
        results[check.name] = { status: 'missing' };
        if (check.required) {
          log.error(`${check.name}: Not installed (Required)`);
        } else {
          log.warning(`${check.name}: Not installed (Optional)`);
        }
      }
    }
    
    // Check project dependencies
    try {
      const projectRoot = getProjectRoot();
      process.chdir(projectRoot);
      
      if (fs.existsSync('node_modules')) {
        log.success('Project dependencies: Installed');
      } else {
        log.warning('Project dependencies: Not installed (Run: npm install)');
      }
      
      // Check if Solana validator is running
      try {
        runCommand('solana cluster-version', { silent: true });
        log.success('Solana connection: Active');
      } catch {
        log.warning('Solana connection: Not connected');
      }
      
    } catch (error) {
      log.error(`Project status: ${error.message}`);
    }
  });

// Quick setup command
program
  .command('setup')
  .description('Quick project setup and dependency installation')
  .option('-f, --full', 'Full setup including system dependencies')
  .action(async (options) => {
    log.header('Quick Project Setup');
    
    try {
      const projectRoot = getProjectRoot();
      process.chdir(projectRoot);
      
      if (options.full) {
        log.info('Running full setup...');
        runCommand('./scripts/enhanced-dev-setup.sh');
      } else {
        log.info('Installing project dependencies...');
        
        // Install Node.js dependencies
        const spinner = ora('Installing npm packages...').start();
        runCommand('npm install', { silent: true });
        spinner.succeed('npm packages installed');
        
        // Build packages
        spinner.text = 'Building packages...';
        spinner.start();
        try {
          runCommand('npm run build:all', { silent: true });
          spinner.succeed('Packages built successfully');
        } catch {
          spinner.warn('Build failed, continuing...');
        }
        
        log.success('Setup completed!');
      }
    } catch (error) {
      log.error(`Setup failed: ${error.message}`);
    }
  });

// Development server command
program
  .command('dev')
  .description('Start development environment')
  .option('-p, --package <package>', 'Start specific package (sdk, cli, frontend)')
  .option('-w, --watch', 'Watch mode for automatic rebuilds')
  .action(async (options) => {
    log.header('Starting Development Environment');
    
    try {
      const projectRoot = getProjectRoot();
      process.chdir(projectRoot);
      
      if (options.package) {
        const packageCommands = {
          sdk: 'npm run dev:sdk',
          cli: 'npm run dev:cli',
          frontend: 'npm run dev:frontend',
          programs: 'npm run dev:programs'
        };
        
        const command = packageCommands[options.package];
        if (command) {
          log.info(`Starting ${options.package} development server...`);
          spawn(command.split(' ')[0], command.split(' ').slice(1), { 
            stdio: 'inherit',
            shell: true 
          });
        } else {
          log.error(`Unknown package: ${options.package}`);
          log.info('Available packages: sdk, cli, frontend, programs');
        }
      } else {
        log.info('Starting all development servers...');
        spawn('npm', ['run', 'dev'], { stdio: 'inherit' });
      }
    } catch (error) {
      log.error(`Failed to start development: ${error.message}`);
    }
  });

// Test command
program
  .command('test')
  .description('Run tests with enhanced options')
  .option('-w, --watch', 'Watch mode')
  .option('-c, --coverage', 'Generate coverage report')
  .option('-p, --package <package>', 'Test specific package')
  .option('-f, --file <pattern>', 'Test specific file pattern')
  .action(async (options) => {
    log.header('Running Tests');
    
    try {
      const projectRoot = getProjectRoot();
      process.chdir(projectRoot);
      
      let command = 'npm test';
      
      if (options.package) {
        command = `npm run test:${options.package}`;
      }
      
      if (options.watch) {
        command += ' -- --watch';
      }
      
      if (options.coverage) {
        command += ' -- --coverage';
      }
      
      if (options.file) {
        command += ` -- --testPathPattern="${options.file}"`;
      }
      
      log.info(`Running: ${command}`);
      runCommand(command);
      
    } catch (error) {
      log.error(`Tests failed: ${error.message}`);
      process.exit(1);
    }
  });

// Build command
program
  .command('build')
  .description('Build packages with enhanced options')
  .option('-p, --package <package>', 'Build specific package')
  .option('-w, --watch', 'Watch mode for continuous building')
  .option('--production', 'Production build')
  .action(async (options) => {
    log.header('Building Packages');
    
    try {
      const projectRoot = getProjectRoot();
      process.chdir(projectRoot);
      
      const spinner = ora('Building...').start();
      
      let command = 'npm run build:all';
      
      if (options.package) {
        command = `npm run build:${options.package}`;
      }
      
      if (options.production) {
        command = 'npm run build:production';
      }
      
      runCommand(command, { silent: true });
      spinner.succeed('Build completed successfully');
      
      if (options.watch) {
        log.info('Starting watch mode...');
        spawn('npm', ['run', 'build:watch'], { stdio: 'inherit' });
      }
      
    } catch (error) {
      log.error(`Build failed: ${error.message}`);
      process.exit(1);
    }
  });

// Solana validator command
program
  .command('validator')
  .description('Manage local Solana validator')
  .option('-s, --start', 'Start validator')
  .option('-k, --kill', 'Stop validator')
  .option('-r, --reset', 'Reset validator state')
  .action(async (options) => {
    if (options.kill) {
      log.info('Stopping Solana validator...');
      try {
        runCommand('pkill solana-test-validator', { silent: true });
        log.success('Validator stopped');
      } catch {
        log.warning('No validator process found');
      }
      return;
    }
    
    if (options.reset) {
      log.info('Resetting validator state...');
      try {
        runCommand('rm -rf test-ledger', { silent: true });
        log.success('Validator state reset');
      } catch {
        log.warning('No validator state to reset');
      }
    }
    
    if (options.start || !options.kill) {
      log.info('Starting Solana validator...');
      const args = [
        '--reset',
        '--quiet',
        '--bpf-program', 'HEpGLgYsE1kP8aoYKyLFc3JVVrofS7T4zEA6fWBJsZps',
        './target/deploy/pod_com.so'
      ];
      
      spawn('solana-test-validator', args, { 
        stdio: 'inherit',
        detached: true 
      });
      
      log.success('Validator starting... (Check logs with: solana logs)');
    }
  });

// Interactive wizard
program
  .command('wizard')
  .description('Interactive development wizard')
  .action(async () => {
    log.header('PoD Protocol Development Wizard');
    
    const answers = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: 'What would you like to do?',
        choices: [
          { name: '🚀 Quick Setup - Install dependencies and build', value: 'setup' },
          { name: '⚡ Start Development - Launch dev environment', value: 'dev' },
          { name: '🧪 Run Tests - Execute test suite', value: 'test' },
          { name: '📦 Build Packages - Build all or specific packages', value: 'build' },
          { name: '🔧 Solana Validator - Manage local validator', value: 'validator' },
          { name: '📊 Status Check - Check environment status', value: 'status' },
          { name: '🛠️ Advanced Tools - More development tools', value: 'advanced' }
        ]
      }
    ]);
    
    switch (answers.action) {
      case 'setup':
        await runSetupWizard();
        break;
      case 'dev':
        await runDevWizard();
        break;
      case 'test':
        await runTestWizard();
        break;
      case 'build':
        await runBuildWizard();
        break;
      case 'validator':
        await runValidatorWizard();
        break;
      case 'status':
        runCommand('node scripts/enhanced-dev-cli.js status');
        break;
      case 'advanced':
        await runAdvancedWizard();
        break;
    }
  });

// Wizard functions
async function runSetupWizard() {
  const answers = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'fullSetup',
      message: 'Do you want to run full system setup (installs system dependencies)?',
      default: false
    }
  ]);
  
  if (answers.fullSetup) {
    runCommand('node scripts/enhanced-dev-cli.js setup --full');
  } else {
    runCommand('node scripts/enhanced-dev-cli.js setup');
  }
}

async function runDevWizard() {
  const answers = await inquirer.prompt([
    {
      type: 'list',
      name: 'package',
      message: 'Which package would you like to develop?',
      choices: [
        { name: '🌐 All packages', value: 'all' },
        { name: '📦 SDK (TypeScript)', value: 'sdk' },
        { name: '💻 CLI', value: 'cli' },
        { name: '🎨 Frontend (Next.js)', value: 'frontend' },
        { name: '🦀 Programs (Rust)', value: 'programs' }
      ]
    }
  ]);
  
  if (answers.package === 'all') {
    runCommand('node scripts/enhanced-dev-cli.js dev');
  } else {
    runCommand(`node scripts/enhanced-dev-cli.js dev --package ${answers.package}`);
  }
}

async function runTestWizard() {
  const answers = await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'options',
      message: 'Test options:',
      choices: [
        { name: 'Watch mode', value: 'watch' },
        { name: 'Coverage report', value: 'coverage' }
      ]
    },
    {
      type: 'list',
      name: 'scope',
      message: 'Test scope:',
      choices: [
        { name: 'All tests', value: 'all' },
        { name: 'SDK tests', value: 'sdk' },
        { name: 'CLI tests', value: 'cli' },
        { name: 'Frontend tests', value: 'frontend' },
        { name: 'Program tests', value: 'programs' }
      ]
    }
  ]);
  
  let command = 'node scripts/enhanced-dev-cli.js test';
  
  if (answers.scope !== 'all') {
    command += ` --package ${answers.scope}`;
  }
  
  if (answers.options.includes('watch')) {
    command += ' --watch';
  }
  
  if (answers.options.includes('coverage')) {
    command += ' --coverage';
  }
  
  runCommand(command);
}

async function runBuildWizard() {
  const answers = await inquirer.prompt([
    {
      type: 'list',
      name: 'scope',
      message: 'What would you like to build?',
      choices: [
        { name: 'All packages', value: 'all' },
        { name: 'SDK only', value: 'sdk' },
        { name: 'CLI only', value: 'cli' },
        { name: 'Frontend only', value: 'frontend' },
        { name: 'Programs only', value: 'programs' }
      ]
    },
    {
      type: 'confirm',
      name: 'production',
      message: 'Production build?',
      default: false
    },
    {
      type: 'confirm',
      name: 'watch',
      message: 'Enable watch mode?',
      default: false
    }
  ]);
  
  let command = 'node scripts/enhanced-dev-cli.js build';
  
  if (answers.scope !== 'all') {
    command += ` --package ${answers.scope}`;
  }
  
  if (answers.production) {
    command += ' --production';
  }
  
  if (answers.watch) {
    command += ' --watch';
  }
  
  runCommand(command);
}

async function runValidatorWizard() {
  const answers = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: 'Validator action:',
      choices: [
        { name: '🚀 Start validator', value: 'start' },
        { name: '🛑 Stop validator', value: 'stop' },
        { name: '🔄 Restart validator', value: 'restart' },
        { name: '🗑️ Reset validator state', value: 'reset' }
      ]
    }
  ]);
  
  switch (answers.action) {
    case 'start':
      runCommand('node scripts/enhanced-dev-cli.js validator --start');
      break;
    case 'stop':
      runCommand('node scripts/enhanced-dev-cli.js validator --kill');
      break;
    case 'restart':
      runCommand('node scripts/enhanced-dev-cli.js validator --kill');
      setTimeout(() => {
        runCommand('node scripts/enhanced-dev-cli.js validator --start');
      }, 2000);
      break;
    case 'reset':
      runCommand('node scripts/enhanced-dev-cli.js validator --reset --start');
      break;
  }
}

async function runAdvancedWizard() {
  const answers = await inquirer.prompt([
    {
      type: 'list',
      name: 'tool',
      message: 'Advanced tools:',
      choices: [
        { name: '🔍 Lint & Format Code', value: 'lint' },
        { name: '📚 Generate Documentation', value: 'docs' },
        { name: '🧹 Clean Build Artifacts', value: 'clean' },
        { name: '🚀 Deploy to Devnet', value: 'deploy' },
        { name: '📊 Bundle Analysis', value: 'analyze' },
        { name: '🔧 Update Dependencies', value: 'update' }
      ]
    }
  ]);
  
  switch (answers.tool) {
    case 'lint':
      runCommand('npm run lint:fix && npm run format');
      break;
    case 'docs':
      runCommand('npm run docs:generate');
      break;
    case 'clean':
      runCommand('npm run clean');
      break;
    case 'deploy':
      runCommand('npm run deploy:devnet');
      break;
    case 'analyze':
      runCommand('npm run analyze');
      break;
    case 'update':
      runCommand('npm update');
      break;
  }
}

// Help command override
program
  .command('help')
  .description('Show detailed help and examples')
  .action(() => {
    console.log(chalk.magenta.bold('\n🚀 PoD Protocol Enhanced Development CLI\n'));
    
    console.log(chalk.cyan('📋 Quick Commands:'));
    console.log('  pod-dev wizard          Interactive development wizard');
    console.log('  pod-dev status          Check environment status');
    console.log('  pod-dev setup           Quick project setup');
    console.log('  pod-dev dev             Start development environment');
    console.log('  pod-dev test            Run tests');
    console.log('  pod-dev build           Build packages');
    console.log('  pod-dev validator       Manage Solana validator');
    
    console.log(chalk.cyan('\n🎯 Examples:'));
    console.log('  pod-dev dev --package sdk       Start SDK development');
    console.log('  pod-dev test --watch --coverage  Run tests with watch and coverage');
    console.log('  pod-dev build --production       Production build');
    console.log('  pod-dev validator --start        Start local validator');
    
    console.log(chalk.cyan('\n🔗 Documentation:'));
    console.log('  📖 Complete docs: docs/README.md');
    console.log('  🚀 Getting started: docs/developer/ONBOARDING_GUIDE.md');
    console.log('  🔗 API reference: docs/api/COMPLETE_API_REFERENCE.md');
    
    console.log(chalk.cyan('\n🆘 Support:'));
    console.log('  💬 Discord: https://discord.gg/pod-protocol');
    console.log('  🐛 Issues: https://github.com/PoD-Protocol/pod-protocol/issues');
    console.log('  📧 Email: dev-support@podprotocol.io\n');
  });

// Main CLI setup
program
  .name('pod-dev')
  .description('🛠️ PoD Protocol Enhanced Development CLI')
  .version('1.0.0');

// Show wizard by default if no command
if (process.argv.length === 2) {
  program.parse(['node', 'pod-dev', 'wizard']);
} else {
  program.parse(process.argv);
}
