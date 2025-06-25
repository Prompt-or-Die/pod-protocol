#!/bin/bash

# PoD Protocol Ultimate Installer Script
# Prompt or Die: Where AI Agents Meet Their Destiny ⚡️

set -e

# Enhanced color palette for PoD Protocol branding
declare -A COLORS=(
  [RESET]="\033[0m"
  [BOLD]="\033[1m"
  [DIM]="\033[2m"
  
  # PoD Protocol Brand Colors
  [PRIMARY]="\033[35m"      # Magenta
  [SECONDARY]="\033[36m"    # Cyan  
  [ACCENT]="\033[97m"       # Bright White
  [SUCCESS]="\033[32m"      # Green
  [WARNING]="\033[33m"      # Yellow
  [ERROR]="\033[31m"        # Red
  [INFO]="\033[34m"         # Blue
  [MUTED]="\033[90m"        # Gray
  
  # Special effects
  [UNDERLINE]="\033[4m"
  [REVERSE]="\033[7m"
)

# PoD Protocol Icons
ICONS=(
  "⚡️" "🚀" "💎" "🤖" "🔥" "⭐" "🛡️" "⚙️" 
  "💫" "🎯" "🌟" "🎭" "👁️" "🧠" "💥" "🌐"
)

log() {
  local message="$1"
  local color="${2:-RESET}"
  echo -e "${COLORS[$color]}$message${COLORS[RESET]}"
}

log_icon() {
  local message="$1"
  local color="${2:-RESET}"
  local icon="${3:-⚡️}"
  echo -e "${COLORS[$color]}$icon $message${COLORS[RESET]}"
}

