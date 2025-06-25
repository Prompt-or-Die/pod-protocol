//! # Configuration Management
//!
//! Configuration types and builders for the PoD Protocol Rust SDK.

use serde::{Deserialize, Serialize};
use solana_sdk::{commitment_config::CommitmentConfig, pubkey::Pubkey};
use solana_rpc_client::rpc_client::RpcClient;
use solana_rpc_client_api::config::RpcTransactionConfig;
use std::time::Duration;
use url::Url;

use crate::error::{ConfigError, Result};

/// Main configuration for the PoD Protocol client
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PodComConfig {
    /// Solana RPC endpoint URL
    pub rpc_url: String,
    /// WebSocket endpoint URL (optional)
    pub ws_url: Option<String>,
    /// Commitment level for transactions
    pub commitment: CommitmentConfig,
    /// PoD Protocol program ID
    pub program_id: Pubkey,
    /// Network configuration
    pub network: NetworkConfig,
    /// Retry configuration
    pub retry_config: RetryConfig,
    /// Rate limiting configuration
    pub rate_limit_config: RateLimitConfig,
    /// Cache configuration
    pub cache_config: CacheConfig,
    /// Security configuration
    pub security_config: SecurityConfig,
    /// Performance configuration
    pub performance_config: PerformanceConfig,
}

impl PodComConfig {
    /// Create configuration for Solana devnet
    pub fn devnet() -> Self {
        Self {
            rpc_url: "https://api.devnet.solana.com".to_string(),
            ws_url: Some("wss://api.devnet.solana.com".to_string()),
            commitment: CommitmentConfig::confirmed(),
            program_id: crate::PROGRAM_ID,
            network: NetworkConfig::devnet(),
            retry_config: RetryConfig::default(),
            rate_limit_config: RateLimitConfig::default(),
            cache_config: CacheConfig::default(),
            security_config: SecurityConfig::default(),
            performance_config: PerformanceConfig::default(),
        }
    }
    
    /// Create configuration for Solana mainnet
    pub fn mainnet() -> Self {
        Self {
            rpc_url: "https://api.mainnet-beta.solana.com".to_string(),
            ws_url: Some("wss://api.mainnet-beta.solana.com".to_string()),
            commitment: CommitmentConfig::finalized(),
            program_id: crate::PROGRAM_ID,
            network: NetworkConfig::mainnet(),
            retry_config: RetryConfig::conservative(),
            rate_limit_config: RateLimitConfig::strict(),
            cache_config: CacheConfig::production(),
            security_config: SecurityConfig::strict(),
            performance_config: PerformanceConfig::optimized(),
        }
    }
    
    /// Create configuration for local testing
    pub fn localnet() -> Self {
        Self {
            rpc_url: "http://127.0.0.1:8899".to_string(),
            ws_url: Some("ws://127.0.0.1:8900".to_string()),
            commitment: CommitmentConfig::processed(),
            program_id: crate::PROGRAM_ID,
            network: NetworkConfig::localnet(),
            retry_config: RetryConfig::aggressive(),
            rate_limit_config: RateLimitConfig::permissive(),
            cache_config: CacheConfig::disabled(),
            security_config: SecurityConfig::permissive(),
            performance_config: PerformanceConfig::debug(),
        }
    }
    
    /// Create a configuration builder
    pub fn builder() -> PodComConfigBuilder {
        PodComConfigBuilder::new()
    }
    
    /// Validate the configuration
    pub fn validate(&self) -> Result<()> {
        // Validate RPC URL
        Url::parse(&self.rpc_url).map_err(|_| ConfigError::Invalid {
            field: "rpc_url".to_string(),
            value: self.rpc_url.clone(),
            reason: "Invalid URL format".to_string(),
        })?;
        
        // Validate WebSocket URL if provided
        if let Some(ref ws_url) = self.ws_url {
            Url::parse(ws_url).map_err(|_| ConfigError::Invalid {
                field: "ws_url".to_string(),
                value: ws_url.clone(),
                reason: "Invalid WebSocket URL format".to_string(),
            })?;
        }
        
        // Validate network configuration
        self.network.validate()?;
        self.retry_config.validate()?;
        self.rate_limit_config.validate()?;
        self.cache_config.validate()?;
        self.security_config.validate()?;
        self.performance_config.validate()?;
        
        Ok(())
    }
}

