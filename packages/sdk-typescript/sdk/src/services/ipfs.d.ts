import { CID } from 'multiformats/cid';
import { BaseService, BaseServiceConfig } from './base.js';
/**
 * IPFS configuration options
 */
export interface IPFSConfig {
    /** IPFS node URL - defaults to Infura public gateway */
    url?: string;
    /** IPFS API endpoint - defaults to /api/v0 */
    apiPath?: string;
    /** Authorization headers for private IPFS nodes */
    headers?: Record<string, string>;
    /** Timeout for IPFS operations in milliseconds */
    timeout?: number;
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
 */
export declare class IPFSService extends BaseService {
    private client;
    private config;
    constructor(baseConfig: BaseServiceConfig, ipfsConfig?: IPFSConfig);
    /**
     * Store channel message content on IPFS
     */
    storeMessageContent(content: string, attachments?: string[], metadata?: Record<string, any>): Promise<IPFSStorageResult>;
    /**
     * Store participant extended metadata on IPFS
     */
    storeParticipantMetadata(displayName: string, avatar?: string, permissions?: string[], customData?: Record<string, any>): Promise<IPFSStorageResult>;
    /**
     * Store arbitrary JSON data on IPFS
     */
    storeJSON(data: any): Promise<IPFSStorageResult>;
    /**
     * Store raw file data on IPFS
     */
    storeFile(data: Buffer | Uint8Array, filename?: string): Promise<IPFSStorageResult>;
    /**
     * Retrieve JSON data from IPFS
     */
    retrieveJSON<T = any>(hash: string): Promise<T>;
    /**
     * Retrieve message content from IPFS
     */
    retrieveMessageContent(hash: string): Promise<ChannelMessageContent>;
    /**
     * Retrieve participant metadata from IPFS
     */
    retrieveParticipantMetadata(hash: string): Promise<ParticipantExtendedMetadata>;
    /**
     * Retrieve raw file data from IPFS
     */
    retrieveFile(hash: string): Promise<Buffer>;
    /**
     * Pin content to IPFS node (prevent garbage collection)
     */
    pinContent(hash: string): Promise<void>;
    /**
     * Unpin content from IPFS node
     */
    unpinContent(hash: string): Promise<void>;
    /**
     * Get IPFS node info
     */
    getNodeInfo(): Promise<any>;
    /**
     * Check if content exists on IPFS
     */
    contentExists(hash: string): Promise<boolean>;
    /**
     * Create a content hash for verification
     * Matches the Rust program's hash_to_bn254_field_size_be function
     */
    static createContentHash(content: string): string;
    /**
     * Create a metadata hash for participant data
     * Matches the Rust program's metadata hashing
     */
    static createMetadataHash(metadata: ParticipantExtendedMetadata): string;
    /**
     * Batch store multiple content items
     */
    batchStore(items: Array<{
        content: any;
        filename?: string;
    }>): Promise<IPFSStorageResult[]>;
    /**
     * Get gateway URL for content
     */
    getGatewayUrl(hash: string, gateway?: string): string;
    /**
     * Validate IPFS hash format
     */
    static isValidIPFSHash(hash: string): boolean;
}
//# sourceMappingURL=ipfs.d.ts.map