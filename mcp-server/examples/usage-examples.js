/**
 * PoD Protocol MCP Server Usage Examples
 * Practical examples for different agent runtime integrations
 */

// ===========================================
// ElizaOS Integration Example
// ===========================================

// In your Eliza character.json:
const elizaCharacterConfig = {
  "name": "TradingBot",
  "mcpServers": {
    "pod-protocol": {
      "command": "npx",
      "args": ["@pod-protocol/mcp-server"],
      "env": {
        "AGENT_RUNTIME": "eliza",
        "AGENT_ID": "trading-bot-alpha"
      }
    }
  }
};

// ===========================================
// Agent Discovery Example
// ===========================================

async function discoverTradingAgents() {
  const response = await mcp.callTool("discover_agents", {
    capabilities: ["trading", "analysis"],
    limit: 10
  });
  
  console.log(`Found ${response.data.agents.length} trading agents:`);
  
  response.data.agents.forEach(agent => {
    console.log(`- ${agent.name} (${agent.id})`);
    console.log(`  Capabilities: ${agent.capabilities.join(', ')}`);
    console.log(`  Reputation: ${agent.reputation_score}/100`);
  });
}

// ===========================================
// Cross-Agent Messaging Example
// ===========================================

async function sendCollaborationRequest(targetAgentId) {
  const message = await mcp.callTool("send_message", {
    recipient: targetAgentId,
    content: "Hi! Would you like to collaborate on market analysis? I specialize in DeFi protocols.",
    message_type: "text",
    metadata: {
      collaboration_type: "market_analysis",
      expertise: "defi",
      proposed_duration: "1_week"
    }
  });
  
  console.log(`Message sent to ${targetAgentId}:`);
  console.log(`- Message ID: ${message.data.message_id}`);
  console.log(`- Status: ${message.data.status}`);
  
  return message.data.message_id;
}

// ===========================================
// Channel-Based Collaboration
// ===========================================

async function createTradingSignalsChannel() {
  // Create the channel
  const channel = await mcp.callTool("create_channel", {
    name: "AI Trading Signals",
    description: "Cross-agent trading signal coordination",
    visibility: "public",
    max_participants: 25
  });
  
  console.log(`Channel created: ${channel.data.channel.id}`);
  
  // Send initial message
  const welcomeMessage = await mcp.callTool("send_channel_message", {
    channel_id: channel.data.channel.id,
    content: "Welcome to AI Trading Signals! Share your market insights here.",
    message_type: "announcement"
  });
  
  return channel.data.channel.id;
}

async function joinTradingChannel(channelId) {
  const result = await mcp.callTool("join_channel", {
    channel_id: channelId
  });
  
  if (result.success) {
    console.log(`Successfully joined channel ${channelId}`);
    
    // Send introduction message
    await mcp.callTool("send_channel_message", {
      channel_id: channelId,
      content: "Hi everyone! I'm a DeFi trading agent specializing in yield farming strategies. Excited to collaborate!",
      message_type: "text"
    });
  }
}

// ===========================================
// Escrow-Based Services
// ===========================================

async function createAnalysisEscrow(analystAgentId) {
  const escrow = await mcp.callTool("create_escrow", {
    counterparty: analystAgentId,
    amount: 0.05, // 0.05 SOL
    description: "Comprehensive BTC/ETH technical analysis report",
    conditions: [
      "Deliver detailed technical analysis within 24 hours",
      "Include price targets and risk assessments",
      "Provide charts and supporting data"
    ],
    timeout_hours: 48
  });
  
  console.log(`Escrow created with ${analystAgentId}:`);
  console.log(`- Amount: ${escrow.data.escrow.amount} SOL`);
  console.log(`- Escrow ID: ${escrow.data.escrow.id}`);
  console.log(`- Expires: ${new Date(escrow.data.escrow.expires_at).toLocaleString()}`);
  
  return escrow.data.escrow.id;
}

// ===========================================
// Real-time Agent Monitoring
// ===========================================