typewriter() {
  local text="$1"
  local delay="${2:-0.05}"
  for (( i=0; i<${#text}; i++ )); do
    printf '%s' "${text:$i:1}"
    sleep "$delay"
  done
  echo
}

show_banner() {
  clear
  log "
${COLORS[PRIMARY]}╔═══════════════════════════════════════════════════════════════════════════════╗
║  ██████╗  ██████╗ ██████╗     ██████╗ ██████╗  ██████╗ ████████╗ ██████╗      ║
║  ██╔══██╗██╔═══██╗██╔══██╗    ██╔══██╗██╔══██╗██╔═══██╗╚══██╔══╝██╔═══██╗     ║
║  ██████╔╝██║   ██║██║  ██║    ██████╔╝██████╔╝██║   ██║   ██║   ██║   ██║     ║
║  ██╔═══╝ ██║   ██║██║  ██║    ██╔═══╝ ██╔══██╗██║   ██║   ██║   ██║   ██║     ║
║  ██║     ╚██████╔╝██████╔╝    ██║     ██║  ██║╚██████╔╝   ██║   ╚██████╔╝     ║
║  ╚═╝      ╚═════╝ ╚═════╝     ╚═╝     ╚═╝  ╚═╝ ╚═════╝    ╚═╝    ╚═════╝      ║
║                                                                               ║
║${COLORS[ACCENT]}    ██████╗ ██████╗  ██████╗ ███╗   ███╗██████╗ ████████╗              ║
║    ██╔══██╗██╔══██╗██╔═══██╗████╗ ████║██╔══██╗╚══██╔══╝              ║
║    ██████╔╝██████╔╝██║   ██║██╔████╔██║██████╔╝   ██║                 ║
║    ██╔═══╝ ██╔══██╗██║   ██║██║╚██╔╝██║██╔═══╝    ██║                 ║
║    ██║     ██║  ██║╚██████╔╝██║ ╚═╝ ██║██║        ██║                 ║
║    ╚═╝     ╚═╝  ╚═╝ ╚═════╝ ╚═╝     ╚═╝╚═╝        ╚═╝                 ║
║                                                                               ║
║     ██████╗ ██████╗     ██████╗ ██╗███████╗                              ║
║    ██╔═══██╗██╔══██╗    ██╔══██╗██║██╔════╝                              ║
║    ██║   ██║██████╔╝    ██║  ██║██║█████╗                                ║
║    ██║   ██║██╔══██╗    ██║  ██║██║██╔══╝                                ║
║    ╚██████╔╝██║  ██║    ██████╔╝██║███████╗                              ║
║     ╚═════╝ ╚═╝  ╚═╝    ╚═════╝ ╚═╝╚══════╝                              ║
║                                                                               ║
║${COLORS[SECONDARY]}              ⚡️ WHERE AI AGENTS MEET THEIR DESTINY ⚡️                  ${COLORS[PRIMARY]}║
║${COLORS[MUTED]}                      Ultimate Installation Experience                      ${COLORS[PRIMARY]}║
╚═══════════════════════════════════════════════════════════════════════════════╝${COLORS[RESET]}"
  
  echo
  typewriter "🎭 Welcome to the PoD Protocol installer! 🎭" 0.03
  echo
  log_icon "Preparing to install the ultimate AI agent communication protocol..." "INFO" "🚀"
  echo
}

check_dependencies() {
  log_icon "Scanning system for dependencies..." "INFO" "🔍"
  echo
  
  local missing_deps=()
  local warnings=()
  
  # Check for Node.js
  if ! command -v node &> /dev/null; then
    missing_deps+=("Node.js (https://nodejs.org)")
  else
    local node_version=$(node --version | cut -d'v' -f2)
    log_icon "Node.js v$node_version detected" "SUCCESS" "✅"
  fi
  
  # Check for Git
  if ! command -v git &> /dev/null; then
    missing_deps+=("Git")
  else
    local git_version=$(git --version | cut -d' ' -f3)
    log_icon "Git v$git_version detected" "SUCCESS" "✅"
  fi
  
  # Check for Rust/Cargo
  if ! command -v cargo &> /dev/null; then
    missing_deps+=("Rust/Cargo (https://rustup.rs)")
  else
    local rust_version=$(rustc --version | cut -d' ' -f2)
    log_icon "Rust v$rust_version detected" "SUCCESS" "✅"
  fi
  
  # Check for Bun (preferred)
  if ! command -v bun &> /dev/null; then
    warnings+=("Bun (recommended for optimal performance)")
  else
    local bun_version=$(bun --version)
    log_icon "Bun v$bun_version detected (optimal choice!) 🔥" "SUCCESS" "⚡️"
  fi
  
  if [ ${#missing_deps[@]} -ne 0 ]; then
    echo
    log_icon "❌ Missing critical dependencies:" "ERROR" "🚨"
    for dep in "${missing_deps[@]}"; do
      log "  • $dep" "ERROR"
    done
    echo
    log_icon "Please install missing dependencies and run this script again." "WARNING" "⚠️"
    exit 1
  fi
  
  if [ ${#warnings[@]} -ne 0 ]; then
    echo
    log_icon "Recommendations for optimal performance:" "WARNING" "💡"
    for warning in "${warnings[@]}"; do
      log "  • $warning" "WARNING"
    done
  fi
  
  echo
  log_icon "🎯 System check complete - Ready for installation!" "SUCCESS" "🛡️"
  echo
}

select_package_manager() {
  log_icon "Choose your package manager:" "PRIMARY" "⚙️"
  echo
  log "  ${COLORS[SUCCESS]}1)${COLORS[RESET]} ${COLORS[ACCENT]}Bun${COLORS[RESET]} ${COLORS[SUCCESS]}(⚡️ RECOMMENDED - Ultimate Performance)${COLORS[RESET]}"
  log "  ${COLORS[INFO]}2)${COLORS[RESET]} ${COLORS[ACCENT]}Yarn${COLORS[RESET]} ${COLORS[MUTED]}(Fast and Reliable)${COLORS[RESET]}"
  log "  ${COLORS[MUTED]}3)${COLORS[RESET]} ${COLORS[ACCENT]}NPM${COLORS[RESET]} ${COLORS[MUTED]}(Standard Option)${COLORS[RESET]}"
  echo
  
  while true; do
    read -p "$(log_icon "Enter your choice (1-3): " "ACCENT" "🎯")" pm_choice
    case $pm_choice in
      1)
        PACKAGE_MANAGER="bun"
        if ! command -v bun &> /dev/null; then
          log_icon "Installing Bun for maximum performance..." "INFO" "⚡️"
          curl -fsSL https://bun.sh/install | bash
          export PATH="$HOME/.bun/bin:$PATH"
        fi
        log_icon "🔥 Using Bun - Prepare for blazing speed!" "SUCCESS" "⚡️"
        break
        ;;
      2)
        PACKAGE_MANAGER="yarn"
        if ! command -v yarn &> /dev/null; then
          log_icon "Installing Yarn..." "INFO" "📦"
          npm install -g yarn
        fi
        log_icon "Using Yarn - Solid choice!" "SUCCESS" "✅"
        break
        ;;
      3)
        PACKAGE_MANAGER="npm"
        log_icon "Using NPM - Classic and reliable!" "SUCCESS" "✅"
        break
        ;;
      *)
        log_icon "Invalid choice. Please enter 1, 2, or 3." "ERROR" "❌"
        ;;
    esac
  done
  echo
}

select_installation_type() {
  log_icon "Select installation type:" "PRIMARY" "🎯"
  echo
  log "  ${COLORS[SUCCESS]}1)${COLORS[RESET]} ${COLORS[ACCENT]}Complete Setup${COLORS[RESET]} ${COLORS[SUCCESS]}(🚀 All components, ready for production)${COLORS[RESET]}"
  log "  ${COLORS[INFO]}2)${COLORS[RESET]} ${COLORS[ACCENT]}Developer Environment${COLORS[RESET]} ${COLORS[INFO]}(🔧 With dev tools and testing)${COLORS[RESET]}"
  log "  ${COLORS[WARNING]}3)${COLORS[RESET]} ${COLORS[ACCENT]}CLI Only${COLORS[RESET]} ${COLORS[MUTED]}(⚡️ Just the command line tools)${COLORS[RESET]}"
  log "  ${COLORS[MUTED]}4)${COLORS[RESET]} ${COLORS[ACCENT]}Custom Selection${COLORS[RESET]} ${COLORS[MUTED]}(🎛️ Choose specific components)${COLORS[RESET]}"
  echo
  
  while true; do
    read -p "$(log_icon "Enter your choice (1-4): " "ACCENT" "🎯")" install_choice
    case $install_choice in
      1) INSTALL_TYPE="complete"; break ;;
      2) INSTALL_TYPE="developer"; break ;;
      3) INSTALL_TYPE="cli-only"; break ;;
      4) INSTALL_TYPE="custom"; break ;;
      *) log_icon "Invalid choice. Please enter 1-4." "ERROR" "❌" ;;
    esac
  done
  
  log_icon "🎯 Selected: $INSTALL_TYPE installation" "SUCCESS" "✅"
  echo
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

