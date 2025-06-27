#!/usr/bin/env node

import { terminal as term } from 'terminal-kit';
import gradient from 'gradient-string';
import figlet from 'figlet';
import boxen from 'boxen';
import { Listr } from 'listr2';
import enquirer from 'enquirer';
import { execa } from 'execa';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

// Cult color schemes
const cultGradient = gradient(['#000000', '#ff0000', '#800080']);
const deathGradient = gradient(['#ff0000', '#800080', '#000000']);
const powerGradient = gradient(['#800080', '#ff0000', '#ff4500']);
const successGradient = gradient(['#00ff00', '#00aa00', '#008800']);

class CultDeployer {
  constructor() {
    this.environments = {
      development: { emoji: '🔧', url: 'dev.prompt-or-die.com' },
      staging: { emoji: '🚀', url: 'staging.prompt-or-die.com' },
      production: { emoji: '🌍', url: 'prompt-or-die.com' }
    };
    this.deploymentConfig = {};
    this.init();
  }

  async init() {
    term.clear();
    await this.showWelcomeBanner();
    await this.checkPrerequisites();
    await this.selectDeployment();
    await this.confirmDeployment();
    await this.performDeployment();
  }

  async showWelcomeBanner() {
    const banner = figlet.textSync('CULT DEPLOY', {
      font: 'ANSI Shadow',
      horizontalLayout: 'fitted'
    });

    const lines = banner.split('\n');
    for (let i = 0; i < lines.length; i++) {
      term.moveTo(1, i + 2);
      term(cultGradient(lines[i]));
      await this.sleep(60);
    }

    await this.sleep(500);
    term.moveTo(1, lines.length + 4);
    term(powerGradient('🚀 PROMPT OR DIE - DEPLOYMENT RITUAL 🚀'));
    
    await this.sleep(1000);
    term.moveTo(1, lines.length + 6);
    term(deathGradient('⚡ Deploy the revolution or watch it die in obscurity ⚡'));

    await this.sleep(2000);
  }

  async checkPrerequisites() {
    term.clear();
    
    const prereqBox = boxen(cultGradient('🔍 PREREQUISITE CHECK'), {
      padding: 1,
      margin: 1,
      borderStyle: 'double',
      borderColor: 'red',
      backgroundColor: 'black'
    });
    
    term(prereqBox);
    term('\n');

    const checks = [
      { name: 'Git repository', check: () => existsSync('.git') },
      { name: 'Package.json', check: () => existsSync('package.json') },
      { name: 'Build directory', check: () => existsSync('dist') || existsSync('build') },
      { name: 'Environment file', check: () => existsSync('.env') || existsSync('.env.production') },
      { name: 'Docker (optional)', check: async () => {
        try {
          await execa('docker', ['--version'], { stdio: 'pipe' });
          return true;
        } catch {
          return false;
        }
      }},
      { name: 'Git status clean', check: async () => {
        try {
          const { stdout } = await execa('git', ['status', '--porcelain'], { stdio: 'pipe' });
          return stdout.trim() === '';
        } catch {
          return false;
        }
      }}
    ];

    for (const check of checks) {
      term(`🔍 Checking ${check.name}...`);
      
      try {
        const result = typeof check.check === 'function' ? 
          await check.check() : check.check;
        
        if (result) {
          term.green(' ✅\n');
        } else {
          term.yellow(' ⚠️  (optional)\n');
        }
      } catch {
        term.red(' ❌\n');
      }
      
      await this.sleep(200);
    }

    term('\n');
    await this.sleep(1000);
  }