/// Network-specific configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NetworkConfig {
    /// Connection timeout
    pub timeout: Duration,
    /// Maximum concurrent connections
    pub max_connections: usize,
    /// Connection pool size
    pub connection_pool_size: usize,
    /// Keep-alive interval
    pub keepalive_interval: Duration,
    /// Enable HTTP/2
    pub enable_http2: bool,
    /// Enable compression
    pub enable_compression: bool,
    /// User agent string
    pub user_agent: String,
}

impl NetworkConfig {
    /// Configuration for devnet
    pub fn devnet() -> Self {
        Self {
            timeout: Duration::from_secs(30),
            max_connections: 10,
            connection_pool_size: 5,
            keepalive_interval: Duration::from_secs(30),
            enable_http2: true,
            enable_compression: true,
            user_agent: format!("pod-protocol-rust-sdk/{}", crate::VERSION),
        }
    }
    
    /// Configuration for mainnet (more conservative)
    pub fn mainnet() -> Self {
        Self {
            timeout: Duration::from_secs(60),
            max_connections: 20,
            connection_pool_size: 10,
            keepalive_interval: Duration::from_secs(45),
            enable_http2: true,
            enable_compression: true,
            user_agent: format!("pod-protocol-rust-sdk/{}", crate::VERSION),
        }
    }
    
    /// Configuration for local testing
    pub fn localnet() -> Self {
        Self {
            timeout: Duration::from_secs(10),
            max_connections: 5,
            connection_pool_size: 2,
            keepalive_interval: Duration::from_secs(15),
            enable_http2: false,
            enable_compression: false,
            user_agent: format!("pod-protocol-rust-sdk/{} (localnet)", crate::VERSION),
        }
    }
    
    /// Validate network configuration
    pub fn validate(&self) -> Result<()> {
        if self.timeout.is_zero() {
            return Err(ConfigError::Invalid {
                field: "timeout".to_string(),
                value: format!("{:?}", self.timeout),
                reason: "Timeout cannot be zero".to_string(),
            })?;
        }
        
        if self.max_connections == 0 {
            return Err(ConfigError::Invalid {
                field: "max_connections".to_string(),
                value: self.max_connections.to_string(),
                reason: "Max connections must be greater than 0".to_string(),
            })?;
        }
        
        if self.connection_pool_size > self.max_connections {
            return Err(ConfigError::Invalid {
                field: "connection_pool_size".to_string(),
                value: self.connection_pool_size.to_string(),
                reason: "Connection pool size cannot exceed max connections".to_string(),
            })?;
        }
        
        Ok(())
    }
}

/// Retry configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RetryConfig {
    /// Maximum number of retry attempts
    pub max_attempts: usize,
    /// Base delay between retries
    pub base_delay: Duration,
    /// Maximum delay between retries
    pub max_delay: Duration,
    /// Backoff multiplier
    pub backoff_multiplier: f64,
    /// Enable jitter to prevent thundering herd
    pub enable_jitter: bool,
}

impl RetryConfig {
    /// Default retry configuration
    pub fn default() -> Self {
        Self {
            max_attempts: 3,
            base_delay: Duration::from_millis(100),
            max_delay: Duration::from_secs(10),
            backoff_multiplier: 2.0,
            enable_jitter: true,
        }
    }
    
    /// Conservative retry configuration (for production)
    pub fn conservative() -> Self {
        Self {
            max_attempts: 5,
            base_delay: Duration::from_millis(200),
            max_delay: Duration::from_secs(30),
            backoff_multiplier: 1.5,
            enable_jitter: true,
        }
    }
    
