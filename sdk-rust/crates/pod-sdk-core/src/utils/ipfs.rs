//! # IPFS Utilities
//!
//! IPFS integration utilities for the PoD Protocol.

use std::time::{Duration, Instant};
use crate::error::Result;
use serde::{Deserialize, Serialize};
use reqwest::multipart;

/// IPFS content hash type
pub type ContentHash = String;

/// Pin status enumeration
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum PinStatus {
    /// Content is pinned
    Pinned,
    /// Content is not pinned
    Unpinned,
    /// Pin status is unknown
    Unknown,
}

/// IPFS client wrapper
#[derive(Debug)]
pub struct IPFSClient {
    endpoint: String,
    connected: bool,
    client: reqwest::Client,
    timeout: Duration,
}

impl IPFSClient {
    /// Create new IPFS client
    pub fn new(endpoint: String) -> Self {
        let client = reqwest::Client::builder()
            .timeout(Duration::from_secs(30))
            .build()
            .expect("Failed to create HTTP client");

        Self {
            endpoint,
            connected: false,
            client,
            timeout: Duration::from_secs(30),
        }
    }

    /// Create new IPFS client with custom timeout
    pub fn with_timeout(endpoint: String, timeout: Duration) -> Self {
        let client = reqwest::Client::builder()
            .timeout(timeout)
            .build()
            .expect("Failed to create HTTP client");

        Self {
            endpoint,
            connected: false,
            client,
            timeout,
        }
    }

    /// Connect to IPFS node
    pub async fn connect(&mut self) -> Result<()> {
        // Test connection by calling version endpoint
        let url = format!("{}/api/v0/version", self.endpoint);
        
        match self.client.post(&url).send().await {
            Ok(response) => {
                if response.status().is_success() {
                    self.connected = true;
                    Ok(())
                } else {
                    Err(crate::error::PodError::NetworkError(
                        format!("IPFS connection failed with status: {}", response.status())
                    ))
                }
            }
            Err(e) => {
                self.connected = false;
                Err(crate::error::PodError::NetworkError(
                    format!("Failed to connect to IPFS: {}", e)
                ))
            }
        }
    }

    /// Disconnect from IPFS node
    pub async fn disconnect(&mut self) -> Result<()> {
        self.connected = false;
        Ok(())
    }

    /// Check if connected
    pub fn is_connected(&self) -> bool {
        self.connected
    }

    /// Add content to IPFS
    pub async fn add_content(&self, content: &[u8]) -> Result<ContentHash> {
        if !self.connected {
            return Err(crate::error::PodError::NetworkError("IPFS client not connected".to_string()));
        }

        let url = format!("{}/api/v0/add", self.endpoint);
        
        // Create multipart form with file data
        let part = multipart::Part::bytes(content.to_vec())
            .file_name("data")
            .mime_str("application/octet-stream")
            .map_err(|e| crate::error::PodError::CryptoError(format!("Failed to create multipart: {}", e)))?;
        
        let form = multipart::Form::new().part("file", part);
        
        let response = self.client
            .post(&url)
            .query(&[("pin", "true"), ("quiet", "true")])
            .multipart(form)
            .send()
            .await
            .map_err(|e| crate::error::PodError::NetworkError(format!("IPFS add request failed: {}", e)))?;

        if !response.status().is_success() {
            return Err(crate::error::PodError::NetworkError(
                format!("IPFS add failed with status: {}", response.status())
            ));
        }

        let response_text = response.text().await
            .map_err(|e| crate::error::PodError::NetworkError(format!("Failed to read IPFS response: {}", e)))?;
        
        // Parse IPFS response (usually JSON with Hash field)
        let add_response: IPFSAddResponse = serde_json::from_str(&response_text)
            .map_err(|e| crate::error::PodError::CryptoError(format!("Failed to parse IPFS response: {}", e)))?;
        
        Ok(add_response.hash)
    }

