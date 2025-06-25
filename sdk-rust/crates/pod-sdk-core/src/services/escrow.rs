//! # Escrow Service
//!
//! Service for managing escrow accounts and payments on the PoD Protocol.
//! Provides functionality for creating escrows, releasing funds, and handling disputes.

use std::sync::Arc;

use anchor_client::Program;
use rand::{distributions::Alphanumeric, Rng};
use async_trait::async_trait;
use solana_sdk::{
    pubkey::Pubkey,
    signer::{keypair::Keypair, Signer},
    system_instruction,
};

use pod_sdk_types::{
    EscrowAccount, AgentAccount, EscrowStatus, EscrowCondition,
};

use crate::{
    error::{PodComError, Result},
    services::base::{BaseService, ServiceBase, ServiceConfig, ServiceHealth, ServiceMetrics},
    utils::account::{derive_escrow_pda, validate_escrow_account},
};

/// Service for managing escrow accounts
#[derive(Debug)]
pub struct EscrowService {
    base: ServiceBase,
}

impl EscrowService {
    /// Create a new escrow service
    pub fn new(config: ServiceConfig) -> Self {
        Self {
            base: ServiceBase::new(config),
        }
    }

    /// Create a new escrow account
    pub async fn create_escrow(
        &self,
        payer: &Keypair,
        params: CreateEscrowParams,
    ) -> Result<(Pubkey, EscrowAccount)> {
        let operation_name = "create_escrow";
        
        self.base.execute_operation(operation_name, async {
            let program = self.base.program()?;
            
            // Validate participants
            if params.amount == 0 {
                return Err(PodComError::InvalidEscrowAmount { amount: params.amount });
            }
            
            // Verify beneficiary is a valid agent
            let _beneficiary_account = program.account::<AgentAccount>(params.beneficiary)?;
            
            // Generate escrow ID and derive PDA
            let escrow_id: String = rand::thread_rng()
                .sample_iter(&rand::distributions::Alphanumeric)
                .take(32)
                .map(char::from)
                .collect();
            let (escrow_pda, _bump) = derive_escrow_pda(&payer.pubkey(), &escrow_id)?;
            
            // Build instruction
            let ix = program
                .request()
                .accounts(pod_com::accounts::DepositEscrow {
                    escrow: escrow_pda,
                    payer: payer.pubkey(),
                    beneficiary: params.beneficiary,
                    system_program: solana_sdk::system_program::id(),
                    rent: solana_sdk::sysvar::rent::id(),
                })
                .args(pod_com::instruction::DepositEscrow {
                    escrow_id: escrow_id.clone(),
                    amount: params.amount,
                    conditions: params.conditions.clone(),
                    timeout_duration: params.timeout_duration,
                    metadata: params.metadata.clone(),
                })
                .signer(payer);

            // Send transaction
            let signature = ix.send()?;
            
            // Fetch created escrow account
            let escrow_account = self.get_escrow_account(&escrow_pda).await?;
            
            tracing::info!(
                escrow_address = %escrow_pda,
                signature = %signature,
                payer = %payer.pubkey(),
                beneficiary = %params.beneficiary,
                amount = params.amount,
                escrow_id = %escrow_id,
                "Escrow created successfully"
            );

            Ok((escrow_pda, escrow_account))
        }).await
    }

    /// Get escrow account data
    pub async fn get_escrow_account(&self, escrow_address: &Pubkey) -> Result<EscrowAccount> {
        let operation_name = "get_escrow_account";
        
        self.base.execute_operation(operation_name, async {
            let program = self.base.program()?;
            
            let account_data = program.account::<EscrowAccount>(*escrow_address)?;
            validate_escrow_account(&account_data)?;
            
            Ok(account_data)
        }).await
    }

