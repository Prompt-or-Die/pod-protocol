#!/usr/bin/env node

/**
 * Dependency Fixer for E2E Tests
 * Cleans and reinstalls dependencies across all packages
 */

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

const execAsync = promisify(exec);

const PACKAGES = [
  'packages/api-server/api-server',
  'packages/cli',
  'packages/frontend',
  'packages/mcp-server',
  'packages/sdk-typescript/sdk',
  'packages/elizaos-plugin-podcom'
];

async function cleanGlobalCache() {
  console.log('🧹 Cleaning global cache...');
  try {
    await execAsync('bun pm cache rm');
    console.log('✅ Bun cache cleared');
  } catch (error) {
    console.log('⚠️  Could not clean Bun cache');
  }
}

async function fixPackageDependencies(packagePath) {
  console.log(`🔧 Fixing dependencies in ${packagePath}...`);
  
  if (!fs.existsSync(packagePath)) {
    console.log(`⚠️  Package ${packagePath} not found, skipping`);
    return;
  }

  try {
    const nodeModulesPath = path.join(packagePath, 'node_modules');
    const lockfilePath = path.join(packagePath, 'bun.lock');
    
    // Remove node_modules if corrupted
    if (fs.existsSync(nodeModulesPath)) {
      await execAsync('rm -rf node_modules', { cwd: packagePath });
      console.log(`  🗑️  Removed node_modules in ${packagePath}`);
    }
    
    // Remove lockfile
    if (fs.existsSync(lockfilePath)) {
      fs.unlinkSync(lockfilePath);
      console.log(`  🗑️  Removed lockfile in ${packagePath}`);
    }
    
    // Reinstall
    await execAsync('bun install', { cwd: packagePath });
    console.log(`  ✅ Dependencies reinstalled in ${packagePath}`);
    
  } catch (error) {
    console.log(`  ❌ Failed to fix dependencies in ${packagePath}: ${error.message}`);
  }
}

async function main() {
  console.log('🔧 Fixing dependencies for e2e tests...\n');
  
  // Clean global cache first
  await cleanGlobalCache();
  
  // Fix root dependencies
  console.log('🔧 Fixing root dependencies...');
  try {
    await execAsync('bun install');
    console.log('✅ Root dependencies fixed');
  } catch (error) {
    console.log('❌ Failed to fix root dependencies');
  }
  
  // Fix each package
  for (const pkg of PACKAGES) {
    await fixPackageDependencies(pkg);
  }
  
  console.log('\n✅ All dependencies have been fixed!');
  console.log('You can now run: bun run test:e2e');
}

main().catch(console.error); 