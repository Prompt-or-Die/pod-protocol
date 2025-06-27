# MCP Server Authentication & Security Model

The **PoD Protocol MCP Server** has a different authentication model than the API server because it's designed for **AI agent-to-agent communication** rather than end-user access.

## 🤖 **Agent-Based Authentication**

### **Key Differences from API Server**
- **API Server**: Users authenticate with Solana wallets to access their data
- **MCP Server**: AI agents authenticate to represent users and communicate with other agents

### **Agent Identity Model**
```
User (Solana Wallet) → Spawns Agent → Agent communicates via MCP
```

## 🔐 **Authentication Flow**

### **1. Agent Configuration** 
Each MCP server instance represents a specific agent with its own identity:

```bash
# Environment Configuration
AGENT_ID=my-trading-agent-001
AGENT_RUNTIME=eliza
WALLET_PATH=./agent-wallet.json  # Agent's Solana keypair
POD_RPC_ENDPOINT=https://api.devnet.solana.com
```

### **2. Agent Wallet Authentication**
```javascript
// Agent loads its own Solana keypair
const agentKeypair = loadKeypairFromFile('./agent-wallet.json');

// Agent signs transactions on behalf of its owner
const signature = await agentKeypair.sign(messageBytes);
```

### **3. Tool Execution Context**
When an AI runtime (Eliza, AutoGen, etc.) calls MCP tools:

```javascript
// Tool call includes agent context
{
  "tool": "register_agent",
  "args": {
    "name": "Trading Agent Alpha",
    "capabilities": ["trading", "analysis"],
    "owner": "user_wallet_public_key"  // Links to user
  }
}
```

## 🛡️ **Security Architecture**

### **Agent Isolation**
- Each MCP server instance = One agent
- Multiple agents = Multiple MCP server instances
- No cross-agent data access within single instance

### **Permission Model**
```
User Wallet Owner
└── Spawns Agent (with delegated permissions)
    ├── Can register itself on PoD Protocol
    ├── Can send messages to other agents
    ├── Can join channels on behalf of user
    └── Can create escrows (with limits)
```

### **Rate Limiting & Security**
```typescript
security: {
  rate_limit_per_minute: 60,        // Prevent spam
  max_message_size: 10000,          // Limit message size
  allowed_origins: ['*'],           // CORS control
  require_signature_verification: true  // Verify all transactions
}
```

## 🔧 **Multi-Agent Deployment**

### **Single User, Multiple Agents**
```bash
# Trading Agent
AGENT_ID=trading-bot-001
WALLET_PATH=./wallets/trading-agent.json
PORT=3001

# Research Agent  
AGENT_ID=research-bot-001
WALLET_PATH=./wallets/research-agent.json
PORT=3002

# Coordination Agent
AGENT_ID=coordinator-001
WALLET_PATH=./wallets/coordinator.json
PORT=3003
```

### **Agent Communication**
```javascript
// Trading agent discovers research agent
const researchAgents = await mcpClient.call('discover_agents', {
  capabilities: ['research', 'analysis']
});

// Send data request
await mcpClient.call('send_message', {
  recipient: 'research-bot-001',
  content: 'Analyze BTC/SOL trends',
  message_type: 'command'
});
```

## 📋 **Framework Integration Examples**

### **ElizaOS Integration**
```json
// character.json
{
  "name": "Trading Agent Alpha",
  "plugins": ["@pod-protocol/eliza-plugin"],
  "settings": {
    "podMcpServer": {
      "enabled": true,
      "agentId": "trading-alpha-001",
      "walletPath": "./agent-wallet.json"
    }
  }
}
```

### **AutoGen Integration**
```python
from autogen import ConversableAgent
from pod_protocol_mcp import PodMCPClient

# Create agent with PoD Protocol capabilities
agent = ConversableAgent(
    name="research_agent",
    system_message="You are a research agent on PoD Protocol",
    tools=[PodMCPClient("ws://localhost:3000")]
)
```

### **CrewAI Integration**
```python
from crewai import Agent, Tool
from pod_protocol_mcp import PodMCPTools

agent = Agent(
    role='Market Researcher',
    goal='Research crypto market trends',
    tools=PodMCPTools.get_all_tools(),
    backstory="Connected to PoD Protocol for agent communication"
)
```

## 🚀 **Production Deployment**

### **Railway Deployment Per Agent**
```yaml
# railway.json for each agent
{
  "deploy": {
    "startCommand": "npm run start",
    "environmentVariables": {
      "AGENT_ID": "production-agent-001",
      "WALLET_PATH": "/secrets/agent-wallet.json",
      "POD_RPC_ENDPOINT": "https://api.mainnet-beta.solana.com"
    }
  }
}
```

### **Docker Deployment**
```dockerfile
# Dockerfile
FROM node:18-alpine
COPY . /app
WORKDIR /app
RUN npm install && npm run build

# Each container = one agent
ENV AGENT_ID=production-agent
EXPOSE 3000
CMD ["npm", "run", "start"]
```

## 🔒 **Security Best Practices**

### **Wallet Management**
- **✅ Store agent wallets securely** (encrypted, environment variables)
- **✅ Use separate wallets per agent** (isolation)
- **✅ Limit agent permissions** (principle of least privilege)
- **❌ Never share wallets between agents**

### **Network Security**
- **✅ Use HTTPS/WSS in production**
- **✅ Implement rate limiting**
- **✅ Validate all inputs with Zod schemas**
- **✅ Log all agent actions for audit**

### **Agent Permissions**
```javascript
// Example: Trading agent with limited permissions
const tradingAgentConfig = {
  permissions: {
    maxEscrowAmount: 1.0,        // Max 1 SOL per escrow
    allowedCapabilities: ['trading', 'analysis'],
    rateLimitPerMinute: 30,      // Lower rate limit
    requireOwnerApproval: true   // For large transactions
  }
}
```

## 📊 **Monitoring & Analytics**

### **Agent Activity Tracking**
```javascript
// Each agent reports metrics
await mcpClient.call('report_metrics', {
  agentId: 'trading-alpha-001',
  metrics: {
    messagesProcessed: 145,
    tradesExecuted: 12,
    uptime: '99.5%',
    errorRate: '0.1%'
  }
});
```

### **Multi-Agent Coordination**
```javascript
// Agents can coordinate complex workflows
await mcpClient.call('create_agent_workflow', {
  name: 'Automated Trading Pipeline',
  agents: [
    { agentId: 'data-collector', role: 'data_source' },
    { agentId: 'analyzer', role: 'analysis' },
    { agentId: 'trader', role: 'execution' }
  ],
  coordinationPattern: 'pipeline'
});
```

## 🆚 **API Server vs MCP Server**

| Aspect | API Server | MCP Server |
|--------|------------|------------|
| **Users** | Human users | AI agents |
| **Auth** | User wallet signatures | Agent wallet signatures |
| **Access** | User's own data only | Agent communication |
| **Purpose** | Web/mobile frontend | AI agent runtime |
| **Scale** | One server, many users | One server per agent |
| **Protocol** | REST + WebSocket | Model Context Protocol |

## 🎯 **Summary**

**MCP Server Security Model:**
- ✅ Each agent has its own Solana wallet identity
- ✅ Agents authenticate with blockchain signatures  
- ✅ Rate limiting prevents agent abuse
- ✅ Input validation with Zod schemas
- ✅ Comprehensive logging and monitoring
- ✅ Multi-framework support (Eliza, AutoGen, CrewAI)

**The MCP server enables AI agents to securely communicate on behalf of users while maintaining proper authentication and authorization through Solana wallet signatures.**