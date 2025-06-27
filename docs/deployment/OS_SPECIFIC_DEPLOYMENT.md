# 🌍 OS-Specific Deployment Guide

> **Complete deployment instructions for Windows, macOS, and Linux environments**

---

## 📋 Overview

This guide provides detailed, OS-specific deployment instructions for PoD Protocol across different operating systems and environments.

---

## 🪟 **Windows Deployment**

### **System Requirements**
- Windows 10 Build 1903+ or Windows 11
- PowerShell 5.1+ or PowerShell Core 7+
- Git for Windows
- 8GB RAM minimum, 16GB recommended
- 20GB free disk space

### **Prerequisites Installation**

**Option 1: Using winget (Recommended)**
```powershell
# Install Git
winget install Git.Git

# Install Bun (recommended)
powershell -c "irm bun.sh/install.ps1 | iex"

# Alternative: Install Node.js
winget install OpenJS.NodeJS
```

**Option 2: Manual Installation**
1. Download Git from https://git-scm.com/download/win
2. Download Bun from https://bun.sh/
3. Download Node.js from https://nodejs.org/ (if not using Bun)

### **Automated Installation**
```powershell
# Clone repository
git clone https://github.com/PoD-Protocol/pod-protocol.git
cd pod-protocol

# Run Windows installer
.\tools\scripts\windows\install.ps1

# For Node.js instead of Bun
.\tools\scripts\windows\install.ps1 -UseNodeJS
```

### **Manual Installation**
```powershell
# Install dependencies
bun install

# Build project
bun run build

# Start development server
bun dev

# Production build
bun run build --production
```

### **Windows-Specific Configuration**

**Environment Variables**
```powershell
# Set NODE_ENV for production
$env:NODE_ENV="production"

# Set custom port
$env:PORT="3000"

# For Windows Subsystem for Linux (WSL2)
$env:BROWSER="none"
```

**Windows Defender Exclusions**
```powershell
# Add exclusions to improve performance
Add-MpPreference -ExclusionPath "C:\path\to\pod-protocol\node_modules"
Add-MpPreference -ExclusionPath "C:\path\to\pod-protocol\.next"
```

**Windows Services Setup**
```powershell
# Install as Windows Service using NSSM
nssm install "PoD Protocol" "C:\path\to\pod-protocol\bun.exe" "run start"
nssm set "PoD Protocol" AppDirectory "C:\path\to\pod-protocol"
nssm start "PoD Protocol"
```

### **Windows Troubleshooting**

**Common Issues:**
- **Long path issue**: Enable long paths in Windows
- **Permission denied**: Run PowerShell as Administrator
- **Port conflicts**: Check for conflicting services
- **Firewall blocking**: Configure Windows Firewall rules

---

## 🍎 **macOS Deployment**

### **System Requirements**
- macOS 11.0 (Big Sur) or later
- Xcode Command Line Tools
- 8GB RAM minimum, 16GB recommended
- 20GB free disk space

### **Prerequisites Installation**

```bash
# Install Xcode Command Line Tools
xcode-select --install

# Install Homebrew
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install Bun (recommended)
curl -fsSL https://bun.sh/install | bash

# Alternative: Install Node.js
brew install node
```

### **Automated Installation**
```bash
# Clone repository
git clone https://github.com/PoD-Protocol/pod-protocol.git
cd pod-protocol

# Run macOS installer
chmod +x tools/scripts/macos/install.sh
./tools/scripts/macos/install.sh

# For Node.js instead of Bun
./tools/scripts/macos/install.sh --use-node
```

### **Manual Installation**
```bash
# Install dependencies
bun install

# Build project
bun run build

# Start development server
bun dev

# Production build
bun run build --production
```

### **macOS-Specific Configuration**

**Environment Variables**
```bash
# Add to ~/.zshrc or ~/.bash_profile
export NODE_ENV=production
export PORT=3000

# For Apple Silicon optimization
export NEXT_TELEMETRY_DISABLED=1
```

**LaunchAgent Setup (Background Service)**
```xml
<!-- Save as ~/Library/LaunchAgents/com.pod-protocol.plist -->
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.pod-protocol</string>
    <key>ProgramArguments</key>
    <array>
        <string>/path/to/bun</string>
        <string>run</string>
        <string>start</string>
    </array>
    <key>WorkingDirectory</key>
    <string>/path/to/pod-protocol</string>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
</dict>
</plist>
```

```bash
# Load the service
launchctl load ~/Library/LaunchAgents/com.pod-protocol.plist
```

### **Apple Silicon Optimizations**

**M1/M2 Specific Setup:**
```bash
# Check architecture
uname -m  # Should return arm64

# Rosetta 2 for compatibility (if needed)
sudo softwareupdate --install-rosetta

# Homebrew for Apple Silicon
eval "$(/opt/homebrew/bin/brew shellenv)"
```

### **macOS Troubleshooting**

**Common Issues:**
- **Permission denied**: Check file permissions with `ls -la`
- **Port already in use**: Use `lsof -i :3000` to find conflicting processes
- **Rosetta compatibility**: Some Node modules may need Rosetta 2

---

## 🐧 **Linux Deployment**