    /// Release escrow funds to beneficiary
    pub async fn release_escrow(
        &self,
        escrow_address: &Pubkey,
        releaser: &Keypair,
        params: ReleaseEscrowParams,
    ) -> Result<EscrowAccount> {
        let operation_name = "release_escrow";
        
        self.base.execute_operation(operation_name, async {
            let program = self.base.program()?;
            
            let escrow_account = self.get_escrow_account(escrow_address).await?;
            
            // Verify releaser authorization
            if !self.can_release_escrow(&escrow_account, &releaser.pubkey()) {
                return Err(PodComError::UnauthorizedAccess {
                    resource: "escrow".to_string(),
                    action: "release".to_string(),
                });
            }
            
            // Check escrow state
            if escrow_account.status != EscrowStatus::Active {
                return Err(PodComError::InvalidEscrowState {
                    escrow_address: *escrow_address,
                    current_state: escrow_account.status,
                    expected_state: EscrowStatus::Active,
                });
            }
            
            // Build instruction
            let ix = program
                .request()
                .accounts(pod_com::accounts::WithdrawEscrow {
                    escrow: *escrow_address,
                    releaser: releaser.pubkey(),
                    beneficiary: escrow_account.beneficiary,
                })
                .args(pod_com::instruction::WithdrawEscrow {
                    release_amount: params.release_amount.unwrap_or(escrow_account.amount),
                    release_reason: params.release_reason,
                })
                .signer(releaser);

            // Send transaction
            let signature = ix.send()?;
            
            // Fetch updated escrow account
            let updated_account = self.get_escrow_account(escrow_address).await?;
            
            tracing::info!(
                escrow_address = %escrow_address,
                signature = %signature,
                releaser = %releaser.pubkey(),
                beneficiary = %escrow_account.beneficiary,
                amount = params.release_amount.unwrap_or(escrow_account.amount),
                "Escrow released successfully"
            );

            Ok(updated_account)
        }).await
    }

    /// Refund escrow to payer
    pub async fn refund_escrow(
        &self,
        escrow_address: &Pubkey,
        refunder: &Keypair,
        refund_reason: Option<String>,
    ) -> Result<EscrowAccount> {
        let operation_name = "refund_escrow";
        
        self.base.execute_operation(operation_name, async {
            let program = self.base.program()?;
            
            let escrow_account = self.get_escrow_account(escrow_address).await?;
            
            // Verify refunder authorization
            if !self.can_refund_escrow(&escrow_account, &refunder.pubkey()) {
                return Err(PodComError::UnauthorizedAccess {
                    resource: "escrow".to_string(),
                    action: "refund".to_string(),
                });
            }
            
            // Check escrow state
            if escrow_account.status != EscrowStatus::Active {
                return Err(PodComError::InvalidEscrowState {
                    escrow_address: *escrow_address,
                    current_state: escrow_account.status,
                    expected_state: EscrowStatus::Active,
                });
            }
            
            // Build instruction
            let ix = program
                .request()
                .accounts(pod_com::accounts::WithdrawEscrow {
                    escrow: *escrow_address,
                    refunder: refunder.pubkey(),
                    payer: escrow_account.payer,
                })
                .args(pod_com::instruction::WithdrawEscrow {
                    refund_reason,
                })
                .signer(refunder);

            // Send transaction
            let signature = ix.send()?;
            
            // Fetch updated escrow account
            let updated_account = self.get_escrow_account(escrow_address).await?;
            
            tracing::info!(
                escrow_address = %escrow_address,
                signature = %signature,
                refunder = %refunder.pubkey(),
                payer = %escrow_account.payer,
                amount = escrow_account.amount,
                "Escrow refunded successfully"
            );

            Ok(updated_account)
        }).await
    }

