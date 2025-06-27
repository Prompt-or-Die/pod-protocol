#!/usr/bin/env node

import { terminal as term } from 'terminal-kit';
import gradient from 'gradient-string';
import figlet from 'figlet';
import boxen from 'boxen';
import { Listr } from 'listr2';
import enquirer from 'enquirer';
import { execa } from 'execa';

// Cult color schemes
const cultGradient = gradient(['#000000', '#ff0000', '#800080']);
const deathGradient = gradient(['#ff0000', '#800080', '#000000']);
const powerGradient = gradient(['#800080', '#ff0000', '#ff4500']);

class CultAdmin {
  constructor() {
    this.repos = {
      'pod-typescript-sdk': {
        description: 'PoD Protocol TypeScript SDK - Prompt at the speed of thought ⚡',
        topics: ['solana', 'typescript', 'sdk', 'web3', 'ai-agents', 'prompt-or-die']
      },
      'pod-javascript-sdk': {
        description: 'PoD Protocol JavaScript SDK - Build with JS speed or perish 💀',
        topics: ['solana', 'javascript', 'sdk', 'web3', 'ai-agents', 'prompt-or-die']
      },
      'pod-python-sdk': {
        description: 'PoD Protocol Python SDK - Elegant code or digital extinction 🐍',
        topics: ['solana', 'python', 'sdk', 'web3', 'ai-agents', 'prompt-or-die']
      },
      'pod-rust-sdk': {
        description: 'PoD Protocol Rust SDK - Memory safe or die trying 🦀',
        topics: ['solana', 'rust', 'sdk', 'web3', 'ai-agents', 'prompt-or-die']
      },
      'pod-mcp-server': {
        description: 'PoD Protocol MCP Server - Connect AI frameworks or become obsolete 🤖',
        topics: ['mcp', 'ai', 'llm', 'server', 'prompt-or-die', 'enterprise']
      },
      'pod-frontend': {
        description: 'PoD Protocol Frontend - Beautiful interfaces or digital death 🎨',
        topics: ['nextjs', 'react', 'frontend', 'web3', 'ui', 'prompt-or-die']
      },
      'pod-api-server': {
        description: 'PoD Protocol API Server - Enterprise backends or extinction 🖥️',
        topics: ['api', 'server', 'backend', 'enterprise', 'prompt-or-die']
      },
      'pod-cli': {
        description: 'PoD Protocol CLI - Command the future or fall behind 💻',
        topics: ['cli', 'tool', 'developer', 'prompt-or-die', 'solana']
      }
    };
    this.orgName = 'Prompt-or-Die';
    this.init();
  }

  async init() {
    term.clear();
    await this.showAdminBanner();
    await this.checkAuthentication();
    await this.selectOperation();
  }

  async showAdminBanner() {
    const banner = figlet.textSync('CULT ADMIN', {
      font: 'Big',
      horizontalLayout: 'fitted'
    });

    const lines = banner.split('\n');
    for (let i = 0; i < lines.length; i++) {
      term.moveTo(1, i + 2);
      term(cultGradient(lines[i]));
      await this.sleep(80);
    }

    await this.sleep(500);
    term.moveTo(1, lines.length + 4);
    term(powerGradient('👑 PROMPT OR DIE - ADMIN CONTROL CENTER 👑'));
    
    await this.sleep(1000);
    term.moveTo(1, lines.length + 6);
    term(deathGradient('⚡ Forge the cult infrastructure or watch it crumble ⚡'));

    await this.sleep(2000);
  }

  async checkAuthentication() {
    term.clear();
    
    const authBox = boxen(cultGradient('🔐 AUTHENTICATION CHECK'), {
      padding: 1,
      margin: 1,
      borderStyle: 'double',
      borderColor: 'red'
    });
    
    term(authBox);
    term('\n');

    try {
      term('🔍 Checking GitHub CLI...');
      await execa('gh', ['--version'], { stdio: 'pipe' });
      term.green(' ✅\n');

      term('🔑 Checking authentication...');
      await execa('gh', ['auth', 'status'], { stdio: 'pipe' });
      term.green(' ✅\n');

      term('👑 Checking admin access...');
      await execa('gh', ['repo', 'list', this.orgName, '--limit', '1'], { stdio: 'pipe' });
      term.green(' ✅\n');

    } catch (error) {
      term.red(' ❌\n');
      term(deathGradient('\n💀 AUTHENTICATION FAILED 💀\n'));
      term.red('Please ensure you have:\n');
      term.red('1. GitHub CLI installed (gh)\n');
      term.red('2. Authenticated with: gh auth login\n');
      term.red('3. Admin access to the organization\n');
      process.exit(1);
    }

    await this.sleep(1000);
  }

