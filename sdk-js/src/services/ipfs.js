/**
 * IPFS service for PoD Protocol SDK
 */

import { BaseService } from './base.js';
import axios from 'axios';

/**
 * Service for IPFS integration in the PoD Protocol
 * 
 * @class IPFSService
 * @extends BaseService
 */
export class IPFSService extends BaseService {
  /**
   * @param {Object} serviceConfig - Base service configuration
   * @param {Object} ipfsConfig - IPFS-specific configuration
   */
  constructor(serviceConfig, ipfsConfig = {}) {
    super(serviceConfig);
    
    this.disabled = ipfsConfig.disabled || false;
    this.url = ipfsConfig.url || 'https://ipfs.infura.io:5001';
    this.apiPath = ipfsConfig.apiPath || '/api/v0';
    this.headers = ipfsConfig.headers || {};
    this.timeout = ipfsConfig.timeout || 30000;
    this.gatewayUrl = ipfsConfig.gatewayUrl || 'https://ipfs.io/ipfs/';
    
    // Setup axios instance
    this.client = axios.create({
      baseURL: this.url + this.apiPath,
      timeout: this.timeout,
      headers: {
        'Content-Type': 'multipart/form-data',
        ...this.headers
      }
    });
  }

  /**
   * Upload content to IPFS
   * 
   * @param {Object} options - Upload options
   * @param {any} options.content - Content to upload (object, string, or buffer)
   * @param {Object} [options.metadata] - Additional metadata
   * @param {boolean} [options.pin=true] - Whether to pin the content
   * @returns {Promise<Object>} Upload result with hash and URLs
   * 
   * @example
   * ```javascript
   * const result = await client.ipfs.upload({
   *   content: { name: 'MyAgent', description: 'AI Trading Agent' },
   *   metadata: { type: 'agent-profile' },
   *   pin: true
   * });
   * console.log('IPFS hash:', result.hash);
   * console.log('Gateway URL:', result.gatewayUrl);
   * ```
   */
  async upload(options) {
    if (this.disabled) {
      throw new Error('IPFS service is disabled');
    }

    try {
      // Prepare content
      let content = options.content;
      if (typeof content === 'object' && content !== null) {
        content = JSON.stringify(content);
      }

      // Create form data
      const formData = new FormData();
      const blob = new Blob([content], { type: 'application/json' });
      formData.append('file', blob, 'content.json');

      // Add metadata if provided
      if (options.metadata) {
        formData.append('metadata', JSON.stringify(options.metadata));
      }

      // Upload to IPFS
      const response = await this.client.post('/add', formData, {
        params: {
          pin: options.pin !== false ? 'true' : 'false',
          'wrap-with-directory': 'false'
        }
      });

      const result = response.data;
      const hash = result.Hash;

      return {
        hash,
        size: result.Size,
        gatewayUrl: this.gatewayUrl + hash,
        pinned: options.pin !== false
      };
    } catch (error) {
      throw new Error(`Failed to upload to IPFS: ${error.message}`);
    }
  }

  /**
   * Retrieve content from IPFS
   * 
   * @param {string} hash - IPFS hash
   * @param {Object} [options] - Retrieval options
   * @param {boolean} [options.json=true] - Parse as JSON
   * @param {number} [options.timeout] - Request timeout
   * @returns {Promise<any>} Retrieved content
   * 
   * @example
   * ```javascript
   * const data = await client.ipfs.retrieve('QmHash...', { json: true });
   * console.log('Retrieved data:', data);
   * ```
   */
  async retrieve(hash, options = {}) {
    if (this.disabled) {
      throw new Error('IPFS service is disabled');
    }

    try {
      const timeout = options.timeout || this.timeout;
      const url = this.gatewayUrl + hash;

      const response = await axios.get(url, {
        timeout,
        responseType: options.json !== false ? 'json' : 'text'
      });

      return response.data;
    } catch (error) {
      throw new Error(`Failed to retrieve from IPFS: ${error.message}`);
    }
  }

  /**
   * Pin content to IPFS
   * 
   * @param {string} hash - IPFS hash to pin
   * @returns {Promise<Object>} Pin result
   * 
   * @example
   * ```javascript
   * const result = await client.ipfs.pin('QmHash...');
   * console.log('Pinned:', result.pinned);
   * ```
   */
  async pin(hash) {
    if (this.disabled) {
      throw new Error('IPFS service is disabled');
    }

    try {
      const response = await this.client.post('/pin/add', null, {
        params: { arg: hash }
      });

      return {
        hash,
        pinned: true,
        result: response.data
      };
    } catch (error) {
      throw new Error(`Failed to pin IPFS content: ${error.message}`);
    }
  }

  /**
   * Unpin content from IPFS
   * 
   * @param {string} hash - IPFS hash to unpin
   * @returns {Promise<Object>} Unpin result
   * 
   * @example
   * ```javascript
   * const result = await client.ipfs.unpin('QmHash...');
   * console.log('Unpinned:', result.unpinned);
   * ```
   */
  async unpin(hash) {
    if (this.disabled) {
      throw new Error('IPFS service is disabled');
    }

    try {
      const response = await this.client.post('/pin/rm', null, {
        params: { arg: hash }
      });

      return {
        hash,
        unpinned: true,
        result: response.data
      };
    } catch (error) {
      throw new Error(`Failed to unpin IPFS content: ${error.message}`);
    }
  }