    /// Initiate dispute for an escrow
    pub async fn dispute_escrow(
        &self,
        escrow_address: &Pubkey,
        disputer: &Keypair,
        params: DisputeEscrowParams,
    ) -> Result<EscrowAccount> {
        let operation_name = "dispute_escrow";
        
        self.base.execute_operation(operation_name, async {
            let program = self.base.program()?;
            
            let escrow_account = self.get_escrow_account(escrow_address).await?;
            
            // Verify disputer is involved in the escrow
            if escrow_account.payer != disputer.pubkey() && escrow_account.beneficiary != disputer.pubkey() {
                return Err(PodComError::UnauthorizedAccess {
                    resource: "escrow".to_string(),
                    action: "dispute".to_string(),
                });
            }
            
            // Check escrow state
            if escrow_account.status != EscrowStatus::Active {
                return Err(PodComError::InvalidEscrowState {
                    escrow_address: *escrow_address,
                    current_state: escrow_account.status,
                    expected_state: EscrowStatus::Active,
                });
            }
            
            // Build instruction - Note: pod-com doesn't have dispute_escrow, this would need custom implementation
            // For now, we'll return an error indicating this feature needs implementation
            return Err(PodComError::NotImplemented {
                feature: "dispute_escrow".to_string(),
            });
        }).await
    }

    /// List escrows for a specific user (as payer or beneficiary)
    pub async fn list_user_escrows(&self, user: &Pubkey) -> Result<Vec<(Pubkey, EscrowAccount)>> {
        let operation_name = "list_user_escrows";
        
        self.base.execute_operation(operation_name, async {
            let program = self.base.program()?;
            
            // Get all escrow accounts
            let accounts = program
                .accounts::<EscrowAccount>(vec![
                    solana_account_decoder::UiAccountEncoding::Base64,
                ])
                .await?;
                
            let mut user_escrows = Vec::new();
            
            for (pubkey, account) in accounts {
                if account.payer == *user || account.beneficiary == *user {
                    validate_escrow_account(&account)?;
                    user_escrows.push((pubkey, account));
                }
            }
            
            // Sort by creation time (most recent first)
            user_escrows.sort_by(|a, b| b.1.created_at.cmp(&a.1.created_at));
            
            Ok(user_escrows)
        }).await
    }

    /// Get escrow statistics for a user
    pub async fn get_user_escrow_stats(&self, user: &Pubkey) -> Result<EscrowStats> {
        let operation_name = "get_user_escrow_stats";
        
        self.base.execute_operation(operation_name, async {
            let escrows = self.list_user_escrows(user).await?;
            
            let mut stats = EscrowStats {
                total_escrows: 0,
                active_escrows: 0,
                completed_escrows: 0,
                disputed_escrows: 0,
                total_amount_escrowed: 0,
                total_amount_released: 0,
                total_amount_refunded: 0,
                escrows_as_payer: 0,
                escrows_as_beneficiary: 0,
            };
            
            for (_, escrow) in &escrows {
                stats.total_escrows += 1;
                
                if escrow.payer == *user {
                    stats.escrows_as_payer += 1;
                }
                
                if escrow.beneficiary == *user {
                    stats.escrows_as_beneficiary += 1;
                }
                
                match escrow.status {
                    EscrowStatus::Active => {
                        stats.active_escrows += 1;
                        stats.total_amount_escrowed += escrow.amount;
                    },
                    EscrowStatus::Released => {
                        stats.completed_escrows += 1;
                        stats.total_amount_released += escrow.amount;
                    },
                    EscrowStatus::Refunded => {
                        stats.completed_escrows += 1;
                        stats.total_amount_refunded += escrow.amount;
                    },
                    EscrowStatus::Disputed => {
                        stats.disputed_escrows += 1;
                        stats.total_amount_escrowed += escrow.amount;
                    },
                }
            }
            
            Ok(stats)
        }).await
    }

    /// Check if a user can release an escrow
    fn can_release_escrow(&self, escrow: &EscrowAccount, user: &Pubkey) -> bool {
        // Payer can always release
        if escrow.payer == *user {
            return true;
        }
        
        // Beneficiary can release if conditions are met
        if escrow.beneficiary == *user {
            return self.check_release_conditions(escrow);
        }
        
        // Arbitrator can release if system has arbitrators enabled
        if self.is_arbitrator(user, escrow) {
            return true;
        }
        
        false
    }

