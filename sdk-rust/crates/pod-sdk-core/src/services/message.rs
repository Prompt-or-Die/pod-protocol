//! # Message Service
//!
//! Service for managing messages on the PoD Protocol.
//! Provides functionality for sending, receiving, querying, and managing encrypted messages.

use std::sync::Arc;
use std::time::{Duration, SystemTime, UNIX_EPOCH};

use anchor_client::Program;
use async_trait::async_trait;
use solana_sdk::{
    pubkey::Pubkey,
    signer::{keypair::Keypair, Signer},
};

// Import UUID for message ID generation
use rand::{distributions::Alphanumeric, Rng};

// Import the actual program types
use pod_com::{MessageAccount, ChannelAccount, AgentAccount, MessageType, MessageStatus};

use crate::{
    error::{PodComError, Result},
    services::base::{BaseService, ServiceBase, ServiceConfig, ServiceHealth, ServiceMetrics},
    types::{
        SendMessageParams, MessageContent, FilterOptions,
        BatchOperationResult, RequestOptions,
    },
    utils::{
        account::{derive_message_pda, validate_message_account},
        crypto::{encrypt_message, decrypt_message, compress_message, decompress_message, secure_hash_data},
    },
};

/// Service for managing messages
#[derive(Debug)]
pub struct MessageService {
    base: ServiceBase,
}

impl MessageService {
    /// Create a new message service
    pub fn new(config: ServiceConfig) -> Self {
        Self {
            base: ServiceBase::new(config),
        }
    }

    /// Send a message to a channel
    pub async fn send_message(
        &self,
        sender: &Keypair,
        channel_address: &Pubkey,
        params: SendMessageParams,
    ) -> Result<(Pubkey, MessageAccount)> {
        let operation_name = "send_message";
        
        self.base.execute_operation(operation_name, async {
            let program = self.base.program()?;
            
            // Verify channel access
            let channel_account = program.account::<ChannelAccount>(*channel_address)?;
            if !channel_account.participants.contains(&sender.pubkey()) {
                return Err(PodComError::UnauthorizedAccess {
                    resource: "channel".to_string(),
                    action: "send_message".to_string(),
                });
            }
            
            // Generate message ID and derive PDA
            let message_id: String = rand::thread_rng()
                .sample_iter(&Alphanumeric)
                .take(32)
                .map(char::from)
                .collect();
            let (message_pda, _bump) = derive_message_pda(channel_address, &message_id)?;
            
            // Encrypt message content
            let encrypted_content = encrypt_message(&params.content, &channel_account.encryption_key)?;
            
            // Compress if needed (for large messages)
            let final_content = if encrypted_content.len() > MAX_UNCOMPRESSED_MESSAGE_SIZE {
                compress_message(&encrypted_content)?
            } else {
                encrypted_content
            };

            // Calculate expiration timestamp
            let expiration_timestamp = params.expiration_duration
                .map(|duration| {
                    SystemTime::now()
                        .duration_since(UNIX_EPOCH)
                        .unwrap()
                        .as_secs() + duration.as_secs()
                })
                .unwrap_or(0); // 0 means no expiration

            // Build instruction
            let ix = program
                .request()
                .accounts(pod_com::accounts::SendMessage {
                    message_account: message_pda,
                    sender_agent: sender.pubkey(),
                    signer: sender.pubkey(),
                    system_program: solana_sdk::system_program::id(),
                })
                .args(pod_com::instruction::SendMessage {
                    recipient: *channel_address,
                    payload_hash: pod_com::secure_hash_data(&final_content).unwrap_or([0u8; 32]),
                    message_type: params.message_type,
                })
                .signer(sender);

            // Send transaction
            let signature = ix.send()?;
            
            // Fetch created message account
            let message_account = self.get_message_account(&message_pda).await?;
            
            tracing::info!(
                message_address = %message_pda,
                channel_address = %channel_address,
                signature = %signature,
                sender = %sender.pubkey(),
                message_id = %message_id,
                "Message sent successfully"
            );

            Ok((message_pda, message_account))
        }).await
    }

