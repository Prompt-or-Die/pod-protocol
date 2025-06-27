# 🌍 Platform-Specific Setup Guide

> **Complete setup instructions for Windows, macOS, and Linux**

---

## 🪟 Windows Setup

### Quick Start
```powershell
# Install Bun (recommended)
powershell -c "irm bun.sh/install.ps1 | iex"

# Clone and setup
git clone https://github.com/PoD-Protocol/pod-protocol.git
cd pod-protocol
bun install
bun dev
```

### Windows-Specific Notes
- **PowerShell**: Use Windows Terminal or PowerShell Core for best experience
- **WSL2**: Recommended for advanced development workflows
- **Defender**: Add exclusions for `node_modules` folder for better performance
- **Ports**: Default ports 3000 (frontend) and 8080 (API)

### Troubleshooting
- **Long paths**: Enable long path support in Windows
- **Permission errors**: Run PowerShell as Administrator
- **Port conflicts**: Use `netstat -an | findstr :3000` to check

---

## 🍎 macOS Setup

### Quick Start
```bash
# Install Xcode Command Line Tools
xcode-select --install

# Install Homebrew
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install Bun
curl -fsSL https://bun.sh/install | bash

# Clone and setup
git clone https://github.com/PoD-Protocol/pod-protocol.git
cd pod-protocol
bun install
bun dev
```

### Apple Silicon (M1/M2) Notes
- **Native ARM64**: Full native support included
- **Rosetta 2**: Available for compatibility if needed
- **Homebrew**: Use Apple Silicon version for best performance

### Troubleshooting
- **Permission denied**: Check file permissions with `ls -la`
- **Port conflicts**: Use `lsof -i :3000` to find processes
- **PATH issues**: Ensure `~/.bun/bin` is in your PATH

---

## 🐧 Linux Setup

### Ubuntu/Debian
```bash
sudo apt update
sudo apt install -y curl git build-essential
curl -fsSL https://bun.sh/install | bash
export PATH="$HOME/.bun/bin:$PATH"

git clone https://github.com/PoD-Protocol/pod-protocol.git
cd pod-protocol
bun install
bun dev
```

### Fedora/RHEL
```bash
sudo dnf install -y curl git gcc gcc-c++ make
curl -fsSL https://bun.sh/install | bash
export PATH="$HOME/.bun/bin:$PATH"

git clone https://github.com/PoD-Protocol/pod-protocol.git
cd pod-protocol
bun install
bun dev
```

### Arch Linux
```bash
sudo pacman -S curl git base-devel
yay -S bun-bin  # or use curl install method

git clone https://github.com/PoD-Protocol/pod-protocol.git
cd pod-protocol
bun install
bun dev
```

### Linux Optimizations
```bash
# Increase file watchers for development
echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf
sudo sysctl -p

# Increase file descriptor limit
ulimit -n 65536
```

---

## 🐳 Docker (All Platforms)

### Quick Docker Setup
```bash
# Build and run
docker build -t pod-protocol .
docker run -p 3000:3000 -p 8080:8080 pod-protocol

# Or use Docker Compose
docker-compose up -d
```

---

## 📱 Mobile Development

### React Native (Future)
- iOS: Xcode 14+ required
- Android: Android Studio with SDK 31+
- Expo CLI: `bun add -g @expo/cli`

---

## 🔧 IDE Setup

### VS Code (Recommended)
```json
{
  "recommendations": [
    "oven.bun-vscode",
    "ms-vscode.vscode-typescript-next",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss"
  ]
}
```

### IntelliJ/WebStorm
- Enable Bun support in settings
- Configure TypeScript service
- Install Solana plugin for smart contract development

---

## 🚀 Performance Tips

### Windows
- Enable Developer Mode
- Use SSD for best performance
- Disable real-time scanning for project folder

### macOS
- Use native Terminal or iTerm2
- Enable Rosetta 2 if needed for compatibility
- Use Finder tags to organize projects

### Linux
- Use systemd for production services
- Configure swap appropriately
- Use package manager for system dependencies

---

## 📊 System Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| **OS** | Win 10, macOS 11, Ubuntu 20.04 | Latest stable |
| **RAM** | 8GB | 16GB+ |
| **Storage** | 20GB free | 50GB+ SSD |
| **Node** | 18+ | 20+ |
| **Bun** | 1.0+ | Latest |

---

## 🆘 Getting Help

### Platform-Specific Support
- **Windows**: Check Event Viewer for errors
- **macOS**: Use Console.app for system logs  
- **Linux**: Check `journalctl` and `/var/log/`

### Community
- [GitHub Issues](https://github.com/PoD-Protocol/pod-protocol/issues)
- [Discord Community](https://discord.gg/pod-protocol)
- [Documentation](https://docs.pod-protocol.org)

---

*Choose your platform above and get started in minutes!* 