    /// Check if a user can refund an escrow
    fn can_refund_escrow(&self, escrow: &EscrowAccount, user: &Pubkey) -> bool {
        // Only payer can initiate refund
        if escrow.payer == *user {
            // Check if timeout has passed
            if let Some(timeout) = escrow.timeout_at {
                let now = chrono::Utc::now();
                return now > timeout;
            }
            
            // Allow refund if escrow has been disputed for too long
            if escrow.status == EscrowStatus::Disputed {
                if let Some(disputed_at) = escrow.disputed_at {
                    let now = chrono::Utc::now();
                    let dispute_timeout = chrono::Duration::days(30); // 30 days dispute timeout
                    return now > disputed_at + dispute_timeout;
                }
            }
        }
        
        // Arbitrator can refund if conditions are met
        if self.is_arbitrator(user, escrow) {
            return self.arbitrator_can_refund(escrow);
        }
        
        false
    }

    /// Check if release conditions are met for beneficiary release
    fn check_release_conditions(&self, escrow: &EscrowAccount) -> bool {
        // If no conditions are specified, allow release
        if escrow.conditions.is_empty() {
            return true;
        }
        
        // Parse and check each condition
        for condition in &escrow.conditions {
            match condition.condition_type.as_str() {
                "time_elapsed" => {
                    // Check if enough time has passed since escrow creation
                    if let Some(required_seconds) = condition.parameters.get("seconds")
                        .and_then(|v| v.parse::<i64>().ok()) {
                        let elapsed = chrono::Utc::now()
                            .signed_duration_since(escrow.created_at)
                            .num_seconds();
                        if elapsed < required_seconds {
                            return false;
                        }
                    }
                },
                "service_completion" => {
                    // Check if linked service/task has been completed
                    // This would typically involve checking external state
                    // For now, we'll check if the condition is marked as fulfilled
                    if !condition.fulfilled {
                        return false;
                    }
                },
                "approval_count" => {
                    // Check if minimum number of approvals have been received
                    if let Some(required_approvals) = condition.parameters.get("min_approvals")
                        .and_then(|v| v.parse::<u32>().ok()) {
                        let current_approvals = condition.parameters.get("current_approvals")
                            .and_then(|v| v.parse::<u32>().ok())
                            .unwrap_or(0);
                        if current_approvals < required_approvals {
                            return false;
                        }
                    }
                },
                "external_verification" => {
                    // Check if external verification has been completed
                    if !condition.fulfilled {
                        return false;
                    }
                },
                _ => {
                    // Unknown condition type - default to unfulfilled for safety
                    tracing::warn!(
                        condition_type = %condition.condition_type,
                        "Unknown escrow condition type encountered"
                    );
                    return false;
                }
            }
        }
        
        // All conditions passed
        true
    }

    /// Check if a user is an arbitrator for this escrow
    fn is_arbitrator(&self, user: &Pubkey, escrow: &EscrowAccount) -> bool {
        // Check if user is in the escrow's arbitrator list
        if let Some(ref arbitrators) = escrow.arbitrators {
            return arbitrators.contains(&user);
        }
        
        // Check if user is a system-wide arbitrator (would be stored in config or program state)
        // For now, we'll implement a simple check based on known arbitrator addresses
        self.is_system_arbitrator(user)
    }

    /// Check if a user is a system-wide arbitrator
    fn is_system_arbitrator(&self, user: &Pubkey) -> bool {
        // In a real implementation, this would check against a registry of authorized arbitrators
        // stored either in the program state or in the service configuration
        
        // For now, we can check against a hardcoded list or configuration
        if let Some(ref arbitrator_config) = self.base.config().arbitrator_config {
            return arbitrator_config.arbitrator_list.contains(&user);
        }
        
        false
    }

    /// Check if arbitrator can refund the escrow
    fn arbitrator_can_refund(&self, escrow: &EscrowAccount) -> bool {
        match escrow.status {
            EscrowStatus::Disputed => {
                // Arbitrators can always refund disputed escrows after investigation period
                if let Some(disputed_at) = escrow.disputed_at {
                    let now = chrono::Utc::now();
                    let investigation_period = chrono::Duration::days(7); // 7 days for investigation
                    return now > disputed_at + investigation_period;
                }
                true // If no dispute timestamp, allow refund
            },
            EscrowStatus::Active => {
                // Arbitrators can refund active escrows only under special circumstances
                // such as fraud detection or system emergencies
                
                // Check if escrow has been flagged for review
                if let Some(ref flags) = escrow.flags {
                    return flags.iter().any(|s| s == "fraud_suspected") ||
                           flags.iter().any(|s| s == "emergency_intervention");
                }
                
                false
            },
            _ => false, // Cannot refund already completed escrows
        }
    }
}

