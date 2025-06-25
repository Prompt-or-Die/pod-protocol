#!/bin/bash

# PoD Protocol Dependencies Installer
# This script installs all required dependencies for building PoD Protocol

set -e

COLORS=(
  "\033[0m"     # Reset
  "\033[31m"    # Red
  "\033[32m"    # Green
  "\033[33m"    # Yellow
  "\033[34m"    # Blue
  "\033[35m"    # Magenta
  "\033[36m"    # Cyan
  "\033[1m"     # Bold
)

log() {
  echo -e "${COLORS[$2]:-${COLORS[0]}}$1${COLORS[0]}"
}

banner() {
  log "
╔═══════════════════════════════════════════════════════════════╗
║                PoD Protocol Dependencies Installer             ║
║              Installing Rust, Solana, and Anchor               ║
╚═══════════════════════════════════════════════════════════════╝
" 6
}

install_rust() {
  if command -v cargo &> /dev/null; then
    log "✅ Rust/Cargo already installed: $(cargo --version)" 2
    return
  fi
  
  log "📦 Installing Rust and Cargo..." 3
  curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
  source "$HOME/.cargo/env"
  
  # Add to current session
  export PATH="$HOME/.cargo/bin:$PATH"
  
  log "✅ Rust installed: $(cargo --version)" 2
}

install_solana() {
  if command -v solana &> /dev/null; then
    log "✅ Solana CLI already installed: $(solana --version)" 2
    return
  fi
  
  log "📦 Installing Solana CLI..." 3
  sh -c "$(curl -sSfL https://release.anza.xyz/stable/install)"
  
  # Add to current session
  export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"
  
  log "✅ Solana CLI installed: $(solana --version)" 2
}

install_anchor() {
  if command -v anchor &> /dev/null; then
    log "✅ Anchor CLI already installed: $(anchor --version)" 2
    return
  fi
  
  log "📦 Installing Anchor CLI..." 3
  
  # Install avm (Anchor Version Manager)
  cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
  
  # Install and use Anchor 0.31.1
  avm install 0.31.1
  avm use 0.31.1
  
  log "✅ Anchor CLI installed: $(anchor --version)" 2
}

install_node_dependencies() {
  log "📦 Installing Node.js dependencies..." 3
  
  # Check if bun is available, otherwise use npm
  if command -v bun &> /dev/null; then
    log "Using Bun for package management..." 4
    bun install
  elif command -v yarn &> /dev/null; then
    log "Using Yarn for package management..." 4
    yarn install
  else
    log "Using NPM for package management..." 4
    npm install
  fi
  
  log "✅ Node.js dependencies installed!" 2
}

setup_environment() {
  log "🔧 Setting up environment..." 3
  
  # Create shell profile additions
  SHELL_PROFILE="$HOME/.bashrc"
  if [ -f "$HOME/.zshrc" ]; then
    SHELL_PROFILE="$HOME/.zshrc"
  fi
  
  # Add Rust to PATH
  if ! grep -q 'source "$HOME/.cargo/env"' "$SHELL_PROFILE"; then
    echo 'source "$HOME/.cargo/env"' >> "$SHELL_PROFILE"
    log "Added Rust to $SHELL_PROFILE" 4
  fi
  
  # Add Solana to PATH
  if ! grep -q 'solana/install/active_release/bin' "$SHELL_PROFILE"; then
    echo 'export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"' >> "$SHELL_PROFILE"
    log "Added Solana to $SHELL_PROFILE" 4
  fi
  
  log "✅ Environment configured!" 2
  log "💡 Run 'source $SHELL_PROFILE' or restart your terminal to apply changes" 3
}

verify_installation() {
  log "🔍 Verifying installation..." 3
  
  local all_good=true
  
  if command -v cargo &> /dev/null; then
    log "✅ Rust/Cargo: $(cargo --version)" 2
  else
    log "❌ Rust/Cargo not found" 1
    all_good=false
  fi
  
  if command -v solana &> /dev/null; then
    log "✅ Solana CLI: $(solana --version)" 2
  else
    log "❌ Solana CLI not found" 1
    all_good=false
  fi
  
  if command -v anchor &> /dev/null; then
    log "✅ Anchor CLI: $(anchor --version)" 2
  else
    log "❌ Anchor CLI not found" 1
    all_good=false
  fi
  
  if [ "$all_good" = true ]; then
    log "\n🎉 All dependencies installed successfully!" 2
    log "You can now run: npm run build or ./install.sh" 4
  else
    log "\n⚠️  Some dependencies failed to install. Please check the errors above." 3
  fi
}

main() {
  banner
  
  # Update package lists
  log "📦 Updating package lists..." 3
  sudo apt update
  
  # Install basic build tools
  log "📦 Installing build essentials..." 3
  sudo apt install -y build-essential curl git pkg-config libssl-dev
  
  install_rust
  install_solana
  install_anchor
  install_node_dependencies
  setup_environment
  verify_installation
  
  log "\n🚀 Ready to build PoD Protocol!" 2
  log "Next steps:" 4
  log "  1. source ~/.bashrc (or restart terminal)" 0
  log "  2. npm run build" 0
  log "  3. ./install.sh" 0
}

# Run main function
main "$@"