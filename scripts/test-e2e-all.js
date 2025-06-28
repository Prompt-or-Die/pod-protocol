#!/usr/bin/env node

/**
 * E2E Test Runner for PoD Protocol
 * 
 * This script runs all e2e tests across all packages and provides
 * comprehensive reporting of test results.
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// ANSI colors for output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// Package configurations
const packages = [
  {
    name: 'API Server',
    path: 'packages/api-server/api-server',
    icon: '📡',
    testPath: 'tests/e2e/',
    timeout: 45000
  },
  {
    name: 'CLI',
    path: 'packages/cli',
    icon: '🔧',
    testPath: 'tests/e2e/',
    timeout: 60000
  },
  {
    name: 'Frontend',
    path: 'packages/frontend',
    icon: '🖥️',
    testPath: 'tests/e2e/',
    timeout: 30000
  },
  {
    name: 'SDK TypeScript',
    path: 'packages/sdk-typescript/sdk',
    icon: '📦',
    testPath: 'tests/e2e/',
    timeout: 20000
  },
  {
    name: 'MCP Server',
    path: 'packages/mcp-server',
    icon: '🔌',
    testPath: 'tests/e2e/',
    timeout: 35000
  },
  {
    name: 'ElizaOS Plugin',
    path: 'packages/elizaos-plugin-podcom',
    icon: '🤖',
    testPath: 'tests/e2e/',
    timeout: 15000
  }
];

// Test results tracking
const results = {
  total: 0,
  passed: 0,
  failed: 0,
  skipped: 0,
  packages: []
};

// Helper functions
function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logHeader(message) {
  console.log('\n' + '='.repeat(60));
  log(message, 'bright');
  console.log('='.repeat(60));
}

function logPackage(pkg, status, duration) {
  const statusIcon = status === 'passed' ? '✅' : status === 'failed' ? '❌' : '⏭️';
  const statusColor = status === 'passed' ? 'green' : status === 'failed' ? 'red' : 'yellow';
  
  log(`${pkg.icon} ${pkg.name}: ${statusIcon} ${status.toUpperCase()} (${duration}ms)`, statusColor);
}

function checkTestFiles(pkg) {
  const testDir = path.join(pkg.path, pkg.testPath);
  if (!fs.existsSync(testDir)) {
    return { exists: false, files: [] };
  }
  
  const files = fs.readdirSync(testDir)
    .filter(file => file.endsWith('.e2e.test.ts'))
    .map(file => path.join(testDir, file));
  
  return { exists: true, files };
}

async function runPackageTests(pkg) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    
    // Check if test files exist
    const testCheck = checkTestFiles(pkg);
    if (!testCheck.exists || testCheck.files.length === 0) {
      const duration = Date.now() - startTime;
      resolve({
        package: pkg.name,
        status: 'skipped',
        duration,
        reason: 'No e2e test files found',
        output: ''
      });
      return;
    }

    log(`\n${pkg.icon} Running ${pkg.name} e2e tests...`, 'cyan');
    log(`   Path: ${pkg.path}`, 'blue');
    log(`   Files: ${testCheck.files.length} test file(s)`, 'blue');

    const child = spawn('bun', ['test', pkg.testPath], {
      cwd: pkg.path,
      stdio: 'pipe',
      env: {
        ...process.env,
        NODE_ENV: 'test',
        FORCE_COLOR: '1'
      }
    });

    let output = '';
    let errorOutput = '';

    child.stdout.on('data', (data) => {
      output += data.toString();
    });

    child.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    // Timeout handling
    const timeout = setTimeout(() => {
      child.kill();
      const duration = Date.now() - startTime;
      resolve({
        package: pkg.name,
        status: 'failed',
        duration,
        reason: 'Timeout',
        output: output + errorOutput
      });
    }, pkg.timeout);

    child.on('close', (code) => {
      clearTimeout(timeout);
      const duration = Date.now() - startTime;
      const status = code === 0 ? 'passed' : 'failed';
      
      resolve({
        package: pkg.name,
        status,
        duration,
        code,
        output: output + errorOutput
      });
    });

    child.on('error', (error) => {
      clearTimeout(timeout);
      const duration = Date.now() - startTime;
      resolve({
        package: pkg.name,
        status: 'failed',
        duration,
        reason: error.message,
        output: errorOutput
      });
    });
  });
}

function generateReport() {
  logHeader('📊 E2E TEST RESULTS SUMMARY');
  
  console.log(`\n${colors.bright}Overall Results:${colors.reset}`);
  console.log(`   Total Packages: ${results.total}`);
  console.log(`   ${colors.green}✅ Passed: ${results.passed}${colors.reset}`);
  console.log(`   ${colors.red}❌ Failed: ${results.failed}${colors.reset}`);
  console.log(`   ${colors.yellow}⏭️  Skipped: ${results.skipped}${colors.reset}`);
  
  const successRate = results.total > 0 ? Math.round((results.passed / results.total) * 100) : 0;
  console.log(`   ${colors.bright}📈 Success Rate: ${successRate}%${colors.reset}`);

  console.log(`\n${colors.bright}Package Details:${colors.reset}`);
  results.packages.forEach(pkg => {
    logPackage(
      packages.find(p => p.name === pkg.package),
      pkg.status,
      pkg.duration
    );
    
    if (pkg.reason) {
      log(`     Reason: ${pkg.reason}`, 'yellow');
    }
  });

  // Failed tests details
  const failedPackages = results.packages.filter(p => p.status === 'failed');
  if (failedPackages.length > 0) {
    console.log(`\n${colors.red}${colors.bright}❌ Failed Package Details:${colors.reset}`);
    failedPackages.forEach(pkg => {
      console.log(`\n${colors.red}📦 ${pkg.package}:${colors.reset}`);
      if (pkg.output) {
        // Show last 10 lines of output
        const lines = pkg.output.split('\n').slice(-10);
        lines.forEach(line => {
          if (line.trim()) {
            console.log(`   ${line}`);
          }
        });
      }
    });
  }

  console.log('\n' + '='.repeat(60));
  
  if (results.failed === 0) {
    log('🎉 All e2e tests completed successfully!', 'green');
  } else {
    log(`⚠️  ${results.failed} package(s) had test failures.`, 'red');
    log('Check the output above for details.', 'yellow');
  }
  
  console.log('='.repeat(60));
}

async function main() {
  logHeader('🧪 PoD Protocol E2E Test Suite');
  
  log('Starting comprehensive e2e testing across all packages...', 'cyan');
  log(`Testing ${packages.length} packages with Bun test runner\n`, 'blue');

  const startTime = Date.now();
  
  // Run tests for each package
  for (const pkg of packages) {
    const result = await runPackageTests(pkg);
    
    results.total++;
    results.packages.push(result);
    
    if (result.status === 'passed') {
      results.passed++;
    } else if (result.status === 'failed') {
      results.failed++;
    } else {
      results.skipped++;
    }
    
    logPackage(pkg, result.status, result.duration);
  }

  const totalDuration = Date.now() - startTime;
  
  // Generate final report
  generateReport();
  
  console.log(`\n${colors.bright}⏱️  Total execution time: ${totalDuration}ms${colors.reset}`);
  
  // Exit with error code if any tests failed
  process.exit(results.failed > 0 ? 1 : 0);
}

// Handle CLI arguments
const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
  console.log(`
PoD Protocol E2E Test Runner

Usage: node scripts/test-e2e-all.js [options]

Options:
  --help, -h     Show this help message
  --verbose, -v  Show verbose output

Environment Variables:
  NODE_ENV=test  Set test environment
  DEBUG=*        Enable debug output

Examples:
  node scripts/test-e2e-all.js
  NODE_ENV=test node scripts/test-e2e-all.js
  DEBUG=* node scripts/test-e2e-all.js --verbose
`);
  process.exit(0);
}

// Set verbose mode
if (args.includes('--verbose') || args.includes('-v')) {
  process.env.VERBOSE = 'true';
}

// Run the test suite
main().catch((error) => {
  log(`\n❌ Test runner failed: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
}); 