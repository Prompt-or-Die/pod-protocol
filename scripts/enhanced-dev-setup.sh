#!/bin/bash

# 🚀 PoD Protocol Development Environment Setup Script
# This script sets up a complete development environment for PoD Protocol

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Emojis for better UX
SUCCESS="✅"
ERROR="❌"
WARNING="⚠️"
INFO="ℹ️"
ROCKET="🚀"
GEAR="⚙️"
PACKAGE="📦"

print_header() {
    echo ""
    echo -e "${PURPLE}=================================${NC}"
    echo -e "${PURPLE}   PoD Protocol Dev Setup ${ROCKET}   ${NC}"
    echo -e "${PURPLE}=================================${NC}"
    echo ""
}

print_step() {
    echo -e "${BLUE}${GEAR} $1${NC}"
}

print_success() {
    echo -e "${GREEN}${SUCCESS} $1${NC}"
}

print_error() {
    echo -e "${RED}${ERROR} $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}${WARNING} $1${NC}"
}

print_info() {
    echo -e "${CYAN}${INFO} $1${NC}"
}

# Check if running on supported OS
check_os() {
    print_step "Checking operating system..."
    
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        OS="linux"
        print_success "Linux detected"
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        OS="macos"
        print_success "macOS detected"
    elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]]; then
        OS="windows"
        print_success "Windows (with Git Bash/WSL) detected"
    else
        print_error "Unsupported operating system: $OSTYPE"
        exit 1
    fi
}

# Check and install Node.js
setup_nodejs() {
    print_step "Setting up Node.js..."
    
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node --version)
        NODE_MAJOR=$(echo $NODE_VERSION | cut -d'.' -f1 | sed 's/v//')
        
        if [ "$NODE_MAJOR" -ge 18 ]; then
            print_success "Node.js $NODE_VERSION is already installed"
            return
        else
            print_warning "Node.js $NODE_VERSION is too old. Need version 18+"
        fi
    fi
    
    print_info "Installing Node.js 18 via nvm..."
    
    # Install nvm if not present
    if ! command -v nvm &> /dev/null; then
        curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
        export NVM_DIR="$HOME/.nvm"
        [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    fi
    
    # Install and use Node 18
    nvm install 18
    nvm use 18
    nvm alias default 18
    
    print_success "Node.js 18 installed successfully"
}

# Check and install Rust
setup_rust() {
    print_step "Setting up Rust..."
    
    if command -v rustc &> /dev/null; then
        RUST_VERSION=$(rustc --version)
        print_success "Rust is already installed: $RUST_VERSION"
    else
        print_info "Installing Rust..."
        curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
        source "$HOME/.cargo/env"
        print_success "Rust installed successfully"
    fi
    
    # Add required targets
    print_info "Adding required Rust targets..."
    rustup target add bpf-unknown-unknown
    print_success "Rust targets configured"
}

# Check and install Solana CLI
setup_solana() {
    print_step "Setting up Solana CLI..."
    
    if command -v solana &> /dev/null; then
        SOLANA_VERSION=$(solana --version)
        print_success "Solana CLI is already installed: $SOLANA_VERSION"
    else
        print_info "Installing Solana CLI..."
        sh -c "$(curl -sSfL https://release.solana.com/v1.18.0/install)"
        export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"
        print_success "Solana CLI installed successfully"
    fi
    
    # Configure for devnet
    print_info "Configuring Solana for devnet..."
    solana config set --url https://api.devnet.solana.com
    
    # Generate keypair if needed
    if [ ! -f "$HOME/.config/solana/id.json" ]; then
        solana-keygen new --no-bip39-passphrase
        print_success "New Solana keypair generated"
    fi
    
    # Airdrop some SOL for development
    print_info "Requesting SOL airdrop for development..."
    solana airdrop 2 || print_warning "Airdrop failed, you may need to request manually"
}

