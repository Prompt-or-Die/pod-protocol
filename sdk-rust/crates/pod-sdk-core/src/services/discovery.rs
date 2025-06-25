//! # Discovery Service
//!
//! Service for agent discovery and network topology management on the PoD Protocol.
//! Provides functionality for finding agents, managing peer connections, and network routing.

use std::sync::Arc;
use std::collections::{HashMap, HashSet};

use anchor_client::Program;
use async_trait::async_trait;
use solana_sdk::{
    pubkey::Pubkey,
    signer::{keypair::Keypair, Signer},
};
use serde::{Deserialize, Serialize};

use pod_sdk_types::{
    AgentAccount, ChannelAccount, capabilities,
};

use crate::{
    error::{PodComError, Result},
    services::base::{BaseService, ServiceBase, ServiceConfig, ServiceHealth, ServiceMetrics},
    utils::network::{calculate_distance, NetworkTopology},
};

/// Service for agent discovery and network management
#[derive(Debug)]
pub struct DiscoveryService {
    base: ServiceBase,
    agent_registry: Arc<tokio::sync::RwLock<AgentRegistry>>,
    topology_cache: Arc<tokio::sync::RwLock<TopologyCache>>,
}

impl DiscoveryService {
    /// Create a new discovery service
    pub fn new(config: ServiceConfig) -> Self {
        Self {
            base: ServiceBase::new(config),
            agent_registry: Arc::new(tokio::sync::RwLock::new(AgentRegistry::new())),
            topology_cache: Arc::new(tokio::sync::RwLock::new(TopologyCache::new())),
        }
    }

    /// Discover agents by capabilities
    pub async fn discover_agents_by_capability(
        &self,
        capability: AgentCapability,
        limit: Option<u32>,
    ) -> Result<Vec<AgentDiscoveryResult>> {
        let operation_name = "discover_agents_by_capability";
        
        self.base.execute_operation(operation_name, async {
            let program = self.base.program()?;
            
            // Get all agent accounts
            let accounts = program.accounts::<AgentAccount>(vec![]).await?;
            
            let mut matching_agents = Vec::new();
            
            for (address, agent) in accounts {
                if agent.capabilities.contains(&capability) && agent.is_active {
                    let discovery_result = AgentDiscoveryResult {
                        address,
                        name: agent.name.clone(),
                        description: agent.description.clone(),
                        capabilities: agent.capabilities.clone(),
                        reputation_score: agent.reputation_score,
                        last_seen: agent.updated_at,
                        availability_status: self.get_agent_availability(&address).await?,
                        connection_info: self.get_agent_connection_info(&address).await?,
                    };
                    matching_agents.push(discovery_result);
                }
            }
            
            // Sort by reputation score (descending)
            matching_agents.sort_by(|a, b| b.reputation_score.cmp(&a.reputation_score));
            
            // Apply limit if specified
            if let Some(limit) = limit {
                matching_agents.truncate(limit as usize);
            }
            
            tracing::info!(
                capability = ?capability,
                found_count = matching_agents.len(),
                "Agent discovery by capability completed"
            );
            
            Ok(matching_agents)
        }).await
    }

    /// Search agents by query
    pub async fn search_agents(&self, query: DiscoveryQuery) -> Result<Vec<AgentDiscoveryResult>> {
        let operation_name = "search_agents";
        
        self.base.execute_operation(operation_name, async {
            let program = self.base.program()?;
            
            // Get all agent accounts
            let accounts = program.accounts::<AgentAccount>(vec![]).await?;
            
            let mut matching_agents = Vec::new();
            
            for (address, agent) in accounts {
                if self.matches_query(&agent, &query) {
                    let discovery_result = AgentDiscoveryResult {
                        address,
                        name: agent.name.clone(),
                        description: agent.description.clone(),
                        capabilities: agent.capabilities.clone(),
                        reputation_score: agent.reputation_score,
                        last_seen: agent.updated_at,
                        availability_status: self.get_agent_availability(&address).await?,
                        connection_info: self.get_agent_connection_info(&address).await?,
                    };
                    matching_agents.push(discovery_result);
                }
            }
            
            // Apply query sorting and filtering
            matching_agents = self.apply_query_filters(matching_agents, &query);
            
            tracing::info!(
                query = ?query,
                found_count = matching_agents.len(),
                "Agent search completed"
            );
            
            Ok(matching_agents)
        }).await
    }

