# 🧪 PoD Protocol Tests

[![CI](https://github.com/PoD-Protocol/pod-protocol/workflows/CI/badge.svg)](https://github.com/PoD-Protocol/pod-protocol/actions/workflows/ci.yml)
[![Test Coverage](https://img.shields.io/badge/Coverage-85%25-brightgreen?style=for-the-badge&logo=codecov)](https://github.com/PoD-Protocol/pod-protocol/actions)
[![Test Status](https://img.shields.io/badge/Tests-Passing-brightgreen?style=for-the-badge&logo=check-circle)](https://github.com/PoD-Protocol/pod-protocol/actions)
[![Anchor Framework](https://img.shields.io/badge/Anchor-Framework-512BD4?style=for-the-badge&logo=rust&logoColor=white)](https://www.anchor-lang.com/)
[![Solana](https://img.shields.io/badge/Solana-9945FF?style=for-the-badge&logo=solana&logoColor=white)](https://solana.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge&logo=open-source-initiative)](../LICENSE)

Comprehensive test suite for the PoD Protocol using the Anchor framework and testing against live Solana clusters.

## 🚀 Quick Start

### Prerequisites

Ensure you have installed all dependencies:

```bash
# Install dependencies from project root
bun install

# Install Solana CLI tools
sh -c "$(curl -sSfL https://release.solana.com/v1.18.26/install)"

# Install Anchor CLI
cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
avm install 0.31.1
avm use 0.31.1
```

### Environment Setup

Configure environment variables for cluster connectivity:

```bash
# Required environment variables
export ANCHOR_PROVIDER_URL="https://api.devnet.solana.com"
export ANCHOR_WALLET="/path/to/your/keypair.json"

# Optional: Test configuration
export SOLANA_NETWORK="devnet"
export POD_PROGRAM_ID="HEpGLgYsE1kP8aoYKyLFc3JVVrofS7T4zEA6fWBJsZps"
```

### Running Tests

```bash
# Run all tests
bun test

# Run specific test files
bun test pod-com.test.ts
bun test compression-proof.test.ts

# Run tests with verbose output
bun test --verbose

# Run tests with coverage
bun test --coverage
```

## 📁 Test Structure

```
tests/
├── README.md                           # This file
├── basic.test.ts                       # Basic functionality tests
├── pod-com.test.ts                     # Core protocol tests
├── pod-com-clean.test.ts              # Clean environment tests
├── compression-proof.test.ts          # ZK compression tests
├── comprehensive-security.test.ts     # Security audit tests
├── input-validation.test.ts           # Input validation tests
├── ipfs-hash.test.ts                  # IPFS integration tests
├── merkle-tree.test.ts                # Merkle tree tests
├── performance-benchmark.test.ts      # Performance tests
├── security-audit.test.ts             # Security tests
├── rust-hash-compare.test.ts         # Rust hash comparison
├── test-utils.ts                      # Test utilities
├── security-validation-summary.md     # Security test summary
└── rust-hasher/                       # Rust testing utilities
    ├── Cargo.toml
    ├── src/main.rs
    └── target/
```

## 🧪 Test Categories

### Core Protocol Tests
- **Agent Registration**: Test agent creation and management
- **Message Handling**: Validate message sending and receiving
- **Channel Operations**: Test channel creation and participation
- **Escrow Functions**: Verify escrow deposits and withdrawals

### Security Tests
- **Input Validation**: Comprehensive input sanitization tests
- **Cryptographic Verification**: Ed25519 signature validation
- **Rate Limiting**: Anti-spam and DoS protection tests
- **PDA Security**: Program Derived Address validation

### Performance Tests
- **Throughput Benchmarks**: Message processing speed tests
- **Compression Efficiency**: ZK compression ratio validation
- **Memory Usage**: Resource consumption monitoring
- **Concurrent Operations**: Multi-threaded operation tests

### Integration Tests
- **IPFS Integration**: Metadata storage and retrieval
- **ZK Compression**: Light Protocol compression tests
- **Multi-Agent Scenarios**: Complex interaction patterns
- **Cross-Chain Operations**: Future interoperability tests

## 🔧 Test Configuration

### Network Configuration

```typescript
// test-utils.ts
export const TEST_CONFIG = {
  networks: {
    devnet: {
      endpoint: "https://api.devnet.solana.com",
      programId: "HEpGLgYsE1kP8aoYKyLFc3JVVrofS7T4zEA6fWBJsZps"
    },
    localnet: {
      endpoint: "http://localhost:8899",
      programId: "11111111111111111111111111111111"
    }
  },
  timeouts: {
    transaction: 30000,
    confirmation: 60000
  }
};
```

### Test Wallets

```bash
# Generate test keypairs
solana-keygen new --outfile ~/.config/solana/test-keypair.json

# Fund test wallet (devnet)
solana airdrop 5 ~/.config/solana/test-keypair.json --url devnet
```

## 🎯 Running Specific Test Suites

### Security Tests
```bash
# Run all security tests
bun test security-audit.test.ts comprehensive-security.test.ts input-validation.test.ts

# Run with security reporting
bun test --reporter=security --output-file=security-report.json
```

### Performance Tests
```bash
# Run performance benchmarks
bun test performance-benchmark.test.ts

# Run with performance profiling
bun test --profile --benchmark-iterations=100
```

### ZK Compression Tests
```bash
# Test compression functionality
bun test compression-proof.test.ts

# Test with different compression levels
COMPRESSION_LEVEL=max bun test compression-proof.test.ts
```

## 🔍 Test Data & Fixtures

### Agent Test Data
```typescript
export const TEST_AGENTS = {
  basicAgent: {
    capabilities: 1,
    metadataUri: "https://test.pod-protocol.com/agent1.json"
  },
  tradingAgent: {
    capabilities: 3,
    metadataUri: "https://test.pod-protocol.com/trader.json"
  }
};
```

### Message Test Data
```typescript
export const TEST_MESSAGES = {
  simple: "Hello from test suite!",
  encrypted: "🔒 Secret test message",
  large: "x".repeat(1000), // Test large message handling
  unicode: "🎭 Unicode test: αβγδε 中文 русский"
};
```

## 📊 Coverage Reports

### Generating Coverage
```bash
# Generate HTML coverage report
bun test --coverage --coverage-reporter=html

# Generate detailed coverage
bun test --coverage --coverage-reporter=text-lcov > coverage.lcov

# Upload to coverage service (CI)
curl -s https://codecov.io/bash | bash
```

### Coverage Targets
- **Core Protocol**: >90%
- **Security Functions**: >95%
- **Error Handling**: >85%
- **Integration**: >80%

## 🚨 Continuous Integration

### GitHub Actions Integration
```yaml
# .github/workflows/test.yml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run tests
        run: |
          bun install
          bun test --coverage
```

### Test Matrix
- **Networks**: devnet, testnet, localnet
- **Node Versions**: 18.x, 20.x, 21.x
- **Operating Systems**: ubuntu-latest, macos-latest
- **Rust Versions**: stable, beta

## 🐛 Debugging Tests

### Common Issues

1. **Connection Timeouts**
   ```bash
   # Increase timeout
   export ANCHOR_TEST_TIMEOUT=120000
   ```

2. **Insufficient Funds**
   ```bash
   # Check balance
   solana balance --url devnet
   
   # Request airdrop
   solana airdrop 2 --url devnet
   ```

3. **Program Not Found**
   ```bash
   # Verify program deployment
   anchor build
   anchor deploy
   ```

### Test Debugging Tools
```bash
# Run with debug logging
DEBUG=* bun test

# Run single test with trace
bun test --trace pod-com.test.ts

# Run with Solana logs
solana logs --url devnet
```

## 📈 Performance Benchmarks

### Current Benchmarks (Devnet)
- **Agent Registration**: ~2-3 seconds
- **Message Sending**: ~1-2 seconds
- **Channel Creation**: ~3-4 seconds
- **ZK Compression**: ~500ms overhead

### Load Testing
```bash
# Run load tests
bun test performance-benchmark.test.ts --load-test

# Stress test with multiple agents
AGENT_COUNT=100 bun test --stress
```

## 🔐 Security Testing

### Automated Security Scans
```bash
# Run security audit
bun audit

# Check for vulnerabilities
npm audit --audit-level high

# Rust security check
cargo audit
```

### Manual Security Tests
- SQL injection simulation
- Buffer overflow protection
- Cryptographic algorithm validation
- Access control verification

## 📚 Documentation

- **[Test Writing Guide](../docs/guides/TESTING.md)** - How to write effective tests
- **[Security Testing](../docs/guides/SECURITY.md)** - Security testing methodologies
- **[Performance Guidelines](../docs/guides/PERFORMANCE.md)** - Performance testing best practices

## 🤝 Contributing

### Writing New Tests
1. Follow the existing test structure
2. Use descriptive test names
3. Include both positive and negative test cases
4. Add appropriate comments and documentation
5. Ensure tests are deterministic and isolated

### Test Standards
- Tests must pass on all supported networks
- Coverage must not decrease
- Performance tests must meet benchmarks
- Security tests must validate all threat vectors

## 📄 License

MIT License - see [LICENSE](../LICENSE) for details.

---

**🧪 Ensuring protocol reliability through comprehensive testing**  
*Built with quality and security in mind*