# Check and install Anchor
setup_anchor() {
    print_step "Setting up Anchor Framework..."
    
    if command -v anchor &> /dev/null; then
        ANCHOR_VERSION=$(anchor --version)
        print_success "Anchor is already installed: $ANCHOR_VERSION"
    else
        print_info "Installing Anchor..."
        npm install -g @coral-xyz/anchor-cli
        print_success "Anchor installed successfully"
    fi
}

# Install project dependencies
install_dependencies() {
    print_step "Installing project dependencies..."
    
    # Check if we're in the right directory
    if [ ! -f "package.json" ]; then
        print_error "package.json not found. Make sure you're in the PoD Protocol root directory."
        exit 1
    fi
    
    # Install Node.js dependencies
    print_info "Installing Node.js dependencies..."
    npm install
    
    # Install Python dependencies for Python SDK
    if [ -d "sdk-python" ]; then
        print_info "Setting up Python SDK..."
        cd sdk-python
        if command -v python3 &> /dev/null; then
            python3 -m venv venv
            source venv/bin/activate 2>/dev/null || source venv/Scripts/activate 2>/dev/null
            pip install -e .
            cd ..
        else
            print_warning "Python3 not found. Skipping Python SDK setup."
            cd ..
        fi
    fi
    
    print_success "Dependencies installed successfully"
}

# Build all packages
build_packages() {
    print_step "Building all packages..."
    
    # Build Rust programs
    print_info "Building Solana programs..."
    if [ -d "programs" ]; then
        npm run build:programs || {
            print_warning "Program build failed. This is normal if Anchor isn't fully configured."
        }
    fi
    
    # Build TypeScript packages
    print_info "Building TypeScript packages..."
    npm run build:all || npm run build
    
    print_success "Build completed"
}

# Setup development environment
setup_dev_environment() {
    print_step "Setting up development environment..."
    
    # Create .env file if it doesn't exist
    if [ ! -f ".env.local" ] && [ -f ".env.example" ]; then
        cp .env.example .env.local
        print_success "Environment file created from template"
    fi
    
    # Setup git hooks
    if [ -d ".git" ]; then
        print_info "Setting up git hooks..."
        npm run setup:git-hooks 2>/dev/null || {
            print_info "Git hooks setup not available, skipping..."
        }
    fi
    
    # Create development directories
    mkdir -p logs
    mkdir -p temp
    mkdir -p .vscode
    
    # Generate VS Code settings
    cat > .vscode/settings.json << 'EOF'
{
    "typescript.preferences.importModuleSpecifier": "relative",
    "editor.formatOnSave": true,
    "editor.defaultFormatter": "esbenp.prettier-vscode",
    "rust-analyzer.cargo.target": "bpf-unknown-unknown",
    "files.associations": {
        "*.rs": "rust"
    },
    "search.exclude": {
        "**/node_modules": true,
        "**/target": true,
        "**/.git": true
    }
}
EOF
    
    print_success "Development environment configured"
}

# Run verification tests
run_verification() {
    print_step "Running verification tests..."
    
    # Check if basic commands work
    print_info "Verifying installations..."
    
    # Node.js check
    if command -v node &> /dev/null; then
        print_success "Node.js: $(node --version)"
    else
        print_error "Node.js verification failed"
    fi
    
    # npm check
    if command -v npm &> /dev/null; then
        print_success "npm: $(npm --version)"
    else
        print_error "npm verification failed"
    fi
    
    # Rust check
    if command -v rustc &> /dev/null; then
        print_success "Rust: $(rustc --version | cut -d' ' -f2)"
    else
        print_warning "Rust verification failed"
    fi
    
    # Solana check
    if command -v solana &> /dev/null; then
        print_success "Solana: $(solana --version | cut -d' ' -f2)"
    else
        print_warning "Solana verification failed"
    fi
    
    # Anchor check
    if command -v anchor &> /dev/null; then
        print_success "Anchor: $(anchor --version | cut -d' ' -f3)"
    else
        print_warning "Anchor verification failed"
    fi
    
    # Run basic tests if available
    print_info "Running basic tests..."
    npm test 2>/dev/null || {
        print_info "Tests not available or failed, continuing..."
    }
    
    print_success "Verification completed"
}

