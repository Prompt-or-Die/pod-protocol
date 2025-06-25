#!/usr/bin/env node

// Interactive setup script for PoD Protocol
import { checkbox, input, select, confirm } from '@inquirer/prompts';
import { spawn } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';

// Get the directory where this script is located
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const scriptDir = __dirname;

console.log(chalk.blue.bold('\n🚀 Welcome to PoD Protocol Setup!\n'));
console.log(chalk.gray('This interactive setup will help you configure your PoD Protocol environment.\n'));

async function main() {
  try {
    // Ask what components to set up
    const components = await checkbox({
      message: 'Select components to set up:',
      choices: [
        { name: 'Core Protocol', value: 'core', checked: true },
        { name: 'CLI Tools', value: 'cli', checked: true },
        { name: 'SDK (JavaScript)', value: 'sdk-js', checked: false },
        { name: 'SDK (Python)', value: 'sdk-python', checked: false },
        { name: 'Frontend Demo', value: 'frontend', checked: false },
        { name: 'Development Environment', value: 'dev', checked: false }
      ]
    });

    // Ask for environment type
    const environment = await select({
      message: 'Select your target environment:',
      choices: [
        { name: 'Development (Local)', value: 'development' },
        { name: 'Testnet', value: 'testnet' },
        { name: 'Mainnet', value: 'mainnet' }
      ],
      default: 'development'
    });

    // Ask about package manager preference
    const packageManager = await select({
      message: 'Select your preferred package manager:',
      choices: [
        { name: 'npm', value: 'npm' },
        { name: 'yarn', value: 'yarn' },
        { name: 'bun', value: 'bun' }
      ],
      default: 'npm'
    });

    // Confirm setup
    const proceed = await confirm({
      message: `Proceed with setup for ${environment} environment using ${packageManager}?`,
      default: true
    });

    if (!proceed) {
      console.log(chalk.yellow('\n⚠️  Setup cancelled.'));
      process.exit(0);
    }

    console.log(chalk.green('\n✅ Starting setup...\n'));

    // Run the main setup script
    const installScript = join(scriptDir, 'install.sh');
    const child = spawn('bash', [installScript], {
      stdio: 'inherit',
      cwd: scriptDir,
      env: {
        ...process.env,
        POD_COMPONENTS: components.join(','),
        POD_ENVIRONMENT: environment,
        POD_PACKAGE_MANAGER: packageManager
      }
    });

    child.on('error', (error) => {
      console.error(chalk.red('\n❌ Error running setup:'), error.message);
      process.exit(1);
    });

    child.on('exit', (code) => {
      if (code === 0) {
        console.log(chalk.green('\n🎉 Setup completed successfully!'));
        console.log(chalk.blue('\nNext steps:'));
        console.log(chalk.gray('  1. Run `pod --help` to see available commands'));
        console.log(chalk.gray('  2. Check the documentation at docs/'));
        console.log(chalk.gray('  3. Start building with PoD Protocol!\n'));
      } else {
        console.error(chalk.red(`\n❌ Setup failed with exit code ${code}`));
      }
      process.exit(code || 0);
    });

  } catch (error) {
    if (error.name === 'ExitPromptError') {
      console.log(chalk.yellow('\n👋 Setup cancelled by user.'));
      process.exit(0);
    } else {
      console.error(chalk.red('\n❌ Setup error:'), error.message);
      process.exit(1);
    }
  }
}

// Only run if this script is executed directly, not when imported
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}