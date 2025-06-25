//! # Encryption Utilities
//!
//! Encryption and decryption utilities for the PoD Protocol.

use crate::error::Result;
use pod_sdk_crypto::{SymmetricEncryption, KeyDerivation, CryptoError, Hash};
use solana_sdk::pubkey::Pubkey;

/// Encrypt message content using AES-256-GCM
pub fn encrypt_message(content: &[u8], key: &[u8]) -> Result<Vec<u8>> {
    // Ensure key is 32 bytes
    let key_hash = if key.len() == 32 {
        key.try_into().map_err(|_| crate::error::PodError::CryptoError("Invalid key length".to_string()))?
    } else {
        Hash::hash(key)
    };
    
    // Generate a random nonce
    let nonce = SymmetricEncryption::generate_nonce()
        .map_err(|e| crate::error::PodError::CryptoError(format!("Nonce generation failed: {}", e)))?;
    
    // Encrypt with AES-256-GCM
    let mut ciphertext = SymmetricEncryption::encrypt_aes_gcm(&key_hash, &nonce, content, None)
        .map_err(|e| crate::error::PodError::CryptoError(format!("Encryption failed: {}", e)))?;
    
    // Prepend nonce to ciphertext
    let mut result = Vec::with_capacity(12 + ciphertext.len());
    result.extend_from_slice(&nonce);
    result.append(&mut ciphertext);
    
    Ok(result)
}

/// Decrypt message content using AES-256-GCM
pub fn decrypt_message(content: &[u8], key: &[u8]) -> Result<Vec<u8>> {
    if content.len() < 12 {
        return Err(crate::error::PodError::CryptoError("Invalid ciphertext: too short".to_string()));
    }
    
    // Ensure key is 32 bytes
    let key_hash = if key.len() == 32 {
        key.try_into().map_err(|_| crate::error::PodError::CryptoError("Invalid key length".to_string()))?
    } else {
        Hash::hash(key)
    };
    
    // Extract nonce and ciphertext
    let nonce: [u8; 12] = content[..12].try_into()
        .map_err(|_| crate::error::PodError::CryptoError("Invalid nonce extraction".to_string()))?;
    let ciphertext = &content[12..];
    
    // Decrypt with AES-256-GCM
    let plaintext = SymmetricEncryption::decrypt_aes_gcm(&key_hash, &nonce, ciphertext, None)
        .map_err(|e| crate::error::PodError::CryptoError(format!("Decryption failed: {}", e)))?;
    
    Ok(plaintext)
}

/// Encrypt content using ChaCha20Poly1305 (alternative algorithm)
pub fn encrypt_content(content: &[u8], key: &[u8]) -> Result<Vec<u8>> {
    // Ensure key is 32 bytes
    let key_hash = if key.len() == 32 {
        key.try_into().map_err(|_| crate::error::PodError::CryptoError("Invalid key length".to_string()))?
    } else {
        Hash::hash(key)
    };
    
    // Generate a random nonce
    let nonce = SymmetricEncryption::generate_nonce()
        .map_err(|e| crate::error::PodError::CryptoError(format!("Nonce generation failed: {}", e)))?;
    
    // Encrypt with ChaCha20Poly1305
    let mut ciphertext = SymmetricEncryption::encrypt_chacha20poly1305(&key_hash, &nonce, content, None)
        .map_err(|e| crate::error::PodError::CryptoError(format!("Encryption failed: {}", e)))?;
    
    // Prepend nonce to ciphertext
    let mut result = Vec::with_capacity(12 + ciphertext.len());
    result.extend_from_slice(&nonce);
    result.append(&mut ciphertext);
    
    Ok(result)
}

/// Decrypt content using ChaCha20Poly1305
pub fn decrypt_content(content: &[u8], key: &[u8]) -> Result<Vec<u8>> {
    if content.len() < 12 {
        return Err(crate::error::PodError::CryptoError("Invalid ciphertext: too short".to_string()));
    }
    
    // Ensure key is 32 bytes
    let key_hash = if key.len() == 32 {
        key.try_into().map_err(|_| crate::error::PodError::CryptoError("Invalid key length".to_string()))?
    } else {
        Hash::hash(key)
    };
    
    // Extract nonce and ciphertext
    let nonce: [u8; 12] = content[..12].try_into()
        .map_err(|_| crate::error::PodError::CryptoError("Invalid nonce extraction".to_string()))?;
    let ciphertext = &content[12..];
    
    // Decrypt with ChaCha20Poly1305
    let plaintext = SymmetricEncryption::decrypt_chacha20poly1305(&key_hash, &nonce, ciphertext, None)
        .map_err(|e| crate::error::PodError::CryptoError(format!("Decryption failed: {}", e)))?;
    
    Ok(plaintext)
}

/// Generate channel encryption key from participant public keys
pub fn generate_channel_key(participants: &[Pubkey]) -> Result<Vec<u8>> {
    if participants.is_empty() {
        return Err(crate::error::PodError::CryptoError("No participants provided".to_string()));
    }
    
    // Sort participants for deterministic key generation
    let mut sorted_participants = participants.to_vec();
    sorted_participants.sort();
    
    // Create input key material from all participant keys
    let mut ikm = Vec::new();
    for pubkey in &sorted_participants {
        ikm.extend_from_slice(pubkey.as_ref());
    }
    
    // Use HKDF to derive channel key
    let salt = b"PoD-Protocol-Channel-Key-Salt-v1";
    let info = b"PoD-Protocol-Channel-Encryption-Key";
    
    let channel_key = KeyDerivation::hkdf_sha256(&ikm, Some(salt), info, 32)
        .map_err(|e| crate::error::PodError::CryptoError(format!("Channel key derivation failed: {}", e)))?;
    
    Ok(channel_key)
}

