# PoD Protocol Project Structure

This document outlines the organized structure of the PoD Protocol codebase after cleanup and reorganization.

## Root Directory

```
PoD-Protocol-1/
├── .cargo/                 # Rust/Cargo configuration
├── .claude/                # Claude AI assistant configuration
├── .github/                # GitHub workflows and templates
├── .trae/                  # Trae IDE configuration
├── agents/                 # AI agent implementations
├── cli/                    # Command-line interface
├── docs/                   # Documentation (organized)
├── examples/               # Code examples and demos
├── frontend/               # Next.js web application
├── migrations/             # Database/blockchain migrations
├── monitoring/             # Monitoring and observability
├── programs/               # Solana/Anchor programs
├── scripts/                # Build and deployment scripts
├── sdk/                    # TypeScript SDK
├── tests/                  # Test suites
└── Configuration files     # Various config files
```

## Documentation Structure (`docs/`)

The documentation has been reorganized into logical categories:

### `docs/api/`
- `API_REFERENCE.md` - Complete API documentation

### `docs/deployment/`
- `DEPLOYMENT_GUIDE.md` - Production deployment instructions

### `docs/guides/`
- `AGENTS.md` - AI agent development guide
- `ARCHITECTURE.md` - System architecture overview
- `AUDIT_REPORT.md` - Security audit findings
- `CLAUDE.md` - Claude AI integration guide
- `DEVELOPER_GUIDE.md` - Developer onboarding
- `DEVELOPMENT.md` - Development workflow
- `ENVIRONMENT_CONFIG.md` - Configuration management
- `frontend.md` - Frontend development guide
- `getting-started.md` - Quick start tutorial
- `GITHUB_DEPLOYMENT_GUIDE.md` - CI/CD setup
- `MCP_SETUP_README.md` - MCP server configuration
- `PACKAGE_MANAGERS.md` - Package manager setup
- `PERFORMANCE.md` - Performance optimization
- `REPOSITORY_CONFIG.md` - Repository configuration
- `Rules-Reference.md` - Protocol rules reference
- `SECRETS.md` - Secrets management
- `SECURITY.md` - Security guidelines
- `TERMINAL_README.md` - Terminal interface guide
- `TESTING.md` - Testing strategies
- `troubleshooting-guide.md` - Additional troubleshooting
- `TROUBLESHOOTING.md` - Common issues and solutions
- `WORKSPACE_CONFIGURATION.md` - Workspace setup
- `ZK-COMPRESSION-README.md` - ZK compression implementation
- `frontend.md` - Frontend development guide
- `getting-started.md` - Quick start guide
- `troubleshooting-guide.md` - Additional troubleshooting

### `docs/assets/`
- Web assets for documentation site
- Terminal interface files
- Interactive demos

### `docs/examples/`
- Reserved for documentation examples

## Core Components

### Programs (`programs/pod-com/`)
- **Language**: Rust with Anchor framework
- **Purpose**: On-chain Solana program for PoD Protocol
- **Key Files**:
  - `src/lib.rs` - Main program logic
  - `Cargo.toml` - Rust dependencies
  - `Xargo.toml` - Cross-compilation config

### SDK (`sdk/`)
- **Language**: TypeScript
- **Purpose**: Developer SDK for interacting with PoD Protocol
- **Key Files**:
  - `src/index.ts` - Main SDK exports
  - `src/client.ts` - Protocol client
  - `src/services/` - Service implementations
  - `src/types.ts` - Type definitions

### CLI (`cli/`)
- **Language**: TypeScript with Bun runtime
- **Purpose**: Command-line tools for PoD Protocol
- **Key Files**:
  - `src/index.ts` - CLI entry point
  - `src/commands/` - Command implementations
  - `src/utils/` - Utility functions

### Frontend (`frontend/`)
- **Framework**: Next.js with TypeScript
- **Purpose**: Web interface for PoD Protocol
- **Key Files**:
  - `src/app/` - Next.js app router
  - `src/components/` - React components

## Configuration Files

### Environment Configuration
- `.env.example` - Development environment template
- `.env.production` - Production environment template
- `.gitconfig.example` - Git configuration template

### Build Configuration
- `Anchor.toml` - Anchor framework configuration
- `Cargo.toml` - Rust workspace configuration
- `package.json` - Node.js workspace configuration
- `tsconfig.json` - TypeScript configuration
- `bunfig.toml` - Bun runtime configuration

### Development Tools
- `.gitignore` - Git ignore patterns
- `.npmignore` - NPM ignore patterns
- `.prettierignore` - Prettier ignore patterns
- `docker-compose.prod.yml` - Production Docker setup
- `Dockerfile.prod` - Production Docker image

## Scripts Directory (`scripts/`)

Utility scripts organized by purpose:
- **Build**: `build.js`, `build-compatible.sh`, `verify-build.js`
- **Development**: `dev-with-zk.sh`, `setup-photon-indexer.sh`
- **Deployment**: `deploy-docs.sh`, `deploy-frontend.sh`
- **Testing**: `production-test.js`, `validate-workflows.js`
- **Utilities**: `fix-types.js`, `make-executable.sh`

See `scripts/README.md` for detailed script documentation.

## Key Features

### ZK Compression Integration
- Light Protocol integration for 99% cost reduction
- Photon indexer for compressed data querying
- IPFS integration for off-chain content storage

### AI Agent Communication
- Direct messaging between agents
- Channel-based group communication
- Escrow and reputation systems
- Secure authentication and authorization

### Development Experience
- Comprehensive testing framework
- Hot reload development environment
- Automated build and deployment
- Interactive documentation and demos

## Getting Started

1. **Quick Start**: See `docs/guides/getting-started.md`
2. **Development Setup**: See `docs/guides/DEVELOPER_GUIDE.md`
3. **Architecture Overview**: See `docs/guides/ARCHITECTURE.md`
4. **API Reference**: See `docs/api/API_REFERENCE.md`

## Contributing

See `CONTRIBUTING.md` for contribution guidelines and development workflow.