    /// Get nearby agents (by network topology)
    pub async fn get_nearby_agents(
        &self,
        reference_agent: &Pubkey,
        max_distance: u32,
        limit: Option<u32>,
    ) -> Result<Vec<NearbyAgentResult>> {
        let operation_name = "get_nearby_agents";
        
        self.base.execute_operation(operation_name, async {
            let topology = self.get_network_topology().await?;
            
            let nearby_agents = topology.find_nearby_agents(reference_agent, max_distance, limit);
            
            let mut results = Vec::new();
            for (agent_address, distance) in nearby_agents {
                if let Ok(availability) = self.get_agent_availability(&agent_address).await {
                    results.push(NearbyAgentResult {
                        address: agent_address,
                        distance,
                        availability_status: availability,
                        connection_strength: self.calculate_connection_strength(&agent_address, reference_agent).await?,
                    });
                }
            }
            
            // Sort by distance (closest first)
            results.sort_by_key(|r| r.distance);
            
            Ok(results)
        }).await
    }

    /// Get agent recommendations for a specific agent
    pub async fn get_agent_recommendations(
        &self,
        agent_address: &Pubkey,
        recommendation_type: RecommendationType,
        limit: Option<u32>,
    ) -> Result<Vec<AgentRecommendation>> {
        let operation_name = "get_agent_recommendations";
        
        self.base.execute_operation(operation_name, async {
            let program = self.base.program()?;
            
            let agent_account = program.account::<AgentAccount>(*agent_address)?;
            
            let recommendations = match recommendation_type {
                RecommendationType::SimilarCapabilities => {
                    self.recommend_by_capabilities(&agent_account).await?
                },
                RecommendationType::ComplementarySkills => {
                    self.recommend_complementary_agents(&agent_account).await?
                },
                RecommendationType::HighReputation => {
                    self.recommend_high_reputation_agents().await?
                },
                RecommendationType::NetworkConnections => {
                    self.recommend_by_network_connections(agent_address).await?
                },
            };
            
            let limited_recommendations = if let Some(limit) = limit {
                recommendations.into_iter().take(limit as usize).collect()
            } else {
                recommendations
            };
            
            Ok(limited_recommendations)
        }).await
    }

    /// Register agent for discovery
    pub async fn register_agent_for_discovery(
        &self,
        agent_address: &Pubkey,
        connection_info: AgentConnectionInfo,
    ) -> Result<()> {
        let operation_name = "register_agent_for_discovery";
        
        self.base.execute_operation(operation_name, async {
            let mut registry = self.agent_registry.write().await;
            registry.register_agent(*agent_address, connection_info);
            
            tracing::info!(
                agent_address = %agent_address,
                "Agent registered for discovery"
            );
            
            Ok(())
        }).await
    }

    /// Update agent availability status
    pub async fn update_agent_availability(
        &self,
        agent_address: &Pubkey,
        status: AvailabilityStatus,
    ) -> Result<()> {
        let operation_name = "update_agent_availability";
        
        self.base.execute_operation(operation_name, async {
            let mut registry = self.agent_registry.write().await;
            registry.update_availability(*agent_address, status);
            
            tracing::info!(
                agent_address = %agent_address,
                status = ?status,
                "Agent availability updated"
            );
            
            Ok(())
        }).await
    }

    /// Get network topology
    pub async fn get_network_topology(&self) -> Result<NetworkTopology> {
        let operation_name = "get_network_topology";
        
        self.base.execute_operation(operation_name, async {
            // Check cache first
            {
                let cache = self.topology_cache.read().await;
                if let Some(topology) = cache.get_topology() {
                    if !cache.is_expired() {
                        return Ok(topology);
                    }
                }
            }
            
            // Build fresh topology
            let topology = self.build_network_topology().await?;
            
            // Update cache
            {
                let mut cache = self.topology_cache.write().await;
                cache.update_topology(topology.clone());
            }
            
            Ok(topology)
        }).await
    }