    /// Aggressive retry configuration (for development)
    pub fn aggressive() -> Self {
        Self {
            max_attempts: 10,
            base_delay: Duration::from_millis(50),
            max_delay: Duration::from_secs(5),
            backoff_multiplier: 1.2,
            enable_jitter: false,
        }
    }
    
    /// Validate retry configuration
    pub fn validate(&self) -> Result<()> {
        if self.max_attempts == 0 {
            return Err(ConfigError::Invalid {
                field: "max_attempts".to_string(),
                value: self.max_attempts.to_string(),
                reason: "Max attempts must be greater than 0".to_string(),
            })?;
        }
        
        if self.base_delay.is_zero() {
            return Err(ConfigError::Invalid {
                field: "base_delay".to_string(),
                value: format!("{:?}", self.base_delay),
                reason: "Base delay cannot be zero".to_string(),
            })?;
        }
        
        if self.max_delay < self.base_delay {
            return Err(ConfigError::Invalid {
                field: "max_delay".to_string(),
                value: format!("{:?}", self.max_delay),
                reason: "Max delay cannot be less than base delay".to_string(),
            })?;
        }
        
        if self.backoff_multiplier <= 1.0 {
            return Err(ConfigError::Invalid {
                field: "backoff_multiplier".to_string(),
                value: self.backoff_multiplier.to_string(),
                reason: "Backoff multiplier must be greater than 1.0".to_string(),
            })?;
        }
        
        Ok(())
    }
}

/// Rate limiting configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RateLimitConfig {
    /// Requests per second limit
    pub requests_per_second: u32,
    /// Burst capacity
    pub burst_capacity: u32,
    /// Enable rate limiting
    pub enabled: bool,
    /// Rate limit window duration
    pub window_duration: Duration,
}

impl RateLimitConfig {
    /// Default rate limiting
    pub fn default() -> Self {
        Self {
            requests_per_second: 10,
            burst_capacity: 20,
            enabled: true,
            window_duration: Duration::from_secs(1),
        }
    }
    
    /// Strict rate limiting (for production)
    pub fn strict() -> Self {
        Self {
            requests_per_second: 5,
            burst_capacity: 10,
            enabled: true,
            window_duration: Duration::from_secs(1),
        }
    }
    
    /// Permissive rate limiting (for development)
    pub fn permissive() -> Self {
        Self {
            requests_per_second: 100,
            burst_capacity: 200,
            enabled: false,
            window_duration: Duration::from_secs(1),
        }
    }
    
    /// Validate rate limit configuration
    pub fn validate(&self) -> Result<()> {
        if self.enabled {
            if self.requests_per_second == 0 {
                return Err(ConfigError::Invalid {
                    field: "requests_per_second".to_string(),
                    value: self.requests_per_second.to_string(),
                    reason: "Requests per second must be greater than 0 when enabled".to_string(),
                })?;
            }
            
            if self.burst_capacity < self.requests_per_second {
                return Err(ConfigError::Invalid {
                    field: "burst_capacity".to_string(),
                    value: self.burst_capacity.to_string(),
                    reason: "Burst capacity should be >= requests per second".to_string(),
                })?;
            }
        }
        
        Ok(())
    }
}

/// Cache configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CacheConfig {
    /// Enable caching
    pub enabled: bool,
    /// Maximum cache size (number of entries)
    pub max_size: usize,
    /// Default TTL for cache entries
    pub default_ttl: Duration,
    /// Enable persistent cache
    pub persistent: bool,
}

impl CacheConfig {
    /// Default cache configuration
    pub fn default() -> Self {
        Self {
            enabled: true,
            max_size: 1000,
            default_ttl: Duration::from_secs(300), // 5 minutes
            persistent: false,
        }
    }
    
    /// Production cache configuration
    pub fn production() -> Self {
        Self {
            enabled: true,
            max_size: 10000,
            default_ttl: Duration::from_secs(600), // 10 minutes
            persistent: true,
        }
    }
    
