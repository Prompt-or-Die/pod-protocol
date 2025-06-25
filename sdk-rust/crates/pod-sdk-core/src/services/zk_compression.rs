//! # ZK Compression Service
//!
//! Service for zero-knowledge compression on the PoD Protocol.
//! Provides privacy-preserving compression with cryptographic proofs for data integrity.

use std::sync::Arc;
use std::collections::HashMap;

use anchor_client::Program;
use rand::{distributions::Alphanumeric, Rng};
use async_trait::async_trait;
use solana_sdk::{
    pubkey::Pubkey,
    signer::{keypair::Keypair, Signer},
};
use serde::{Deserialize, Serialize};

use pod_sdk_types::{
    AgentAccount,
};

use crate::{
    error::{PodComError, Result},
    services::base::{BaseService, ServiceBase, ServiceConfig, ServiceHealth, ServiceMetrics},
    utils::{
        zk::{ZKProof, ZKCircuit, ZKCompressor, CompressionProof},
        compression::{CompressionAlgorithm, CompressionLevel},
        zk::{generate_commitment, verify_merkle_proof},
    },
};

/// Service for zero-knowledge compression
#[derive(Debug)]
pub struct ZKCompressionService {
    base: ServiceBase,
    zk_compressor: Arc<ZKCompressor>,
    proof_cache: Arc<tokio::sync::RwLock<ProofCache>>,
    compression_stats: Arc<tokio::sync::RwLock<CompressionStats>>,
}

impl ZKCompressionService {
    /// Create a new ZK compression service
    pub fn new(config: ServiceConfig) -> Self {
        let zk_compressor = Arc::new(ZKCompressor::new(config.zk_compression_config.clone()));
        
        Self {
            base: ServiceBase::new(config),
            zk_compressor,
            proof_cache: Arc::new(tokio::sync::RwLock::new(ProofCache::new())),
            compression_stats: Arc::new(tokio::sync::RwLock::new(CompressionStats::new())),
        }
    }

    /// Compress data with zero-knowledge proof
    pub async fn compress_data(
        &self,
        compressor: &Keypair,
        data: Vec<u8>,
        params: CompressDataParams,
    ) -> Result<(Vec<u8>, CompressionProof, ZKCompressionAccount)> {
        let operation_name = "compress_data";
        
        self.base.execute_operation(operation_name, async {
            let program = self.base.program()?;
            
            // Validate input data
            if data.is_empty() {
                return Err(PodComError::EmptyCompressionInput);
            }
            
            if data.len() > MAX_COMPRESSION_INPUT_SIZE {
                return Err(PodComError::CompressionInputTooLarge {
                    size: data.len(),
                    max_size: MAX_COMPRESSION_INPUT_SIZE,
                });
            }
            
            // Perform ZK compression
            let compression_result = self.zk_compressor.compress_with_proof(
                &data,
                params.algorithm,
                params.level,
                params.privacy_level,
            ).await?;
            
            // Generate commitment to original data
            let data_commitment = generate_commitment(&data, &compression_result.randomness)?;
            
            // Create on-chain account for compression metadata
            let compression_id: String = rand::thread_rng()
                .sample_iter(&rand::distributions::Alphanumeric)
                .take(32)
                .map(char::from)
                .collect();
            let (compression_pda, _bump) = derive_zk_compression_pda(&compressor.pubkey(), &compression_id)?;
            
            // Build instruction - Note: pod-com doesn't have separate ZK compression functionality
            // The program has compressed message support built-in, this would need custom implementation
            return Err(PodComError::NotImplemented {
                feature: "create_zk_compression".to_string(),
            });

            // Send transaction
            let signature = ix.send()?;
            
            // Fetch created compression account
            let compression_account = self.get_zk_compression_account(&compression_pda).await?;
            
            // Cache proof for future verification
            {
                let mut cache = self.proof_cache.write().await;
                cache.store_proof(compression_result.proof.hash(), compression_result.proof.clone());
            }
            
            // Update statistics
            {
                let mut stats = self.compression_stats.write().await;
                stats.record_compression(
                    data.len(),
                    compression_result.compressed_data.len(),
                    params.algorithm,
                );
            }
            
            tracing::info!(
                compression_address = %compression_pda,
                signature = %signature,
                compressor = %compressor.pubkey(),
                original_size = data.len(),
                compressed_size = compression_result.compressed_data.len(),
                compression_ratio = format!("{:.2}", data.len() as f64 / compression_result.compressed_data.len() as f64),
                algorithm = ?params.algorithm,
                "Data compressed with ZK proof successfully"
            );

            Ok((compression_result.compressed_data, compression_result.proof, compression_account))
        }).await
    }