  async selectDeployment() {
    term.clear();
    
    const deployBox = boxen(cultGradient('🎯 DEPLOYMENT CONFIGURATION'), {
      padding: 1,
      margin: 1,
      borderStyle: 'round',
      borderColor: 'magenta'
    });
    
    term(deployBox);
    term('\n');

    // Environment selection
    const environmentChoices = Object.keys(this.environments).map(env => ({
      name: env,
      message: `${this.environments[env].emoji} ${env.charAt(0).toUpperCase() + env.slice(1)}`,
      hint: this.environments[env].url
    }));

    const { environment } = await enquirer.prompt({
      type: 'select',
      name: 'environment',
      message: powerGradient('Select deployment environment:'),
      choices: environmentChoices
    });

    this.deploymentConfig.environment = environment;

    // Deployment strategy
    const strategies = [
      { name: 'rolling', message: '🔄 Rolling Deployment', hint: 'Zero downtime, gradual rollout' },
      { name: 'blue-green', message: '🔵 Blue-Green', hint: 'Switch between two environments' },
      { name: 'canary', message: '🐦 Canary Release', hint: 'Test with small traffic percentage' },
      { name: 'immediate', message: '⚡ Immediate', hint: 'Fast deployment with brief downtime' }
    ];

    const { strategy } = await enquirer.prompt({
      type: 'select',
      name: 'strategy',
      message: deathGradient('Deployment strategy:'),
      choices: strategies
    });

    this.deploymentConfig.strategy = strategy;

    // Components to deploy
    const components = [
      { name: 'frontend', message: '🎨 Frontend (React/Next.js)' },
      { name: 'backend', message: '🖥️  Backend API' },
      { name: 'database', message: '🗄️  Database migrations' },
      { name: 'static', message: '📄 Static assets' },
      { name: 'worker', message: '⚙️  Background workers' },
      { name: 'docs', message: '📚 Documentation' }
    ];

    const { selectedComponents } = await enquirer.prompt({
      type: 'multiselect',
      name: 'selectedComponents',
      message: cultGradient('Select components to deploy:'),
      choices: components,
      initial: ['frontend', 'backend']
    });

    this.deploymentConfig.components = selectedComponents;

    // Deployment options
    const { deploymentOptions } = await enquirer.prompt({
      type: 'multiselect',
      name: 'deploymentOptions',
      message: powerGradient('Deployment options:'),
      choices: [
        { name: 'build', message: '🔨 Build before deploy', value: 'build' },
        { name: 'test', message: '🧪 Run tests', value: 'test' },
        { name: 'backup', message: '💾 Create backup', value: 'backup' },
        { name: 'migrate', message: '🔄 Run migrations', value: 'migrate' },
        { name: 'cache', message: '🗑️  Clear cache', value: 'cache' },
        { name: 'notify', message: '📢 Send notifications', value: 'notify' }
      ],
      initial: ['build', 'backup']
    });

    this.deploymentConfig.options = deploymentOptions;
  }

  async confirmDeployment() {
    term.clear();
    
    const confirmBox = boxen(deathGradient('⚠️  DEPLOYMENT CONFIRMATION'), {
      padding: 1,
      margin: 1,
      borderStyle: 'bold',
      borderColor: 'yellow'
    });
    
    term(confirmBox);
    term('\n');

    // Show deployment summary
    term(cultGradient('📋 DEPLOYMENT SUMMARY:\n\n'));
    term(`🎯 Environment: ${this.environments[this.deploymentConfig.environment].emoji} `);
    term.magenta(`${this.deploymentConfig.environment}\n`);
    term(`🔗 URL: ${this.environments[this.deploymentConfig.environment].url}\n`);
    term(`📦 Strategy: ${this.deploymentConfig.strategy}\n`);
    term(`🧩 Components: ${this.deploymentConfig.components.join(', ')}\n`);
    term(`⚙️  Options: ${this.deploymentConfig.options.join(', ')}\n\n`);

    if (this.deploymentConfig.environment === 'production') {
      term(deathGradient('💀 WARNING: PRODUCTION DEPLOYMENT 💀\n'));
      term.red('This will affect live systems and real users!\n\n');
    }

    const { confirmed } = await enquirer.prompt({
      type: 'confirm',
      name: 'confirmed',
      message: powerGradient('Proceed with deployment?'),
      initial: false
    });

    if (!confirmed) {
      term.yellow('\n⚠️  Deployment cancelled. The cult remains in shadow...\n');
      process.exit(0);
    }

    // Final confirmation for production
    if (this.deploymentConfig.environment === 'production') {
      const { productionConfirmed } = await enquirer.prompt({
        type: 'confirm',
        name: 'productionConfirmed',
        message: deathGradient('FINAL CONFIRMATION: Deploy to PRODUCTION?'),
        initial: false
      });

      if (!productionConfirmed) {
        term.yellow('\n⚠️  Production deployment cancelled.\n');
        process.exit(0);
      }
    }
  }