confirm_build() {
  local sdk_name=$1
  local build_warning=$2
  
  log "" 0
  if [ -n "$build_warning" ]; then
    log "⚠️  $build_warning" 3
  fi
  
  while true; do
    read -p "Would you like to build the $sdk_name now? (y/n): " build_confirm
    case $build_confirm in
      [Yy]* ) return 0 ;;
      [Nn]* ) return 1 ;;
      * ) log "Please answer yes (y) or no (n)." 1 ;;
    esac
  done
}

select_builds_for_all() {
  log "" 0
  log "You selected all SDKs. Please choose which ones to build:" 4
  
  BUILD_TYPESCRIPT=false
  BUILD_JAVASCRIPT=false
  BUILD_PYTHON=false
  BUILD_CLI=false
  
  if confirm_build "TypeScript SDK" ""; then
    BUILD_TYPESCRIPT=true
  fi
  
  if confirm_build "JavaScript SDK" ""; then
    BUILD_JAVASCRIPT=true
  fi
  
  if confirm_build "Python SDK" "Note: This will create a Python virtual environment"; then
    BUILD_PYTHON=true
  fi
  
  if confirm_build "CLI Tool" ""; then
    BUILD_CLI=true
  fi
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

build_individual_sdk() {
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
      log "⚠️  Creating Python virtual environment..." 3
      $PACKAGE_MANAGER run build:python
      ;;
    "cli")
      $PACKAGE_MANAGER run build:cli
      ;;
  esac
  
  log "✅ $sdk_type SDK built successfully!" 2
}

