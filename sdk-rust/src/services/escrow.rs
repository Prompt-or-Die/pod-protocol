use std::collections::HashMap;
use std::sync::Arc;
use async_trait::async_trait;
use serde::{Deserialize, Serialize};
use solana_sdk::{
    instruction::Instruction,
    pubkey::Pubkey,
    signature::Signature,
    transaction::Transaction,
    system_instruction,
    native_token::LAMPORTS_PER_SOL,
    signer::Signer,
};
use solana_client::rpc_client::RpcClient;
use chrono::{DateTime, Utc, Duration};

use crate::{Config, PodError};
use super::{BaseService, ServiceContext, TransactionResult, account_utils};

/// Escrow status
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum EscrowStatus {
    Created,
    Funded,
    InProgress,
    Completed,
    Disputed,
    Cancelled,
    Expired,
    Released,
}

/// Escrow type
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum EscrowType {
    SimplePayment,
    MilestonePayment,
    ServiceContract,
    TokenExchange,
    Subscription,
}

/// Dispute resolution method
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum DisputeResolution {
    Automatic,
    Mediation,
    Arbitration,
    Community,
}

/// Escrow conditions that must be met for release
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EscrowConditions {
    pub requires_recipient_confirmation: bool,
    pub requires_payer_confirmation: bool,
    pub requires_third_party_confirmation: bool,
    pub auto_release_after_hours: Option<u32>,
    pub completion_criteria: Vec<String>,
    pub dispute_resolution: DisputeResolution,
}

impl Default for EscrowConditions {
    fn default() -> Self {
        Self {
            requires_recipient_confirmation: true,
            requires_payer_confirmation: false,
            requires_third_party_confirmation: false,
            auto_release_after_hours: Some(72), // 3 days
            completion_criteria: Vec::new(),
            dispute_resolution: DisputeResolution::Automatic,
        }
    }
}

/// Milestone for milestone-based escrows
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EscrowMilestone {
    pub id: String,
    pub description: String,
    pub amount_lamports: u64,
    pub due_date: Option<DateTime<Utc>>,
    pub completion_criteria: Vec<String>,
    pub status: MilestoneStatus,
    pub completed_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum MilestoneStatus {
    Pending,
    InProgress,
    Completed,
    Disputed,
    Cancelled,
}

/// Escrow creation data
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EscrowCreationData {
    pub title: String,
    pub description: String,
    pub escrow_type: EscrowType,
    pub recipient: Pubkey,
    pub amount_lamports: u64,
    pub conditions: EscrowConditions,
    pub milestones: Vec<EscrowMilestone>,
    pub expiry_date: Option<DateTime<Utc>>,
    pub metadata: HashMap<String, String>,
}

impl EscrowCreationData {
    pub fn new_simple_payment(
        title: String,
        description: String,
        recipient: Pubkey,
        amount_sol: f64,
    ) -> Self {
        Self {
            title,
            description,
            escrow_type: EscrowType::SimplePayment,
            recipient,
            amount_lamports: (amount_sol * LAMPORTS_PER_SOL as f64) as u64,
            conditions: EscrowConditions::default(),
            milestones: Vec::new(),
            expiry_date: Some(Utc::now() + Duration::days(30)),
            metadata: HashMap::new(),
        }
    }

    pub fn new_milestone_payment(
        title: String,
        description: String,
        recipient: Pubkey,
        milestones: Vec<EscrowMilestone>,
    ) -> Self {
        let total_amount = milestones.iter().map(|m| m.amount_lamports).sum();
        
        Self {
            title,
            description,
            escrow_type: EscrowType::MilestonePayment,
            recipient,
            amount_lamports: total_amount,
            conditions: EscrowConditions::default(),
            milestones,
            expiry_date: Some(Utc::now() + Duration::days(60)),
            metadata: HashMap::new(),
        }
    }

    pub fn with_conditions(mut self, conditions: EscrowConditions) -> Self {
        self.conditions = conditions;
        self
    }

    pub fn with_expiry(mut self, expiry: DateTime<Utc>) -> Self {
        self.expiry_date = Some(expiry);
        self
    }

    pub fn with_metadata(mut self, metadata: HashMap<String, String>) -> Self {
        self.metadata = metadata;
        self
    }
}

/// Escrow information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EscrowInfo {
    pub id: String,
    pub pda: Pubkey,
    pub payer: Pubkey,
    pub recipient: Pubkey,
    pub title: String,
    pub description: String,
    pub escrow_type: EscrowType,
    pub status: EscrowStatus,
    pub amount_lamports: u64,
    pub amount_released: u64,
    pub conditions: EscrowConditions,
    pub milestones: Vec<EscrowMilestone>,
    pub created_at: DateTime<Utc>,
    pub funded_at: Option<DateTime<Utc>>,
    pub completed_at: Option<DateTime<Utc>>,
    pub expiry_date: Option<DateTime<Utc>>,
    pub dispute_info: Option<DisputeInfo>,
    pub metadata: HashMap<String, String>,
}

