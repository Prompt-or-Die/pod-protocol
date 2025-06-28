# Automated E2E Test Fixes

This document describes the automated scripts available to diagnose and fix common e2e test failures in the PoD Protocol monorepo.

## Overview

When e2e tests fail, there are several automated tools available to quickly diagnose and fix common issues without manual intervention.

## 🚀 Quick Fix Scripts

### 1. Smart Test Runner (Recommended)
**Command**: `bun run test:e2e:smart`

**What it does**: 
- Runs e2e tests with automatic recovery
- If tests fail, automatically attempts fixes and retries
- Provides detailed reporting

**Best for**: Regular testing workflow

```bash
# Run all tests with auto-recovery
bun run test:e2e:smart

# Run specific package tests
bun run test:e2e:smart --cli
bun run test:e2e:smart --frontend
bun run test:e2e:smart --api
```

### 2. Comprehensive Issue Fixer
**Command**: `bun run fix:all`

**What it does**:
- 🔍 Diagnoses system requirements (Bun, Node.js, ports, disk space)
- 🛑 Stops conflicting services on required ports
- 🧹 Cleans package caches
- 📦 Reinstalls corrupted dependencies
- 🔨 Rebuilds packages with build artifacts
- 🗄️ Resets test databases (if available)
- ⚙️ Sets required environment variables

**Best for**: Comprehensive system cleanup

```bash
# Full diagnostic and fix
bun run fix:all

# Diagnostic only (no fixes)
bun run fix:all --diagnose-only

# Force specific fixes
bun run fix:all --clean-cache --rebuild --verify
```

## 🎯 Targeted Fix Scripts

### 3. Port Conflict Fixer
**Command**: `bun run fix:ports`

**Fixes**: Port conflicts (EADDRINUSE errors)
**Ports**: 3000 (Frontend), 8080 (API), 3001 (MCP), 5432 (Postgres), 6379 (Redis)

```bash
bun run fix:ports
```

### 4. Dependency Fixer  
**Command**: `bun run fix:deps`

**Fixes**: 
- Missing node_modules
- Corrupted package locks
- Cache issues

```bash
bun run fix:deps
```

### 5. Build Fixer
**Command**: `bun run fix:builds`

**Fixes**:
- Missing dist/ directories
- Stale build artifacts
- TypeScript compilation errors

```bash
bun run fix:builds
```

### 6. Auto-Recovery Script
**Command**: `bun run test:e2e:recover`

**What it does**:
- Analyzes test failure patterns
- Applies targeted fixes based on detected issues
- Retries tests automatically
- Maximum 3 recovery attempts

```bash
# Auto-recover for all packages
bun run test:e2e:recover

# Auto-recover for specific package
bun run test:e2e:recover packages/cli
```

## 🔧 Fix Strategies by Error Type

### Port Conflicts (`EADDRINUSE`)
```bash
# Quick fix
bun run fix:ports

# Or automatic
bun run test:e2e:smart
```

### Missing Dependencies (`Cannot find module`)
```bash
# Fix dependencies
bun run fix:deps

# Or comprehensive
bun run fix:all
```

### Build Artifacts Missing (`ENOENT dist/`)
```bash
# Rebuild packages
bun run fix:builds

# Or comprehensive
bun run fix:all
```

### Service Connection Issues (`Connection refused`)
```bash
# Stop conflicting services and restart
bun run fix:ports

# Full service management
bun run fix:all
```

### Network/Timeout Issues
```bash
# Usually resolved by environment reset
bun run fix:all --verify
```

## 🎯 Usage Scenarios

### Before Running Tests
```bash
# Quick health check and auto-fix
bun run fix:all --diagnose-only

# If issues found, run comprehensive fix
bun run fix:all
```

### When Tests Fail
```bash
# Let the system auto-fix and retry
bun run test:e2e:smart

# Or manual recovery
bun run test:e2e:recover
```

