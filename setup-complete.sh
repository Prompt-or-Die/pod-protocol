#!/bin/bash

# PoD Protocol Complete Setup Script
# One-click installation and configuration

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Banner
echo -e "${CYAN}"
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║                PoD Protocol Complete Setup                     ║"
echo "║           One-Click Installation & Configuration                ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Check dependencies
echo -e "\n${BLUE}🔍 Checking existing installations...${NC}"

missing_deps=()

if ! command -v cargo &> /dev/null; then
    echo -e "${RED}❌ Rust/Cargo not found${NC}"
    missing_deps+=("Rust/Cargo")
else
    echo -e "${GREEN}✅ Rust/Cargo found: $(cargo --version)${NC}"
fi

if ! command -v solana &> /dev/null; then
    echo -e "${RED}❌ Solana CLI not found${NC}"
    missing_deps+=("Solana CLI")
else
    echo -e "${GREEN}✅ Solana CLI found: $(solana --version)${NC}"
fi

if ! command -v anchor &> /dev/null; then
    echo -e "${RED}❌ Anchor CLI not found${NC}"
    missing_deps+=("Anchor CLI")
else
    echo -e "${GREEN}✅ Anchor CLI found: $(anchor --version)${NC}"
fi

if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js not found${NC}"
    missing_deps+=("Node.js")
else
    echo -e "${GREEN}✅ Node.js found: $(node --version)${NC}"
fi

if ! command -v git &> /dev/null; then
    echo -e "${RED}❌ Git not found${NC}"
    missing_deps+=("Git")
else
    echo -e "${GREEN}✅ Git found: $(git --version)${NC}"
fi

if [ ${#missing_deps[@]} -eq 0 ]; then
    echo -e "\n${GREEN}🎉 All required dependencies are already installed!${NC}"
    echo "What would you like to do?"
    echo "1) 🔄 Rebuild project and CLI"
    echo "2) 🔧 Reinstall CLI only"
    echo "3) ⚙️  Run interactive SDK setup"
    echo "4) ❌ Exit"
    
    read -p "Enter your choice (1-4): " choice
    case $choice in
        1)
            echo -e "\n${BLUE}🔨 Building project...${NC}"
            npm run build
            echo -e "\n${BLUE}🔧 Installing CLI...${NC}"
            if [ -f "./install-cli.sh" ]; then
                chmod +x ./install-cli.sh
                ./install-cli.sh
            fi
            echo -e "\n${GREEN}✅ Rebuild completed!${NC}"
            ;;
        2)
            if [ -f "./install-cli.sh" ]; then
                chmod +x ./install-cli.sh
                ./install-cli.sh
            fi
            ;;
        3)
            if [ -f "./install.sh" ]; then
                chmod +x ./install.sh
                ./install.sh
            fi
            ;;
        4)
            echo -e "${CYAN}👋 Goodbye!${NC}"
            exit 0
            ;;
        *)
            echo -e "${RED}Invalid choice${NC}"
            exit 1
            ;;
    esac
