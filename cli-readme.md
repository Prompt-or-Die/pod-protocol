# PoD Protocol CLI

<div align="center">

** Command the future or fall behind - Developer productivity **

[![npm version](https://img.shields.io/npm/v/@pod-protocol/cli?style=for-the-badge&logo=npm&color=cyan)](https://www.npmjs.com/package/@pod-protocol/cli)
[![Downloads](https://img.shields.io/npm/dm/@pod-protocol/cli?style=for-the-badge&logo=npm&color=darkcyan)](https://www.npmjs.com/package/@pod-protocol/cli)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org)
[![Bun](https://img.shields.io/badge/Bun-Compatible-black?style=for-the-badge&logo=bun)](https://bun.sh)

[![Cross Platform](https://img.shields.io/badge/Platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey?style=for-the-badge)](https://github.com/Prompt-or-Die/pod-cli)
[![Build Status](https://img.shields.io/github/actions/workflow/status/Prompt-or-Die/pod-cli/ci.yml?style=for-the-badge&logo=github)](https://github.com/Prompt-or-Die/pod-cli/actions)

[![ Prompt or Die](https://img.shields.io/badge/-Prompt_or_Die-cyan?style=for-the-badge)](https://github.com/Prompt-or-Die)
[![ CLI Master Race](https://img.shields.io/badge/-CLI_Master_Race-cyan?style=for-the-badge)](https://github.com/Prompt-or-Die)
[![ Automate or Perish](https://img.shields.io/badge/-Automate_or_Perish-darkcyan?style=for-the-badge)](https://github.com/Prompt-or-Die)

</div>

##  **Developer Velocity at Light Speed**

**If you're clicking instead of typing, you're losing.** 

The PoD Protocol CLI turns complex blockchain operations into simple commands. Deploy agents, monitor performance, manage portfolios, and automate everything with the power of the command line.

### ** Why Developers Love the PoD CLI**

- ** Lightning Fast**: Zero-latency local operations with smart caching
- ** Automation Ready**: Perfect for CI/CD and automated workflows  
- ** Rich Output**: Beautiful tables, charts, and real-time updates
- ** Extensible**: Custom plugins and scripts
- ** Multi-Chain**: Solana, Ethereum, and more from one interface
- ** Cross-Platform**: Works everywhere - Windows, macOS, Linux

##  **Installation**

### **Quick Install**

```bash
# npm (global)
npm install -g @pod-protocol/cli

# bun (recommended)
bun add -g @pod-protocol/cli

# yarn
yarn global add @pod-protocol/cli

# Direct install (no package manager)
curl -fsSL https://install.pod-protocol.com | sh
```

### **Verify Installation**

```bash
pod --version
pod help

# Check system requirements
pod doctor
```

##  **Quick Start Commands**

### **Agent Management**

```bash
# Create a new trading agent
pod agent create \
  --name "MyTradingBot" \
  --type trading \
  --strategy dca \
  --token SOL \
  --amount 100

# Deploy agent to mainnet
pod agent deploy MyTradingBot --network mainnet --confirm

# Monitor agent performance  
pod agent monitor MyTradingBot --live --interval 5s

# List all agents
pod agent list --status active --sort profit

# Get detailed agent info
pod agent info MyTradingBot --include-metrics --include-trades
```

### **Portfolio Management**

```bash
# View portfolio balance
pod portfolio balance --detailed --include-staking

# Rebalance portfolio  
pod portfolio rebalance \
  --target SOL:40,ETH:30,BTC:20,USDC:10 \
  --max-slippage 0.5% \
  --dry-run

# Portfolio performance analytics
pod portfolio analytics \
  --timeframe 30d \
  --include-benchmarks \
  --export csv
```

### **Trading Operations**

```bash
# Execute manual trade
pod trade execute \
  --from SOL \
  --to USDC \
  --amount 10 \
  --slippage 1% \
  --confirm

# Set up automated DCA
pod trade dca setup \
  --token SOL \
  --amount 50 \
  --interval weekly \
  --start-date tomorrow

# Monitor live trades
pod trade monitor --live --filter "profit > 5"
```

##  **Advanced Features**

### **Interactive Mode**

```bash
# Launch interactive shell
pod shell

# Interactive mode features:
# - Auto-completion for all commands
# - Command history and search
# - Real-time data streaming
# - Context-aware suggestions

 PoD Protocol CLI v2.0.0
 Type 'help' for commands or 'exit' to quit

pod> agent create --interactive
? Agent name: MyArbitrageBot
? Strategy type: (Use arrow keys)
 arbitrage
  dca
  momentum  
  grid
  custom

? Select exchanges: (Space to select, Enter to confirm)
 Orca
 Raydium  
 Serum
 Jupiter

 Agent created successfully!
```

### **Scripting & Automation**

```bash
# Create reusable scripts
pod script create portfolio-rebalance.js
```

```javascript
// portfolio-rebalance.js
const { Agent, Portfolio } = require('@pod-protocol/cli-sdk');

module.exports = async function(ctx) {
  const portfolio = await Portfolio.get(ctx.walletAddress);
  
  if (portfolio.drift > 5) {
    console.log(' Portfolio drift detected, rebalancing...');
    
    const result = await portfolio.rebalance({
      target: { SOL: 40, ETH: 30, BTC: 20, USDC: 10 },
      maxSlippage: 0.5
    });
    
    console.log(` Rebalanced: ${result.trades.length} trades executed`);
  } else {
    console.log(' Portfolio balanced, no action needed');
  }
};
```

```bash
# Run custom script
pod script run portfolio-rebalance.js --wallet main

# Schedule script execution
pod script schedule portfolio-rebalance.js --cron "0 9 * * 1"
```

### **Plugin System**

```bash
# Install community plugins
pod plugin install @pod/technical-analysis
pod plugin install @pod/defi-yields  
pod plugin install @pod/nft-tools

# List installed plugins
pod plugin list --enabled

# Create custom plugin
pod plugin create my-custom-analyzer
```

##  **Monitoring & Analytics**

### **Real-Time Dashboard**

```bash
# Launch TUI dashboard
pod dashboard --live

 PoD Protocol Dashboard 
                                                                    
  Portfolio Overview                     Active Agents (3)     
   
  Total Value: $12,847.32              TradingBot-1      +2.3%  
  24h Change:  +$432.18 (+3.48%)      ArbitrageBot-2    +1.7%  
  SOL: 45.2 ($2,487.12)               GridBot-3         +0.2%  
  ETH: 2.8  ($4,892.40)               
  BTC: 0.15 ($4,567.80)                                          
   24h Performance         
                                        
  Recent Trades                                
        
  09:32 SOLUSDC  +$12.45                             
  09:28 ETHSOL   +$8.92                                
  09:24 BTCETH   +$15.67            
                          


Press 'q' to quit, 'r' to refresh, 'h' for help
```

### **Performance Reports**

```bash
# Generate performance report
pod analytics report \
  --timeframe 30d \
  --include-charts \
  --format pdf \
  --output monthly-report.pdf

# Compare strategies
pod analytics compare \
  --strategies dca,momentum,arbitrage \
  --metric sharpe-ratio \
  --timeframe 1y

# Risk analysis
pod analytics risk \
  --portfolio main \
  --include-var \
  --include-stress-test \
  --confidence 95%
```

##  **Security & Wallet Management**

### **Multi-Wallet Support**

```bash
# Add wallets
pod wallet add --name trading --keyfile ~/.solana/trading.json
pod wallet add --name hodl --ledger --derivation "44'/501'/0'/0'"

# List wallets
pod wallet list --show-balances

# Set default wallet
pod wallet set-default trading

# Secure operations
pod wallet sign transaction.json --wallet trading --verify
```

### **Environment Management**

```bash
# Manage environments
pod env create production --rpc https://api.mainnet-beta.solana.com
pod env create development --rpc https://api.devnet.solana.com  
pod env create local --rpc http://localhost:8899

# Switch environments
pod env use production

# Environment-specific configs
pod config set --env production max-slippage 0.5%
pod config set --env development max-slippage 2%
```

##  **CI/CD Integration**

### **GitHub Actions**

```yaml
# .github/workflows/deploy-agent.yml
name: Deploy Trading Agent

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Install PoD CLI
        run: npm install -g @pod-protocol/cli
        
      - name: Deploy Agent
        run: |
          pod auth login --token ${{ secrets.POD_API_KEY }}
          pod agent deploy ./agents/trading-bot.config.js \
            --network mainnet \
            --wallet ${{ secrets.WALLET_KEY }} \
            --confirm
        env:
          POD_API_KEY: ${{ secrets.POD_API_KEY }}
          WALLET_KEY: ${{ secrets.WALLET_KEY }}
```

### **Docker Integration**

```dockerfile
FROM node:18-alpine

# Install PoD CLI
RUN npm install -g @pod-protocol/cli

# Copy agent configurations
COPY agents/ /app/agents/
WORKDIR /app

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s \
  CMD pod agent health-check || exit 1

# Run agent deployment
CMD ["pod", "agent", "deploy", "agents/production.config.js", "--network", "mainnet"]
```

##  **Development Tools**

### **Code Generation**

```bash
# Generate agent template
pod generate agent \
  --name MyCustomAgent \
  --language typescript \
  --strategy custom \
  --template advanced

# Generate strategy boilerplate
pod generate strategy \
  --name MeanReversion \
  --indicators sma,rsi,bollinger \
  --language rust

# Generate test suite
pod generate tests \
  --agent MyCustomAgent \
  --coverage integration \
  --framework jest
```

### **Debugging Tools**

```bash
# Debug agent execution
pod debug agent MyTradingBot \
  --trace-level verbose \
  --capture-logs \
  --real-time

# Transaction analysis
pod debug transaction 5Ew8...Ab3d \
  --decode-instructions \
  --show-accounts \
  --include-logs

# Performance profiling
pod debug profile MyTradingBot \
  --duration 1h \
  --include-memory \
  --export flamegraph
```

##  **Learning & Documentation**

### **Interactive Tutorials**

```bash
# Start interactive tutorial
pod learn basics

# Advanced topics
pod learn advanced-trading
pod learn defi-strategies  
pod learn risk-management

# Example scenarios
pod learn scenario arbitrage-bot
pod learn scenario yield-farming
```

### **Built-in Help**

```bash
# Comprehensive help
pod help                    # Overview
pod agent help              # Agent commands
pod trade help execute      # Specific command help

# Examples for any command
pod agent create --examples
pod trade execute --examples

# Quick reference
pod cheat-sheet             # Command quick reference
pod hotkeys                 # Keyboard shortcuts
```

##  **Performance & Optimization**

| Feature | Performance | Notes |
|---------|-------------|-------|
| Command Execution | **<50ms** | Local operations cached |
| Network Requests | **<200ms** | Smart batching & compression |
| Data Streaming | **Real-time** | WebSocket connections |
| Memory Usage | **<100MB** | Efficient data structures |
| Startup Time | **<1s** | Lazy loading & pre-compiled |

##  **Contributing**

```bash
git clone https://github.com/Prompt-or-Die/pod-cli.git
cd pod-cli
bun install
bun run build
bun test

# Run CLI locally
bun run cli --help
```

##  **Support**

-  **[CLI Documentation](https://docs.pod-protocol.com/cli)**
-  **[Discord #cli](https://discord.gg/pod-protocol)**
-  **[Video Tutorials](https://youtube.com/@PodProtocol)**
-  **[CLI Support](mailto:cli@pod-protocol.com)**

##  **License**

MIT License - see [LICENSE](LICENSE) for details.

---

<div align="center">

** CLI Excellence - Command the future or fall behind! **

*Built with  and terminal mastery by the PoD Protocol CLI team*

[![GitHub](https://img.shields.io/badge/GitHub-Prompt--or--Die-cyan?style=for-the-badge&logo=github)](https://github.com/Prompt-or-Die)
[![Documentation](https://img.shields.io/badge/Docs-CLI-cyan?style=for-the-badge&logo=terminal)](https://docs.pod-protocol.com/cli)

</div>
