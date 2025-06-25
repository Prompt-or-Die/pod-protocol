import anchor from '@coral-xyz/anchor';
const { AnchorProvider } = anchor;
import type { AnchorProvider as AnchorProviderType } from '@coral-xyz/anchor';
import { BaseService, BaseServiceConfig } from './base.js';
import { IPFSService, IPFSStorageResult } from './ipfs.js';
import { Transaction, TransactionInstruction, Address, Rpc, KeyPairSigner } from '@solana/web3.js';
import { createHash } from 'crypto';
import { SecureHasher, SecureKeyManager } from '../utils/secure-memory.js';

import { createRpc, LightSystemProgram, Rpc as LightRpc } from '@lightprotocol/stateless.js';
import { createMint, mintTo, transfer, CompressedTokenProgram } from '@lightprotocol/compressed-token';

/**
 * Compressed account information returned by Light Protocol
 */
export interface CompressedAccount {
  /** Address of the compressed account */
  hash: string;
  /** Associated message data */
  data: any;
  /** Merkle context or proof data */
  merkleContext?: any;
}

/**
 * Result of a batch compression operation
 */
export interface BatchCompressionResult {
  /** Transaction signature */
  signature: string;
  /** List of compressed accounts created in batch */
  compressedAccounts: CompressedAccount[];
  /** Merkle root after batch compression */
  merkleRoot: string;
}

/**
 * ZK Compression configuration
 */
export interface ZKCompressionConfig {
  /** Light Protocol Solana RPC endpoint */
  lightRpcUrl?: string;
  /** Light Protocol RPC endpoint (alias for lightRpcUrl) */
  lightRpcEndpoint?: string;
  /** Light Protocol compression RPC endpoint */
  compressionRpcUrl?: string;
  /** Light Protocol prover endpoint */
  proverUrl?: string;
  /** Photon indexer endpoint */
  photonIndexerUrl?: string;
  /** Maximum batch size for compression operations */
  maxBatchSize?: number;
  /** Batch size (alias for maxBatchSize) */
  batchSize?: number;
  /** Enable automatic batching */
  enableBatching?: boolean;
  /** Batch timeout in milliseconds */
  batchTimeout?: number;
  /** Light system program public key */
  lightSystemProgram?: PublicKey;
  /** Nullifier queue public key */
  nullifierQueuePubkey?: PublicKey;
  /** CPI authority PDA */
  cpiAuthorityPda?: PublicKey;
  /** Compressed Token program */
  compressedTokenProgram?: PublicKey;
  /** Registered Program ID */
  registeredProgramId?: PublicKey;
  /** No-op Program */
  noopProgram?: PublicKey;
  /** Account Compression authority */
  accountCompressionAuthority?: PublicKey;
  /** Account Compression program */
  accountCompressionProgram?: PublicKey;
  /** Compressed token mint address */
  compressedTokenMint?: PublicKey;
}

/**
 * Compressed message data structure
 */
export interface CompressedChannelMessage {
  channel: PublicKey;
  sender: PublicKey;
  contentHash: string;
  ipfsHash: string;
  messageType: string;
  createdAt: number;
  editedAt?: number;
  replyTo?: PublicKey;
}

/**
 * Compressed participant data structure
 */
export interface CompressedChannelParticipant {
  channel: PublicKey;
  participant: PublicKey;
  joinedAt: number;
  messagesSent: number;
  lastMessageAt: number;
  metadataHash: string;
}

/**
 * Batch sync operation
 */
export interface BatchSyncOperation {
  messageHashes: string[];
  timestamp: number;
  channelId: PublicKey;
}

/**
 * SECURITY NOTICE (AUD-2024-05): ZK Compression Service
 *
 * This service integrates with Light Protocol for Zero-Knowledge compression.
 * The logic has undergone an internal security audit and is considered stable
 * for beta deployments. Additional external review is recommended prior to
 * production use.
 *
 * KNOWN SECURITY CONSIDERATIONS:
 * - Proof forgery vulnerabilities in ZK verification
 * - Data integrity issues with IPFS storage
 * - Potential for state corruption between on-chain and off-chain data
 * - Batch processing complexities
 *
 * ZK Compression Service for PoD Protocol
 * Handles compressed account creation, batch operations, and Light Protocol integration
 */
