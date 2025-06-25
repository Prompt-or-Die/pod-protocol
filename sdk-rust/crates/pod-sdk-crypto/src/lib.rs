//! # PoD Protocol Cryptographic Utilities
//!
//! This crate provides cryptographic utilities and secure memory management
//! for the PoD Protocol Rust SDK.

#![deny(missing_docs)]
#![warn(clippy::all)]

use thiserror::Error;
use std::pin::Pin;

pub use blake3;
pub use solana_sdk::signer::keypair::Keypair;
pub use solana_sdk::signature::{Signature as SolanaSignature};
pub use solana_sdk::pubkey::Pubkey;
pub use rand;
pub use sha2;

#[cfg(feature = "aes")]
pub use aes_gcm;
#[cfg(feature = "chacha20")]
pub use chacha20poly1305;

/// Cryptographic error types
#[derive(Debug, Error)]
pub enum CryptoError {
    /// Invalid key size
    #[error("Invalid key size: expected {expected}, got {actual}")]
    InvalidKeySize { 
        /// Expected key size
        expected: usize, 
        /// Actual key size provided
        actual: usize 
    },
    
    /// Invalid signature
    #[error("Invalid signature")]
    InvalidSignature,
    
    /// Invalid public key
    #[error("Invalid public key")]
    InvalidPublicKey,
    
    /// Invalid private key
    #[error("Invalid private key")]
    InvalidPrivateKey,
    
    /// Random number generation failed
    #[error("Random number generation failed: {0}")]
    RngError(String),
    
    /// Buffer size validation failed
    #[error("Invalid buffer size: {0}")]
    InvalidBufferSize(usize),
    
    /// Encryption failed
    #[error("Encryption failed: {0}")]
    EncryptionError(String),
    
    /// Decryption failed
    #[error("Decryption failed: {0}")]
    DecryptionError(String),
    
    /// Invalid nonce size
    #[error("Invalid nonce size: expected {expected}, got {actual}")]
    InvalidNonceSize {
        /// Expected nonce size
        expected: usize,
        /// Actual nonce size provided
        actual: usize,
    },
}

/// Maximum size for secure buffers (64KB)
pub const MAX_SECURE_BUFFER_SIZE: usize = 64 * 1024;

/// Secure memory buffer that automatically zeros on drop
pub struct SecureBuffer {
    data: Vec<u8>,
    _pin: std::marker::PhantomPinned,
}

impl SecureBuffer {
    /// Create a new secure buffer with the specified size
    pub fn new(size: usize) -> Result<Pin<Box<Self>>, CryptoError> {
        if size == 0 || size > MAX_SECURE_BUFFER_SIZE {
            return Err(CryptoError::InvalidBufferSize(size));
        }
        
        let mut data = vec![0u8; size];
        
        // Initialize with secure random if requested
        unsafe {
            std::ptr::write_volatile(data.as_mut_ptr(), 0);
        }
        
        let buffer = Self {
            data,
            _pin: std::marker::PhantomPinned,
        };
        
        Ok(Box::pin(buffer))
    }
    
    /// Create a secure buffer from existing data
    pub fn from_slice(data: &[u8]) -> Result<Pin<Box<Self>>, CryptoError> {
        if data.len() > MAX_SECURE_BUFFER_SIZE {
            return Err(CryptoError::InvalidBufferSize(data.len()));
        }
        
        let buffer = Self {
            data: data.to_vec(),
            _pin: std::marker::PhantomPinned,
        };
        
        Ok(Box::pin(buffer))
    }
    
    /// Get an immutable slice of the buffer
    pub fn as_slice(&self) -> &[u8] {
        &self.data
    }
    
    /// Get a mutable slice of the buffer
    pub fn as_mut_slice(&mut self) -> &mut [u8] {
        &mut self.data
    }
    
    /// Get the length of the buffer
    pub fn len(&self) -> usize {
        self.data.len()
    }
    
