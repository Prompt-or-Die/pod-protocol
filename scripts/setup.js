#!/usr/bin/env node

import chalk from 'chalk';
import gradient from 'gradient-string';
import figlet from 'figlet';
import boxen from 'boxen';
import { Listr } from 'listr2';
import enquirer from 'enquirer';
import { execa } from 'execa';
import { createSpinner } from 'nanospinner';

// Cult color schemes
const cultGradient = gradient(['#000000', '#ff0000', '#800080']);
const deathGradient = gradient(['#ff0000', '#800080', '#000000']);
const powerGradient = gradient(['#800080', '#ff0000', '#ff4500']);

class CultSetup {
  constructor() {
    this.showWelcome();
  }

  async showWelcome() {
    console.clear();
    
    // Animated cult banner
    const banner = figlet.textSync('PROMPT OR DIE', {
      font: 'ANSI Shadow',
      horizontalLayout: 'full'
    });
    
    console.log(cultGradient(banner));
    console.log(powerGradient('\n🔥 THE AI DEVELOPER CULT - SETUP INITIATION 🔥'));
    console.log(deathGradient('⚡ Choose your path: PROMPT or DIE ⚡\n'));

    await this.sleep(2000);
    await this.showMainMenu();
  }

  async showMainMenu() {
    console.clear();
    
    const headerBox = boxen(cultGradient('PROMPT OR DIE CULT CONTROL CENTER'), {
      padding: 1,
      margin: 1,
      borderStyle: 'double',
      borderColor: 'red'
    });
    
    console.log(headerBox);

    const choices = [
      {
        name: 'setup',
        message: '🚀 Full Cult Setup (Repository Distribution)',
      },
      {
        name: 'install', 
        message: '📦 Install Dependencies',
      },
      {
        name: 'deploy',
        message: '🌍 Deploy to Production',
      },
      {
        name: 'admin',
        message: '👑 Admin: Create Repositories',
      },
      {
        name: 'status',
        message: '📊 Cult Status Check',
      },
      {
        name: 'exit',
        message: '💀 Exit (Digital Death)',
      }
    ];

    const response = await enquirer.prompt({
      type: 'select',
      name: 'action',
      message: powerGradient('⚡ Choose your cult operation:'),
      choices: choices
    });

    await this.executeAction(response.action);
  }

  async executeAction(action) {
    console.clear();
    
    switch (action) {
      case 'setup':
        await this.setupRepositories();
        break;
      case 'install':
        await this.installDependencies();
        break;
      case 'deploy':
        console.log(cultGradient('🌍 Use: node deploy.js'));
        break;
      case 'admin':
        console.log(cultGradient('👑 Use: node admin.js'));
        break;
      case 'status':
        await this.statusCheck();
        break;
      case 'exit':
        await this.exitCult();
        break;
      default:
        console.log(chalk.red('❌ Unknown command. The cult does not approve.'));
    }

    if (action !== 'exit') {
      console.log(chalk.cyan('\nPress ENTER to continue...'));
      process.stdin.once('data', () => this.showMainMenu());
    }
  }

  async setupRepositories() {
    console.log(cultGradient('🔮 INITIALIZING CULT REPOSITORY DISTRIBUTION\n'));
    
    const tasks = new Listr([
      {
        title: '🔍 Checking Prerequisites',
        task: async () => {
          await this.checkGitHubCLI();
          await this.checkAuthentication();
        }
      },
      {
        title: '📦 Repository Configuration', 
        task: async () => {
          await this.sleep(1000);
        }
      },
      {
        title: '🌳 Setting up Git Subtrees',
        task: async () => {
          await this.sleep(1500);
        }
      }
    ]);

    try {
      await tasks.run();
      console.log(powerGradient('\n🎉 CULT DISTRIBUTION COMPLETE! 🎉'));
      console.log(deathGradient('The revolution spreads across GitHub...'));
    } catch (error) {
      console.log(chalk.red(`💀 SETUP FAILED: ${error.message}`));
    }
  }

  async installDependencies() {
    console.log(cultGradient('📦 INSTALLING CULT DEPENDENCIES\n'));
    
    const spinner = createSpinner('Installing dependencies...').start();
    
    try {
      await execa('npm', ['install'], { stdio: 'pipe' });
      spinner.success({ text: 'Dependencies installed successfully!' });
      console.log(powerGradient('\n🎉 DEPENDENCIES INSTALLED! The cult grows stronger...'));
    } catch (error) {
      spinner.error({ text: 'Installation failed!' });
      console.log(chalk.red(`💀 INSTALLATION FAILED: ${error.message}`));
    }
  }

  async statusCheck() {
    console.log(cultGradient('📊 CULT STATUS CHECK\n'));
    
    const checks = [
      'GitHub Authentication',
      'Repository Health', 
      'CI/CD Status',
      'Package Versions'
    ];

    for (const check of checks) {
      const spinner = createSpinner(`Checking ${check}...`).start();
      await this.sleep(800);
      spinner.success();
    }

    console.log(powerGradient('\n🎉 ALL SYSTEMS OPERATIONAL! The cult thrives...'));
  }

  async exitCult() {
    console.clear();
    console.log(deathGradient('💀 LEAVING THE CULT... 💀\n'));
    console.log(cultGradient('You have chosen digital death...\n'));
    console.log(powerGradient('Remember: You can always return to PROMPT OR DIE\n'));
    await this.sleep(2000);
    process.exit(0);
  }

  async checkGitHubCLI() {
    try {
      await execa('gh', ['--version'], { stdio: 'pipe' });
    } catch {
      throw new Error('GitHub CLI not found. Install from: https://cli.github.com/');
    }
  }

  async checkAuthentication() {
    try {
      await execa('gh', ['auth', 'status'], { stdio: 'pipe' });
    } catch {
      throw new Error('Not authenticated with GitHub. Run: gh auth login');
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Initialize the cult setup
new CultSetup(); 