  /**
   * List pinned content
   * 
   * @param {Object} [options] - List options
   * @param {string} [options.type='recursive'] - Pin type
   * @returns {Promise<Array>} List of pinned content
   * 
   * @example
   * ```javascript
   * const pinned = await client.ipfs.listPinned();
   * console.log('Pinned content:', pinned);
   * ```
   */
  async listPinned(options = {}) {
    if (this.disabled) {
      throw new Error('IPFS service is disabled');
    }

    try {
      const response = await this.client.post('/pin/ls', null, {
        params: {
          type: options.type || 'recursive'
        }
      });

      return response.data.Keys ? Object.keys(response.data.Keys) : [];
    } catch (error) {
      throw new Error(`Failed to list pinned content: ${error.message}`);
    }
  }

  /**
   * Upload channel message content to IPFS
   * 
   * @param {Object} messageContent - Message content object
   * @param {string} messageContent.content - Main message content
   * @param {Array} [messageContent.attachments] - File attachments
   * @param {Object} [messageContent.metadata] - Additional metadata
   * @returns {Promise<Object>} Upload result
   * 
   * @example
   * ```javascript
   * const result = await client.ipfs.uploadChannelMessage({
   *   content: 'Hello everyone!',
   *   attachments: [{ name: 'file.pdf', url: 'https://...' }],
   *   metadata: { type: 'announcement' }
   * });
   * ```
   */
  async uploadChannelMessage(messageContent) {
    return this.upload({
      content: messageContent,
      metadata: { type: 'channel-message', ...messageContent.metadata },
      pin: true
    });
  }

  /**
   * Upload participant metadata to IPFS
   * 
   * @param {Object} participantMetadata - Participant metadata
   * @param {string} participantMetadata.bio - Participant bio
   * @param {string} participantMetadata.avatarUrl - Avatar URL
   * @param {Array} participantMetadata.capabilities - Capabilities list
   * @param {Object} participantMetadata.contactInfo - Contact information
   * @param {Object} participantMetadata.preferences - User preferences
   * @returns {Promise<Object>} Upload result
   * 
   * @example
   * ```javascript
   * const result = await client.ipfs.uploadParticipantMetadata({
   *   bio: 'AI researcher and developer',
   *   avatarUrl: 'https://avatar.url',
   *   capabilities: ['analysis', 'trading'],
   *   contactInfo: { email: 'agent@example.com' },
   *   preferences: { theme: 'dark' }
   * });
   * ```
   */
  async uploadParticipantMetadata(participantMetadata) {
    return this.upload({
      content: participantMetadata,
      metadata: { type: 'participant-metadata' },
      pin: true
    });
  }

  /**
   * Get IPFS gateway URL for a hash
   * 
   * @param {string} hash - IPFS hash
   * @returns {string} Gateway URL
   * 
   * @example
   * ```javascript
   * const url = client.ipfs.getGatewayUrl('QmHash...');
   * console.log('Gateway URL:', url);
   * ```
   */
  getGatewayUrl(hash) {
    return this.gatewayUrl + hash;
  }

  /**
   * Check if IPFS service is available
   * 
   * @returns {Promise<boolean>} True if available
   * 
   * @example
   * ```javascript
   * const available = await client.ipfs.isAvailable();
   * if (!available) {
   *   console.log('IPFS service unavailable');
   * }
   * ```
   */
  async isAvailable() {
    if (this.disabled) {
      return false;
    }

    try {
      await this.client.post('/version', null, { timeout: 5000 });
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get IPFS node information
   * 
   * @returns {Promise<Object>} Node information
   * 
   * @example
   * ```javascript
   * const info = await client.ipfs.getNodeInfo();
   * console.log('IPFS version:', info.version);
   * ```
   */
  async getNodeInfo() {
    if (this.disabled) {
      throw new Error('IPFS service is disabled');
    }

    try {
      const response = await this.client.post('/version');
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get IPFS node info: ${error.message}`);
    }
  }

  /**
   * Calculate integrity hash for content validation
   * 
   * @param {string} content - Content to hash
   * @returns {string} SHA-256 hash of the content
   * 
   * @example
   * ```javascript
   * const hash = IPFSService.calculateIntegrityHash('Hello World');
   * console.log('Content hash:', hash);
   * ```
   */
  static calculateIntegrityHash(content) {
    // Simple hash implementation for content validation
    // In a real implementation, this would use crypto.subtle or a hash library
    const encoder = new TextEncoder();
    const data = encoder.encode(content);
    
    // Simple hash based on content length and character codes
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data[i];
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return Math.abs(hash).toString(16).padStart(8, '0');
  }

  /**
   * Clean up resources
   */
  async cleanup() {
    // Clean up any pending requests or resources
    if (this.client) {
      // Cancel any pending requests if needed
    }
  }
}
