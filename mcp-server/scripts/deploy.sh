#!/bin/bash

# PoD Protocol MCP Server Deployment Script
# Production-ready deployment with security and monitoring

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Default values
ENVIRONMENT="production"
NODE_VERSION="18"
INSTALL_DIR="/opt/pod-mcp-server"
SERVICE_USER="pod-mcp"
LOG_DIR="/var/log/pod-mcp-server"

echo -e "${PURPLE}🔥 PoD Protocol MCP Server Deployment${NC}"
echo -e "${CYAN}⚡ Bridging AI Agents with Blockchain Communication${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    -e|--environment)
      ENVIRONMENT="$2"
      shift 2
      ;;
    -d|--directory)
      INSTALL_DIR="$2"
      shift 2
      ;;
    -u|--user)
      SERVICE_USER="$2"
      shift 2
      ;;
    -h|--help)
      echo "Usage: $0 [OPTIONS]"
      echo ""
      echo "Options:"
      echo "  -e, --environment   Deployment environment (development|staging|production)"
      echo "  -d, --directory     Installation directory (default: /opt/pod-mcp-server)"
      echo "  -u, --user          Service user (default: pod-mcp)"
      echo "  -h, --help          Show this help message"
      exit 0
      ;;
    *)
      echo "Unknown option $1"
      exit 1
      ;;
  esac
done

echo -e "${BLUE}📋 Deployment Configuration:${NC}"
echo "  Environment: $ENVIRONMENT"
echo "  Install Directory: $INSTALL_DIR"
echo "  Service User: $SERVICE_USER"
echo "  Log Directory: $LOG_DIR"
echo ""

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   echo -e "${RED}❌ This script must be run as root${NC}" 
   exit 1
fi

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to install Node.js
install_nodejs() {
    echo -e "${YELLOW}📦 Installing Node.js $NODE_VERSION...${NC}"
    
    if command_exists node; then
        current_version=$(node --version | sed 's/v//')
        if [[ $(echo "$current_version >= $NODE_VERSION" | bc -l) -eq 1 ]]; then
            echo -e "${GREEN}✅ Node.js $current_version already installed${NC}"
            return
        fi
    fi
    
    # Install NodeSource repository
    curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash -
    apt-get install -y nodejs
    
    echo -e "${GREEN}✅ Node.js installed: $(node --version)${NC}"
}

# Function to create service user
create_service_user() {
    echo -e "${YELLOW}👤 Creating service user...${NC}"
    
    if id "$SERVICE_USER" &>/dev/null; then
        echo -e "${GREEN}✅ User $SERVICE_USER already exists${NC}"
    else
        useradd --system --shell /bin/false --home-dir $INSTALL_DIR --create-home $SERVICE_USER
        echo -e "${GREEN}✅ Created user: $SERVICE_USER${NC}"
    fi
}

# Function to setup directories
setup_directories() {
    echo -e "${YELLOW}📁 Setting up directories...${NC}"
    
    # Create installation directory
    mkdir -p $INSTALL_DIR
    chown $SERVICE_USER:$SERVICE_USER $INSTALL_DIR
    
    # Create log directory
    mkdir -p $LOG_DIR
    chown $SERVICE_USER:$SERVICE_USER $LOG_DIR
    
    # Create config directory
    mkdir -p /etc/pod-mcp-server
    
    echo -e "${GREEN}✅ Directories created${NC}"
}

# Function to install application
install_application() {
    echo -e "${YELLOW}🚀 Installing PoD Protocol MCP Server...${NC}"
    
    cd $INSTALL_DIR
    
    # Install globally first
    npm install -g @pod-protocol/mcp-server
    
    # Create local package.json for service management
    cat > package.json <<EOF
{
  "name": "pod-mcp-server-service",
  "version": "1.0.0",
  "description": "PoD Protocol MCP Server Service",
  "scripts": {
    "start": "pod-mcp-server",
    "stop": "pkill -f pod-mcp-server"
  },
  "dependencies": {
    "@pod-protocol/mcp-server": "latest"
  }
}
EOF
    
    # Install dependencies locally too
    npm install
    
    chown -R $SERVICE_USER:$SERVICE_USER $INSTALL_DIR
    
    echo -e "${GREEN}✅ Application installed${NC}"
}