    /// Decompress data and verify proof
    pub async fn decompress_data(
        &self,
        decompressor: &Keypair,
        compressed_data: Vec<u8>,
        proof: CompressionProof,
        params: DecompressDataParams,
    ) -> Result<Vec<u8>> {
        let operation_name = "decompress_data";
        
        self.base.execute_operation(operation_name, async {
            // Verify the compression proof first
            if !self.verify_compression_proof(&compressed_data, &proof, &params.expected_commitment).await? {
                return Err(PodComError::InvalidCompressionProof {
                    proof_hash: proof.hash(),
                });
            }
            
            // Perform ZK decompression
            let decompressed_data = self.zk_compressor.decompress_with_verification(
                &compressed_data,
                &proof,
                params.algorithm,
            ).await?;
            
            // Verify data integrity using commitment
            let computed_commitment = generate_commitment(&decompressed_data, &proof.randomness)?;
            if computed_commitment != params.expected_commitment {
                return Err(PodComError::CompressionDataIntegrityFailed {
                    expected_commitment: params.expected_commitment,
                    computed_commitment,
                });
            }
            
            tracing::info!(
                decompressor = %decompressor.pubkey(),
                compressed_size = compressed_data.len(),
                decompressed_size = decompressed_data.len(),
                algorithm = ?params.algorithm,
                "Data decompressed and verified successfully"
            );
            
            Ok(decompressed_data)
        }).await
    }

    /// Verify compression proof without decompressing
    pub async fn verify_compression_proof(
        &self,
        compressed_data: &[u8],
        proof: &CompressionProof,
        expected_commitment: &[u8],
    ) -> Result<bool> {
        let operation_name = "verify_compression_proof";
        
        self.base.execute_operation(operation_name, async {
            // Check proof cache first
            {
                let cache = self.proof_cache.read().await;
                if let Some(cached_proof) = cache.get_proof(&proof.hash()) {
                    if cached_proof.hash() == proof.hash() {
                        // Verify cached proof is still valid
                        return Ok(self.zk_compressor.verify_proof(compressed_data, cached_proof).await?);
                    }
                }
            }
            
            // Verify proof using ZK circuit
            let is_valid = self.zk_compressor.verify_proof(compressed_data, proof).await?;
            
            if is_valid {
                // Cache valid proof
                let mut cache = self.proof_cache.write().await;
                cache.store_proof(proof.hash(), proof.clone());
            }
            
            Ok(is_valid)
        }).await
    }

    /// Get ZK compression account
    pub async fn get_zk_compression_account(&self, compression_address: &Pubkey) -> Result<ZKCompressionAccount> {
        let operation_name = "get_zk_compression_account";
        
        self.base.execute_operation(operation_name, async {
            let program = self.base.program()?;
            
            let account_data = program.account::<ZKCompressionAccount>(*compression_address)?;
            self.validate_zk_compression_account(&account_data)?;
            
            Ok(account_data)
        }).await
    }

