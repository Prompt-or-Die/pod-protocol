/**
 * Base service class for PoD Protocol SDK services
 */

export class BaseService {
  /**
   * @param {Object} config - Service configuration
   * @param {Rpc<any>} config.connection - Solana connection
   * @param {Address} config.programId - Program ID
   * @param {string} config.commitment - Commitment level
   */
  constructor(config) {
    this.connection = config.connection;
    this.programId = config.programId;
    this.commitment = config.commitment;
    this.program = null;
  }

  /**
   * Set the Anchor program instance
   * @param {Program} program - Anchor program
   */
  setProgram(program) {
    this.program = program;
  }

  /**
   * Check if service is initialized with program
   * @returns {boolean} True if initialized
   */
  isInitialized() {
    return this.program !== null;
  }

  /**
   * Retry function for operations that might fail
   * @param {Function} operation - Async operation to retry
   * @param {number} maxRetries - Maximum number of retries
   * @param {number} delay - Delay between retries in ms
   * @returns {Promise<any>} Operation result
   */
  async retry(operation, maxRetries = 3, delay = 1000) {
    let lastError;
    
    for (let i = 0; i <= maxRetries; i++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        
        if (i === maxRetries) {
          break;
        }
        
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
      }
    }
    
    throw lastError;
  }

  /**
   * Sleep utility
   * @param {number} ms - Milliseconds to sleep
   * @returns {Promise<void>}
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Cleanup resources
   */
  async cleanup() {
    // Override in subclasses if needed
  }
}
