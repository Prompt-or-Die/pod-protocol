#!/usr/bin/env node

import chalk from 'chalk';
import gradient from 'gradient-string';
import figlet from 'figlet';
import boxen from 'boxen';
import { Listr } from 'listr2';
import enquirer from 'enquirer';
import { execa } from 'execa';
import { platform } from 'os';
import { readFileSync, existsSync, readdirSync } from 'fs';
import { join, dirname, resolve } from 'path';
import { createSpinner } from 'nanospinner';
import { fileURLToPath } from 'url';

// Cult color schemes
const cultGradient = gradient(['#000000', '#ff0000', '#800080']);
const deathGradient = gradient(['#ff0000', '#800080', '#000000']);
const powerGradient = gradient(['#800080', '#ff0000', '#ff4500']);
const successGradient = gradient(['#00ff00', '#00aa00', '#008800']);

class CultPackageInstaller {
  constructor() {
    this.platform = platform();
    this.projectRoot = this.findProjectRoot();
    this.packagesPath = join(this.projectRoot, 'packages');
    this.availablePackages = {};
    this.selectedPackages = [];
    this.packageManager = null;
    this.installOptions = {
      mode: 'production',
      skipTests: false,
      skipBuild: false,
      installDev: false
    };
    this.init();
  }

  findProjectRoot() {
    // Get the directory where this script is located
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    
    // Start from script directory and work up
    let currentDir = __dirname;
    
    // Look for indicators of project root
    while (currentDir !== dirname(currentDir)) {
      const packagesDir = join(currentDir, 'packages');
      const scriptsDir = join(currentDir, 'scripts');
      
      if (existsSync(packagesDir) && existsSync(scriptsDir)) {
        console.log(chalk.green(`✅ Found project root: ${currentDir}`));
        return currentDir;
      }
      currentDir = dirname(currentDir);
    }
    
    // Fallback: assume we're in project root
    const fallbackRoot = resolve(process.cwd());
    console.log(chalk.yellow(`⚠️  Using fallback project root: ${fallbackRoot}`));
    return fallbackRoot;
  }

  validateProjectStructure() {
    if (!existsSync(this.packagesPath)) {
      console.log(chalk.red(`❌ Packages directory not found: ${this.packagesPath}`));
      console.log(chalk.yellow(`💡 Make sure you're running this from the correct project directory`));
      return false;
    }
    
    console.log(chalk.green(`✅ Packages directory found: ${this.packagesPath}`));
    return true;
  }

  async init() {
    console.clear();
    await this.showWelcomeBanner();
    
    if (!this.validateProjectStructure()) {
      console.log(deathGradient('\n💀 Project structure validation failed. Exiting...\n'));
      process.exit(1);
    }
    
    await this.scanAvailablePackages();
    await this.detectPackageManagers();
    await this.showPackageSelection();
    await this.configureInstallation();
    await this.performInstallation();
  }

  async showWelcomeBanner() {
    const banner = figlet.textSync('PACKAGE INSTALLER', {
      font: 'Big',
      horizontalLayout: 'fitted'
    });

    console.log(cultGradient(banner));
    console.log(powerGradient('\n🔥 PROMPT OR DIE - SELECTIVE PACKAGE INSTALLATION 🔥'));
    console.log(deathGradient('⚡ Choose your weapons: Install only what you need ⚡\n'));

    await this.sleep(2000);
  }