### CI/CD Pipeline
```bash
# In case of failures, auto-retry with fixes
bun run test:e2e:smart || bun run fix:all --verify
```

### Development Workflow
```bash
# Clean development environment
bun run fix:ports && bun run fix:deps
bun run test:e2e
```

## 📊 Fix Success Indicators

### ✅ Successful Fixes Show:
- `✅ Port X freed`
- `✅ Dependencies reinstalled`
- `✅ Package rebuilt`
- `✅ Tests passed after recovery`

### ⚠️ Partial Success:
- `⚠️ Could not clean cache (continuing)`
- `⚠️ PostgreSQL not available (using fallback)`

### ❌ Fix Failures:
- `❌ Failed to rebuild package`
- `❌ Maximum recovery attempts exceeded`

## 🚨 Manual Intervention Required

If automated fixes fail, try these manual steps:

### 1. Check System Requirements
```bash
bun --version    # Should be >= 1.0.0
node --version   # Should be >= 18.17.0
```

### 2. Free Disk Space
- Ensure at least 2GB free space
- Clear temporary files if needed

### 3. Check Network Connectivity
```bash
# Test Solana RPC
curl https://api.devnet.solana.com

# Test package registry
curl https://registry.npmjs.org/
```

### 4. Reset Environment
```bash
# Clear all caches
bun pm cache rm
npm cache clean --force (if npm is available)

# Reset environment variables
export NODE_ENV=test
export SOLANA_NETWORK=devnet
```

### 5. Check File Permissions
Ensure the current user has read/write access to:
- Project directory
- node_modules
- .bun directory

## 🔍 Debugging Failed Fixes

### Enable Debug Output
```bash
# Verbose fix output
DEBUG=* bun run fix:all

# Verbose test output  
bun run test:e2e:smart --verbose
```

### Check Fix Logs
The fix scripts provide detailed output showing:
- What was detected
- What fixes were applied
- What failed and why

### Common Manual Fixes
```bash
# If Bun is corrupted
curl -fsSL https://bun.sh/install | bash

# If ports won't free (Windows)
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# If ports won't free (Unix)
lsof -ti:3000 | xargs kill -9

# If dependencies are completely broken
rm -rf node_modules bun.lock
rm -rf packages/*/node_modules packages/*/bun.lock
bun install
```

## 🎯 Best Practices

### 1. Use Smart Test Runner
- Always prefer `bun run test:e2e:smart` over manual testing
- It automatically handles most common issues

### 2. Run Diagnostics First
- Use `bun run fix:all --diagnose-only` to understand issues
- Apply targeted fixes rather than comprehensive fixes when possible

### 3. Regular Maintenance
```bash
# Weekly cleanup
bun run fix:deps
bun run fix:builds

# Before major development
bun run fix:all --verify
```

### 4. CI/CD Integration
```bash
# In your CI pipeline
bun run test:e2e:smart || {
  echo "Tests failed, attempting recovery..."
  bun run fix:all --verify
  exit 1
}
```

## 📈 Performance Impact

### Fix Speed Comparison:
- **Port Fix**: ~5 seconds
- **Dependency Fix**: ~30-60 seconds  
- **Build Fix**: ~45-90 seconds
- **Comprehensive Fix**: ~2-3 minutes

### When to Use Each:
- **During Development**: Port and dependency fixes
- **Before Release**: Comprehensive fix with verification
- **CI/CD Failures**: Smart test runner with auto-recovery

## 🛠️ Customization

All fix scripts can be customized by editing files in `scripts/`:

- `fix-ports.js` - Port management
- `fix-deps.js` - Dependency handling  
- `fix-builds.js` - Build management
- `fix-e2e-issues.js` - Comprehensive fixes
- `auto-recover-tests.js` - Recovery logic
- `smart-test-runner.js` - Test orchestration

---

**💡 Pro Tip**: Most e2e test issues can be resolved automatically by running `bun run test:e2e:smart` instead of `bun run test:e2e`. The smart runner will detect failures and attempt fixes automatically! 