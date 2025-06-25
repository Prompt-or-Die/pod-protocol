//! # Escrow Service
//!
//! Service for managing escrow accounts and payments on the PoD Protocol.
//! Provides functionality for creating escrows, releasing funds, and handling disputes.

use std::sync::Arc;

use anchor_client::Program;
use async_trait::async_trait;
use solana_sdk::{
    pubkey::Pubkey,
    signer::{keypair::Keypair, Signer},
    system_instruction,
};

use pod_sdk_types::{
    accounts::{EscrowAccount, AgentAccount},
    instructions::{CreateEscrowParams, ReleaseEscrowParams, DisputeEscrowParams},
    constants::*,
    events::EscrowEvent,
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
            let escrow_id = uuid::Uuid::new_v4().to_string();
            let (escrow_pda, _bump) = derive_escrow_pda(&payer.pubkey(), &escrow_id)?;
            
            // Build instruction
            let ix = program
                .request()
                .accounts(pod_protocol::accounts::CreateEscrow {
                    escrow: escrow_pda,
                    payer: payer.pubkey(),
                    beneficiary: params.beneficiary,
                    system_program: solana_sdk::system_program::id(),
                    rent: solana_sdk::sysvar::rent::id(),
                })
                .args(pod_protocol::instruction::CreateEscrow {
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
                .accounts(pod_protocol::accounts::ReleaseEscrow {
                    escrow: *escrow_address,
                    releaser: releaser.pubkey(),
                    beneficiary: escrow_account.beneficiary,
                })
                .args(pod_protocol::instruction::ReleaseEscrow {
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
                .accounts(pod_protocol::accounts::RefundEscrow {
                    escrow: *escrow_address,
                    refunder: refunder.pubkey(),
                    payer: escrow_account.payer,
                })
                .args(pod_protocol::instruction::RefundEscrow {
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
            
            // Build instruction
            let ix = program
                .request()
                .accounts(pod_protocol::accounts::DisputeEscrow {
                    escrow: *escrow_address,
                    disputer: disputer.pubkey(),
                })
                .args(pod_protocol::instruction::DisputeEscrow {
                    dispute_reason: params.dispute_reason,
                    evidence: params.evidence,
                    requested_resolution: params.requested_resolution,
                })
                .signer(disputer);

            // Send transaction
            let signature = ix.send()?;
            
            // Fetch updated escrow account
            let updated_account = self.get_escrow_account(escrow_address).await?;
            
            tracing::info!(
                escrow_address = %escrow_address,
                signature = %signature,
                disputer = %disputer.pubkey(),
                "Escrow dispute initiated successfully"
            );

            Ok(updated_account)
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
            // TODO: Implement condition checking logic
            return true;
        }
        
        // Arbitrator can release (if implemented)
        // TODO: Implement arbitrator logic
        
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
        }
        
        // Arbitrator can refund (if implemented)
        // TODO: Implement arbitrator logic
        
        false
    }
}

/// Escrow status enumeration
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum EscrowStatus {
    Active,
    Released,
    Refunded,
    Disputed,
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
        // TODO: Add specific validations if needed
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