//! # Base Service Framework
//!
//! Provides the foundation for all PoD Protocol services with common functionality,
//! lifecycle management, metrics collection, and error handling.

use std::sync::Arc;
use std::time::{Duration, Instant};

use anchor_client::Program;
use async_trait::async_trait;
use serde::{Deserialize, Serialize};
use solana_sdk::{
    commitment_config::CommitmentConfig,
    pubkey::Pubkey,
    signer::keypair::Keypair,
};
use solana_rpc_client::rpc_client::RpcClient;
use tokio::sync::RwLock;

use crate::{
    config::{RateLimitConfig, RetryConfig, CacheConfig, IPFSConfig, ZKCompressionConfig},
    error::{PodComError, Result},
};

/// Base configuration shared by all services
#[derive(Clone)]
pub struct ServiceConfig {
    /// RPC client for Solana interactions
    pub rpc_client: Arc<RpcClient>,
    /// Program ID for the PoD Protocol
    pub program_id: Pubkey,
    /// Commitment level for transactions
    pub commitment: CommitmentConfig,
    /// Retry configuration for failed operations
    pub retry_config: RetryConfig,
    /// Operation timeout duration
    pub timeout: Duration,
    /// Rate limiting configuration
    pub rate_limit_config: RateLimitConfig,
    /// Cache configuration
    pub cache_config: CacheConfig,
    /// Cluster configuration
    pub cluster: String,
    /// RPC timeout in seconds
    pub rpc_timeout_secs: u64,
    /// Service-specific configurations
    pub message_config: Option<MessageConfig>,
    pub channel_config: Option<ChannelConfig>,
    pub escrow_config: Option<EscrowConfig>,
    pub analytics_config: Option<AnalyticsConfig>,
    pub discovery_config: Option<DiscoveryConfig>,
    pub compression_config: Option<CompressionConfig>,
    pub ipfs_endpoint: Option<String>,
    pub zk_compression_config: Option<ZKCompressionConfig>,
}

impl std::fmt::Debug for ServiceConfig {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("ServiceConfig")
            .field("program_id", &self.program_id)
            .field("commitment", &self.commitment)
            .field("retry_config", &self.retry_config)
            .field("timeout", &self.timeout)
            .field("rate_limit_config", &self.rate_limit_config)
            .field("cache_config", &self.cache_config)
            .field("rpc_client", &"<RpcClient>")
            .field("cluster", &self.cluster)
            .field("rpc_timeout_secs", &self.rpc_timeout_secs)
            .field("message_config", &self.message_config)
            .field("channel_config", &self.channel_config)
            .field("escrow_config", &self.escrow_config)
            .field("analytics_config", &self.analytics_config)
            .field("discovery_config", &self.discovery_config)
            .field("compression_config", &self.compression_config)
            .field("ipfs_endpoint", &self.ipfs_endpoint)
            .field("zk_compression_config", &self.zk_compression_config)
            .finish()
    }
}

/// Message service configuration
#[derive(Debug, Clone)]
pub struct MessageConfig {
    pub message_size_limit: u32,
    pub encryption_enabled: bool,
    pub retention_period_hours: u32,
    pub compression_threshold: u32,
}

/// Channel service configuration  
#[derive(Debug, Clone)]
pub struct ChannelConfig {
    pub participant_limit: u32,
    pub invitation_expiry_hours: u32,
    pub message_history_limit: u32,
    pub moderation_enabled: bool,
}

/// Escrow service configuration
#[derive(Debug, Clone)]
pub struct EscrowConfig {
    pub minimum_escrow: u64,
    pub timeout_hours: u32,
    pub arbitrator_config: Option<ArbitratorConfig>,
}

/// Arbitrator configuration
#[derive(Debug, Clone)]
pub struct ArbitratorConfig {
    pub enabled: bool,
    pub arbitrator_list: Vec<String>,
    pub dispute_timeout_hours: u32,
}

/// Analytics service configuration
#[derive(Debug, Clone)]
pub struct AnalyticsConfig {
    pub collection_interval: u32,
    pub metrics_retention_days: u32,
    pub anonymization_enabled: bool,
}

