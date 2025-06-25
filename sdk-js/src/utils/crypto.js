/**
 * Cryptographic utilities for PoD Protocol SDK
 */

import CryptoJS from 'crypto-js';

/**
 * Hash a message payload using SHA-256
 * 
 * @param {string} payload - Message payload to hash
 * @returns {Buffer} SHA-256 hash as buffer
 */
export function hashPayload(payload) {
  const hash = CryptoJS.SHA256(payload);
  return Buffer.from(hash.toString(CryptoJS.enc.Hex), 'hex');
}

/**
 * Verify a payload against its hash
 * 
 * @param {string} payload - Original payload
 * @param {Buffer|Uint8Array} hash - Expected hash
 * @returns {boolean} True if hash matches
 */
export function verifyPayloadHash(payload, hash) {
  const computedHash = hashPayload(payload);
  const hashBuffer = Buffer.isBuffer(hash) ? hash : Buffer.from(hash);
  return computedHash.equals(hashBuffer);
}

/**
 * Generate a random nonce
 * 
 * @param {number} [length=32] - Length in bytes
 * @returns {Buffer} Random nonce
 */
export function generateNonce(length = 32) {
  const randomWords = CryptoJS.lib.WordArray.random(length);
  return Buffer.from(randomWords.toString(CryptoJS.enc.Hex), 'hex');
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
 * Check if a string is a valid public key
 * 
 * @param {string} pubkey - Public key string
 * @returns {boolean} True if valid
 */
export function isValidAddress(pubkey) {
  try {
    new Address(pubkey);
    return true;
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
