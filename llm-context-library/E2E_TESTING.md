# E2E Testing with Bun

This document provides comprehensive instructions for running end-to-end (e2e) tests across all packages in the PoD Protocol monorepo using Bun's native test runner.

## Overview

All packages now include comprehensive e2e tests using Bun's test runner instead of Jest or Playwright. This provides:

- ✅ **Native Bun Performance** - Faster test execution
- ✅ **Unified Testing** - Single test runner across all packages
- ✅ **Real Integration Testing** - Tests actual functionality end-to-end
- ✅ **TypeScript Support** - Native TypeScript execution without compilation
- ✅ **Built-in Coverage** - Coverage reporting without additional tools

## Package Test Coverage

### 📡 API Server (`packages/api-server/`)

- **Location**: `packages/api-server/api-server/tests/e2e/`
- **Tests**: REST endpoints, WebSocket connections, database operations, security, performance
- **Features**: Health checks, agent management, channels, messages, escrow, analytics

### 🔧 CLI (`packages/cli/`)

- **Location**: `packages/cli/tests/e2e/`
- **Tests**: All CLI commands, configuration, wallet operations, error handling
- **Features**: Agent management, messaging, channels, security tools, ZK compression

### 🖥️ Frontend (`packages/frontend/`)

- **Location**: `packages/frontend/tests/e2e/`
- **Tests**: Application startup, wallet integration, user flows, responsive design
- **Features**: SSR validation, API integration, error boundaries, accessibility

### 📦 SDK TypeScript (`packages/sdk-typescript/`)

- **Location**: `packages/sdk-typescript/sdk/tests/e2e/`
- **Tests**: SDK imports, client initialization, service functionality
- **Features**: Agent operations, messaging, channels, escrow, utilities

### 🔌 MCP Server (`packages/mcp-server/`)

- **Location**: `packages/mcp-server/tests/e2e/`
- **Tests**: MCP protocol compliance, tool calling, resource management
- **Features**: Protocol methods, sampling, prompts, error handling

### 🤖 ElizaOS Plugin (`packages/elizaos-plugin-podcom/`)

- **Location**: `packages/elizaos-plugin-podcom/tests/e2e/`
- **Tests**: Plugin structure, actions, evaluators, providers
- **Features**: Agent integration, action validation, configuration

## Running Tests

### Prerequisites

```bash
# Ensure Bun is installed
bun --version

# Install dependencies
bun install
```

### Run All E2E Tests

```bash
# Run e2e tests across all packages
bun run test:e2e

# Run all tests (unit + e2e)
bun run test:all
```

### Run Package-Specific Tests

```bash
# API Server e2e tests
cd packages/api-server/api-server && bun test tests/e2e/

# CLI e2e tests
cd packages/cli && bun test tests/e2e/

# Frontend e2e tests
cd packages/frontend && bun test tests/e2e/

# SDK e2e tests
cd packages/sdk-typescript/sdk && bun test tests/e2e/

# MCP Server e2e tests
cd packages/mcp-server && bun test tests/e2e/

# ElizaOS Plugin e2e tests
cd packages/elizaos-plugin-podcom && bun test tests/e2e/
```

### Run with Options

```bash
# Run tests with coverage
bun test --coverage

# Run tests in watch mode
bun test --watch

# Run specific test file
bun test tests/e2e/api.e2e.test.ts

# Run tests with timeout
bun test --timeout 60000

# Run tests with verbose output
bun test --verbose
```

## Test Configuration

### Global Configuration (`bunfig.toml`)

```toml
[test]
timeout = 30000
coverage = true

[test.env]
NODE_ENV = "test"
SOLANA_NETWORK = "devnet"
ANCHOR_PROVIDER_URL = "https://api.devnet.solana.com"
```

### Environment Variables

```bash
# Test environment
export NODE_ENV=test
export SOLANA_NETWORK=devnet
export TEST_RPC_URL=https://api.devnet.solana.com

# API endpoints for testing
export API_BASE_URL=http://localhost:8080
export FRONTEND_URL=http://localhost:3000
export MCP_SERVER_URL=http://localhost:3001
```

## Package Scripts

Each package includes the following test scripts:

```json
{
  "scripts": {
    "test": "bun test",
    "test:watch": "bun test --watch",
    "test:coverage": "bun test --coverage",
    "test:e2e": "bun test tests/e2e/"
  }
}
```

## Test Structure

### Example Test File

```typescript
import { test, expect, describe, beforeAll, afterAll } from "bun:test";

describe("Package E2E Tests", () => {
  beforeAll(async () => {
    // Setup before all tests
  });

  afterAll(async () => {
    // Cleanup after all tests
  });

  test("should perform operation", async () => {
    // Test implementation
    expect(result).toBeDefined();
  });
});
```

### Test Utilities

Each package includes utilities for:

- **Mock Data Generation** - Creating test data
- **Server Startup/Teardown** - Managing test servers
- **Network Mocking** - Handling network requests
- **Error Simulation** - Testing error scenarios

## CI/CD Integration

### GitHub Actions

```yaml
name: E2E Tests
on: [push, pull_request]

jobs:
  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v1
      - run: bun install
      - run: bun run test:e2e
```

### Test Results

Tests generate reports in:

- **Coverage**: `coverage/` directory
- **JUnit**: For CI integration
- **JSON**: For programmatic analysis

## Debugging Tests

### Debug Mode

```bash
# Run with debug output
DEBUG=* bun test

# Run single test with logging
bun test --verbose tests/e2e/specific.test.ts
```

### Common Issues

1. **Server Not Starting**: Check port availability
2. **Network Timeouts**: Increase timeout values
3. **Import Errors**: Verify package build status
4. **Mock Data Issues**: Check test data validity

## Performance Benchmarks

### Expected Test Times

- **API Server**: ~30 seconds
- **CLI**: ~45 seconds
- **Frontend**: ~20 seconds
- **SDK**: ~15 seconds
- **MCP Server**: ~25 seconds
- **ElizaOS Plugin**: ~10 seconds

### Total E2E Suite: ~2-3 minutes

## Contributing

When adding new e2e tests:

1. **Follow Naming Convention**: `*.e2e.test.ts`
2. **Use Proper Describe Blocks**: Organize tests logically
3. **Include Setup/Teardown**: Clean state between tests
4. **Handle Async Operations**: Use proper async/await
5. **Mock External Dependencies**: Avoid real network calls
6. **Add Error Handling**: Test both success and failure scenarios

## Troubleshooting

### Common Commands

```bash
# Clear test cache
bun pm cache rm

# Rebuild packages
bun run clean && bun run build

# Check test file syntax
bun check tests/e2e/test-file.ts

# Run tests without cache
bun test --no-cache
```

### Support

For e2e testing issues:

1. Check this documentation
2. Review test logs
3. Verify environment setup
4. Check package-specific README files
5. Open GitHub issue with test output

---

**Note**: E2E tests may require services to be running (databases, RPC endpoints). Some tests include fallback behavior for CI environments where external services may not be available.
