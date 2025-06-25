#!/bin/bash

# PoD Protocol Complete Dependencies Installer
# Enhanced with Gum for beautiful interactive CLI experience
# This script provides EVERYTHING needed for PoD Protocol development
#
# Features:
# - Complete dependency installation (Rust, Solana, Anchor, Node.js)
# - Environment setup and validation
# - Terminal reset handling
# - Troubleshooting and recovery
# - Development environment configuration
# - Project initialization
# - Interactive mode with Gum or fallback
#
# For the best experience, install Gum first:
#   macOS/Linux: brew install gum
#   Ubuntu/Debian: curl -fsSL https://repo.charm.sh/apt/gpg.key | sudo gpg --dearmor -o /etc/apt/keyrings/charm.gpg
#                  echo "deb [signed-by=/etc/apt/keyrings/charm.gpg] https://repo.charm.sh/apt/ * *" | sudo tee /etc/apt/sources.list.d/charm.list
#                  sudo apt update && sudo apt install gum
#   Or download from: https://github.com/charmbracelet/gum/releases
#
# Usage: ./install-dependencies.sh [--help|--reset|--troubleshoot|--validate]

set -e

# Script version for tracking
SCRIPT_VERSION="2.0.0"
LOG_FILE="$HOME/.pod-protocol-install.log"

# Command line argument handling
show_help() {
  cat << EOF
PoD Protocol Complete Dependencies Installer v$SCRIPT_VERSION

USAGE:
  ./install-dependencies.sh [OPTIONS]

OPTIONS:
  --help, -h          Show this help message
  --reset             Reset environment and reinstall everything
  --troubleshoot      Run troubleshooting diagnostics
  --validate          Validate existing installation
  --force             Force reinstall even if dependencies exist
  --quiet             Minimal output mode
  --dev               Install additional development tools
  --no-interactive    Skip interactive prompts (auto-yes)

EXAMPLES:
  ./install-dependencies.sh                    # Interactive installation
  ./install-dependencies.sh --reset            # Clean reinstall
  ./install-dependencies.sh --troubleshoot     # Diagnose issues
  ./install-dependencies.sh --validate         # Check installation

For support: https://github.com/your-repo/pod-protocol/issues
EOF
}

# Parse command line arguments
FORCE_INSTALL=false
QUIET_MODE=false
DEV_MODE=false
NO_INTERACTIVE=false
RESET_MODE=false
TROUBLESHOOT_MODE=false
VALIDATE_MODE=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --help|-h)
      show_help
      exit 0
      ;;
    --reset)
      RESET_MODE=true
      shift
      ;;
    --troubleshoot)
      TROUBLESHOOT_MODE=true
      shift
      ;;
    --validate)
      VALIDATE_MODE=true
      shift
      ;;
    --force)
      FORCE_INSTALL=true
      shift
      ;;
    --quiet)
      QUIET_MODE=true
      shift
      ;;
    --dev)
      DEV_MODE=true
      shift
      ;;
    --no-interactive)
      NO_INTERACTIVE=true
      shift
      ;;
    *)
      echo "Unknown option: $1"
      show_help
      exit 1
      ;;
  esac
done

# Logging function
log_to_file() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

# Check if gum is available
USE_GUM=false
if command -v gum &> /dev/null && [ "$NO_INTERACTIVE" = false ]; then
    USE_GUM=true
fi

# Override gum in quiet mode
if [ "$QUIET_MODE" = true ]; then
    USE_GUM=false
fi

# Fallback colors for non-gum mode
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

# Enhanced logging with gum support and file logging
log() {
  local message="$1"
  local color="${2:-0}"
  
  # Log to file
  log_to_file "$message"
  
  # Skip output in quiet mode unless it's an error
  if [ "$QUIET_MODE" = true ] && [ "$color" != "1" ]; then
    return
  fi
  
  if [ "$USE_GUM" = true ]; then
    case $color in
      1) gum style --foreground 196 "$message" ;;  # Red
      2) gum style --foreground 46 "$message" ;;   # Green
      3) gum style --foreground 226 "$message" ;;  # Yellow
      4) gum style --foreground 39 "$message" ;;   # Blue
      6) gum style --foreground 201 --bold "$message" ;; # Magenta Bold
      *) gum style "$message" ;;
    esac
  else
    echo -e "${COLORS[$color]:-${COLORS[0]}}$message${COLORS[0]}"
  fi
}

