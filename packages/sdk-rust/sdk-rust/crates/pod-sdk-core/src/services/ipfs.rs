//! # IPFS Service
//!
//! Service for distributed storage using IPFS on the PoD Protocol.
//! Provides functionality for storing, retrieving, and managing content on IPFS.

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
use tokio::io::{AsyncRead, AsyncWrite};

use pod_sdk_types::{
    AgentAccount,
};

use crate::{
    error::{PodComError, Result},
    services::base::{BaseService, ServiceBase, ServiceConfig, ServiceHealth, ServiceMetrics},
    utils::{
        ipfs::{IPFSClient, ContentHash, PinStatus},
        encryption::{encrypt_content, decrypt_content},
    },
};

/// Service for IPFS integration and distributed storage
#[derive(Debug)]
pub struct IPFSService {
    base: ServiceBase,
    ipfs_client: Arc<IPFSClient>,
    pin_cache: Arc<tokio::sync::RwLock<PinCache>>,
}

impl IPFSService {
    /// Create a new IPFS service
    pub fn new(config: ServiceConfig) -> Self {
        let ipfs_client = Arc::new(IPFSClient::new(config.ipfs_endpoint.clone()));
        
        Self {
            base: ServiceBase::new(config),
            ipfs_client,
            pin_cache: Arc::new(tokio::sync::RwLock::new(PinCache::new())),
        }
    }

    /// Upload content to IPFS
    pub async fn upload_content(
        &self,
        uploader: &Keypair,
        content: Vec<u8>,
        params: UploadToIPFSParams,
    ) -> Result<(ContentHash, IPFSMetadataAccount)> {
        let operation_name = "upload_content";
        
        self.base.execute_operation(operation_name, async {
            let program = self.base.program()?;
            
            // Validate content size
            if content.len() > MAX_IPFS_CONTENT_SIZE {
                return Err(PodComError::ContentTooLarge {
                    size: content.len(),
                    max_size: MAX_IPFS_CONTENT_SIZE,
                });
            }
            
            // Encrypt content if requested
            let final_content = if params.encrypt {
                let encryption_key = params.encryption_key
                    .ok_or(PodComError::MissingEncryptionKey)?;
                encrypt_content(&content, &encryption_key)?
            } else {
                content
            };
            
            // Upload to IPFS
            let content_hash = self.ipfs_client.add_content(&final_content).await?;
            
            // Pin content if requested
            if params.pin {
                self.ipfs_client.pin_content(&content_hash).await?;
            }
            
            // Create metadata account on-chain
            let metadata_id: String = rand::thread_rng()
                .sample_iter(&rand::distributions::Alphanumeric)
                .take(32)
                .map(char::from)
                .collect();
            let (metadata_pda, _bump) = derive_ipfs_metadata_pda(&uploader.pubkey(), &metadata_id)?;
            
            // Build instruction - Note: pod-com doesn't have IPFS functionality, this would need custom implementation
            // For now, we'll return an error indicating this feature needs implementation
            return Err(PodComError::NotImplemented {
                feature: "upload_ipfs_content".to_string(),
            });

            // Send transaction
            let signature = ix.send()?;
            
            // Fetch created metadata account
            let metadata_account = self.get_ipfs_metadata(&metadata_pda).await?;
            
            // Update pin cache
            if params.pin {
                let mut cache = self.pin_cache.write().await;
                cache.add_pin(content_hash.clone(), uploader.pubkey());
            }
            
            tracing::info!(
                content_hash = %content_hash,
                metadata_address = %metadata_pda,
                signature = %signature,
                uploader = %uploader.pubkey(),
                size = final_content.len(),
                encrypted = params.encrypt,
                pinned = params.pin,
                "Content uploaded to IPFS successfully"
            );

            Ok((content_hash, metadata_account))
        }).await
    }

    /// Retrieve content from IPFS
    pub async fn retrieve_content(
        &self,
        content_hash: &ContentHash,
        requester: &Keypair,
        decryption_key: Option<Vec<u8>>,
    ) -> Result<Vec<u8>> {
        let operation_name = "retrieve_content";
        
        self.base.execute_operation(operation_name, async {
            // Check if content exists and requester has access
            if let Some(metadata) = self.find_metadata_by_hash(content_hash).await? {
                self.verify_access_permissions(&metadata, &requester.pubkey())?;
            }
            
            // Retrieve content from IPFS
            let content = self.ipfs_client.get_content(content_hash).await?;
            
            // Decrypt if necessary
            let final_content = if let Some(key) = decryption_key {
                decrypt_content(&content, &key)?
            } else {
                content
            };
            
            tracing::info!(
                content_hash = %content_hash,
                requester = %requester.pubkey(),
                size = final_content.len(),
                "Content retrieved from IPFS successfully"
            );
            
            Ok(final_content)
        }).await
    }