/// Dispute information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DisputeInfo {
    pub initiated_by: Pubkey,
    pub reason: String,
    pub created_at: DateTime<Utc>,
    pub resolution_method: DisputeResolution,
    pub mediator: Option<Pubkey>,
    pub resolution: Option<String>,
    pub resolved_at: Option<DateTime<Utc>>,
}

/// Escrow filter for querying
#[derive(Debug, Clone)]
pub struct EscrowFilter {
    pub payer: Option<Pubkey>,
    pub recipient: Option<Pubkey>,
    pub status: Option<EscrowStatus>,
    pub escrow_type: Option<EscrowType>,
    pub amount_min: Option<u64>,
    pub amount_max: Option<u64>,
    pub created_after: Option<DateTime<Utc>>,
    pub created_before: Option<DateTime<Utc>>,
}

impl EscrowFilter {
    pub fn new() -> Self {
        Self {
            payer: None,
            recipient: None,
            status: None,
            escrow_type: None,
            amount_min: None,
            amount_max: None,
            created_after: None,
            created_before: None,
        }
    }

    pub fn for_payer(mut self, payer: Pubkey) -> Self {
        self.payer = Some(payer);
        self
    }

    pub fn for_recipient(mut self, recipient: Pubkey) -> Self {
        self.recipient = Some(recipient);
        self
    }

    pub fn with_status(mut self, status: EscrowStatus) -> Self {
        self.status = Some(status);
        self
    }
}

/// Escrow service for secure payments between agents
pub struct EscrowService {
    context: Option<ServiceContext>,
}

impl EscrowService {
    pub fn new() -> Self {
        Self { context: None }
    }

    /// Create a new escrow
    pub async fn create_escrow(
        &self,
        creation_data: EscrowCreationData,
    ) -> Result<(TransactionResult, String), PodError> {
        let context = self.get_context()?;
        
        if !context.has_wallet() {
            return Err(PodError::InvalidConfig("Wallet required for escrow creation".to_string()));
        }

        let payer = context.wallet_pubkey().unwrap();
        
        // Generate escrow ID
        let escrow_id = self.generate_escrow_id(&creation_data.title, &payer);
        
        // Derive escrow PDA
        let (escrow_pda, bump) = account_utils::derive_escrow_pda(
            &context.config.program_id,
            &escrow_id,
        )?;

        // Validate escrow data
        self.validate_escrow_creation(&creation_data)?;

        // Create escrow instruction
        let instruction = self.create_escrow_instruction(
            &payer,
            &escrow_pda,
            bump,
            &escrow_id,
            &creation_data,
        )?;

        // Send transaction
        let result = self.send_transaction(&context, vec![instruction]).await?;
        
        tracing::info!("Escrow '{}' created with ID: {}", creation_data.title, escrow_id);

        Ok((result, escrow_id))
    }

    /// Fund an escrow (transfer SOL to escrow account)
    pub async fn fund_escrow(&self, escrow_id: &str) -> Result<TransactionResult, PodError> {
        let context = self.get_context()?;
        
        if !context.has_wallet() {
            return Err(PodError::InvalidConfig("Wallet required to fund escrow".to_string()));
        }

        let payer = context.wallet_pubkey().unwrap();
        
        // Get escrow info to validate and get amount
        let escrow_info = self.get_escrow(escrow_id).await?;
        
        // Validate that the payer is the escrow creator
        if escrow_info.payer != payer {
            return Err(PodError::InvalidConfig("Only escrow creator can fund the escrow".to_string()));
        }

        // Check if already funded
        if escrow_info.status != EscrowStatus::Created {
            return Err(PodError::InvalidConfig("Escrow is not in created status".to_string()));
        }

        // Create fund instruction
        let instruction = self.create_fund_instruction(&payer, &escrow_info.pda, escrow_info.amount_lamports)?;

        // Send transaction
        let result = self.send_transaction(&context, vec![instruction]).await?;
        
        tracing::info!("Escrow {} funded with {} lamports", escrow_id, escrow_info.amount_lamports);

        Ok(result)
    }