# System information gathering
get_system_info() {
  echo "System Information:"
  echo "  OS: $(uname -s)"
  echo "  Architecture: $(uname -m)"
  echo "  Kernel: $(uname -r)"
  echo "  Shell: $SHELL"
  echo "  Home: $HOME"
  echo "  PATH: $PATH"
  echo "  Script Version: $SCRIPT_VERSION"
  echo "  Log File: $LOG_FILE"
}

# Troubleshooting function
troubleshoot() {
  log "🔧 Running PoD Protocol Installation Diagnostics..." 3
  echo
  
  get_system_info
  echo
  
  log "Checking dependencies..." 4
  
  # Check each dependency with detailed info
  local issues_found=false
  
  # Rust/Cargo
  if command -v cargo &> /dev/null; then
    log "✅ Rust/Cargo: $(cargo --version)" 2
    log "   Location: $(which cargo)" 0
  else
    log "❌ Rust/Cargo not found" 1
    log "   Install with: curl --proto='=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh" 0
    issues_found=true
  fi
  
  # Solana CLI
  if command -v solana &> /dev/null; then
    log "✅ Solana CLI: $(solana --version)" 2
    log "   Location: $(which solana)" 0
  else
    log "❌ Solana CLI not found" 1
    log "   Install with: sh -c '$(curl -sSfL https://release.anza.xyz/stable/install)'" 0
    issues_found=true
  fi
  
  # Anchor CLI
  if command -v anchor &> /dev/null; then
    log "✅ Anchor CLI: $(anchor --version)" 2
    log "   Location: $(which anchor)" 0
  else
    log "❌ Anchor CLI not found" 1
    log "   Install with: cargo install --git https://github.com/coral-xyz/anchor avm --locked --force" 0
    issues_found=true
  fi
  
  # Node.js
  if command -v node &> /dev/null; then
    log "✅ Node.js: $(node --version)" 2
    log "   Location: $(which node)" 0
  else
    log "❌ Node.js not found" 1
    log "   Install from: https://nodejs.org" 0
    issues_found=true
  fi
  
  # Git
  if command -v git &> /dev/null; then
    log "✅ Git: $(git --version)" 2
  else
    log "❌ Git not found" 1
    issues_found=true
  fi
  
  # Package managers
  echo
  log "Package managers available:" 4
  command -v npm &> /dev/null && log "✅ NPM: $(npm --version)" 2 || log "❌ NPM not found" 1
  command -v yarn &> /dev/null && log "✅ Yarn: $(yarn --version)" 2 || log "❌ Yarn not found" 1
  command -v bun &> /dev/null && log "✅ Bun: $(bun --version)" 2 || log "❌ Bun not found" 1
  
  # Environment variables
  echo
  log "Environment check:" 4
  [ -f "$HOME/.cargo/env" ] && log "✅ Cargo environment file exists" 2 || log "❌ Cargo environment file missing" 1
  
  # Shell profile
  local shell_profile="$HOME/.bashrc"
  [ -f "$HOME/.zshrc" ] && shell_profile="$HOME/.zshrc"
  log "Shell profile: $shell_profile" 4
  
  if [ -f "$shell_profile" ]; then
    log "✅ Shell profile exists" 2
    grep -q 'cargo/env' "$shell_profile" && log "✅ Cargo in shell profile" 2 || log "❌ Cargo not in shell profile" 1
    grep -q 'solana' "$shell_profile" && log "✅ Solana in shell profile" 2 || log "❌ Solana not in shell profile" 1
  else
    log "❌ Shell profile not found" 1
  fi
  
  echo
  if [ "$issues_found" = true ]; then
    log "🚨 Issues found! Run with --reset to fix automatically" 1
  else
    log "🎉 All dependencies look good!" 2
  fi
  
  log "💡 Log file: $LOG_FILE" 4
}

