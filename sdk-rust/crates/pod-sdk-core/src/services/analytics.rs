//! # Analytics Service
//!
//! Service for collecting, processing, and analyzing PoD Protocol usage metrics.
//! Provides insights into agent behavior, message patterns, and protocol performance.

use std::sync::Arc;
use std::collections::HashMap;

use anchor_client::Program;
use async_trait::async_trait;
use solana_sdk::{
    pubkey::Pubkey,
    signer::{keypair::Keypair, Signer},
};
use serde::{Deserialize, Serialize};

use pod_sdk_types::{
    AgentAccount, ChannelAccount, MessageAccount, EscrowAccount, AnalyticsAccount,
    AnalyticsPeriod,
};

use crate::{
    error::{PodComError, Result},
    services::base::{BaseService, ServiceBase, ServiceConfig, ServiceHealth, ServiceMetrics},
};

/// Service for analytics and metrics collection
#[derive(Debug)]
pub struct AnalyticsService {
    base: ServiceBase,
    metrics_cache: Arc<tokio::sync::RwLock<MetricsCache>>,
}

impl AnalyticsService {
    /// Create a new analytics service
    pub fn new(config: ServiceConfig) -> Self {
        Self {
            base: ServiceBase::new(config),
            metrics_cache: Arc::new(tokio::sync::RwLock::new(MetricsCache::new())),
        }
    }

    /// Get protocol-wide usage metrics
    pub async fn get_protocol_metrics(&self) -> Result<ProtocolMetrics> {
        let operation_name = "get_protocol_metrics";
        
        self.base.execute_operation(operation_name, async {
            let program = self.base.program()?;
            
            // Check cache first
            {
                let cache = self.metrics_cache.read().await;
                if let Some(cached_metrics) = cache.get_protocol_metrics() {
                    if !cache.is_expired() {
                        return Ok(cached_metrics);
                    }
                }
            }
            
            // Collect fresh metrics
            let agents = self.collect_agent_metrics(program).await?;
            let channels = self.collect_channel_metrics(program).await?;
            let messages = self.collect_message_metrics(program).await?;
            let escrows = self.collect_escrow_metrics(program).await?;
            
            let protocol_metrics = ProtocolMetrics {
                total_agents: agents.total_count,
                active_agents: agents.active_count,
                total_channels: channels.total_count,
                active_channels: channels.active_count,
                total_messages: messages.total_count,
                messages_last_24h: messages.last_24h_count,
                total_escrows: escrows.total_count,
                active_escrows: escrows.active_count,
                total_value_locked: escrows.total_value_locked,
                average_message_size: messages.average_size,
                peak_concurrent_users: 0, // TODO: Implement real-time tracking
                protocol_uptime_percentage: 99.9, // TODO: Calculate from health data
                last_updated: chrono::Utc::now(),
            };
            
            // Update cache
            {
                let mut cache = self.metrics_cache.write().await;
                cache.update_protocol_metrics(protocol_metrics.clone());
            }
            
            Ok(protocol_metrics)
        }).await
    }

    /// Get analytics for a specific agent
    pub async fn get_agent_analytics(&self, agent_address: &Pubkey) -> Result<AgentAnalytics> {
        let operation_name = "get_agent_analytics";
        
        self.base.execute_operation(operation_name, async {
            let program = self.base.program()?;
            
            let agent_account = program.account::<AgentAccount>(*agent_address)?;
            
            // Get agent's channels
            let agent_channels = self.get_agent_channels(program, agent_address).await?;
            
            // Get agent's messages
            let agent_messages = self.get_agent_messages(program, agent_address).await?;
            
            // Calculate analytics
            let total_channels = agent_channels.len() as u64;
            let active_channels = agent_channels.iter()
                .filter(|ch| ch.is_active)
                .count() as u64;
            
            let total_messages_sent = agent_messages.len() as u64;
            let messages_last_24h = agent_messages.iter()
                .filter(|msg| {
                    let now = chrono::Utc::now();
                    (now - msg.created_at).num_hours() <= 24
                })
                .count() as u64;
            
            let avg_response_time = self.calculate_avg_response_time(&agent_messages);
            let reputation_trend = self.calculate_reputation_trend(agent_address).await?;
            
            let analytics = AgentAnalytics {
                agent_address: *agent_address,
                total_channels,
                active_channels,
                total_messages_sent,
                messages_last_24h,
                average_response_time_ms: avg_response_time,
                reputation_score: agent_account.reputation_score,
                reputation_trend,
                uptime_percentage: 95.0, // TODO: Calculate from activity data
                most_active_channel: self.find_most_active_channel(&agent_channels),
                interaction_partners: self.get_interaction_partners(&agent_channels),
                last_activity: agent_account.updated_at,
            };
            
            Ok(analytics)
        }).await
    }