    /// Pin content to IPFS
    pub async fn pin_content(
        &self,
        content_hash: &ContentHash,
        pinner: &Keypair,
        params: PinContentParams,
    ) -> Result<()> {
        let operation_name = "pin_content";
        
        self.base.execute_operation(operation_name, async {
            // Verify pinner has access to the content
            if let Some(metadata) = self.find_metadata_by_hash(content_hash).await? {
                self.verify_access_permissions(&metadata, &pinner.pubkey())?;
            }
            
            // Pin to IPFS
            self.ipfs_client.pin_content(content_hash).await?;
            
            // Update on-chain metadata if it exists
            if let Some(metadata_address) = self.find_metadata_address_by_hash(content_hash).await? {
                let program = self.base.program()?;
                
                // Note: pod-com doesn't have IPFS pin functionality, this would need custom implementation
                // For now, we'll skip the on-chain update
                tracing::info!("Skipping on-chain pin update - feature not implemented in pod-com program");
            }
            
            // Update pin cache
            {
                let mut cache = self.pin_cache.write().await;
                cache.add_pin(content_hash.clone(), pinner.pubkey());
            }
            
            tracing::info!(
                content_hash = %content_hash,
                pinner = %pinner.pubkey(),
                "Content pinned to IPFS successfully"
            );
            
            Ok(())
        }).await
    }

    /// Unpin content from IPFS
    pub async fn unpin_content(
        &self,
        content_hash: &ContentHash,
        unpinner: &Keypair,
    ) -> Result<()> {
        let operation_name = "unpin_content";
        
        self.base.execute_operation(operation_name, async {
            // Verify unpinner has permission to unpin
            {
                let cache = self.pin_cache.read().await;
                if !cache.can_unpin(content_hash, &unpinner.pubkey()) {
                    return Err(PodComError::UnauthorizedAccess {
                        resource: "ipfs_content".to_string(),
                        action: "unpin".to_string(),
                    });
                }
            }
            
            // Unpin from IPFS
            self.ipfs_client.unpin_content(content_hash).await?;
            
            // Update on-chain metadata if it exists
            if let Some(metadata_address) = self.find_metadata_address_by_hash(content_hash).await? {
                let program = self.base.program()?;
                
                // Note: pod-com doesn't have IPFS unpin functionality, this would need custom implementation
                // For now, we'll skip the on-chain update
                tracing::info!("Skipping on-chain unpin update - feature not implemented in pod-com program");
            }
            
            // Update pin cache
            {
                let mut cache = self.pin_cache.write().await;
                cache.remove_pin(content_hash, &unpinner.pubkey());
            }
            
            tracing::info!(
                content_hash = %content_hash,
                unpinner = %unpinner.pubkey(),
                "Content unpinned from IPFS successfully"
            );
            
            Ok(())
        }).await
    }

    /// Get IPFS metadata account
    pub async fn get_ipfs_metadata(&self, metadata_address: &Pubkey) -> Result<IPFSMetadataAccount> {
        let operation_name = "get_ipfs_metadata";
        
        self.base.execute_operation(operation_name, async {
            let program = self.base.program()?;
            
            let account_data = program.account::<IPFSMetadataAccount>(*metadata_address)?;
            self.validate_ipfs_metadata(&account_data)?;
            
            Ok(account_data)
        }).await
    }

    /// List content by uploader
    pub async fn list_content_by_uploader(&self, uploader: &Pubkey) -> Result<Vec<(Pubkey, IPFSMetadataAccount)>> {
        let operation_name = "list_content_by_uploader";
        
        self.base.execute_operation(operation_name, async {
            let program = self.base.program()?;
            
            // Get all IPFS metadata accounts
            let accounts = program
                .accounts::<IPFSMetadataAccount>(vec![
                    solana_account_decoder::UiAccountEncoding::Base64,
                ])
                .await?;
                
            let mut uploader_content = Vec::new();
            
            for (pubkey, account) in accounts {
                if account.uploader == *uploader {
                    self.validate_ipfs_metadata(&account)?;
                    uploader_content.push((pubkey, account));
                }
            }
            
            // Sort by upload time (most recent first)
            uploader_content.sort_by(|a, b| b.1.uploaded_at.cmp(&a.1.uploaded_at));
            
            Ok(uploader_content)
        }).await
    }

