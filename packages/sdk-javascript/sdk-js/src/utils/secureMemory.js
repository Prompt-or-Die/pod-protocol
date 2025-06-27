/**
 * Secure memory management for JavaScript SDK
 */

/**
 * Secure memory manager for protecting sensitive data
 * 
 * @class SecureMemoryManager
 */
export class SecureMemoryManager {
  constructor() {
    this.secureBuffers = new Set();
    this.isNodeJs = typeof process !== 'undefined' && process.versions && process.versions.node;
  }

  /**
   * Create a secure buffer for sensitive data
   * 
   * @param {number} size - Buffer size in bytes
   * @returns {Buffer|Uint8Array} Secure buffer
   */
  createSecureBuffer(size) {
    let buffer;
    
    if (this.isNodeJs) {
      // Use Node.js Buffer.allocUnsafe for better performance
      buffer = Buffer.allocUnsafe(size);
    } else {
      // Use Uint8Array for browser compatibility
      buffer = new Uint8Array(size);
    }
    
    this.secureBuffers.add(buffer);
    return buffer;
  }

  /**
   * Securely clear a buffer
   * 
   * @param {Buffer|Uint8Array} buffer - Buffer to clear
   */
  clearBuffer(buffer) {
    if (buffer) {
      // Overwrite with random data first, then zeros
      for (let i = 0; i < buffer.length; i++) {
        buffer[i] = Math.floor(Math.random() * 256);
      }
      for (let i = 0; i < buffer.length; i++) {
        buffer[i] = 0;
      }
      
      this.secureBuffers.delete(buffer);
    }
  }

  /**
   * Create a secure string wrapper
   * 
   * @param {string} data - Sensitive string data
   * @returns {Object} Secure string wrapper
   */
  createSecureString(data) {
    const buffer = this.createSecureBuffer(data.length * 2); // UTF-16 encoding
    const encoder = new TextEncoder();
    const encoded = encoder.encode(data);
    
    for (let i = 0; i < encoded.length; i++) {
      buffer[i] = encoded[i];
    }
    
    return {
      getValue: () => {
        const decoder = new TextDecoder();
        return decoder.decode(buffer.slice(0, encoded.length));
      },
      clear: () => {
        this.clearBuffer(buffer);
      }
    };
  }

  /**
   * Clean up all secure buffers
   */
  cleanup() {
    for (const buffer of this.secureBuffers) {
      this.clearBuffer(buffer);
    }
    this.secureBuffers.clear();
  }
}

export default SecureMemoryManager;