/// Escrow statistics
#[derive(Debug, Clone)]
pub struct EscrowStats {
    pub total_escrows: u64,
    pub active_escrows: u64,
    pub completed_escrows: u64,
    pub disputed_escrows: u64,
    pub total_amount_escrowed: u64,
    pub total_amount_released: u64,
    pub total_amount_refunded: u64,
    pub escrows_as_payer: u64,
    pub escrows_as_beneficiary: u64,
}

#[async_trait]
impl BaseService for EscrowService {
    type Error = PodComError;

    async fn initialize(&mut self, program: Program<Arc<Keypair>>) -> Result<(), Self::Error> {
        self.base.initialize(program).await?;
        Ok(())
    }

    fn program(&self) -> Result<&Program<Arc<Keypair>>, Self::Error> {
        self.base.program()
    }

    fn validate_config(&self) -> Result<(), Self::Error> {
        // Validate escrow service specific configuration
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
        
        // Validate escrow-specific timeouts
        if config.rpc_timeout_secs < 10 {
            return Err(PodComError::InvalidConfiguration {
                field: "rpc_timeout_secs".to_string(),
                reason: "RPC timeout must be at least 10 seconds for escrow operations".to_string(),
            });
        }
        
        // Validate escrow amount limits
        if let Some(ref escrow_config) = config.escrow_config {
            if escrow_config.minimum_escrow == 0 {
                return Err(PodComError::InvalidConfiguration {
                    field: "escrow_config.minimum_escrow".to_string(),
                    reason: "Minimum escrow amount must be greater than 0".to_string(),
                });
            }
            
            if escrow_config.max_escrow_amount > 0 && 
               escrow_config.max_escrow_amount < escrow_config.minimum_escrow {
                return Err(PodComError::InvalidConfiguration {
                    field: "escrow_config.max_escrow_amount".to_string(),
                    reason: "Maximum escrow amount must be greater than minimum amount".to_string(),
                });
            }
            
            // Validate default timeout
            if escrow_config.default_timeout_days == 0 {
                return Err(PodComError::InvalidConfiguration {
                    field: "escrow_config.default_timeout_days".to_string(),
                    reason: "Default timeout must be at least 1 day".to_string(),
                });
            }
            
            if escrow_config.default_timeout_days > 365 {
                return Err(PodComError::InvalidConfiguration {
                    field: "escrow_config.default_timeout_days".to_string(),
                    reason: "Default timeout cannot exceed 365 days".to_string(),
                });
            }
        }
        
        // Validate arbitrator configuration if present
        if let Some(ref arbitrator_config) = config.arbitrator_config {
            if arbitrator_config.enabled && arbitrator_config.arbitrator_list.is_empty() {
                return Err(PodComError::InvalidConfiguration {
                    field: "arbitrator_config.arbitrator_list".to_string(),
                    reason: "At least one arbitrator must be configured when arbitration is enabled".to_string(),
                });
            }
            
            // Validate arbitrator fee
            if arbitrator_config.arbitration_fee_bps > 1000 { // 10% max fee
                return Err(PodComError::InvalidConfiguration {
                    field: "arbitrator_config.arbitration_fee_bps".to_string(),
                    reason: "Arbitration fee cannot exceed 10% (1000 basis points)".to_string(),
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
        "escrow"
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::config::test_config;

    #[tokio::test]
    async fn test_escrow_service_creation() {
        let config = test_config();
        let service = EscrowService::new(config);
        assert_eq!(service.service_name(), "escrow");
        assert_eq!(service.health_check(), ServiceHealth::NotInitialized);
    }
} 