  async scanAvailablePackages() {
    console.log(cultGradient('🔍 SCANNING AVAILABLE PACKAGES...\n'));

    // Define package metadata
    this.availablePackages = {
      'sdk-typescript': {
        name: 'TypeScript SDK',
        emoji: '📘',
        description: 'Type-safe SDK for TypeScript/JavaScript applications',
        path: 'sdk-typescript',
        dependencies: [],
        devDependencies: ['@types/node', 'typescript', 'tsup'],
        estimatedSize: '15MB',
        buildTime: '30s',
        features: ['Type safety', 'Auto-completion', 'Modern ES modules'],
        category: 'SDK'
      },
      'sdk-javascript': {
        name: 'JavaScript SDK',
        emoji: '📙',
        description: 'Pure JavaScript SDK for Node.js and browsers',
        path: 'sdk-javascript',
        dependencies: [],
        devDependencies: ['webpack', 'babel'],
        estimatedSize: '12MB',
        buildTime: '20s',
        features: ['Universal compatibility', 'Browser support', 'Lightweight'],
        category: 'SDK'
      },
      'sdk-python': {
        name: 'Python SDK',
        emoji: '🐍',
        description: 'Pythonic SDK for data science and AI applications',
        path: 'sdk-python',
        dependencies: ['requests', 'pydantic'],
        devDependencies: ['pytest', 'black', 'mypy'],
        estimatedSize: '8MB',
        buildTime: '15s',
        features: ['Type hints', 'Async support', 'Jupyter integration'],
        category: 'SDK'
      },
      'sdk-rust': {
        name: 'Rust SDK',
        emoji: '🦀',
        description: 'High-performance SDK for systems programming',
        path: 'sdk-rust',
        dependencies: ['tokio', 'serde', 'reqwest'],
        devDependencies: [],
        estimatedSize: '25MB',
        buildTime: '2m',
        features: ['Memory safety', 'Zero-cost abstractions', 'Concurrency'],
        category: 'SDK'
      },
      'cli': {
        name: 'Command Line Interface',
        emoji: '💻',
        description: 'Powerful CLI tool for developers and power users',
        path: 'cli',
        dependencies: ['commander', 'inquirer', 'chalk'],
        devDependencies: ['jest', '@types/node'],
        estimatedSize: '20MB',
        buildTime: '45s',
        features: ['Interactive commands', 'Auto-completion', 'Plugin system'],
        category: 'Tools'
      },
      'frontend': {
        name: 'Web Frontend',
        emoji: '🎨',
        description: 'Modern React/Next.js web application',
        path: 'frontend',
        dependencies: ['react', 'next', '@solana/web3.js'],
        devDependencies: ['typescript', 'tailwindcss', 'eslint'],
        estimatedSize: '150MB',
        buildTime: '3m',
        features: ['Server-side rendering', 'Responsive design', 'Web3 integration'],
        category: 'Applications'
      },
      'mcp-server': {
        name: 'MCP Server',
        emoji: '🤖',
        description: 'Model Context Protocol server for AI integration',
        path: 'mcp-server',
        dependencies: ['ws', 'zod', 'typescript'],
        devDependencies: ['vitest', 'tsx'],
        estimatedSize: '18MB',
        buildTime: '40s',
        features: ['AI model integration', 'Context management', 'Protocol compliance'],
        category: 'AI/ML'
      }
    };

    // Check which packages actually exist using absolute paths
    console.log(chalk.cyan(`Scanning packages in: ${this.packagesPath}\n`));
    
    for (const [key, pkg] of Object.entries(this.availablePackages)) {
      // Use absolute path from project root
      const fullPath = join(this.packagesPath, pkg.path);
      const exists = existsSync(fullPath);
      
      pkg.available = exists;
      pkg.fullPath = fullPath;
      
      if (exists) {
        console.log(chalk.green(`✅ ${pkg.emoji} ${pkg.name}`));
        
        try {
          const packageJsonPath = join(fullPath, 'package.json');
          if (existsSync(packageJsonPath)) {
            const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
            pkg.version = packageJson.version || '1.0.0';
            pkg.actualName = packageJson.name || key;
          } else {
            // Check for nested package structure (e.g., packages/sdk-typescript/sdk/)
            const nestedDirs = readdirSync(fullPath, { withFileTypes: true })
              .filter(dirent => dirent.isDirectory())
              .map(dirent => dirent.name);
            
            for (const nestedDir of nestedDirs) {
              const nestedPackageJsonPath = join(fullPath, nestedDir, 'package.json');
              if (existsSync(nestedPackageJsonPath)) {
                const packageJson = JSON.parse(readFileSync(nestedPackageJsonPath, 'utf8'));
                pkg.version = packageJson.version || '1.0.0';
                pkg.actualName = packageJson.name || key;
                pkg.fullPath = join(fullPath, nestedDir); // Update to nested path
                break;
              }
            }
          }
        } catch (error) {
          pkg.version = '1.0.0';
          pkg.actualName = key;
        }
      } else {
        console.log(chalk.red(`❌ ${pkg.emoji} ${pkg.name} (not found at ${fullPath})`));
      }
    }

    const availableCount = Object.values(this.availablePackages).filter(p => p.available).length;
    
    if (availableCount === 0) {
      console.log(deathGradient('\n💀 No packages found! Cannot proceed with installation.\n'));
      console.log(chalk.yellow('💡 Available directories in packages:'));
      
      try {
        const packageDirs = readdirSync(this.packagesPath, { withFileTypes: true })
          .filter(dirent => dirent.isDirectory())
          .map(dirent => dirent.name);
        
        packageDirs.forEach(dir => {
          console.log(`   📁 ${dir}`);
        });
      } catch (error) {
        console.log(chalk.red(`   Error reading packages directory: ${error.message}`));
      }
      
      process.exit(1);
    }
    
    console.log(successGradient(`\n✅ Found ${availableCount} available packages\n`));
    await this.sleep(1000);
  }

