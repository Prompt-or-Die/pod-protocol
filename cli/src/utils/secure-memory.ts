/**
 * Secure memory utilities for handling sensitive cryptographic data
 * in the PoD Protocol CLI
 */

import { randomBytes, createHash, timingSafeEqual } from 'crypto';
import { safeParseKeypair } from './safe-json.js';

/**
 * Secure buffer wrapper for sensitive data operations
 */
export class SecureBuffer {
  private buffer: Buffer;
  private locked: boolean = false;

  constructor(size: number) {
    // Allocate buffer using Node.js Buffer
    this.buffer = Buffer.alloc(size);
    
    // Note: Memory locking is not available in Node.js without native modules
    // This is a simplified implementation for compatibility
    this.locked = false;
  }

  /**
   * Get the underlying buffer (use with caution)
   */
  getBuffer(): Buffer {
    return this.buffer;
  }

  /**
   * Write data to secure buffer
   */
  write(data: Buffer | Uint8Array | string, offset: number = 0): void {
    if (typeof data === 'string') {
      this.buffer.write(data, offset, 'utf8');
    } else {
      Buffer.from(data).copy(this.buffer, offset);
    }
  }

  /**
   * Read data from secure buffer
   */
  read(start?: number, end?: number): Buffer {
    return this.buffer.subarray(start, end);
  }

  /**
   * Compare two buffers in constant time
   */
  static secureCompare(a: Buffer, b: Buffer): boolean {
    // Ensure buffers are same length for timing-safe comparison
    if (a.length !== b.length) {
      return false;
    }
    return timingSafeEqual(a, b);
  }

  /**
   * Securely wipe the buffer
   */
  wipe(): void {
    // Fill with zeros to clear sensitive data
    this.buffer.fill(0);
  }

  /**
   * Free secure memory
   */
  destroy(): void {
    try {
      this.wipe();
      // Note: In a real secure implementation, you'd want to overwrite
      // the memory multiple times with random data
    } catch (error) {
      console.error('Error destroying secure buffer:', error);
    }
  }
}

/**
 * Secure keypair loader with memory protection
 */
export class SecureKeypairLoader {
  private static async readKeypairFile(path: string): Promise<SecureBuffer> {
    const fs = await import('fs/promises');
    const fileData = await fs.readFile(path);
    
    // Parse the keypair array safely
    const keypairArray = safeParseKeypair(fileData.toString());
    
    if (!keypairArray) {
      throw new Error('Invalid or potentially malicious keypair file format');
    }

    // Store in secure memory
    const secureBuffer = new SecureBuffer(64);
    secureBuffer.write(Buffer.from(keypairArray));
    
    return secureBuffer;
  }

  /**
   * Load a Solana keypair from file into secure memory
   */
  static async loadKeypair(path: string): Promise<{ publicKey: Buffer; secretKey: SecureBuffer }> {
    const secureBuffer = await this.readKeypairFile(path);
    const keypairData = secureBuffer.getBuffer();
    
    // Extract public and private keys
    const secretKey = new SecureBuffer(32);
    const publicKey = Buffer.alloc(32);
    
    // Copy secret key to secure buffer
    secretKey.write(keypairData.subarray(0, 32));
    
    // Copy public key (less sensitive)
    keypairData.subarray(32, 64).copy(publicKey);
    
    // Wipe the original buffer
    secureBuffer.destroy();
    
    return { publicKey, secretKey };
  }
}

/**
 * Secure hash computation for sensitive data
 */
export class SecureHasher {
  /**
   * Compute hash of sensitive data using secure memory
   */
  static async hashSensitiveData(data: Buffer | string): Promise<Buffer> {
    const inputData = typeof data === 'string' ? Buffer.from(data, 'utf8') : data;
    
    // Use secure buffer for input data
    const secureInput = new SecureBuffer(inputData.length);
    secureInput.write(inputData);
    
    try {
      // Compute hash using Node.js crypto
      const hash = createHash('sha256').update(secureInput.getBuffer()).digest();
      return hash;
    } finally {
      // Always clean up secure memory
      secureInput.destroy();
    }
  }

  /**
   * Generate secure random bytes
   */
  static generateSecureRandom(size: number): Buffer {
    return randomBytes(size);
  }
}

/**
 * Utility function to securely clear a regular buffer
 */
export function secureWipe(buffer: Buffer): void {
  buffer.fill(0);
}

/**
 * Utility function for secure string handling
 */
export function withSecureString<T>(
  str: string,
  callback: (buffer: SecureBuffer) => T
): T {
  const secureBuffer = new SecureBuffer(Buffer.byteLength(str, 'utf8'));
  secureBuffer.write(str);
  
  try {
    return callback(secureBuffer);
  } finally {
    secureBuffer.destroy();
  }
}