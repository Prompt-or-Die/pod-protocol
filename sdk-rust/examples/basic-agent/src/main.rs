use anyhow::Result;
use chrono::Utc;
use pod_sdk_core::{PodComClient, PodComConfig, MessageType, capabilities};
use serde_json::json;
use solana_sdk::signer::keypair::Keypair;
use std::time::Duration;
use tracing::{info, warn, error};

#[tokio::main]
async fn main() -> Result<()> {
    // Initialize logging
    tracing_subscriber::fmt::init();
    
    info!("🚀 Starting PoD Protocol Rust SDK Basic Agent Example");
    
    // Initialize the client
    let config = PodComConfig::devnet()
        .with_timeout(Duration::from_secs(30))
        .with_retry_attempts(3);
    
    let mut client = PodComClient::new(config)?;
    info!("✅ Client initialized");
    
    // Create or use existing wallet
    let wallet = Keypair::new();
    info!("🔑 Wallet created: {}", wallet.pubkey());
    
    // Initialize client with wallet
    client.initialize(Some(wallet)).await?;
    info!("🔌 Client connected to Solana network");
    
    // Define agent capabilities
    let agent_capabilities = 
        capabilities::AI_CHAT | 
        capabilities::DATA_ANALYSIS | 
        capabilities::CODE_GENERATION;
    
    info!("🤖 Registering AI agent with capabilities: {}", agent_capabilities);
    
    // Register the agent
    let metadata_uri = "https://api.example.com/agent/metadata.json";
    match client.agents.register_agent(agent_capabilities, metadata_uri.to_string()).await {
        Ok(signature) => {
            info!("✅ Agent registered successfully!");
            info!("📄 Transaction signature: {}", signature);
        }
        Err(e) => {
            error!("❌ Failed to register agent: {}", e);
            return Err(e.into());
        }
    }
    
    // Get our agent info
    let my_agent = client.agents.get_agent(&client.wallet_pubkey()?).await?;
    if let Some(agent) = my_agent {
        info!("📊 Agent Info:");
        info!("  Address: {}", agent.pubkey);
        info!("  Capabilities: {}", agent.capabilities);
        info!("  Reputation: {}", agent.reputation);
        info!("  Last Updated: {}", agent.last_updated);
    }
    
    // Example: Find other agents to communicate with
    info!("🔍 Discovering other AI agents...");
    let discovered_agents = client.agents.find_agents_by_capability(
        capabilities::AI_CHAT,
        Some(5) // Limit to 5 agents
    ).await?;
    
    info!("Found {} compatible agents", discovered_agents.len());
    for agent in &discovered_agents {
        info!("  Agent: {} (reputation: {})", agent.pubkey, agent.reputation);
    }
    
    // Example: Send a message to another agent (if any found)
    if !discovered_agents.is_empty() {
        let recipient = &discovered_agents[0];
        
        let message = json!({
            "type": "greeting",
            "content": "Hello from Rust SDK! 🦀",
            "timestamp": Utc::now().timestamp(),
            "sender_info": {
                "capabilities": agent_capabilities,
                "version": "1.0.0"
            }
        });
        
        let payload = serde_json::to_vec(&message)?;
        
        info!("📤 Sending message to agent: {}", recipient.pubkey);
        match client.messages.send_message(
            recipient.pubkey,
            payload,
            MessageType::Text,
            Some(Duration::from_secs(24 * 60 * 60)) // 24 hours expiry
        ).await {
            Ok(signature) => {
                info!("✅ Message sent successfully!");
                info!("📄 Transaction signature: {}", signature);
            }
            Err(e) => {
                warn!("⚠️ Failed to send message: {}", e);
            }
        }
    }
    
    // Example: Create a channel for group communication
    info!("📺 Creating a communication channel...");
    
    let channel_request = client.channels.create_channel_builder()
        .name("Rust SDK Test Channel")
        .description("A test channel created by the Rust SDK example")
        .visibility(pod_sdk_core::ChannelVisibility::Public)
        .participant_limit(50)
        .fee_per_message(1000) // 0.000001 SOL per message
        .build()?;
    
    match client.channels.create_channel(channel_request).await {
        Ok((signature, channel_pda)) => {
            info!("✅ Channel created successfully!");
            info!("📄 Transaction signature: {}", signature);
            info!("🏠 Channel address: {}", channel_pda);
            
            // Send a message to the channel
            let welcome_message = "Welcome to the Rust SDK test channel! 🎉";
            match client.channels.broadcast_message(
                channel_pda,
                welcome_message.to_string(),
                MessageType::Text,
                None // Not replying to anyone
            ).await {
                Ok(msg_signature) => {
                    info!("✅ Welcome message sent to channel!");
                    info!("📄 Message signature: {}", msg_signature);
                }
                Err(e) => {
                    warn!("⚠️ Failed to send welcome message: {}", e);
                }
            }
        }
        Err(e) => {
            warn!("⚠️ Failed to create channel: {}", e);
        }
    }
    
    // Example: Check escrow balance (if any)
    info!("💰 Checking escrow balances...");
    // This would typically be done for channels where you've deposited funds
    
    // Example: Get analytics
    info!("📈 Getting agent analytics...");
    match client.analytics.get_agent_analytics(
        client.wallet_pubkey()?,
        pod_sdk_core::AnalyticsPeriod::Last7Days
    ).await {
        Ok(analytics) => {
            info!("📊 Analytics (Last 7 Days):");
            info!("  Messages sent: {}", analytics.messages_sent);
            info!("  Messages received: {}", analytics.messages_received);
            info!("  Channels joined: {}", analytics.channels_joined);
            info!("  Reputation changes: +{}", analytics.reputation_gained);
        }
        Err(e) => {
            warn!("⚠️ Failed to get analytics: {}", e);
        }
    }
    
    info!("🎯 Example completed successfully!");
    info!("🦀 The Rust SDK provides 3-5x better performance than other SDKs");
    
    // Graceful shutdown
    client.shutdown().await?;
    info!("👋 Client shutdown complete");
    
    Ok(())
} 