    /// Get content statistics
    pub async fn get_content_stats(&self, content_hash: &ContentHash) -> Result<ContentStats> {
        let operation_name = "get_content_stats";
        
        self.base.execute_operation(operation_name, async {
            // Get IPFS stats
            let ipfs_stats = self.ipfs_client.get_content_stats(content_hash).await?;
            
            // Get on-chain metadata if available
            let metadata = self.find_metadata_by_hash(content_hash).await?;
            
            let stats = ContentStats {
                content_hash: content_hash.clone(),
                size: ipfs_stats.size,
                pin_count: ipfs_stats.pin_count,
                access_count: metadata.as_ref().map(|m| m.access_count).unwrap_or(0),
                is_pinned: ipfs_stats.is_pinned,
                uploaded_at: metadata.as_ref().map(|m| m.uploaded_at),
                last_accessed: metadata.as_ref().map(|m| m.last_accessed),
                content_type: metadata.as_ref().map(|m| m.content_type.clone()),
                is_encrypted: metadata.as_ref().map(|m| m.is_encrypted).unwrap_or(false),
            };
            
            Ok(stats)
        }).await
    }

    /// Get IPFS node statistics
    pub async fn get_node_stats(&self) -> Result<IPFSNodeStats> {
        let operation_name = "get_node_stats";
        
        self.base.execute_operation(operation_name, async {
            let node_stats = self.ipfs_client.get_node_stats().await?;
            
            let stats = IPFSNodeStats {
                node_id: node_stats.node_id,
                version: node_stats.version,
                total_storage_bytes: node_stats.total_storage,
                pinned_storage_bytes: node_stats.pinned_storage,
                peer_count: node_stats.peer_count,
                bandwidth_in: node_stats.bandwidth_in,
                bandwidth_out: node_stats.bandwidth_out,
                uptime_seconds: node_stats.uptime,
                last_updated: chrono::Utc::now(),
            };
            
            Ok(stats)
        }).await
    }

    /// Garbage collect unpinned content
    pub async fn garbage_collect(&self) -> Result<GarbageCollectionResult> {
        let operation_name = "garbage_collect";
        
        self.base.execute_operation(operation_name, async {
            let gc_result = self.ipfs_client.garbage_collect().await?;
            
            let result = GarbageCollectionResult {
                removed_objects: gc_result.removed_objects,
                freed_bytes: gc_result.freed_bytes,
                duration_seconds: gc_result.duration.as_secs(),
                started_at: gc_result.started_at,
                completed_at: chrono::Utc::now(),
            };
            
            tracing::info!(
                removed_objects = result.removed_objects,
                freed_bytes = result.freed_bytes,
                duration_seconds = result.duration_seconds,
                "IPFS garbage collection completed"
            );
            
            Ok(result)
        }).await
    }

    // Helper methods

    async fn find_metadata_by_hash(&self, content_hash: &ContentHash) -> Result<Option<IPFSMetadataAccount>> {
        let program = self.base.program()?;
        let accounts = program.accounts::<IPFSMetadataAccount>(vec![]).await?;
        
        for (_, account) in accounts {
            if account.content_hash == *content_hash {
                return Ok(Some(account));
            }
        }
        
        Ok(None)
    }

    async fn find_metadata_address_by_hash(&self, content_hash: &ContentHash) -> Result<Option<Pubkey>> {
        let program = self.base.program()?;
        let accounts = program.accounts::<IPFSMetadataAccount>(vec![]).await?;
        
        for (address, account) in accounts {
            if account.content_hash == *content_hash {
                return Ok(Some(address));
            }
        }
        
        Ok(None)
    }

    fn verify_access_permissions(&self, metadata: &IPFSMetadataAccount, requester: &Pubkey) -> Result<()> {
        // Check if requester is the uploader
        if metadata.uploader == *requester {
            return Ok(());
        }
        
        // Check if content is public
        if metadata.access_level == AccessLevel::Public {
            return Ok(());
        }
        
        // TODO: Implement more sophisticated access control
        // - Check if requester is in allowed list
        // - Check if requester has been granted access
        // - Check channel membership for channel-specific content
        
        Err(PodComError::UnauthorizedAccess {
            resource: "ipfs_content".to_string(),
            action: "access".to_string(),
        })
    }

