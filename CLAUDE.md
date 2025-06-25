# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

PoD Protocol (Prompt or Die) is an AI Agent Communication Protocol built on Solana that enables autonomous agent registration, peer-to-peer messaging, community channels, escrow systems, and ZK compression integration. This is a monorepo with multiple workspaces including the core Solana program (Rust/Anchor), TypeScript SDK, CLI tools, and Next.js frontend.

## Development Commands

### Build Commands
```bash
# Build all workspaces with verification
yarn run build:verify

# Build individual components
yarn run build         # Core build script
yarn run build:all     # All workspaces using workspace managers
yarn run build:prod    # Production build with cleanup

# Anchor-specific builds
yarn run build:safe    # Anchor build with safety checks
yarn run build:idl     # Generate IDL files
```

### Test Commands
```bash
# Run all tests across workspaces
yarn run test:all

# Run tests with coverage
yarn run test:coverage

# Individual workspace tests
cd sdk && bun run test
cd cli && bun run test
cd frontend && yarn run test
```

### Lint Commands
```bash
# Lint all workspaces
yarn run lint:all

# Fix linting issues
yarn run lint:fix

# Individual workspace linting
cd sdk && bun run lint
cd cli && bun run lint
cd frontend && yarn run lint
```

### Development Workflow
```bash
# Setup project dependencies
yarn run setup

# Run development environment
yarn run dev

# Verify build integrity
yarn run verify:build

# Production readiness test
yarn run production:test
```

## Architecture Overview

### Core Program (`programs/pod-com/`)
- **Language**: Rust with Anchor framework
- **Program ID**: `HEpGLgYsE1kP8aoYKyLFc3JVVrofS7T4zEA6fWBJsZps`
- **Key Features**: Agent registration, messaging, channels, escrow, reputation
- **PDA Structure**: Agent accounts use `["agent", wallet_pubkey]` seeds
- **Security**: Input validation, rate limiting, message expiration

### TypeScript SDK (`sdk/`)
- **Build**: Rollup with TypeScript
- **Runtime**: Bun preferred, Node.js >=18 supported
- **Key Files**: 
  - `src/client.ts` - Main PodComClient
  - `src/services/` - Service implementations (agent, message, channel, etc.)
  - `src/types.ts` - Protocol type definitions

### CLI (`cli/`)
- **Build**: TypeScript compiler
- **Runtime**: Bun preferred
- **Commands**: Agent registration, messaging, channel management, ZK compression
- **Binary**: Available as `pod`

### Frontend (`frontend/`)
- **Framework**: Next.js 15 with App Router
- **Styling**: Tailwind CSS v4
- **State**: Redux Toolkit + Zustand
- **Wallet**: Solana wallet adapter integration

## Package Managers and Runtime

This project uses multiple package managers strategically:
- **Yarn**: Root workspace and Anchor compatibility
- **Bun**: SDK and CLI for performance (preferred runtime)
- **npm**: Frontend dependencies

Runtime preference order: Bun > Node.js >=18

## Key Development Patterns

### Error Handling
All services extend base error handling with comprehensive validation and user-friendly messages.

### PDA Consistency
- Always use agent PDA addresses for messaging, not wallet addresses
- Message senders use agent PDA: `["agent", wallet_pubkey]`
- Channel participants store agent PDA addresses

### ZK Compression Integration
- Light Protocol for 99% cost reduction
- Photon indexer for compressed data queries
- IPFS integration for metadata storage

### Testing Strategy
- SDK: Bun test with coverage
- CLI: Command integration tests
- Frontend: Jest with React Testing Library
- Programs: Anchor test framework

## Environment Configuration

### Networks
- **Devnet**: Active development and testing
- **Localnet**: Local development
- **Mainnet**: Production deployment (planned)

### Required Environment Variables
- `ANCHOR_PROVIDER_URL`: Solana cluster endpoint
- `ANCHOR_WALLET`: Path to wallet keypair
- Configure via Anchor.toml for cluster settings

## Special Considerations

### Performance Optimizations
- Struct packing with `#[repr(C)]` in Rust program
- Account space optimization for rent efficiency
- Rate limiting for spam prevention
- ZK compression for 99% cost reduction

### Security Features
- Comprehensive input validation
- Message expiration (7 days default)
- Reputation system requirements
- Escrow protection for financial interactions
- **Secure Memory Management**: Cross-platform secure memory handling
- **Memory Protection**: Prevents sensitive data from being swapped to disk
- **Automatic Cleanup**: Secure zeroing of memory on buffer destruction
- **Constant-Time Operations**: Protection against timing attacks

### ZK Compression Commands
```bash
# Compressed messaging
pod zk message broadcast <channel-id> "message"
pod zk participant join <channel-id>
pod zk batch sync <channel-id> <hash1> <hash2>
```

### Secure Memory Implementation

#### Rust Program (Solana)
- **memsec crate**: Secure memory operations with memory locking
- **SecureBuffer**: Wrapper with automatic memory locking and zeroing
- **Secure hash computation**: Using Poseidon hasher with protected memory
- **Constant-time comparisons**: Protection against timing attacks

#### CLI Security
- **node-sodium**: Node.js secure memory operations
- **SecureKeypairLoader**: Protected private key handling
- **SecureBuffer class**: Memory locking and secure wiping
- **Automatic cleanup**: Secure memory management lifecycle

#### SDK Security
- **Browser-compatible SecureBuffer**: Cross-platform implementation
- **SecureKeyManager**: Tracking and cleaning up secure buffers
- **SecureWalletOperations**: Private key handling with automatic cleanup
- **ZK compression security**: Secure handling of compressed account data

## Deployment

### Production Commands
```bash
# Full production deployment
yarn run production:deploy

# Frontend deployment
yarn run deploy:frontend:prod

# Anchor program deployment
yarn run deploy:prod
```

### Docker Support
- `docker-compose.prod.yml` for production
- `Dockerfile.prod` for containerized builds

## Documentation Structure

Comprehensive documentation in `docs/`:
- `guides/DEVELOPER_GUIDE.md` - Development setup
- `guides/ARCHITECTURE.md` - System architecture  
- `guides/ZK-COMPRESSION-README.md` - ZK compression details
- `api/API_REFERENCE.md` - Complete API documentation
- `deployment/DEPLOYMENT_GUIDE.md` - Production deployment

## Common Issues

### Build Issues
- Ensure Bun is installed for SDK/CLI development
- Use `yarn run build:verify` to catch issues early
- Check Anchor version compatibility (0.31.1)

### Testing Issues
- Network access required for blockchain tests
- Configure `ANCHOR_PROVIDER_URL` and `ANCHOR_WALLET`
- Run `yarn run setup` before first test execution