    /// Release escrow funds to recipient
    pub async fn release_escrow(&self, escrow_id: &str) -> Result<TransactionResult, PodError> {
        let context = self.get_context()?;
        
        if !context.has_wallet() {
            return Err(PodError::InvalidConfig("Wallet required to release escrow".to_string()));
        }

        let releaser = context.wallet_pubkey().unwrap();
        
        // Get escrow info
        let escrow_info = self.get_escrow(escrow_id).await?;
        
        // Validate release conditions
        self.validate_release_conditions(&escrow_info, &releaser)?;

        // Create release instruction
        let instruction = self.create_release_instruction(&releaser, &escrow_info.pda, escrow_id)?;

        // Send transaction
        let result = self.send_transaction(&context, vec![instruction]).await?;
        
        tracing::info!("Escrow {} released to recipient", escrow_id);

        Ok(result)
    }

    /// Complete a milestone in a milestone-based escrow
    pub async fn complete_milestone(
        &self,
        escrow_id: &str,
        milestone_id: &str,
    ) -> Result<TransactionResult, PodError> {
        let context = self.get_context()?;
        
        if !context.has_wallet() {
            return Err(PodError::InvalidConfig("Wallet required to complete milestone".to_string()));
        }

        let completer = context.wallet_pubkey().unwrap();
        
        // Get escrow info
        let escrow_info = self.get_escrow(escrow_id).await?;
        
        // Validate milestone completion
        self.validate_milestone_completion(&escrow_info, milestone_id, &completer)?;

        // Create complete milestone instruction
        let instruction = self.create_complete_milestone_instruction(
            &completer,
            &escrow_info.pda,
            escrow_id,
            milestone_id,
        )?;

        // Send transaction
        let result = self.send_transaction(&context, vec![instruction]).await?;
        
        tracing::info!("Milestone {} completed in escrow {}", milestone_id, escrow_id);

        Ok(result)
    }

    /// Initiate a dispute for an escrow
    pub async fn initiate_dispute(
        &self,
        escrow_id: &str,
        reason: String,
    ) -> Result<TransactionResult, PodError> {
        let context = self.get_context()?;
        
        if !context.has_wallet() {
            return Err(PodError::InvalidConfig("Wallet required to initiate dispute".to_string()));
        }

        let initiator = context.wallet_pubkey().unwrap();
        
        // Get escrow info
        let escrow_info = self.get_escrow(escrow_id).await?;
        
        // Validate dispute initiation
        if escrow_info.payer != initiator && escrow_info.recipient != initiator {
            return Err(PodError::InvalidConfig("Only payer or recipient can initiate dispute".to_string()));
        }

        // Create dispute instruction
        let instruction = self.create_dispute_instruction(&initiator, &escrow_info.pda, escrow_id, &reason)?;

        // Send transaction
        let result = self.send_transaction(&context, vec![instruction]).await?;
        
        tracing::info!("Dispute initiated for escrow {} by {}", escrow_id, initiator);

        Ok(result)
    }

    /// Cancel an escrow (only if not funded or by mutual agreement)
    pub async fn cancel_escrow(&self, escrow_id: &str) -> Result<TransactionResult, PodError> {
        let context = self.get_context()?;
        
        if !context.has_wallet() {
            return Err(PodError::InvalidConfig("Wallet required to cancel escrow".to_string()));
        }

        let canceller = context.wallet_pubkey().unwrap();
        
        // Get escrow info
        let escrow_info = self.get_escrow(escrow_id).await?;
        
        // Validate cancellation
        self.validate_escrow_cancellation(&escrow_info, &canceller)?;

        // Create cancel instruction
        let instruction = self.create_cancel_instruction(&canceller, &escrow_info.pda, escrow_id)?;

        // Send transaction
        let result = self.send_transaction(&context, vec![instruction]).await?;
        
        tracing::info!("Escrow {} cancelled", escrow_id);

        Ok(result)
    }