/// Derive shared key between participants using HKDF
pub fn derive_shared_key(participants: &[Pubkey]) -> Result<Vec<u8>> {
    if participants.len() < 2 {
        return Err(crate::error::PodError::CryptoError("At least 2 participants required".to_string()));
    }
    
    // Sort participants for deterministic key derivation
    let mut sorted_participants = participants.to_vec();
    sorted_participants.sort();
    
    // Create combined key material
    let mut combined_key_material = Vec::new();
    for pubkey in &sorted_participants {
        combined_key_material.extend_from_slice(pubkey.as_ref());
    }
    
    // Use different salt and context for shared keys
    let salt = b"PoD-Protocol-Shared-Key-Salt-v1";
    let info = format!("PoD-Protocol-Shared-Key-{}-participants", participants.len());
    
    let shared_key = KeyDerivation::hkdf_sha256(&combined_key_material, Some(salt), info.as_bytes(), 32)
        .map_err(|e| crate::error::PodError::CryptoError(format!("Shared key derivation failed: {}", e)))?;
    
    Ok(shared_key)
}

/// Generate encryption key from password for user-provided encryption
pub fn derive_key_from_password(password: &str, salt: &[u8]) -> Result<Vec<u8>> {
    let iterations = 100_000; // Secure iteration count
    
    let key = SymmetricEncryption::derive_key_from_password(password.as_bytes(), salt, iterations)
        .map_err(|e| crate::error::PodError::CryptoError(format!("Password key derivation failed: {}", e)))?;
    
    Ok(key.to_vec())
}

#[cfg(test)]
mod tests {
    use super::*;
    use solana_sdk::pubkey::Pubkey;

    #[test]
    fn test_message_encryption_roundtrip() {
        let message = b"Hello, World! This is a test encrypted message.";
        let key = b"test_encryption_key_32_bytes_long";
        
        let encrypted = encrypt_message(message, key).expect("Encryption should succeed");
        let decrypted = decrypt_message(&encrypted, key).expect("Decryption should succeed");
        
        assert_eq!(message, decrypted.as_slice());
        assert_ne!(message.to_vec(), encrypted); // Ensure it's actually encrypted
    }

    #[test]
    fn test_content_encryption_roundtrip() {
        let content = b"This is test content for ChaCha20Poly1305 encryption.";
        let key = b"another_test_key_that_is_32_bytes";
        
        let encrypted = encrypt_content(content, key).expect("Encryption should succeed");
        let decrypted = decrypt_content(&encrypted, key).expect("Decryption should succeed");
        
        assert_eq!(content, decrypted.as_slice());
        assert_ne!(content.to_vec(), encrypted); // Ensure it's actually encrypted
    }

    #[test]
    fn test_channel_key_generation() {
        let participants = vec![
            Pubkey::new_unique(),
            Pubkey::new_unique(),
            Pubkey::new_unique(),
        ];
        
        let key1 = generate_channel_key(&participants).expect("Key generation should succeed");
        let key2 = generate_channel_key(&participants).expect("Key generation should succeed");
        
        // Same participants should generate same key
        assert_eq!(key1, key2);
        assert_eq!(key1.len(), 32);
        
        // Different order should generate same key (deterministic)
        let mut shuffled_participants = participants.clone();
        shuffled_participants.reverse();
        let key3 = generate_channel_key(&shuffled_participants).expect("Key generation should succeed");
        assert_eq!(key1, key3);
    }

    #[test]
    fn test_shared_key_derivation() {
        let participants = vec![
            Pubkey::new_unique(),
            Pubkey::new_unique(),
        ];
        
        let key1 = derive_shared_key(&participants).expect("Key derivation should succeed");
        let key2 = derive_shared_key(&participants).expect("Key derivation should succeed");
        
        // Same participants should generate same key
        assert_eq!(key1, key2);
        assert_eq!(key1.len(), 32);
        
        // Different participants should generate different key
        let different_participants = vec![
            Pubkey::new_unique(),
            Pubkey::new_unique(),
        ];
        let key3 = derive_shared_key(&different_participants).expect("Key derivation should succeed");
        assert_ne!(key1, key3);
    }

    #[test]
    fn test_password_key_derivation() {
        let password = "test_password_123";
        let salt = b"test_salt_16_bytes";
        
        let key1 = derive_key_from_password(password, salt).expect("Key derivation should succeed");
        let key2 = derive_key_from_password(password, salt).expect("Key derivation should succeed");
        
        // Same inputs should produce same key
        assert_eq!(key1, key2);
        assert_eq!(key1.len(), 32);
        
        // Different password should produce different key
        let key3 = derive_key_from_password("different_password", salt).expect("Key derivation should succeed");
        assert_ne!(key1, key3);
    }

    #[test]
    fn test_encryption_with_wrong_key_fails() {
        let message = b"Secret message";
        let correct_key = b"correct_key_32_bytes_long_test12";
        let wrong_key = b"wrong_key_that_is_also_32_bytes1";
        
        let encrypted = encrypt_message(message, correct_key).expect("Encryption should succeed");
        
        // Decryption with wrong key should fail
        let result = decrypt_message(&encrypted, wrong_key);
        assert!(result.is_err());
    }
} 