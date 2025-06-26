import { address } from "@solana/addresses";
import type { Address } from "@solana/addresses";
import { BaseService } from "./base.js";
import { CID } from 'multiformats/cid';
import keccak from 'keccak';
// import type { JSON as HeliaJSON } from '@helia/json';

/**
 * Create a Node.js-compatible libp2p configuration without WebRTC
 */
function createNodeLibp2pConfig() {
  return {
    // Disable WebRTC to avoid native module dependencies
    transports: [],
    connectionEncryption: [],
    streamMuxers: [],
    // Minimal configuration for Node.js environments
    start: false
  };
}

// Type for the actual Helia instance (we'll define this as any for now)
type HeliaInstance = any;
type HeliaJSON = any;
type UnixFS = any;

/**
 * IPFS configuration options
 */
export interface IPFSConfig {
  /** Disable IPFS functionality completely */
  disabled?: boolean;
  /** Custom Helia node configuration */
  heliaConfig?: any;
  /** Timeout for IPFS operations in milliseconds */
  timeout?: number;
  /** Gateway URL for retrieving content */
  gatewayUrl?: string;
}

/**
 * Channel message content structure for IPFS storage
 */
export interface ChannelMessageContent {
  content: string;
  attachments?: string[];
  metadata?: Record<string, any>;
  timestamp: number;
  version: string;
}

/**
 * Participant extended metadata structure for IPFS storage
 */
export interface ParticipantExtendedMetadata {
  displayName?: string;
  avatar?: string;
  permissions?: string[];
  customData?: Record<string, any>;
  lastUpdated: number;
}

/**
 * IPFS storage result
 */
export interface IPFSStorageResult {
  hash: string;
  cid: CID;
  size: number;
  url: string;
}

/**
 * IPFS Service for handling off-chain storage of PoD Protocol data
 * Integrates with ZK compression for cost-effective data management
 * Uses Helia (modern IPFS implementation) instead of deprecated js-IPFS
 */
export class IPFSService extends BaseService {
  private helia: HeliaInstance | null = null;
  private fs: UnixFS | null = null;
  private jsonStore: HeliaJSON | null = null;
  private config: IPFSConfig;
  private initPromise: Promise<void> | null = null;

  constructor(rpcUrl: string, programId: string, commitment: any, config: IPFSConfig = {}) {
    super(rpcUrl, programId, commitment);
    this.config = {
      disabled: false,
      timeout: 30000,
      gatewayUrl: 'https://ipfs.io/ipfs',
      ...config
    };
  }

  /**
   * Initialize Helia node and services
   */
  private async init(): Promise<void> {
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = (async () => {
      try {
        // Check if IPFS is disabled
        if (this.config.disabled) {
          console.warn('IPFS functionality is disabled');
          return; // Skip initialization
        }

        // Create Helia with minimal configuration for Node.js CLI environments
        const config = this.config.heliaConfig || {};
        
        // Try to create Helia with fallback error handling
        try {
          // Dynamic imports to avoid immediate native module loading
          const { createHelia } = await import('helia');
          const { unixfs } = await import('@helia/unixfs');
          const { json } = await import('@helia/json');
          
          this.helia = await createHelia(config);
          this.fs = unixfs(this.helia);
          this.jsonStore = json(this.helia);
        } catch (nativeModuleError) {
          // If native modules fail, throw a more specific error
          console.warn('Warning: Native IPFS modules unavailable, IPFS features will be disabled');
          throw new Error(`IPFS functionality requires native modules: ${nativeModuleError.message}`);
        }
      } catch (error) {
        throw new Error(`Failed to initialize Helia: ${error}`);
      }
    })();

    return this.initPromise;
  }

  /**
   * Ensure Helia is initialized
   */
  private async ensureIPFSInitialized(): Promise<void> {
    if (this.config.disabled) {
      throw new Error('IPFS functionality is disabled');
    }
    await this.init();
  }

  /**
   * Store channel message content on IPFS
   */
  async storeMessageContent(
    content: string,
    attachments: string[] = [],
    metadata: Record<string, any> = {}
  ): Promise<IPFSStorageResult> {
    const messageContent: ChannelMessageContent = {
      content,
      attachments,
      metadata,
      timestamp: Date.now(),
      version: '1.0.0',
    };

    return this.storeJSON(messageContent);
  }