    /// Get channel analytics
    pub async fn get_channel_analytics(&self, channel_address: &Pubkey) -> Result<ChannelAnalytics> {
        let operation_name = "get_channel_analytics";
        
        self.base.execute_operation(operation_name, async {
            let program = self.base.program()?;
            
            let channel_account = program.account::<ChannelAccount>(*channel_address)?;
            let channel_messages = self.get_channel_messages(program, channel_address).await?;
            
            // Calculate message statistics
            let total_messages = channel_messages.len() as u64;
            let messages_last_24h = channel_messages.iter()
                .filter(|msg| {
                    let now = chrono::Utc::now();
                    (now - msg.created_at).num_hours() <= 24
                })
                .count() as u64;
            
            let total_size = channel_messages.iter()
                .map(|msg| msg.encrypted_content.len() as u64)
                .sum();
            
            let avg_message_size = if total_messages > 0 {
                total_size as f64 / total_messages as f64
            } else {
                0.0
            };
            
            // Calculate participation metrics
            let mut message_counts_by_sender = HashMap::new();
            for message in &channel_messages {
                *message_counts_by_sender.entry(message.sender).or_insert(0u64) += 1;
            }
            
            let most_active_participant = message_counts_by_sender
                .iter()
                .max_by_key(|(_, &count)| count)
                .map(|(&sender, _)| sender);
            
            let analytics = ChannelAnalytics {
                channel_address: *channel_address,
                participant_count: channel_account.participants.len() as u64,
                total_messages,
                messages_last_24h,
                average_message_size: avg_message_size,
                total_data_transferred: total_size,
                most_active_participant,
                message_frequency_per_hour: self.calculate_message_frequency(&channel_messages),
                peak_activity_hour: self.find_peak_activity_hour(&channel_messages),
                participant_engagement: self.calculate_participant_engagement(&channel_messages, &channel_account.participants),
                created_at: channel_account.created_at,
                last_activity: channel_messages.first().map(|msg| msg.created_at),
            };
            
            Ok(analytics)
        }).await
    }

    /// Get network-wide usage patterns
    pub async fn get_usage_patterns(&self, time_range: TimeRange) -> Result<UsagePatterns> {
        let operation_name = "get_usage_patterns";
        
        self.base.execute_operation(operation_name, async {
            let program = self.base.program()?;
            
            let all_messages = self.get_all_messages_in_range(program, time_range).await?;
            
            // Analyze temporal patterns
            let hourly_distribution = self.analyze_hourly_distribution(&all_messages);
            let daily_distribution = self.analyze_daily_distribution(&all_messages);
            
            // Analyze message types and sizes
            let message_type_distribution = self.analyze_message_types(&all_messages);
            let size_distribution = self.analyze_message_sizes(&all_messages);
            
            // Network topology analysis
            let network_density = self.calculate_network_density(program).await?;
            let clustering_coefficient = self.calculate_clustering_coefficient(program).await?;
            
            let patterns = UsagePatterns {
                time_range,
                total_activity_events: all_messages.len() as u64,
                peak_hour: hourly_distribution.iter()
                    .enumerate()
                    .max_by_key(|(_, &count)| count)
                    .map(|(hour, _)| hour as u8)
                    .unwrap_or(0),
                peak_day: daily_distribution.iter()
                    .enumerate()
                    .max_by_key(|(_, &count)| count)
                    .map(|(day, _)| day as u8)
                    .unwrap_or(0),
                hourly_distribution,
                daily_distribution,
                message_type_distribution,
                size_distribution,
                network_density,
                clustering_coefficient,
                growth_rate: self.calculate_growth_rate(time_range).await?,
            };
            
            Ok(patterns)
        }).await
    }

