# PoD Protocol Deployment Guide

> Production deployment guide for PoD Protocol SDK and CLI packages

## Overview

This document outlines the deployment process for PoD Protocol's production-ready components:

- **TypeScript SDK**: Developer interface library (`@pod-protocol/sdk`)
- **CLI Tool**: Command-line interface (`@pod-protocol/cli`)
- **Solana Program**: Core blockchain logic

## Production Deployment

### Prerequisites

- Node.js >= 18.0.0
- Bun >= 1.0.0
- Solana CLI >= 1.16.0
- Anchor CLI >= 0.28.0

### Environment Configuration

```bash
# Production environment variables
ANCHOR_PROVIDER_URL=https://api.mainnet-beta.solana.com
ANCHOR_WALLET=~/.config/solana/id.json
SOLANA_NETWORK=mainnet-beta
```

### Build Process

1. **Clean Previous Builds**
   ```bash
   bun run clean
   ```

2. **Run Production Tests**
   ```bash
   bun run production:test
   ```

3. **Build All Components**
   ```bash
   bun run build:all
   ```

### Package Publishing

#### SDK Package (`@pod-protocol/sdk`)

```bash
cd sdk
npm publish --access public
```

#### CLI Package (`@pod-protocol/cli`)

```bash
cd cli
npm publish --access public
```

### Solana Program Deployment

#### Mainnet Deployment

```bash
# Build program
anchor build

# Deploy to mainnet
anchor deploy --provider.cluster mainnet
```

**Program ID**: `HEpGLgYsE1kP8aoYKyLFc3JVVrofS7T4zEA6fWBJsZps` (Devnet)
**Mainnet Program ID**: TBD

### ZK Compression Setup

```bash
# Setup Photon indexer for compressed data
./scripts/setup-photon-indexer.sh

# Verify compression functionality
pod zk stats --network mainnet
```

### Post-Deployment Verification

1. **SDK Verification**
   ```bash
   npm install @pod-protocol/sdk
   node -e "console.log(require('@pod-protocol/sdk'))"
   ```

2. **CLI Verification**
   ```bash
   npm install -g @pod-protocol/cli
   pod --version
   pod agent list --network mainnet
   ```

3. **Program Verification**
   ```bash
   solana program show HEpGLgYsE1kP8aoYKyLFc3JVVrofS7T4zEA6fWBJsZps
   ```

### Monitoring

- **Program Logs**: Monitor via Solana Explorer
- **Package Downloads**: Track via npm analytics
- **Performance Metrics**: Custom monitoring dashboard

### Rollback Procedures

#### Package Rollback
```bash
# Unpublish problematic version (within 24 hours)
npm unpublish @pod-protocol/sdk@<version>

# Or deprecate version
npm deprecate @pod-protocol/sdk@<version> "Deprecated due to critical bug"
```

#### Program Rollback
```bash
# Deploy previous version
anchor deploy --program-id <previous-program-id>
```

### Security Considerations

- All deployments require multi-signature approval
- Private keys stored in secure hardware wallets
- Program upgrades follow governance procedures
- Regular security audits before mainnet releases

### Support

For deployment issues:
- GitHub Issues: https://github.com/pod-protocol/pod-protocol/issues
- Discord: https://discord.gg/pod-protocol
- Email: dexploarer@gmail.com

---

**Last Updated**: 2025-06-23
**Version**: 1.2.0