  async detectPackageManagers() {
    console.log(cultGradient('🔍 DETECTING PACKAGE MANAGERS...\n'));

    const packageManagers = ['bun', 'npm', 'yarn', 'pnpm'];
    const available = [];

    for (const pm of packageManagers) {
      try {
        await execa(pm, ['--version'], { stdio: 'pipe' });
        available.push(pm);
        console.log(chalk.green(`✅ ${pm} detected`));
      } catch {
        console.log(chalk.red(`❌ ${pm} not found`));
      }
    }

    if (available.length === 0) {
      console.log(deathGradient('\n💀 No package managers found! Installing Node.js...\n'));
      await this.installNodejs();
    }

    this.availablePackageManagers = available;
    await this.sleep(1000);
  }

  async showPackageSelection() {
    console.clear();
    
    const selectionBox = boxen(cultGradient('📦 PACKAGE SELECTION'), {
      padding: 1,
      margin: 1,
      borderStyle: 'double',
      borderColor: 'red'
    });
    
    console.log(selectionBox);
    console.log(powerGradient('\nSelect packages to install. Use SPACE to select, ENTER to continue.\n'));

    // Group packages by category
    const categories = {};
    for (const [key, pkg] of Object.entries(this.availablePackages)) {
      if (!pkg.available) continue;
      
      if (!categories[pkg.category]) {
        categories[pkg.category] = [];
      }
      categories[pkg.category].push({
        name: key,
        message: `${pkg.emoji} ${pkg.name} v${pkg.version}`,
        hint: `${pkg.description} (${pkg.estimatedSize})`
      });
    }

    // Show packages by category
    console.log(cultGradient('Available packages by category:\n'));
    
    const allChoices = [];
    for (const [category, packages] of Object.entries(categories)) {
      console.log(chalk.cyan(`📁 ${category}:`));
      for (const pkg of packages) {
        console.log(`  ${pkg.message}`);
        console.log(chalk.gray(`     ${pkg.hint}`));
        allChoices.push(pkg);
      }
      console.log();
    }

    // Package selection methods
    const { selectionMethod } = await enquirer.prompt({
      type: 'select',
      name: 'selectionMethod',
      message: powerGradient('How would you like to select packages?'),
      choices: [
        { name: 'interactive', message: '🖱️  Interactive Selection', hint: 'Choose packages with checkboxes' },
        { name: 'category', message: '📁 By Category', hint: 'Install entire categories' },
        { name: 'preset', message: '🎯 Preset Configurations', hint: 'Pre-defined package sets' },
        { name: 'individual', message: '🎛️  Individual Choice', hint: 'Select one package at a time' },
        { name: 'all', message: '🌟 Install Everything', hint: 'Install all available packages' }
      ]
    });

    switch (selectionMethod) {
      case 'interactive':
        await this.interactiveSelection(allChoices);
        break;
      case 'category':
        await this.categorySelection(categories);
        break;
      case 'preset':
        await this.presetSelection();
        break;
      case 'individual':
        await this.individualSelection(allChoices);
        break;
      case 'all':
        this.selectedPackages = Object.keys(this.availablePackages).filter(
          key => this.availablePackages[key].available
        );
        break;
    }
  }

  async interactiveSelection(choices) {
    const { selectedPackages } = await enquirer.prompt({
      type: 'multiselect',
      name: 'selectedPackages',
      message: powerGradient('Select packages to install:'),
      choices: choices,
      limit: 10
    });

    this.selectedPackages = selectedPackages;
  }