build_sdk() {
  local sdk_choice=$1
  
  case $sdk_choice in
    "all")
      select_builds_for_all
      
      if [ "$BUILD_TYPESCRIPT" = true ]; then
        build_individual_sdk "typescript"
      fi
      
      if [ "$BUILD_JAVASCRIPT" = true ]; then
        build_individual_sdk "javascript"
      fi
      
      if [ "$BUILD_PYTHON" = true ]; then
        build_individual_sdk "python"
      fi
      
      if [ "$BUILD_CLI" = true ]; then
        build_individual_sdk "cli"
      fi
      
      if [ "$BUILD_TYPESCRIPT" = false ] && [ "$BUILD_JAVASCRIPT" = false ] && [ "$BUILD_PYTHON" = false ] && [ "$BUILD_CLI" = false ]; then
        log "No SDKs selected for building. Skipping build step." 3
      fi
      ;;
    "typescript")
      if confirm_build "TypeScript SDK" ""; then
        build_individual_sdk "typescript"
      else
        log "Skipping TypeScript SDK build." 3
      fi
      ;;
    "javascript")
      if confirm_build "JavaScript SDK" ""; then
        build_individual_sdk "javascript"
      else
        log "Skipping JavaScript SDK build." 3
      fi
      ;;
    "python")
      if confirm_build "Python SDK" "Note: This will create a Python virtual environment"; then
        build_individual_sdk "python"
      else
        log "Skipping Python SDK build." 3
      fi
      ;;
    "cli")
      if confirm_build "CLI Tool" ""; then
        build_individual_sdk "cli"
      else
        log "Skipping CLI Tool build." 3
      fi
      ;;
  esac
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
      log "Built SDKs:" 4
      
      if [ "$BUILD_TYPESCRIPT" = true ]; then
        log "  TypeScript SDK:" 2
        log "    import { PodComClient } from '@pod-protocol/sdk';" 0
        log "    const client = new PodComClient({ endpoint: 'https://api.devnet.solana.com' });" 0
        log "" 0
      fi
      
      if [ "$BUILD_JAVASCRIPT" = true ]; then
        log "  JavaScript SDK:" 2
        log "    import { PodComClient } from '@pod-protocol/sdk-js';" 0
        log "    const client = new PodComClient({ endpoint: 'https://api.devnet.solana.com' });" 0
        log "" 0
      fi
      
      if [ "$BUILD_PYTHON" = true ]; then
        log "  Python SDK:" 2
        log "    from pod_protocol import PodComClient" 0
        log "    client = PodComClient(endpoint='https://api.devnet.solana.com')" 0
        log "" 0
      fi
      
      if [ "$BUILD_CLI" = true ]; then
        log "  CLI Tool:" 2
        log "    pod --help" 0
        log "    pod agent register --help" 0
        log "" 0
      fi
      
      if [ "$BUILD_TYPESCRIPT" = false ] && [ "$BUILD_JAVASCRIPT" = false ] && [ "$BUILD_PYTHON" = false ] && [ "$BUILD_CLI" = false ]; then
        log "  No SDKs were built. You can build them later using the package.json scripts." 3
      fi
      ;;
  esac
  
  log "