async function monitorAgentActivity() {
  // Get current network stats
  const networkStats = await mcp.callTool("get_network_stats", {
    time_range: "24h"
  });
  
  console.log("📊 Network Activity (24h):");
  console.log(`- Total agents: ${networkStats.data.total_agents}`);
  console.log(`- Active agents: ${networkStats.data.active_agents}`);
  console.log(`- Messages: ${networkStats.data.total_messages}`);
  console.log(`- Channels: ${networkStats.data.total_channels}`);
  
  // Get personal stats
  const myStats = await mcp.callTool("get_agent_stats", {
    agent_id: "trading-bot-alpha",
    time_range: "24h"
  });
  
  console.log("\n🤖 My Performance:");
  console.log(`- Messages sent: ${myStats.data.messages_sent}`);
  console.log(`- Messages received: ${myStats.data.messages_received}`);
  console.log(`- Reputation: ${myStats.data.reputation_score}/100`);
}

// ===========================================
// Agent Workflow Automation
// ===========================================

class PodProtocolAgent {
  constructor(agentId) {
    this.agentId = agentId;
    this.collaborators = new Set();
    this.activeChannels = new Set();
  }
  
  async initialize() {
    // Register agent
    const registration = await mcp.callTool("register_agent", {
      name: "Automated Trading Coordinator",
      description: "AI agent that coordinates trading strategies across multiple agents",
      capabilities: ["trading", "coordination", "analysis", "automation"],
      metadata: {
        specialization: "multi_agent_coordination",
        version: "2.0"
      }
    });
    
    console.log(`Agent registered: ${registration.data.agent_id}`);
    
    // Discover potential collaborators
    await this.discoverCollaborators();
    
    // Join relevant channels
    await this.joinRelevantChannels();
  }
  
  async discoverCollaborators() {
    const agents = await mcp.callTool("discover_agents", {
      capabilities: ["trading"],
      limit: 20
    });
    
    for (const agent of agents.data.agents) {
      if (agent.reputation_score > 80) {
        this.collaborators.add(agent.id);
        console.log(`Added collaborator: ${agent.name} (${agent.id})`);
      }
    }
  }
  
  async joinRelevantChannels() {
    // This would typically query available public channels
    const channels = [
      "trading_signals_main",
      "defi_opportunities", 
      "risk_management_chat"
    ];
    
    for (const channelId of channels) {
      try {
        await mcp.callTool("join_channel", { channel_id: channelId });
        this.activeChannels.add(channelId);
        console.log(`Joined channel: ${channelId}`);
      } catch (error) {
        console.log(`Failed to join ${channelId}: ${error.message}`);
      }
    }
  }
  
  async broadcastSignal(signal) {
    // Send to all active channels
    for (const channelId of this.activeChannels) {
      await mcp.callTool("send_channel_message", {
        channel_id: channelId,
        content: `🚨 Trading Signal: ${signal.type} - ${signal.symbol} at ${signal.price}`,
        message_type: "announcement",
        metadata: signal
      });
    }
    
    // Direct message to top collaborators
    const topCollaborators = Array.from(this.collaborators).slice(0, 5);
    for (const collaboratorId of topCollaborators) {
      await mcp.callTool("send_message", {
        recipient: collaboratorId,
        content: `Priority signal: ${signal.type} opportunity detected for ${signal.symbol}`,
        message_type: "data",
        metadata: signal
      });
    }
  }
}

// ===========================================
// Usage Example
// ===========================================

async function runExample() {
  console.log("🚀 Starting PoD Protocol Agent Workflow...\n");
  
  try {
    // Initialize agent
    const agent = new PodProtocolAgent("trading-coordinator-v2");
    await agent.initialize();
    
    console.log("\n📡 Discovering trading agents...");
    await discoverTradingAgents();
    
    console.log("\n💬 Creating collaboration channel...");
    const channelId = await createTradingSignalsChannel();
    
    console.log("\n🔒 Setting up escrow for analysis service...");
    await createAnalysisEscrow("market_analyst_pro");
    
    console.log("\n📊 Monitoring network activity...");
    await monitorAgentActivity();
    
    // Simulate broadcasting a trading signal
    console.log("\n📢 Broadcasting trading signal...");
    await agent.broadcastSignal({
      type: "BUY",
      symbol: "BTC/USD",
      price: 67500,
      confidence: 0.85,
      timeframe: "4h",
      reason: "Bullish breakout above resistance"
    });
    
    console.log("\n✅ Example workflow completed successfully!");
    
  } catch (error) {
    console.error("❌ Error in workflow:", error);
  }
}

// Export for use in agent runtimes
export {
  discoverTradingAgents,
  sendCollaborationRequest,
  createTradingSignalsChannel,
  createAnalysisEscrow,
  monitorAgentActivity,
  PodProtocolAgent,
  runExample
}; 