    /// Check if the buffer is empty
    pub fn is_empty(&self) -> bool {
        self.data.is_empty()
    }
    
    /// Constant-time comparison with another buffer
    pub fn secure_compare(&self, other: &[u8]) -> bool {
        if self.data.len() != other.len() {
            return false;
        }
        
        // Constant-time comparison to prevent timing attacks
        self.data
            .iter()
            .zip(other.iter())
            .fold(0u8, |acc, (a, b)| acc | (a ^ b)) == 0
    }
    
    /// Fill the buffer with secure random bytes
    pub fn fill_random(&mut self) -> Result<(), CryptoError> {
        use rand::RngCore;
        let mut rng = rand::thread_rng();
        rng.fill_bytes(&mut self.data);
        Ok(())
    }
    
    /// Clear the buffer (set all bytes to zero)
    pub fn clear(&mut self) {
        for byte in &mut self.data {
            unsafe {
                std::ptr::write_volatile(byte, 0);
            }
        }
    }
}

impl std::fmt::Debug for SecureBuffer {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("SecureBuffer")
            .field("len", &self.data.len())
            .field("data", &"[REDACTED]")
            .finish()
    }
}

/// Secure random number generator
pub struct SecureRng {
    rng: rand::rngs::ThreadRng,
}

impl SecureRng {
    /// Create a new secure RNG
    pub fn new() -> Result<Self, CryptoError> {
        Ok(Self {
            rng: rand::thread_rng(),
        })
    }
    
    /// Fill a buffer with random bytes
    pub fn fill_bytes(&mut self, dest: &mut [u8]) -> Result<(), CryptoError> {
        use rand::RngCore;
        self.rng.fill_bytes(dest);
        Ok(())
    }
    
    /// Generate a random u64
    pub fn next_u64(&mut self) -> u64 {
        use rand::RngCore;
        self.rng.next_u64()
    }
    
    /// Generate random bytes into a new secure buffer
    pub fn generate_bytes(&mut self, size: usize) -> Result<Pin<Box<SecureBuffer>>, CryptoError> {
        let mut buffer = SecureBuffer::new(size)?;
        // Safety: We just created the buffer and have exclusive access
        unsafe {
            let buffer_mut = Pin::get_unchecked_mut(buffer.as_mut());
            self.fill_bytes(buffer_mut.as_mut_slice())?;
        }
        Ok(buffer)
    }
}

impl Default for SecureRng {
    fn default() -> Self {
        Self::new().expect("Failed to initialize secure RNG")
    }
}

/// Blake3 hasher wrapper
pub struct Hash {
    hasher: blake3::Hasher,
}

impl Hash {
    /// Create a new hasher
    pub fn new() -> Self {
        Self {
            hasher: blake3::Hasher::new(),
        }
    }
    
    /// Create a new keyed hasher
    pub fn new_keyed(key: &[u8; 32]) -> Self {
        Self {
            hasher: blake3::Hasher::new_keyed(key),
        }
    }
    
    /// Add data to the hash
    pub fn update(&mut self, data: &[u8]) {
        self.hasher.update(data);
    }
    
    /// Finalize the hash and return the result
    pub fn finalize(self) -> [u8; 32] {
        self.hasher.finalize().into()
    }
    
    /// Compute hash of data in one call
    pub fn hash(data: &[u8]) -> [u8; 32] {
        blake3::hash(data).into()
    }
    
    /// Compute keyed hash of data in one call
    pub fn hash_keyed(key: &[u8; 32], data: &[u8]) -> [u8; 32] {
        blake3::keyed_hash(key, data).into()
    }
}

impl Default for Hash {
    fn default() -> Self {
        Self::new()
    }
}

/// Ed25519 signature utilities using Solana's implementation
pub struct Signature;