# Create development shortcuts
create_shortcuts() {
    print_step "Creating development shortcuts..."
    
    # Create package.json scripts for development
    cat > scripts/dev-shortcuts.js << 'EOF'
#!/usr/bin/env node

const { execSync } = require('child_process');
const readline = require('readline');

const shortcuts = {
  '1': { name: 'Start Development Server', cmd: 'npm run dev' },
  '2': { name: 'Run Tests', cmd: 'npm test' },
  '3': { name: 'Build All Packages', cmd: 'npm run build:all' },
  '4': { name: 'Start Solana Validator', cmd: 'solana-test-validator' },
  '5': { name: 'Deploy Programs', cmd: 'npm run deploy:local' },
  '6': { name: 'Reset Environment', cmd: 'npm run reset:dev' },
  '7': { name: 'Check Status', cmd: 'npm run status' },
  '8': { name: 'Lint & Format', cmd: 'npm run lint:fix && npm run format' },
  '9': { name: 'Generate Documentation', cmd: 'npm run docs:generate' },
  '0': { name: 'Help', cmd: 'npm run help' }
};

console.log('\n🚀 PoD Protocol Development Shortcuts\n');
Object.entries(shortcuts).forEach(([key, {name}]) => {
  console.log(`${key}. ${name}`);
});
console.log('\nq. Quit\n');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question('Select option: ', (choice) => {
  if (choice === 'q') {
    console.log('Goodbye! 👋');
    process.exit(0);
  }
  
  const shortcut = shortcuts[choice];
  if (shortcut) {
    console.log(`\n▶️ Running: ${shortcut.name}\n`);
    try {
      execSync(shortcut.cmd, { stdio: 'inherit' });
    } catch (error) {
      console.error('❌ Command failed:', error.message);
    }
  } else {
    console.log('❌ Invalid option');
  }
  
  rl.close();
});
EOF
    
    chmod +x scripts/dev-shortcuts.js
    
    # Create alias in shell profile
    SHELL_PROFILE=""
    if [ -f "$HOME/.bashrc" ]; then
        SHELL_PROFILE="$HOME/.bashrc"
    elif [ -f "$HOME/.zshrc" ]; then
        SHELL_PROFILE="$HOME/.zshrc"
    fi
    
    if [ -n "$SHELL_PROFILE" ]; then
        echo "" >> "$SHELL_PROFILE"
        echo "# PoD Protocol Development Shortcuts" >> "$SHELL_PROFILE"
        echo "alias pod-dev='node $(pwd)/scripts/dev-shortcuts.js'" >> "$SHELL_PROFILE"
        print_success "Development shortcuts created. Use 'pod-dev' command."
    fi
}

# Main setup function
main() {
    print_header
    
    print_info "Starting PoD Protocol development environment setup..."
    print_info "This will install and configure all necessary tools."
    echo ""
    
    # Check if user wants to continue
    read -p "Continue with setup? (y/N): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_info "Setup cancelled by user."
        exit 0
    fi
    
    # Run setup steps
    check_os
    setup_nodejs
    setup_rust
    setup_solana
    setup_anchor
    install_dependencies
    build_packages
    setup_dev_environment
    create_shortcuts
    run_verification
    
    # Final success message
    echo ""
    echo -e "${GREEN}=================================${NC}"
    echo -e "${GREEN}   ${SUCCESS} Setup Complete! ${SUCCESS}     ${NC}"
    echo -e "${GREEN}=================================${NC}"
    echo ""
    print_success "PoD Protocol development environment is ready!"
    echo ""
    print_info "Next steps:"
    echo "  1. Restart your terminal or run: source ~/.bashrc"
    echo "  2. Run 'pod-dev' for development shortcuts"
    echo "  3. Run 'npm run dev' to start development server"
    echo "  4. Check out the documentation in docs/"
    echo ""
    print_info "Happy coding! 🚀"
}

# Check if script is being sourced or executed
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
