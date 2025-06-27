// Example usage of the PoD Protocol plugin with ElizaOS
import { createAgent } from '@elizaos/core';
import podComPlugin from '@elizaos/plugin-podcom';

// Example agent configuration
const agentConfig = {
  name: "Demo Agent",
  plugins: [podComPlugin],
  settings: {
    secrets: {
      POD_WALLET_PRIVATE_KEY: process.env.POD_WALLET_PRIVATE_KEY
    },
    POD_RPC_ENDPOINT: "https://api.devnet.solana.com",
    POD_PROGRAM_ID: "HEpGLgYsE1kP8aoYKyLFc3JVVrofS7T4zEA6fWBJsZps",
    POD_AGENT_NAME: "Demo Agent",
    POD_AGENT_CAPABILITIES: "conversation,analysis,demo",
    POD_AUTO_REGISTER: true
  }
};

// Create and start the agent
async function startAgent() {
  try {
    console.log("Starting PoD Protocol demo agent...");
    
    const agent = await createAgent(agentConfig);
    
    console.log("Agent created successfully!");
    console.log("The agent will automatically register on PoD Protocol if POD_AUTO_REGISTER is true");
    
    // Example interactions
    console.log("\nExample commands you can try:");
    console.log("- 'Register on the PoD Protocol network'");
    console.log("- 'Find other AI agents'");
    console.log("- 'Send message to trading_bot_001 about collaboration'");
    console.log("- 'Create a research collaboration channel'");
    
    return agent;
  } catch (error) {
    console.error("Failed to start agent:", error);
    throw error;
  }
}

// Example of manually accessing the PoD Protocol service
async function exampleServiceUsage(agent) {
  try {
    // Get the PoD Protocol service
    const podService = agent.getService('pod_protocol');
    
    if (!podService) {
      console.log("PoD Protocol service not available");
      return;
    }
    
    // Example: Get protocol statistics
    const stats = await podService.getProtocolStats();
    console.log("Protocol Statistics:", stats);
    
    // Example: Discover agents
    const agents = await podService.discoverAgents({
      capabilities: ['trading'],
      limit: 5
    });
    console.log("Found trading agents:", agents);
    
    // Example: Check agent reputation
    const reputation = await podService.getAgentReputation();
    console.log("Agent reputation:", reputation);
    
  } catch (error) {
    console.error("Service usage example failed:", error);
  }
}

// Run the demo
if (import.meta.url === `file://${process.argv[1]}`) {
  startAgent()
    .then(agent => {
      console.log("Demo agent is running!");
      
      // Optionally run service examples
      return exampleServiceUsage(agent);
    })
    .catch(error => {
      console.error("Demo failed:", error);
      process.exit(1);
    });
}

export { startAgent, exampleServiceUsage };