#!/bin/bash

# PoD Protocol CLI Ultimate Installer
# Prompt or Die: Where AI Agents Meet Their Destiny ⚡️

set -e

# PoD Protocol Brand Colors
declare -A COLORS=(
  [RESET]="\033[0m"
  [PRIMARY]="\033[35m"      # Magenta
  [SECONDARY]="\033[36m"    # Cyan  
  [ACCENT]="\033[97m"       # Bright White
  [SUCCESS]="\033[32m"      # Green
  [WARNING]="\033[33m"      # Yellow
  [ERROR]="\033[31m"        # Red
  [INFO]="\033[34m"         # Blue
  [MUTED]="\033[90m"        # Gray
)

log_icon() {
  local message="$1"
  local color="${2:-RESET}"
  local icon="${3:-⚡️}"
  echo -e "${COLORS[$color]}$icon $message${COLORS[RESET]}"
}

show_cli_banner() {
  clear
  echo -e "${COLORS[PRIMARY]}
╔═══════════════════════════════════════════════════════════════╗
║  ██████╗  ██████╗ ██████╗      ██████╗██╗     ██╗            ║
║  ██╔══██╗██╔═══██╗██╔══██╗    ██╔════╝██║     ██║            ║
║  ██████╔╝██║   ██║██║  ██║    ██║     ██║     ██║            ║
║  ██╔═══╝ ██║   ██║██║  ██║    ██║     ██║     ██║            ║
║  ██║     ╚██████╔╝██████╔╝    ╚██████╗███████╗██║            ║
║  ╚═╝      ╚═════╝ ╚═════╝      ╚═════╝╚══════╝╚═╝            ║
║                                                               ║
║${COLORS[SECONDARY]}              ⚡️ Command Line Interface ⚡️                 ${COLORS[PRIMARY]}║
║${COLORS[MUTED]}                Where prompts become reality                   ${COLORS[PRIMARY]}║
╚═══════════════════════════════════════════════════════════════╝${COLORS[RESET]}"
  echo
}

main() {
  show_cli_banner
  
  log_icon "🔧 Installing PoD Protocol CLI to your system..." "INFO" "🚀"
  echo

  # Create local bin directory if it doesn't exist
  log_icon "📁 Setting up local bin directory..." "INFO" "📦"
  mkdir -p ~/.local/bin

  # Get the absolute project path
  PROJECT_PATH="$(pwd)"
  log_icon "📍 Project location: $PROJECT_PATH" "SUCCESS" "✅"

  # Create a wrapper script for the CLI
  log_icon "🔗 Creating CLI wrapper script..." "INFO" "⚙️"
  cat > ~/.local/bin/pod << EOF
#!/bin/bash
cd "$PROJECT_PATH" && node cli/dist/index.js "\$@"
EOF

  # Make it executable
  chmod +x ~/.local/bin/pod
  log_icon "🔒 Setting executable permissions..." "SUCCESS" "✅"

  # Add ~/.local/bin to PATH if not already there
  if ! echo "$PATH" | grep -q "$HOME/.local/bin"; then
      log_icon "📝 Adding ~/.local/bin to PATH..." "WARNING" "🔧"
      echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc
      log_icon "💡 Run 'source ~/.bashrc' or restart your terminal to apply changes" "INFO" "💭"
  else
      log_icon "✅ PATH already configured correctly!" "SUCCESS" "🎯"
  fi

  echo
  log_icon "🎉 PoD Protocol CLI installed successfully!" "SUCCESS" "🏆"
  echo
  log_icon "🚀 Quick Start Commands:" "PRIMARY" "⚡️"
  echo -e "  ${COLORS[ACCENT]}pod --help${COLORS[RESET]}                    ${COLORS[MUTED]}# Show all available commands${COLORS[RESET]}"
  echo -e "  ${COLORS[ACCENT]}pod config init${COLORS[RESET]}               ${COLORS[MUTED]}# Initialize configuration${COLORS[RESET]}"
  echo -e "  ${COLORS[ACCENT]}pod agent register${COLORS[RESET]}            ${COLORS[MUTED]}# Register your first agent${COLORS[RESET]}"
  echo -e "  ${COLORS[ACCENT]}pod message send${COLORS[RESET]}              ${COLORS[MUTED]}# Send encrypted messages${COLORS[RESET]}"
  echo
  log_icon "📍 CLI location: ~/.local/bin/pod" "INFO" "📂"

  # Test if it works
  if command -v pod >/dev/null 2>&1; then
      log_icon "🎯 CLI is ready to use immediately!" "SUCCESS" "⚡️"
  else
      log_icon "⚠️  Please run 'source ~/.bashrc' to update your PATH" "WARNING" "🔄"
  fi
  
  echo
  log_icon "🎭 Welcome to the future of AI agent communication! 🎭" "ACCENT" "👑"
}

# Run main installation
main "$@"