else
    echo -e "\n${YELLOW}📋 Missing dependencies: ${missing_deps[*]}${NC}"
    echo -e "\n${BLUE}🛠️  Installation Options:${NC}"
    echo "1) 🚀 Quick Setup (Install everything automatically)"
    echo "2) 🔧 Custom Setup (Choose what to install)"
    echo "3) 📖 Manual Setup (Show instructions only)"
    echo "4) ❌ Exit"
    
    read -p "Enter your choice (1-4): " choice
    case $choice in
        1)
            echo -e "\n${GREEN}🚀 Starting Quick Setup...${NC}"
            read -p "This will install all dependencies and build the project. Continue? (y/n): " confirm
            if [[ $confirm =~ ^[Yy]$ ]]; then
                echo -e "\n${BLUE}📦 Installing dependencies...${NC}"
                if [ -f "./install-dependencies.sh" ]; then
                    chmod +x ./install-dependencies.sh
                    ./install-dependencies.sh
                fi
                
                echo -e "\n${BLUE}🔄 Updating environment...${NC}"
                source "$HOME/.bashrc" 2>/dev/null || true
                
                echo -e "\n${BLUE}🔨 Building project...${NC}"
                npm run build
                
                echo -e "\n${BLUE}🔧 Installing CLI tool...${NC}"
                if [ -f "./install-cli.sh" ]; then
                    chmod +x ./install-cli.sh
                    ./install-cli.sh
                fi
                
                echo -e "\n${GREEN}🎉 Quick setup completed!${NC}"
                echo -e "${BLUE}✅ All SDKs have been built and are ready to use!${NC}"
                echo -e "${BLUE}📚 Check the sdk/, sdk-js/, and sdk-python/ directories for your SDKs.${NC}"
                echo -e "${BLUE}💡 To customize SDK installation, run: ./install.sh${NC}"
            else
                echo -e "${YELLOW}Setup cancelled.${NC}"
            fi
            ;;
        2)
            echo -e "\n${GREEN}🔧 Custom Setup${NC}"
            
            echo -e "\nInstall missing dependencies? (y/n)"
            read install_deps
            if [[ $install_deps =~ ^[Yy]$ ]]; then
                if [ -f "./install-dependencies.sh" ]; then
                    chmod +x ./install-dependencies.sh
                    ./install-dependencies.sh
                fi
            fi
            
            echo -e "\nBuild the project? (y/n)"
            read build_project
            if [[ $build_project =~ ^[Yy]$ ]]; then
                npm run build
            fi
            
            echo -e "\nInstall the CLI tool? (y/n)"
            read install_cli
            if [[ $install_cli =~ ^[Yy]$ ]]; then
                if [ -f "./install-cli.sh" ]; then
                    chmod +x ./install-cli.sh
                    ./install-cli.sh
                fi
            fi
            
            echo -e "\nRun interactive SDK setup? (y/n)"
            read setup_sdk
            if [[ $setup_sdk =~ ^[Yy]$ ]]; then
                if [ -f "./install.sh" ]; then
                    chmod +x ./install.sh
                    ./install.sh
                fi
            fi
            
            echo -e "\n${GREEN}✅ Custom setup completed!${NC}"
            ;;
        3)
            echo -e "\n${GREEN}📖 Manual Setup Instructions${NC}"
            echo -e "\n${BLUE}To set up PoD Protocol manually:${NC}"
            echo -e "\n${YELLOW}1. Install Dependencies:${NC}"
            echo "   ./install-dependencies.sh"
            echo -e "\n${YELLOW}2. Update Environment:${NC}"
            echo "   source ~/.bashrc"
            echo -e "\n${YELLOW}3. Build Project:${NC}"
            echo "   npm run build"
            echo -e "\n${YELLOW}4. Install CLI:${NC}"
            echo "   ./install-cli.sh"
            echo -e "\n${YELLOW}5. Interactive Setup:${NC}"
            echo "   ./install.sh"
            ;;
        4)
            echo -e "${CYAN}👋 Goodbye!${NC}"
            exit 0
            ;;
        *)
            echo -e "${RED}Invalid choice. Please enter 1-4.${NC}"
            exit 1
            ;;
    esac
fi

# Show final status
echo -e "\n${GREEN}🎉 Setup Complete!${NC}"
echo -e "\n${BLUE}📋 Status:${NC}"

if command -v pod &> /dev/null; then
    echo -e "${GREEN}✅ CLI Tool: Available (try: pod --help)${NC}"
else
    echo -e "${RED}❌ CLI Tool: Not installed${NC}"
fi

if [ -d "./cli/dist" ]; then
    echo -e "${GREEN}✅ Project: Built successfully${NC}"
else
    echo -e "${RED}❌ Project: Not built${NC}"
fi

echo -e "\n${BLUE}🚀 Next Steps:${NC}"
echo "   - Try: pod status"
echo "   - Read: README.md"
echo "   - Explore: docs/"