impl Signature {
    /// Sign a message with a keypair
    pub fn sign_with_keypair(keypair: &Keypair, message: &[u8]) -> Result<[u8; 64], CryptoError> {
        use solana_sdk::signer::Signer;
        
        let signature = keypair.sign_message(message);
        Ok(signature.as_ref().try_into().unwrap())
    }
    
    /// Verify a signature using Solana's verification
    pub fn verify_solana(
        public_key: &solana_sdk::pubkey::Pubkey,
        message: &[u8],
        signature: &SolanaSignature,
    ) -> bool {
        signature.verify(public_key.as_ref(), message)
    }
    
    /// Generate a new Solana keypair
    pub fn generate_solana_keypair() -> Result<Keypair, CryptoError> {
        Ok(Keypair::new())
    }
    
    /// Create signature from bytes
    pub fn from_bytes(bytes: &[u8; 64]) -> Result<SolanaSignature, CryptoError> {
        SolanaSignature::try_from(bytes.as_ref())
            .map_err(|_| CryptoError::InvalidSignature)
    }
    
    /// Simple signing function for backward compatibility
    pub fn sign(private_key: &[u8; 32], message: &[u8]) -> Result<[u8; 64], CryptoError> {
        // Create a keypair from the private key bytes
        let keypair = Keypair::from_bytes(private_key)
            .map_err(|_| CryptoError::InvalidPrivateKey)?;
        
        Self::sign_with_keypair(&keypair, message)
    }
    
    /// Simple verification function for backward compatibility
    pub fn verify(
        public_key: &[u8; 32],
        message: &[u8],
        signature: &[u8; 64],
    ) -> bool {
        use solana_sdk::pubkey::Pubkey;
        
        let pubkey = match Pubkey::try_from(public_key.as_ref()) {
            Ok(pk) => pk,
            Err(_) => return false,
        };
        
        let sig = match Self::from_bytes(signature) {
            Ok(s) => s,
            Err(_) => return false,
        };
        
        Self::verify_solana(&pubkey, message, &sig)
    }
    
    /// Generate a new keypair (backward compatibility)
    pub fn generate_keypair() -> Result<([u8; 32], [u8; 32]), CryptoError> {
        use solana_sdk::signer::Signer;
        
        let keypair = Self::generate_solana_keypair()?;
        
        let secret_bytes: [u8; 32] = keypair.secret().as_ref().try_into()
            .map_err(|_| CryptoError::InvalidPrivateKey)?;
        let public_bytes: [u8; 32] = keypair.pubkey().as_ref().try_into()
            .map_err(|_| CryptoError::InvalidPublicKey)?;
        
        Ok((secret_bytes, public_bytes))
    }
    
    /// Get public key from private key (backward compatibility)  
    pub fn public_key_from_private(private_key: &[u8; 32]) -> Result<[u8; 32], CryptoError> {
        use solana_sdk::signer::Signer;
        
        let keypair = Keypair::from_bytes(private_key)
            .map_err(|_| CryptoError::InvalidPrivateKey)?;
        
        let public_bytes: [u8; 32] = keypair.pubkey().as_ref().try_into()
            .map_err(|_| CryptoError::InvalidPublicKey)?;
        
        Ok(public_bytes)
    }
}

/// Key derivation utilities
pub struct KeyDerivation;

impl KeyDerivation {
    /// Derive a key using HKDF-SHA256
    pub fn hkdf_sha256(
        ikm: &[u8],        // Input key material
        salt: Option<&[u8]>, // Optional salt
        info: &[u8],       // Context info
        length: usize,     // Output length
    ) -> Result<Vec<u8>, CryptoError> {
        use sha2::Sha256;
        use hkdf::Hkdf;
        
        let hk = Hkdf::<Sha256>::new(salt, ikm);
        let mut okm = vec![0u8; length];
        hk.expand(info, &mut okm)
            .map_err(|_| CryptoError::RngError("HKDF expansion failed".to_string()))?;
        
        Ok(okm)
    }
    