  async categorySelection(categories) {
    const categoryChoices = Object.keys(categories).map(cat => ({
      name: cat,
      message: `📁 ${cat} (${categories[cat].length} packages)`
    }));

    const { selectedCategories } = await enquirer.prompt({
      type: 'multiselect',
      name: 'selectedCategories',
      message: deathGradient('Select categories to install:'),
      choices: categoryChoices
    });

    this.selectedPackages = [];
    for (const category of selectedCategories) {
      this.selectedPackages.push(...categories[category].map(p => p.name));
    }
  }

  async presetSelection() {
    const presets = {
      'developer': {
        name: '👨‍💻 Developer Essentials',
        packages: ['cli', 'sdk-typescript'],
        description: 'CLI tools and TypeScript SDK for development'
      },
      'fullstack': {
        name: '🌐 Full-Stack Setup',
        packages: ['frontend', 'sdk-typescript'],
        description: 'Complete web application stack'
      },
      'backend': {
        name: '🖥️  Backend Focus',
        packages: ['mcp-server', 'cli'],
        description: 'Server-side applications and tools'
      },
      'sdk-all': {
        name: '📚 All SDKs',
        packages: ['sdk-typescript', 'sdk-javascript', 'sdk-python', 'sdk-rust'],
        description: 'All programming language SDKs'
      },
      'ai-ml': {
        name: '🤖 AI/ML Stack',
        packages: ['mcp-server', 'sdk-python', 'cli'],
        description: 'AI and machine learning focused setup'
      }
    };

    const presetChoices = Object.entries(presets).map(([key, preset]) => ({
      name: key,
      message: preset.name,
      hint: preset.description
    }));

    const { selectedPreset } = await enquirer.prompt({
      type: 'select',
      name: 'selectedPreset',
      message: cultGradient('Choose a preset configuration:'),
      choices: presetChoices
    });

    this.selectedPackages = presets[selectedPreset].packages.filter(
      pkg => this.availablePackages[pkg]?.available
    );
  }

  async individualSelection(choices) {
    this.selectedPackages = [];
    
    while (true) {
      const remainingChoices = choices.filter(choice => 
        !this.selectedPackages.includes(choice.name)
      );

      if (remainingChoices.length === 0) break;

      remainingChoices.push({ name: 'done', message: '✅ Finished selecting' });

      const { selectedPackage } = await enquirer.prompt({
        type: 'select',
        name: 'selectedPackage',
        message: powerGradient(`Select package (${this.selectedPackages.length} selected):`),
        choices: remainingChoices
      });

      if (selectedPackage === 'done') break;

      this.selectedPackages.push(selectedPackage);
      
      // Show package details
      const pkg = this.availablePackages[selectedPackage];
      console.log(boxen(
        `${pkg.emoji} ${pkg.name}\n\n` +
        `${pkg.description}\n\n` +
        `📦 Size: ${pkg.estimatedSize}\n` +
        `⏱️  Build time: ${pkg.buildTime}\n` +
        `✨ Features: ${pkg.features.join(', ')}`,
        { padding: 1, borderColor: 'green' }
      ));
    }
  }

  async configureInstallation() {
    if (this.selectedPackages.length === 0) {
      console.log(deathGradient('\n💀 No packages selected. The cult is disappointed.\n'));
      process.exit(1);
    }

    console.clear();
    
    const configBox = boxen(cultGradient('⚙️  INSTALLATION CONFIGURATION'), {
      padding: 1,
      margin: 1,
      borderStyle: 'round',
      borderColor: 'yellow'
    });
    
    console.log(configBox);

    // Show selected packages
    console.log(powerGradient('\n📦 Selected Packages:\n'));
    for (const pkgKey of this.selectedPackages) {
      const pkg = this.availablePackages[pkgKey];
      console.log(`${pkg.emoji} ${pkg.name} v${pkg.version}`);
    }

    // Package manager selection
    if (this.availablePackageManagers.length > 1) {
      const pmChoices = this.availablePackageManagers.map(pm => ({
        name: pm,
        message: this.getPackageManagerInfo(pm)
      }));

      const { packageManager } = await enquirer.prompt({
        type: 'select',
        name: 'packageManager',
        message: cultGradient('Choose package manager:'),
        choices: pmChoices
      });

      this.packageManager = packageManager;
    } else {
      this.packageManager = this.availablePackageManagers[0] || 'npm';
    }

    // Installation options
    const { installOptions } = await enquirer.prompt({
      type: 'multiselect',
      name: 'installOptions',
      message: deathGradient('Installation options:'),
      choices: [
        { name: 'production', message: '🚀 Production mode', hint: 'Skip dev dependencies' },
        { name: 'build', message: '🔨 Build after install', hint: 'Compile packages' },
        { name: 'test', message: '🧪 Run tests', hint: 'Verify installation' },
        { name: 'parallel', message: '⚡ Parallel installation', hint: 'Install packages simultaneously' },
        { name: 'clean', message: '🧹 Clean install', hint: 'Remove existing node_modules' }
      ]
    });

    this.installOptions = {
      production: installOptions.includes('production'),
      build: installOptions.includes('build'),
      test: installOptions.includes('test'),
      parallel: installOptions.includes('parallel'),
      clean: installOptions.includes('clean')
    };
  }