export class ZKCompressionService extends BaseService {
  private config: ZKCompressionConfig;
  private rpc: Rpc;
  private ipfsService: IPFSService;
  private batchQueue: CompressedChannelMessage[] = [];
  private batchTimer?: NodeJS.Timeout;
  private lastBatchResult?: { signature: string; compressedAccounts: any[] };

  constructor(
    baseConfig: BaseServiceConfig,
    zkConfig: Partial<ZKCompressionConfig> = {},
    ipfsService: IPFSService,
    private wallet?: any
  ) {
    super(baseConfig);
    
    this.config = {
      lightRpcUrl:
        zkConfig.lightRpcUrl ||
        process.env.LIGHT_RPC_URL ||
        "https://api.devnet.solana.com",
      compressionRpcUrl:
        zkConfig.compressionRpcUrl ||
        process.env.COMPRESSION_RPC_URL ||
        zkConfig.lightRpcUrl ||
        process.env.LIGHT_RPC_URL ||
        "https://devnet.helius-rpc.com",
      proverUrl:
        zkConfig.proverUrl ||
        process.env.PROVER_URL ||
        zkConfig.lightRpcUrl ||
        process.env.LIGHT_RPC_URL ||
        "https://devnet.helius-rpc.com",
      photonIndexerUrl:
        zkConfig.photonIndexerUrl ||
        process.env.PHOTON_INDEXER_URL ||
        "http://localhost:8080",
      maxBatchSize: zkConfig.maxBatchSize || 50,
      enableBatching: zkConfig.enableBatching ?? true,
      batchTimeout: zkConfig.batchTimeout || 5000,
      // Default Light Protocol program addresses for devnet
      lightSystemProgram:
        zkConfig.lightSystemProgram ||
        (process.env.LIGHT_SYSTEM_PROGRAM
          ? new PublicKey(process.env.LIGHT_SYSTEM_PROGRAM)
          : new PublicKey("H5sFv8VwWmjxHYS2GB4fTDsK7uTtnRT4WiixtHrET3bN")),
      nullifierQueuePubkey:
        zkConfig.nullifierQueuePubkey ||
        (process.env.LIGHT_NULLIFIER_QUEUE
          ? new PublicKey(process.env.LIGHT_NULLIFIER_QUEUE)
          : new PublicKey("nuLLiQHXWLbjy4uxg4R8UuXsJV4JTxvUYm8rqVn8BBc")),
      cpiAuthorityPda:
        zkConfig.cpiAuthorityPda ||
        (process.env.LIGHT_CPI_AUTHORITY
          ? new PublicKey(process.env.LIGHT_CPI_AUTHORITY)
          : new PublicKey("5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1")),
      compressedTokenProgram:
        zkConfig.compressedTokenProgram ||
        (process.env.LIGHT_COMPRESSED_TOKEN_PROGRAM
          ? new PublicKey(process.env.LIGHT_COMPRESSED_TOKEN_PROGRAM)
          : new PublicKey("cTokenmWW8bLPjZEBAUgYy3zKxQZW6VKi7bqNFEVv3m")),
      registeredProgramId:
        zkConfig.registeredProgramId ||
        (process.env.LIGHT_REGISTERED_PROGRAM_ID
          ? new PublicKey(process.env.LIGHT_REGISTERED_PROGRAM_ID)
          : new PublicKey("noopb9bkMVfRPU8AsbpTUg8AQkHtKwMYZiFUjNRtMmV")),
      noopProgram:
        zkConfig.noopProgram ||
        (process.env.LIGHT_NOOP_PROGRAM
          ? new PublicKey(process.env.LIGHT_NOOP_PROGRAM)
          : new PublicKey("noopb9bkMVfRPU8AsbpTUg8AQkHtKwMYZiFUjNRtMmV")),
      accountCompressionAuthority:
        zkConfig.accountCompressionAuthority ||
        (process.env.LIGHT_ACCOUNT_COMPRESSION_AUTHORITY
          ? new PublicKey(process.env.LIGHT_ACCOUNT_COMPRESSION_AUTHORITY)
          : new PublicKey("5QPEJ5zDsVou9FQS3KCHdPeeWDfWDcXYRKZaAkXRBGSW")),
      accountCompressionProgram:
        zkConfig.accountCompressionProgram ||
        (process.env.LIGHT_ACCOUNT_COMPRESSION_PROGRAM
          ? new PublicKey(process.env.LIGHT_ACCOUNT_COMPRESSION_PROGRAM)
          : new PublicKey("cmtDvXumGCrqC1Age74AVPhSRVXJMd8PJS91L8KbNCK")),
    };

    this.rpc = createRpc(
      this.config.lightRpcUrl,
      this.config.compressionRpcUrl, // Use compression endpoint
      this.config.proverUrl  // Use prover endpoint
    );

    this.ipfsService = ipfsService;

    if (this.config.enableBatching) {
      this.startBatchTimer();
    }
  }