    /// Get network statistics
    pub async fn get_network_stats(&self) -> Result<NetworkStats> {
        let operation_name = "get_network_stats";
        
        self.base.execute_operation(operation_name, async {
            let program = self.base.program()?;
            let topology = self.get_network_topology().await?;
            
            let total_agents = program.accounts::<AgentAccount>(vec![]).await?.len() as u64;
            let active_agents = {
                let registry = self.agent_registry.read().await;
                registry.get_active_agent_count()
            };
            
            let total_connections = topology.get_total_connections();
            let network_density = topology.calculate_density();
            let clustering_coefficient = topology.calculate_clustering_coefficient();
            let average_path_length = topology.calculate_average_path_length();
            
            let stats = NetworkStats {
                total_agents,
                active_agents,
                total_connections,
                network_density,
                clustering_coefficient,
                average_path_length,
                largest_component_size: topology.get_largest_component_size(),
                isolated_agents: topology.get_isolated_agents().len() as u64,
                bridge_agents: topology.find_bridge_agents().len() as u64,
                last_updated: chrono::Utc::now(),
            };
            
            Ok(stats)
        }).await
    }

    // Helper methods

    async fn get_agent_availability(&self, agent_address: &Pubkey) -> Result<AvailabilityStatus> {
        let registry = self.agent_registry.read().await;
        Ok(registry.get_availability(agent_address).unwrap_or(AvailabilityStatus::Unknown))
    }

    async fn get_agent_connection_info(&self, agent_address: &Pubkey) -> Result<Option<AgentConnectionInfo>> {
        let registry = self.agent_registry.read().await;
        Ok(registry.get_connection_info(agent_address).cloned())
    }

    fn matches_query(&self, agent: &AgentAccount, query: &DiscoveryQuery) -> bool {
        // Check active status
        if !agent.is_active {
            return false;
        }

        // Check name match
        if let Some(name_pattern) = &query.name_pattern {
            let name_pattern: &str = name_pattern;
            if !agent.name.to_lowercase().contains(&name_pattern.to_lowercase()) {
                return false;
            }
        }

        // Check capability requirements
        if !query.required_capabilities.is_empty() {
            if !query.required_capabilities.iter().all(|cap| agent.capabilities.contains(cap)) {
                return false;
            }
        }

        // Check reputation threshold
        if let Some(min_reputation) = query.min_reputation {
            if agent.reputation_score < min_reputation {
                return false;
            }
        }

        true
    }

    fn apply_query_filters(&self, mut agents: Vec<AgentDiscoveryResult>, query: &DiscoveryQuery) -> Vec<AgentDiscoveryResult> {
        // Sort by specified criteria
        match query.sort_by {
            Some(SortCriteria::Reputation) => {
                agents.sort_by(|a, b| b.reputation_score.cmp(&a.reputation_score));
            },
            Some(SortCriteria::LastSeen) => {
                agents.sort_by(|a, b| b.last_seen.cmp(&a.last_seen));
            },
            Some(SortCriteria::Name) => {
                agents.sort_by(|a, b| a.name.cmp(&b.name));
            },
            None => {
                // Default: sort by reputation
                agents.sort_by(|a, b| b.reputation_score.cmp(&a.reputation_score));
            },
        }

        // Apply limit
        if let Some(limit) = query.limit {
            agents.truncate(limit as usize);
        }

        agents
    }

    async fn build_network_topology(&self) -> Result<NetworkTopology> {
        let program = self.base.program()?;
        
        // Get all agents
        let agents = program.accounts::<AgentAccount>(vec![]).await?;
        let agent_addresses: Vec<Pubkey> = agents.into_iter().map(|(addr, _)| addr).collect();
        
        // Get all channels to build connections
        let channels = program.accounts::<ChannelAccount>(vec![]).await?;
        
        let mut connections = HashMap::new();
        
        for (_, channel) in channels {
            // Add connections between all participants in each channel
            for i in 0..channel.participants.len() {
                for j in (i + 1)..channel.participants.len() {
                    let agent1 = channel.participants[i];
                    let agent2 = channel.participants[j];
                    
                    connections.entry(agent1)
                        .or_insert_with(HashSet::new)
                        .insert(agent2);
                    connections.entry(agent2)
                        .or_insert_with(HashSet::new)
                        .insert(agent1);
                }
            }
        }
        
        Ok(NetworkTopology::new(agent_addresses, connections))
    }

    async fn calculate_connection_strength(&self, _agent1: &Pubkey, _agent2: &Pubkey) -> Result<f64> {
        // TODO: Implement connection strength calculation based on:
        // - Number of shared channels
        // - Message frequency
        // - Response time patterns
        // - Collaboration success rate
        Ok(0.8) // Placeholder
    }

