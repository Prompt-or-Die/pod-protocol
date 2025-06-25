#!/bin/bash

# PoD Protocol Installer Script
# This script allows users to choose which SDK to install

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
║                    PoD Protocol Installer                      ║
║           Prompt or Die: AI Agent Communication                ║
╚═══════════════════════════════════════════════════════════════╝
" 6
}

check_dependencies() {
  log "Checking dependencies..." 3
  
  local missing_deps=()
  
  # Check for Node.js
  if ! command -v node &> /dev/null; then
    missing_deps+=("Node.js (https://nodejs.org)")
  fi
  
  # Check for Git
  if ! command -v git &> /dev/null; then
    missing_deps+=("Git")
  fi
  
  # Check for Rust/Cargo
  if ! command -v cargo &> /dev/null; then
    missing_deps+=("Rust/Cargo (https://rustup.rs)")
  fi
  
  if [ ${#missing_deps[@]} -ne 0 ]; then
    log "Missing dependencies:" 1
    for dep in "${missing_deps[@]}"; do
      log "  - $dep" 1
    done
    log "Please install the missing dependencies and run this script again." 3
    exit 1
  fi
  
  log "✅ All dependencies found!" 2
}

select_package_manager() {
  log "Select package manager:" 4
  log "1) Bun (recommended - fastest)" 2
  log "2) Yarn" 3
  log "3) NPM" 3
  
  while true; do
    read -p "Enter your choice (1-3): " pm_choice
    case $pm_choice in
      1)
        PACKAGE_MANAGER="bun"
        if ! command -v bun &> /dev/null; then
          log "Installing Bun..." 3
          curl -fsSL https://bun.sh/install | bash
          export PATH="$HOME/.bun/bin:$PATH"
        fi
        break
        ;;
      2)
        PACKAGE_MANAGER="yarn"
        if ! command -v yarn &> /dev/null; then
          log "Installing Yarn..." 3
          npm install -g yarn
        fi
        break
        ;;
      3)
        PACKAGE_MANAGER="npm"
        break
        ;;
      *)
        log "Invalid choice. Please enter 1, 2, or 3." 1
        ;;
    esac
  done
  
  log "✅ Using $PACKAGE_MANAGER" 2
}

select_sdk() {
  log "Select SDK to install:" 4
  log "1) TypeScript SDK (Full featured, type-safe)" 2
  log "2) JavaScript SDK (Lightweight, ES6+)" 3
  log "3) Python SDK (For Python applications)" 5
  log "4) CLI Tool (Command line interface)" 6
  log "5) All SDKs" 1
  
  while true; do
    read -p "Enter your choice (1-5): " sdk_choice
    case $sdk_choice in
      1) SDK_CHOICE="typescript"; break ;;
      2) SDK_CHOICE="javascript"; break ;;
      3) SDK_CHOICE="python"; break ;;
      4) SDK_CHOICE="cli"; break ;;
      5) SDK_CHOICE="all"; break ;;
      *) log "Invalid choice. Please enter 1-5." 1 ;;
    esac
  done
  
  log "✅ Selected: $SDK_CHOICE" 2
}

install_solana_cli() {
  if ! command -v solana &> /dev/null; then
    log "Installing Solana CLI..." 3
    sh -c "$(curl -sSfL https://release.anza.xyz/stable/install)"
    export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"
    log "✅ Solana CLI installed" 2
  else
    log "✅ Solana CLI already installed" 2
  fi
}

build_sdk() {
  local sdk_type=$1
  
  log "Building $sdk_type SDK..." 3
  
  case $sdk_type in
    "typescript")
      $PACKAGE_MANAGER run build:typescript
      ;;
    "javascript") 
      $PACKAGE_MANAGER run build:javascript
      ;;
    "python")
      $PACKAGE_MANAGER run build:python
      ;;
    "cli")
      $PACKAGE_MANAGER run build:cli
      ;;
    "all")
      $PACKAGE_MANAGER run build:all
      ;;
  esac
  
  log "✅ $sdk_type SDK built successfully!" 2
}

install_dependencies() {
  log "Installing project dependencies..." 3
  $PACKAGE_MANAGER install
  log "✅ Dependencies installed!" 2
}

show_usage_info() {
  log "
🎉 Installation completed successfully!

Usage Information:
" 2

  case $SDK_CHOICE in
    "typescript")
      log "TypeScript SDK:" 4
      log "  import { PodComClient } from '@pod-protocol/sdk';" 0
      log "  const client = new PodComClient({ endpoint: 'https://api.devnet.solana.com' });" 0
      ;;
    "javascript")
      log "JavaScript SDK:" 4
      log "  import { PodComClient } from '@pod-protocol/sdk-js';" 0
      log "  const client = new PodComClient({ endpoint: 'https://api.devnet.solana.com' });" 0
      ;;
    "python")
      log "Python SDK:" 4
      log "  from pod_protocol import PodComClient" 0
      log "  client = PodComClient(endpoint='https://api.devnet.solana.com')" 0
      ;;
    "cli")
      log "CLI Tool:" 4
      log "  pod --help" 0
      log "  pod agent register --help" 0
      ;;
    "all")
      log "All SDKs installed! Check the documentation for usage examples." 2
      ;;
  esac
  
  log "
📚 Documentation: https://github.com/your-org/pod-protocol/docs
🐛 Issues: https://github.com/your-org/pod-protocol/issues
💬 Community: https://discord.gg/your-discord
" 6
}

main() {
  banner
  check_dependencies
  select_package_manager
  select_sdk
  install_solana_cli
  install_dependencies
  build_sdk "$SDK_CHOICE"
  show_usage_info
}

# Run main function
main "$@" 