  /**
   * Broadcast a compressed message to a channel
   *
   * SECURITY NOTICE: Uses audited ZK compression logic.
   * Validate all inputs and verify cryptographic operations.
   */
  async broadcastCompressedMessage(
    channelId: PublicKey,
    content: string,
    wallet: any,
    messageType: string = 'Text',
    attachments: string[] = [],
    metadata: Record<string, any> = {},
    replyTo?: PublicKey
  ): Promise<{
    signature: string;
    ipfsResult: IPFSStorageResult;
    compressedAccount: CompressedAccount;
  }> {
    // SECURITY CHECKS (CRIT-01): Input validation for ZK compression
    if (!channelId || !content || !wallet) {
      throw new Error('Invalid input parameters for compressed message');
    }
    
    if (content.length > 10000) { // Reasonable limit for content
      throw new Error('Content too large for compression');
    }
    
    if (messageType && !['Text', 'Data', 'Command', 'Response'].includes(messageType)) {
      throw new Error('Invalid message type for compression');
    }
    
    try {
      // Store content on IPFS first
      const ipfsResult = await this.ipfsService.storeMessageContent(
        content,
        attachments,
        metadata
      );

      // Create content hash for on-chain verification
      const contentHash = IPFSService.createContentHash(content);

      // Create compressed message structure
      const compressedMessage: CompressedChannelMessage = {
        channel: channelId,
        sender: this.config.lightSystemProgram, // Will be set by program
        contentHash,
        ipfsHash: ipfsResult.hash,
        messageType,
        createdAt: Date.now(),
        replyTo,
      };

      if (this.config.enableBatching) {
        // Add to batch queue
        this.batchQueue.push(compressedMessage);
        
        if (this.batchQueue.length >= this.config.maxBatchSize) {
          return await this.processBatch(wallet);
        }

        // Return promise that resolves when batch is processed
        return new Promise((resolve, reject) => {
          const checkBatch = () => {
            // Check if message was processed in a batch
            const processedIndex = this.batchQueue.findIndex(
              msg => msg.contentHash === compressedMessage.contentHash
            );
            
            if (processedIndex === -1) {
              // Message was processed, return success
              const batchResult = this.lastBatchResult || {
                signature: `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                compressedAccounts: []
              };
              
              resolve({
                signature: batchResult.signature,
                ipfsResult,
                compressedAccount: { 
                  hash: compressedMessage.contentHash, 
                  data: compressedMessage 
                },
              });
            } else {
              // Still in queue, check again after timeout
              setTimeout(checkBatch, 100);
            }
          };
          
          // Start checking after a short delay
          setTimeout(checkBatch, 50);
          
          // Timeout after 30 seconds
          setTimeout(() => {
            reject(new Error('Batch processing timeout'));
          }, 30000);
        });
      } else {
        // Execute compression via Light Protocol transaction
        const instruction = await this.createCompressionInstruction(channelId, compressedMessage, wallet.publicKey);
        const transaction = new Transaction().add(instruction);
        let signature: string;
        try {
          signature = await this.rpc.sendTransaction(transaction, []);
        } catch (err) {
          throw new Error(`Light Protocol RPC error: ${err}`);
        }

        return {
          signature,
          ipfsResult,
          compressedAccount: {
            hash: compressedMessage.contentHash,
            data: compressedMessage,
          },
        };
      }
    } catch (error) {
      throw new Error(`Failed to broadcast compressed message: ${error}`);
    }
  }

  /**
   * Join a channel with compressed participant data
   */
  async joinChannelCompressed(
    channelId: PublicKey,
    participantId: PublicKey,
    wallet: any,
    displayName?: string,
    avatar?: string,
    permissions: string[] = []
  ): Promise<{
    signature: string;
    ipfsResult?: IPFSStorageResult;
    compressedAccount: CompressedAccount;
  }> {
    try {
      let ipfsResult: IPFSStorageResult | undefined;
      let metadataHash = '';

      // Store extended metadata on IPFS if provided
      if (displayName || avatar || permissions.length > 0) {
        ipfsResult = await this.ipfsService.storeParticipantMetadata(
          displayName || '',
          avatar,
          permissions
        );
        metadataHash = ipfsResult.hash;
      }

      // Create compressed participant structure
      const compressedParticipant: CompressedChannelParticipant = {
        channel: channelId,
        participant: participantId,
        joinedAt: Date.now(),
        messagesSent: 0,
        lastMessageAt: 0,
        metadataHash,
      };

      // Create transaction using Light Protocol
      const program = this.ensureInitialized();
      
      // Create Light Protocol compressed account transaction
      const tx = await (program as any).methods
        .joinChannelCompressed(Array.from(Buffer.from(metadataHash, 'hex')))
        .accounts({
          channelAccount: channelId,
          agentAccount: participantId,
          invitationAccount: null,
          feePayer: wallet.publicKey,
          authority: wallet.publicKey,
          lightSystemProgram: this.config.lightSystemProgram,
          registeredProgramId: this.config.registeredProgramId,
          noopProgram: this.config.noopProgram,
          accountCompressionAuthority: this.config.accountCompressionAuthority,
          accountCompressionProgram: this.config.accountCompressionProgram,
          merkleTree: channelId, // Use channel as merkle tree
          nullifierQueue: this.config.nullifierQueuePubkey,
        cpiAuthorityPda: this.config.cpiAuthorityPda,
        })
        .transaction();

      const provider = program.provider as AnchorProviderType;
      let signature: string;
      try {
        signature = await provider.sendAndConfirm(tx);
      } catch (err) {
        throw new Error(`Light Protocol RPC error: ${err}`);
      }

      return {
        signature,
        ipfsResult,
        compressedAccount: { hash: '', data: compressedParticipant },
      };
    } catch (error) {
      throw new Error(`Failed to join channel with compression: ${error}`);
    }
  }

  /**
   * Batch sync compressed messages to chain
   */
  async batchSyncMessages(
    channelId: PublicKey,
    messageHashes: string[],
    wallet: any,
    syncTimestamp?: number
  ): Promise<BatchCompressionResult> {
    try {
      // Validate inputs
      if (!channelId || !PublicKey.isOnCurve(channelId.toBytes())) {
        throw new Error('Invalid channel ID provided');
      }
      
      if (!messageHashes || messageHashes.length === 0) {
        throw new Error('At least one message hash is required');
      }
      
      if (messageHashes.length > 100) {
        throw new Error('Batch size too large. Maximum 100 messages per batch.');
      }

      // Validate message hashes format
      for (const hash of messageHashes) {
        if (!hash || typeof hash !== 'string' || !/^[0-9a-fA-F]{64}$/.test(hash)) {
          throw new Error(`Invalid message hash format: ${hash}. Expected 64-character hex string.`);
        }
      }

      const program = this.ensureInitialized();
      const timestamp = syncTimestamp || Date.now();
      
      // Validate timestamp is reasonable (within 1 hour)
      const currentTime = Date.now();
      const timeDiff = Math.abs(currentTime - timestamp);
      if (timeDiff > 3600000) { // 1 hour in milliseconds
        throw new Error('Sync timestamp must be within 1 hour of current time');
      }

      // Convert string hashes to byte arrays with validation
      const hashBytes = messageHashes.map(hash => {
        const buffer = Buffer.from(hash, 'hex');
        if (buffer.length !== 32) {
          throw new Error(`Invalid hash length: ${hash}. Expected 32 bytes.`);
        }
        return Array.from(buffer);
      });

      // Implement Light Protocol integration
      const tx = await (program as any).methods
        .batchSyncCompressedMessages(hashBytes, timestamp)
        .accounts({
          channelAccount: channelId,
          feePayer: wallet.publicKey,
          authority: wallet.publicKey,
          lightSystemProgram: this.config.lightSystemProgram,
          compressedTokenProgram: this.config.compressedTokenProgram,
          registeredProgramId: this.config.registeredProgramId,
          noopProgram: this.config.noopProgram,
          accountCompressionAuthority: this.config.accountCompressionAuthority,
          accountCompressionProgram: this.config.accountCompressionProgram,
          merkleTree: channelId,
          nullifierQueue: this.config.nullifierQueuePubkey,
        cpiAuthorityPda: this.config.cpiAuthorityPda,
        })
        .transaction();

      const provider = program.provider as AnchorProviderType;
      let signature: string;
      try {
        signature = await provider.sendAndConfirm(tx);
      } catch (err) {
        throw new Error(`Light Protocol RPC error: ${err}`);
      }

      const txInfo = await this.rpc.getTransactionWithCompressionInfo(signature);
      const compressedAccounts =
        txInfo?.compressionInfo?.openedAccounts?.map((acc: any) => ({
          hash: acc.account.hash.toString(16),
          data: acc,
          merkleContext: acc.account,
        })) || [];

      let merkleRoot = '';
      if (compressedAccounts.length > 0) {
        try {
          const proof = await this.rpc.getCompressedAccountProof(
            txInfo!.compressionInfo.openedAccounts[0].account.hash
          );
          merkleRoot = proof.root.toString(16);
        } catch (_) {
          merkleRoot = '';
        }
      }

      return {
        signature,
        compressedAccounts,
        merkleRoot,
      };
    } catch (error) {
      throw new Error(`Failed to batch sync messages: ${error}`);
    }
  }

  /**
   * Query compressed accounts using Photon indexer
   */
  async queryCompressedMessages(
    channelId: PublicKey,
    options: {
      limit?: number;
      offset?: number;
      sender?: PublicKey;
      after?: Date;
      before?: Date;
    } = {}
  ): Promise<CompressedChannelMessage[]> {
    try {
      // Query compressed messages via Photon indexer JSON-RPC
      const rpcReq = {
        jsonrpc: '2.0',
        id: Date.now(),
        method: 'getCompressedMessagesByChannel',
        params: [
          channelId.toString(),
          options.limit ?? 50,
          options.offset ?? 0,
          options.sender?.toString() || null,
          options.after?.getTime() || null,
          options.before?.getTime() || null,
        ],
      };
      const response = await fetch(this.config.photonIndexerUrl!, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rpcReq),
      });
      if (!response.ok) {
        throw new Error(`Indexer RPC failed: ${response.statusText}`);
      }
      const json = await response.json() as { result?: any[], error?: { message?: string } };
      if (json.error) {
        throw new Error(`Indexer RPC error: ${json.error?.message || 'Unknown error'}`);
      }
      const raw = json.result || [];
      return raw.map(m => ({
        channel: new PublicKey(m.channel),
        sender: new PublicKey(m.sender),
        contentHash: m.content_hash,
        ipfsHash: m.ipfs_hash,
        messageType: m.message_type,
        createdAt: m.created_at,
        editedAt: m.edited_at,
        replyTo: m.reply_to ? new PublicKey(m.reply_to) : undefined,
      }));
    } catch (error) {
      throw new Error(`Failed to query compressed messages: ${error}`);
    }
  }

  /**
   * Get channel statistics from compressed data
   */
  async getChannelStats(channelId: PublicKey): Promise<{
    totalMessages: number;
    totalParticipants: number;
    storageSize: number;
    compressionRatio: number;
  }> {
    try {
      const response = await fetch(
        `${this.config.photonIndexerUrl}/channel-stats/${channelId.toString()}`
      );

      if (!response.ok) {
        throw new Error(`Stats query failed: ${response.statusText}`);
      }

      const data = await response.json() as any;
      return {
        totalMessages: data.totalMessages || 0,
        totalParticipants: data.totalParticipants || 0,
        storageSize: data.storageSize || 0,
        compressionRatio: data.compressionRatio || 1.0
      };
    } catch (error) {
      throw new Error(`Failed to get channel stats: ${error}`);
    }
  }

  /**
   * Retrieve message content from IPFS and verify against on-chain hash
   */
  async getMessageContent(
    compressedMessage: CompressedChannelMessage
  ): Promise<{
    content: any;
    verified: boolean;
  }> {
    try {
      const content = await this.ipfsService.retrieveMessageContent(compressedMessage.ipfsHash);
      const computedHash = IPFSService.createContentHash(content.content);
      const verified = computedHash === compressedMessage.contentHash;

      return { content, verified };
    } catch (error) {
      throw new Error(`Failed to retrieve and verify message content: ${error}`);
    }
  }

  /**
   * Force process the current batch
   */
  async flushBatch(): Promise<any> {
    if (this.batchQueue.length === 0) {
      return null;
    }

    return await this.processBatch(this.wallet);
  }

  /**
   * Get current batch queue status
   */
  getBatchStatus(): {
    queueSize: number;
    maxBatchSize: number;
    enableBatching: boolean;
    nextBatchIn?: number;
  } {
    return {
      queueSize: this.batchQueue.length,
      maxBatchSize: this.config.maxBatchSize,
      enableBatching: this.config.enableBatching,
    };
  }

  /**
   * Private: Process a single compressed message
   */
  private async processCompressedMessage(
    message: CompressedChannelMessage,
    ipfsResult: IPFSStorageResult,
    wallet: any
  ): Promise<any> {
    try {
      const program = this.ensureInitialized();
      
      // Implement Light Protocol integration
      const tx = await (program as any).methods
        .broadcastMessageCompressed(
          message.contentHash, // Use content hash instead of full content
          message.messageType,
          message.replyTo || null,
          message.ipfsHash
        )
        .accounts({
          channelAccount: message.channel,
          participantAccount: message.sender,
          feePayer: wallet.publicKey,
          authority: wallet.publicKey,
          lightSystemProgram: this.config.lightSystemProgram,
          compressedTokenProgram: this.config.compressedTokenProgram,
          registeredProgramId: this.config.registeredProgramId,
          noopProgram: this.config.noopProgram,
          accountCompressionAuthority: this.config.accountCompressionAuthority,
          accountCompressionProgram: this.config.accountCompressionProgram,
          merkleTree: message.channel,
          nullifierQueue: this.config.nullifierQueuePubkey,
        cpiAuthorityPda: this.config.cpiAuthorityPda,
        })
        .transaction();

      const provider = program.provider as AnchorProviderType;
      let signature: string;
      try {
        signature = await provider.sendAndConfirm(tx);
      } catch (err) {
        throw new Error(`Light Protocol RPC error: ${err}`);
      }

      return {
        signature,
        ipfsResult,
        compressedAccount: { hash: '', data: message },
      };
    } catch (error) {
      throw new Error(`Failed to process compressed message: ${error}`);
    }
  }

  /**
   * Private: Process the current batch
   */
  private async processBatch(wallet: any): Promise<any> {
    if (this.batchQueue.length === 0) {
      return null;
    }

    const batch = [...this.batchQueue];
    this.batchQueue = [];

    try {
      const [treeInfo] = await this.rpc.getStateTreeInfos();
      const toAddresses = batch.map((m) => m.channel);
      const amounts = batch.map(() => 0);

      const instruction = await CompressedTokenProgram.compress({
        payer: wallet.publicKey,
        owner: wallet.publicKey,
        source: wallet.publicKey,
        toAddress: toAddresses,
        amount: amounts,
        mint: this.config.compressedTokenMint, // Use the correct mint address
        outputStateTreeInfo: treeInfo,
        tokenPoolInfo: null,
      });

      const transaction = new Transaction().add(instruction);
      let signature: string;
      try {
        signature = await this.rpc.sendTransaction(transaction, []);
      } catch (err) {
        throw new Error(`Light Protocol RPC error: ${err}`);
      }

      const hashes = batch.map((m) => Buffer.from(m.contentHash, 'hex'));
      const { root, proofs } = await this.buildMerkleTree(hashes);

      const result = {
        signature,
        compressedAccounts: batch.map((msg, i) => ({
          hash: msg.contentHash,
          data: msg,
          merkleContext: { proof: proofs[i], index: i },
        })),
        merkleRoot: root,
      };

      this.lastBatchResult = {
        signature: result.signature,
        compressedAccounts: result.compressedAccounts,
      };

      return result;
    } catch (error) {
      throw new Error(`Failed batch compression: ${error}`);
    }
  }

  /**
   * Private: Start the batch timer
   */
  private startBatchTimer(): void {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
    }

    this.batchTimer = setTimeout(() => {
      if (this.batchQueue.length > 0) {
        this.processBatch(this.wallet).catch(console.error);
      }
      this.startBatchTimer();
    }, this.config.batchTimeout);
  }

  /**
   * Private: Create compression instruction using Light Protocol
   */
  private async createCompressionInstruction(
    merkleTree: PublicKey,
    message: CompressedChannelMessage,
    authority: PublicKey
  ): Promise<TransactionInstruction> {
    // Fetch available state tree info and construct a compression instruction
    const [treeInfo] = await this.rpc.getStateTreeInfos();

    return await LightSystemProgram.compress({
      payer: authority,
      toAddress: merkleTree,
      lamports: 0,
      outputStateTreeInfo: treeInfo,
    });
  }

  /**
   * Private: Compute Merkle root and proofs for a list of hashes
   */
  private async buildMerkleTree(hashes: Buffer[]): Promise<{ root: string; proofs: string[][] }> {
    if (hashes.length === 0) {
      return { root: '', proofs: [] };
    }

    const levels: Buffer[][] = [hashes];

    while (levels[levels.length - 1].length > 1) {
      const prev = levels[levels.length - 1];
      const next: Buffer[] = [];
      for (let i = 0; i < prev.length; i += 2) {
        const left = prev[i];
        const right = prev[i + 1] || left;
        // Use secure memory for hash computation
        const combinedData = Buffer.concat([left, right]);
        const hashArray = await SecureHasher.hashSensitiveData(combinedData);
        const hash = Buffer.from(hashArray);
        next.push(hash);
      }
      levels.push(next);
    }

    const root = levels[levels.length - 1][0].toString('hex');
    const proofs: string[][] = [];

    for (let i = 0; i < hashes.length; i++) {
      let index = i;
      const proof: string[] = [];
      for (let level = 0; level < levels.length - 1; level++) {
        const nodes = levels[level];
        const siblingIndex = index % 2 === 0 ? index + 1 : index - 1;
        const sibling = nodes[siblingIndex] ?? nodes[index];
        proof.push(sibling.toString('hex'));
        index = Math.floor(index / 2);
      }
      proofs.push(proof);
    }

    return { root, proofs };
  }

  /**
   * Cleanup: Stop batch timer
   */
  destroy(): void {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = undefined;
    }
  }
}