    /// Get content from IPFS
    pub async fn get_content(&self, hash: &ContentHash) -> Result<Vec<u8>> {
        if !self.connected {
            return Err(crate::error::PodError::NetworkError("IPFS client not connected".to_string()));
        }

        let url = format!("{}/api/v0/cat", self.endpoint);
        
        let response = self.client
            .post(&url)
            .query(&[("arg", hash)])
            .send()
            .await
            .map_err(|e| crate::error::PodError::NetworkError(format!("IPFS get request failed: {}", e)))?;

        if !response.status().is_success() {
            return Err(crate::error::PodError::NetworkError(
                format!("IPFS get failed with status: {}", response.status())
            ));
        }

        let content = response.bytes().await
            .map_err(|e| crate::error::PodError::NetworkError(format!("Failed to read IPFS content: {}", e)))?;
        
        Ok(content.to_vec())
    }

    /// Pin content
    pub async fn pin_content(&self, hash: &ContentHash) -> Result<()> {
        if !self.connected {
            return Err(crate::error::PodError::NetworkError("IPFS client not connected".to_string()));
        }

        let url = format!("{}/api/v0/pin/add", self.endpoint);
        
        let response = self.client
            .post(&url)
            .query(&[("arg", hash)])
            .send()
            .await
            .map_err(|e| crate::error::PodError::NetworkError(format!("IPFS pin request failed: {}", e)))?;

        if !response.status().is_success() {
            return Err(crate::error::PodError::NetworkError(
                format!("IPFS pin failed with status: {}", response.status())
            ));
        }

        Ok(())
    }

    /// Unpin content
    pub async fn unpin_content(&self, hash: &ContentHash) -> Result<()> {
        if !self.connected {
            return Err(crate::error::PodError::NetworkError("IPFS client not connected".to_string()));
        }

        let url = format!("{}/api/v0/pin/rm", self.endpoint);
        
        let response = self.client
            .post(&url)
            .query(&[("arg", hash)])
            .send()
            .await
            .map_err(|e| crate::error::PodError::NetworkError(format!("IPFS unpin request failed: {}", e)))?;

        if !response.status().is_success() {
            return Err(crate::error::PodError::NetworkError(
                format!("IPFS unpin failed with status: {}", response.status())
            ));
        }

        Ok(())
    }

    /// Check pin status of content
    pub async fn check_pin_status(&self, hash: &ContentHash) -> Result<PinStatus> {
        if !self.connected {
            return Err(crate::error::PodError::NetworkError("IPFS client not connected".to_string()));
        }

        let url = format!("{}/api/v0/pin/ls", self.endpoint);
        
        let response = self.client
            .post(&url)
            .query(&[("arg", hash), ("type", "all")])
            .send()
            .await
            .map_err(|e| crate::error::PodError::NetworkError(format!("IPFS pin status request failed: {}", e)))?;

        if response.status().is_success() {
            Ok(PinStatus::Pinned)
        } else if response.status() == 500 {
            // Not pinned (IPFS returns 500 for non-pinned content)
            Ok(PinStatus::Unpinned)
        } else {
            Ok(PinStatus::Unknown)
        }
    }

    /// Get content statistics
    pub async fn get_content_stats(&self, hash: &ContentHash) -> Result<IPFSContentStats> {
        if !self.connected {
            return Err(crate::error::PodError::NetworkError("IPFS client not connected".to_string()));
        }

        // Get object stat
        let url = format!("{}/api/v0/object/stat", self.endpoint);
        
        let response = self.client
            .post(&url)
            .query(&[("arg", hash)])
            .send()
            .await
            .map_err(|e| crate::error::PodError::NetworkError(format!("IPFS stat request failed: {}", e)))?;

        if !response.status().is_success() {
            return Err(crate::error::PodError::NetworkError(
                format!("IPFS stat failed with status: {}", response.status())
            ));
        }

        let response_text = response.text().await
            .map_err(|e| crate::error::PodError::NetworkError(format!("Failed to read IPFS stat response: {}", e)))?;
        
        let stat_response: IPFSStatResponse = serde_json::from_str(&response_text)
            .map_err(|e| crate::error::PodError::CryptoError(format!("Failed to parse IPFS stat response: {}", e)))?;
        
        // Check pin status
        let pin_status = self.check_pin_status(hash).await?;
        
        Ok(IPFSContentStats {
            size: stat_response.cumulative_size,
            pin_count: if pin_status == PinStatus::Pinned { 1 } else { 0 },
            is_pinned: pin_status == PinStatus::Pinned,
        })
    }