    /// Disabled cache (for testing)
    pub fn disabled() -> Self {
        Self {
            enabled: false,
            max_size: 0,
            default_ttl: Duration::from_secs(0),
            persistent: false,
        }
    }
    
    /// Validate cache configuration
    pub fn validate(&self) -> Result<()> {
        if self.enabled && self.max_size == 0 {
            return Err(ConfigError::Invalid {
                field: "max_size".to_string(),
                value: self.max_size.to_string(),
                reason: "Max size must be greater than 0 when caching is enabled".to_string(),
            })?;
        }
        
        Ok(())
    }
}

/// Security configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SecurityConfig {
    /// Enable request signing
    pub enable_signing: bool,
    /// Enable TLS certificate verification
    pub verify_certificates: bool,
    /// Enable input validation
    pub enable_validation: bool,
    /// Enable security logging
    pub enable_logging: bool,
}

impl SecurityConfig {
    /// Default security configuration
    pub fn default() -> Self {
        Self {
            enable_signing: true,
            verify_certificates: true,
            enable_validation: true,
            enable_logging: true,
        }
    }
    
    /// Strict security configuration
    pub fn strict() -> Self {
        Self {
            enable_signing: true,
            verify_certificates: true,
            enable_validation: true,
            enable_logging: true,
        }
    }
    
    /// Permissive security configuration (for development)
    pub fn permissive() -> Self {
        Self {
            enable_signing: false,
            verify_certificates: false,
            enable_validation: false,
            enable_logging: false,
        }
    }
    
    /// Validate security configuration
    pub fn validate(&self) -> Result<()> {
        // Security configuration is always valid
        Ok(())
    }
}

/// Performance configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PerformanceConfig {
    /// Enable performance monitoring
    pub enable_metrics: bool,
    /// Batch size for operations
    pub batch_size: usize,
    /// Worker thread count
    pub worker_threads: Option<usize>,
    /// Enable SIMD optimizations
    pub enable_simd: bool,
}

impl PerformanceConfig {
    /// Default performance configuration
    pub fn default() -> Self {
        Self {
            enable_metrics: true,
            batch_size: 10,
            worker_threads: None, // Use default
            enable_simd: true,
        }
    }
    
    /// Optimized performance configuration
    pub fn optimized() -> Self {
        Self {
            enable_metrics: true,
            batch_size: 50,
            worker_threads: Some(num_cpus::get()),
            enable_simd: true,
        }
    }
    
    /// Debug performance configuration
    pub fn debug() -> Self {
        Self {
            enable_metrics: false,
            batch_size: 1,
            worker_threads: Some(1),
            enable_simd: false,
        }
    }
    
    /// Validate performance configuration
    pub fn validate(&self) -> Result<()> {
        if self.batch_size == 0 {
            return Err(ConfigError::Invalid {
                field: "batch_size".to_string(),
                value: self.batch_size.to_string(),
                reason: "Batch size must be greater than 0".to_string(),
            })?;
        }
        
        if let Some(threads) = self.worker_threads {
            if threads == 0 {
                return Err(ConfigError::Invalid {
                    field: "worker_threads".to_string(),
                    value: threads.to_string(),
                    reason: "Worker threads must be greater than 0 if specified".to_string(),
                })?;
            }
        }
        
        Ok(())
    }
}

/// Configuration builder for fluent configuration
#[derive(Debug, Default)]
pub struct PodComConfigBuilder {
    rpc_url: Option<String>,
    ws_url: Option<String>,
    commitment: Option<CommitmentConfig>,
    program_id: Option<Pubkey>,
    network: Option<NetworkConfig>,
    retry_config: Option<RetryConfig>,
    rate_limit_config: Option<RateLimitConfig>,
    cache_config: Option<CacheConfig>,
    security_config: Option<SecurityConfig>,
    performance_config: Option<PerformanceConfig>,
}

impl PodComConfigBuilder {
    /// Create a new configuration builder
    pub fn new() -> Self {
        Self::default()
    }
    