/// Discovery service configuration
#[derive(Debug, Clone)]
pub struct DiscoveryConfig {
    pub search_result_limit: u32,
    pub indexing_enabled: bool,
    pub cache_duration_minutes: u32,
}

/// Compression configuration
#[derive(Debug, Clone)]
pub struct CompressionConfig {
    pub enabled: bool,
    pub algorithm: String,
    pub level: u8,
}

/// Health status of a service
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum ServiceHealth {
    /// Service is healthy and operational
    Healthy,
    /// Service is degraded but functional
    Degraded,
    /// Service is unhealthy
    Unhealthy,
    /// Service is not initialized
    NotInitialized,
}

/// Metrics collected by services
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct ServiceMetrics {
    /// Number of operations performed
    pub operations_count: u64,
    /// Number of successful operations
    pub successful_operations: u64,
    /// Number of failed operations
    pub failed_operations: u64,
    /// Total operation duration in milliseconds
    pub total_duration_ms: u64,
    /// Last operation timestamp
    pub last_operation_at: Option<chrono::DateTime<chrono::Utc>>,
    /// Average operation duration in milliseconds
    pub avg_duration_ms: f64,
    /// Operations per second (calculated)
    pub ops_per_second: f64,
}

impl ServiceMetrics {
    /// Calculate error rate
    pub fn error_rate(&self) -> f64 {
        if self.operations_count == 0 {
            0.0
        } else {
            self.failed_operations as f64 / self.operations_count as f64
        }
    }
    
    /// Calculate success rate
    pub fn success_rate(&self) -> f64 {
        if self.operations_count == 0 {
            0.0
        } else {
            self.successful_operations as f64 / self.operations_count as f64
        }
    }
    
    /// Update metrics with a new operation
    pub fn record_operation(&mut self, duration: Duration, success: bool) {
        self.operations_count += 1;
        if success {
            self.successful_operations += 1;
        } else {
            self.failed_operations += 1;
        }
        
        let duration_ms = duration.as_millis() as u64;
        self.total_duration_ms += duration_ms;
        self.avg_duration_ms = self.total_duration_ms as f64 / self.operations_count as f64;
        self.last_operation_at = Some(chrono::Utc::now());
    }
}

/// Base trait that all PoD Protocol services must implement
#[async_trait]
pub trait BaseService: Send + Sync {
    type Error: std::error::Error + Send + Sync + 'static;
    
    /// Initialize the service with a program instance
    async fn initialize(&mut self, program: Program<Arc<Keypair>>) -> Result<(), Self::Error>;
    
    /// Get the current program instance
    fn program(&self) -> Result<&Program<Arc<Keypair>>, Self::Error>;
    
    /// Validate service configuration
    fn validate_config(&self) -> Result<(), Self::Error>;
    
    /// Get service health status
    fn health_check(&self) -> ServiceHealth;
    
    /// Get service metrics
    fn metrics(&self) -> ServiceMetrics;
    
    /// Graceful shutdown
    async fn shutdown(&mut self) -> Result<(), Self::Error>;
    
    /// Get service name for logging and metrics
    fn service_name(&self) -> &'static str;
}

/// Common functionality shared by all services
pub struct ServiceBase {
    /// Service configuration
    config: ServiceConfig,
    /// Anchor program instance (None until initialized)
    program: Option<Program<Arc<Keypair>>>,
    /// Service metrics
    metrics: Arc<RwLock<ServiceMetrics>>,
    /// Initialization timestamp
    initialized_at: Option<Instant>,
    /// Rate limiter
    rate_limiter: Arc<RwLock<RateLimiter>>,
}

impl std::fmt::Debug for ServiceBase {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("ServiceBase")
            .field("config", &self.config)
            .field("metrics", &"<ServiceMetrics>")
            .field("initialized_at", &self.initialized_at)
            .field("rate_limiter", &"<RateLimiter>")
            .field("program", &self.program.is_some())
            .finish()
    }
}

impl ServiceBase {
    /// Create a new service base
    pub fn new(config: ServiceConfig) -> Self {
        let rate_limiter = Arc::new(RwLock::new(RateLimiter::new(config.rate_limit_config.clone())));
        
        Self {
            config,
            program: None,
            metrics: Arc::new(RwLock::new(ServiceMetrics::default())),
            initialized_at: None,
            rate_limiter,
        }
    }
    