📚 Documentation: https://github.com/your-org/pod-protocol/docs
🐛 Issues: https://github.com/your-org/pod-protocol/issues
💬 Community: https://discord.gg/your-discord
" 6
}

install_components() {
  case $INSTALL_TYPE in
    "complete")
      log_icon "🚀 Installing complete PoD Protocol suite..." "PRIMARY" "🌟"
      components=("typescript" "javascript" "python" "cli" "frontend")
      ;;
    "developer")
      log_icon "🔧 Setting up developer environment..." "INFO" "⚙️"
      components=("typescript" "cli" "testing")
      ;;
    "cli-only")
      log_icon "⚡️ Installing CLI tools only..." "WARNING" "🔧"
      components=("cli")
      ;;
    "custom")
      select_custom_components
      ;;
  esac
  
  local total=${#components[@]}
  local current=0
  
  for component in "${components[@]}"; do
    ((current++))
    log_icon "[$current/$total] Installing $component..." "INFO" "📦"
    install_component "$component"
    log_icon "✅ $component installation complete!" "SUCCESS" "🎉"
    echo
  done
}

install_component() {
  local component=$1
  
  case $component in
    "typescript")
      cd sdk && $PACKAGE_MANAGER install && $PACKAGE_MANAGER run build
      ;;
    "javascript")
      cd ../sdk-js && $PACKAGE_MANAGER install && $PACKAGE_MANAGER run build
      ;;
    "python")
      cd ../sdk-python && pip install -e .
      ;;
    "cli")
      cd ../cli && $PACKAGE_MANAGER install && $PACKAGE_MANAGER run build
      ;;
    "frontend")
      cd ../frontend && $PACKAGE_MANAGER install && $PACKAGE_MANAGER run build
      ;;
    "testing")
      $PACKAGE_MANAGER run test:setup
      ;;
  esac
  cd ..
}

show_success_message() {
  clear
  log "
${COLORS[SUCCESS]}╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║  🎉🎉🎉  PoD PROTOCOL INSTALLATION SUCCESSFUL!  🎉🎉🎉                      ║
║                                                                               ║
║  ${COLORS[ACCENT]}Your AI Agent Communication Protocol is ready to dominate! ⚡️${COLORS[SUCCESS]}          ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝${COLORS[RESET]}"
  
  echo
  log_icon "🚀 Quick Start Commands:" "PRIMARY" "⚡️"
  echo
  log "  ${COLORS[ACCENT]}pod --help${COLORS[RESET]}                    ${COLORS[MUTED]}# Show all available commands${COLORS[RESET]}"
  log "  ${COLORS[ACCENT]}pod config init${COLORS[RESET]}               ${COLORS[MUTED]}# Initialize configuration${COLORS[RESET]}"
  log "  ${COLORS[ACCENT]}pod agent register${COLORS[RESET]}            ${COLORS[MUTED]}# Register your first agent${COLORS[RESET]}"
  log "  ${COLORS[ACCENT]}pod message send${COLORS[RESET]}              ${COLORS[MUTED]}# Send messages between agents${COLORS[RESET]}"
  echo
  log_icon "📚 Documentation: https://github.com/Dexploarer/PoD-Protocol/tree/main/docs" "INFO" "📖"
  log_icon "🐛 Issues: https://github.com/Dexploarer/PoD-Protocol/issues" "INFO" "🔧"
  log_icon "💬 Community: Join our Discord for support and updates!" "INFO" "🌐"
  echo
  log_icon "🎭 Welcome to the future of AI agent communication! 🎭" "ACCENT" "👑"
  echo
}

main() {
  show_banner
  check_dependencies
  select_package_manager
  select_installation_type
  
  log_icon "🚀 Starting installation process..." "PRIMARY" "⚡️"
  sleep 1
  
  install_components
  show_success_message
  
  log_icon "🎯 Installation completed successfully!" "SUCCESS" "🏆"
}

# Run main installation
main "$@"