# Reset environment function
reset_environment() {
  log "🔄 Resetting PoD Protocol environment..." 3
  
  if confirm "This will remove and reinstall all dependencies. Continue?"; then
    log "Removing existing installations..." 3
    
    # Remove Rust
    if [ -d "$HOME/.cargo" ]; then
      log "Removing Rust installation..." 4
      rm -rf "$HOME/.cargo" "$HOME/.rustup" 2>/dev/null || true
    fi
    
    # Remove Solana
    if [ -d "$HOME/.local/share/solana" ]; then
      log "Removing Solana installation..." 4
      rm -rf "$HOME/.local/share/solana" 2>/dev/null || true
    fi
    
    # Clean shell profiles
    local shell_profile="$HOME/.bashrc"
    [ -f "$HOME/.zshrc" ] && shell_profile="$HOME/.zshrc"
    
    if [ -f "$shell_profile" ]; then
      log "Cleaning shell profile..." 4
      sed -i '/cargo\/env/d' "$shell_profile" 2>/dev/null || true
      sed -i '/solana.*bin/d' "$shell_profile" 2>/dev/null || true
    fi
    
    log "✅ Environment reset complete!" 2
    log "Now running fresh installation..." 3
    
    # Force fresh installation
    FORCE_INSTALL=true
  else
    log "Reset cancelled" 3
    exit 0
  fi
}

# Validation function
validate_installation() {
  log "🔍 Validating PoD Protocol installation..." 3
  
  local all_good=true
  local warnings=()
  
  # Check core dependencies
  if ! command -v cargo &> /dev/null; then
    log "❌ Rust/Cargo missing" 1
    all_good=false
  fi
  
  if ! command -v solana &> /dev/null; then
    log "❌ Solana CLI missing" 1
    all_good=false
  fi
  
  if ! command -v anchor &> /dev/null; then
    log "❌ Anchor CLI missing" 1
    all_good=false
  fi
  
  if ! command -v node &> /dev/null; then
    log "❌ Node.js missing" 1
    all_good=false
  fi
  
  # Check project files
  if [ ! -f "package.json" ]; then
    warnings+=("package.json not found in current directory")
  fi
  
  if [ ! -f "Anchor.toml" ]; then
    warnings+=("Anchor.toml not found in current directory")
  fi
  
  # Test basic functionality
  if command -v cargo &> /dev/null; then
    if ! cargo --version &> /dev/null; then
      warnings+=("Cargo command fails")
    fi
  fi
  
  if command -v solana &> /dev/null; then
    if ! solana --version &> /dev/null; then
      warnings+=("Solana command fails")
    fi
  fi
  
  # Report results
  echo
  if [ "$all_good" = true ]; then
    log "✅ All core dependencies validated!" 2
  else
    log "❌ Validation failed - missing dependencies" 1
  fi
  
  if [ ${#warnings[@]} -gt 0 ]; then
    log "⚠️  Warnings:" 3
    for warning in "${warnings[@]}"; do
      log "   - $warning" 3
    done
  fi
  
  return $([ "$all_good" = true ] && echo 0 || echo 1)
}

# Enhanced banner with gum styling
banner() {
  if [ "$USE_GUM" = true ]; then
    gum style \
      --foreground 212 \
      --border-foreground 212 \
      --border double \
      --align center \
      --width 70 \
      --margin "1 2" \
      --padding "1 2" \
      "PoD Protocol Dependencies Installer" \
      "Installing Rust, Solana, and Anchor" \
      "Enhanced with Gum for better UX"
  else
    log "
╔═══════════════════════════════════════════════════════════════╗
║                PoD Protocol Dependencies Installer             ║
║              Installing Rust, Solana, and Anchor               ║
╚═══════════════════════════════════════════════════════════════╝
" 6
  fi
}

# Interactive confirmation with gum and non-interactive support
confirm() {
  # Auto-confirm in non-interactive mode
  if [ "$NO_INTERACTIVE" = true ]; then
    log "Auto-confirming: $1" 4
    return 0
  fi
  
  if [ "$USE_GUM" = true ]; then
    gum confirm "$1"
  else
    echo -n "$1 (y/N): "
    read -r response
    case "$response" in
      [yY][eE][sS]|[yY]) return 0 ;;
      *) return 1 ;;
    esac
  fi
}

# Progress spinner with gum
spin() {
  local title="$1"
  shift
  if [ "$USE_GUM" = true ]; then
    gum spin --spinner dot --title "$title" -- "$@"
  else
    log "$title" 3
    "$@"
  fi
}