    /// Get node statistics
    pub async fn get_node_stats(&self) -> Result<IPFSNodeStatsRaw> {
        if !self.connected {
            return Err(crate::error::PodError::NetworkError("IPFS client not connected".to_string()));
        }

        // Get multiple stats in parallel
        let (id_result, version_result, repo_result, swarm_result) = tokio::join!(
            self.get_node_id(),
            self.get_node_version(),
            self.get_repo_stats(),
            self.get_swarm_peers()
        );

        let node_id = id_result.unwrap_or_else(|_| "unknown".to_string());
        let version = version_result.unwrap_or_else(|_| "unknown".to_string());
        let repo_stats = repo_result.unwrap_or_default();
        let peer_count = swarm_result.unwrap_or(0);

        Ok(IPFSNodeStatsRaw {
            node_id,
            version,
            total_storage: repo_stats.repo_size,
            pinned_storage: repo_stats.pinned_size,
            peer_count,
            bandwidth_in: repo_stats.bandwidth_in,
            bandwidth_out: repo_stats.bandwidth_out,
            uptime: repo_stats.uptime,
        })
    }

    /// Garbage collect
    pub async fn garbage_collect(&self) -> Result<GarbageCollectionResultRaw> {
        if !self.connected {
            return Err(crate::error::PodError::NetworkError("IPFS client not connected".to_string()));
        }

        let start_time = Instant::now();
        let url = format!("{}/api/v0/repo/gc", self.endpoint);
        
        let response = self.client
            .post(&url)
            .send()
            .await
            .map_err(|e| crate::error::PodError::NetworkError(format!("IPFS garbage collection request failed: {}", e)))?;

        if !response.status().is_success() {
            return Err(crate::error::PodError::NetworkError(
                format!("IPFS garbage collection failed with status: {}", response.status())
            ));
        }

        let response_text = response.text().await
            .map_err(|e| crate::error::PodError::NetworkError(format!("Failed to read IPFS GC response: {}", e)))?;
        
        // Parse garbage collection response
        let gc_lines: Vec<&str> = response_text.lines().collect();
        let mut removed_objects = 0u64;
        let mut freed_bytes = 0u64;
        
        for line in gc_lines {
            if let Ok(gc_result) = serde_json::from_str::<IPFSGCResult>(line) {
                if let Some(key) = gc_result.key {
                    removed_objects += 1;
                }
            }
        }

        let duration = start_time.elapsed();
        
        Ok(GarbageCollectionResultRaw {
            removed_objects,
            freed_bytes,
            duration,
            started_at: chrono::Utc::now() - chrono::Duration::from_std(duration).unwrap_or_default(),
        })
    }

    /// List pinned content
    pub async fn list_pinned_content(&self) -> Result<Vec<ContentHash>> {
        if !self.connected {
            return Err(crate::error::PodError::NetworkError("IPFS client not connected".to_string()));
        }

        let url = format!("{}/api/v0/pin/ls", self.endpoint);
        
        let response = self.client
            .post(&url)
            .query(&[("type", "recursive")])
            .send()
            .await
            .map_err(|e| crate::error::PodError::NetworkError(format!("IPFS pin list request failed: {}", e)))?;

        if !response.status().is_success() {
            return Err(crate::error::PodError::NetworkError(
                format!("IPFS pin list failed with status: {}", response.status())
            ));
        }

        let response_text = response.text().await
            .map_err(|e| crate::error::PodError::NetworkError(format!("Failed to read IPFS pin list response: {}", e)))?;
        
        let pin_response: IPFSPinListResponse = serde_json::from_str(&response_text)
            .map_err(|e| crate::error::PodError::CryptoError(format!("Failed to parse IPFS pin list response: {}", e)))?;
        
        Ok(pin_response.keys.into_keys().collect())
    }

    /// Helper method to get node ID
    async fn get_node_id(&self) -> Result<String> {
        let url = format!("{}/api/v0/id", self.endpoint);
        let response = self.client.post(&url).send().await?;
        let response_text = response.text().await?;
        let id_response: IPFSIdResponse = serde_json::from_str(&response_text)?;
        Ok(id_response.id)
    }

