#!/usr/bin/env node

/**
 * PoD Protocol - Dry Run Publishing Script
 * 
 * This script simulates the publishing process without actually publishing packages.
 * Useful for testing the workflow and checking package configurations.
 */

import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// Colors for console output
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

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function execCommand(command, cwd = rootDir, options = {}) {
  try {
    // In dry run mode, we don't actually execute commands that modify state
    if (command.includes('publish') || command.includes('upload')) {
      return 'dry-run-success';
    }
    
    const result = execSync(command, {
      cwd,
      stdio: 'pipe',
      encoding: 'utf8',
      ...options
    });
    return result;
  } catch (error) {
    if (command.includes('npm view')) {
      // This is expected for new packages
      return null;
    }
    return null;
  }
}

function checkPackageExists(packagePath) {
  const packageJsonPath = join(packagePath, 'package.json');
  const pyprojectPath = join(packagePath, 'pyproject.toml');
  return existsSync(packageJsonPath) || existsSync(pyprojectPath);
}

function getPackageInfo(packagePath) {
  const packageJsonPath = join(packagePath, 'package.json');
  const pyprojectPath = join(packagePath, 'pyproject.toml');
  
  if (existsSync(packageJsonPath)) {
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
    return {
      name: packageJson.name,
      version: packageJson.version,
      type: 'npm',
      private: packageJson.private || false
    };
  } else if (existsSync(pyprojectPath)) {
    const pyprojectContent = readFileSync(pyprojectPath, 'utf8');
    const nameMatch = pyprojectContent.match(/name\s*=\s*["']([^"']+)["']/);
    const versionMatch = pyprojectContent.match(/version\s*=\s*["']([^"']+)["']/);
    return {
      name: nameMatch ? nameMatch[1] : 'unknown',
      version: versionMatch ? versionMatch[1] : 'unknown',
      type: 'python'
    };
  }
  return null;
}

function checkBuildArtifacts(packagePath, packageType) {
  if (packageType === 'python') {
    const distPath = join(packagePath, 'dist');
    return existsSync(distPath);
  } else {
    const distPath = join(packagePath, 'dist');
    return existsSync(distPath);
  }
}

function simulatePublish(packagePath, packageInfo) {
  log(`\n📦 Simulating publish for: ${packageInfo.name}`, 'magenta');
  log(`   Version: ${packageInfo.version}`, 'cyan');
  log(`   Type: ${packageInfo.type}`, 'cyan');
  log(`   Path: ${packagePath}`, 'cyan');
  
  if (packageInfo.private) {
    log(`   ⚠️  Package is marked as private - would not publish`, 'yellow');
    return false;
  }
  
  // Check if build artifacts exist
  if (!checkBuildArtifacts(packagePath, packageInfo.type)) {
    log(`   ⚠️  No build artifacts found - build would be required`, 'yellow');
  } else {
    log(`   ✅ Build artifacts found`, 'green');
  }
  
  // Check if version already exists
  if (packageInfo.type === 'npm') {
    const result = execCommand(`npm view ${packageInfo.name}@${packageInfo.version}`, packagePath);
    if (result && !result.includes('dry-run')) {
      log(`   ⚠️  Version ${packageInfo.version} already exists on NPM`, 'yellow');
    } else {
      log(`   ✅ Version ${packageInfo.version} is new - would publish to NPM`, 'green');
    }
  } else if (packageInfo.type === 'python') {
    log(`   📝 Would check PyPI for existing version`, 'cyan');
    log(`   ✅ Would publish to PyPI`, 'green');
  }
  
  return true;
}

function main() {
  log('🧪 PoD Protocol - Dry Run Publishing', 'bright');
  log('====================================', 'bright');
  log('This is a simulation - no packages will actually be published\n', 'yellow');
  
  const packagePaths = [
    { path: join(rootDir, 'sdk'), name: 'TypeScript SDK' },
    { path: join(rootDir, 'cli'), name: 'CLI' },
    { path: rootDir, name: 'Main Package' },
    { path: join(rootDir, 'sdk-python'), name: 'Python SDK' }
  ];
  
  let totalPackages = 0;
  let publishablePackages = 0;
  
  log('📋 Package Analysis:', 'blue');
  log('==================', 'blue');
  
  for (const pkg of packagePaths) {
    if (!checkPackageExists(pkg.path)) {
      log(`\n❌ ${pkg.name}: Package not found at ${pkg.path}`, 'red');
      continue;
    }
    
    totalPackages++;
    const packageInfo = getPackageInfo(pkg.path);
    
    if (packageInfo) {
      if (simulatePublish(pkg.path, packageInfo)) {
        publishablePackages++;
      }
    } else {
      log(`\n❌ ${pkg.name}: Could not read package information`, 'red');
    }
  }
  
  // Summary
  log('\n📊 Dry Run Summary:', 'bright');
  log('==================', 'bright');
  log(`Total packages found: ${totalPackages}`, 'cyan');
  log(`Publishable packages: ${publishablePackages}`, 'green');
  
  if (publishablePackages > 0) {
    log('\n✅ Ready to publish! Run the following to publish all packages:', 'green');
    log('   npm run publish:all', 'cyan');
    log('   # or', 'cyan');
    log('   ./scripts/publish-all.sh', 'cyan');
  } else {
    log('\n⚠️  No packages ready for publishing', 'yellow');
  }
  
  log('\n💡 Tips:', 'blue');
  log('  • Make sure all packages are built before publishing', 'cyan');
  log('  • Ensure you have proper NPM and PyPI credentials configured', 'cyan');
  log('  • Consider running tests before publishing: npm run test:all', 'cyan');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { main as dryRunPublish };