    fn validate_ipfs_metadata(&self, metadata: &IPFSMetadataAccount) -> Result<()> {
        // Validate content hash format
        if metadata.content_hash.is_empty() {
            return Err(PodComError::InvalidContentHash {
                hash: metadata.content_hash.clone(),
            });
        }
        
        // Validate size
        if metadata.size == 0 {
            return Err(PodComError::InvalidContentSize { size: metadata.size });
        }
        
        Ok(())
    }
}

// Data structures

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContentStats {
    pub content_hash: ContentHash,
    pub size: u64,
    pub pin_count: u32,
    pub access_count: u64,
    pub is_pinned: bool,
    pub uploaded_at: Option<chrono::DateTime<chrono::Utc>>,
    pub last_accessed: Option<chrono::DateTime<chrono::Utc>>,
    pub content_type: Option<String>,
    pub is_encrypted: bool,
}

#[derive(Debug, Clone)]
pub struct IPFSNodeStats {
    pub node_id: String,
    pub version: String,
    pub total_storage_bytes: u64,
    pub pinned_storage_bytes: u64,
    pub peer_count: u32,
    pub bandwidth_in: u64,
    pub bandwidth_out: u64,
    pub uptime_seconds: u64,
    pub last_updated: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Clone)]
pub struct GarbageCollectionResult {
    pub removed_objects: u64,
    pub freed_bytes: u64,
    pub duration_seconds: u64,
    pub started_at: chrono::DateTime<chrono::Utc>,
    pub completed_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Clone, PartialEq)]
pub enum AccessLevel {
    Public,
    Private,
    Restricted,
}

// Internal data structures

#[derive(Debug)]
struct PinCache {
    pins: HashMap<ContentHash, PinRecord>,
}

#[derive(Debug)]
struct PinRecord {
    pinners: Vec<Pubkey>,
    pinned_at: chrono::DateTime<chrono::Utc>,
}

impl PinCache {
    fn new() -> Self {
        Self {
            pins: HashMap::new(),
        }
    }

    fn add_pin(&mut self, content_hash: ContentHash, pinner: Pubkey) {
        let record = self.pins.entry(content_hash).or_insert_with(|| PinRecord {
            pinners: Vec::new(),
            pinned_at: chrono::Utc::now(),
        });
        
        if !record.pinners.contains(&pinner) {
            record.pinners.push(pinner);
        }
    }

    fn remove_pin(&mut self, content_hash: &ContentHash, unpinner: &Pubkey) {
        if let Some(record) = self.pins.get_mut(content_hash) {
            record.pinners.retain(|p| p != unpinner);
            
            // Remove record if no pinners left
            if record.pinners.is_empty() {
                self.pins.remove(content_hash);
            }
        }
    }

    fn can_unpin(&self, content_hash: &ContentHash, unpinner: &Pubkey) -> bool {
        self.pins.get(content_hash)
            .map(|record| record.pinners.contains(unpinner))
            .unwrap_or(false)
    }
}

#[async_trait]
impl BaseService for IPFSService {
    type Error = PodComError;

    async fn initialize(&mut self, program: Program<Arc<Keypair>>) -> Result<(), Self::Error> {
        self.base.initialize(program).await?;
        
        // Initialize IPFS connection
        self.ipfs_client.connect().await?;
        
        Ok(())
    }

    fn program(&self) -> Result<&Program<Arc<Keypair>>, Self::Error> {
        self.base.program()
    }

    fn validate_config(&self) -> Result<(), Self::Error> {
        // Validate IPFS service specific configuration
        if self.base.config().ipfs_endpoint.is_empty() {
            return Err(PodComError::MissingConfiguration {
                field: "ipfs_endpoint".to_string(),
            });
        }
        
        Ok(())
    }

    fn health_check(&self) -> ServiceHealth {
        // Check base health first
        let base_health = self.base.health_check();
        if base_health != ServiceHealth::Healthy {
            return base_health;
        }
        
        // Check IPFS connection
        if self.ipfs_client.is_connected() {
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
        // Disconnect from IPFS
        self.ipfs_client.disconnect().await?;
        
        self.base.shutdown().await?;
        Ok(())
    }

    fn service_name(&self) -> &'static str {
        "ipfs"
    }
}

// Constants
const MAX_IPFS_CONTENT_SIZE: usize = 32 * 1024 * 1024; // 32MB

#[cfg(test)]
mod tests {
    use super::*;
    use crate::config::test_config;

    #[tokio::test]
    async fn test_ipfs_service_creation() {
        let config = test_config();
        let service = IPFSService::new(config);
        assert_eq!(service.service_name(), "ipfs");
        // Note: Health check may be NotInitialized or Degraded depending on IPFS connection
    }
} 