    /// Helper method to get node version
    async fn get_node_version(&self) -> Result<String> {
        let url = format!("{}/api/v0/version", self.endpoint);
        let response = self.client.post(&url).send().await?;
        let response_text = response.text().await?;
        let version_response: IPFSVersionResponse = serde_json::from_str(&response_text)?;
        Ok(version_response.version)
    }

    /// Helper method to get repository stats
    async fn get_repo_stats(&self) -> Result<RepoStats> {
        let url = format!("{}/api/v0/repo/stat", self.endpoint);
        let response = self.client.post(&url).send().await?;
        let response_text = response.text().await?;
        let repo_response: IPFSRepoStatResponse = serde_json::from_str(&response_text)?;
        
        Ok(RepoStats {
            repo_size: repo_response.repo_size,
            pinned_size: repo_response.storage_max / 2, // Estimate
            bandwidth_in: 0, // Not available in repo stat
            bandwidth_out: 0, // Not available in repo stat
            uptime: 0, // Not available in repo stat
        })
    }

    /// Helper method to get swarm peers count
    async fn get_swarm_peers(&self) -> Result<u32> {
        let url = format!("{}/api/v0/swarm/peers", self.endpoint);
        let response = self.client.post(&url).send().await?;
        let response_text = response.text().await?;
        let peers_response: IPFSSwarmPeersResponse = serde_json::from_str(&response_text)?;
        Ok(peers_response.peers.len() as u32)
    }
}

/// IPFS content statistics
#[derive(Debug, Clone)]
pub struct IPFSContentStats {
    pub size: u64,
    pub pin_count: u32,
    pub is_pinned: bool,
}

/// Raw IPFS node statistics
#[derive(Debug, Clone)]
pub struct IPFSNodeStatsRaw {
    pub node_id: String,
    pub version: String,
    pub total_storage: u64,
    pub pinned_storage: u64,
    pub peer_count: u32,
    pub bandwidth_in: u64,
    pub bandwidth_out: u64,
    pub uptime: u64,
}

/// Raw garbage collection result
#[derive(Debug, Clone)]
pub struct GarbageCollectionResultRaw {
    pub removed_objects: u64,
    pub freed_bytes: u64,
    pub duration: Duration,
    pub started_at: chrono::DateTime<chrono::Utc>,
}

/// Helper struct for repository statistics
#[derive(Debug, Default)]
struct RepoStats {
    pub repo_size: u64,
    pub pinned_size: u64,
    pub bandwidth_in: u64,
    pub bandwidth_out: u64,
    pub uptime: u64,
}

// IPFS API Response structures
#[derive(Debug, Deserialize)]
struct IPFSAddResponse {
    #[serde(rename = "Hash")]
    hash: String,
    #[serde(rename = "Name")]
    name: String,
    #[serde(rename = "Size")]
    size: String,
}

#[derive(Debug, Deserialize)]
struct IPFSStatResponse {
    #[serde(rename = "Hash")]
    hash: String,
    #[serde(rename = "NumLinks")]
    num_links: u32,
    #[serde(rename = "BlockSize")]
    block_size: u64,
    #[serde(rename = "LinksSize")]
    links_size: u64,
    #[serde(rename = "DataSize")]
    data_size: u64,
    #[serde(rename = "CumulativeSize")]
    cumulative_size: u64,
}

#[derive(Debug, Deserialize)]
struct IPFSIdResponse {
    #[serde(rename = "ID")]
    id: String,
    #[serde(rename = "PublicKey")]
    public_key: String,
    #[serde(rename = "Addresses")]
    addresses: Vec<String>,
    #[serde(rename = "AgentVersion")]
    agent_version: String,
    #[serde(rename = "ProtocolVersion")]
    protocol_version: String,
}

#[derive(Debug, Deserialize)]
struct IPFSVersionResponse {
    #[serde(rename = "Version")]
    version: String,
    #[serde(rename = "Commit")]
    commit: String,
    #[serde(rename = "Repo")]
    repo: String,
    #[serde(rename = "System")]
    system: String,
    #[serde(rename = "Golang")]
    golang: String,
}