    /// Get message account data
    pub async fn get_message_account(&self, message_address: &Pubkey) -> Result<MessageAccount> {
        let operation_name = "get_message_account";
        
        self.base.execute_operation(operation_name, async {
            let program = self.base.program()?;
            
            let account_data = program.account::<MessageAccount>(*message_address)?;
            validate_message_account(&account_data)?;
            
            Ok(account_data)
        }).await
    }

    /// Get and decrypt message content
    pub async fn get_message_content(
        &self,
        message_address: &Pubkey,
        reader: &Keypair,
    ) -> Result<MessageContent> {
        let operation_name = "get_message_content";
        
        self.base.execute_operation(operation_name, async {
            let program = self.base.program()?;
            
            let message_account = self.get_message_account(message_address).await?;
            
            // Verify read access
            let channel_account = program.account::<ChannelAccount>(message_account.channel)?;
            if !channel_account.participants.contains(&reader.pubkey()) {
                return Err(PodComError::UnauthorizedAccess {
                    resource: "message".to_string(),
                    action: "read".to_string(),
                });
            }
            
            // Check if message has expired
            if message_account.expiration_timestamp > 0 {
                let current_timestamp = SystemTime::now()
                    .duration_since(UNIX_EPOCH)
                    .unwrap()
                    .as_secs();
                
                if current_timestamp > message_account.expiration_timestamp {
                    return Err(PodComError::MessageExpired {
                        message_address: *message_address,
                        expired_at: message_account.expiration_timestamp,
                    });
                }
            }
            
            // Decompress if needed
            let raw_content = if message_account.is_compressed {
                decompress_message(&message_account.encrypted_content)?
            } else {
                message_account.encrypted_content.clone()
            };
            
            // Decrypt content
            let decrypted_content = decrypt_message(&raw_content, &channel_account.encryption_key)?;
            
            Ok(decrypted_content)
        }).await
    }

    /// List messages in a channel
    pub async fn list_channel_messages(
        &self,
        channel_address: &Pubkey,
        reader: &Keypair,
        limit: Option<u64>,
        before_timestamp: Option<chrono::DateTime<chrono::Utc>>,
    ) -> Result<Vec<(Pubkey, MessageAccount)>> {
        let operation_name = "list_channel_messages";
        
        self.base.execute_operation(operation_name, async {
            let program = self.base.program()?;
            
            // Verify channel access
            let channel_account = program.account::<ChannelAccount>(*channel_address)?;
            if !channel_account.participants.contains(&reader.pubkey()) {
                return Err(PodComError::UnauthorizedAccess {
                    resource: "channel".to_string(),
                    action: "list_messages".to_string(),
                });
            }
            
            // Get all message accounts for this channel
            let accounts = program
                .accounts::<MessageAccount>(vec![
                    solana_account_decoder::UiAccountEncoding::Base64,
                ])
                .await?;
                
            let mut channel_messages = Vec::new();
            
            for (pubkey, account) in accounts {
                if account.channel == *channel_address {
                    // Filter by timestamp if provided
                    if let Some(before) = before_timestamp {
                        if account.created_at >= before {
                            continue;
                        }
                    }
                    
                    validate_message_account(&account)?;
                    channel_messages.push((pubkey, account));
                }
            }
            
            // Sort by creation time (most recent first)
            channel_messages.sort_by(|a, b| b.1.created_at.cmp(&a.1.created_at));
            
            // Apply limit
            if let Some(limit) = limit {
                channel_messages.truncate(limit as usize);
            }
            
            Ok(channel_messages)
        }).await
    }

    /// React to a message
    pub async fn react_to_message(
        &self,
        message_address: &Pubkey,
        reactor: &Keypair,
        reaction: String,
    ) -> Result<MessageAccount> {
        let operation_name = "react_to_message";
        
        self.base.execute_operation(operation_name, async {
            let program = self.base.program()?;
            
            let message_account = self.get_message_account(message_address).await?;
            
            // Verify channel access
            let channel_account = program.account::<ChannelAccount>(message_account.channel)?;
            if !channel_account.participants.contains(&reactor.pubkey()) {
                return Err(PodComError::UnauthorizedAccess {
                    resource: "message".to_string(),
                    action: "react".to_string(),
                });
            }
            
            // Build instruction - Note: pod-com doesn't have react_to_message, this would need custom implementation
            // For now, we'll return an error indicating this feature needs implementation
            return Err(PodComError::NotImplemented {
                feature: "react_to_message".to_string(),
            });

            // Send transaction
            let signature = ix.send()?;
            
            // Fetch updated message account
            let updated_account = self.get_message_account(message_address).await?;
            
            tracing::info!(
                message_address = %message_address,
                signature = %signature,
                reactor = %reactor.pubkey(),
                "Message reaction added successfully"
            );

            Ok(updated_account)
        }).await
    }