    /// Set RPC URL
    pub fn rpc_url<S: Into<String>>(mut self, url: S) -> Self {
        self.rpc_url = Some(url.into());
        self
    }
    
    /// Set WebSocket URL
    pub fn ws_url<S: Into<String>>(mut self, url: S) -> Self {
        self.ws_url = Some(url.into());
        self
    }
    
    /// Set commitment level
    pub fn commitment(mut self, commitment: CommitmentConfig) -> Self {
        self.commitment = Some(commitment);
        self
    }
    
    /// Set program ID
    pub fn program_id(mut self, program_id: Pubkey) -> Self {
        self.program_id = Some(program_id);
        self
    }
    
    /// Set network configuration
    pub fn network(mut self, network: NetworkConfig) -> Self {
        self.network = Some(network);
        self
    }
    
    /// Set retry configuration
    pub fn retry_config(mut self, retry_config: RetryConfig) -> Self {
        self.retry_config = Some(retry_config);
        self
    }
    
    /// Set rate limit configuration
    pub fn rate_limit_config(mut self, rate_limit_config: RateLimitConfig) -> Self {
        self.rate_limit_config = Some(rate_limit_config);
        self
    }
    
    /// Set cache configuration
    pub fn cache_config(mut self, cache_config: CacheConfig) -> Self {
        self.cache_config = Some(cache_config);
        self
    }
    
    /// Set security configuration
    pub fn security_config(mut self, security_config: SecurityConfig) -> Self {
        self.security_config = Some(security_config);
        self
    }
    
    /// Set performance configuration
    pub fn performance_config(mut self, performance_config: PerformanceConfig) -> Self {
        self.performance_config = Some(performance_config);
        self
    }
    
    /// Build the configuration
    pub fn build(self) -> Result<PodComConfig> {
        let config = PodComConfig {
            rpc_url: self.rpc_url.unwrap_or_else(|| "https://api.devnet.solana.com".to_string()),
            ws_url: self.ws_url,
            commitment: self.commitment.unwrap_or_else(|| CommitmentConfig::confirmed()),
            program_id: self.program_id.unwrap_or(crate::PROGRAM_ID),
            network: self.network.unwrap_or_else(NetworkConfig::devnet),
            retry_config: self.retry_config.unwrap_or_else(RetryConfig::default),
            rate_limit_config: self.rate_limit_config.unwrap_or_else(RateLimitConfig::default),
            cache_config: self.cache_config.unwrap_or_else(CacheConfig::default),
            security_config: self.security_config.unwrap_or_else(SecurityConfig::default),
            performance_config: self.performance_config.unwrap_or_else(PerformanceConfig::default),
        };
        
        config.validate()?;
        Ok(config)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_devnet_config() {
        let config = PodComConfig::devnet();
        assert!(config.validate().is_ok());
        assert!(config.rpc_url.contains("devnet"));
    }

    #[test]
    fn test_mainnet_config() {
        let config = PodComConfig::mainnet();
        assert!(config.validate().is_ok());
        assert!(config.rpc_url.contains("mainnet"));
    }

    #[test]
    fn test_config_builder() {
        let config = PodComConfig::builder()
            .rpc_url("https://custom.rpc.com")
            .commitment(CommitmentConfig::finalized())
            .build()
            .unwrap();
        
        assert_eq!(config.rpc_url, "https://custom.rpc.com");
        assert_eq!(config.commitment, CommitmentConfig::finalized());
    }

    #[test]
    fn test_invalid_config() {
        let mut config = PodComConfig::devnet();
        config.rpc_url = "invalid-url".to_string();
        assert!(config.validate().is_err());
    }

    #[test]
    fn test_retry_config_validation() {
        let mut retry_config = RetryConfig::default();
        retry_config.max_attempts = 0;
        assert!(retry_config.validate().is_err());
        
        retry_config.max_attempts = 3;
        retry_config.backoff_multiplier = 0.5;
        assert!(retry_config.validate().is_err());
    }
} 