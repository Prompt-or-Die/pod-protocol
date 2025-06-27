#!/usr/bin/env node

/**
 * PoD Protocol SDK Health Check Script
 * 
 * Validates SDK build status, dependencies, and provides diagnostic information
 * for developers to quickly identify and resolve issues.
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');

const execAsync = util.promisify(exec);

class HealthChecker {
  constructor() {
    this.results = {
      overall: 'unknown',
      checks: [],
      warnings: [],
      errors: [],
      info: []
    };
    this.startTime = Date.now();
  }

  /**
   * Add check result
   */
  addCheck(name, status, message, details = null) {
    const check = {
      name,
      status, // 'pass', 'fail', 'warn'
      message,
      details,
      timestamp: new Date().toISOString()
    };
    
    this.results.checks.push(check);
    
    if (status === 'fail') {
      this.results.errors.push(check);
    } else if (status === 'warn') {
      this.results.warnings.push(check);
    }
    
    // Console output with colors
    const statusIcon = {
      pass: '✅',
      fail: '❌',
      warn: '⚠️'
    }[status];
    
    console.log(`${statusIcon} ${name}: ${message}`);
    if (details) {
      console.log(`   Details: ${JSON.stringify(details, null, 2)}`);
    }
  }

  /**
   * Add info message
   */
  addInfo(message, data = null) {
    this.results.info.push({ message, data, timestamp: new Date().toISOString() });
    console.log(`ℹ️  ${message}`);
    if (data) {
      console.log(`   ${JSON.stringify(data, null, 2)}`);
    }
  }

  /**
   * Check if package.json exists and is valid
   */
  async checkPackageJson() {
    try {
      const packagePath = path.join(__dirname, '..', 'package.json');
      
      if (!fs.existsSync(packagePath)) {
        this.addCheck('Package.json', 'fail', 'package.json not found');
        return;
      }
      
      const packageContent = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
      
      // Check required fields
      const requiredFields = ['name', 'version', 'main', 'types'];
      const missingFields = requiredFields.filter(field => !packageContent[field]);
      
      if (missingFields.length > 0) {
        this.addCheck('Package.json', 'warn', 'Missing required fields', { missingFields });
      } else {
        this.addCheck('Package.json', 'pass', 'Valid package.json found');
      }
      
      // Check scripts
      const requiredScripts = ['build', 'test', 'lint'];
      const missingScripts = requiredScripts.filter(script => !packageContent.scripts || !packageContent.scripts[script]);
      
      if (missingScripts.length > 0) {
        this.addCheck('Package Scripts', 'warn', 'Missing recommended scripts', { missingScripts });
      } else {
        this.addCheck('Package Scripts', 'pass', 'All recommended scripts present');
      }
      
    } catch (error) {
      this.addCheck('Package.json', 'fail', 'Failed to parse package.json', { error: error.message });
    }
  }

  /**
   * Check if TypeScript configuration is valid
   */
  async checkTypeScriptConfig() {
    try {
      const tsconfigPath = path.join(__dirname, '..', 'tsconfig.json');
      
      if (!fs.existsSync(tsconfigPath)) {
        this.addCheck('TypeScript Config', 'warn', 'tsconfig.json not found');
        return;
      }
      
      const tsconfigContent = JSON.parse(fs.readFileSync(tsconfigPath, 'utf8'));
      
      // Check compiler options
      const compilerOptions = tsconfigContent.compilerOptions || {};
      const recommendedOptions = {
        'strict': true,
        'esModuleInterop': true,
        'skipLibCheck': true
      };
      
      const missingOptions = Object.entries(recommendedOptions)
        .filter(([key, value]) => compilerOptions[key] !== value)
        .map(([key]) => key);
      
      if (missingOptions.length > 0) {
        this.addCheck('TypeScript Config', 'warn', 'Missing recommended compiler options', { missingOptions });
      } else {
        this.addCheck('TypeScript Config', 'pass', 'TypeScript configuration looks good');
      }
      
    } catch (error) {
      this.addCheck('TypeScript Config', 'fail', 'Failed to parse tsconfig.json', { error: error.message });
    }
  }

  /**
   * Check build outputs
   */
  async checkBuildOutputs() {
    const distPath = path.join(__dirname, '..', 'dist');
    
    if (!fs.existsSync(distPath)) {
      this.addCheck('Build Outputs', 'fail', 'dist directory not found - run npm run build');
      return;
    }
    
    // Check for main output files
    const expectedFiles = ['index.js', 'index.d.ts'];
    const missingFiles = expectedFiles.filter(file => !fs.existsSync(path.join(distPath, file)));
    
    if (missingFiles.length > 0) {
      this.addCheck('Build Outputs', 'fail', 'Missing build output files', { missingFiles });
    } else {
      this.addCheck('Build Outputs', 'pass', 'Build outputs present');
      
      // Check file sizes
      const fileSizes = expectedFiles.map(file => {
        const filePath = path.join(distPath, file);
        const stats = fs.statSync(filePath);
        return { file, size: stats.size, sizeKB: Math.round(stats.size / 1024 * 100) / 100 };
      });
      
      this.addInfo('Build file sizes', fileSizes);
    }
  }

  /**
   * Check dependencies
   */
  async checkDependencies() {
    try {
      const packagePath = path.join(__dirname, '..', 'package.json');
      const packageContent = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
      
      // Check for node_modules
      const nodeModulesPath = path.join(__dirname, '..', 'node_modules');
      if (!fs.existsSync(nodeModulesPath)) {
        this.addCheck('Dependencies', 'fail', 'node_modules not found - run npm install');
        return;
      }
      
      // Check key dependencies
      const keyDependencies = ['@solana/web3.js', '@coral-xyz/anchor'];
      const installedDeps = [];
      const missingDeps = [];
      
      keyDependencies.forEach(dep => {
        const depPath = path.join(nodeModulesPath, dep);
        if (fs.existsSync(depPath)) {
          installedDeps.push(dep);
        } else {
          missingDeps.push(dep);
        }
      });
      
      if (missingDeps.length > 0) {
        this.addCheck('Dependencies', 'fail', 'Missing key dependencies', { missingDeps });
      } else {
        this.addCheck('Dependencies', 'pass', 'Key dependencies installed');
      }
      
      // Count total dependencies
      const totalDeps = Object.keys(packageContent.dependencies || {}).length;
      const totalDevDeps = Object.keys(packageContent.devDependencies || {}).length;
      
      this.addInfo('Dependency summary', { 
        totalDependencies: totalDeps,
        totalDevDependencies: totalDevDeps,
        installedDependencies: installedDeps.length
      });
      
    } catch (error) {
      this.addCheck('Dependencies', 'fail', 'Failed to check dependencies', { error: error.message });
    }
  }

  /**
   * Check TypeScript compilation
   */
  async checkTypeScriptCompilation() {
    try {
      const { stdout, stderr } = await execAsync('npx tsc --noEmit', { 
        cwd: path.join(__dirname, '..'),
        timeout: 30000 
      });
      
      if (stderr && stderr.includes('error')) {
        this.addCheck('TypeScript Compilation', 'fail', 'TypeScript compilation errors found', { stderr });
      } else {
        this.addCheck('TypeScript Compilation', 'pass', 'TypeScript compilation successful');
      }
      
    } catch (error) {
      // TypeScript errors will be in stdout for tsc
      if (error.stdout && error.stdout.includes('error TS')) {
        const errorCount = (error.stdout.match(/error TS/g) || []).length;
        this.addCheck('TypeScript Compilation', 'fail', `${errorCount} TypeScript error(s) found`, { 
          errors: error.stdout
        });
      } else {
        this.addCheck('TypeScript Compilation', 'warn', 'Could not check TypeScript compilation', { 
          error: error.message 
        });
      }
    }
  }

  /**
   * Check linting
   */
  async checkLinting() {
    try {
      const { stdout, stderr } = await execAsync('npx eslint src --ext .ts,.js', { 
        cwd: path.join(__dirname, '..'),
        timeout: 15000 
      });
      
      this.addCheck('Linting', 'pass', 'No linting errors found');
      
    } catch (error) {
      if (error.stdout || error.stderr) {
        const output = error.stdout || error.stderr;
        const errorCount = (output.match(/error/g) || []).length;
        const warningCount = (output.match(/warning/g) || []).length;
        
        if (errorCount > 0) {
          this.addCheck('Linting', 'fail', `${errorCount} linting error(s) found`, { output });
        } else if (warningCount > 0) {
          this.addCheck('Linting', 'warn', `${warningCount} linting warning(s) found`, { output });
        }
      } else {
        this.addCheck('Linting', 'warn', 'Could not check linting', { error: error.message });
      }
    }
  }

  /**
   * Check environment
   */
  async checkEnvironment() {
    const nodeVersion = process.version;
    const npmVersion = await this.getNpmVersion();
    
    this.addInfo('Environment', {
      nodeVersion,
      npmVersion,
      platform: process.platform,
      arch: process.arch,
      cwd: process.cwd()
    });
    
    // Check Node.js version
    const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
    if (majorVersion < 16) {
      this.addCheck('Node.js Version', 'warn', `Node.js ${nodeVersion} detected - recommend Node.js 16+`);
    } else {
      this.addCheck('Node.js Version', 'pass', `Node.js ${nodeVersion} is compatible`);
    }
  }

  /**
   * Get npm version
   */
  async getNpmVersion() {
    try {
      const { stdout } = await execAsync('npm --version');
      return stdout.trim();
    } catch {
      return 'unknown';
    }
  }

  /**
   * Run all health checks
   */
  async runAllChecks() {
    console.log('🔍 PoD Protocol SDK Health Check\n');
    console.log('='.repeat(50));
    
    await this.checkEnvironment();
    await this.checkPackageJson();
    await this.checkTypeScriptConfig();
    await this.checkDependencies();
    await this.checkBuildOutputs();
    await this.checkTypeScriptCompilation();
    await this.checkLinting();
    
    // Determine overall status
    if (this.results.errors.length > 0) {
      this.results.overall = 'fail';
    } else if (this.results.warnings.length > 0) {
      this.results.overall = 'warn';
    } else {
      this.results.overall = 'pass';
    }
    
    this.printSummary();
    return this.results;
  }

  /**
   * Print health check summary
   */
  printSummary() {
    const duration = Date.now() - this.startTime;
    
    console.log('\n' + '='.repeat(50));
    console.log('📋 Health Check Summary');
    console.log('='.repeat(50));
    
    const statusIcon = {
      pass: '✅',
      warn: '⚠️',
      fail: '❌'
    }[this.results.overall];
    
    console.log(`Overall Status: ${statusIcon} ${this.results.overall.toUpperCase()}`);
    console.log(`Duration: ${duration}ms`);
    console.log(`Total Checks: ${this.results.checks.length}`);
    console.log(`Errors: ${this.results.errors.length}`);
    console.log(`Warnings: ${this.results.warnings.length}`);
    
    if (this.results.errors.length > 0) {
      console.log('\n❌ Errors to fix:');
      this.results.errors.forEach(error => {
        console.log(`  - ${error.name}: ${error.message}`);
      });
    }
    
    if (this.results.warnings.length > 0) {
      console.log('\n⚠️  Warnings to consider:');
      this.results.warnings.forEach(warning => {
        console.log(`  - ${warning.name}: ${warning.message}`);
      });
    }
    
    console.log('\n' + '='.repeat(50));
    
    if (this.results.overall === 'pass') {
      console.log('🎉 All checks passed! SDK is healthy.');
    } else if (this.results.overall === 'warn') {
      console.log('⚠️  SDK is functional but has warnings to address.');
    } else {
      console.log('❌ SDK has errors that need to be fixed.');
      process.exit(1);
    }
  }
}

// Run health check if this script is executed directly
if (require.main === module) {
  const checker = new HealthChecker();
  checker.runAllChecks().catch(error => {
    console.error('Health check failed:', error);
    process.exit(1);
  });
}

module.exports = HealthChecker; 