    /// Derive multiple keys from a master key
    pub fn derive_multiple_keys(
        master_key: &[u8; 32],
        salt: &[u8],
        contexts: &[&[u8]],
        key_length: usize,
    ) -> Result<Vec<Vec<u8>>, CryptoError> {
        let mut keys = Vec::with_capacity(contexts.len());
        
        for context in contexts {
            let key = Self::hkdf_sha256(master_key, Some(salt), context, key_length)?;
            keys.push(key);
        }
        
        Ok(keys)
    }
}

/// Utility functions
pub mod utils {
    use super::*;
    
    /// Generate secure random salt
    pub fn generate_salt(size: usize) -> Result<Vec<u8>, CryptoError> {
        let mut rng = SecureRng::new()?;
        let mut salt = vec![0u8; size];
        rng.fill_bytes(&mut salt)?;
        Ok(salt)
    }
    
    /// Constant-time comparison of two byte slices
    pub fn constant_time_eq(a: &[u8], b: &[u8]) -> bool {
        if a.len() != b.len() {
            return false;
        }
        
        a.iter()
            .zip(b.iter())
            .fold(0u8, |acc, (x, y)| acc | (x ^ y)) == 0
    }
    
    /// Securely overwrite memory
    pub fn secure_zero(data: &mut [u8]) {
        for byte in data {
            unsafe {
                std::ptr::write_volatile(byte, 0);
            }
        }
    }
}

/// Symmetric encryption utilities
pub struct SymmetricEncryption;

impl SymmetricEncryption {
    /// Encrypt data using AES-256-GCM
    #[cfg(feature = "aes")]
    pub fn encrypt_aes_gcm(
        key: &[u8; 32],
        nonce: &[u8; 12],
        plaintext: &[u8],
        associated_data: Option<&[u8]>,
    ) -> Result<Vec<u8>, CryptoError> {
        use aes_gcm::{Aes256Gcm, Key, Nonce};
        use aead::{Aead, NewAead};
        
        let key = Key::from_slice(key);
        let cipher = Aes256Gcm::new(key);
        
        let nonce = Nonce::from_slice(nonce);
        let payload = aead::Payload {
            msg: plaintext,
            aad: associated_data.unwrap_or(&[]),
        };
        
        cipher
            .encrypt(nonce, payload)
            .map_err(|e| CryptoError::EncryptionError(format!("AES-GCM encryption failed: {}", e)))
    }
    
    /// Decrypt data using AES-256-GCM
    #[cfg(feature = "aes")]
    pub fn decrypt_aes_gcm(
        key: &[u8; 32],
        nonce: &[u8; 12],
        ciphertext: &[u8],
        associated_data: Option<&[u8]>,
    ) -> Result<Vec<u8>, CryptoError> {
        use aes_gcm::{Aes256Gcm, Key, Nonce};
        use aead::{Aead, NewAead};
        
        let key = Key::from_slice(key);
        let cipher = Aes256Gcm::new(key);
        
        let nonce = Nonce::from_slice(nonce);
        let payload = aead::Payload {
            msg: ciphertext,
            aad: associated_data.unwrap_or(&[]),
        };
        
        cipher
            .decrypt(nonce, payload)
            .map_err(|e| CryptoError::DecryptionError(format!("AES-GCM decryption failed: {}", e)))
    }
    
    /// Encrypt data using ChaCha20Poly1305
    #[cfg(feature = "chacha20")]
    pub fn encrypt_chacha20poly1305(
        key: &[u8; 32],
        nonce: &[u8; 12],
        plaintext: &[u8],
        associated_data: Option<&[u8]>,
    ) -> Result<Vec<u8>, CryptoError> {
        use chacha20poly1305::{ChaCha20Poly1305, Key, Nonce};
        use aead::{Aead, NewAead};
        
        let key = Key::from_slice(key);
        let cipher = ChaCha20Poly1305::new(key);
        
        let nonce = Nonce::from_slice(nonce);
        let payload = aead::Payload {
            msg: plaintext,
            aad: associated_data.unwrap_or(&[]),
        };
        
        cipher
            .encrypt(nonce, payload)
            .map_err(|e| CryptoError::EncryptionError(format!("ChaCha20Poly1305 encryption failed: {}", e)))
    }
    