    /// Get escrow information
    pub async fn get_escrow(&self, escrow_id: &str) -> Result<EscrowInfo, PodError> {
        let context = self.get_context()?;
        
        let (escrow_pda, _) = account_utils::derive_escrow_pda(
            &context.config.program_id,
            escrow_id,
        )?;

        // Fetch account data from Solana
        let account_data = context.rpc_client
            .get_account(&escrow_pda)
            .map_err(|e| PodError::Solana(format!("Failed to fetch escrow account: {}", e)))?;

        // Deserialize escrow data
        self.deserialize_escrow_data(&account_data.data, escrow_id, &escrow_pda)
    }

    /// List escrows with filters
    pub async fn list_escrows(
        &self,
        filter: Option<EscrowFilter>,
        limit: Option<usize>,
        offset: Option<usize>,
    ) -> Result<Vec<EscrowInfo>, PodError> {
        let context = self.get_context()?;
        
        tracing::info!(
            "Listing escrows with limit: {:?}, offset: {:?}",
            limit,
            offset
        );
        
        // This would use getProgramAccounts to fetch escrows matching the filter
        Ok(vec![])
    }

    /// Get escrow statistics for current wallet
    pub async fn get_escrow_stats(&self) -> Result<EscrowStats, PodError> {
        let context = self.get_context()?;
        
        if !context.has_wallet() {
            return Err(PodError::InvalidConfig("Wallet required to get escrow stats".to_string()));
        }

        // This would aggregate statistics from all escrows involving this wallet
        Ok(EscrowStats {
            total_created: 0,
            total_received: 0,
            total_amount_escrowed: 0,
            total_amount_released: 0,
            active_escrows: 0,
            disputed_escrows: 0,
            success_rate: 100.0,
        })
    }

    // Private helper methods

    fn get_context(&self) -> Result<&ServiceContext, PodError> {
        self.context.as_ref()
            .ok_or_else(|| PodError::InvalidConfig("Service not initialized".to_string()))
    }

    fn generate_escrow_id(&self, title: &str, payer: &Pubkey) -> String {
        use blake3::Hasher;
        
        let mut hasher = Hasher::new();
        hasher.update(title.as_bytes());
        hasher.update(payer.as_ref());
        hasher.update(&chrono::Utc::now().timestamp().to_le_bytes());
        hasher.update(&rand::random::<u64>().to_le_bytes());
        
        format!("esc_{}", hex::encode(&hasher.finalize().as_bytes()[..16]))
    }

    fn validate_escrow_creation(&self, creation_data: &EscrowCreationData) -> Result<(), PodError> {
        if creation_data.title.is_empty() {
            return Err(PodError::InvalidConfig("Escrow title cannot be empty".to_string()));
        }

        if creation_data.amount_lamports == 0 {
            return Err(PodError::InvalidConfig("Escrow amount must be greater than 0".to_string()));
        }

        if creation_data.escrow_type == EscrowType::MilestonePayment && creation_data.milestones.is_empty() {
            return Err(PodError::InvalidConfig("Milestone escrow must have at least one milestone".to_string()));
        }

        if let Some(expiry) = creation_data.expiry_date {
            if expiry <= Utc::now() {
                return Err(PodError::InvalidConfig("Expiry date must be in the future".to_string()));
            }
        }

        Ok(())
    }

    fn validate_release_conditions(&self, escrow_info: &EscrowInfo, releaser: &Pubkey) -> Result<(), PodError> {
        if escrow_info.status != EscrowStatus::Funded && escrow_info.status != EscrowStatus::InProgress {
            return Err(PodError::InvalidConfig("Escrow is not in a releasable state".to_string()));
        }

        if escrow_info.conditions.requires_payer_confirmation && escrow_info.payer != *releaser {
            return Err(PodError::InvalidConfig("Payer confirmation required for release".to_string()));
        }

        if escrow_info.conditions.requires_recipient_confirmation && escrow_info.recipient != *releaser {
            return Err(PodError::InvalidConfig("Recipient confirmation required for release".to_string()));
        }

        Ok(())
    }

