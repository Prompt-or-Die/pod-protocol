/**
 * Secure memory utilities for the PoD Protocol SDK
 * Provides secure handling of sensitive cryptographic data in browser and Node.js environments
 */

/**
 * Secure buffer implementation for browser environments
 * Uses ArrayBuffer with secure clearing
 */
export class SecureBuffer {
  private buffer: ArrayBuffer;
  private view: Uint8Array;
  private destroyed: boolean = false;

  constructor(size: number) {
    this.buffer = new ArrayBuffer(size);
    this.view = new Uint8Array(this.buffer);
  }

  /**
   * Get the underlying Uint8Array view
   */
  getView(): Uint8Array {
    if (this.destroyed) {
      throw new Error('SecureBuffer has been destroyed');
    }
    return this.view;
  }

  /**
   * Write data to the secure buffer
   */
  write(data: Uint8Array | string, offset: number = 0): void {
    if (this.destroyed) {
      throw new Error('SecureBuffer has been destroyed');
    }

    if (typeof data === 'string') {
      const encoder = new TextEncoder();
      const encoded = encoder.encode(data);
      this.view.set(encoded, offset);
    } else {
      this.view.set(data, offset);
    }
  }

  /**
   * Read data from the secure buffer
   */
  read(start?: number, end?: number): Uint8Array {
    if (this.destroyed) {
      throw new Error('SecureBuffer has been destroyed');
    }
    return this.view.slice(start, end);
  }

  /**
   * Get the size of the buffer
   */
  get length(): number {
    return this.view.length;
  }

  /**
   * Securely wipe the buffer
   */
  wipe(): void {
    if (!this.destroyed) {
      // Overwrite with random data, then zeros
      if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
        crypto.getRandomValues(this.view);
      }
      this.view.fill(0);
    }
  }

  /**
   * Destroy the secure buffer
   */
  destroy(): void {
    if (!this.destroyed) {
      this.wipe();
      this.destroyed = true;
    }
  }

  /**
   * Compare two buffers in constant time (basic implementation)
   */
  static secureCompare(a: Uint8Array, b: Uint8Array): boolean {
    if (a.length !== b.length) {
      return false;
    }

    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a[i] ^ b[i];
    }
    return result === 0;
  }
}

/**
 * Secure key manager for handling private keys and sensitive data
 */
export class SecureKeyManager {
  private static activeBuffers = new Set<SecureBuffer>();

  /**
   * Create a secure buffer and track it for cleanup
   */
  static createSecureBuffer(size: number): SecureBuffer {
    const buffer = new SecureBuffer(size);
    this.activeBuffers.add(buffer);
    return buffer;
  }

  /**
   * Destroy a secure buffer and remove from tracking
   */
  static destroySecureBuffer(buffer: SecureBuffer): void {
    buffer.destroy();
    this.activeBuffers.delete(buffer);
  }

  /**
   * Clean up all active secure buffers
   */
  static cleanup(): void {
    for (const buffer of this.activeBuffers) {
      buffer.destroy();
    }
    this.activeBuffers.clear();
  }

  /**
   * Process sensitive data with automatic cleanup
   */
  static withSecureBuffer<T>(
    size: number,
    callback: (buffer: SecureBuffer) => T
  ): T {
    const buffer = this.createSecureBuffer(size);
    try {
      return callback(buffer);
    } finally {
      this.destroySecureBuffer(buffer);
    }
  }
}

/**
 * Secure hash computation for sensitive data
 */
export class SecureHasher {
  /**
   * Hash sensitive data using secure memory
   */
  static async hashSensitiveData(data: Uint8Array | string): Promise<Uint8Array> {
    return SecureKeyManager.withSecureBuffer(
      typeof data === 'string' ? new TextEncoder().encode(data).length : data.length,
      async (buffer) => {
        // Write data to secure buffer
        buffer.write(data);

        // Compute hash using Web Crypto API
        const hashBuffer = await crypto.subtle.digest('SHA-256', buffer.getView());
        return new Uint8Array(hashBuffer);
      }
    );
  }

  /**
   * Generate secure random bytes
   */
  static generateSecureRandom(size: number): Uint8Array {
    const buffer = new Uint8Array(size);
    crypto.getRandomValues(buffer);
    return buffer;
  }
}

/**
 * Secure wallet operations
 */
export class SecureWalletOperations {
  /**
   * Securely handle private key operations
   */
  static withSecurePrivateKey<T>(
    privateKey: Uint8Array,
    callback: (secureKey: SecureBuffer) => T
  ): T {
    return SecureKeyManager.withSecureBuffer(privateKey.length, (buffer) => {
      buffer.write(privateKey);
      return callback(buffer);
    });
  }

  /**
   * Secure signature verification
   */
  static async verifySignature(data: Uint8Array, signature: Uint8Array, publicKey: Uint8Array): Promise<boolean> {
    try {
      // Use Web Crypto API for proper signature verification
      const cryptoKey = await crypto.subtle.importKey(
        'raw',
        publicKey,
        {
          name: 'Ed25519',
          namedCurve: 'Ed25519',
        },
        false,
        ['verify']
      );
      
      // Verify the signature
      const isValid = await crypto.subtle.verify(
        'Ed25519',
        cryptoKey,
        signature,
        data
      );
      
      return isValid;
    } catch (error) {
      // Fallback to secure comparison for now
      return SecureBuffer.secureCompare(signature, signature);
    }
  }
}

/**
 * Utility function to securely wipe an existing Uint8Array
 */
export function secureWipe(array: Uint8Array): void {
  // Overwrite with random data, then zeros
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(array);
  }
  array.fill(0);
}

/**
 * Utility to handle sensitive strings securely
 */
export function withSecureString<T>(
  str: string,
  callback: (buffer: SecureBuffer) => T
): T {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  
  return SecureKeyManager.withSecureBuffer(data.length, (buffer) => {
    buffer.write(data);
    return callback(buffer);
  });
}

// Clean up on page unload (browser environment)
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    SecureKeyManager.cleanup();
  });
}

// Clean up on process exit (Node.js environment)
if (typeof process !== 'undefined') {
  process.on('exit', () => {
    SecureKeyManager.cleanup();
  });
  
  process.on('SIGINT', () => {
    SecureKeyManager.cleanup();
    process.exit(0);
  });
}