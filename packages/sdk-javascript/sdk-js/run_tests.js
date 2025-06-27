#!/usr/bin/env node
/**
 * Test runner script for PoD Protocol JavaScript SDK
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    console.log(`Running: ${command} ${args.join(' ')}`);
    
    const process = spawn(command, args, {
      stdio: 'inherit',
      cwd: options.cwd || __dirname,
      ...options
    });

    process.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command failed with exit code ${code}`));
      }
    });

    process.on('error', (error) => {
      reject(error);
    });
  });
}

async function main() {
  const args = process.argv.slice(2);
  
  // Show help if requested
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
PoD Protocol JavaScript SDK Test Runner

Usage: node run_tests.js [options] [test-type]

Test Types:
  unit         Run unit tests only
  integration  Run integration tests only  
  e2e          Run end-to-end tests only
  all          Run all tests (default)

Options:
  --coverage   Generate coverage report
  --watch      Run tests in watch mode
  --verbose    Run tests in verbose mode
  --fast       Run tests with reduced timeout
  --help, -h   Show this help message

Examples:
  node run_tests.js unit --coverage
  node run_tests.js integration --verbose
  node run_tests.js e2e
  node run_tests.js all --coverage
    `);
    return;
  }
  
  // Parse arguments
  const testType = args.find(arg => ['unit', 'integration', 'e2e', 'all'].includes(arg)) || 'all';
  const coverage = args.includes('--coverage');
  const watch = args.includes('--watch');
  const verbose = args.includes('--verbose');
  const fast = args.includes('--fast');

  // Base Jest command
  let jestArgs = [];
  
  // Add test type patterns
  if (testType === 'unit') {
    jestArgs.push('--testPathPattern=(?!integration|e2e)');
  } else if (testType === 'integration') {
    jestArgs.push('--testPathPattern=integration');
  } else if (testType === 'e2e') {
    jestArgs.push('--testPathPattern=e2e');
  }
  
  // Add options
  if (coverage) {
    jestArgs.push('--coverage');
  }
  
  if (watch) {
    jestArgs.push('--watch');
  }
  
  if (verbose) {
    jestArgs.push('--verbose');
  }
  
  if (fast) {
    jestArgs.push('--testTimeout=5000');
  }

  try {
    await runCommand('npx', ['jest', ...jestArgs]);
    console.log('\n✅ Tests completed successfully!');
  } catch (error) {
    console.error('\n❌ Tests failed:', error.message);
    process.exit(1);
  }
}

// Handle CLI execution
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  main().catch(error => {
    console.error('Error running tests:', error);
    process.exit(1);
  });
}