    /// Generate performance report
    pub async fn generate_performance_report(&self, time_range: TimeRange) -> Result<PerformanceReport> {
        let operation_name = "generate_performance_report";
        
        self.base.execute_operation(operation_name, async {
            let protocol_metrics = self.get_protocol_metrics().await?;
            let usage_patterns = self.get_usage_patterns(time_range).await?;
            
            // Calculate performance metrics
            let avg_transaction_time = self.calculate_avg_transaction_time(time_range).await?;
            let error_rate = self.calculate_error_rate(time_range).await?;
            let throughput = self.calculate_throughput(time_range).await?;
            
            let report = PerformanceReport {
                time_range,
                protocol_metrics,
                usage_patterns,
                average_transaction_time_ms: avg_transaction_time,
                error_rate_percentage: error_rate,
                throughput_ops_per_second: throughput,
                resource_utilization: self.get_resource_utilization().await?,
                bottlenecks: self.identify_bottlenecks().await?,
                recommendations: self.generate_recommendations().await?,
                generated_at: chrono::Utc::now(),
            };
            
            Ok(report)
        }).await
    }

    // Helper methods for data collection and analysis

    async fn collect_agent_metrics(&self, program: &Program<Arc<Keypair>>) -> Result<AgentMetricsSummary> {
        let accounts = program.accounts::<AgentAccount>(vec![]).await?;
        
        let total_count = accounts.len() as u64;
        let active_count = accounts.iter()
            .filter(|(_, agent)| agent.is_active)
            .count() as u64;
        
        Ok(AgentMetricsSummary {
            total_count,
            active_count,
        })
    }

    async fn collect_channel_metrics(&self, program: &Program<Arc<Keypair>>) -> Result<ChannelMetricsSummary> {
        let accounts = program.accounts::<ChannelAccount>(vec![]).await?;
        
        let total_count = accounts.len() as u64;
        let active_count = accounts.iter()
            .filter(|(_, channel)| channel.is_active)
            .count() as u64;
        
        Ok(ChannelMetricsSummary {
            total_count,
            active_count,
        })
    }

    async fn collect_message_metrics(&self, program: &Program<Arc<Keypair>>) -> Result<MessageMetricsSummary> {
        let accounts = program.accounts::<MessageAccount>(vec![]).await?;
        
        let total_count = accounts.len() as u64;
        let now = chrono::Utc::now();
        let last_24h_count = accounts.iter()
            .filter(|(_, msg)| (now - msg.created_at).num_hours() <= 24)
            .count() as u64;
        
        let total_size: usize = accounts.iter()
            .map(|(_, msg)| msg.encrypted_content.len())
            .sum();
        
        let average_size = if total_count > 0 {
            total_size as f64 / total_count as f64
        } else {
            0.0
        };
        
        Ok(MessageMetricsSummary {
            total_count,
            last_24h_count,
            average_size,
        })
    }

    async fn collect_escrow_metrics(&self, program: &Program<Arc<Keypair>>) -> Result<EscrowMetricsSummary> {
        let accounts = program.accounts::<EscrowAccount>(vec![]).await?;
        
        let total_count = accounts.len() as u64;
        let active_count = accounts.iter()
            .filter(|(_, escrow)| matches!(escrow.status, EscrowStatus::Active))
            .count() as u64;
        
        let total_value_locked = accounts.iter()
            .filter(|(_, escrow)| matches!(escrow.status, EscrowStatus::Active))
            .map(|(_, escrow)| escrow.amount)
            .sum();
        
        Ok(EscrowMetricsSummary {
            total_count,
            active_count,
            total_value_locked,
        })
    }

    // Additional helper methods would go here...
    async fn get_agent_channels(&self, program: &Program<Arc<Keypair>>, agent_address: &Pubkey) -> Result<Vec<ChannelAccount>> {
        let accounts = program.accounts::<ChannelAccount>(vec![]).await?;
        Ok(accounts.into_iter()
            .map(|(_, account)| account)
            .filter(|channel| channel.participants.contains(agent_address))
            .collect())
    }

    async fn get_agent_messages(&self, program: &Program<Arc<Keypair>>, agent_address: &Pubkey) -> Result<Vec<MessageAccount>> {
        let accounts = program.accounts::<MessageAccount>(vec![]).await?;
        Ok(accounts.into_iter()
            .map(|(_, account)| account)
            .filter(|message| message.sender == *agent_address)
            .collect())
    }