install_rust() {
  if command -v cargo &> /dev/null && [ "$FORCE_INSTALL" = false ]; then
    log "✅ Rust/Cargo already installed: $(cargo --version)" 2
    return
  fi
  
  if [ "$FORCE_INSTALL" = true ]; then
    log "🔄 Force reinstalling Rust/Cargo..." 3
  elif ! confirm "Install Rust and Cargo?"; then
    log "⏭️  Skipping Rust installation" 3
    return
  fi
  
  log "📦 Installing Rust and Cargo..." 3
  
  # Remove existing installation if force mode
  if [ "$FORCE_INSTALL" = true ] && [ -d "$HOME/.cargo" ]; then
    log "Removing existing Rust installation..." 4
    rm -rf "$HOME/.cargo" "$HOME/.rustup" 2>/dev/null || true
  fi
  
  spin "Downloading and installing Rust" \
    sh -c 'curl --proto="=https" --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y'
  
  # Source cargo environment
  if [ -f "$HOME/.cargo/env" ]; then
    source "$HOME/.cargo/env"
  fi
  
  # Add to current session
  export PATH="$HOME/.cargo/bin:$PATH"
  
  # Install additional Rust tools for development
  if [ "$DEV_MODE" = true ]; then
    log "Installing additional Rust development tools..." 4
    spin "Installing rust-analyzer" cargo install rust-analyzer
    spin "Installing cargo-watch" cargo install cargo-watch
    spin "Installing cargo-edit" cargo install cargo-edit
  fi
  
  log "✅ Rust installed: $(cargo --version)" 2
}

install_solana() {
  if command -v solana &> /dev/null && [ "$FORCE_INSTALL" = false ]; then
    log "✅ Solana CLI already installed: $(solana --version)" 2
    return
  fi
  
  if [ "$FORCE_INSTALL" = true ]; then
    log "🔄 Force reinstalling Solana CLI..." 3
  elif ! confirm "Install Solana CLI?"; then
    log "⏭️  Skipping Solana CLI installation" 3
    return
  fi
  
  log "📦 Installing Solana CLI..." 3
  
  # Remove existing installation if force mode
  if [ "$FORCE_INSTALL" = true ] && [ -d "$HOME/.local/share/solana" ]; then
    log "Removing existing Solana installation..." 4
    rm -rf "$HOME/.local/share/solana" 2>/dev/null || true
  fi
  
  spin "Downloading and installing Solana CLI" \
    sh -c '$(curl -sSfL https://release.anza.xyz/stable/install)'
  
  # Add to current session
  export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"
  
  # Configure Solana for development
  if [ "$DEV_MODE" = true ]; then
    log "Configuring Solana for development..." 4
    solana config set --url localhost 2>/dev/null || true
    log "💡 Solana configured for localhost development" 4
  fi
  
  log "✅ Solana CLI installed: $(solana --version)" 2
}

install_anchor() {
  if command -v anchor &> /dev/null && [ "$FORCE_INSTALL" = false ]; then
    log "✅ Anchor CLI already installed: $(anchor --version)" 2
    return
  fi
  
  if [ "$FORCE_INSTALL" = true ]; then
    log "🔄 Force reinstalling Anchor CLI..." 3
  elif ! confirm "Install Anchor CLI?"; then
    log "⏭️  Skipping Anchor CLI installation" 3
    return
  fi
  
  log "📦 Installing Anchor CLI..." 3
  
  # Install avm (Anchor Version Manager)
  spin "Installing Anchor Version Manager (avm)" \
    cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
  
  # Install and use Anchor 0.31.1
  spin "Installing Anchor 0.31.1" avm install 0.31.1
  avm use 0.31.1
  
  log "✅ Anchor CLI installed: $(anchor --version)" 2
}