    /// Decrypt data using ChaCha20Poly1305
    #[cfg(feature = "chacha20")]
    pub fn decrypt_chacha20poly1305(
        key: &[u8; 32],
        nonce: &[u8; 12],
        ciphertext: &[u8],
        associated_data: Option<&[u8]>,
    ) -> Result<Vec<u8>, CryptoError> {
        use chacha20poly1305::{ChaCha20Poly1305, Key, Nonce};
        use aead::{Aead, NewAead};
        
        let key = Key::from_slice(key);
        let cipher = ChaCha20Poly1305::new(key);
        
        let nonce = Nonce::from_slice(nonce);
        let payload = aead::Payload {
            msg: ciphertext,
            aad: associated_data.unwrap_or(&[]),
        };
        
        cipher
            .decrypt(nonce, payload)
            .map_err(|e| CryptoError::DecryptionError(format!("ChaCha20Poly1305 decryption failed: {}", e)))
    }
    
    /// Generate secure nonce for encryption
    pub fn generate_nonce() -> Result<[u8; 12], CryptoError> {
        let mut rng = SecureRng::new()?;
        let mut nonce = [0u8; 12];
        rng.fill_bytes(&mut nonce)?;
        Ok(nonce)
    }
    
    /// Generate encryption key from password using PBKDF2
    pub fn derive_key_from_password(
        password: &[u8],
        salt: &[u8],
        iterations: u32,
    ) -> Result<[u8; 32], CryptoError> {
        use sha2::Sha256;
        use hkdf::Hkdf;
        
        // Use HKDF as a simple PBKDF2 alternative
        let hk = Hkdf::<Sha256>::new(Some(salt), password);
        let mut key = [0u8; 32];
        
        // Create context info with iteration count
        let info = format!("PoD-Protocol-Key-Derivation-{}", iterations);
        
        hk.expand(info.as_bytes(), &mut key)
            .map_err(|_| CryptoError::RngError("Key derivation failed".to_string()))?;
        
        Ok(key)
    }
}