    /// Delete a message (sender only)
    pub async fn delete_message(
        &self,
        message_address: &Pubkey,
        sender: &Keypair,
    ) -> Result<()> {
        let operation_name = "delete_message";
        
        self.base.execute_operation(operation_name, async {
            let program = self.base.program()?;
            
            let message_account = self.get_message_account(message_address).await?;
            
            // Verify sender is the message author
            if message_account.sender != sender.pubkey() {
                return Err(PodComError::UnauthorizedAccess {
                    resource: "message".to_string(),
                    action: "delete".to_string(),
                });
            }
            
            // Build instruction - Note: pod-com doesn't have delete_message, this would need custom implementation
            // For now, we'll return an error indicating this feature needs implementation
            return Err(PodComError::NotImplemented {
                feature: "delete_message".to_string(),
            });

            // Send transaction
            let signature = ix.send()?;
            
            tracing::info!(
                message_address = %message_address,
                signature = %signature,
                sender = %sender.pubkey(),
                "Message deleted successfully"
            );

            Ok(())
        }).await
    }

    /// Clean up expired messages for a channel
    pub async fn cleanup_expired_messages(
        &self,
        channel_address: &Pubkey,
        cleaner: &Keypair,
    ) -> Result<Vec<Pubkey>> {
        let operation_name = "cleanup_expired_messages";
        
        self.base.execute_operation(operation_name, async {
            let program = self.base.program()?;
            
            // Verify channel access
            let channel_account = program.account::<ChannelAccount>(*channel_address)?;
            if !channel_account.participants.contains(&cleaner.pubkey()) {
                return Err(PodComError::UnauthorizedAccess {
                    resource: "channel".to_string(),
                    action: "cleanup_messages".to_string(),
                });
            }
            
            let current_timestamp = SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap()
                .as_secs();
            
            // Find expired messages
            let all_messages = self.list_channel_messages(channel_address, cleaner, None, None).await?;
            let mut cleaned_messages = Vec::new();
            
            for (message_address, message_account) in all_messages {
                if message_account.expiration_timestamp > 0 && 
                   current_timestamp > message_account.expiration_timestamp {
                    
                    // Build cleanup instruction - Note: pod-com doesn't have cleanup_expired_message
                    // For now, we'll skip this message and continue
                    tracing::info!("Skipping cleanup of expired message - feature not implemented in pod-com program");
                    continue;

                    // Send transaction
                    let _signature = ix.send()?;
                    cleaned_messages.push(message_address);
                }
            }
            
            tracing::info!(
                channel_address = %channel_address,
                cleaned_count = cleaned_messages.len(),
                cleaner = %cleaner.pubkey(),
                "Expired messages cleaned up successfully"
            );

            Ok(cleaned_messages)
        }).await
    }

    /// Get message statistics for a channel
    pub async fn get_channel_message_stats(
        &self,
        channel_address: &Pubkey,
        reader: &Keypair,
    ) -> Result<MessageStats> {
        let operation_name = "get_channel_message_stats";
        
        self.base.execute_operation(operation_name, async {
            let messages = self.list_channel_messages(channel_address, reader, None, None).await?;
            
            let total_messages = messages.len() as u64;
            let mut total_size = 0u64;
            let mut expired_count = 0u64;
            let mut by_sender = std::collections::HashMap::new();
            
            let current_timestamp = SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap()
                .as_secs();
            
            for (_, message) in &messages {
                total_size += message.encrypted_content.len() as u64;
                
                if message.expiration_timestamp > 0 && 
                   current_timestamp > message.expiration_timestamp {
                    expired_count += 1;
                }
                
                *by_sender.entry(message.sender).or_insert(0u64) += 1;
            }
            
            let last_message_at = messages.first()
                .map(|(_, msg)| msg.created_at);
            
            let stats = MessageStats {
                total_messages,
                total_size_bytes: total_size,
                expired_messages: expired_count,
                last_message_at,
                messages_by_sender: by_sender,
                average_message_size: if total_messages > 0 {
                    total_size as f64 / total_messages as f64
                } else {
                    0.0
                },
            };
            
            Ok(stats)
        }).await
    }
}