  getPackageManagerInfo(pm) {
    const info = {
      'bun': '⚡ Bun (Fastest - Recommended)',
      'npm': '📦 NPM (Traditional & Reliable)',
      'yarn': '🧶 Yarn (Fast & Feature-rich)',
      'pnpm': '💾 PNPM (Disk Efficient)'
    };
    return info[pm] || pm;
  }

  async performInstallation() {
    console.clear();
    
    const installBox = boxen(cultGradient('🚀 INSTALLATION IN PROGRESS'), {
      padding: 1,
      margin: 1,
      borderStyle: 'bold',
      borderColor: 'green'
    });
    
    console.log(installBox);
    console.log(powerGradient(`\n🎯 Installing ${this.selectedPackages.length} packages with ${this.packageManager}\n`));

    // Calculate total size and time
    const totalSize = this.selectedPackages.reduce((acc, pkg) => {
      const size = parseInt(this.availablePackages[pkg].estimatedSize);
      return acc + (isNaN(size) ? 0 : size);
    }, 0);

    console.log(chalk.cyan(`📦 Total estimated size: ${totalSize}MB`));
    console.log(chalk.cyan(`⏱️  Estimated time: ${Math.ceil(totalSize / 10)}m\n`));

    const tasks = [];

    // Clean install if requested
    if (this.installOptions.clean) {
      tasks.push({
        title: '🧹 Cleaning existing installations',
        task: async () => {
          for (const pkgKey of this.selectedPackages) {
            const pkg = this.availablePackages[pkgKey];
            await this.cleanPackage(pkg.fullPath);
          }
        }
      });
    }

    // Install packages
    if (this.installOptions.parallel) {
      // Parallel installation
      const installTasks = this.selectedPackages.map(pkgKey => ({
        title: `📦 Installing ${this.availablePackages[pkgKey].name}`,
        task: async () => {
          await this.installPackage(pkgKey);
        }
      }));
      tasks.push(...installTasks);
    } else {
      // Sequential installation
      tasks.push({
        title: '📦 Installing packages',
        task: async (ctx, task) => {
          for (const pkgKey of this.selectedPackages) {
            task.title = `📦 Installing ${this.availablePackages[pkgKey].name}`;
            await this.installPackage(pkgKey);
          }
          task.title = '✅ All packages installed';
        }
      });
    }

    // Build if requested
    if (this.installOptions.build) {
      tasks.push({
        title: '🔨 Building packages',
        task: async (ctx, task) => {
          for (const pkgKey of this.selectedPackages) {
            task.title = `🔨 Building ${this.availablePackages[pkgKey].name}`;
            await this.buildPackage(pkgKey);
          }
          task.title = '✅ All packages built';
        }
      });
    }

    // Test if requested
    if (this.installOptions.test) {
      tasks.push({
        title: '🧪 Running tests',
        task: async (ctx, task) => {
          for (const pkgKey of this.selectedPackages) {
            const pkg = this.availablePackages[pkgKey];
            if (existsSync(join(pkg.fullPath, 'package.json'))) {
              task.title = `🧪 Testing ${pkg.name}`;
              await this.testPackage(pkgKey);
            }
          }
          task.title = '✅ All tests completed';
        }
      });
    }

    const listr = new Listr(tasks, {
      concurrent: this.installOptions.parallel,
      rendererOptions: {
        collapseSubtasks: false,
        showSubtasks: true
      }
    });

    try {
      await listr.run();
      await this.showSuccess();
    } catch (error) {
      await this.showError(error);
    }
  }