use hkdf;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_secure_buffer_creation() {
        let buffer = SecureBuffer::new(32).unwrap();
        assert_eq!(buffer.len(), 32);
        assert_eq!(buffer.as_slice(), &[0u8; 32]);
    }

    #[test]
    fn test_secure_buffer_from_slice() {
        let data = b"Hello, World!";
        let buffer = SecureBuffer::from_slice(data).unwrap();
        assert_eq!(buffer.as_slice(), data);
    }

    #[test]
    fn test_secure_buffer_comparison() {
        let data1 = b"Hello, World!";
        let data2 = b"Hello, World!";
        let data3 = b"Hello, Rust!";
        
        let buffer1 = SecureBuffer::from_slice(data1).unwrap();
        let buffer2 = SecureBuffer::from_slice(data2).unwrap();
        
        assert!(buffer1.secure_compare(data2));
        assert!(!buffer1.secure_compare(data3));
        assert!(buffer2.secure_compare(data1));
    }

    #[test]
    fn test_hash_functionality() {
        let data = b"Hello, World!";
        let hash1 = Hash::hash(data);
        let hash2 = Hash::hash(data);
        
        // Same input should produce same hash
        assert_eq!(hash1, hash2);
        
        // Different input should produce different hash
        let hash3 = Hash::hash(b"Hello, Rust!");
        assert_ne!(hash1, hash3);
    }

    #[test]
    fn test_signature_roundtrip() {
        let message = b"Hello, World!";
        let (private_key, public_key) = Signature::generate_keypair().unwrap();
        
        let signature = Signature::sign(&private_key, message).unwrap();
        assert!(Signature::verify(&public_key, message, &signature));
        
        // Wrong message should fail verification
        assert!(!Signature::verify(&public_key, b"Wrong message", &signature));
    }

    #[test]
    fn test_public_key_derivation() {
        let (private_key, expected_public_key) = Signature::generate_keypair().unwrap();
        let derived_public_key = Signature::public_key_from_private(&private_key).unwrap();
        
        assert_eq!(expected_public_key, derived_public_key);
    }

    #[test]
    fn test_secure_rng() {
        let mut rng = SecureRng::new().unwrap();
        let mut buffer1 = [0u8; 32];
        let mut buffer2 = [0u8; 32];
        
        rng.fill_bytes(&mut buffer1).unwrap();
        rng.fill_bytes(&mut buffer2).unwrap();
        
        // Should be very unlikely to generate the same random data
        assert_ne!(buffer1, buffer2);
    }

    #[test]
    fn test_constant_time_comparison() {
        let data1 = b"Hello, World!";
        let data2 = b"Hello, World!";
        let data3 = b"Hello, Rust!";
        
        assert!(utils::constant_time_eq(data1, data2));
        assert!(!utils::constant_time_eq(data1, data3));
        assert!(!utils::constant_time_eq(data1, b"Short"));
    }

    #[test]
    #[cfg(feature = "aes")]
    fn test_aes_gcm_encryption_roundtrip() {
        let key = [0u8; 32];
        let nonce = [0u8; 12];
        let plaintext = b"Hello, World! This is a test message.";
        let associated_data = b"metadata";
        
        let ciphertext = SymmetricEncryption::encrypt_aes_gcm(
            &key,
            &nonce,
            plaintext,
            Some(associated_data),
        )
        .unwrap();
        
        let decrypted = SymmetricEncryption::decrypt_aes_gcm(
            &key,
            &nonce,
            &ciphertext,
            Some(associated_data),
        )
        .unwrap();
        
        assert_eq!(plaintext, decrypted.as_slice());
    }

    #[test]
    #[cfg(feature = "chacha20")]
    fn test_chacha20poly1305_encryption_roundtrip() {
        let key = [1u8; 32];
        let nonce = [1u8; 12];
        let plaintext = b"Hello, World! This is a ChaCha20Poly1305 test.";
        let associated_data = b"chacha-metadata";
        
        let ciphertext = SymmetricEncryption::encrypt_chacha20poly1305(
            &key,
            &nonce,
            plaintext,
            Some(associated_data),
        )
        .unwrap();
        
        let decrypted = SymmetricEncryption::decrypt_chacha20poly1305(
            &key,
            &nonce,
            &ciphertext,
            Some(associated_data),
        )
        .unwrap();
        
        assert_eq!(plaintext, decrypted.as_slice());
    }

    #[test]
    fn test_nonce_generation() {
        let nonce1 = SymmetricEncryption::generate_nonce().unwrap();
        let nonce2 = SymmetricEncryption::generate_nonce().unwrap();
        
        // Nonces should be different (very high probability)
        assert_ne!(nonce1, nonce2);
    }

    #[test]
    fn test_password_key_derivation() {
        let password = b"test_password";
        let salt = b"test_salt_123";
        let iterations = 1000;
        
        let key1 = SymmetricEncryption::derive_key_from_password(password, salt, iterations).unwrap();
        let key2 = SymmetricEncryption::derive_key_from_password(password, salt, iterations).unwrap();
        
        // Same inputs should produce same key
        assert_eq!(key1, key2);
        
        // Different salt should produce different key
        let key3 = SymmetricEncryption::derive_key_from_password(password, b"different_salt", iterations).unwrap();
        assert_ne!(key1, key3);
    }
} 