# Initialize PoD Protocol project
init_project() {
  if ! confirm "Initialize PoD Protocol project environment?"; then
    log "⏭️  Skipping project initialization" 3
    return
  fi
  
  log "🚀 Initializing PoD Protocol project..." 3
  
  # Install Node.js dependencies if package.json exists
  if [ -f "package.json" ]; then
    log "Installing Node.js dependencies..." 4
    
    # Detect and use best package manager
    if command -v bun &> /dev/null; then
      spin "Installing with Bun" bun install
    elif command -v yarn &> /dev/null; then
      spin "Installing with Yarn" yarn install
    else
      spin "Installing with NPM" npm install
    fi
  fi
  
  # Build Anchor program if Anchor.toml exists
  if [ -f "Anchor.toml" ] && command -v anchor &> /dev/null; then
    log "Building Anchor program..." 4
    spin "Building with Anchor" anchor build
  fi
  
  # Generate TypeScript types if possible
  if [ -f "Anchor.toml" ] && command -v anchor &> /dev/null; then
    log "Generating TypeScript types..." 4
    spin "Generating types" anchor build --idl target/idl
  fi
  
  # Create development keypair if in dev mode
  if [ "$DEV_MODE" = true ] && command -v solana &> /dev/null; then
    if [ ! -f "$HOME/.config/solana/id.json" ]; then
      log "Creating development keypair..." 4
      mkdir -p "$HOME/.config/solana"
      solana-keygen new --no-bip39-passphrase --silent --outfile "$HOME/.config/solana/id.json"
      log "💡 Development keypair created" 4
    fi
  fi
  
  log "✅ Project initialization complete!" 2
}

install_node_dependencies() {
  if ! confirm "Install Node.js dependencies?"; then
    log "⏭️  Skipping Node.js dependencies installation" 3
    return
  fi
  
  log "📦 Installing Node.js dependencies..." 3
  
  # Interactive package manager selection with gum
  local package_manager
  if [ "$USE_GUM" = true ]; then
    # Detect available package managers
    local managers=()
    command -v bun &> /dev/null && managers+=("bun")
    command -v yarn &> /dev/null && managers+=("yarn")
    command -v npm &> /dev/null && managers+=("npm")
    
    if [ ${#managers[@]} -gt 1 ]; then
      package_manager=$(gum choose --header "Select package manager:" "${managers[@]}")
    else
      package_manager="${managers[0]}"
    fi
  else
    # Fallback to automatic detection
    if command -v bun &> /dev/null; then
      package_manager="bun"
    elif command -v yarn &> /dev/null; then
      package_manager="yarn"
    else
      package_manager="npm"
    fi
  fi
  
  log "Using $package_manager for package management..." 4
  
  case $package_manager in
    "bun")
      spin "Installing dependencies with Bun" bun install
      ;;
    "yarn")
      spin "Installing dependencies with Yarn" yarn install
      ;;
    "npm")
      spin "Installing dependencies with NPM" npm install
      ;;
  esac
  
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

# Interactive setup mode selection
select_installation_mode() {
  if [ "$USE_GUM" = true ]; then
    local mode
    mode=$(gum choose \
      --header "Choose installation mode:" \
      "Full Installation (All dependencies)" \
      "Custom Installation (Select components)" \
      "System Dependencies Only" \
      "Exit")
    
    case "$mode" in
      "Full Installation (All dependencies)")
        return 0
        ;;
      "Custom Installation (Select components)")
        return 1
        ;;
      "System Dependencies Only")
        return 2
        ;;
      "Exit")
        log "👋 Installation cancelled" 3
        exit 0
        ;;
    esac
  else
    echo "Installation modes:"
    echo "1) Full Installation (All dependencies)"
    echo "2) Custom Installation (Select components)"
    echo "3) System Dependencies Only"
    echo "4) Exit"
    echo -n "Choose mode (1-4): "
    read -r choice
    
    case "$choice" in
      1) return 0 ;;
      2) return 1 ;;
      3) return 2 ;;
      4) log "👋 Installation cancelled" 3; exit 0 ;;
      *) log "❌ Invalid choice" 1; exit 1 ;;
    esac
  fi
}

# Install system dependencies
install_system_deps() {
  if ! confirm "Install system dependencies (build tools, curl, git)?"; then
    log "⏭️  Skipping system dependencies" 3
    return
  fi
  
  # Update package lists
  spin "Updating package lists" sudo apt update
  
  # Install basic build tools
  spin "Installing build essentials" \
    sudo apt install -y build-essential curl git pkg-config libssl-dev
  
  log "✅ System dependencies installed!" 2
}