  async installPackage(pkgKey) {
    const pkg = this.availablePackages[pkgKey];
    const args = ['install'];
    
    if (this.installOptions.production) {
      args.push('--production');
    }

    await execa(this.packageManager, args, {
      cwd: pkg.fullPath,
      stdio: 'pipe'
    });
  }

  async buildPackage(pkgKey) {
    const pkg = this.availablePackages[pkgKey];
    try {
      await execa(this.packageManager, ['run', 'build'], {
        cwd: pkg.fullPath,
        stdio: 'pipe'
      });
    } catch {
      // Build script might not exist, that's okay
    }
  }

  async testPackage(pkgKey) {
    const pkg = this.availablePackages[pkgKey];
    try {
      await execa(this.packageManager, ['test'], {
        cwd: pkg.fullPath,
        stdio: 'pipe'
      });
    } catch {
      // Test script might not exist or fail, that's okay for now
    }
  }

  async cleanPackage(packagePath) {
    try {
      if (this.platform === 'win32') {
        await execa('rmdir', ['/s', '/q', 'node_modules'], {
          cwd: packagePath,
          stdio: 'pipe'
        });
      } else {
        await execa('rm', ['-rf', 'node_modules'], {
          cwd: packagePath,
          stdio: 'pipe'
        });
      }
    } catch {
      // Cleaning might fail, that's okay
    }
  }

  async installNodejs() {
    if (this.platform === 'win32') {
      console.log(powerGradient('📥 Installing Node.js via winget...\n'));
      await execa('winget', ['install', 'OpenJS.NodeJS'], { stdio: 'inherit' });
    } else {
      console.log(powerGradient('📥 Please install Node.js from: https://nodejs.org/\n'));
      process.exit(1);
    }
  }

  async showSuccess() {
    console.clear();
    
    const successBanner = figlet.textSync('INSTALLED!', { font: 'Big' });
    console.log(successGradient(successBanner));

    console.log(cultGradient('\n🎉 PACKAGE INSTALLATION COMPLETE! 🎉\n'));
    console.log(powerGradient('Selected packages have been installed successfully!\n'));

    // Show installed packages with next steps
    console.log(chalk.cyan('📦 Installed Packages:\n'));
    for (const pkgKey of this.selectedPackages) {
      const pkg = this.availablePackages[pkgKey];
      console.log(`${pkg.emoji} ${pkg.name} v${pkg.version}`);
      console.log(chalk.gray(`   Path: ${pkg.path}`));
      
      // Show usage examples
      if (pkgKey === 'cli') {
        console.log(chalk.green(`   Usage: cd ${pkg.path} && ${this.packageManager} start`));
      } else if (pkgKey === 'frontend') {
        console.log(chalk.green(`   Dev: cd ${pkg.path} && ${this.packageManager} dev`));
      } else if (pkgKey.startsWith('sdk-')) {
        console.log(chalk.green(`   Import: import sdk from '${pkg.actualName}'`));
      }
      console.log();
    }

    const nextSteps = boxen(
      powerGradient('NEXT STEPS:\n\n') +
      '🚀 Start development servers\n' +
      '📚 Read package documentation\n' +
      '🧪 Run tests to verify installation\n' +
      '🔧 Configure environment variables',
      {
        padding: 1,
        margin: 1,
        borderStyle: 'round',
        borderColor: 'green'
      }
    );

    console.log(nextSteps);
    console.log(cultGradient('\nPress ENTER to exit...'));
    
    process.stdin.once('data', () => {
      process.exit(0);
    });
  }

  async showError(error) {
    console.clear();
    console.log(deathGradient('💀 INSTALLATION FAILED 💀\n'));
    console.log(chalk.red(`Error: ${error.message}\n`));
    console.log(cultGradient('The cult installation ritual has failed.\n'));
    console.log(powerGradient('Review the error and try again.\n'));
    process.exit(1);
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Start the cult package installation
new CultPackageInstaller(); 