    /// Batch compress multiple data items
    pub async fn batch_compress(
        &self,
        compressor: &Keypair,
        data_items: Vec<Vec<u8>>,
        params: CompressDataParams,
    ) -> Result<BatchCompressionResult> {
        let operation_name = "batch_compress";
        
        self.base.execute_operation(operation_name, async {
            if data_items.is_empty() {
                return Err(PodComError::EmptyBatchCompressionInput);
            }
            
            if data_items.len() > MAX_BATCH_COMPRESSION_SIZE {
                return Err(PodComError::BatchCompressionTooLarge {
                    size: data_items.len(),
                    max_size: MAX_BATCH_COMPRESSION_SIZE,
                });
            }
            
            let mut compressed_items = Vec::new();
            let mut proofs = Vec::new();
            let mut total_original_size = 0u64;
            let mut total_compressed_size = 0u64;
            
            // Compress each item
            for (index, data) in data_items.iter().enumerate() {
                let item_params = CompressDataParams {
                    algorithm: params.algorithm,
                    level: params.level,
                    privacy_level: params.privacy_level,
                    metadata: params.metadata.clone().map(|mut m| {
                        m.insert("batch_index".to_string(), index.to_string());
                        m
                    }),
                };
                
                let (compressed_data, proof, _) = self.compress_data(compressor, data.clone(), item_params).await?;
                
                total_original_size += data.len() as u64;
                total_compressed_size += compressed_data.len() as u64;
                
                compressed_items.push(compressed_data);
                proofs.push(proof);
            }
            
            // Generate batch proof
            let batch_proof = self.zk_compressor.generate_batch_proof(&proofs).await?;
            
            let result = BatchCompressionResult {
                compressed_items,
                individual_proofs: proofs,
                batch_proof,
                total_original_size,
                total_compressed_size,
                compression_ratio: total_original_size as f64 / total_compressed_size as f64,
                items_count: data_items.len(),
            };
            
            tracing::info!(
                compressor = %compressor.pubkey(),
                items_count = data_items.len(),
                total_original_size = total_original_size,
                total_compressed_size = total_compressed_size,
                compression_ratio = format!("{:.2}", result.compression_ratio),
                "Batch compression completed successfully"
            );
            
            Ok(result)
        }).await
    }

    /// Get compression statistics
    pub async fn get_compression_stats(&self) -> Result<CompressionStatsReport> {
        let operation_name = "get_compression_stats";
        
        self.base.execute_operation(operation_name, async {
            let stats = self.compression_stats.read().await;
            Ok(stats.generate_report())
        }).await
    }

    /// List compressions by compressor
    pub async fn list_compressions_by_compressor(&self, compressor: &Pubkey) -> Result<Vec<(Pubkey, ZKCompressionAccount)>> {
        let operation_name = "list_compressions_by_compressor";
        
        self.base.execute_operation(operation_name, async {
            let program = self.base.program()?;
            
            // Get all ZK compression accounts
            let accounts = program
                .accounts::<ZKCompressionAccount>(vec![
                    solana_account_decoder::UiAccountEncoding::Base64,
                ])
                .await?;
                
            let mut compressor_compressions = Vec::new();
            
            for (pubkey, account) in accounts {
                if account.compressor == *compressor {
                    self.validate_zk_compression_account(&account)?;
                    compressor_compressions.push((pubkey, account));
                }
            }
            
            // Sort by creation time (most recent first)
            compressor_compressions.sort_by(|a, b| b.1.created_at.cmp(&a.1.created_at));
            
            Ok(compressor_compressions)
        }).await
    }

    /// Optimize compression parameters for given data characteristics
    pub async fn optimize_compression_params(
        &self,
        sample_data: &[u8],
        target_compression_ratio: f64,
    ) -> Result<OptimizedCompressionParams> {
        let operation_name = "optimize_compression_params";
        
        self.base.execute_operation(operation_name, async {
            let optimization_result = self.zk_compressor.optimize_parameters(
                sample_data,
                target_compression_ratio,
            ).await?;
            
            let params = OptimizedCompressionParams {
                algorithm: optimization_result.algorithm,
                level: optimization_result.level,
                privacy_level: optimization_result.privacy_level,
                expected_compression_ratio: optimization_result.estimated_ratio,
                estimated_proof_generation_time: optimization_result.estimated_proof_time,
                estimated_verification_time: optimization_result.estimated_verification_time,
                memory_usage_bytes: optimization_result.estimated_memory_usage,
            };
            
            Ok(params)
        }).await
    }

    /// Clean up expired proofs from cache
    pub async fn cleanup_proof_cache(&self) -> Result<u64> {
        let operation_name = "cleanup_proof_cache";
        
        self.base.execute_operation(operation_name, async {
            let mut cache = self.proof_cache.write().await;
            let cleaned_count = cache.cleanup_expired();
            
            tracing::info!(
                cleaned_count = cleaned_count,
                "Proof cache cleanup completed"
            );
            
            Ok(cleaned_count)
        }).await
    }