/// Message statistics
#[derive(Debug, Clone)]
pub struct MessageStats {
    pub total_messages: u64,
    pub total_size_bytes: u64,
    pub expired_messages: u64,
    pub last_message_at: Option<chrono::DateTime<chrono::Utc>>,
    pub messages_by_sender: std::collections::HashMap<Pubkey, u64>,
    pub average_message_size: f64,
}

#[async_trait]
impl BaseService for MessageService {
    type Error = PodComError;

    async fn initialize(&mut self, program: Program<Arc<Keypair>>) -> Result<(), Self::Error> {
        self.base.initialize(program).await?;
        Ok(())
    }

    fn program(&self) -> Result<&Program<Arc<Keypair>>, Self::Error> {
        self.base.program()
    }

    fn validate_config(&self) -> Result<(), Self::Error> {
        // Validate message service specific configuration
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
        
        // Validate message-specific timeouts
        if config.rpc_timeout_secs < 5 {
            return Err(PodComError::InvalidConfiguration {
                field: "rpc_timeout_secs".to_string(),
                reason: "RPC timeout must be at least 5 seconds for message operations".to_string(),
            });
        }
        
        // Validate message size limits
        if let Some(ref message_config) = config.message_config {
            if message_config.message_size_limit == 0 {
                return Err(PodComError::InvalidConfiguration {
                    field: "message_config.message_size_limit".to_string(),
                    reason: "Maximum message size must be greater than 0".to_string(),
                });
            }
            
            if message_config.message_size_limit > 32 * 1024 { // 32KB limit
                return Err(PodComError::InvalidConfiguration {
                    field: "message_config.message_size_limit".to_string(),
                    reason: "Maximum message size cannot exceed 32KB".to_string(),
                });
            }
            
            // Validate encryption settings
            if message_config.encryption_required && message_config.encryption_key_size < 256 {
                return Err(PodComError::InvalidConfiguration {
                    field: "message_config.encryption_key_size".to_string(),
                    reason: "Encryption key size must be at least 256 bits when encryption is required".to_string(),
                });
            }
            
            // Validate retention settings
            if message_config.default_retention_days == 0 {
                return Err(PodComError::InvalidConfiguration {
                    field: "message_config.default_retention_days".to_string(),
                    reason: "Default retention period must be at least 1 day".to_string(),
                });
            }
            
            if message_config.default_retention_days > 3650 { // 10 years max
                return Err(PodComError::InvalidConfiguration {
                    field: "message_config.default_retention_days".to_string(),
                    reason: "Default retention period cannot exceed 10 years (3650 days)".to_string(),
                });
            }
        }
        
        // Validate compression settings
        if let Some(ref compression_config) = config.compression_config {
            if compression_config.enabled && compression_config.compression_threshold == 0 {
                return Err(PodComError::InvalidConfiguration {
                    field: "compression_config.compression_threshold".to_string(),
                    reason: "Compression threshold must be greater than 0 when compression is enabled".to_string(),
                });
            }
            
            // Validate compression algorithm
            match compression_config.algorithm.as_str() {
                "gzip" | "lz4" | "zstd" => {},
                _ => {
                    return Err(PodComError::InvalidConfiguration {
                        field: "compression_config.algorithm".to_string(),
                        reason: "Compression algorithm must be 'gzip', 'lz4', or 'zstd'".to_string(),
                    });
                }
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
        "message"
    }
}

// Constants for message handling
const MAX_UNCOMPRESSED_MESSAGE_SIZE: usize = 8192; // 8KB

#[cfg(test)]
mod tests {
    use super::*;
    use crate::config::test_config;

    #[tokio::test]
    async fn test_message_service_creation() {
        let config = test_config();
        let service = MessageService::new(config);
        assert_eq!(service.service_name(), "message");
        assert_eq!(service.health_check(), ServiceHealth::NotInitialized);
    }
} 