# Function to create configuration
create_configuration() {
    echo -e "${YELLOW}⚙️  Creating configuration...${NC}"
    
    # Create main configuration
    cat > /etc/pod-mcp-server/config.json <<EOF
{
  "pod_protocol": {
    "rpc_endpoint": "${POD_RPC_ENDPOINT:-https://api.mainnet-beta.solana.com}",
    "program_id": "${POD_PROGRAM_ID:-HEpGLgYsE1kP8aoYKyLFc3JVVrofS7T4zEA6fWBJsZps}",
    "commitment": "confirmed"
  },
  "agent_runtime": {
    "runtime": "${AGENT_RUNTIME:-custom}",
    "agent_id": "${AGENT_ID:-production-mcp-server}",
    "wallet_path": "${WALLET_PATH:-/etc/pod-mcp-server/wallet.json}",
    "auto_respond": false,
    "response_delay_ms": 1000
  },
  "features": {
    "auto_message_processing": true,
    "real_time_notifications": true,
    "cross_runtime_discovery": true,
    "analytics_tracking": true
  },
  "security": {
    "rate_limit_per_minute": 30,
    "max_message_size": 10000,
    "allowed_origins": ["*"],
    "require_signature_verification": true
  },
  "logging": {
    "level": "${LOG_LEVEL:-info}",
    "file_path": "$LOG_DIR/pod-mcp-server.log",
    "console_output": false
  }
}
EOF
    
    # Create environment file
    cat > /etc/pod-mcp-server/environment <<EOF
# PoD Protocol MCP Server Environment Configuration
NODE_ENV=$ENVIRONMENT
CONFIG_PATH=/etc/pod-mcp-server/config.json

# Override these values as needed
POD_RPC_ENDPOINT=${POD_RPC_ENDPOINT:-https://api.mainnet-beta.solana.com}
POD_PROGRAM_ID=${POD_PROGRAM_ID:-HEpGLgYsE1kP8aoYKyLFc3JVVrofS7T4zEA6fWBJsZps}
AGENT_RUNTIME=${AGENT_RUNTIME:-custom}
AGENT_ID=${AGENT_ID:-production-mcp-server}
LOG_LEVEL=${LOG_LEVEL:-info}
EOF
    
    # Set permissions
    chown -R $SERVICE_USER:$SERVICE_USER /etc/pod-mcp-server
    chmod 600 /etc/pod-mcp-server/config.json
    chmod 600 /etc/pod-mcp-server/environment
    
    echo -e "${GREEN}✅ Configuration created${NC}"
}

# Function to create systemd service
create_systemd_service() {
    echo -e "${YELLOW}🔧 Creating systemd service...${NC}"
    
    cat > /etc/systemd/system/pod-mcp-server.service <<EOF
[Unit]
Description=PoD Protocol MCP Server
Documentation=https://docs.pod-protocol.com
After=network.target

[Service]
Type=simple
User=$SERVICE_USER
Group=$SERVICE_USER
WorkingDirectory=$INSTALL_DIR
Environment=NODE_ENV=$ENVIRONMENT
EnvironmentFile=/etc/pod-mcp-server/environment
ExecStart=/usr/bin/node /usr/local/bin/pod-mcp-server
ExecReload=/bin/kill -HUP \$MAINPID
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=pod-mcp-server

# Security settings
NoNewPrivileges=yes
PrivateTmp=yes
ProtectSystem=strict
ProtectHome=yes
ReadWritePaths=$LOG_DIR /etc/pod-mcp-server
CapabilityBoundingSet=CAP_NET_BIND_SERVICE

[Install]
WantedBy=multi-user.target
EOF
    
    # Reload systemd and enable service
    systemctl daemon-reload
    systemctl enable pod-mcp-server
    
    echo -e "${GREEN}✅ Systemd service created${NC}"
}

# Function to setup log rotation
setup_log_rotation() {
    echo -e "${YELLOW}🔄 Setting up log rotation...${NC}"
    
    cat > /etc/logrotate.d/pod-mcp-server <<EOF
$LOG_DIR/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    copytruncate
    su $SERVICE_USER $SERVICE_USER
}
EOF
    
    echo -e "${GREEN}✅ Log rotation configured${NC}"
}