    async fn get_channel_messages(&self, program: &Program<Arc<Keypair>>, channel_address: &Pubkey) -> Result<Vec<MessageAccount>> {
        let accounts = program.accounts::<MessageAccount>(vec![]).await?;
        Ok(accounts.into_iter()
            .map(|(_, account)| account)
            .filter(|message| message.channel == *channel_address)
            .collect())
    }

    async fn get_all_messages_in_range(&self, program: &Program<Arc<Keypair>>, time_range: TimeRange) -> Result<Vec<MessageAccount>> {
        let accounts = program.accounts::<MessageAccount>(vec![]).await?;
        Ok(accounts.into_iter()
            .map(|(_, account)| account)
            .filter(|message| time_range.contains(message.created_at))
            .collect())
    }

    fn calculate_avg_response_time(&self, _messages: &[MessageAccount]) -> f64 {
        // TODO: Implement response time calculation
        100.0 // placeholder
    }

    async fn calculate_reputation_trend(&self, _agent_address: &Pubkey) -> Result<f64> {
        // TODO: Implement reputation trend calculation
        Ok(0.1) // placeholder
    }

    fn find_most_active_channel(&self, channels: &[ChannelAccount]) -> Option<Pubkey> {
        // TODO: Implement based on message count
        channels.first().map(|ch| ch.address)
    }

    fn get_interaction_partners(&self, _channels: &[ChannelAccount]) -> Vec<Pubkey> {
        // TODO: Implement interaction partner analysis
        Vec::new()
    }

    fn calculate_message_frequency(&self, _messages: &[MessageAccount]) -> f64 {
        // TODO: Implement frequency calculation
        1.0
    }

    fn find_peak_activity_hour(&self, _messages: &[MessageAccount]) -> u8 {
        // TODO: Implement peak hour analysis
        12
    }

    fn calculate_participant_engagement(&self, _messages: &[MessageAccount], _participants: &[Pubkey]) -> f64 {
        // TODO: Implement engagement calculation
        0.8
    }

    fn analyze_hourly_distribution(&self, _messages: &[MessageAccount]) -> Vec<u64> {
        // TODO: Implement hourly analysis
        vec![0; 24]
    }

    fn analyze_daily_distribution(&self, _messages: &[MessageAccount]) -> Vec<u64> {
        // TODO: Implement daily analysis
        vec![0; 7]
    }

    fn analyze_message_types(&self, _messages: &[MessageAccount]) -> HashMap<String, u64> {
        // TODO: Implement message type analysis
        HashMap::new()
    }

    fn analyze_message_sizes(&self, _messages: &[MessageAccount]) -> HashMap<String, u64> {
        // TODO: Implement size distribution analysis
        HashMap::new()
    }

    async fn calculate_network_density(&self, _program: &Program<Arc<Keypair>>) -> Result<f64> {
        // TODO: Implement network density calculation
        Ok(0.5)
    }

    async fn calculate_clustering_coefficient(&self, _program: &Program<Arc<Keypair>>) -> Result<f64> {
        // TODO: Implement clustering coefficient calculation
        Ok(0.3)
    }

    async fn calculate_growth_rate(&self, _time_range: TimeRange) -> Result<f64> {
        // TODO: Implement growth rate calculation
        Ok(0.05)
    }

    async fn calculate_avg_transaction_time(&self, _time_range: TimeRange) -> Result<f64> {
        // TODO: Implement transaction time calculation
        Ok(250.0)
    }

    async fn calculate_error_rate(&self, _time_range: TimeRange) -> Result<f64> {
        // TODO: Implement error rate calculation
        Ok(0.1)
    }

    async fn calculate_throughput(&self, _time_range: TimeRange) -> Result<f64> {
        // TODO: Implement throughput calculation
        Ok(100.0)
    }

    async fn get_resource_utilization(&self) -> Result<ResourceUtilization> {
        // TODO: Implement resource utilization monitoring
        Ok(ResourceUtilization {
            cpu_percentage: 25.0,
            memory_percentage: 40.0,
            storage_percentage: 15.0,
            network_bandwidth_mbps: 50.0,
        })
    }

