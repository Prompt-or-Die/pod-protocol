#!/bin/bash

# PoD Protocol - Comprehensive Package Publishing Script
# This script publishes all packages in the PoD Protocol workspace

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

echo -e "${BOLD}${CYAN}🚀 PoD Protocol - Publishing All Packages${NC}"
echo -e "${BOLD}${CYAN}==========================================${NC}"

# Function to log messages
log() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to run command with error handling
run_command() {
    local cmd="$1"
    local dir="${2:-$ROOT_DIR}"
    
    log "$CYAN" "📦 Executing: $cmd"
    if ! (cd "$dir" && eval "$cmd"); then
        log "$RED" "❌ Command failed: $cmd"
        return 1
    fi
    return 0
}

# Check prerequisites
log "$BLUE" "🔍 Checking prerequisites..."

if ! command_exists node; then
    log "$RED" "❌ Node.js is required but not installed"
    exit 1
fi

if ! command_exists npm; then
    log "$RED" "❌ npm is required but not installed"
    exit 1
fi

log "$GREEN" "✅ Prerequisites check passed"

# Check if we're in a git repository and have clean working directory
if [ -d "$ROOT_DIR/.git" ]; then
    cd "$ROOT_DIR"
    if ! git diff-index --quiet HEAD --; then
        log "$YELLOW" "⚠️  Warning: Working directory has uncommitted changes"
        read -p "Do you want to continue? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log "$YELLOW" "Publishing cancelled"
            exit 0
        fi
    fi
fi

# Run the Node.js publishing script
log "$BLUE" "🚀 Running comprehensive publishing script..."

if run_command "node scripts/publish-all.js" "$ROOT_DIR"; then
    log "$GREEN" "✅ All packages published successfully!"
else
    log "$RED" "❌ Publishing failed. Check the logs above for details."
    exit 1
fi

log "$BOLD$GREEN" "🎉 Publishing completed!"
log "$CYAN" "📦 All PoD Protocol packages have been published to their respective registries."