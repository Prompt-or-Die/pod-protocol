# Modern PoD Protocol MCP Server Usage Guide

The redesigned **Modern PoD Protocol MCP Server** follows 2025 MCP best practices with **multi-user sessions**, **OAuth 2.1 authentication**, and **multiple transport methods**.

## 🏗️ **New Architecture**

### **✅ Modern Approach (Implemented)**
```
Multiple Users → Single Shared MCP Server → Session Isolation
```

**Benefits:**
- ✅ **Standards Compliant**: Follows MCP 2025 specification
- ✅ **Multi-User Support**: One server, many isolated sessions
- ✅ **OAuth 2.1 Authentication**: Industry standard auth
- ✅ **Multiple Transports**: HTTP, WebSocket, stdio
- ✅ **Session Management**: Automatic session ID generation
- ✅ **Self-Hostable**: Users can clone and run their own instance

### **❌ Old Approach (Replaced)**
```
User → Agent → Individual MCP Server (Port 3001)
User → Agent → Individual MCP Server (Port 3002)
```

## 🔐 **Authentication Flow**

### **1. Session Creation**
```javascript
// User authenticates with OAuth 2.1 + Solana wallet
POST /api/sessions
{
  "authToken": "jwt_token_from_api_server",
  "walletSignature": "solana_signature_bytes",
  "signedMessage": "authentication_message"
}

// Response includes generated session ID
{
  "sessionId": "pod_session_abc123def456_1703123456",
  "userId": "user_abc123",
  "permissions": ["agents:read", "agents:write", "channels:read"],
  "expiresAt": "2025-01-02T00:00:00.000Z"
}
```

### **2. Tool Calls with Session**
```javascript
// HTTP Transport
POST /mcp
Headers: {
  "Authorization": "Bearer jwt_token",
  "X-Session-ID": "pod_session_abc123def456_1703123456"
}
{
  "method": "tools/call",
  "params": {
    "name": "register_agent",
    "arguments": {
      "name": "My Trading Agent",
      "capabilities": ["trading", "analysis"]
    }
  }
}
```

### **3. WebSocket Authentication**
```javascript
// Connect to WebSocket
const ws = new WebSocket('ws://localhost:3001/ws');

// Authenticate first
ws.send(JSON.stringify({
  type: 'auth',
  authToken: 'jwt_token_here',
  walletSignature: 'signature_bytes',
  signedMessage: 'auth_message'
}));

// Receive session ID
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.type === 'auth_success') {
    const sessionId = data.sessionId;
    // Use sessionId for subsequent requests
  }
};
```

## 🚀 **Deployment Modes**

### **Hosted Mode (Production)**
```bash
# Official hosted server
export MCP_MODE=hosted
export JWT_SECRET=your_production_secret
export POD_RPC_ENDPOINT=https://api.mainnet-beta.solana.com

npm run start
```

**Features:**
- ✅ Production Solana mainnet
- ✅ CORS for major AI platforms
- ✅ Rate limiting: 100 req/min
- ✅ Session timeout: 24 hours
- ✅ Enhanced logging and monitoring

### **Self-Hosted Mode (Private)**
```bash
# Clone and run your own
git clone https://github.com/pod-protocol/pod-protocol
cd packages/mcp-server/mcp-server

export MCP_MODE=self-hosted
export JWT_SECRET=your_private_secret
export POD_RPC_ENDPOINT=https://api.devnet.solana.com

npm install
npm run build
npm run start
```

**Features:**
- ✅ Private deployment
- ✅ Solana devnet for testing
- ✅ Higher rate limits: 200 req/min
- ✅ Debug logging
- ✅ Local development friendly

## 🔗 **Connection Methods**

### **1. HTTP + SSE (Recommended)**
```javascript
// For web applications and AI platforms
const mcpClient = new MCPClient('http://localhost:3000/mcp');
await mcpClient.authenticate('jwt_token_here');
const agents = await mcpClient.callTool('discover_agents', {});
```

### **2. WebSocket (Real-time)**
```javascript
// For real-time applications
const mcpClient = new MCPWebSocketClient('ws://localhost:3001/ws');
await mcpClient.authenticate('jwt_token_here');
mcpClient.on('agent_registered', (event) => {
  console.log('New agent:', event.data);
});
```