    async fn recommend_by_capabilities(&self, agent: &AgentAccount) -> Result<Vec<AgentRecommendation>> {
        let program = self.base.program()?;
        let accounts = program.accounts::<AgentAccount>(vec![]).await?;
        
        let mut recommendations = Vec::new();
        
        for (address, other_agent) in accounts {
            if address == agent.address || !other_agent.is_active {
                continue;
            }
            
            // Calculate capability similarity
            let similarity = self.calculate_capability_similarity(&agent.capabilities, &other_agent.capabilities);
            
            if similarity > 0.3 { // Threshold for similarity
                recommendations.push(AgentRecommendation {
                    agent_address: address,
                    agent_name: other_agent.name,
                    recommendation_score: similarity,
                    reason: format!("{}% capability similarity", (similarity * 100.0) as u32),
                    recommended_action: RecommendedAction::Connect,
                });
            }
        }
        
        recommendations.sort_by(|a, b| b.recommendation_score.partial_cmp(&a.recommendation_score).unwrap());
        Ok(recommendations)
    }

    async fn recommend_complementary_agents(&self, agent: &AgentAccount) -> Result<Vec<AgentRecommendation>> {
        let program = self.base.program()?;
        let accounts = program.accounts::<AgentAccount>(vec![]).await?;
        
        let mut recommendations = Vec::new();
        
        for (address, other_agent) in accounts {
            if address == agent.address || !other_agent.is_active {
                continue;
            }
            
            // Calculate complementarity score
            let complementarity = self.calculate_capability_complementarity(&agent.capabilities, &other_agent.capabilities);
            
            if complementarity > 0.4 { // Threshold for complementarity
                recommendations.push(AgentRecommendation {
                    agent_address: address,
                    agent_name: other_agent.name,
                    recommendation_score: complementarity,
                    reason: "Complementary capabilities".to_string(),
                    recommended_action: RecommendedAction::Collaborate,
                });
            }
        }
        
        recommendations.sort_by(|a, b| b.recommendation_score.partial_cmp(&a.recommendation_score).unwrap());
        Ok(recommendations)
    }

    async fn recommend_high_reputation_agents(&self) -> Result<Vec<AgentRecommendation>> {
        let program = self.base.program()?;
        let accounts = program.accounts::<AgentAccount>(vec![]).await?;
        
        let mut recommendations = Vec::new();
        
        for (address, agent) in accounts {
            if !agent.is_active {
                continue;
            }
            
            if agent.reputation_score > 80 { // High reputation threshold
                let score = agent.reputation_score as f64 / 100.0;
                recommendations.push(AgentRecommendation {
                    agent_address: address,
                    agent_name: agent.name,
                    recommendation_score: score,
                    reason: format!("High reputation score: {}", agent.reputation_score),
                    recommended_action: RecommendedAction::Connect,
                });
            }
        }
        
        recommendations.sort_by(|a, b| b.recommendation_score.partial_cmp(&a.recommendation_score).unwrap());
        Ok(recommendations)
    }

    async fn recommend_by_network_connections(&self, agent_address: &Pubkey) -> Result<Vec<AgentRecommendation>> {
        let topology = self.get_network_topology().await?;
        
        // Find agents that are 2-3 hops away (friends of friends)
        let distant_connections = topology.find_distant_connections(agent_address, 2, 3);
        
        let mut recommendations = Vec::new();
        
        for (distant_agent, distance) in distant_connections {
            let score = 1.0 / (distance as f64); // Closer connections get higher scores
            
            recommendations.push(AgentRecommendation {
                agent_address: distant_agent,
                agent_name: "Unknown".to_string(), // TODO: Fetch agent name
                recommendation_score: score,
                reason: format!("Connected through {} intermediaries", distance - 1),
                recommended_action: RecommendedAction::Connect,
            });
        }
        
        recommendations.sort_by(|a, b| b.recommendation_score.partial_cmp(&a.recommendation_score).unwrap());
        Ok(recommendations)
    }

    fn calculate_capability_similarity(&self, caps1: &[AgentCapability], caps2: &[AgentCapability]) -> f64 {
        if caps1.is_empty() && caps2.is_empty() {
            return 1.0;
        }
        
        let set1: HashSet<_> = caps1.iter().collect();
        let set2: HashSet<_> = caps2.iter().collect();
        
        let intersection = set1.intersection(&set2).count();
        let union = set1.union(&set2).count();
        
        if union == 0 {
            0.0
        } else {
            intersection as f64 / union as f64
        }
    }