    // Helper methods

    fn validate_zk_compression_account(&self, account: &ZKCompressionAccount) -> Result<()> {
        // Validate sizes
        if account.original_size == 0 {
            return Err(PodComError::InvalidCompressionSize {
                field: "original_size".to_string(),
                value: account.original_size,
            });
        }
        
        if account.compressed_size == 0 {
            return Err(PodComError::InvalidCompressionSize {
                field: "compressed_size".to_string(),
                value: account.compressed_size,
            });
        }
        
        // Validate compression ratio (should be positive)
        let ratio = account.original_size as f64 / account.compressed_size as f64;
        if ratio <= 0.0 {
            return Err(PodComError::InvalidCompressionRatio { ratio });
        }
        
        // Validate proof hash
        if account.proof_hash.is_empty() {
            return Err(PodComError::MissingProofHash);
        }
        
        Ok(())
    }
}

// Data structures

#[derive(Debug, Clone)]
pub struct BatchCompressionResult {
    pub compressed_items: Vec<Vec<u8>>,
    pub individual_proofs: Vec<CompressionProof>,
    pub batch_proof: CompressionProof,
    pub total_original_size: u64,
    pub total_compressed_size: u64,
    pub compression_ratio: f64,
    pub items_count: usize,
}

#[derive(Debug, Clone)]
pub struct OptimizedCompressionParams {
    pub algorithm: CompressionAlgorithm,
    pub level: CompressionLevel,
    pub privacy_level: PrivacyLevel,
    pub expected_compression_ratio: f64,
    pub estimated_proof_generation_time: std::time::Duration,
    pub estimated_verification_time: std::time::Duration,
    pub memory_usage_bytes: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CompressionStatsReport {
    pub total_compressions: u64,
    pub total_original_bytes: u64,
    pub total_compressed_bytes: u64,
    pub average_compression_ratio: f64,
    pub best_compression_ratio: f64,
    pub worst_compression_ratio: f64,
    pub algorithm_distribution: HashMap<CompressionAlgorithm, u64>,
    pub level_distribution: HashMap<CompressionLevel, u64>,
    pub average_proof_generation_time: std::time::Duration,
    pub average_verification_time: std::time::Duration,
    pub cache_hit_rate: f64,
    pub last_updated: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum PrivacyLevel {
    Public,
    Private,
    HighPrivacy,
}

// Internal data structures

#[derive(Debug)]
struct ProofCache {
    proofs: HashMap<String, CachedProof>,
    max_size: usize,
    cache_duration: chrono::Duration,
}

#[derive(Debug, Clone)]
struct CachedProof {
    proof: CompressionProof,
    cached_at: chrono::DateTime<chrono::Utc>,
    access_count: u64,
    last_accessed: chrono::DateTime<chrono::Utc>,
}

impl ProofCache {
    fn new() -> Self {
        Self {
            proofs: HashMap::new(),
            max_size: 1000, // Maximum number of cached proofs
            cache_duration: chrono::Duration::hours(24),
        }
    }

    fn store_proof(&mut self, proof_hash: String, proof: CompressionProof) {
        // Remove oldest entries if cache is full
        if self.proofs.len() >= self.max_size {
            self.evict_oldest();
        }

        let cached_proof = CachedProof {
            proof,
            cached_at: chrono::Utc::now(),
            access_count: 0,
            last_accessed: chrono::Utc::now(),
        };

        self.proofs.insert(proof_hash, cached_proof);
    }

    fn get_proof(&mut self, proof_hash: &str) -> Option<&CompressionProof> {
        if let Some(cached) = self.proofs.get_mut(proof_hash) {
            cached.access_count += 1;
            cached.last_accessed = chrono::Utc::now();
            Some(&cached.proof)
        } else {
            None
        }
    }

    fn cleanup_expired(&mut self) -> u64 {
        let now = chrono::Utc::now();
        let initial_count = self.proofs.len();

        self.proofs.retain(|_, cached| {
            now - cached.cached_at < self.cache_duration
        });

        (initial_count - self.proofs.len()) as u64
    }

    fn evict_oldest(&mut self) {
        if let Some((oldest_hash, _)) = self.proofs
            .iter()
            .min_by_key(|(_, cached)| cached.last_accessed)
            .map(|(hash, cached)| (hash.clone(), cached.clone()))
        {
            self.proofs.remove(&oldest_hash);
        }
    }
}

#[derive(Debug)]
struct CompressionStats {
    total_compressions: u64,
    total_original_bytes: u64,
    total_compressed_bytes: u64,
    best_compression_ratio: f64,
    worst_compression_ratio: f64,
    algorithm_counts: HashMap<CompressionAlgorithm, u64>,
    level_counts: HashMap<CompressionLevel, u64>,
    total_proof_generation_time: std::time::Duration,
    total_verification_time: std::time::Duration,
    cache_hits: u64,
    cache_misses: u64,
    last_updated: chrono::DateTime<chrono::Utc>,
}

impl CompressionStats {
    fn new() -> Self {
        Self {
            total_compressions: 0,
            total_original_bytes: 0,
            total_compressed_bytes: 0,
            best_compression_ratio: 0.0,
            worst_compression_ratio: 0.0,
            algorithm_counts: HashMap::new(),
            level_counts: HashMap::new(),
            total_proof_generation_time: std::time::Duration::ZERO,
            total_verification_time: std::time::Duration::ZERO,
            cache_hits: 0,
            cache_misses: 0,
            last_updated: chrono::Utc::now(),
        }
    }

    fn record_compression(
        &mut self,
        original_size: usize,
        compressed_size: usize,
        algorithm: CompressionAlgorithm,
    ) {
        self.total_compressions += 1;
        self.total_original_bytes += original_size as u64;
        self.total_compressed_bytes += compressed_size as u64;

        let ratio = original_size as f64 / compressed_size as f64;
        
        if self.total_compressions == 1 {
            self.best_compression_ratio = ratio;
            self.worst_compression_ratio = ratio;
        } else {
            if ratio > self.best_compression_ratio {
                self.best_compression_ratio = ratio;
            }
            if ratio < self.worst_compression_ratio {
                self.worst_compression_ratio = ratio;
            }
        }

        *self.algorithm_counts.entry(algorithm).or_insert(0) += 1;
        self.last_updated = chrono::Utc::now();
    }

    fn generate_report(&self) -> CompressionStatsReport {
        let average_compression_ratio = if self.total_compressed_bytes > 0 {
            self.total_original_bytes as f64 / self.total_compressed_bytes as f64
        } else {
            0.0
        };

        let average_proof_generation_time = if self.total_compressions > 0 {
            self.total_proof_generation_time / self.total_compressions as u32
        } else {
            std::time::Duration::ZERO
        };

        let average_verification_time = if self.total_compressions > 0 {
            self.total_verification_time / self.total_compressions as u32
        } else {
            std::time::Duration::ZERO
        };

        let cache_hit_rate = if self.cache_hits + self.cache_misses > 0 {
            self.cache_hits as f64 / (self.cache_hits + self.cache_misses) as f64
        } else {
            0.0
        };

        CompressionStatsReport {
            total_compressions: self.total_compressions,
            total_original_bytes: self.total_original_bytes,
            total_compressed_bytes: self.total_compressed_bytes,
            average_compression_ratio,
            best_compression_ratio: self.best_compression_ratio,
            worst_compression_ratio: self.worst_compression_ratio,
            algorithm_distribution: self.algorithm_counts.clone(),
            level_distribution: self.level_counts.clone(),
            average_proof_generation_time,
            average_verification_time,
            cache_hit_rate,
            last_updated: self.last_updated,
        }
    }
}

#[async_trait]
impl BaseService for ZKCompressionService {
    type Error = PodComError;

    async fn initialize(&mut self, program: Program<Arc<Keypair>>) -> Result<(), Self::Error> {
        self.base.initialize(program).await?;
        
        // Initialize ZK compression circuits
        self.zk_compressor.initialize_circuits().await?;
        
        Ok(())
    }

    fn program(&self) -> Result<&Program<Arc<Keypair>>, Self::Error> {
        self.base.program()
    }

    fn validate_config(&self) -> Result<(), Self::Error> {
        // Validate ZK compression service specific configuration
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
        
        // Validate ZK compression specific settings
        if let Some(ref zk_config) = config.zk_compression_config {
            if zk_config.proof_size_limit == 0 {
                return Err(PodComError::InvalidConfiguration {
                    field: "zk_compression_config.proof_size_limit".to_string(),
                    reason: "Maximum proof size must be greater than 0".to_string(),
                });
            }
            
            if zk_config.proof_size_limit > 1024 * 1024 { // 1MB limit
                return Err(PodComError::InvalidConfiguration {
                    field: "zk_compression_config.proof_size_limit".to_string(),
                    reason: "Maximum proof size cannot exceed 1MB".to_string(),
                });
            }
            
            // Validate compression ratio thresholds
            if zk_config.min_compression_ratio <= 0.0 || zk_config.min_compression_ratio > 1.0 {
                return Err(PodComError::InvalidConfiguration {
                    field: "zk_compression_config.min_compression_ratio".to_string(),
                    reason: "Minimum compression ratio must be between 0.0 and 1.0".to_string(),
                });
            }
            
            // Validate circuit parameters
            if zk_config.circuit_depth == 0 {
                return Err(PodComError::InvalidConfiguration {
                    field: "zk_compression_config.circuit_depth".to_string(),
                    reason: "Circuit depth must be greater than 0".to_string(),
                });
            }
            
            if zk_config.circuit_depth > 32 {
                return Err(PodComError::InvalidConfiguration {
                    field: "zk_compression_config.circuit_depth".to_string(),
                    reason: "Circuit depth cannot exceed 32 for practical computation".to_string(),
                });
            }
            
            // Validate proving key settings
            if zk_config.proving_key_cache_size == 0 {
                return Err(PodComError::InvalidConfiguration {
                    field: "zk_compression_config.proving_key_cache_size".to_string(),
                    reason: "Proving key cache size must be greater than 0".to_string(),
                });
            }
            
            // Validate verification timeout
            if zk_config.verification_timeout_ms == 0 {
                return Err(PodComError::InvalidConfiguration {
                    field: "zk_compression_config.verification_timeout_ms".to_string(),
                    reason: "Verification timeout must be greater than 0".to_string(),
                });
            }
            
            if zk_config.verification_timeout_ms > 300000 { // 5 minutes max
                return Err(PodComError::InvalidConfiguration {
                    field: "zk_compression_config.verification_timeout_ms".to_string(),
                    reason: "Verification timeout cannot exceed 5 minutes (300000ms)".to_string(),
                });
            }
        }
        
        Ok(())
    }

    fn health_check(&self) -> ServiceHealth {
        // Check base health first
        let base_health = self.base.health_check();
        if base_health != ServiceHealth::Healthy {
            return base_health;
        }
        
        // Check ZK compressor status
        if self.zk_compressor.is_ready() {
            ServiceHealth::Healthy
        } else {
            ServiceHealth::Degraded
        }
    }

    fn metrics(&self) -> ServiceMetrics {
        // This is a blocking call for consistency with the trait
        futures::executor::block_on(self.base.metrics())
    }

    async fn shutdown(&mut self) -> Result<(), Self::Error> {
        // Cleanup ZK circuits
        self.zk_compressor.cleanup_circuits().await?;
        
        self.base.shutdown().await?;
        Ok(())
    }

    fn service_name(&self) -> &'static str {
        "zk_compression"
    }
}

// Constants
const MAX_COMPRESSION_INPUT_SIZE: usize = 16 * 1024 * 1024; // 16MB
const MAX_BATCH_COMPRESSION_SIZE: usize = 100; // Maximum items in batch

#[cfg(test)]
mod tests {
    use super::*;
    use crate::config::test_config;

    #[tokio::test]
    async fn test_zk_compression_service_creation() {
        let config = test_config();
        let service = ZKCompressionService::new(config);
        assert_eq!(service.service_name(), "zk_compression");
        // Note: Health check may be NotInitialized or Degraded depending on ZK setup
    }
} 