# Terminal reset helper
reset_terminal_env() {
  log "🔄 Resetting terminal environment..." 3
  
  # Source shell profile
  local shell_profile="$HOME/.bashrc"
  [ -f "$HOME/.zshrc" ] && shell_profile="$HOME/.zshrc"
  
  if [ -f "$shell_profile" ]; then
    log "Sourcing $shell_profile..." 4
    source "$shell_profile" 2>/dev/null || true
  fi
  
  # Source cargo environment
  if [ -f "$HOME/.cargo/env" ]; then
    source "$HOME/.cargo/env"
  fi
  
  # Update PATH for current session
  export PATH="$HOME/.cargo/bin:$HOME/.local/share/solana/install/active_release/bin:$PATH"
  
  log "✅ Terminal environment refreshed!" 2
}

# Post-installation setup and recommendations
post_install_setup() {
  log "\n🎯 Post-installation setup..." 3
  
  # Refresh environment
  reset_terminal_env
  
  # Final validation
  if validate_installation; then
    log "\n🎉 All systems ready!" 2
  else
    log "\n⚠️  Some issues detected. Run --troubleshoot for details." 3
  fi
  
  # Development recommendations
  if [ "$DEV_MODE" = true ]; then
    log "\n💡 Development recommendations:" 4
    log "  - Use 'solana-test-validator' for local testing" 0
    log "  - Run 'anchor test' to test your programs" 0
    log "  - Use 'cargo watch -x check' for continuous compilation" 0
  fi
  
  # Show next steps
  if [ "$USE_GUM" = true ]; then
    gum style \
      --foreground 46 \
      --border-foreground 46 \
      --border rounded \
      --align center \
      --width 60 \
      --margin "1 2" \
      --padding "1 2" \
      "🚀 PoD Protocol Environment Ready!" \
      "" \
      "Next steps:" \
      "1. Restart terminal OR source ~/.bashrc" \
      "2. cd to your project directory" \
      "3. Run: npm run build" \
      "4. Run: ./install.sh" \
      "" \
      "Troubleshooting: ./install-dependencies.sh --troubleshoot"
  else
    log "\n🚀 PoD Protocol Environment Ready!" 2
    log "Next steps:" 4
    log "  1. Restart terminal OR source ~/.bashrc" 0
    log "  2. cd to your project directory" 0
    log "  3. Run: npm run build" 0
    log "  4. Run: ./install.sh" 0
    log "" 0
    log "Troubleshooting: ./install-dependencies.sh --troubleshoot" 4
  fi
  
  log "\n📝 Installation log saved to: $LOG_FILE" 4
}

main() {
  # Handle special modes first
  if [ "$TROUBLESHOOT_MODE" = true ]; then
    troubleshoot
    exit 0
  fi
  
  if [ "$VALIDATE_MODE" = true ]; then
    validate_installation
    exit $?
  fi
  
  if [ "$RESET_MODE" = true ]; then
    reset_environment
  fi
  
  # Start installation
  banner
  
  log "Starting PoD Protocol Complete Setup v$SCRIPT_VERSION" 4
  log "Log file: $LOG_FILE" 4
  echo
  
  # Check if gum is available and offer to install it
  if [ "$USE_GUM" = false ] && [ "$NO_INTERACTIVE" = false ]; then
    log "💡 For a better experience, install 'gum' for interactive prompts:" 4
    log "   brew install gum  # or your package manager" 0
    echo
  fi
  
  # Select installation mode (skip in non-interactive mode)
  local mode=0  # Default to full installation
  if [ "$NO_INTERACTIVE" = false ]; then
    select_installation_mode
    mode=$?
  fi
  
  # Install system dependencies
  install_system_deps
  
  case $mode in
    0) # Full installation
      log "🚀 Starting full installation..." 2
      install_rust
      install_solana
      install_anchor
      install_node_dependencies
      init_project
      ;;
    1) # Custom installation
      log "🎯 Custom installation mode" 2
      install_rust
      install_solana
      install_anchor
      install_node_dependencies
      init_project
      ;;
    2) # System dependencies only
      log "⚙️  System dependencies only" 2
      ;;
  esac
  
  setup_environment
  post_install_setup
}

# Run main function
main "$@"