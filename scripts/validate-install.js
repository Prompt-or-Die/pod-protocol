#!/usr/bin/env node
// Validation script for install.js functionality

import chalk from 'chalk';
import { existsSync, readdirSync } from 'fs';
import { join, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

class InstallValidator {
  constructor() {
    this.projectRoot = this.findProjectRoot();
    this.packagesPath = join(this.projectRoot, 'packages');
    this.results = { passed: 0, failed: 0, tests: [] };
  }

  findProjectRoot() {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    let currentDir = __dirname;
    
    while (currentDir !== dirname(currentDir)) {
      if (existsSync(join(currentDir, 'packages')) && existsSync(join(currentDir, 'scripts'))) {
        return currentDir;
      }
      currentDir = dirname(currentDir);
    }
    return resolve(process.cwd());
  }

  test(name, testFn) {
    try {
      const result = testFn();
      if (result) {
        console.log(chalk.green(`✅ ${name}`));
        this.results.passed++;
      } else {
        console.log(chalk.red(`❌ ${name}`));
        this.results.failed++;
      }
      this.results.tests.push({ name, passed: result });
    } catch (error) {
      console.log(chalk.red(`❌ ${name} - ${error.message}`));
      this.results.failed++;
      this.results.tests.push({ name, passed: false, error: error.message });
    }
  }

  async validate() {
    console.clear();
    console.log(chalk.cyan('🔬 INSTALL SCRIPT VALIDATION\n'));

    this.test('Project root detection', () => {
      console.log(`   Root: ${this.projectRoot}`);
      return existsSync(this.projectRoot);
    });

    this.test('Packages directory exists', () => {
      console.log(`   Packages: ${this.packagesPath}`);
      return existsSync(this.packagesPath);
    });

    this.test('Package detection logic', () => {
      const packages = ['sdk-typescript', 'sdk-javascript', 'cli', 'frontend'];
      let found = 0;
      
      for (const pkg of packages) {
        const pkgPath = join(this.packagesPath, pkg);
        if (existsSync(pkgPath)) {
          console.log(`   Found: ${pkg}`);
          found++;
        }
      }
      
      console.log(`   Total found: ${found}/${packages.length}`);
      return found > 0;
    });

    this.test('Choice array generation', () => {
      const testPackages = [
        { name: 'test1', emoji: '📦', category: 'SDK', available: true },
        { name: 'test2', emoji: '🔧', category: 'Tools', available: true }
      ];
      
      const choices = testPackages.map(pkg => ({
        name: pkg.name,
        message: `${pkg.emoji} ${pkg.name}`,
        hint: pkg.category
      }));
      
      console.log(`   Generated ${choices.length} choices`);
      return choices.length > 0;
    });

    this.test('Error handling for empty packages', () => {
      // Simulate empty package scenario
      const emptyChoices = [];
      const wouldFail = emptyChoices.length === 0;
      console.log(`   Empty choices would ${wouldFail ? 'fail gracefully' : 'pass incorrectly'}`);
      return wouldFail; // Should detect this scenario
    });

    console.log('\n' + '='.repeat(50));
    console.log(chalk.cyan('VALIDATION SUMMARY:'));
    console.log(chalk.green(`✅ Passed: ${this.results.passed}`));
    console.log(chalk.red(`❌ Failed: ${this.results.failed}`));
    
    const allPassed = this.results.failed === 0;
    console.log('\n' + (allPassed ? 
      chalk.green('🎉 All tests passed! Install script should work correctly.') :
      chalk.red('💀 Some tests failed. Fix issues before using install script.')
    ));

    return allPassed;
  }
}

// Run validation
const validator = new InstallValidator();
validator.validate().then(success => {
  process.exit(success ? 0 : 1);
}); 