    fn calculate_capability_complementarity(&self, caps1: &[AgentCapability], caps2: &[AgentCapability]) -> f64 {
        let set1: HashSet<_> = caps1.iter().collect();
        let set2: HashSet<_> = caps2.iter().collect();
        
        let unique_in_set2 = set2.difference(&set1).count();
        let total_in_set2 = set2.len();
        
        if total_in_set2 == 0 {
            0.0
        } else {
            unique_in_set2 as f64 / total_in_set2 as f64
        }
    }
}

// Data structures

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentDiscoveryResult {
    pub address: Pubkey,
    pub name: String,
    pub description: String,
    pub capabilities: Vec<AgentCapability>,
    pub reputation_score: u64,
    pub last_seen: chrono::DateTime<chrono::Utc>,
    pub availability_status: AvailabilityStatus,
    pub connection_info: Option<AgentConnectionInfo>,
}

#[derive(Debug, Clone)]
pub struct NearbyAgentResult {
    pub address: Pubkey,
    pub distance: u32,
    pub availability_status: AvailabilityStatus,
    pub connection_strength: f64,
}

#[derive(Debug, Clone)]
pub struct AgentRecommendation {
    pub agent_address: Pubkey,
    pub agent_name: String,
    pub recommendation_score: f64,
    pub reason: String,
    pub recommended_action: RecommendedAction,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentConnectionInfo {
    pub endpoint: String,
    pub protocols: Vec<String>,
    pub last_heartbeat: chrono::DateTime<chrono::Utc>,
    pub latency_ms: Option<u32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum AvailabilityStatus {
    Online,
    Busy,
    Away,
    Offline,
    Unknown,
}

#[derive(Debug, Clone)]
pub enum RecommendationType {
    SimilarCapabilities,
    ComplementarySkills,
    HighReputation,
    NetworkConnections,
}

#[derive(Debug, Clone)]
pub enum RecommendedAction {
    Connect,
    Collaborate,
    Follow,
    Invite,
}

#[derive(Debug, Clone)]
pub enum SortCriteria {
    Reputation,
    LastSeen,
    Name,
}

#[derive(Debug, Clone)]
pub struct NetworkStats {
    pub total_agents: u64,
    pub active_agents: u64,
    pub total_connections: u64,
    pub network_density: f64,
    pub clustering_coefficient: f64,
    pub average_path_length: f64,
    pub largest_component_size: u64,
    pub isolated_agents: u64,
    pub bridge_agents: u64,
    pub last_updated: chrono::DateTime<chrono::Utc>,
}

// Internal data structures

#[derive(Debug)]
struct AgentRegistry {
    agents: HashMap<Pubkey, AgentRegistration>,
}

#[derive(Debug)]
struct AgentRegistration {
    connection_info: AgentConnectionInfo,
    availability: AvailabilityStatus,
    registered_at: chrono::DateTime<chrono::Utc>,
}

impl AgentRegistry {
    fn new() -> Self {
        Self {
            agents: HashMap::new(),
        }
    }

    fn register_agent(&mut self, agent_address: Pubkey, connection_info: AgentConnectionInfo) {
        let registration = AgentRegistration {
            connection_info,
            availability: AvailabilityStatus::Online,
            registered_at: chrono::Utc::now(),
        };
        self.agents.insert(agent_address, registration);
    }

    fn update_availability(&mut self, agent_address: Pubkey, status: AvailabilityStatus) {
        if let Some(registration) = self.agents.get_mut(&agent_address) {
            registration.availability = status;
        }
    }

    fn get_availability(&self, agent_address: &Pubkey) -> Option<AvailabilityStatus> {
        self.agents.get(agent_address).map(|r| r.availability.clone())
    }

    fn get_connection_info(&self, agent_address: &Pubkey) -> Option<&AgentConnectionInfo> {
        self.agents.get(agent_address).map(|r| &r.connection_info)
    }

    fn get_active_agent_count(&self) -> u64 {
        self.agents.values()
            .filter(|r| matches!(r.availability, AvailabilityStatus::Online | AvailabilityStatus::Busy))
            .count() as u64
    }
}

#[derive(Debug)]
struct TopologyCache {
    topology: Option<NetworkTopology>,
    last_updated: chrono::DateTime<chrono::Utc>,
    cache_duration: chrono::Duration,
}

impl TopologyCache {
    fn new() -> Self {
        Self {
            topology: None,
            last_updated: chrono::Utc::now(),
            cache_duration: chrono::Duration::minutes(10),
        }
    }

    fn is_expired(&self) -> bool {
        chrono::Utc::now() - self.last_updated > self.cache_duration
    }

    fn get_topology(&self) -> Option<NetworkTopology> {
        if self.is_expired() {
            None
        } else {
            self.topology.clone()
        }
    }

    fn update_topology(&mut self, topology: NetworkTopology) {
        self.topology = Some(topology);
        self.last_updated = chrono::Utc::now();
    }
}

#[async_trait]
impl BaseService for DiscoveryService {
    type Error = PodComError;

    async fn initialize(&mut self, program: Program<Arc<Keypair>>) -> Result<(), Self::Error> {
        self.base.initialize(program).await?;
        Ok(())
    }

    fn program(&self) -> Result<&Program<Arc<Keypair>>, Self::Error> {
        self.base.program()
    }

    fn validate_config(&self) -> Result<(), Self::Error> {
        // Validate discovery service specific configuration
        let config = &self.base.config();
        
        // Check if program ID is set and valid
        if config.program_id.to_string() == "11111111111111111111111111111111" {
            return Err(PodComError::InvalidConfiguration {
                field: "program_id".to_string(),
                reason: "Program ID cannot be the default/null address".to_string(),
            });
        }
        
        // Validate cluster configuration
        if config.cluster.is_empty() {
            return Err(PodComError::InvalidConfiguration {
                field: "cluster".to_string(),
                reason: "Cluster URL cannot be empty".to_string(),
            });
        }
        
        // Validate discovery-specific timeouts (discovery operations may take longer)
        if config.rpc_timeout_secs < 15 {
            return Err(PodComError::InvalidConfiguration {
                field: "rpc_timeout_secs".to_string(),
                reason: "RPC timeout must be at least 15 seconds for discovery operations".to_string(),
            });
        }
        
        // Validate search limits
        if let Some(ref discovery_config) = config.discovery_config {
            if discovery_config.search_result_limit == 0 {
                return Err(PodComError::InvalidConfiguration {
                    field: "discovery_config.search_result_limit".to_string(),
                    reason: "Maximum search results must be greater than 0".to_string(),
                });
            }
            
            if discovery_config.search_result_limit > 10000 {
                return Err(PodComError::InvalidConfiguration {
                    field: "discovery_config.search_result_limit".to_string(),
                    reason: "Maximum search results cannot exceed 10,000 for performance reasons".to_string(),
                });
            }
            
            // Validate cache settings
            if discovery_config.cache_ttl_seconds == 0 {
                return Err(PodComError::InvalidConfiguration {
                    field: "discovery_config.cache_ttl_seconds".to_string(),
                    reason: "Cache TTL must be greater than 0 seconds".to_string(),
                });
            }
            
            if discovery_config.cache_ttl_seconds > 86400 { // 24 hours max
                return Err(PodComError::InvalidConfiguration {
                    field: "discovery_config.cache_ttl_seconds".to_string(),
                    reason: "Cache TTL cannot exceed 24 hours (86400 seconds)".to_string(),
                });
            }
            
            // Validate indexing parameters
            if discovery_config.enable_indexing && discovery_config.index_batch_size == 0 {
                return Err(PodComError::InvalidConfiguration {
                    field: "discovery_config.index_batch_size".to_string(),
                    reason: "Index batch size must be greater than 0 when indexing is enabled".to_string(),
                });
            }
        }
        
        Ok(())
    }

    fn health_check(&self) -> ServiceHealth {
        self.base.health_check()
    }

    fn metrics(&self) -> ServiceMetrics {
        // This is a blocking call for consistency with the trait
        futures::executor::block_on(self.base.metrics())
    }

    async fn shutdown(&mut self) -> Result<(), Self::Error> {
        self.base.shutdown().await?;
        Ok(())
    }

    fn service_name(&self) -> &'static str {
        "discovery"
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::config::test_config;

    #[tokio::test]
    async fn test_discovery_service_creation() {
        let config = test_config();
        let service = DiscoveryService::new(config);
        assert_eq!(service.service_name(), "discovery");
        assert_eq!(service.health_check(), ServiceHealth::NotInitialized);
    }
} 