    fn validate_milestone_completion(
        &self,
        escrow_info: &EscrowInfo,
        milestone_id: &str,
        completer: &Pubkey,
    ) -> Result<(), PodError> {
        if escrow_info.escrow_type != EscrowType::MilestonePayment {
            return Err(PodError::InvalidConfig("Not a milestone-based escrow".to_string()));
        }

        let milestone = escrow_info.milestones.iter()
            .find(|m| m.id == milestone_id)
            .ok_or_else(|| PodError::InvalidConfig("Milestone not found".to_string()))?;

        if milestone.status != MilestoneStatus::Pending && milestone.status != MilestoneStatus::InProgress {
            return Err(PodError::InvalidConfig("Milestone is not in a completable state".to_string()));
        }

        // Typically only recipient can mark milestones as complete
        if escrow_info.recipient != *completer {
            return Err(PodError::InvalidConfig("Only recipient can complete milestones".to_string()));
        }

        Ok(())
    }

    fn validate_escrow_cancellation(&self, escrow_info: &EscrowInfo, canceller: &Pubkey) -> Result<(), PodError> {
        match escrow_info.status {
            EscrowStatus::Created => {
                // Creator can cancel unfunded escrow
                if escrow_info.payer != *canceller {
                    return Err(PodError::InvalidConfig("Only creator can cancel unfunded escrow".to_string()));
                }
            }
            EscrowStatus::Funded | EscrowStatus::InProgress => {
                // Both parties must agree for funded escrow cancellation
                // This would require a two-step process or multi-sig
                return Err(PodError::InvalidConfig("Funded escrow cancellation requires mutual agreement".to_string()));
            }
            _ => {
                return Err(PodError::InvalidConfig("Escrow cannot be cancelled in current state".to_string()));
            }
        }

        Ok(())
    }

    fn create_escrow_instruction(
        &self,
        payer: &Pubkey,
        escrow_pda: &Pubkey,
        bump: u8,
        escrow_id: &str,
        creation_data: &EscrowCreationData,
    ) -> Result<Instruction, PodError> {
        let context = self.get_context()?;
        
        // Placeholder instruction for escrow creation
        Ok(system_instruction::create_account(
            payer,
            escrow_pda,
            1000000, // Minimum rent-exempt amount
            1024,    // Account data size
            &context.config.program_id,
        ))
    }

    fn create_fund_instruction(
        &self,
        payer: &Pubkey,
        escrow_pda: &Pubkey,
        amount: u64,
    ) -> Result<Instruction, PodError> {
        // Placeholder instruction for funding escrow
        Ok(system_instruction::transfer(payer, escrow_pda, amount))
    }

    fn create_release_instruction(
        &self,
        releaser: &Pubkey,
        escrow_pda: &Pubkey,
        escrow_id: &str,
    ) -> Result<Instruction, PodError> {
        // Placeholder instruction for releasing escrow
        Ok(system_instruction::transfer(releaser, releaser, 0))
    }

    fn create_complete_milestone_instruction(
        &self,
        completer: &Pubkey,
        escrow_pda: &Pubkey,
        escrow_id: &str,
        milestone_id: &str,
    ) -> Result<Instruction, PodError> {
        // Placeholder instruction for completing milestone
        Ok(system_instruction::transfer(completer, completer, 0))
    }

    fn create_dispute_instruction(
        &self,
        initiator: &Pubkey,
        escrow_pda: &Pubkey,
        escrow_id: &str,
        reason: &str,
    ) -> Result<Instruction, PodError> {
        // Placeholder instruction for initiating dispute
        Ok(system_instruction::transfer(initiator, initiator, 0))
    }

    fn create_cancel_instruction(
        &self,
        canceller: &Pubkey,
        escrow_pda: &Pubkey,
        escrow_id: &str,
    ) -> Result<Instruction, PodError> {
        // Placeholder instruction for cancelling escrow
        Ok(system_instruction::transfer(canceller, canceller, 0))
    }

    async fn send_transaction(
        &self,
        context: &ServiceContext,
        instructions: Vec<Instruction>,
    ) -> Result<TransactionResult, PodError> {
        let wallet = context.wallet.as_ref()
            .ok_or_else(|| PodError::InvalidConfig("Wallet required".to_string()))?;

        // Get recent blockhash
        let recent_blockhash = context.rpc_client
            .get_latest_blockhash()
            .map_err(|e| PodError::Network(e.to_string()))?;

        // Create and sign transaction
        let signers: Vec<&dyn Signer> = vec![&**wallet];
        let transaction = Transaction::new_signed_with_payer(
            &instructions,
            Some(&wallet.pubkey()),
            &signers,
            recent_blockhash,
        );

        // Send transaction
        let signature = context.rpc_client
            .send_and_confirm_transaction(&transaction)
            .map_err(|e| PodError::Network(e.to_string()))?;

        Ok(TransactionResult::new(signature))
    }

