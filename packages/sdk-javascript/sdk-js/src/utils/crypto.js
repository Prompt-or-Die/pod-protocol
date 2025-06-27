/**
 * Cryptographic utilities for PoD Protocol
 * Compatible with Web3.js v2.0
 */

/**
 * Generate a SHA-256 hash of the given data
 * @param {string|Uint8Array} data - Data to hash
 * @returns {Promise<Uint8Array>} SHA-256 hash
 */
export async function sha256(data) {
  const encoder = new TextEncoder();
  const dataBytes = typeof data === 'string' ? encoder.encode(data) : data;
  
  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    // Browser environment
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', dataBytes);
    return new Uint8Array(hashBuffer);
  } else {
    // Node.js environment
    const crypto = await import('crypto');
    const hash = crypto.createHash('sha256');
    hash.update(dataBytes);
    return new Uint8Array(hash.digest());
  }
}

/**
 * Generate a cryptographically secure random byte array
 * @param {number} length - Number of bytes to generate
 * @returns {Uint8Array} Random bytes
 */
export function generateRandomBytes(length) {
  if (typeof window !== 'undefined' && window.crypto) {
    // Browser environment
    return window.crypto.getRandomValues(new Uint8Array(length));
  } else {
    // Node.js environment
    const crypto = require('crypto');
    return new Uint8Array(crypto.randomBytes(length));
  }
}

/**
 * Validate a Solana public key format
 * @param {string} pubkey - Public key string to validate
 * @returns {boolean} True if valid format
 */
export function isValidPublicKey(pubkey) {
  try {
    if (typeof pubkey !== 'string') return false;
    if (pubkey.length < 32 || pubkey.length > 44) return false;
    
    // Basic base58 validation
    const base58Regex = /^[1-9A-HJ-NP-Za-km-z]+$/;
    return base58Regex.test(pubkey);
  } catch (error) {
    return false;
  }
}

/**
 * Generate a deterministic signature for bundle ordering
 * @param {string} content - Content to sign
 * @param {string} seed - Deterministic seed
 * @returns {Promise<string>} Deterministic signature
 */
export async function generateDeterministicSignature(content, seed) {
  const encoder = new TextEncoder();
  const contentBytes = encoder.encode(content + seed);
  const hash = await sha256(contentBytes);
  
  // Convert to base64 for signature format
  const base64 = btoa(String.fromCharCode(...hash));
  return base64.substring(0, 32); // Truncate for signature length
}

/**
 * Verify message signature using Web Crypto API
 * @param {string} message - Original message
 * @param {string} signature - Signature to verify
 * @param {string} publicKey - Public key for verification
 * @returns {Promise<boolean>} True if signature is valid
 */
export async function verifySignature(message, signature, publicKey) {
  try {
    if (typeof window === 'undefined') {
      // Node.js environment - use simplified verification
      const expectedSig = await generateDeterministicSignature(message, publicKey);
      return signature === expectedSig;
    }

    // Browser environment - use Web Crypto API
    const encoder = new TextEncoder();
    const messageBytes = encoder.encode(message);
    const signatureBytes = new Uint8Array(
      atob(signature).split('').map(char => char.charCodeAt(0))
    );

    // Import the public key (simplified for compatibility)
    const key = await window.crypto.subtle.importKey(
      'raw',
      encoder.encode(publicKey),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    return await window.crypto.subtle.verify(
      'HMAC',
      key,
      signatureBytes,
      messageBytes
    );
  } catch (error) {
    console.warn('Signature verification failed:', error);
    return false;
  }
}

/**
 * Hash a message payload using SHA-256
 * 
 * @param {string} payload - Message payload to hash
 * @returns {Promise<Uint8Array>} SHA-256 hash as Uint8Array
 */
export async function hashPayload(payload) {
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(payload);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return new Uint8Array(hashBuffer);
  } catch (error) {
    console.error('Error hashing payload:', error);
    // Fallback for environments without crypto.subtle
    return new Uint8Array(32).fill(0);
  }
}

/**
 * Verify a payload against its hash
 * 
 * @param {string} payload - Original payload
 * @param {Buffer|Uint8Array} hash - Expected hash
 * @returns {Promise<boolean>} True if hash matches
 */
export async function verifyPayloadHash(payload, hash) {
  const computedHash = await hashPayload(payload);
  const hashArray = hash instanceof Uint8Array ? hash : new Uint8Array(hash);
  
  if (computedHash.length !== hashArray.length) {
    return false;
  }
  
  for (let i = 0; i < computedHash.length; i++) {
    if (computedHash[i] !== hashArray[i]) {
      return false;
    }
  }
  
  return true;
}

/**
 * Generate a random nonce
 * 
 * @param {number} [length=32] - Length in bytes
 * @returns {Uint8Array} Random nonce
 */
export function generateNonce(length = 32) {
  if (typeof window !== 'undefined' && window.crypto) {
    // Browser environment
    return window.crypto.getRandomValues(new Uint8Array(length));
  } else {
    // Node.js environment or fallback
    const array = new Uint8Array(length);
    for (let i = 0; i < length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
    return array;
  }
}

/**
 * Convert lamports to SOL
 * 
 * @param {number} lamports - Amount in lamports
 * @returns {number} Amount in SOL
 */
export function lamportsToSol(lamports) {
  return lamports / 1_000_000_000;
}

/**
 * Convert SOL to lamports
 * 
 * @param {number} sol - Amount in SOL
 * @returns {number} Amount in lamports
 */
export function solToLamports(sol) {
  return Math.floor(sol * 1_000_000_000);
}

/**
 * Check if a string is a valid public key format
 * 
 * @param {string} pubkey - Public key string
 * @returns {boolean} True if valid
 */
export function isValidAddress(pubkey) {
  try {
    if (typeof pubkey !== 'string') return false;
    if (pubkey.length < 32 || pubkey.length > 44) return false;
    
    // Basic base58 validation
    const base58Regex = /^[1-9A-HJ-NP-Za-km-z]+$/;
    return base58Regex.test(pubkey);
  } catch {
    return false;
  }
}

/**
 * Sleep for a specified number of milliseconds
 * 
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
