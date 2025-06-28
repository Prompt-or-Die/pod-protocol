#!/usr/bin/env node

/**
 * Smart E2E Test Runner
 * 
 * Runs e2e tests and automatically attempts fixes if they fail
 */

const { exec } = require('child_process'); // eslint-disable-line
const { promisify } = require('util'); // eslint-disable-line

const execAsync = promisify(exec);

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

async function runTestsWithRecovery(testCommand, description) {
  log(`\n🧪 ${description}`, 'cyan');
  log(`Command: ${testCommand}`, 'blue');
  
  try {
    const { stdout, stderr } = await execAsync(testCommand);
    const output = stdout + stderr;
    
    // Check if tests passed
    if (output.includes('pass') || output.includes('✓') || !stderr) {
      log('✅ Tests passed successfully!', 'green');
      return { success: true, output };
    } else {
      throw new Error(output);
    }
  } catch (error) {
    log('❌ Tests failed, attempting automatic recovery...', 'yellow');
    
    try {
      // Run auto-recovery
      await execAsync('node scripts/auto-recover-tests.js');
      log('✅ Auto-recovery completed, retrying tests...', 'green');
      
      // Retry tests once
      const { stdout, stderr } = await execAsync(testCommand);
      const output = stdout + stderr;
      
      if (output.includes('pass') || output.includes('✓') || !stderr) {
        log('✅ Tests passed after recovery!', 'green');
        return { success: true, output };
      } else {
        throw new Error(output);
      }
    } catch (recoveryError) {
      log('❌ Tests still failing after recovery attempt', 'red');
      return { success: false, output: error.message };
    }
  }
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Smart E2E Test Runner with Auto-Recovery

Usage: node scripts/smart-test-runner.js [options] [package]

Options:
  --help, -h     Show this help message
  --all          Run all packages (default)
  --api          Run API server tests only
  --cli          Run CLI tests only
  --frontend     Run frontend tests only
  --sdk          Run SDK tests only
  --mcp          Run MCP server tests only
  --plugin       Run ElizaOS plugin tests only

Examples:
  node scripts/smart-test-runner.js
  node scripts/smart-test-runner.js --cli
  node scripts/smart-test-runner.js --frontend
`);
    process.exit(0);
  }

  log('🚀 Smart E2E Test Runner with Auto-Recovery', 'bright');
  
  const testSuites = [];
  
  if (args.includes('--api')) {
    testSuites.push({
      name: 'API Server',
      command: 'cd packages/api-server/api-server && bun test tests/e2e/',
      icon: '📡'
    });
  } else if (args.includes('--cli')) {
    testSuites.push({
      name: 'CLI',
      command: 'cd packages/cli && bun test tests/e2e/',
      icon: '🔧'
    });
  } else if (args.includes('--frontend')) {
    testSuites.push({
      name: 'Frontend',
      command: 'cd packages/frontend && bun test tests/e2e/',
      icon: '🖥️'
    });
  } else if (args.includes('--sdk')) {
    testSuites.push({
      name: 'SDK TypeScript',
      command: 'cd packages/sdk-typescript/sdk && bun test tests/e2e/',
      icon: '📦'
    });
  } else if (args.includes('--mcp')) {
    testSuites.push({
      name: 'MCP Server',
      command: 'cd packages/mcp-server && bun test tests/e2e/',
      icon: '🔌'
    });
  } else if (args.includes('--plugin')) {
    testSuites.push({
      name: 'ElizaOS Plugin',
      command: 'cd packages/elizaos-plugin-podcom && bun test tests/e2e/',
      icon: '🤖'
    });
  } else {
    // Run all tests
    testSuites.push(
      {
        name: 'API Server',
        command: 'cd packages/api-server/api-server && bun test tests/e2e/',
        icon: '📡'
      },
      {
        name: 'CLI',
        command: 'cd packages/cli && bun test tests/e2e/',
        icon: '🔧'
      },
      {
        name: 'Frontend',
        command: 'cd packages/frontend && bun test tests/e2e/',
        icon: '🖥️'
      },
      {
        name: 'SDK TypeScript',
        command: 'cd packages/sdk-typescript/sdk && bun test tests/e2e/',
        icon: '📦'
      },
      {
        name: 'MCP Server',
        command: 'cd packages/mcp-server && bun test tests/e2e/',
        icon: '🔌'
      },
      {
        name: 'ElizaOS Plugin',
        command: 'cd packages/elizaos-plugin-podcom && bun test tests/e2e/',
        icon: '🤖'
      }
    );
  }

  const results = [];
  
  for (const suite of testSuites) {
    const result = await runTestsWithRecovery(
      suite.command,
      `${suite.icon} ${suite.name} E2E Tests`
    );
    
    results.push({
      name: suite.name,
      icon: suite.icon,
      ...result
    });
  }

  // Summary
  log('\n📊 Test Results Summary:', 'bright');
  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  results.forEach(result => {
    const status = result.success ? '✅ PASSED' : '❌ FAILED';
    const color = result.success ? 'green' : 'red';
    log(`${result.icon} ${result.name}: ${status}`, color);
  });
  
  log(`\n📈 Overall: ${passed}/${results.length} test suites passed`, 
      failed === 0 ? 'green' : 'yellow');
  
  if (failed > 0) {
    log('\n💡 For failed tests, try:', 'cyan');
    log('  node scripts/fix-e2e-issues.js --verify', 'blue');
    log('  node scripts/auto-recover-tests.js', 'blue');
  }
  
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((error) => {
  log(`💥 Smart test runner failed: ${error.message}`, 'red');
  process.exit(1);
}); 