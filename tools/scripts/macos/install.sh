#!/bin/bash
set -euo pipefail

# PoD Protocol macOS Installation Script
# Usage: ./install.sh [--use-node] [--skip-build] [--verbose]

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Default options
USE_NODE=false
SKIP_BUILD=false
VERBOSE=false

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --use-node)
      USE_NODE=true
      shift
      ;;
    --skip-build)
      SKIP_BUILD=true
      shift
      ;;
    --verbose)
      VERBOSE=true
      shift
      ;;
    *)
      echo "Unknown option $1"
      exit 1
      ;;
  esac
done

# Utility functions
log_info() {
    echo -e "${CYAN}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

command_exists() {
    command -v "$1" >/dev/null 2>&1
}

log_info "🚀 PoD Protocol macOS Installer"
log_info "================================"

# Check macOS version
MACOS_VERSION=$(sw_vers -productVersion)
MACOS_MAJOR=$(echo $MACOS_VERSION | cut -d. -f1)
MACOS_MINOR=$(echo $MACOS_VERSION | cut -d. -f2)

if [[ $MACOS_MAJOR -lt 11 ]]; then
    log_error "macOS 11.0 (Big Sur) or later required. Current: $MACOS_VERSION"
    exit 1
fi

log_success "macOS $MACOS_VERSION detected"

# Detect processor architecture
ARCH=$(uname -m)
if [[ $ARCH == "arm64" ]]; then
    log_success "Apple Silicon (M1/M2) detected"
else
    log_success "Intel processor detected"
fi

# Check for Xcode Command Line Tools
if ! xcode-select -p &> /dev/null; then
    log_warning "Xcode Command Line Tools not found. Installing..."
    xcode-select --install
    log_info "Please complete the Xcode Command Line Tools installation and run this script again"
    exit 1
fi

log_success "Xcode Command Line Tools available"

# Check for Homebrew
if ! command_exists brew; then
    log_warning "Homebrew not found. Installing..."
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    
    # Add Homebrew to PATH for Apple Silicon
    if [[ $ARCH == "arm64" ]]; then
        echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile
        eval "$(/opt/homebrew/bin/brew shellenv)"
    fi
fi

log_success "Homebrew available"

# Install package manager
if [[ $USE_NODE == true ]]; then
    log_info "📦 Installing Node.js..."
    if ! command_exists node; then
        brew install node
    fi
    PACKAGE_MANAGER="npm"
else
    log_info "📦 Installing Bun..."
    if ! command_exists bun; then
        curl -fsSL https://bun.sh/install | bash
        export PATH="$HOME/.bun/bin:$PATH"
    fi
    PACKAGE_MANAGER="bun"
fi

log_success "$PACKAGE_MANAGER available"

# Install additional dependencies for Apple Silicon
if [[ $ARCH == "arm64" ]]; then
    log_info "🔧 Installing Apple Silicon optimizations..."
    # Add any M1/M2 specific dependencies here
fi

# Install project dependencies
log_info "📥 Installing project dependencies..."
if [[ $PACKAGE_MANAGER == "bun" ]]; then
    bun install
else
    npm install
fi

# Build project
if [[ $SKIP_BUILD == false ]]; then
    log_info "🔨 Building project..."
    if [[ $PACKAGE_MANAGER == "bun" ]]; then
        bun run build
    else
        npm run build
    fi
fi

log_success "Installation completed successfully!"
log_info "🎉 Run 'bun dev' or 'npm run dev' to start development"

# macOS-specific recommendations
log_info ""
log_info "📝 macOS-specific recommendations:"
log_info "   • Terminal.app or iTerm2 recommended"
log_info "   • Consider using oh-my-zsh for enhanced shell experience"
if [[ $ARCH == "arm64" ]]; then
    log_info "   • Native ARM64 performance optimized"
    log_info "   • Rosetta 2 available for compatibility if needed"
fi
log_info "   • Use 'brew services' to manage background services" 