# Installation & Development Setup

This guide will set up a complete Pod Protocol development environment with all necessary tools, SDKs, and dependencies for 2025.

## System Requirements

### Minimum Requirements
- **OS**: macOS 12+, Ubuntu 20.04+, or Windows 11
- **RAM**: 8GB (16GB recommended)
- **Storage**: 20GB free space
- **Network**: Stable internet connection for blockchain interactions

### Supported Runtimes
- **Bun v1.0+** (primary runtime, preferred)
- **Node.js v18+** (fallback support)
- **Rust 1.70+** (for Rust SDK development)

## Step 1: Install Bun Runtime

Bun is the preferred runtime for Pod Protocol in 2025, offering superior performance and built-in tooling.

### macOS/Linux
```bash
# Install Bun using the official installer
curl -fsSL https://bun.sh/install | bash

# Reload your shell or restart terminal
source ~/.bashrc  # or ~/.zshrc

# Verify installation
bun --version
```

### Windows
```powershell
# Using PowerShell (run as Administrator)
powershell -c "irm bun.sh/install.ps1 | iex"

# Verify installation
bun --version
```

### Alternative: Using Package Managers
```bash
# macOS with Homebrew
brew tap oven-sh/bun
brew install bun

# Linux with npm (if you must use Node.js)
npm install -g bun

# Windows with Scoop
scoop install bun
```

## Step 2: Install Solana CLI Tools

Solana CLI is essential for blockchain interactions and wallet management.

### All Platforms
```bash
# Install Solana CLI
sh -c "$(curl -sSfL https://release.solana.com/v1.17.0/install)"

# Add to PATH (add to your shell profile)
export PATH="~/.local/share/solana/install/active_release/bin:$PATH"

# Verify installation
solana --version
# Expected: solana-cli 1.17.0+
```

### Configure Solana
```bash
# Set up config for devnet (development)
solana config set --url https://api.devnet.solana.com

# Generate a new keypair (or import existing)
solana-keygen new --outfile ~/.config/solana/id.json

# Check configuration
solana config get
```

## Step 3: Install Anchor Framework

Anchor is used for Solana program development and interaction.

```bash
# Install Anchor CLI (latest version)
cargo install --git https://github.com/coral-xyz/anchor anchor-cli --locked

# Verify installation
anchor --version
# Expected: anchor-cli 0.30.0+
```

## Step 4: Install Pod Protocol CLI

The official CLI provides comprehensive tooling for Pod Protocol development.

```bash
# Install globally using Bun
bun add -g @pod-protocol/cli

# Verify installation and check features
pod-cli --version
pod-cli --help
```

Expected output:
```
@pod-protocol/cli v2.0.0 (2025 Edition)
✅ Bun runtime detected
✅ Web3.js v2.0 support
✅ ZK Compression enabled
✅ Context7 integration ready
```

## Step 5: Install Development Dependencies

### Required System Tools
```bash
# Git (for version control)
# macOS
xcode-select --install

# Ubuntu/Debian
sudo apt update && sudo apt install git curl build-essential

# Windows (using Git for Windows)
# Download from: https://git-scm.com/download/win
```

### Optional but Recommended
```bash
# Docker (for containerized development)
# Follow official installation: https://docs.docker.com/get-docker/

# VS Code with Rust and TypeScript extensions
# Download from: https://code.visualstudio.com/

# jq (for JSON processing in scripts)
# macOS: brew install jq
# Ubuntu: sudo apt install jq
# Windows: scoop install jq
```

## Step 6: Set Up Development Workspace

Create a new Pod Protocol project and verify everything works:

```bash
# Create new project
mkdir my-pod-protocol-app
cd my-pod-protocol-app

# Initialize with Pod CLI
pod-cli init --template typescript-sdk

# Install dependencies with Bun
bun install

# Run health check
bun run healthcheck
```

Expected output:
```
🏥 Pod Protocol Health Check
✅ Bun runtime: v1.0.25
✅ Solana CLI: v1.17.0
✅ Anchor CLI: v0.30.0
✅ Pod CLI: v2.0.0
✅ Network connection: Devnet (ping: 45ms)
✅ ZK Compression: Available
✅ IPFS gateway: Accessible
🎉 Development environment ready!
```

## Step 7: Configure Environment Variables

Set up required environment variables for development:

```bash
# Create .env file
cat > .env << EOF
# Solana Configuration
SOLANA_NETWORK=devnet
SOLANA_RPC_URL=https://api.devnet.solana.com
SOLANA_WALLET_PATH=~/.config/solana/id.json

# Pod Protocol Configuration
POD_PROGRAM_ID=PodProtoco1111111111111111111111111111111111
POD_API_ENDPOINT=https://api-devnet.podprotocol.com
POD_IPFS_GATEWAY=https://ipfs.podprotocol.com

# Development Settings
LOG_LEVEL=debug
ENABLE_ZK_COMPRESSION=true
ENABLE_CONTEXT7=true

# Optional: Third-party integrations
DISCORD_WEBHOOK_URL=your_discord_webhook_url
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
EOF
```

## Step 8: Verify Installation

Run comprehensive verification tests:

```bash
# Test CLI functionality
pod-cli network status
pod-cli agent list --limit 5
pod-cli zk status

# Test SDK integration
bun run test:integration

# Test program deployment (devnet)
anchor test --provider.cluster devnet
```

## SDK Installation by Language

### TypeScript/JavaScript SDK
```bash
# Using Bun (recommended)
bun add @pod-protocol/sdk

# Using npm (if you must)
npm install @pod-protocol/sdk

# Verify SDK
bun run -e "import { PodClient } from '@pod-protocol/sdk'; console.log('SDK loaded');"
```

### Rust SDK
```bash
# Add to Cargo.toml
[dependencies]
pod-protocol-sdk = "2.0.0"
tokio = { version = "1.0", features = ["full"] }
solana-sdk = "1.17.0"

# Build and test
cargo build
cargo test
```

### Python SDK (Beta)
```bash
# Using pip
pip install pod-protocol-sdk

# Using poetry
poetry add pod-protocol-sdk

# Verify
python -c "import pod_protocol; print('Python SDK ready')"
```

## IDE and Editor Setup

### VS Code (Recommended)
Install these extensions for optimal development experience:

1. **Rust Analyzer** - Rust language support
2. **TypeScript Importer** - Auto-import for TypeScript
3. **Solana Snippets** - Solana development helpers
4. **Anchor Snippets** - Anchor framework support
5. **Pod Protocol Extension** - Official Pod Protocol tooling

```json
// .vscode/settings.json
{
  "typescript.preferences.importModuleSpecifier": "relative",
  "rust-analyzer.cargo.loadOutDirsFromCheck": true,
  "files.associations": {
    "*.ts": "typescript",
    "Anchor.toml": "toml"
  },
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll": true
  }
}
```

### JetBrains IDEs
- **IntelliJ IDEA** with Rust and TypeScript plugins
- **WebStorm** for TypeScript development
- **CLion** for Rust development

## Development Tools

### Recommended CLI Tools
```bash
# Install additional development tools
bun add -g typescript ts-node prettier eslint

# Solana development tools
cargo install spl-token-cli
cargo install solana-test-validator

# Blockchain explorers (browser bookmarks)
# Devnet: https://explorer.solana.com/?cluster=devnet
# Mainnet: https://explorer.solana.com/
```

### Browser Extensions
- **Phantom Wallet** - For testing dApp interactions
- **Solflare Wallet** - Alternative Solana wallet
- **MetaMask** - If integrating with other chains

## Docker Development Environment

For containerized development:

```dockerfile
# Dockerfile.dev
FROM oven/bun:1.0

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    git \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install Solana CLI
RUN sh -c "$(curl -sSfL https://release.solana.com/v1.17.0/install)"
ENV PATH="/root/.local/share/solana/install/active_release/bin:$PATH"

# Install Rust and Anchor
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
ENV PATH="/root/.cargo/bin:$PATH"
RUN cargo install --git https://github.com/coral-xyz/anchor anchor-cli --locked

# Copy and install dependencies
COPY package.json bun.lockb ./
RUN bun install

COPY . .

CMD ["bun", "run", "dev"]
```

```yaml
# docker-compose.dev.yml
version: '3.8'
services:
  pod-dev:
    build:
      context: .
      dockerfile: Dockerfile.dev
    volumes:
      - .:/app
      - ~/.config/solana:/root/.config/solana
    ports:
      - "3000:3000"
      - "8080:8080"
    environment:
      - NODE_ENV=development
      - SOLANA_NETWORK=devnet
```

## Troubleshooting

### Common Installation Issues

**Bun installation fails:**
```bash
# Clear any existing installations
rm -rf ~/.bun

# Try manual installation
curl -fsSL https://bun.sh/install | bash

# Check permissions
sudo chown -R $(whoami) ~/.bun
```

**Solana CLI connection issues:**
```bash
# Test connectivity
solana cluster-version

# Reset configuration
rm ~/.config/solana/cli/config.yml
solana config set --url https://api.devnet.solana.com
```

**Anchor installation fails:**
```bash
# Update Rust first
rustup update

# Clean cargo cache
cargo clean

# Reinstall Anchor
cargo install --git https://github.com/coral-xyz/anchor anchor-cli --locked --force
```

**Pod CLI not found:**
```bash
# Check global install location
bun pm ls -g

# Reinstall globally
bun remove -g @pod-protocol/cli
bun add -g @pod-protocol/cli

# Check PATH includes Bun global bin
echo $PATH | grep -o bun
```

### Performance Optimization

```bash
# Increase file watchers for development
echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf
sudo sysctl -p

# Optimize Bun for development
export BUN_INSTALL_CACHE_DIR=~/.bun/cache
export BUN_TMPDIR=/tmp/bun
```

## Next Steps

With your development environment ready:

1. **[Quick Start Guide](./quick-start.md)** - Build your first agent in 5 minutes
2. **[Platform Setup](./platform-setup.md)** - Set up production infrastructure
3. **[SDK Documentation](../sdk/typescript.md)** - Dive into SDK features
4. **[Architecture Overview](../architecture/overview.md)** - Understand the system design

---

**Need help?** Join our [Discord community](https://discord.gg/pod-protocol) or check the [troubleshooting guide](../resources/troubleshooting.md). 