    /// Initialize with a program instance
    pub async fn initialize(&mut self, program: Program<Arc<Keypair>>) -> Result<()> {
        self.program = Some(program);
        self.initialized_at = Some(Instant::now());
        Ok(())
    }
    
    /// Get the program instance
    pub fn program(&self) -> Result<&Program<Arc<Keypair>>> {
        self.program.as_ref().ok_or(PodComError::NotInitialized)
    }
    
    /// Get service configuration
    pub fn config(&self) -> &ServiceConfig {
        &self.config
    }
    
    /// Get service metrics
    pub async fn metrics(&self) -> ServiceMetrics {
        self.metrics.read().await.clone()
    }
    
    /// Record an operation in metrics
    pub async fn record_operation(&self, duration: Duration, success: bool) {
        let mut metrics = self.metrics.write().await;
        metrics.record_operation(duration, success);
    }
    
    /// Check rate limits before performing an operation
    pub async fn check_rate_limit(&self, operation: &str) -> Result<()> {
        let mut rate_limiter = self.rate_limiter.write().await;
        if !rate_limiter.allow_operation(operation) {
            return Err(PodComError::RateLimited {
                operation: operation.to_string(),
                retry_after: rate_limiter.retry_after(operation),
            });
        }
        Ok(())
    }
    
    /// Execute an operation with metrics, rate limiting, and error handling
    pub async fn execute_operation<F, T, E>(
        &self,
        operation_name: &str,
        operation: F,
    ) -> Result<T>
    where
        F: std::future::Future<Output = std::result::Result<T, E>>,
        E: Into<PodComError>,
    {
        // Check rate limits
        self.check_rate_limit(operation_name).await?;
        
        let start_time = Instant::now();
        
        // Execute operation
        let result = operation.await;
        
        let duration = start_time.elapsed();
        let success = result.is_ok();
        
        // Record metrics
        self.record_operation(duration, success).await;
        
        // Convert error and return
        result.map_err(|e| e.into())
    }
    
    /// Get health status
    pub fn health_check(&self) -> ServiceHealth {
        if self.program.is_none() {
            return ServiceHealth::NotInitialized;
        }
        
        // Check if service has been running for a reasonable time
        if let Some(init_time) = self.initialized_at {
            if init_time.elapsed() < Duration::from_secs(5) {
                return ServiceHealth::Healthy; // Recently initialized
            }
        }
        
        // Perform sophisticated health checks based on metrics
        let metrics = futures::executor::block_on(self.metrics());
        
        // If no operations have been performed yet, consider healthy
        if metrics.operations_count == 0 {
            return ServiceHealth::Healthy;
        }
        
        // Check error rate
        let error_rate = metrics.error_rate();
        let recent_activity = metrics.last_operation_at
            .map(|last| {
                let now = chrono::Utc::now();
                let minutes_since_last = now.signed_duration_since(last).num_minutes();
                minutes_since_last < 5 // Active within last 5 minutes
            })
            .unwrap_or(false);
        
        // Determine health based on error rate and activity
        match error_rate {
            rate if rate >= 0.8 => {
                // 80% or higher error rate is unhealthy
                ServiceHealth::Unhealthy
            },
            rate if rate >= 0.5 => {
                // 50-80% error rate is degraded
                ServiceHealth::Degraded
            },
            rate if rate >= 0.2 => {
                // 20-50% error rate - check if recent activity helps
                if recent_activity && metrics.operations_count >= 10 {
                    // If we have recent activity and sufficient sample size, it's degraded
                    ServiceHealth::Degraded
                } else {
                    // Otherwise still healthy but watch closely
                    ServiceHealth::Healthy
                }
            },
            _ => {
                // Less than 20% error rate
                if !recent_activity && metrics.operations_count > 100 {
                    // No recent activity but has history - might be degraded
                    ServiceHealth::Degraded
                } else {
                    ServiceHealth::Healthy
                }
            }
        }
    }
    
    /// Shutdown the service
    pub async fn shutdown(&mut self) -> Result<()> {
        self.program = None;
        self.initialized_at = None;
        Ok(())
    }
}

