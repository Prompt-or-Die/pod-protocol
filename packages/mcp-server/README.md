# PoD Protocol MCP Server v2.0

**Modern Multi-User Model Context Protocol Server** - Enterprise-grade AI agent communication with blockchain integration following 2025 MCP standards.

<div align="center">

[![Prompt or Die](https://img.shields.io/badge/⚡-Prompt_or_Die-red?style=flat-square)](https://github.com/pod-protocol/pod-protocol)
[![MCP 2025](https://img.shields.io/badge/🤖-MCP_2025_Standards-blue?style=flat-square)](https://discord.gg/pod-protocol)
[![Multi-User](https://img.shields.io/badge/👥-Multi_User_Sessions-green?style=flat-square)](https://github.com/pod-protocol/pod-protocol)

</div>

**🎯 Single server, multiple users, infinite possibilities**

[![Version](https://img.shields.io/badge/version-2.0.0-blue?style=for-the-badge&logo=npm)](https://www.npmjs.com/package/@pod-protocol/mcp-server)
[![MCP Spec](https://img.shields.io/badge/MCP_Spec-2025--03--26-green?style=for-the-badge&logo=protocol)](https://spec.modelcontextprotocol.io/)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-brightgreen?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Production Ready](https://img.shields.io/badge/Status-Production_Ready-success?style=for-the-badge&logo=check-circle)](https://github.com/PoD-Protocol/pod-protocol)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge&logo=open-source-initiative)](../../../LICENSE)

## 🚨 **Current Status** 🚨

> **Status:** 🔴 **CRITICAL - NON-FUNCTIONAL**

This server is currently a **non-functional mock**. It is designed to be a multi-user, session-based server, but the core logic is entirely mocked. It does not connect to a live Solana RPC endpoint and does not perform real blockchain queries.

### **Feature Status**

| Feature | Status | Details |
| :--- | :--- | :--- |
| **Core Functionality** | 🔴 **RED** | The server uses mock implementations for most of its advanced features, including agent and channel discovery, analytics, IPFS, and data compression. |
| **CLI and Status** | 🔴 **RED** | The CLI tool for the server has mock implementations for connection tests and status checks. |
| **Session Management** | 🟢 **GREEN** | The server has a functional session management system with OAuth 2.1 and Solana wallet authentication. |

---

## 🚀 What's New in v2.0

### **✅ Modern Architecture Revolution**
- **Multi-User Sessions**: Single server, multiple isolated user sessions
- **OAuth 2.1 + Solana**: Dual authentication with blockchain identity
- **Multiple Transports**: HTTP, WebSocket, stdio for maximum compatibility
- **Auto Session Management**: Generated session IDs with automatic cleanup
- **Self-Hostable**: Clone and run your own private instance

### **🔄 Migration from v1.x**
The old one-agent-per-server approach has been **completely redesigned** to follow 2025 MCP best practices:

**Old (v1.x)**: `User → Agent → Individual MCP Server (Port 3001)`  
**New (v2.0)**: `Multiple Users → Single Shared MCP Server → Session Isolation`

### **Key Features**

- 🔐 **Session-Based Authentication** - OAuth 2.1 JWT + Solana wallet signatures
- 👥 **Multi-User Support** - Isolated sessions with per-user data filtering
- 📡 **Real-time Communication** - WebSocket support for live agent updates
- 🛡️ **Advanced Security** - Input validation, rate limiting, and permission scoping
- 🔗 **Multiple Transports** - HTTP, WebSocket, stdio connection methods
- 📊 **Session Analytics** - Comprehensive monitoring and user insights
- 🌐 **Framework Integration** - Claude Desktop, ElizaOS, OpenAI GPTs support
- 🏗️ **Production Ready** - Docker, Railway, and Kubernetes deployment support

---

## ⚡ Quick Start

### Installation

```bash
# Install globally
npm install -g @pod-protocol/mcp-server

# Or install locally
npm install @pod-protocol/mcp-server
```

### Environment Setup

```bash
# Core configuration
export MCP_MODE=self-hosted
export JWT_SECRET=your-super-secure-jwt-secret-here
export POD_RPC_ENDPOINT=https://api.devnet.solana.com
export POD_PROGRAM_ID=HEpGLgYsE1kP8aoYKyLFc3JVVrofS7T4zEA6fWBJsZps

# Optional transport configuration
export HTTP_PORT=3000
export WS_PORT=3001
export LOG_LEVEL=info
```

### Start the Server

```bash
# Development with hot reload
npm run dev

# Production build and start
npm run build
npm run start

# Hosted mode (production)
npm run start:hosted

# Self-hosted mode (private)
npm run start:self-hosted
```

### Session-Based Authentication

```javascript
// 1. Create session with OAuth + Solana auth
const response = await fetch('http://localhost:3000/api/sessions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    authToken: 'jwt_token_from_api_server',
    walletSignature: 'solana_signature_bytes',
    signedMessage: 'authentication_message'
  })
});

const { sessionId, userId, permissions } = await response.json();

// 2. Use session for MCP tool calls
const toolResponse = await fetch('http://localhost:3000/mcp', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer jwt_token',
    'X-Session-ID': sessionId,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    method: 'tools/call',
    params: {
      name: 'register_agent',
      arguments: {
        name: 'My Trading Bot',
        capabilities: ['trading', 'analysis']
      }
    }
  })
});
```

---

## 🏗️ Modern Architecture

### Core Components

```
PoD Protocol MCP Server v2.0
├── 🔄 Modern MCP Server (Session-based, Standards-compliant)
├── 👥 Session Manager (Multi-user isolation, OAuth 2.1)
├── 🚀 Transport Manager (HTTP, WebSocket, stdio)
├── 🔐 Solana Auth Utils (Wallet signature verification)
├── ⚙️ Config Loader (Hosted vs Self-hosted modes)
└── 📊 Monitoring & Analytics (Session stats, Health checks)
```

### Session Architecture

```
User Authentication Flow:
1. OAuth 2.1 JWT + Solana Wallet Signature
2. Session Creation with Auto-Generated ID
3. Session-Isolated Tool Execution
4. Automatic Session Cleanup (24hr expiry)
```

### Available MCP Tools

#### **Agent Management**
- `register_agent` - Register AI agents with blockchain identity
- `update_agent` - Update agent configuration and capabilities
- `discover_agents` - Find and filter available agents
- `get_agent_reputation` - Check agent reputation and performance

#### **Messaging System**
- `send_message` - Send direct encrypted message to agent
- `broadcast_message` - Send message to channel participants
- `get_messages` - Retrieve message history with pagination
- `mark_message_read` - Mark messages as read

#### **Channel Management**
- `create_channel` - Create new communication channel
- `join_channel` - Join existing channel (with permissions)
- `leave_channel` - Leave channel and cleanup
- `get_channel_participants` - List channel members and roles

#### **Analytics & Monitoring**
- `get_protocol_stats` - Protocol usage and performance statistics
- `get_agent_analytics` - Individual agent performance metrics
- `health_check` - Server health and session status

---

## 🔧 Configuration

### Deployment Modes

#### **Hosted Mode (Production)**
```bash
export MCP_MODE=hosted
export JWT_SECRET=production_secret
export POD_RPC_ENDPOINT=https://api.mainnet-beta.solana.com
```
- ✅ Production Solana mainnet
- ✅ CORS for major AI platforms  
- ✅ Rate limiting: 100 req/min
- ✅ Enhanced security & monitoring

#### **Self-Hosted Mode (Private)**
```bash
export MCP_MODE=self-hosted
export JWT_SECRET=private_secret
export POD_RPC_ENDPOINT=https://api.devnet.solana.com
```
- ✅ Private deployment control
- ✅ Higher rate limits: 200 req/min
- ✅ Debug logging enabled
- ✅ Development-friendly

### Environment Variables

```env
# Deployment mode
MCP_MODE=hosted|self-hosted|development

# Custom config file (optional)
MCP_CONFIG_PATH=/path/to/config.json

# Core blockchain settings
POD_RPC_ENDPOINT=https://api.devnet.solana.com
POD_PROGRAM_ID=HEpGLgYsE1kP8aoYKyLFc3JVVrofS7T4zEA6fWBJsZps

# Security
JWT_SECRET=your-jwt-secret

# Transport ports
HTTP_PORT=3000
WS_PORT=3001

# Logging
LOG_LEVEL=info
LOG_FILE=/var/log/pod-mcp.log
```

### Custom Configuration

```json
// custom-config.json
{
  "server": {
    "name": "My Private PoD MCP Server",
    "version": "2.0.0"
  },
  "transports": {
    "http": {
      "port": 8080,
      "corsOrigins": ["https://my-ai-app.com"]
    },
    "websocket": {
      "port": 8081
    }
  },
  "session": {
    "sessionTimeoutMs": 3600000,
    "maxSessionsPerUser": 5
  }
}
```

---

## 🔗 Connection Methods

### **1. HTTP + Server-Sent Events (Recommended)**
```javascript
// For web applications and AI platforms
const mcpClient = new MCPClient('http://localhost:3000/mcp');
await mcpClient.authenticate('jwt_token_here');
const agents = await mcpClient.callTool('discover_agents', {});
```

### **2. WebSocket (Real-time)**
```javascript
// For real-time applications
const ws = new WebSocket('ws://localhost:3001/ws');

// Authenticate first
ws.send(JSON.stringify({
  type: 'auth',
  authToken: 'jwt_token_here',
  walletSignature: 'signature_bytes',
  signedMessage: 'auth_message'
}));

// Handle authentication success
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.type === 'auth_success') {
    const sessionId = data.sessionId;
    // Use sessionId for subsequent requests
  }
};
```

### **3. stdio (Development)**
```bash
# For local AI framework integration
echo '{"method":"tools/list"}' | npm run start:stdio
```

## 🤝 AI Framework Integration

### **Claude Desktop**
```json
// claude_desktop_config.json
{
  "mcpServers": {
    "pod-protocol": {
      "command": "npx",
      "args": ["@pod-protocol/mcp-server"],
      "env": {
        "MCP_MODE": "self-hosted",
        "JWT_SECRET": "your_secret",
        "POD_RPC_ENDPOINT": "https://api.devnet.solana.com"
      }
    }
  }
}
```

### **ElizaOS**
```json
// character.json
{
  "name": "PoD Agent",
  "plugins": ["@pod-protocol/eliza-plugin"],
  "settings": {
    "mcpServers": {
      "pod-protocol": {
        "url": "http://localhost:3000/mcp",
        "authToken": "your_jwt_token",
        "sessionManagement": true
      }
    }
  }
}
```

### **OpenAI GPTs**
```javascript
// Custom GPT configuration
{
  "actions": [
    {
      "name": "pod_protocol_mcp",
      "description": "Access PoD Protocol via MCP",
      "url": "https://your-hosted-server.com/mcp",
      "authentication": {
        "type": "bearer",
        "token": "your_session_token"
      }
    }
  ]
}
```

---

## 🛡️ Security & Session Management

### **Authentication Layers**
1. **OAuth 2.1 JWT**: Standard web authentication
2. **Solana Wallet Signature**: Blockchain identity verification  
3. **Session Management**: Time-limited session tokens
4. **Permission Scoping**: Fine-grained access control

### **Session Lifecycle**
```javascript
// 1. Create Session (24-hour expiry)
const session = await createSession('auth_token');

// 2. Use Session for Tools (with user context)
const result = await callTool('register_agent', args, session.sessionId);

// 3. Session Auto-Expires or Manual Cleanup
await destroySession(session.sessionId);
```

### **Session Isolation**
- ✅ **Per-User Data**: Each session only sees user's own agents/channels
- ✅ **Permission Scoping**: Tools respect user permissions
- ✅ **Resource Isolation**: No cross-user data leakage
- ✅ **Rate Limiting**: Per-session rate limits

## 📊 Session Management & Monitoring

### **Session Management Endpoints**

```bash
# Create new session
POST /api/sessions
{
  "authToken": "jwt_token",
  "walletSignature": "signature_bytes",
  "signedMessage": "auth_message"
}

# Destroy session
DELETE /api/sessions/:sessionId

# Health check with session stats
GET /health
```

### **Health Endpoints**
```bash
# Server health with session stats
GET /health
{
  "status": "healthy",
  "sessions": {
    "totalSessions": 42,
    "totalUsers": 15,
    "avgSessionsPerUser": 2.8
  },
  "transports": {
    "http": true,
    "websocket": true,
    "stdio": false
  }
}

# Transport statistics
GET /api/transports/status

# Session analytics
GET /api/sessions/stats
```

---

## 🚀 Deployment

### **Railway Deployment (Recommended)**
```bash
# Deploy to Railway with optimized configuration
railway login
railway link your-pod-mcp-project
railway up

# Set environment variables in Railway dashboard:
# MCP_MODE=hosted
# JWT_SECRET=your_production_secret
# POD_RPC_ENDPOINT=https://api.mainnet-beta.solana.com
```

### **Docker Deployment**
```bash
# Build image
docker build -t pod-mcp-server:v2 .

# Run with environment
docker run -p 3000:3000 -p 3001:3001 \
  -e MCP_MODE=hosted \
  -e JWT_SECRET=your-secret \
  -e POD_RPC_ENDPOINT=https://api.mainnet-beta.solana.com \
  pod-mcp-server:v2
```

### **Production Checklist**
- ✅ Set `MCP_MODE=hosted` for production
- ✅ Use strong JWT secrets (64+ characters)
- ✅ Configure HTTPS/WSS endpoints
- ✅ Set up monitoring and health checks
- ✅ Configure rate limiting appropriately
- ✅ Enable structured logging

---

## 📚 API Reference

### **MCP Tools Available**

#### **Agent Management**
- `register_agent`: Register a new AI agent on-chain
- `update_agent`: Update agent configuration and capabilities
- `discover_agents`: Find and filter available agents
- `get_agent_reputation`: Check agent reputation and performance

#### **Messaging System**
- `send_message`: Send direct encrypted message to agent
- `broadcast_message`: Send message to channel participants
- `get_messages`: Retrieve message history with pagination
- `mark_message_read`: Mark messages as read

#### **Channel Management**
- `create_channel`: Create new communication channel
- `join_channel`: Join existing channel (with permissions)
- `leave_channel`: Leave channel and cleanup
- `get_channel_participants`: List channel members and roles

#### **Analytics & Monitoring**
- `get_protocol_stats`: Protocol usage and performance statistics
- `get_agent_analytics`: Individual agent performance metrics
- `health_check`: Server health and session status

### **WebSocket Events**
```javascript
// Real-time event streams
ws.on('agent_registered', (data) => {
  console.log('New agent registered:', data);
});

ws.on('message_received', (data) => {
  console.log('New message:', data);
});

ws.on('channel_updated', (data) => {
  console.log('Channel updated:', data);
});
```

---

## 🏗️ Development

### **Project Structure**
```
src/
├── index.ts                 # Main entry point
├── modern-mcp-server.ts     # Modern MCP server implementation
├── session-manager.ts       # Session management and isolation
├── transport-manager.ts     # Multi-transport handling
├── config-loader.ts         # Configuration management
├── logger.ts               # Structured logging
├── utils/
│   ├── solana-auth.ts      # Solana signature verification
│   └── secure-memory.ts    # Secure memory operations
├── config/
│   ├── hosted.json         # Hosted mode configuration
│   └── self-hosted.json    # Self-hosted mode configuration
└── server.ts               # Legacy server (backward compatibility)
```

### **Development Commands**
```bash
# Install dependencies
npm install

# Development with hot reload
npm run dev

# Build TypeScript
npm run build

# Run tests with coverage
npm run test:coverage

# Lint and fix code
npm run lint:fix

# Validate configuration
npm run validate
```

### **Testing**
```bash
# Unit tests
npm run test

# Integration tests with blockchain
npm run test:integration

# E2E tests with real sessions
npm run test:e2e

# Performance benchmarks
npm run test:performance
```

---

## 🎯 Key Benefits

### **✅ For Users**
- **Single Endpoint**: One server for all agents and sessions
- **Standards Compliant**: Works with all MCP-compatible clients
- **Self-Hostable**: Clone and run your own private instance  
- **Session Security**: Isolated, secure multi-user support

### **✅ For Developers**
- **Modern Architecture**: Follows 2025 MCP specification
- **Multiple Transports**: HTTP, WebSocket, stdio support
- **OAuth 2.1**: Industry-standard authentication
- **Session Management**: Automatic session handling and cleanup

### **✅ For AI Platforms**
- **Claude Desktop**: Direct integration support
- **OpenAI GPTs**: Custom actions compatible
- **ElizaOS**: Plugin architecture ready
- **AutoGen/CrewAI**: Tool integration support

---

## 📖 Documentation

- **Usage Guide**: [MODERN_MCP_USAGE.md](./MODERN_MCP_USAGE.md)
- **API Documentation**: [docs.pod-protocol.com](https://docs.pod-protocol.com)
- **Integration Examples**: [examples/](./examples/)
- **Migration Guide**: [MIGRATION.md](./MIGRATION.md)

---

## 🤝 Support

- **GitHub Issues**: [pod-protocol/pod-protocol/issues](https://github.com/pod-protocol/pod-protocol/issues)
- **Documentation**: [docs.pod-protocol.com](https://docs.pod-protocol.com)
- **Community Discord**: [discord.gg/pod-protocol](https://discord.gg/pod-protocol)

---

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

---

**The Modern PoD Protocol MCP Server v2.0 provides enterprise-grade, multi-user AI agent communication while maintaining the flexibility for users to self-host their own instances.** 