  /**
   * Store participant extended metadata on IPFS
   */
  async storeParticipantMetadata(
    displayName: string,
    avatar?: string,
    permissions: string[] = [],
    customData: Record<string, any> = {}
  ): Promise<IPFSStorageResult> {
    const participantMetadata: ParticipantExtendedMetadata = {
      displayName,
      avatar,
      permissions,
      customData,
      lastUpdated: Date.now(),
    };

    return this.storeJSON(participantMetadata);
  }

  /**
   * Store arbitrary JSON data on IPFS
   */
  async storeJSON(data: any): Promise<IPFSStorageResult> {
    try {
      await this.ensureIPFSInitialized();
      
      const cid = await this.jsonStore!.add(data);
      
      // Get size by encoding the data
      const jsonString = JSON.stringify(data);
      const size = new TextEncoder().encode(jsonString).length;

      return {
        hash: cid,
        cid,
        size,
        url: `${this.config.gatewayUrl}/${cid}`,
      };
    } catch (error) {
      throw new Error(`Failed to store data on IPFS: ${error}`);
    }
  }

  /**
   * Store raw file data on IPFS
   */
  async storeFile(
    data: Buffer | Uint8Array,
    filename?: string
  ): Promise<IPFSStorageResult> {
    try {
      await this.ensureIPFSInitialized();
      
      const cid = await this.fs!.addBytes(data);

      return {
        hash: cid,
        cid,
        size: data.length,
        url: `${this.config.gatewayUrl}/${cid}`,
      };
    } catch (error) {
      throw new Error(`Failed to store file on IPFS: ${error}`);
    }
  }

  /**
   * Retrieve JSON data from IPFS
   */
  async retrieveJSON<T = any>(hash: string): Promise<T> {
    try {
      await this.ensureIPFSInitialized();
      
      const cid = CID.parse(hash);
      const data = await this.jsonStore!.get(cid);
      
      return data as T;
    } catch (error) {
      throw new Error(`Failed to retrieve data from IPFS: ${error}`);
    }
  }

  /**
   * Retrieve message content from IPFS
   */
  async retrieveMessageContent(hash: string): Promise<ChannelMessageContent> {
    return this.retrieveJSON<ChannelMessageContent>(hash);
  }

  /**
   * Retrieve participant metadata from IPFS
   */
  async retrieveParticipantMetadata(hash: string): Promise<ParticipantExtendedMetadata> {
    return this.retrieveJSON<ParticipantExtendedMetadata>(hash);
  }

  /**
   * Retrieve raw file data from IPFS
   */
  async retrieveFile(hash: string): Promise<Buffer> {
    try {
      await this.ensureIPFSInitialized();
      
      const cid = CID.parse(hash);
      const data = await this.fs!.cat(cid);
      
      const chunks: Uint8Array[] = [];
      for await (const chunk of data) {
        chunks.push(chunk);
      }

      return Buffer.concat(chunks);
    } catch (error) {
      throw new Error(`Failed to retrieve file from IPFS: ${error}`);
    }
  }

  /**
   * Pin content to ensure it stays available
   */
  async pinContent(hash: string): Promise<void> {
    try {
      await this.ensureIPFSInitialized();
      const cid = CID.parse(hash);
      await this.helia!.pins.add(cid);
    } catch (error) {
      throw new Error(`Failed to pin content: ${error}`);
    }
  }

  /**
   * Unpin content to allow garbage collection
   */
  async unpinContent(hash: string): Promise<void> {
    try {
      await this.ensureIPFSInitialized();
      const cid = CID.parse(hash);
      await this.helia!.pins.rm(cid);
    } catch (error) {
      throw new Error(`Failed to unpin content: ${error}`);
    }
  }

  /**
   * Get IPFS node info
   */
  async getNodeInfo(): Promise<any> {
    try {
      await this.ensureIPFSInitialized();
      return {
        id: this.helia!.libp2p.peerId,
        agentVersion: 'helia',
        protocolVersion: '1.0.0'
      };
    } catch (error) {
      throw new Error(`Failed to get IPFS node info: ${error}`);
    }
  }