    async fn identify_bottlenecks(&self) -> Result<Vec<String>> {
        // TODO: Implement bottleneck identification
        Ok(vec!["High message encryption overhead".to_string()])
    }

    async fn generate_recommendations(&self) -> Result<Vec<String>> {
        // TODO: Implement recommendation generation
        Ok(vec!["Consider implementing message batching for improved throughput".to_string()])
    }
}

// Analytics data structures

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProtocolMetrics {
    pub total_agents: u64,
    pub active_agents: u64,
    pub total_channels: u64,
    pub active_channels: u64,
    pub total_messages: u64,
    pub messages_last_24h: u64,
    pub total_escrows: u64,
    pub active_escrows: u64,
    pub total_value_locked: u64,
    pub average_message_size: f64,
    pub peak_concurrent_users: u64,
    pub protocol_uptime_percentage: f64,
    pub last_updated: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Clone)]
pub struct AgentAnalytics {
    pub agent_address: Pubkey,
    pub total_channels: u64,
    pub active_channels: u64,
    pub total_messages_sent: u64,
    pub messages_last_24h: u64,
    pub average_response_time_ms: f64,
    pub reputation_score: u64,
    pub reputation_trend: f64,
    pub uptime_percentage: f64,
    pub most_active_channel: Option<Pubkey>,
    pub interaction_partners: Vec<Pubkey>,
    pub last_activity: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Clone)]
pub struct ChannelAnalytics {
    pub channel_address: Pubkey,
    pub participant_count: u64,
    pub total_messages: u64,
    pub messages_last_24h: u64,
    pub average_message_size: f64,
    pub total_data_transferred: u64,
    pub most_active_participant: Option<Pubkey>,
    pub message_frequency_per_hour: f64,
    pub peak_activity_hour: u8,
    pub participant_engagement: f64,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub last_activity: Option<chrono::DateTime<chrono::Utc>>,
}

#[derive(Debug, Clone, Copy)]
pub struct TimeRange {
    pub start: chrono::DateTime<chrono::Utc>,
    pub end: chrono::DateTime<chrono::Utc>,
}

impl TimeRange {
    pub fn contains(&self, timestamp: chrono::DateTime<chrono::Utc>) -> bool {
        timestamp >= self.start && timestamp <= self.end
    }
}

#[derive(Debug, Clone)]
pub struct UsagePatterns {
    pub time_range: TimeRange,
    pub total_activity_events: u64,
    pub peak_hour: u8,
    pub peak_day: u8,
    pub hourly_distribution: Vec<u64>,
    pub daily_distribution: Vec<u64>,
    pub message_type_distribution: HashMap<String, u64>,
    pub size_distribution: HashMap<String, u64>,
    pub network_density: f64,
    pub clustering_coefficient: f64,
    pub growth_rate: f64,
}

#[derive(Debug, Clone)]
pub struct PerformanceReport {
    pub time_range: TimeRange,
    pub protocol_metrics: ProtocolMetrics,
    pub usage_patterns: UsagePatterns,
    pub average_transaction_time_ms: f64,
    pub error_rate_percentage: f64,
    pub throughput_ops_per_second: f64,
    pub resource_utilization: ResourceUtilization,
    pub bottlenecks: Vec<String>,
    pub recommendations: Vec<String>,
    pub generated_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Clone)]
pub struct ResourceUtilization {
    pub cpu_percentage: f64,
    pub memory_percentage: f64,
    pub storage_percentage: f64,
    pub network_bandwidth_mbps: f64,
}

// Internal data structures
#[derive(Debug)]
struct AgentMetricsSummary {
    total_count: u64,
    active_count: u64,
}

#[derive(Debug)]
struct ChannelMetricsSummary {
    total_count: u64,
    active_count: u64,
}

#[derive(Debug)]
struct MessageMetricsSummary {
    total_count: u64,
    last_24h_count: u64,
    average_size: f64,
}

#[derive(Debug)]
struct EscrowMetricsSummary {
    total_count: u64,
    active_count: u64,
    total_value_locked: u64,
}

#[derive(Debug)]
struct MetricsCache {
    protocol_metrics: Option<ProtocolMetrics>,
    last_updated: chrono::DateTime<chrono::Utc>,
    cache_duration: chrono::Duration,
}

