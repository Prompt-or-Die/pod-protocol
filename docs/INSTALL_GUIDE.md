# PoD Protocol Complete Installation Guide

## 🚀 Enhanced Dependencies Installer v2.0.0

The `install-dependencies.sh` script provides a **complete, user-friendly installation experience** for PoD Protocol development. It handles everything from basic dependencies to advanced development setup with comprehensive error handling and recovery.

## ✨ Features

### 🎯 Core Capabilities
- **Complete dependency installation** (Rust, Solana CLI, Anchor CLI, Node.js)
- **Interactive CLI** with beautiful prompts (powered by Gum)
- **Environment setup and validation**
- **Terminal reset handling**
- **Comprehensive troubleshooting**
- **Project initialization**
- **Development tools installation**
- **Graceful fallback** when Gum is not available

### 🛠️ Installation Modes
- **Interactive Mode**: Choose what to install with beautiful prompts
- **Non-Interactive Mode**: Automated installation for CI/CD
- **Force Mode**: Clean reinstall of all dependencies
- **Development Mode**: Install additional dev tools
- **Quiet Mode**: Minimal output for scripts

### 🔧 Special Functions
- **Troubleshooting**: Comprehensive diagnostics
- **Validation**: Verify installation integrity
- **Reset**: Clean environment and reinstall
- **Environment Refresh**: Handle terminal resets

## 📋 Prerequisites

### Required
- **Linux/macOS/WSL** (Ubuntu/Debian recommended)
- **Internet connection** for downloads
- **sudo access** for system dependencies

### Recommended (for best experience)
- **Gum CLI** for interactive prompts:
  ```bash
  # macOS/Linux
  brew install gum
  
  # Ubuntu/Debian
  curl -fsSL https://repo.charm.sh/apt/gpg.key | sudo gpg --dearmor -o /etc/apt/keyrings/charm.gpg
  echo "deb [signed-by=/etc/apt/keyrings/charm.gpg] https://repo.charm.sh/apt/ * *" | sudo tee /etc/apt/sources.list.d/charm.list
  sudo apt update && sudo apt install gum
  ```

## 🎮 Usage

### Basic Installation
```bash
# Interactive installation (recommended)
./install-dependencies.sh

# Non-interactive (auto-yes to all prompts)
./install-dependencies.sh --no-interactive

# Development mode (includes extra tools)
./install-dependencies.sh --dev
```

### Advanced Options
```bash
# Show help
./install-dependencies.sh --help

# Reset environment and reinstall everything
./install-dependencies.sh --reset

# Run comprehensive diagnostics
./install-dependencies.sh --troubleshoot

# Validate existing installation
./install-dependencies.sh --validate

# Force reinstall (even if dependencies exist)
./install-dependencies.sh --force

# Quiet mode (minimal output)
./install-dependencies.sh --quiet
```

### Combined Options
```bash
# Development setup with force reinstall
./install-dependencies.sh --dev --force

# Quiet non-interactive installation
./install-dependencies.sh --quiet --no-interactive
```

## 📊 What Gets Installed

### Core Dependencies
- **Rust & Cargo** (latest stable)
- **Solana CLI** (latest stable)
- **Anchor CLI** (v0.31.1 via AVM)
- **Node.js dependencies** (via npm/yarn/bun)
- **System build tools** (build-essential, curl, git, etc.)

### Development Mode Extras (`--dev`)
- **rust-analyzer** (LSP for Rust)
- **cargo-watch** (continuous compilation)
- **cargo-edit** (dependency management)
- **Development keypair** (for local testing)
- **Solana localhost configuration**

### Project Initialization
- **Node.js dependencies** installation
- **Anchor program** building
- **TypeScript types** generation
- **Environment configuration**

## 🔍 Troubleshooting

### Common Issues

#### "Command not found" after installation
```bash
# Refresh your terminal environment
source ~/.bashrc  # or ~/.zshrc

# Or restart your terminal
```

#### Dependencies not detected
```bash
# Run diagnostics
./install-dependencies.sh --troubleshoot

# Reset and reinstall
./install-dependencies.sh --reset
```

#### Permission errors
```bash
# Make sure script is executable
chmod +x install-dependencies.sh

# Check sudo access
sudo echo "Sudo access confirmed"
```

### Diagnostic Commands

```bash
# Comprehensive system check
./install-dependencies.sh --troubleshoot

# Quick validation
./install-dependencies.sh --validate

# Check installation log
cat ~/.pod-protocol-install.log
```

## 🔄 Terminal Reset Handling

If your terminal needs to be reset or you're getting "command not found" errors:

1. **Automatic**: The script handles environment refresh automatically
2. **Manual**: Run `source ~/.bashrc` (or `~/.zshrc`)
3. **Reset**: Use `./install-dependencies.sh --reset` for clean reinstall
4. **Restart**: Simply restart your terminal

## 📝 Logging

All installation activities are logged to `~/.pod-protocol-install.log` for debugging and audit purposes.

```bash
# View recent log entries
tail -f ~/.pod-protocol-install.log

# Search for errors
grep -i error ~/.pod-protocol-install.log
```

## 🚨 Recovery Scenarios

### Complete Environment Reset
```bash
./install-dependencies.sh --reset
```

### Partial Installation Issues
```bash
# Force reinstall specific components
./install-dependencies.sh --force

# Or use custom installation mode
./install-dependencies.sh  # Choose "Custom Installation"
```

### CI/CD Integration
```bash
# Automated installation for CI
./install-dependencies.sh --no-interactive --quiet

# With development tools
./install-dependencies.sh --no-interactive --dev
```

## 🎯 Next Steps After Installation

1. **Restart terminal** or run `source ~/.bashrc`
2. **Navigate to project**: `cd /path/to/pod-protocol`
3. **Build project**: `npm run build`
4. **Install SDK**: `./install.sh`
5. **Start developing**: Follow the main README.md

## 🆘 Support

- **Troubleshooting**: `./install-dependencies.sh --troubleshoot`
- **Validation**: `./install-dependencies.sh --validate`
- **Log file**: `~/.pod-protocol-install.log`
- **Issues**: [GitHub Issues](https://github.com/your-repo/pod-protocol/issues)

## 🔧 Advanced Configuration

### Environment Variables
```bash
# Skip interactive prompts
export POD_NO_INTERACTIVE=1

# Enable development mode
export POD_DEV_MODE=1

# Custom log file
export POD_LOG_FILE="/custom/path/install.log"
```

### Package Manager Priority
The script automatically detects and uses package managers in this order:
1. **Bun** (fastest)
2. **Yarn** (reliable)
3. **NPM** (fallback)

## 📋 Checklist

- [ ] Run `./install-dependencies.sh`
- [ ] Verify with `./install-dependencies.sh --validate`
- [ ] Restart terminal or source shell profile
- [ ] Test with `cargo --version`, `solana --version`, `anchor --version`
- [ ] Navigate to project directory
- [ ] Run `npm run build`
- [ ] Run `./install.sh`
- [ ] Start building with PoD Protocol! 🚀

---

**Made with ❤️ for the PoD Protocol community**