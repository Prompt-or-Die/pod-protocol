# PoD Protocol Deployment Guide

> **Complete guide for deploying PoD Protocol across different environments**

---

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Local Development Deployment](#local-development-deployment)
- [Devnet Deployment](#devnet-deployment)
- [Testnet Deployment](#testnet-deployment)
- [Mainnet Deployment](#mainnet-deployment)
- [ZK Compression Setup](#zk-compression-setup)
- [IPFS Configuration](#ipfs-configuration)
- [Monitoring and Maintenance](#monitoring-and-maintenance)
- [Troubleshooting](#troubleshooting)

---

## Overview

The PoD Protocol deployment process involves several components:

- **Solana Program**: Core blockchain logic
- **TypeScript SDK**: Developer interface library
- **CLI Tool**: Command-line interface
- **ZK Compression**: Light Protocol integration
- **IPFS Storage**: Decentralized content storage
- **Indexing Services**: Data querying and analytics

### Deployment Environments

| Environment | Purpose | Network | Program ID |
|-------------|---------|---------|------------|
| Local | Development & Testing | localhost:8899 | Generated |
| Devnet | Integration Testing | api.devnet.solana.com | HEpGLgYsE1kP8aoYKyLFc3JVVrofS7T4zEA6fWBJsZps |
| Testnet | Pre-production Testing | api.testnet.solana.com | Q1 2025 |
| Mainnet | Production | api.mainnet-beta.solana.com | Q2 2025 |

---

## Prerequisites

### Required Tools

```bash
# Verify installations
rust --version          # >= 1.70.0
solana --version        # >= 1.16.0
anchor --version        # >= 0.28.0
bun --version           # >= 1.0.0 (or node >= 18.0.0)
git --version           # Latest
```

### Environment Setup

```bash
# Clone repository
git clone https://github.com/Dexploarer/PoD-Protocol.git
cd PoD-Protocol

# Install dependencies
bun install

# Setup environment variables
cp .env.example .env
# Edit .env with your configuration
```

### Wallet Configuration

```bash
# Generate deployment wallet
solana-keygen new --outfile ~/.config/solana/deployer.json

# Set as default wallet
solana config set --keypair ~/.config/solana/deployer.json

# Verify configuration
solana config get
```

---

## Local Development Deployment

### 1. Start Local Validator

```bash
# Basic local validator
solana-test-validator --reset

# Advanced configuration with specific settings
solana-test-validator \
  --reset \
  --quiet \
  --ledger .anchor/test-ledger \
  --bind-address 0.0.0.0 \
  --rpc-port 8899 \
  --faucet-port 9900 \
  --limit-ledger-size 50000000
```

### 2. Configure Local Environment

```bash
# Set Solana to use local validator
solana config set --url localhost

# Verify connection
solana cluster-version

# Fund deployment wallet
solana airdrop 10
solana balance
```

### 3. Build and Deploy Program

```bash
# Build the program
anchor build

# Deploy to local validator
anchor deploy

# Verify deployment
solana program show $(solana-keygen pubkey target/deploy/pod_com-keypair.json)
```

### 4. Update Configuration

```bash
# Update Anchor.toml with deployed program ID
PROGRAM_ID=$(solana-keygen pubkey target/deploy/pod_com-keypair.json)
echo "Program ID: $PROGRAM_ID"

# Update SDK configuration
sed -i "s/PROGRAM_ID = .*/PROGRAM_ID = '$PROGRAM_ID'/g" sdk/src/constants.ts

# Update CLI configuration
sed -i "s/PROGRAM_ID = .*/PROGRAM_ID = '$PROGRAM_ID'/g" cli/src/constants.ts
```

### 5. Run Tests

```bash
# Run integration tests
anchor test --skip-deploy

# Run SDK tests
bun test sdk

# Run CLI tests
bun test cli
```

### 6. Start Development Services

```bash
# Terminal 1: Keep validator running
solana-test-validator --reset

# Terminal 2: Start SDK development
cd sdk && bun run dev

# Terminal 3: Test CLI
cd cli && bun run build && bun run cli --help
```

---

## Devnet Deployment

### 1. Environment Setup

```bash
# Switch to devnet
solana config set --url devnet

# Verify connection
solana cluster-version

# Fund deployment wallet
solana airdrop 5
solana balance
```

### 2. Pre-deployment Checks

```bash
# Verify program builds successfully
anchor build

# Run local tests
anchor test

# Check program size (max 1MB)
ls -la target/deploy/pod_com.so
```

### 3. Deploy to Devnet

```bash
# Deploy program
anchor deploy --provider.cluster devnet

# Verify deployment
PROGRAM_ID="HEpGLgYsE1kP8aoYKyLFc3JVVrofS7T4zEA6fWBJsZps"
solana program show $PROGRAM_ID
```

### 4. Update Configurations

```bash
# Update Anchor.toml
cat > Anchor.toml << EOF
[features]
seeds = false
skip-lint = false

[programs.devnet]
pod_com = "HEpGLgYsE1kP8aoYKyLFc3JVVrofS7T4zEA6fWBJsZps"

[registry]
url = "https://api.apr.dev"

[provider]
cluster = "devnet"
wallet = "~/.config/solana/deployer.json"

[scripts]
test = "bun run ts-mocha -p ./tsconfig.json -t 1000000 tests/**/*.ts"
EOF

# Update SDK constants
cat > sdk/src/constants.ts << EOF
export const PROGRAM_ID = 'HEpGLgYsE1kP8aoYKyLFc3JVVrofS7T4zEA6fWBJsZps';
export const DEFAULT_ENDPOINT = 'https://api.devnet.solana.com';
export const DEFAULT_COMMITMENT = 'confirmed';
EOF

# Update CLI constants
cat > cli/src/constants.ts << EOF
export const PROGRAM_ID = 'HEpGLgYsE1kP8aoYKyLFc3JVVrofS7T4zEA6fWBJsZps';
export const DEFAULT_ENDPOINT = 'https://api.devnet.solana.com';
export const DEFAULT_COMMITMENT = 'confirmed';
EOF
```

### 5. Build and Test SDK/CLI

```bash
# Build SDK
cd sdk
bun run build
bun run test

# Build CLI
cd ../cli
bun run build

# Test CLI functionality
bun run cli config setup
bun run cli agent list
```

### 6. Publish Development Packages

```bash
# Publish SDK to npm (development version)
cd sdk
npm version prerelease --preid=dev
npm publish --tag dev

# Publish CLI to npm (development version)
cd ../cli
npm version prerelease --preid=dev
npm publish --tag dev
```

---

## Testnet Deployment

### 1. Environment Preparation

```bash
# Switch to testnet
solana config set --url testnet

# Fund deployment wallet (request from faucet)
solana airdrop 5

# Verify sufficient balance
solana balance
```

### 2. Pre-deployment Validation

```bash
# Run comprehensive tests
anchor test --provider.cluster testnet

# Security audit checklist
./scripts/security-audit.sh

# Performance benchmarks
./scripts/performance-test.sh
```

### 3. Deploy to Testnet

```bash
# Deploy with testnet configuration
anchor deploy --provider.cluster testnet

# Record program ID
TEST_PROGRAM_ID=$(solana-keygen pubkey target/deploy/pod_com-keypair.json)
echo "Testnet Program ID: $TEST_PROGRAM_ID"

# Verify deployment
solana program show $TEST_PROGRAM_ID
```

### 4. Integration Testing

```bash
# Update test configuration
export ANCHOR_PROVIDER_URL=https://api.testnet.solana.com
export PROGRAM_ID=$TEST_PROGRAM_ID

# Run integration tests
bun test:integration

# Load testing
./scripts/load-test.sh
```

---

## Mainnet Deployment

### 1. Pre-deployment Checklist

- [ ] All tests passing on testnet
- [ ] Security audit completed
- [ ] Performance benchmarks met
- [ ] Documentation updated
- [ ] Monitoring setup ready
- [ ] Rollback plan prepared

### 2. Mainnet Environment Setup

```bash
# Switch to mainnet
solana config set --url mainnet-beta

# Verify connection
solana cluster-version

# Check deployment wallet balance
solana balance
# Ensure sufficient SOL for deployment (~5-10 SOL recommended)
```

### 3. Final Validation

```bash
# Final build with optimizations
anchor build --release

# Verify program hash matches testnet
sha256sum target/deploy/pod_com.so

# Run security checks
cargo audit
cargo clippy -- -D warnings
```

### 4. Mainnet Deployment

```bash
# Deploy to mainnet
anchor deploy --provider.cluster mainnet-beta

# Record mainnet program ID
MAINNET_PROGRAM_ID=$(solana-keygen pubkey target/deploy/pod_com-keypair.json)
echo "Mainnet Program ID: $MAINNET_PROGRAM_ID"

# Verify deployment
solana program show $MAINNET_PROGRAM_ID
```

### 5. Post-deployment Steps

```bash
# Update production configurations
./scripts/update-mainnet-config.sh $MAINNET_PROGRAM_ID

# Deploy monitoring
./scripts/setup-monitoring.sh

# Publish production packages
./scripts/publish-production.sh

# Update documentation
./scripts/update-docs.sh
```

---

## ZK Compression Setup

### 1. Light Protocol Integration

```bash
# Install Light Protocol dependencies
bun add @lightprotocol/compressed-token
bun add @lightprotocol/stateless.js

# Setup Photon indexer
./scripts/setup-photon-indexer.sh
```

### 2. Configuration

```typescript
// sdk/src/config/zk-config.ts
export const ZK_CONFIG = {
  enabled: process.env.LIGHT_PROTOCOL_ENABLED === 'true',
  photonRpcUrl: process.env.PHOTON_RPC_URL || 'https://devnet.helius-rpc.com',
  compressionLevel: 'high',
  batchSize: 100,
};
```

### 3. Enable ZK Compression

```bash
# Environment variables
export LIGHT_PROTOCOL_ENABLED=true
export PHOTON_RPC_URL=https://devnet.helius-rpc.com

# Test ZK compression
bun test:zk-compression

# Deploy with ZK support
./scripts/deploy-with-zk.sh
```

---

## IPFS Configuration

### 1. IPFS Node Setup

```bash
# Install IPFS
wget https://dist.ipfs.io/go-ipfs/v0.20.0/go-ipfs_v0.20.0_linux-amd64.tar.gz
tar -xvzf go-ipfs_v0.20.0_linux-amd64.tar.gz
sudo mv go-ipfs/ipfs /usr/local/bin/

# Initialize IPFS
ipfs init

# Start IPFS daemon
ipfs daemon
```

### 2. IPFS Configuration

```bash
# Configure IPFS for production
ipfs config Addresses.API /ip4/127.0.0.1/tcp/5001
ipfs config Addresses.Gateway /ip4/127.0.0.1/tcp/8080
ipfs config --json API.HTTPHeaders.Access-Control-Allow-Origin '["*"]'
```

### 3. Integration Testing

```bash
# Test IPFS integration
export IPFS_API_URL=http://localhost:5001
export IPFS_GATEWAY=http://localhost:8080

bun test:ipfs
```

---

## Monitoring and Maintenance

### 1. Program Monitoring

```bash
# Monitor program logs
solana logs $PROGRAM_ID

# Monitor program account changes
solana account $PROGRAM_ID --output json-compact

# Setup log aggregation
./scripts/setup-log-monitoring.sh
```

### 2. Performance Monitoring

```typescript
// monitoring/performance.ts
export class PerformanceMonitor {
  async monitorTransactionThroughput() {
    // Monitor TPS
  }
  
  async monitorAccountGrowth() {
    // Monitor account creation rate
  }
  
  async monitorErrorRates() {
    // Monitor error frequencies
  }
}
```

### 3. Health Checks

```bash
# Create health check script
cat > scripts/health-check.sh << 'EOF'
#!/bin/bash

# Check program deployment
solana program show $PROGRAM_ID > /dev/null
if [ $? -eq 0 ]; then
  echo "✅ Program deployed and accessible"
else
  echo "❌ Program not accessible"
  exit 1
fi

# Check RPC endpoint
curl -s $ANCHOR_PROVIDER_URL > /dev/null
if [ $? -eq 0 ]; then
  echo "✅ RPC endpoint accessible"
else
  echo "❌ RPC endpoint not accessible"
  exit 1
fi

# Check IPFS
curl -s $IPFS_API_URL/api/v0/version > /dev/null
if [ $? -eq 0 ]; then
  echo "✅ IPFS accessible"
else
  echo "❌ IPFS not accessible"
  exit 1
fi

echo "✅ All systems operational"
EOF

chmod +x scripts/health-check.sh
```

### 4. Automated Maintenance

```bash
# Setup cron jobs for maintenance
crontab -e

# Add these lines:
# Health check every 5 minutes
*/5 * * * * /path/to/PoD-Protocol/scripts/health-check.sh

# Daily backup
0 2 * * * /path/to/PoD-Protocol/scripts/backup-data.sh

# Weekly performance report
0 9 * * 1 /path/to/PoD-Protocol/scripts/performance-report.sh
```

---

## Troubleshooting

### Common Deployment Issues

#### 1. Insufficient Funds

**Error**: `Error: Insufficient funds`

**Solution**:
```bash
# Check balance
solana balance

# Request airdrop (devnet/testnet only)
solana airdrop 5

# For mainnet, transfer SOL to deployment wallet
```

#### 2. Program Size Limit

**Error**: `Error: Program too large`

**Solution**:
```bash
# Optimize build
cargo build-bpf --release

# Check size
ls -la target/deploy/pod_com.so

# If still too large, optimize code or split functionality
```

#### 3. Account Already Exists

**Error**: `Error: Account already exists`

**Solution**:
```bash
# Use different keypair or upgrade existing program
anchor upgrade target/deploy/pod_com.so --program-id $PROGRAM_ID
```

#### 4. RPC Rate Limiting

**Error**: `Error: 429 Too Many Requests`

**Solution**:
```bash
# Use different RPC endpoint
solana config set --url https://api.mainnet-beta.solana.com

# Or use premium RPC service
solana config set --url https://your-premium-rpc.com
```

### Rollback Procedures

#### 1. Program Rollback

```bash
# Upgrade to previous version
anchor upgrade target/deploy/pod_com_v1.so --program-id $PROGRAM_ID

# Verify rollback
solana program show $PROGRAM_ID
```

#### 2. Configuration Rollback

```bash
# Restore previous configuration
git checkout HEAD~1 -- Anchor.toml
git checkout HEAD~1 -- sdk/src/constants.ts
git checkout HEAD~1 -- cli/src/constants.ts

# Rebuild and redeploy
anchor build
anchor deploy
```

### Emergency Procedures

#### 1. Emergency Stop

```rust
// Add emergency stop functionality to program
#[account]
pub struct EmergencyState {
    pub is_paused: bool,
    pub admin: Pubkey,
}

// Check in all instructions
require!(!emergency_state.is_paused, CustomError::SystemPaused);
```

#### 2. Data Recovery

```bash
# Backup critical data
./scripts/backup-accounts.sh

# Export transaction history
solana transaction-history $PROGRAM_ID > transactions.json

# Export account states
./scripts/export-account-states.sh
```

### Support Resources

- **Documentation**: [API Reference](./API_REFERENCE.md)
- **GitHub Issues**: Report deployment issues
- **Discord**: Real-time support community
- **Email**: support@pod-protocol.com

---

This deployment guide provides comprehensive instructions for deploying PoD Protocol across all environments. Follow the appropriate section based on your deployment target and ensure all prerequisites are met before proceeding.