  /**
   * Check if content exists on IPFS
   */
  async contentExists(hash: string): Promise<boolean> {
    try {
      await this.ensureIPFSInitialized();
      const cid = CID.parse(hash);
      await this.fs!.stat(cid);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Store channel message content on IPFS
   */
  async storeChannelMessageContent(
    content: ChannelMessageContent
  ): Promise<IPFSStorageResult> {
    return this.storeJSON(content);
  }

  /**
   * Store participant extended metadata on IPFS
   */
  async storeParticipantExtendedMetadata(
    metadata: ParticipantExtendedMetadata
  ): Promise<IPFSStorageResult> {
    return this.storeJSON(metadata);
  }

  /**
   * Retrieve channel message content from IPFS
   */
  async retrieveChannelMessageContent(
    hash: string
  ): Promise<ChannelMessageContent> {
    return this.retrieveJSON<ChannelMessageContent>(hash);
  }

  /**
   * Retrieve participant extended metadata from IPFS
   */
  async retrieveParticipantExtendedMetadata(
    hash: string
  ): Promise<ParticipantExtendedMetadata> {
    return this.retrieveJSON<ParticipantExtendedMetadata>(hash);
  }

  /**
   * Cleanup resources
   */
  async stop(): Promise<void> {
    if (this.helia) {
      await this.helia.stop();
      this.helia = null;
      this.fs = null;
      this.jsonStore = null;
    }
  }

  /**
   * Create a content hash for verification
   * Matches the Rust program's hash_to_bn254_field_size_be function
   */
  static createContentHash(content: string): string {
    // Equivalent to `hash_to_bn254_field_size_be` in Rust:
    // https://github.com/Lightprotocol/light-protocol/blob/main/program-libs/hasher/src/hash_to_field_size.rs#L91

    // 1. Hash the UTF-8 bytes with Keccak256 and a bump seed (0xff).
    const keccakHash = keccak('keccak256')
      .update(Buffer.concat([Buffer.from(content, 'utf8'), Buffer.from([0xff])]))
      .digest();

    // 2. Zero the first byte so the result fits within the BN254 field.
    const fieldSizedHash = Buffer.from(keccakHash);
    fieldSizedHash[0] = 0;
    return fieldSizedHash.toString('hex');
  }
  
  /**
   * Create a metadata hash for participant data
   * Matches the Rust program's metadata hashing
   */
  static createMetadataHash(metadata: ParticipantExtendedMetadata): string {
    const metadataString = JSON.stringify({
      displayName: metadata.displayName || '',
      avatar: metadata.avatar || '',
      permissions: metadata.permissions || [],
      lastUpdated: metadata.lastUpdated
    });
    
    return this.createContentHash(metadataString);
  }

  /**
   * Batch store multiple content items
   */
  async batchStore(items: Array<{ content: any; filename?: string }>): Promise<IPFSStorageResult[]> {
    const results: IPFSStorageResult[] = [];
    
    for (const item of items) {
      if (typeof item.content === 'string' || Buffer.isBuffer(item.content)) {
        results.push(await this.storeFile(
          Buffer.isBuffer(item.content) ? item.content : Buffer.from(item.content),
          item.filename
        ));
      } else {
        results.push(await this.storeJSON(item.content));
      }
    }

    return results;
  }

  /**
   * Get gateway URL for content
   */
  getGatewayUrl(hash: string, gateway: string = 'https://ipfs.io/ipfs/'): string {
    return `${gateway}${hash}`;
  }

  /**
   * Validate IPFS hash format
   */
  static isValidIPFSHash(hash: string): boolean {
    try {
      CID.parse(hash);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get content from IPFS (wrapper for retrieveJSON)
   * @param hash IPFS hash to retrieve
   * @returns Content data
   */
  async getContent(hash: string): Promise<any> {
    try {
      return await this.retrieveJSON(hash);
    } catch (error) {
      // If JSON retrieval fails, try to get as raw file
      try {
        const buffer = await this.retrieveFile(hash);
        return buffer.toString('utf8');
      } catch (fileError) {
        throw new Error(`Failed to get content from IPFS: ${error}`);
      }
    }
  }

  /**
   * Create a hash for content (wrapper for createContentHash)
   * @param content Content to hash
   * @returns Hash string
   */
  createHash(content: string): string {
    return IPFSService.createContentHash(content);
  }

  /**
   * Get IPFS service information
   * @returns Service information
   */
  async getInfo(): Promise<{
    version: string;
    status: string;
    nodes: number;
    storage: {
      used: number;
      available: number;
    };
  }> {
    try {
      const nodeInfo = await this.getNodeInfo();
      
      return {
        version: nodeInfo?.agentVersion || 'helia',
        status: this.config.disabled ? 'disabled' : 'active',
        nodes: 1,
        storage: {
          used: 0, // Would need to implement actual storage calculation
          available: -1 // Unlimited for now
        }
      };
    } catch (error) {
      return {
        version: 'unknown',
        status: this.config.disabled ? 'disabled' : 'error',
        nodes: 0,
        storage: {
          used: 0,
          available: 0
        }
      };
    }
  }
}