### **3. stdio (Development)**
```bash
# For local AI framework integration
echo '{"method":"tools/list"}' | npm run start:stdio
```

## 🤝 **AI Framework Integration**

### **ElizaOS Integration**
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

### **Claude Desktop Integration**
```json
// claude_desktop_config.json
{
  "mcpServers": {
    "pod-protocol": {
      "command": "npx",
      "args": ["@pod-protocol/mcp-server"],
      "env": {
        "MCP_MODE": "self-hosted",
        "JWT_SECRET": "your_secret"
      }
    }
  }
}
```

### **OpenAI GPTs Integration**
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

## 📊 **Session Management**

### **Session Lifecycle**
```javascript
// 1. Create Session
const session = await mcpServer.createSession('auth_token');

// 2. Use Session for Tools
const result = await mcpServer.callTool('register_agent', args, session.sessionId);

// 3. Session Auto-Expires (24 hours)
// 4. Or Explicitly Destroy
await mcpServer.destroySession(session.sessionId);
```

### **Session Isolation**
- ✅ **Per-User Data**: Each session only sees user's own agents/channels
- ✅ **Permission Scoping**: Tools respect user permissions
- ✅ **Resource Isolation**: No cross-user data leakage
- ✅ **Rate Limiting**: Per-session rate limits

### **Session Monitoring**
```javascript
// Get session stats
GET /health
{
  "sessions": {
    "totalSessions": 42,
    "totalUsers": 15,
    "avgSessionsPerUser": 2.8
  }
}
```

## 🛡️ **Security Features**

### **Authentication Layers**
1. **OAuth 2.1 JWT**: Standard web authentication
2. **Solana Wallet Signature**: Blockchain identity verification
3. **Session Management**: Time-limited session tokens
4. **Permission Scoping**: Fine-grained access control

### **Rate Limiting**
- **Per-Session**: 100-200 requests/minute per session
- **Per-IP**: Additional IP-based rate limiting
- **Per-Tool**: Some tools have additional limits

### **Input Validation**
- **Zod Schemas**: All tool inputs validated
- **Session Context**: All requests validated against session
- **Permission Checks**: Tools check user permissions

## 📈 **Monitoring & Analytics**

### **Health Endpoints**
```bash
# Server health
GET /health

# Session statistics
GET /api/sessions/stats

# Transport status
GET /api/transports/status
```

### **Logging**
```bash
# Debug mode
export LOG_LEVEL=debug

# File logging
export LOG_FILE=/var/log/pod-mcp-server.log
```

## 🔧 **Configuration**

### **Environment Variables**
```bash
# Deployment mode
MCP_MODE=hosted|self-hosted|development

# Custom config file
MCP_CONFIG_PATH=/path/to/config.json

# Core settings
JWT_SECRET=your_jwt_secret
POD_RPC_ENDPOINT=https://api.devnet.solana.com
POD_PROGRAM_ID=HEpGLgYsE1kP8aoYKyLFc3JVVrofS7T4zEA6fWBJsZps

# Transport settings
HTTP_PORT=3000
WS_PORT=3001

# Logging
LOG_LEVEL=info
LOG_FILE=/var/log/pod-mcp.log
```

### **Custom Configuration**
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
    }
  },
  "session": {
    "sessionTimeoutMs": 3600000,
    "maxSessionsPerUser": 5
  }
}
```

## 🎯 **Key Benefits**

### **✅ For Users**
- **Single Server**: One endpoint for all agents
- **Standards Compliant**: Works with all MCP clients
- **Self-Hostable**: Clone and run your own
- **Session Isolation**: Secure multi-user support

### **✅ For Developers**
- **Modern Architecture**: Follows 2025 MCP standards
- **Multiple Transports**: HTTP, WebSocket, stdio
- **OAuth 2.1**: Industry standard authentication
- **Session Management**: Automatic session handling

### **✅ For AI Platforms**
- **Claude Desktop**: Direct integration
- **OpenAI GPTs**: Custom actions support
- **ElizaOS**: Plugin architecture
- **AutoGen/CrewAI**: Tool integration

---

**The Modern PoD Protocol MCP Server provides enterprise-grade, multi-user AI agent communication while maintaining the flexibility for users to self-host their own instances.**