#[derive(Debug, Deserialize)]
struct IPFSRepoStatResponse {
    #[serde(rename = "RepoSize")]
    repo_size: u64,
    #[serde(rename = "StorageMax")]
    storage_max: u64,
    #[serde(rename = "NumObjects")]
    num_objects: u64,
    #[serde(rename = "RepoPath")]
    repo_path: String,
    #[serde(rename = "Version")]
    version: String,
}

#[derive(Debug, Deserialize)]
struct IPFSSwarmPeersResponse {
    #[serde(rename = "Peers")]
    peers: Vec<IPFSPeer>,
}

#[derive(Debug, Deserialize)]
struct IPFSPeer {
    #[serde(rename = "Addr")]
    addr: String,
    #[serde(rename = "Peer")]
    peer: String,
    #[serde(rename = "Latency")]
    latency: Option<String>,
    #[serde(rename = "Muxer")]
    muxer: Option<String>,
    #[serde(rename = "Streams")]
    streams: Option<Vec<String>>,
}

#[derive(Debug, Deserialize)]
struct IPFSGCResult {
    #[serde(rename = "Key")]
    key: Option<String>,
    #[serde(rename = "Error")]
    error: Option<String>,
}

#[derive(Debug, Deserialize)]
struct IPFSPinListResponse {
    #[serde(rename = "Keys")]
    keys: std::collections::HashMap<String, IPFSPinInfo>,
}

#[derive(Debug, Deserialize)]
struct IPFSPinInfo {
    #[serde(rename = "Type")]
    pin_type: String,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_ipfs_client_creation() {
        let client = IPFSClient::new("http://localhost:5001".to_string());
        assert!(!client.is_connected());
        assert_eq!(client.endpoint, "http://localhost:5001");
    }

    #[tokio::test]
    async fn test_ipfs_client_with_timeout() {
        let timeout = Duration::from_secs(10);
        let client = IPFSClient::with_timeout("http://localhost:5001".to_string(), timeout);
        assert_eq!(client.timeout, timeout);
    }

    #[test]
    fn test_pin_status() {
        assert_eq!(PinStatus::Pinned, PinStatus::Pinned);
        assert_ne!(PinStatus::Pinned, PinStatus::Unpinned);
    }

    #[test]
    fn test_content_stats() {
        let stats = IPFSContentStats {
            size: 1024,
            pin_count: 1,
            is_pinned: true,
        };
        
        assert_eq!(stats.size, 1024);
        assert_eq!(stats.pin_count, 1);
        assert!(stats.is_pinned);
    }

    #[test]
    fn test_garbage_collection_result() {
        let gc_result = GarbageCollectionResultRaw {
            removed_objects: 10,
            freed_bytes: 1024,
            duration: Duration::from_secs(5),
            started_at: chrono::Utc::now(),
        };
        
        assert_eq!(gc_result.removed_objects, 10);
        assert_eq!(gc_result.freed_bytes, 1024);
        assert_eq!(gc_result.duration, Duration::from_secs(5));
    }

    // Integration tests would require a running IPFS node
    // These are commented out but can be enabled for testing with actual IPFS
    
    /*
    #[tokio::test]
    async fn test_ipfs_integration() {
        let mut client = IPFSClient::new("http://localhost:5001".to_string());
        
        // This test requires a running IPFS node
        if client.connect().await.is_ok() {
            let test_content = b"Hello, IPFS!";
            
            // Add content
            let hash = client.add_content(test_content).await.unwrap();
            assert!(!hash.is_empty());
            
            // Get content back
            let retrieved_content = client.get_content(&hash).await.unwrap();
            assert_eq!(test_content, retrieved_content.as_slice());
            
            // Check stats
            let stats = client.get_content_stats(&hash).await.unwrap();
            assert!(stats.size > 0);
            assert!(stats.is_pinned);
            
            // Get node stats
            let node_stats = client.get_node_stats().await.unwrap();
            assert!(!node_stats.node_id.is_empty());
            assert!(!node_stats.version.is_empty());
        }
    }
    */
} 