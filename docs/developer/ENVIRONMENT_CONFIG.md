# Environment Configuration Guide

This guide covers all environment variables and configuration files used in the PoD Protocol project.

## Environment Files

### `.env.example` (Development Template)

Copy this file to `.env` for local development:

```bash
cp .env.example .env
```

**Key Variables:**
- `SOLANA_NETWORK=devnet` - Solana network (devnet/testnet/mainnet-beta)
- `SOLANA_RPC_URL=https://api.devnet.solana.com` - RPC endpoint
- `PROGRAM_ID=HEpGLgYsE1kP8aoYKyLFc3JVVrofS7T4zEA6fWBJsZps` - Program ID
- `LOG_LEVEL=debug` - Logging level
- `NODE_ENV=development` - Environment mode

### `.env.production` (Production Template)

Production-ready configuration:

```bash
cp .env.production .env
```

**Production Variables:**
- `SOLANA_NETWORK=mainnet-beta` - Production network
- `SOLANA_RPC_URL=https://api.mainnet-beta.solana.com` - Production RPC
- `LOG_LEVEL=info` - Production logging
- `NODE_ENV=production` - Production mode
- `ENABLE_METRICS=true` - Enable monitoring

## Configuration Files

### Solana Configuration

#### `Anchor.toml`
Anchor framework configuration:
```toml
[features]
seeds = false
skip-lint = false

[programs.localnet]
pod_com = "Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS"

[programs.devnet]
pod_com = "HEpGLgYsE1kP8aoYKyLFc3JVVrofS7T4zEA6fWBJsZps"

[registry]
url = "https://api.apr.dev"

[provider]
cluster = "localnet"
wallet = "~/.config/solana/id.json"
```

#### Solana CLI Configuration
```bash
# Set network
solana config set --url devnet

# Set keypair
solana config set --keypair ~/.config/solana/id.json

# Verify configuration
solana config get
```

### Rust Configuration

#### `Cargo.toml` (Workspace)
```toml
[workspace]
members = ["programs/*"]
resolver = "2"

[profile.release]
overflow-checks = true
lto = "fat"
codegen-units = 1
```

#### `.cargo/config.toml`
```toml
[build]
target = "bpfel-unknown-unknown"

[target.bpfel-unknown-unknown]
linker = "rust-lld"
```

### TypeScript Configuration

#### `tsconfig.json` (Root)
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["**/*.ts"],
  "exclude": ["node_modules", "dist", "target"]
}
```

### Package Manager Configuration

#### `bunfig.toml`
```toml
[install]
registry = "https://registry.npmjs.org/"
frozenLockfile = true
production = false

[install.scopes]
"@solana" = "https://registry.npmjs.org/"
"@lightprotocol" = "https://registry.npmjs.org/"
```

#### `.yarnrc.yml`
```yaml
nodeLinker: node-modules
yarnPath: .yarn/releases/yarn-4.0.2.cjs
```

### Git Configuration

#### `.gitconfig.example`
Recommended Git settings for the project:
```bash
# Apply these settings
git config --global pull.rebase false
git config --global init.defaultBranch main
git config --global push.default simple
```

## Environment-Specific Setup

### Local Development

1. **Copy environment file:**
   ```bash
   cp .env.example .env
   ```

2. **Generate keypair:**
   ```bash
   solana-keygen new --outfile ~/.config/solana/id.json
   ```

3. **Set Solana config:**
   ```bash
   solana config set --url devnet
   solana config set --keypair ~/.config/solana/id.json
   ```

4. **Request airdrop:**
   ```bash
   solana airdrop 2
   ```

### Production Deployment

1. **Copy production environment:**
   ```bash
   cp .env.production .env
   ```

2. **Set production keypair:**
   ```bash
   solana config set --keypair ~/.config/solana/deployer.json
   ```

3. **Verify mainnet connection:**
   ```bash
   solana config set --url mainnet-beta
   solana balance
   ```

## ZK Compression Configuration

### Light Protocol Setup

```bash
# Install Light Protocol CLI
npm install -g @lightprotocol/cli

# Initialize Light Protocol
light init

# Configure for PoD Protocol
light config set --rpc-url https://devnet.helius-rpc.com
```

### Photon Indexer Configuration

```bash
# Setup Photon indexer
./scripts/setup-photon-indexer.sh

# Configure environment
echo "PHOTON_INDEXER_URL=https://devnet.helius-rpc.com" >> .env
echo "ENABLE_ZK_COMPRESSION=true" >> .env
```

Set `PHOTON_INDEXER_URL` to the URL of your Photon indexer. If this variable is
not set, the CLI falls back to `https://mainnet.helius-rpc.com`.

### Custom Light Protocol Addresses

You can override the default Light Protocol RPC URLs and program IDs using environment variables:

```bash
export LIGHT_RPC_URL=https://devnet.helius-rpc.com
export COMPRESSION_RPC_URL=https://devnet.helius-rpc.com
export PROVER_URL=https://devnet.helius-rpc.com
export LIGHT_SYSTEM_PROGRAM=H5sFv8VwWmjxHYS2GB4fTDsK7uTtnRT4WiixtHrET3bN
export LIGHT_NULLIFIER_QUEUE=nuLLiQHXWLbjy4uxg4R8UuXsJV4JTxvUYm8rqVn8BBc
export LIGHT_CPI_AUTHORITY=5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1
```

Set these variables in your `.env` file or shell before running the CLI/SDK to point at custom deployments.

## Security Considerations

### Environment Variables

- **Never commit `.env` files** to version control
- **Use `.env.example`** as templates only
- **Store secrets securely** in production environments
- **Rotate keys regularly** for production deployments

### Keypair Management

```bash
# Generate secure keypair
solana-keygen new --outfile ~/.config/solana/secure-keypair.json --no-bip39-passphrase

# Set proper permissions
chmod 600 ~/.config/solana/secure-keypair.json

# Backup keypair securely
cp ~/.config/solana/secure-keypair.json /secure/backup/location/
```

## Troubleshooting

### Common Issues

1. **RPC Connection Errors:**
   ```bash
   # Test RPC connection
   curl -X POST -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","id":1,"method":"getHealth"}' $SOLANA_RPC_URL
   ```

2. **Keypair Issues:**
   ```bash
   # Verify keypair
   solana-keygen verify <pubkey> ~/.config/solana/id.json
   ```

3. **Network Configuration:**
   ```bash
   # Check current configuration
   solana config get
   
   # Reset to defaults
   solana config set --url devnet
   ```

### Environment Validation

```bash
# Validate environment setup
bun run validate:env

# Check all configurations
bun run check:config

# Test network connectivity
bun run test:network
```

## References

- [Solana CLI Documentation](https://docs.solana.com/cli)
- [Anchor Framework](https://www.anchor-lang.com/)
- [Light Protocol Documentation](https://docs.lightprotocol.com/)
- [Bun Runtime](https://bun.sh/docs)