  async selectOperation() {
    term.clear();
    
    const operationBox = boxen(cultGradient('⚙️  ADMIN OPERATIONS'), {
      padding: 1,
      margin: 1,
      borderStyle: 'round',
      borderColor: 'magenta'
    });
    
    term(operationBox);
    term('\n');

    const operations = [
      { name: 'create', message: '🏗️  Create All Repositories', hint: 'Create all cult repositories' },
      { name: 'update', message: '📝 Update Repository Info', hint: 'Update descriptions and topics' },
      { name: 'status', message: '📊 Repository Status', hint: 'Check existing repositories' },
      { name: 'configure', message: '⚙️  Configure Settings', hint: 'Set up repository settings' },
      { name: 'delete', message: '💀 Delete Repositories', hint: 'DANGER: Remove repositories' }
    ];

    const { operation } = await enquirer.prompt({
      type: 'select',
      name: 'operation',
      message: powerGradient('Select admin operation:'),
      choices: operations
    });

    await this.executeOperation(operation);
  }

  async executeOperation(operation) {
    switch (operation) {
      case 'create':
        await this.createRepositories();
        break;
      case 'update':
        await this.updateRepositories();
        break;
      case 'status':
        await this.checkStatus();
        break;
      case 'configure':
        await this.configureRepositories();
        break;
      case 'delete':
        await this.deleteRepositories();
        break;
    }
  }

  async createRepositories() {
    term.clear();
    
    const createBox = boxen(cultGradient('🏗️  REPOSITORY CREATION'), {
      padding: 1,
      margin: 1,
      borderStyle: 'bold',
      borderColor: 'green'
    });
    
    term(createBox);
    term('\n');

    const { confirmed } = await enquirer.prompt({
      type: 'confirm',
      name: 'confirmed',
      message: powerGradient(`Create ${Object.keys(this.repos).length} repositories in ${this.orgName}?`),
      initial: false
    });

    if (!confirmed) {
      term.yellow('⚠️  Repository creation cancelled.\n');
      return;
    }

    const tasks = Object.keys(this.repos).map(repoName => ({
      title: `🚀 Creating ${repoName}`,
      task: async () => {
        await this.createRepository(repoName);
      }
    }));

    const listr = new Listr(tasks, {
      concurrent: true,
      rendererOptions: { collapseSubtasks: false }
    });

    try {
      await listr.run();
      term('\n');
      term(powerGradient('🎉 ALL REPOSITORIES CREATED! 🎉\n'));
      term(cultGradient('The cult infrastructure spreads across GitHub!\n'));
    } catch (error) {
      term.red(`💀 Creation failed: ${error.message}\n`);
    }
  }

  async createRepository(repoName) {
    const config = this.repos[repoName];
    
    try {
      // Create repository
      await execa('gh', [
        'repo', 'create', `${this.orgName}/${repoName}`,
        '--public',
        '--description', config.description
      ], { stdio: 'pipe' });

      // Add topics
      const topicsString = config.topics.join(',');
      await execa('gh', [
        'repo', 'edit', `${this.orgName}/${repoName}`,
        '--add-topic', topicsString
      ], { stdio: 'pipe' });

    } catch (error) {
      if (!error.message.includes('already exists')) {
        throw error;
      }
    }
  }

  async checkStatus() {
    term.clear();
    
    const statusBox = boxen(cultGradient('📊 REPOSITORY STATUS'), {
      padding: 1,
      margin: 1,
      borderStyle: 'round',
      borderColor: 'cyan'
    });
    
    term(statusBox);
    term('\n');

    for (const repoName of Object.keys(this.repos)) {
      term(`🔍 Checking ${repoName}...`);
      
      try {
        await execa('gh', ['repo', 'view', `${this.orgName}/${repoName}`], { stdio: 'pipe' });
        term.green(' ✅ EXISTS\n');
      } catch {
        term.red(' ❌ MISSING\n');
      }
    }

    term('\n');
    term(powerGradient('Status check complete.\n'));
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Start the cult admin
new CultAdmin(); 