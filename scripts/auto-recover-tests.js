#!/usr/bin/env node

/**
 * Automatic E2E Test Recovery Script
 * 
 * This script is triggered when e2e tests fail and attempts to automatically
 * fix common issues and re-run the tests.
 */

const { exec, spawn } = require('child_process'); // eslint-disable-line
const fs = require('fs'); // eslint-disable-line
const path = require('path'); // eslint-disable-line
const { promisify } = require('util'); // eslint-disable-line

const execAsync = promisify(exec);

// Colors for output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Recovery strategies in order of severity
const RECOVERY_STRATEGIES = [
  {
    name: 'Quick Port Fix',
    description: 'Free up occupied ports',
    script: 'scripts/fix-ports.js',
    severity: 1
  },
  {
    name: 'Environment Reset',
    description: 'Set required environment variables',
    script: null,
    action: async () => {
      process.env.NODE_ENV = 'test';
      process.env.SOLANA_NETWORK = 'devnet';
      log('✅ Environment variables set', 'green');
    },
    severity: 1
  },
  {
    name: 'Cache Clean',
    description: 'Clear package caches',
    script: null,
    action: async () => {
      try {
        await execAsync('bun pm cache rm');
        log('✅ Cache cleared', 'green');
      } catch (error) {
        log('⚠️  Could not clear cache', 'yellow');
      }
    },
    severity: 2
  },
  {
    name: 'Dependency Fix',
    description: 'Reinstall corrupted dependencies',
    script: 'scripts/fix-deps.js',
    severity: 3
  },
  {
    name: 'Build Refresh',
    description: 'Rebuild all packages',
    script: 'scripts/fix-builds.js',
    severity: 4
  },
  {
    name: 'Full Recovery',
    description: 'Run comprehensive diagnostics and fixes',
    script: 'scripts/fix-e2e-issues.js',
    severity: 5
  }
];

class TestRecovery {
  constructor() {
    this.attempts = 0;
    this.maxAttempts = 3;
    this.failureReasons = [];
  }

  async analyzeFailure(testOutput) {
    log('\n🔍 Analyzing test failure...', 'cyan');
    
    const reasons = [];
    
    // Common failure patterns
    const patterns = [
      { pattern: /EADDRINUSE.*:(\d+)/, reason: 'Port conflict', severity: 1 },
      { pattern: /Cannot find module/, reason: 'Missing dependencies', severity: 3 },
      { pattern: /ENOENT.*dist/, reason: 'Missing build artifacts', severity: 4 },
      { pattern: /Connection refused/, reason: 'Service not running', severity: 1 },
      { pattern: /fetch.*ENOTFOUND/, reason: 'Network connectivity', severity: 2 },
      { pattern: /Timeout.*exceeded/, reason: 'Test timeout', severity: 2 },
      { pattern: /Permission denied/, reason: 'File permissions', severity: 3 },
      { pattern: /ENOSPC/, reason: 'Disk space', severity: 5 }
    ];

    for (const { pattern, reason, severity } of patterns) {
      if (pattern.test(testOutput)) {
        reasons.push({ reason, severity });
        log(`  📋 Detected: ${reason}`, 'yellow');
      }
    }

    if (reasons.length === 0) {
      reasons.push({ reason: 'Unknown failure', severity: 3 });
      log('  📋 Unknown failure pattern', 'yellow');
    }

    return reasons;
  }

  async runRecoveryStrategy(strategy) {
    log(`\n🔧 Running: ${strategy.name}`, 'cyan');
    log(`   ${strategy.description}`, 'blue');

    try {
      if (strategy.script) {
        // Run external script
        await execAsync(`node ${strategy.script}`);
      } else if (strategy.action) {
        // Run inline action
        await strategy.action();
      }
      
      log(`✅ ${strategy.name} completed successfully`, 'green');
      return { success: true };
    } catch (error) {
      log(`❌ ${strategy.name} failed: ${error.message}`, 'red');
      return { success: false, error: error.message };
    }
  }

  async runTests(package = null) {
    log('\n🧪 Running tests...', 'cyan');
    
    try {
      const testCmd = package 
        ? `bun test ${package}/tests/e2e/ --timeout 30000`
        : 'bun run test:e2e';
        
      const { stdout, stderr } = await execAsync(testCmd);
      const output = stdout + stderr;
      
      if (output.includes('pass') || output.includes('✓')) {
        log('✅ Tests passed!', 'green');
        return { success: true, output };
      } else {
        return { success: false, output };
      }
    } catch (error) {
      return { success: false, output: error.stdout + error.stderr };
    }
  }

  async attemptRecovery(testOutput) {
    this.attempts++;
    
    if (this.attempts > this.maxAttempts) {
      log(`\n❌ Maximum recovery attempts (${this.maxAttempts}) exceeded`, 'red');
      return false;
    }

    log(`\n🔄 Recovery attempt ${this.attempts}/${this.maxAttempts}`, 'bright');
    
    // Analyze failure
    const reasons = await this.analyzeFailure(testOutput);
    this.failureReasons.push(...reasons);
    
    // Determine recovery strategy based on severity
    const maxSeverity = Math.max(...reasons.map(r => r.severity));
    const strategiesToRun = RECOVERY_STRATEGIES.filter(s => s.severity <= maxSeverity);
    
    log(`\n📋 Running ${strategiesToRun.length} recovery strategies...`, 'cyan');
    
    // Run recovery strategies
    for (const strategy of strategiesToRun) {
      await this.runRecoveryStrategy(strategy);
      
      // Wait a bit between strategies
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    return true;
  }

  async run(targetPackage = null) {
    log('🚀 Starting automatic test recovery...', 'bright');
    
    while (this.attempts < this.maxAttempts) {
      // Run tests
      const testResult = await this.runTests(targetPackage);
      
      if (testResult.success) {
        log('\n🎉 Tests are now passing!', 'green');
        log(`Recovery completed in ${this.attempts} attempt(s)`, 'cyan');
        return true;
      }
      
      // Attempt recovery
      const shouldContinue = await this.attemptRecovery(testResult.output);
      if (!shouldContinue) {
        break;
      }
    }
    
    // Final failure
    log('\n❌ Automatic recovery failed', 'red');
    log('Manual intervention may be required.', 'yellow');
    
    // Show summary
    log('\n📊 Recovery Summary:', 'bright');
    log(`   Attempts: ${this.attempts}/${this.maxAttempts}`, 'blue');
    log(`   Issues detected: ${[...new Set(this.failureReasons.map(r => r.reason))].join(', ')}`, 'blue');
    
    log('\n💡 Suggested next steps:', 'cyan');
    log('   1. Check the test output above for specific errors', 'blue');
    log('   2. Run: node scripts/fix-e2e-issues.js --diagnose-only', 'blue');
    log('   3. Manually investigate failing tests', 'blue');
    log('   4. Check service logs and dependencies', 'blue');
    
    return false;
  }
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Automatic E2E Test Recovery

Usage: node scripts/auto-recover-tests.js [package]

Arguments:
  package    Specific package to test (optional)

Examples:
  node scripts/auto-recover-tests.js
  node scripts/auto-recover-tests.js packages/cli
  node scripts/auto-recover-tests.js packages/frontend
`);
    process.exit(0);
  }

  const targetPackage = args[0];
  const recovery = new TestRecovery();
  const success = await recovery.run(targetPackage);
  
  process.exit(success ? 0 : 1);
}

main().catch((error) => {
  log(`💥 Recovery script failed: ${error.message}`, 'red');
  process.exit(1);
}); 