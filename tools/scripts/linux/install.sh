#!/bin/bash
set -euo pipefail

# PoD Protocol Linux Installation Script
# Supports: Ubuntu/Debian, Fedora/RHEL, Arch Linux, and more
# Usage: ./install.sh [--use-node] [--skip-build] [--verbose]

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Default options
USE_NODE=false
SKIP_BUILD=false

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

# Detect Linux distribution
detect_distro() {
    if [[ -f /etc/os-release ]]; then
        . /etc/os-release
        DISTRO=$ID
        VERSION=$VERSION_ID
    else
        DISTRO="unknown"
        VERSION="unknown"
    fi
}

log_info "🚀 PoD Protocol Linux Installer"
log_info "==============================="

# Detect distribution
detect_distro
log_success "Detected: $DISTRO $VERSION"

# Install system dependencies based on distribution
case $DISTRO in
    ubuntu|debian)
        log_info "📦 Installing Ubuntu/Debian dependencies..."
        sudo apt update
        sudo apt install -y curl git build-essential
        ;;
    fedora|rhel|centos)
        log_info "📦 Installing Fedora/RHEL dependencies..."
        sudo dnf install -y curl git gcc gcc-c++ make
        ;;
    arch|manjaro)
        log_info "📦 Installing Arch Linux dependencies..."
        sudo pacman -Sy --noconfirm curl git base-devel
        ;;
    *)
        log_warning "Unknown distribution. Please install curl, git, and build tools manually."
        ;;
esac

# Install package manager
if [[ $USE_NODE == true ]]; then
    log_info "📦 Installing Node.js..."
    if ! command_exists node; then
        case $DISTRO in
            ubuntu|debian)
                sudo apt install -y nodejs npm
                ;;
            fedora|rhel|centos)
                sudo dnf install -y nodejs npm
                ;;
            arch|manjaro)
                sudo pacman -S --noconfirm nodejs npm
                ;;
        esac
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

# Linux-specific recommendations
log_info ""
log_info "📝 Linux-specific recommendations:"
log_info "   • Restart your shell to apply limit changes"
log_info "   • Use 'systemctl --user' for user services"
log_info "   • Consider using tmux or screen for persistent sessions"
log_info "   • Docker recommended for production deployments"

case $DISTRO in
    ubuntu|debian)
        log_info "   • Use 'sudo systemctl' for system services"
        ;;
    fedora|rhel|centos)
        log_info "   • SELinux may require additional configuration"
        ;;
    arch|manjaro)
        log_info "   • AUR packages available for additional tools"
        ;;
esac 