# Function to setup monitoring
setup_monitoring() {
    echo -e "${YELLOW}📊 Setting up monitoring...${NC}"
    
    # Create simple health check script
    cat > $INSTALL_DIR/health-check.sh <<EOF
#!/bin/bash
# Simple health check for PoD Protocol MCP Server

LOGFILE="$LOG_DIR/health-check.log"
TIMESTAMP=\$(date '+%Y-%m-%d %H:%M:%S')

# Check if service is running
if systemctl is-active --quiet pod-mcp-server; then
    echo "[\$TIMESTAMP] ✅ Service is running" >> \$LOGFILE
    
    # Check if process is responding (basic check)
    if pgrep -f "pod-mcp-server" > /dev/null; then
        echo "[\$TIMESTAMP] ✅ Process responding" >> \$LOGFILE
        exit 0
    else
        echo "[\$TIMESTAMP] ❌ Process not responding" >> \$LOGFILE
        exit 1
    fi
else
    echo "[\$TIMESTAMP] ❌ Service not running" >> \$LOGFILE
    exit 1
fi
EOF
    
    chmod +x $INSTALL_DIR/health-check.sh
    chown $SERVICE_USER:$SERVICE_USER $INSTALL_DIR/health-check.sh
    
    # Add to crontab for service user
    (crontab -u $SERVICE_USER -l 2>/dev/null; echo "*/5 * * * * $INSTALL_DIR/health-check.sh") | crontab -u $SERVICE_USER -
    
    echo -e "${GREEN}✅ Monitoring configured${NC}"
}

# Function to setup firewall
setup_firewall() {
    echo -e "${YELLOW}🔒 Configuring firewall...${NC}"
    
    if command_exists ufw; then
        # Allow SSH (if not already allowed)
        ufw allow ssh
        
        # Allow specific ports if needed (MCP typically uses stdio, but for HTTP/WebSocket)
        # ufw allow 3000/tcp
        
        # Enable firewall if not already enabled
        if ! ufw status | grep -q "active"; then
            echo "y" | ufw enable
        fi
        
        echo -e "${GREEN}✅ Firewall configured${NC}"
    else
        echo -e "${YELLOW}⚠️  UFW not installed, skipping firewall setup${NC}"
    fi
}

# Function to validate installation
validate_installation() {
    echo -e "${YELLOW}🧪 Validating installation...${NC}"
    
    # Check if service can start
    if systemctl start pod-mcp-server; then
        echo -e "${GREEN}✅ Service started successfully${NC}"
        
        # Wait a moment and check if still running
        sleep 5
        if systemctl is-active --quiet pod-mcp-server; then
            echo -e "${GREEN}✅ Service is stable${NC}"
        else
            echo -e "${RED}❌ Service failed to stay running${NC}"
            systemctl status pod-mcp-server
            return 1
        fi
    else
        echo -e "${RED}❌ Service failed to start${NC}"
        systemctl status pod-mcp-server
        return 1
    fi
    
    # Test health check
    if $INSTALL_DIR/health-check.sh; then
        echo -e "${GREEN}✅ Health check passed${NC}"
    else
        echo -e "${YELLOW}⚠️  Health check failed (may be normal during initial startup)${NC}"
    fi
}

# Main deployment process
main() {
    echo -e "${BLUE}🚀 Starting deployment process...${NC}"
    echo ""
    
    # Update system packages
    echo -e "${YELLOW}📦 Updating system packages...${NC}"
    apt-get update
    apt-get install -y curl wget gnupg2 software-properties-common bc
    
    # Install dependencies
    install_nodejs
    
    # Setup user and directories
    create_service_user
    setup_directories
    
    # Install application
    install_application
    
    # Configure application
    create_configuration
    create_systemd_service
    setup_log_rotation
    setup_monitoring
    setup_firewall
    
    # Validate installation
    validate_installation
    
    echo ""
    echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
    echo ""
    echo -e "${BLUE}📋 Next steps:${NC}"
    echo "1. Review configuration: /etc/pod-mcp-server/config.json"
    echo "2. Add wallet file: /etc/pod-mcp-server/wallet.json (if needed)"
    echo "3. Check service status: systemctl status pod-mcp-server"
    echo "4. View logs: journalctl -u pod-mcp-server -f"
    echo "5. Test health check: $INSTALL_DIR/health-check.sh"
    echo ""
    echo -e "${PURPLE}🔥 PoD Protocol MCP Server is now running! 🔥${NC}"
    echo -e "${CYAN}⚡ Ready to bridge AI agents with blockchain communication ⚡${NC}"
}

# Run main function
main "$@" 