    fn deserialize_escrow_data(
        &self,
        data: &[u8],
        escrow_id: &str,
        escrow_pda: &Pubkey,
    ) -> Result<EscrowInfo, PodError> {
        // This would deserialize the actual on-chain escrow data
        // For now, return a placeholder
        Ok(EscrowInfo {
            id: escrow_id.to_string(),
            pda: *escrow_pda,
            payer: Pubkey::new_unique(),
            recipient: Pubkey::new_unique(),
            title: "Escrow".to_string(),
            description: "An escrow".to_string(),
            escrow_type: EscrowType::SimplePayment,
            status: EscrowStatus::Created,
            amount_lamports: 1000000,
            amount_released: 0,
            conditions: EscrowConditions::default(),
            milestones: Vec::new(),
            created_at: Utc::now(),
            funded_at: None,
            completed_at: None,
            expiry_date: Some(Utc::now() + Duration::days(30)),
            dispute_info: None,
            metadata: HashMap::new(),
        })
    }
}

/// Escrow statistics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EscrowStats {
    pub total_created: u64,
    pub total_received: u64,
    pub total_amount_escrowed: u64,
    pub total_amount_released: u64,
    pub active_escrows: u64,
    pub disputed_escrows: u64,
    pub success_rate: f64,
}

#[async_trait]
impl BaseService for EscrowService {
    async fn initialize(&mut self, config: &Config, rpc_client: Arc<RpcClient>) -> Result<(), PodError> {
        self.context = Some(ServiceContext::new(config.clone(), rpc_client));
        tracing::info!("EscrowService initialized");
        Ok(())
    }

    fn service_name(&self) -> &'static str {
        "EscrowService"
    }

    async fn health_check(&self) -> Result<(), PodError> {
        let context = self.get_context()?;
        
        // Check RPC connection
        let _ = context.rpc_client
            .get_health()
            .map_err(|e| PodError::Network(e.to_string()))?;
        
        Ok(())
    }
}

impl Default for EscrowService {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_escrow_creation_data() {
        let recipient = Pubkey::new_unique();
        let data = EscrowCreationData::new_simple_payment(
            "Test Payment".to_string(),
            "A test payment".to_string(),
            recipient,
            1.5,
        );

        assert_eq!(data.title, "Test Payment");
        assert_eq!(data.recipient, recipient);
        assert_eq!(data.amount_lamports, (1.5 * LAMPORTS_PER_SOL as f64) as u64);
        assert_eq!(data.escrow_type, EscrowType::SimplePayment);
    }

    #[test]
    fn test_milestone_creation() {
        let milestones = vec![
            EscrowMilestone {
                id: "milestone1".to_string(),
                description: "First milestone".to_string(),
                amount_lamports: 500_000_000,
                due_date: None,
                completion_criteria: vec!["Complete design".to_string()],
                status: MilestoneStatus::Pending,
                completed_at: None,
            },
        ];

        let recipient = Pubkey::new_unique();
        let data = EscrowCreationData::new_milestone_payment(
            "Milestone Project".to_string(),
            "A project with milestones".to_string(),
            recipient,
            milestones.clone(),
        );

        assert_eq!(data.escrow_type, EscrowType::MilestonePayment);
        assert_eq!(data.milestones.len(), 1);
        assert_eq!(data.amount_lamports, 500_000_000);
    }

    #[tokio::test]
    async fn test_escrow_service_creation() {
        let service = EscrowService::new();
        assert_eq!(service.service_name(), "EscrowService");
    }

    #[test]
    fn test_escrow_filter() {
        let payer = Pubkey::new_unique();
        let filter = EscrowFilter::new()
            .for_payer(payer)
            .with_status(EscrowStatus::Funded);

        assert_eq!(filter.payer, Some(payer));
        assert_eq!(filter.status, Some(EscrowStatus::Funded));
    }

    #[test]
    fn test_escrow_conditions_default() {
        let conditions = EscrowConditions::default();
        assert!(conditions.requires_recipient_confirmation);
        assert!(!conditions.requires_payer_confirmation);
        assert_eq!(conditions.auto_release_after_hours, Some(72));
        assert_eq!(conditions.dispute_resolution, DisputeResolution::Automatic);
    }
}