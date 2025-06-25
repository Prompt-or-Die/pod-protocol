#!/usr/bin/env node

/**
 * Cross-platform build script for PoD Protocol
 * Handles Bun/Anchor compatibility and ensures proper build order
 */

import { execSync } from 'child_process';
import { existsSync, copyFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const COLORS = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${COLORS[color]}${message}${COLORS.reset}`);
}

function runCommand(command, options = {}) {
  try {
    log(`Running: ${command}`, 'cyan');
    return execSync(command, { 
      stdio: 'inherit', 
      cwd: process.cwd(),
      ...options 
    });
  } catch (error) {
    log(`Error running command: ${command}`, 'red');
    log(error.message, 'red');
    return null;
  }
}

function checkCommand(command) {
  try {
    execSync(`${command} --version`, { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

async function buildAnchorProgram() {
  log('🏗️  Building Anchor program...', 'blue');
  
  if (!checkCommand('anchor')) {
    log('❌ Anchor CLI not found. Installing...', 'yellow');
    runCommand('cargo install --git https://github.com/coral-xyz/anchor avm --locked --force');
    runCommand('avm install 0.31.1');
    runCommand('avm use 0.31.1');
  }
  
  // Try to build with anchor first
  const result = runCommand('anchor build');
  
  if (result === null) {
    log('❌ Anchor build failed, falling back to cargo build', 'yellow');
    
    // Check if we have cargo-build-sbf
    if (!checkCommand('cargo-build-sbf')) {
      log('⚠️  cargo-build-sbf not found, using regular cargo build', 'yellow');
      runCommand('cd programs/pod-com && cargo build --release');
    } else {
      runCommand('cd programs/pod-com && cargo build-sbf');
    }
  }
  
  return result !== null;
}

async function buildTypeScriptSDK() {
  log('📦 Building TypeScript SDK...', 'magenta');
  
  // Install dependencies
  runCommand('cd sdk && bun install');
  
  // Build SDK
  runCommand('cd sdk && bun run build:prod');
  
  log('✅ TypeScript SDK built successfully', 'green');
}

async function buildJavaScriptSDK() {
  log('📦 Building JavaScript SDK...', 'magenta');
  
  // Install dependencies
  if (checkCommand('bun')) {
    runCommand('cd sdk-js && bun install');
  } else if (checkCommand('npm')) {
    runCommand('cd sdk-js && npm install');
  }
  
  // Build SDK
  runCommand('cd sdk-js && npm run build:prod');
  
  log('✅ JavaScript SDK built successfully', 'green');
}

async function buildPythonSDK() {
  log('📦 Building Python SDK...', 'magenta');
  
  // Check if Python is installed
  const pythonCmd = checkCommand('python3') ? 'python3' : 'python';
  const pipCmd = checkCommand('pip3') ? 'pip3' : 'pip';
  
  if (!checkCommand(pythonCmd)) {
    log('⚠️  Python not found, skipping Python SDK build', 'yellow');
    return;
  }
  
  try {
    // Try to create virtual environment
    log('Creating Python virtual environment...', 'cyan');
    runCommand(`cd sdk-python && ${pythonCmd} -m venv .venv`);
    
    // Activate virtual environment and install build dependencies
    const venvPython = process.platform === 'win32' 
      ? '.venv/Scripts/python'
      : '.venv/bin/python';
    const venvPip = process.platform === 'win32'
      ? '.venv/Scripts/pip'
      : '.venv/bin/pip';
    
    log('Installing build dependencies in virtual environment...', 'cyan');
    runCommand(`cd sdk-python && ${venvPip} install --upgrade pip build twine`);
    
    // Build distribution
    runCommand(`cd sdk-python && ${venvPython} -m build`);
    
  } catch (error) {
    log('⚠️  Virtual environment failed, trying alternative approach...', 'yellow');
    
    // Alternative: try using pipx or user installation
    try {
      if (checkCommand('pipx')) {
        log('Using pipx for build...', 'cyan');
        runCommand(`cd sdk-python && pipx run build`);
      } else {
        log('Using user installation for build...', 'cyan');
        runCommand(`cd sdk-python && ${pipCmd} install --user build`);
        runCommand(`cd sdk-python && ${pythonCmd} -m build`);
      }
    } catch (altError) {
      log('⚠️  Python SDK build failed - please install python3-venv or pipx', 'yellow');
      log('Run: sudo apt install python3-venv python3-pip', 'yellow');
      return;
    }
  }
  
  log('✅ Python SDK built successfully', 'green');
}

async function buildCLI() {
  log('📦 Building CLI...', 'magenta');
  
  // Install dependencies
  runCommand('cd cli && bun install');
  
  // Build CLI
  runCommand('cd cli && bun run build:prod');
  
  log('✅ CLI built successfully', 'green');
}

async function buildWorkspaces() {
  log('🏗️  Building all workspaces...', 'blue');
  
  await buildTypeScriptSDK();
  await buildJavaScriptSDK();
  await buildPythonSDK();
  await buildCLI();
}

async function generateIDL() {
  log('📝 Generating IDL...', 'blue');
  
  // Try to copy IDL from target directory
  const idlPath = 'target/idl/pod_com.json';
  const sdkIdlPath = 'sdk/src/pod_com.json';
  const jsIdlPath = 'sdk-js/src/pod_com.json';
  
  if (existsSync(idlPath)) {
    copyFileSync(idlPath, sdkIdlPath);
    copyFileSync(idlPath, jsIdlPath);
    log('✅ IDL copied to SDKs', 'green');
  } else {
    log('⚠️  IDL not found, using existing version', 'yellow');
  }
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function main() {
  const args = process.argv.slice(2);
  const buildType = args[0] || 'all';
  
  log('🚀 Starting PoD Protocol build...', 'green');
  log(`📍 Build type: ${buildType}`, 'cyan');
  
  // Add Solana to PATH if it exists
  if (existsSync(`${process.env.HOME}/.local/share/solana/install/active_release/bin`)) {
    process.env.PATH = `${process.env.HOME}/.local/share/solana/install/active_release/bin:${process.env.PATH}`;
    log('✅ Solana CLI found and added to PATH', 'green');
  }
  
  try {
    switch (buildType) {
      case 'anchor':
        await buildAnchorProgram();
        await generateIDL();
        break;
      case 'typescript':
      case 'ts':
        await buildTypeScriptSDK();
        break;
      case 'javascript':
      case 'js':
        await buildJavaScriptSDK();
        break;
      case 'python':
      case 'py':
        await buildPythonSDK();
        break;
      case 'cli':
        await buildCLI();
        break;
      case 'workspaces':
        await buildWorkspaces();
        break;
      case 'all':
      default:
        await buildAnchorProgram();
        await generateIDL();
        await buildWorkspaces();
        break;
    }
    
    log('✅ Build completed successfully!', 'green');
    log('📚 Run ./install.sh to install the SDKs', 'cyan');
  } catch (error) {
    log(`❌ Build failed: ${error.message}`, 'red');
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { main, buildAnchorProgram, buildWorkspaces, generateIDL };