/// Rate limiter implementation
#[derive(Debug)]
pub struct RateLimiter {
    config: RateLimitConfig,
    operation_counts: std::collections::HashMap<String, OperationCounter>,
}

#[derive(Debug)]
struct OperationCounter {
    count: u32,
    window_start: Instant,
    last_request: Instant,
}

impl RateLimiter {
    pub fn new(config: RateLimitConfig) -> Self {
        Self {
            config,
            operation_counts: std::collections::HashMap::new(),
        }
    }
    
    /// Check if an operation is allowed under rate limits
    pub fn allow_operation(&mut self, operation: &str) -> bool {
        let now = Instant::now();
        let counter = self.operation_counts.entry(operation.to_string()).or_insert(OperationCounter {
            count: 0,
            window_start: now,
            last_request: now,
        });
        
        // Reset window if expired
        if now.duration_since(counter.window_start) >= self.config.window_duration {
            counter.count = 0;
            counter.window_start = now;
        }
        
        // Check rate limit
        if counter.count >= self.config.max_requests_per_window {
            return false;
        }
        
        // Update counter
        counter.count += 1;
        counter.last_request = now;
        
        true
    }
    
    /// Get retry after duration for an operation
    pub fn retry_after(&self, operation: &str) -> Option<Duration> {
        if let Some(counter) = self.operation_counts.get(operation) {
            let window_remaining = self.config.window_duration
                .saturating_sub(counter.window_start.elapsed());
            if window_remaining > Duration::ZERO {
                return Some(window_remaining);
            }
        }
        None
    }
}

/// Retry logic for operations
pub struct RetryHandler {
    config: RetryConfig,
}

impl RetryHandler {
    pub fn new(config: RetryConfig) -> Self {
        Self { config }
    }
    
    /// Execute an operation with retry logic
    pub async fn execute_with_retry<F, T, E, Fut>(
        &self,
        operation: F,
    ) -> std::result::Result<T, E>
    where
        F: Fn() -> Fut,
        Fut: std::future::Future<Output = std::result::Result<T, E>>,
        E: std::fmt::Debug,
    {
        let mut last_error = None;
        
        for attempt in 0..=self.config.max_retries {
            match operation().await {
                Ok(result) => return Ok(result),
                Err(e) => {
                    last_error = Some(e);
                    
                    if attempt < self.config.max_retries {
                        let delay = self.calculate_delay(attempt);
                        tokio::time::sleep(delay).await;
                    }
                }
            }
        }
        
        Err(last_error.unwrap())
    }
    
    fn calculate_delay(&self, attempt: u32) -> Duration {
        let base_delay = self.config.base_delay;
        let multiplier = self.config.multiplier.powi(attempt as i32);
        let delay = base_delay.mul_f64(multiplier);
        
        // Apply jitter
        let jitter = if self.config.jitter > 0.0 {
            use rand::Rng;
            let mut rng = rand::thread_rng();
            let jitter_factor = rng.gen_range(1.0 - self.config.jitter..=1.0 + self.config.jitter);
            delay.mul_f64(jitter_factor)
        } else {
            delay
        };
        
        std::cmp::min(jitter, self.config.max_delay)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::Duration;

    #[test]
    fn test_service_metrics() {
        let mut metrics = ServiceMetrics::default();
        
        metrics.record_operation(Duration::from_millis(100), true);
        metrics.record_operation(Duration::from_millis(200), false);
        
        assert_eq!(metrics.operations_count, 2);
        assert_eq!(metrics.successful_operations, 1);
        assert_eq!(metrics.failed_operations, 1);
        assert_eq!(metrics.error_rate(), 0.5);
        assert_eq!(metrics.success_rate(), 0.5);
        assert_eq!(metrics.avg_duration_ms, 150.0);
    }

    #[test]
    fn test_rate_limiter() {
        let config = RateLimitConfig {
            max_requests_per_window: 2,
            window_duration: Duration::from_secs(60),
        };
        let mut rate_limiter = RateLimiter::new(config);
        
        assert!(rate_limiter.allow_operation("test"));
        assert!(rate_limiter.allow_operation("test"));
        assert!(!rate_limiter.allow_operation("test"));
    }
} 