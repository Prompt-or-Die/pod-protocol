#!/usr/bin/env node

/**
 * PoD Protocol - Comprehensive Package Publishing Script
 * 
 * This script publishes all packages in the PoD Protocol workspace:
 * - Main package (pod-protocol)
 * - TypeScript SDK (@pod-protocol/sdk)
 * - CLI (@pod-protocol/cli)
 * - Python SDK (pod-protocol-sdk)
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
    log(`📦 Executing: ${command}`, 'cyan');
    const result = execSync(command, {
      cwd,
      stdio: 'inherit',
      encoding: 'utf8',
      ...options
    });
    return result;
  } catch (error) {
    log(`❌ Command failed: ${command}`, 'red');
    log(`Error: ${error.message}`, 'red');
    throw error;
  }
}

function checkPackageExists(packagePath) {
  const packageJsonPath = join(packagePath, 'package.json');
  const pyprojectPath = join(packagePath, 'pyproject.toml');
  return existsSync(packageJsonPath) || existsSync(pyprojectPath);
}

function getPackageVersion(packagePath) {
  const packageJsonPath = join(packagePath, 'package.json');
  const pyprojectPath = join(packagePath, 'pyproject.toml');
  
  if (existsSync(packageJsonPath)) {
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
    return packageJson.version;
  } else if (existsSync(pyprojectPath)) {
    // For Python packages, we'll extract version from pyproject.toml
    const pyprojectContent = readFileSync(pyprojectPath, 'utf8');
    const versionMatch = pyprojectContent.match(/version\s*=\s*["']([^"']+)["']/);
    return versionMatch ? versionMatch[1] : 'unknown';
  }
  return 'unknown';
}

function buildPackage(packagePath, buildCommand) {
  if (!checkPackageExists(packagePath)) {
    log(`⚠️  Package not found: ${packagePath}`, 'yellow');
    return false;
  }
  
  log(`🔨 Building package: ${packagePath}`, 'blue');
  try {
    execCommand(buildCommand, packagePath);
    log(`✅ Build completed: ${packagePath}`, 'green');
    return true;
  } catch (error) {
    log(`❌ Build failed: ${packagePath}`, 'red');
    return false;
  }
}

function publishNpmPackage(packagePath, packageName) {
  if (!checkPackageExists(packagePath)) {
    log(`⚠️  Package not found: ${packagePath}`, 'yellow');
    return false;
  }
  
  const version = getPackageVersion(packagePath);
  log(`📦 Publishing ${packageName} v${version} to NPM...`, 'magenta');
  
  try {
    // Check if already published
    try {
      execCommand(`npm view ${packageName}@${version}`, packagePath, { stdio: 'pipe' });
      log(`⚠️  Version ${version} already published for ${packageName}`, 'yellow');
      return true;
    } catch {
      // Version not published, continue
    }
    
    execCommand('npm publish --access public', packagePath);
    log(`✅ Successfully published ${packageName} v${version}`, 'green');
    return true;
  } catch (error) {
    log(`❌ Failed to publish ${packageName}`, 'red');
    return false;
  }
}

function publishPythonPackage(packagePath) {
  if (!checkPackageExists(packagePath)) {
    log(`⚠️  Python package not found: ${packagePath}`, 'yellow');
    return false;
  }
  
  const version = getPackageVersion(packagePath);
  log(`🐍 Publishing Python SDK v${version} to PyPI...`, 'magenta');
  
  try {
    // Build the package
    execCommand('python -m build', packagePath);
    
    // Check if twine is available
    try {
      execCommand('python -m twine --version', packagePath, { stdio: 'pipe' });
    } catch {
      log('📦 Installing twine...', 'cyan');
      execCommand('pip install twine', packagePath);
    }
    
    // Upload to PyPI
    execCommand('python -m twine upload dist/* --skip-existing', packagePath);
    log(`✅ Successfully published Python SDK v${version}`, 'green');
    return true;
  } catch (error) {
    log(`❌ Failed to publish Python SDK`, 'red');
    log(`💡 Make sure you have PyPI credentials configured`, 'yellow');
    return false;
  }
}

function runPrePublishChecks() {
  log('🔍 Running pre-publish checks...', 'blue');
  
  try {
    // Run tests
    log('🧪 Running tests...', 'cyan');
    execCommand('npm run test:all');
    
    // Run linting
    log('🔍 Running linting...', 'cyan');
    execCommand('npm run lint:all');
    
    // Verify builds
    log('✅ Verifying builds...', 'cyan');
    execCommand('npm run verify:build');
    
    log('✅ All pre-publish checks passed', 'green');
    return true;
  } catch (error) {
    log('❌ Pre-publish checks failed', 'red');
    return false;
  }
}

function main() {
  log('🚀 PoD Protocol - Publishing All Packages', 'bright');
  log('==========================================', 'bright');
  
  const packages = [
    { path: join(rootDir, 'sdk'), name: '@pod-protocol/sdk', buildCmd: 'npm run build:prod' },
    { path: join(rootDir, 'cli'), name: '@pod-protocol/cli', buildCmd: 'npm run build:prod' },
    { path: rootDir, name: 'pod-protocol', buildCmd: 'npm run build:all' }
  ];
  
  const pythonPackage = join(rootDir, 'sdk-python');
  
  try {
    // Run pre-publish checks
    if (!runPrePublishChecks()) {
      log('❌ Aborting publish due to failed checks', 'red');
      process.exit(1);
    }
    
    // Build all packages
    log('\n🔨 Building all packages...', 'blue');
    let buildSuccess = true;
    
    for (const pkg of packages) {
      if (!buildPackage(pkg.path, pkg.buildCmd)) {
        buildSuccess = false;
      }
    }
    
    if (!buildSuccess) {
      log('❌ Some builds failed, aborting publish', 'red');
      process.exit(1);
    }
    
    // Publish NPM packages
    log('\n📦 Publishing NPM packages...', 'blue');
    let publishSuccess = true;
    
    for (const pkg of packages) {
      if (!publishNpmPackage(pkg.path, pkg.name)) {
        publishSuccess = false;
      }
    }
    
    // Publish Python package
    log('\n🐍 Publishing Python package...', 'blue');
    if (!publishPythonPackage(pythonPackage)) {
      publishSuccess = false;
    }
    
    // Summary
    log('\n📋 Publishing Summary', 'bright');
    log('====================', 'bright');
    
    if (publishSuccess) {
      log('✅ All packages published successfully!', 'green');
      log('\n📦 Published packages:', 'cyan');
      packages.forEach(pkg => {
        const version = getPackageVersion(pkg.path);
        log(`  • ${pkg.name} v${version}`, 'green');
      });
      if (checkPackageExists(pythonPackage)) {
        const version = getPackageVersion(pythonPackage);
        log(`  • pod-protocol-sdk v${version} (Python)`, 'green');
      }
    } else {
      log('⚠️  Some packages failed to publish', 'yellow');
      log('Check the logs above for details', 'yellow');
    }
    
  } catch (error) {
    log(`❌ Publishing failed: ${error.message}`, 'red');
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { main as publishAll };