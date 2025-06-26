use std::sync::Arc;
use async_trait::async_trait;
use solana_sdk::{pubkey::Pubkey, signer::Signer, signature::Signature};
use solana_client::rpc_client::RpcClient;
use crate::{Config, PodError};

/// Base trait for all PoD Protocol services
#[async_trait]
pub trait BaseService: Send + Sync {
    /// Initialize the service with client configuration
    async fn initialize(&mut self, config: &Config, rpc_client: Arc<RpcClient>) -> Result<(), PodError>;
    
    /// Get the service name for logging and debugging
    fn service_name(&self) -> &'static str;
    
    /// Health check for the service
    async fn health_check(&self) -> Result<(), PodError>;
}

/// Shared service context containing common resources
#[derive(Clone)]
pub struct ServiceContext {
    pub config: Config,
    pub rpc_client: Arc<RpcClient>,
    pub wallet: Option<Arc<dyn Signer + Send + Sync>>,
}

impl ServiceContext {
    pub fn new(config: Config, rpc_client: Arc<RpcClient>) -> Self {
        Self {
            config,
            rpc_client,
            wallet: None,
        }
    }

    pub fn with_wallet(mut self, wallet: Arc<dyn Signer + Send + Sync>) -> Self {
        self.wallet = Some(wallet);
        self
    }

    /// Get the wallet public key if available
    pub fn wallet_pubkey(&self) -> Option<Pubkey> {
        self.wallet.as_ref().map(|w| w.pubkey())
    }

    /// Check if wallet is available
    pub fn has_wallet(&self) -> bool {
        self.wallet.is_some()
    }
}

/// Transaction result containing signature and relevant data
#[derive(Debug, Clone)]
pub struct TransactionResult {
    pub signature: Signature,
    pub slot: Option<u64>,
    pub block_time: Option<i64>,
}

impl TransactionResult {
    pub fn new(signature: Signature) -> Self {
        Self {
            signature,
            slot: None,
            block_time: None,
        }
    }

    pub fn with_slot(mut self, slot: u64) -> Self {
        self.slot = Some(slot);
        self
    }

    pub fn with_block_time(mut self, block_time: i64) -> Self {
        self.block_time = Some(block_time);
        self
    }
}

/// Common instruction building utilities
pub mod instruction_utils {
    use solana_sdk::{
        instruction::Instruction,
        pubkey::Pubkey,
        system_instruction,
        sysvar,
    };
    use crate::PodError;

    /// Create a system transfer instruction
    pub fn create_transfer_instruction(
        from: &Pubkey,
        to: &Pubkey,
        lamports: u64,
    ) -> Instruction {
        system_instruction::transfer(from, to, lamports)
    }

    /// Get common system accounts
    pub fn get_system_accounts() -> Vec<Pubkey> {
        vec![
            solana_sdk::system_program::id(),
            sysvar::rent::id(),
            sysvar::clock::id(),
        ]
    }

    /// Validate a public key
    pub fn validate_pubkey(pubkey: &Pubkey) -> Result<(), PodError> {
        if *pubkey == Pubkey::default() {
            return Err(PodError::InvalidConfig("Invalid public key".to_string()));
        }
        Ok(())
    }
}

/// Account derivation utilities
pub mod account_utils {
    use solana_sdk::pubkey::{Pubkey, PubkeyError};
    use crate::PodError;

    /// Derive agent PDA (Program Derived Address)
    pub fn derive_agent_pda(
        program_id: &Pubkey,
        wallet_pubkey: &Pubkey,
    ) -> Result<(Pubkey, u8), PodError> {
        Pubkey::find_program_address(
            &[b"agent", wallet_pubkey.as_ref()],
            program_id,
        ).map_err(|e| PodError::Solana(format!("Failed to derive agent PDA: {}", e)))
            .map(|(pubkey, bump)| (pubkey, bump))
    }

    /// Derive message PDA
    pub fn derive_message_pda(
        program_id: &Pubkey,
        from: &Pubkey,
        to: &Pubkey,
        message_id: &str,
    ) -> Result<(Pubkey, u8), PodError> {
        Pubkey::find_program_address(
            &[
                b"message",
                from.as_ref(),
                to.as_ref(),
                message_id.as_bytes(),
            ],
            program_id,
        ).map_err(|e| PodError::Solana(format!("Failed to derive message PDA: {}", e)))
            .map(|(pubkey, bump)| (pubkey, bump))
    }

    /// Derive channel PDA
    pub fn derive_channel_pda(
        program_id: &Pubkey,
        channel_id: &str,
    ) -> Result<(Pubkey, u8), PodError> {
        Pubkey::find_program_address(
            &[b"channel", channel_id.as_bytes()],
            program_id,
        ).map_err(|e| PodError::Solana(format!("Failed to derive channel PDA: {}", e)))
            .map(|(pubkey, bump)| (pubkey, bump))
    }

    /// Derive escrow PDA
    pub fn derive_escrow_pda(
        program_id: &Pubkey,
        escrow_id: &str,
    ) -> Result<(Pubkey, u8), PodError> {
        Pubkey::find_program_address(
            &[b"escrow", escrow_id.as_bytes()],
            program_id,
        ).map_err(|e| PodError::Solana(format!("Failed to derive escrow PDA: {}", e)))
            .map(|(pubkey, bump)| (pubkey, bump))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::str::FromStr;

    #[test]
    fn test_service_context_creation() {
        let config = Config::default();
        let rpc_client = Arc::new(RpcClient::new("https://api.devnet.solana.com".to_string()));
        let context = ServiceContext::new(config, rpc_client);
        
        assert!(!context.has_wallet());
        assert!(context.wallet_pubkey().is_none());
    }

    #[test]
    fn test_transaction_result() {
        let sig = Signature::from_str("5VERv8NMvzbJMEkV8xnrLkEaWRtSz9CosKDYjCJjBRnbJLgp8uirBgmQpjKhoR4tjF3ZpRzrFmBV6UjKdiSZkQUW").unwrap();
        let result = TransactionResult::new(sig)
            .with_slot(123456)
            .with_block_time(1640995200);
        
        assert_eq!(result.signature, sig);
        assert_eq!(result.slot, Some(123456));
        assert_eq!(result.block_time, Some(1640995200));
    }

    #[test]
    fn test_pubkey_validation() {
        use crate::services::base::instruction_utils::validate_pubkey;
        
        let valid_key = Pubkey::new_unique();
        let invalid_key = Pubkey::default();
        
        assert!(validate_pubkey(&valid_key).is_ok());
        assert!(validate_pubkey(&invalid_key).is_err());
    }

    #[test]
    fn test_agent_pda_derivation() {
        use crate::services::base::account_utils::derive_agent_pda;
        
        let program_id = Pubkey::new_unique();
        let wallet_pubkey = Pubkey::new_unique();
        
        let result = derive_agent_pda(&program_id, &wallet_pubkey);
        assert!(result.is_ok());
        
        let (pda, bump) = result.unwrap();
        assert_ne!(pda, Pubkey::default());
        assert!(bump <= 255);
    }
}