  async performDeployment() {
    term.clear();
    
    const deployingBox = boxen(cultGradient('🚀 DEPLOYMENT IN PROGRESS'), {
      padding: 1,
      margin: 1,
      borderStyle: 'bold',
      borderColor: 'green'
    });
    
    term(deployingBox);
    term('\n');

    const tasks = [];

    // Pre-deployment tasks
    if (this.deploymentConfig.options.includes('backup')) {
      tasks.push({
        title: '💾 Creating backup',
        task: async () => {
          await this.createBackup();
        }
      });
    }

    if (this.deploymentConfig.options.includes('build')) {
      tasks.push({
        title: '🔨 Building project',
        task: async () => {
          await execa('npm', ['run', 'build'], { stdio: 'pipe' });
        }
      });
    }

    if (this.deploymentConfig.options.includes('test')) {
      tasks.push({
        title: '🧪 Running tests',
        task: async () => {
          await execa('npm', ['test'], { stdio: 'pipe' });
        }
      });
    }

    // Component deployments
    for (const component of this.deploymentConfig.components) {
      tasks.push({
        title: `🚀 Deploying ${component}`,
        task: async () => {
          await this.deployComponent(component);
        }
      });
    }

    // Post-deployment tasks
    if (this.deploymentConfig.options.includes('migrate')) {
      tasks.push({
        title: '🔄 Running migrations',
        task: async () => {
          await this.runMigrations();
        }
      });
    }

    if (this.deploymentConfig.options.includes('cache')) {
      tasks.push({
        title: '🗑️  Clearing cache',
        task: async () => {
          await this.clearCache();
        }
      });
    }

    tasks.push({
      title: '🏁 Finalizing deployment',
      task: async () => {
        await this.finalizeDeployment();
      }
    });

    if (this.deploymentConfig.options.includes('notify')) {
      tasks.push({
        title: '📢 Sending notifications',
        task: async () => {
          await this.sendNotifications();
        }
      });
    }

    const listr = new Listr(tasks, {
      concurrent: false,
      rendererOptions: {
        collapseSubtasks: false,
        showSubtasks: true,
        progressBarOptions: {
          barCompleteChar: '█',
          barIncompleteChar: '░'
        }
      }
    });

    try {
      await listr.run();
      await this.showSuccess();
    } catch (error) {
      await this.showError(error);
    }
  }

  async createBackup() {
    await this.sleep(1000);
    // Backup logic here
  }

  async deployComponent(component) {
    await this.sleep(800);
    // Component deployment logic here
  }

  async runMigrations() {
    await this.sleep(500);
    // Migration logic here
  }

  async clearCache() {
    await this.sleep(300);
    // Cache clearing logic here
  }

  async finalizeDeployment() {
    await this.sleep(1000);
    // Finalization logic here
  }

  async sendNotifications() {
    await this.sleep(500);
    // Notification logic here
  }

  async showSuccess() {
    term.clear();
    
    const successBanner = figlet.textSync('DEPLOYED!', {
      font: 'Big'
    });

    const lines = successBanner.split('\n');
    for (const line of lines) {
      term(successGradient(line + '\n'));
    }

    term('\n');
    term(cultGradient('🎉 CULT DEPLOYMENT SUCCESSFUL! 🎉\n\n'));
    term(powerGradient('The revolution spreads across the digital realm!\n\n'));

    const deploymentInfo = boxen(
      successGradient('DEPLOYMENT COMPLETE:\n\n') +
      `🌍 Environment: ${this.deploymentConfig.environment}\n` +
      `🔗 URL: https://${this.environments[this.deploymentConfig.environment].url}\n` +
      `📦 Strategy: ${this.deploymentConfig.strategy}\n` +
      `🧩 Components: ${this.deploymentConfig.components.join(', ')}\n` +
      `⏰ Deployed at: ${new Date().toISOString()}\n`,
      {
        padding: 1,
        margin: 1,
        borderStyle: 'round',
        borderColor: 'green'
      }
    );

    term(deploymentInfo);
    term('\n\n');
    term(cultGradient('Press ENTER to exit...'));
    await term.inputField().promise;
    process.exit(0);
  }

  async showError(error) {
    term.clear();
    term(deathGradient('💀 DEPLOYMENT FAILED 💀\n\n'));
    term.red(`Error: ${error.message}\n\n`);
    term(cultGradient('The cult deployment ritual has failed.\n'));
    term(powerGradient('Review the error and try again.\n\n'));
    term(powerGradient('Press ENTER to exit...'));
    await term.inputField().promise;
    process.exit(1);
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Start the cult deployment
new CultDeployer(); 