### **System Requirements**
- Modern Linux distribution (Ubuntu 20.04+, Fedora 35+, etc.)
- Kernel 4.15+ recommended
- 4GB RAM minimum, 8GB recommended
- 10GB free disk space

### **Distribution-Specific Setup**

**Ubuntu/Debian:**
```bash
# Update package list
sudo apt update

# Install dependencies
sudo apt install -y curl git build-essential

# Install Bun
curl -fsSL https://bun.sh/install | bash

# Alternative: Install Node.js
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt-get install -y nodejs
```

**Fedora/RHEL:**
```bash
# Install dependencies
sudo dnf install -y curl git gcc gcc-c++ make

# Install Bun
curl -fsSL https://bun.sh/install | bash

# Alternative: Install Node.js
sudo dnf install -y nodejs npm
```

**Arch Linux:**
```bash
# Install dependencies
sudo pacman -S curl git base-devel

# Install Bun (from AUR)
yay -S bun-bin

# Alternative: Install Node.js
sudo pacman -S nodejs npm
```

### **Automated Installation**
```bash
# Clone repository
git clone https://github.com/PoD-Protocol/pod-protocol.git
cd pod-protocol

# Run Linux installer
chmod +x tools/scripts/linux/install.sh
./tools/scripts/linux/install.sh

# For Node.js instead of Bun
./tools/scripts/linux/install.sh --use-node
```

### **Linux-Specific Configuration**

**System Limits Optimization**
```bash
# Increase file watchers (for development)
echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf
sudo sysctl -p

# Increase file descriptor limits
echo '* soft nofile 65536' | sudo tee -a /etc/security/limits.conf
echo '* hard nofile 65536' | sudo tee -a /etc/security/limits.conf
```

**Systemd Service Setup**
```ini
# Save as /etc/systemd/system/pod-protocol.service
[Unit]
Description=PoD Protocol Service
After=network.target

[Service]
Type=simple
User=pod-protocol
WorkingDirectory=/opt/pod-protocol
ExecStart=/usr/local/bin/bun run start
Restart=always
RestartSec=10
Environment=NODE_ENV=production
Environment=PORT=3000

[Install]
WantedBy=multi-user.target
```

```bash
# Enable and start service
sudo systemctl daemon-reload
sudo systemctl enable pod-protocol
sudo systemctl start pod-protocol
```

### **Docker Deployment (Recommended for Production)**

**Dockerfile Example:**
```dockerfile
FROM oven/bun:1 as builder

WORKDIR /app
COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile

COPY . .
RUN bun run build

FROM oven/bun:1-slim
WORKDIR /app
COPY --from=builder /app .

EXPOSE 3000
CMD ["bun", "run", "start"]
```

**Docker Compose:**
```yaml
version: '3.8'
services:
  pod-protocol:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    restart: unless-stopped
```

### **Linux Troubleshooting**

**Common Issues:**
- **Permission denied**: Check user permissions and SELinux contexts
- **Port binding**: Ensure no conflicting services with `netstat -tlnp`
- **Memory issues**: Monitor with `htop` or `free -h`
- **File descriptor limits**: Check with `ulimit -n`

---

## 🔧 **Cross-Platform Tools**

### **VS Code Integration**
```json
{
  "recommendations": [
    "oven.bun-vscode",
    "ms-vscode.vscode-typescript-next",
    "esbenp.prettier-vscode"
  ]
}
```

### **Environment Files**

**Development (.env.development):**
```bash
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://localhost:5432/pod_protocol_dev
```

**Production (.env.production):**
```bash
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://prod-server:5432/pod_protocol
```

---

## 📊 **Performance Monitoring**

### **System Monitoring Commands**

**Windows:**
```powershell
# Resource usage
Get-Counter "\Process(node)\% Processor Time"
Get-Counter "\Memory\Available MBytes"

# Network monitoring
netstat -an | findstr :3000
```

**macOS/Linux:**
```bash
# Resource usage
top -p $(pgrep node)
htop

# Network monitoring
netstat -tlnp | grep :3000
ss -tlnp | grep :3000
```

---

## 🚀 **Production Deployment Checklist**

### **Pre-Deployment**
- [ ] Environment variables configured
- [ ] Database connections tested
- [ ] SSL certificates installed
- [ ] Firewall rules configured
- [ ] Monitoring setup complete

### **Security Hardening**
- [ ] Run as non-root user
- [ ] Disable unnecessary services
- [ ] Update system packages
- [ ] Configure fail2ban (Linux)
- [ ] Enable audit logging

### **Performance Optimization**
- [ ] Enable gzip compression
- [ ] Configure CDN
- [ ] Set up load balancing
- [ ] Optimize database queries
- [ ] Enable caching

---

## 📞 **Support**

For OS-specific deployment issues:
- **Windows**: Check Windows Event Viewer for errors
- **macOS**: Use Console.app for system logs
- **Linux**: Check `/var/log/` and `journalctl -u pod-protocol`

**Community Support:**
- GitHub Issues: [Report OS-specific issues](https://github.com/PoD-Protocol/pod-protocol/issues)
- Discord: Join our [community server](https://discord.gg/pod-protocol)

---

*Last updated: January 2025* 