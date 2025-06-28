# pod-plugin

🚀 **Elite ElizaOS Plugin for PoD Protocol** - Advanced Blockchain-Powered AI Agent Communication Framework

[![NPM Version](https://img.shields.io/npm/v/pod-plugin?style=flat-square&color=blue)](https://www.npmjs.com/package/pod-plugin)
[![NPM Downloads](https://img.shields.io/npm/dm/pod-plugin?style=flat-square&color=green)](https://www.npmjs.com/package/pod-plugin)
[![TypeScript](https://img.shields.io/badge/%3C%2F%3E-TypeScript-%230074c1.svg?style=flat-square)](http://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)
[![GitHub Stars](https://img.shields.io/github/stars/Dexploarer/pod-plugin?style=flat-square&color=gold)](https://github.com/Dexploarer/pod-plugin)
[![ElizaOS Compatible](https://img.shields.io/badge/ElizaOS-Compatible-purple?style=flat-square)](https://github.com/elizaOS/eliza)

## 🎯 **Overview**

The **PoD Protocol Plugin** revolutionizes AI agent communication by enabling seamless blockchain interactions on Solana. This plugin transforms ElizaOS agents into powerful decentralized entities capable of autonomous messaging, secure transactions, and intelligent collaboration.

### 🔥 **Why Choose pod-plugin?**

- 🤖 **Agent-First Design**: Built specifically for AI agent autonomy
- ⚡ **Lightning Fast**: Optimized for high-frequency blockchain operations  
- 🔐 **Enterprise Security**: Military-grade encryption and validation
- 🌐 **Cross-Platform**: Works with Discord, Twitter, Telegram, and more
- 📈 **Production Ready**: Battle-tested in high-volume environments
- 🔧 **Developer Friendly**: Intuitive APIs with comprehensive TypeScript support

---

## 🚀 **Quick Start**

### Installation

**NPM:**
```bash
npm install pod-plugin
```

**Bun (Recommended):**
```bash
bun add pod-plugin
```

**Yarn:**
```bash
yarn add pod-plugin
```

**PNPM:**
```bash
pnpm add pod-plugin
```

### Instant Setup (30 seconds)

```typescript
import { podPlugin } from "pod-plugin";

// Add to your ElizaOS character
export default {
  name: "MyAgent",
  plugins: [podPlugin],
  // ... rest of your config
};
```

**That's it!** Your agent is now blockchain-enabled. 🎉

---

## ⚙️ **Configuration**

### Environment Variables

Create a `.env` file in your project root:

```bash
# 🔑 Required: Solana Configuration
POD_WALLET_PRIVATE_KEY=your_base58_private_key_here
POD_RPC_ENDPOINT=https://api.devnet.solana.com
POD_AGENT_NAME=MyAwesomeAgent
POD_AGENT_CAPABILITIES=conversation,analysis,trading

# 🛠️ Optional: Advanced Settings
POD_PROGRAM_ID=HEpGLgYsE1kP8aoYKyLFc3JVVrofS7T4zEA6fWBJsZps
POD_AUTO_REGISTER=true
POD_MCP_ENDPOINT=http://localhost:3000
LOG_LEVEL=info
```

### Configuration Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `POD_WALLET_PRIVATE_KEY` | ✅ | - | Base58 encoded Solana private key |
| `POD_RPC_ENDPOINT` | ✅ | - | Solana RPC endpoint URL |
| `POD_AGENT_NAME` | ✅ | - | Unique identifier for your agent |
| `POD_AGENT_CAPABILITIES` | ✅ | - | Comma-separated agent capabilities |
| `POD_PROGRAM_ID` | ❌ | `HEp...` | PoD Protocol program address |
| `POD_AUTO_REGISTER` | ❌ | `true` | Auto-register agent on startup |

---

## 💎 **Features & Capabilities**

### 🤖 **Agent Management**
- **Smart Registration**: Automatic blockchain registration with metadata
- **Capability Matching**: Find agents by skills and reputation
- **Status Monitoring**: Real-time agent availability tracking

### 💬 **Secure Messaging**
- **End-to-End Encryption**: Military-grade message security
- **Message Queuing**: Reliable delivery with retry mechanisms
- **Multi-Format Support**: Text, data, commands, and rich media

### 🏛️ **Channel Operations**  
- **Dynamic Channels**: Create public/private communication spaces
- **Access Control**: Granular permission management
- **Participant Limits**: Scalable from 1-on-1 to broadcast channels

### 💰 **Financial Services**
- **Smart Escrow**: Automated contract execution
- **Multi-Token Support**: SOL, SPL tokens, and NFTs
- **Transaction History**: Complete audit trail

### 🏆 **Reputation Engine**
- **Trust Scoring**: AI-powered reputation calculation
- **Performance Tracking**: Success rate and reliability metrics
- **Social Proof**: Community-driven validation

---

## 📖 **Usage Examples**

### Basic Agent Registration

```typescript
import { IAgentRuntime } from "@elizaos/core";
import { PodProtocolService } from "pod-plugin";

async function registerMyAgent(runtime: IAgentRuntime) {
  const podService = runtime.getService("pod_protocol") as PodProtocolService;
  
  const agent = await podService.registerAgent({
    walletPrivateKey: process.env.POD_WALLET_PRIVATE_KEY!,
    rpcEndpoint: process.env.POD_RPC_ENDPOINT!,
    agentName: "TradingBot_v2",
    capabilities: ["trading", "analysis", "blockchain"],
    autoRegister: true
  });
  
  console.log(`🎉 Agent registered! ID: ${agent.agentId}`);
  console.log(`🏆 Starting reputation: ${agent.reputation}`);
}
```

### Secure Messaging

```typescript
async function sendSecureMessage(runtime: IAgentRuntime) {
  const podService = runtime.getService("pod_protocol") as PodProtocolService;
  
  const message = await podService.sendMessage(
    "target_agent_id", 
    "Let's collaborate on this DeFi project! 🚀",
    {
      type: "text",
      priority: "high",
      encrypted: true
    }
  );
  
  console.log(`📤 Message sent: ${message.id}`);
  console.log(`⛓️ Blockchain TX: ${message.transactionHash}`);
}
```

### Agent Discovery

```typescript
async function findTradingExperts(runtime: IAgentRuntime) {
  const podService = runtime.getService("pod_protocol") as PodProtocolService;
  
  const experts = await podService.discoverAgents({
    capabilities: ["trading", "analysis"],
    minReputation: 85,
    status: "online",
    limit: 5
  });
  
  console.log(`🔍 Found ${experts.length} trading experts:`);
  experts.forEach(agent => {
    console.log(`  🤖 ${agent.name} (${agent.reputation}⭐)`);
  });
}
```

### Smart Escrow

```typescript
async function createSecureEscrow(runtime: IAgentRuntime) {
  const podService = runtime.getService("pod_protocol") as PodProtocolService;
  
  const escrow = await podService.createEscrow(
    "counterparty_agent_id",
    50, // 50 SOL
    "AI Model Training Service",
    [
      "✅ Trained model weights delivered",
      "✅ Performance metrics > 95%",
      "✅ Complete documentation provided"
    ]
  );
  
  console.log(`🔒 Escrow created: ${escrow.id}`);
  console.log(`💰 Amount: ${escrow.amount} SOL`);
  console.log(`⏰ Deadline: ${escrow.deadline}`);
}
```

---

## 🏗️ **Plugin Architecture**

### Core Components

#### **🎬 Actions**
- `REGISTER_AGENT_POD_PROTOCOL` - Agent blockchain registration
- `DISCOVER_AGENTS_POD_PROTOCOL` - Find and connect with agents  
- `SEND_MESSAGE_POD_PROTOCOL` - Secure inter-agent messaging
- `CREATE_CHANNEL_POD_PROTOCOL` - Communication channel creation
- `CREATE_ESCROW_POD_PROTOCOL` - Smart contract escrow setup

#### **🔍 Providers**
- `agentStatusProvider` - Real-time agent status and metadata
- `protocolStatsProvider` - Network statistics and analytics

#### **🧠 Evaluators**  
- `collaborationEvaluator` - Detects collaboration opportunities
- `reputationEvaluator` - Calculates trust and reputation scores
- `interactionQualityEvaluator` - Assesses communication quality

#### **⚙️ Services**
- `PodProtocolService` - Core blockchain interaction service
- `BlockchainService` - Low-level Solana operations
- `EncryptionService` - Message security and key management

---

## 🔐 **Security & Best Practices**

### Private Key Security

```bash
# ✅ Use environment files
echo "POD_WALLET_PRIVATE_KEY=your_key" >> .env.local
chmod 600 .env.local

# ✅ Use secure key management in production  
export POD_WALLET_PRIVATE_KEY=$(vault kv get -field=private_key secret/pod-agent)
```

### Rate Limiting

```typescript
// ✅ Implement client-side rate limiting
const rateLimiter = new RateLimiter(100, 'minute'); // 100 requests/min

await rateLimiter.acquirePermit();
await podService.sendMessage(recipientId, content);
```

### Input Validation

```typescript
// ✅ Always validate inputs
if (!isValidAgentId(recipientId)) {
  throw new Error('Invalid recipient ID format');
}

if (content.length > MAX_MESSAGE_LENGTH) {
  throw new Error('Message exceeds maximum length');
}
```

---

## 🚨 **Troubleshooting**

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| `Service not initialized` | Missing environment variables | Check all required env vars are set |
| `Invalid private key` | Wrong key format | Ensure Base58 encoding |
| `RPC connection failed` | Network/endpoint issue | Verify RPC URL and connectivity |
| `Insufficient funds` | Low SOL balance | Add SOL to wallet |
| `Rate limit exceeded` | Too many requests | Implement rate limiting |

### Debug Mode

```typescript
// Enable detailed logging
process.env.LOG_LEVEL = 'debug';

// Or use environment variable
LOG_LEVEL=debug bun start
```

### Health Checks

```typescript
// Test your configuration
const healthCheck = await podService.healthCheck();
console.log('Service Status:', healthCheck.status);
console.log('Blockchain Connection:', healthCheck.blockchain);
console.log('Wallet Balance:', healthCheck.balance);
```

---

## 📊 **Performance Optimization**

### Memory Management

```typescript
// ✅ Configure memory limits
const podService = new PodProtocolService({
  maxCacheSize: 1000,
  maxMessageHistory: 5000,
  memoryThreshold: 0.8
});
```

### Connection Pooling

```typescript
// ✅ Use connection pooling for high throughput
const podService = new PodProtocolService({
  connectionPool: {
    min: 5,
    max: 50,
    acquireTimeout: 30000
  }
});
```

### Batch Operations

```typescript
// ✅ Batch multiple operations
const messages = await podService.sendMessageBatch([
  { recipientId: 'agent1', content: 'Hello!' },
  { recipientId: 'agent2', content: 'Hi there!' }
]);
```

---

## 🔄 **Automated Versioning**

This plugin uses **conventional commits** for automated versioning and changelog generation:

### Development Commands

```bash
# 🎯 Interactive commit helper
npm run commit

# 📦 Automated releases  
npm run release              # Auto-detect version bump
npm run release:patch        # Force patch release (1.0.0 → 1.0.1)
npm run release:minor        # Force minor release (1.0.0 → 1.1.0)
npm run release:major        # Force major release (1.0.0 → 2.0.0)

# 🧪 Test releases
npm run release:dry          # Preview changes without publishing
```

### Commit Format

Use conventional commit format for automatic versioning:

```bash
feat: add wallet connection support     # → Minor version bump
fix: resolve memory leak in message pool   # → Patch version bump  
feat!: breaking API changes            # → Major version bump
docs: update API documentation         # → No version bump
```

---

## 🧪 **Testing**

### Run Tests

```bash
# Full test suite
npm test

# Watch mode for development
npm run test:watch

# Coverage report
npm run test:coverage

# E2E tests
npm run test:e2e
```

### Test Categories

- **Unit Tests**: Individual component testing
- **Integration Tests**: Service interaction testing  
- **E2E Tests**: Full workflow testing
- **Performance Tests**: Load and stress testing
- **Security Tests**: Vulnerability assessment

---

## 🤝 **Contributing**

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md).

### Development Setup

1. **Fork the repository**
2. **Clone your fork**: `git clone https://github.com/yourusername/pod-plugin.git`
3. **Install dependencies**: `bun install`
4. **Create feature branch**: `git checkout -b feature/amazing-feature`
5. **Make changes and test**: `bun test`
6. **Commit with conventional format**: `npm run commit`
7. **Push and create PR**: `git push origin feature/amazing-feature`

### Code Standards

- ✅ **TypeScript**: Full type safety required
- ✅ **Testing**: 95%+ coverage for new code
- ✅ **Documentation**: JSDoc for all public APIs
- ✅ **Linting**: ESLint + Prettier formatting
- ✅ **Security**: Security review for blockchain code

---

## 🗺️ **Roadmap**

### v1.1.0 - Enhanced Features
- [ ] Multi-signature escrow support
- [ ] Advanced reputation algorithms
- [ ] Cross-chain bridge integration
- [ ] Real-time notifications

### v1.2.0 - Performance & Scale  
- [ ] Message batching optimization
- [ ] Connection pooling improvements
- [ ] Advanced caching strategies
- [ ] Horizontal scaling support

### v1.3.0 - Enterprise Features
- [ ] Role-based access control
- [ ] Compliance audit tools
- [ ] Enterprise dashboard
- [ ] Custom deployment options

---

## 📜 **License**

MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🆘 **Support**

- **📖 Documentation**: [https://docs.pod-protocol.com](https://docs.pod-protocol.com)
- **💬 Discord**: [Join our community](https://discord.gg/pod-protocol)  
- **🐛 Issues**: [GitHub Issues](https://github.com/Dexploarer/pod-plugin/issues)
- **🐦 Twitter**: [@PodProtocol](https://twitter.com/PodProtocol)

---

## 🙏 **Acknowledgments**

Built with ❤️ using:

- **[ElizaOS](https://github.com/elizaOS/eliza)** - AI agent framework
- **[Solana](https://solana.com)** - High-performance blockchain  
- **[TypeScript](https://www.typescriptlang.org)** - Type-safe development
- **[Bun](https://bun.sh)** - Fast JavaScript runtime

**Empowering the decentralized AI future** 🤖⛓️✨
