# 🔧 PoD Protocol Troubleshooting Guide

This guide helps you resolve common issues when setting up and building PoD Protocol.

## 🚨 Common Issues

### 1. "Command not found" Errors

#### Problem: `cargo: command not found`
```bash
Command 'cargo' not found, but can be installed with:
sudo apt install cargo
```

**Solution:**
```bash
# Run the dependency installer
./install-dependencies.sh

# Or install Rust manually
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source ~/.cargo/env
```

#### Problem: `anchor: command not found`
```bash
Command 'anchor' not found
```

**Solution:**
```bash
# Install Rust first, then Anchor
cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
avm install 0.31.1
avm use 0.31.1
```

#### Problem: `solana: command not found`
```bash
solana: command not found
```

**Solution:**
```bash
# Install Solana CLI
sh -c "$(curl -sSfL https://release.anza.xyz/stable/install)"
export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"
```

### 2. Build Failures

#### Problem: Anchor build fails
```bash
❌ Anchor build failed
```

**Solutions:**
1. **Install all dependencies first:**
   ```bash
   ./install-dependencies.sh
   source ~/.bashrc
   ```

2. **Check Anchor version:**
   ```bash
   anchor --version
   # Should show: anchor-cli 0.31.1
   ```

3. **Try building with cargo instead:**
   ```bash
   cd programs/pod-com
   cargo build --release
   ```

#### Problem: Python SDK build fails
```bash
⚠️ Python SDK build failed - please install python3-venv
```

**Solution:**
```bash
# Install Python virtual environment support
sudo apt install python3-venv python3-pip

# Or use pipx
sudo apt install pipx
```

#### Problem: Node.js dependency issues
```bash
ERROR: Cannot find module '@inquirer/checkbox'
```

**Solution:**
```bash
# Install Node.js dependencies
npm install
# or
bun install
# or
yarn install
```

### 3. Permission Issues

#### Problem: Permission denied when running scripts
```bash
bash: ./install-dependencies.sh: Permission denied
```

**Solution:**
```bash
# Make scripts executable
chmod +x install-dependencies.sh
chmod +x install.sh
```

### 4. Environment Issues

#### Problem: Commands not found after installation
```bash
# Installed Rust but cargo still not found
```

**Solution:**
```bash
# Reload your shell environment
source ~/.bashrc
# or
source ~/.zshrc
# or restart your terminal
```

#### Problem: PATH not updated
```bash
# Tools installed but not in PATH
```

**Solution:**
Add to your shell profile (`~/.bashrc` or `~/.zshrc`):
```bash
# Rust
source "$HOME/.cargo/env"

# Solana
export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"
```

## 🛠️ Step-by-Step Recovery

If you're experiencing multiple issues, follow this complete recovery process:

### 1. Clean Installation
```bash
# Remove any partial installations
rm -rf ~/.cargo ~/.local/share/solana

# Update system packages
sudo apt update
sudo apt install -y build-essential curl git pkg-config libssl-dev
```

### 2. Install Dependencies
```bash
# Run the automated installer
./install-dependencies.sh
```

### 3. Verify Installation
```bash
# Check all tools are installed
cargo --version
solana --version
anchor --version
node --version
```

### 4. Build Project
```bash
# Install Node.js dependencies
npm install

# Build the project
npm run build
```

### 5. Run Setup
```bash
# Run the interactive setup
./install.sh
```

## 🔍 Debugging Commands

Use these commands to diagnose issues:

```bash
# Check if commands are available
which cargo
which solana
which anchor
which node

# Check versions
cargo --version
solana --version
anchor --version
node --version

# Check PATH
echo $PATH

# Check environment
env | grep -E '(CARGO|SOLANA|PATH)'

# Check Rust installation
rustc --version
rustup --version

# Check Solana configuration
solana config get

# Check Anchor workspace
anchor keys list
```

## 📞 Getting Help

If you're still experiencing issues:

1. **Check the logs** - Look for specific error messages
2. **Search existing issues** - Check our [GitHub Issues](https://github.com/your-org/pod-protocol/issues)
3. **Create a new issue** - Include:
   - Your operating system
   - Node.js version (`node --version`)
   - Error messages
   - Steps you've tried
4. **Join our Discord** - Get real-time help from the community

## 🎯 Quick Fixes

### Reset Everything
```bash
# Nuclear option: start fresh
rm -rf node_modules target .anchor
rm -rf ~/.cargo ~/.local/share/solana
./install-dependencies.sh
source ~/.bashrc
npm install
npm run build
```

### Skip Anchor Build
```bash
# If Anchor keeps failing, build SDKs only
npm run build:typescript
npm run build:javascript
npm run build:python
npm run build:cli
```

### Use Alternative Package Managers
```bash
# If npm fails, try bun or yarn
curl -fsSL https://bun.sh/install | bash
bun install
bun run build
```

---

**Remember:** Most issues are resolved by ensuring all dependencies are properly installed. When in doubt, run `./install-dependencies.sh` first!