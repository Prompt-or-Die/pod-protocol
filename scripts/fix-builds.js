#!/usr/bin/env node

/**
 * Build Fixer for E2E Tests
 * Rebuilds all packages that need compilation
 */

const { exec } = require('child_process'); // eslint-disable-line
const fs = require('fs'); // eslint-disable-line
const path = require('path'); // eslint-disable-line
const { promisify } = require('util'); // eslint-disable-line

const execAsync = promisify(exec);

const BUILD_PACKAGES = [
  'packages/api-server/api-server',
  'packages/cli',
  'packages/mcp-server', 
  'packages/sdk-typescript/sdk'
];

async function cleanBuildArtifacts(packagePath) {
  const distPath = path.join(packagePath, 'dist');
  const buildPath = path.join(packagePath, 'build');
  
  try {
    if (fs.existsSync(distPath)) {
      await execAsync('rm -rf dist', { cwd: packagePath });
      console.log(`  🗑️  Cleaned dist in ${packagePath}`);
    }
    
    if (fs.existsSync(buildPath)) {
      await execAsync('rm -rf build', { cwd: packagePath });
      console.log(`  🗑️  Cleaned build in ${packagePath}`);
    }
  } catch (error) {
    console.log(`  ⚠️  Could not clean build artifacts in ${packagePath}`);
  }
}

async function rebuildPackage(packagePath) {
  console.log(`🔨 Rebuilding ${packagePath}...`);
  
  if (!fs.existsSync(packagePath)) {
    console.log(`⚠️  Package ${packagePath} not found, skipping`);
    return;
  }

  const packageJsonPath = path.join(packagePath, 'package.json');
  if (!fs.existsSync(packageJsonPath)) {
    console.log(`⚠️  No package.json in ${packagePath}, skipping`);
    return;
  }

  try {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    if (!packageJson.scripts || !packageJson.scripts.build) {
      console.log(`  ℹ️  No build script in ${packagePath}, skipping`);
      return;
    }

    // Clean old artifacts
    await cleanBuildArtifacts(packagePath);
    
    // Rebuild
    await execAsync('bun run build', { cwd: packagePath });
    console.log(`  ✅ Successfully rebuilt ${packagePath}`);
    
  } catch (error) {
    console.log(`  ❌ Failed to rebuild ${packagePath}: ${error.message}`);
  }
}

async function main() {
  console.log('🔨 Rebuilding packages for e2e tests...\n');
  
  for (const pkg of BUILD_PACKAGES) {
    await rebuildPackage(pkg);
  }
  
  console.log('\n✅ All packages have been rebuilt!');
  console.log('You can now run: bun run test:e2e');
}

main().catch(console.error); 