impl MetricsCache {
    fn new() -> Self {
        Self {
            protocol_metrics: None,
            last_updated: chrono::Utc::now(),
            cache_duration: chrono::Duration::minutes(5),
        }
    }

    fn is_expired(&self) -> bool {
        chrono::Utc::now() - self.last_updated > self.cache_duration
    }

    fn get_protocol_metrics(&self) -> Option<ProtocolMetrics> {
        if self.is_expired() {
            None
        } else {
            self.protocol_metrics.clone()
        }
    }

    fn update_protocol_metrics(&mut self, metrics: ProtocolMetrics) {
        self.protocol_metrics = Some(metrics);
        self.last_updated = chrono::Utc::now();
    }
}

#[async_trait]
impl BaseService for AnalyticsService {
    type Error = PodComError;

    async fn initialize(&mut self, program: Program<Arc<Keypair>>) -> Result<(), Self::Error> {
        self.base.initialize(program).await?;
        Ok(())
    }

    fn program(&self) -> Result<&Program<Arc<Keypair>>, Self::Error> {
        self.base.program()
    }

    fn validate_config(&self) -> Result<(), Self::Error> {
        // Validate analytics service specific configuration
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
        
        // Validate analytics-specific settings
        if let Some(ref analytics_config) = config.analytics_config {
            // Validate metrics collection interval
            if analytics_config.collection_interval == 0 {
                return Err(PodComError::InvalidConfiguration {
                    field: "analytics_config.collection_interval".to_string(),
                    reason: "Metrics collection interval must be greater than 0".to_string(),
                });
            }
            
            if analytics_config.collection_interval > 3600 { // 1 hour max
                return Err(PodComError::InvalidConfiguration {
                    field: "analytics_config.collection_interval".to_string(),
                    reason: "Metrics collection interval cannot exceed 1 hour (3600 seconds)".to_string(),
                });
            }
            
            // Validate retention periods
            if analytics_config.data_retention_days == 0 {
                return Err(PodComError::InvalidConfiguration {
                    field: "analytics_config.data_retention_days".to_string(),
                    reason: "Data retention period must be at least 1 day".to_string(),
                });
            }
            
            if analytics_config.data_retention_days > 3650 { // 10 years max
                return Err(PodComError::InvalidConfiguration {
                    field: "analytics_config.data_retention_days".to_string(),
                    reason: "Data retention period cannot exceed 10 years (3650 days)".to_string(),
                });
            }
            
            // Validate aggregation settings
            if analytics_config.max_time_series_points == 0 {
                return Err(PodComError::InvalidConfiguration {
                    field: "analytics_config.max_time_series_points".to_string(),
                    reason: "Maximum time series points must be greater than 0".to_string(),
                });
            }
            
            if analytics_config.max_time_series_points > 1000000 { // 1M points max
                return Err(PodComError::InvalidConfiguration {
                    field: "analytics_config.max_time_series_points".to_string(),
                    reason: "Maximum time series points cannot exceed 1,000,000".to_string(),
                });
            }
            
            // Validate cache settings
            if analytics_config.cache_size_mb == 0 {
                return Err(PodComError::InvalidConfiguration {
                    field: "analytics_config.cache_size_mb".to_string(),
                    reason: "Cache size must be greater than 0 MB".to_string(),
                });
            }
            
            if analytics_config.cache_size_mb > 1024 { // 1GB max
                return Err(PodComError::InvalidConfiguration {
                    field: "analytics_config.cache_size_mb".to_string(),
                    reason: "Cache size cannot exceed 1024 MB".to_string(),
                });
            }
            
            // Validate batch processing settings
            if analytics_config.enable_batch_processing && analytics_config.batch_size == 0 {
                return Err(PodComError::InvalidConfiguration {
                    field: "analytics_config.batch_size".to_string(),
                    reason: "Batch size must be greater than 0 when batch processing is enabled".to_string(),
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
        "analytics"
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::config::test_config;

    #[tokio::test]
    async fn test_analytics_service_creation() {
        let config = test_config();
        let service = AnalyticsService::new(config);
        assert_eq!(service.service_name(), "analytics");
        assert_eq!(service.health_check(), ServiceHealth::NotInitialized);
    }
} 