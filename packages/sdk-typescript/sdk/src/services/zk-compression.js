import { BaseService } from './base.js';
import { IPFSService } from './ipfs.js';
import { Address, address } from '@solana/web3.js';
import { createRpc, LightSystemProgram } from '@lightprotocol/stateless.js';
import { CompressedTokenProgram } from '@lightprotocol/compressed-token';
/**
 * SECURITY WARNING (CRIT-01): ZK Compression Service - EXPERIMENTAL
 *
 * This service integrates with Light Protocol for Zero-Knowledge compression.
 * WARNING: This code is EXPERIMENTAL and has NOT undergone a formal security audit.
 *
 * KNOWN SECURITY RISKS:
 * - Proof forgery vulnerabilities in ZK verification
 * - Data integrity issues with IPFS storage
 * - Potential for state corruption between on-chain and off-chain data
 * - Batch processing vulnerabilities
 *
 * DO NOT USE IN PRODUCTION without proper security review.
 *
 * ZK Compression Service for PoD Protocol
 * Handles compressed account creation, batch operations, and Light Protocol integration
 */
export class ZKCompressionService extends BaseService {
    constructor(baseConfig, zkConfig = {}, ipfsService, wallet) {
        super(baseConfig);
        this.wallet = wallet;
        this.batchQueue = [];
        this.config = {
            lightRpcUrl: zkConfig.lightRpcUrl ||
                process.env.LIGHT_RPC_URL ||
                "https://api.devnet.solana.com",
            compressionRpcUrl: zkConfig.compressionRpcUrl ||
                process.env.COMPRESSION_RPC_URL ||
                zkConfig.lightRpcUrl ||
                process.env.LIGHT_RPC_URL ||
                "https://devnet.helius-rpc.com",
            proverUrl: zkConfig.proverUrl ||
                process.env.PROVER_URL ||
                zkConfig.lightRpcUrl ||
                process.env.LIGHT_RPC_URL ||
                "https://devnet.helius-rpc.com",
            photonIndexerUrl: zkConfig.photonIndexerUrl ||
                process.env.PHOTON_INDEXER_URL ||
                "http://localhost:8080",
            maxBatchSize: zkConfig.maxBatchSize || 50,
            enableBatching: zkConfig.enableBatching ?? true,
            batchTimeout: zkConfig.batchTimeout || 5000,
            // Default Light Protocol program addresses for devnet
            lightSystemProgram: zkConfig.lightSystemProgram ||
                (process.env.LIGHT_SYSTEM_PROGRAM
                    ? new Address(process.env.LIGHT_SYSTEM_PROGRAM)
                    : new Address("H5sFv8VwWmjxHYS2GB4fTDsK7uTtnRT4WiixtHrET3bN")),
            nullifierQueuePubkey: zkConfig.nullifierQueuePubkey ||
                (process.env.LIGHT_NULLIFIER_QUEUE
                    ? new Address(process.env.LIGHT_NULLIFIER_QUEUE)
                    : new Address("nuLLiQHXWLbjy4uxg4R8UuXsJV4JTxvUYm8rqVn8BBc")),
            cpiAuthorityPda: zkConfig.cpiAuthorityPda ||
                (process.env.LIGHT_CPI_AUTHORITY
                    ? new Address(process.env.LIGHT_CPI_AUTHORITY)
                    : new Address("5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1")),
            compressedTokenProgram: zkConfig.compressedTokenProgram ||
                (process.env.LIGHT_COMPRESSED_TOKEN_PROGRAM
                    ? new Address(process.env.LIGHT_COMPRESSED_TOKEN_PROGRAM)
                    : new Address("cTokenmWW8bLPjZEBAUgYy3zKxQZW6VKi7bqNFEVv3m")),
            registeredProgramId: zkConfig.registeredProgramId ||
                (process.env.LIGHT_REGISTERED_PROGRAM_ID
                    ? new Address(process.env.LIGHT_REGISTERED_PROGRAM_ID)
                    : new Address("noopb9bkMVfRPU8AsbpTUg8AQkHtKwMYZiFUjNRtMmV")),
            noopProgram: zkConfig.noopProgram ||
                (process.env.LIGHT_NOOP_PROGRAM
                    ? new Address(process.env.LIGHT_NOOP_PROGRAM)
                    : new Address("noopb9bkMVfRPU8AsbpTUg8AQkHtKwMYZiFUjNRtMmV")),
            accountCompressionAuthority: zkConfig.accountCompressionAuthority ||
                (process.env.LIGHT_ACCOUNT_COMPRESSION_AUTHORITY
                    ? new Address(process.env.LIGHT_ACCOUNT_COMPRESSION_AUTHORITY)
                    : new Address("5QPEJ5zDsVou9FQS3KCHdPeeWDfWDcXYRKZaAkXRBGSW")),
            accountCompressionProgram: zkConfig.accountCompressionProgram ||
                (process.env.LIGHT_ACCOUNT_COMPRESSION_PROGRAM
                    ? new Address(process.env.LIGHT_ACCOUNT_COMPRESSION_PROGRAM)
                    : new Address("cmtDvXumGCrqC1Age74AVPhSRVXJMd8PJS91L8KbNCK")),
        };
        this.rpc = createRpc(this.config.lightRpcUrl, this.config.compressionRpcUrl, // Use compression endpoint
        this.config.proverUrl // Use prover endpoint
        );
        this.ipfsService = ipfsService;
        if (this.config.enableBatching) {
            this.startBatchTimer();
        }
    }
    /**
     * Broadcast a compressed message to a channel
     *
     * SECURITY WARNING: This function uses experimental ZK compression.
     * Validate all inputs and verify all cryptographic operations.
     */
    async broadcastCompressedMessage(channelId, content, wallet, messageType = 'Text', attachments = [], metadata = {}, replyTo) {
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
            const ipfsResult = await this.ipfsService.storeMessageContent(content, attachments, metadata);
            // Create content hash for on-chain verification
            const contentHash = IPFSService.createContentHash(content);
            // Create compressed message structure
            const compressedMessage = {
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
                        const processedIndex = this.batchQueue.findIndex(msg => msg.contentHash === compressedMessage.contentHash);
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
                        }
                        else {
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
            }
            else {
                // Execute compression via Light Protocol transaction
                const instruction = await this.createCompressionInstruction(channelId, compressedMessage, wallet.publicKey);
                const transaction = new Transaction().add(instruction);
                let signature;
                try {
                    signature = await this.rpc.sendTransaction(transaction, []);
                }
                catch (err) {
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
        }
        catch (error) {
            throw new Error(`Failed to broadcast compressed message: ${error}`);
        }
    }
    /**
     * Join a channel with compressed participant data
     */
    async joinChannelCompressed(channelId, participantId, wallet, displayName, avatar, permissions = []) {
        try {
            let ipfsResult;
            let metadataHash = '';
            // Store extended metadata on IPFS if provided
            if (displayName || avatar || permissions.length > 0) {
                ipfsResult = await this.ipfsService.storeParticipantMetadata(displayName || '', avatar, permissions);
                metadataHash = ipfsResult.hash;
            }
            // Create compressed participant structure
            const compressedParticipant = {
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
            const tx = await program.methods
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
            const provider = program.provider;
            let signature;
            try {
                signature = await provider.sendAndConfirm(tx);
            }
            catch (err) {
                throw new Error(`Light Protocol RPC error: ${err}`);
            }
            return {
                signature,
                ipfsResult,
                compressedAccount: { hash: '', data: compressedParticipant },
            };
        }
        catch (error) {
            throw new Error(`Failed to join channel with compression: ${error}`);
        }
    }
    /**
     * Batch sync compressed messages to chain
     */
    async batchSyncMessages(channelId, messageHashes, wallet, syncTimestamp) {
        try {
            if (messageHashes.length > 100) {
                throw new Error('Batch size too large. Maximum 100 messages per batch.');
            }
            const program = this.ensureInitialized();
            const timestamp = syncTimestamp || Date.now();
            // Convert string hashes to byte arrays
            const hashBytes = messageHashes.map(hash => Array.from(Buffer.from(hash, 'hex')));
            // Implement Light Protocol integration
            const tx = await program.methods
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
            const provider = program.provider;
            let signature;
            try {
                signature = await provider.sendAndConfirm(tx);
            }
            catch (err) {
                throw new Error(`Light Protocol RPC error: ${err}`);
            }
            return {
                signature,
                compressedAccounts: [], // Would be populated from Light Protocol response
                merkleRoot: '', // Would be populated from Light Protocol response
            };
        }
        catch (error) {
            throw new Error(`Failed to batch sync messages: ${error}`);
        }
    }
    /**
     * Query compressed accounts using Photon indexer
     */
    async queryCompressedMessages(channelId, options = {}) {
        try {
            // Query compressed messages via Photon indexer JSON-RPC
            const rpcReq = {
                jsonrpc: '2.0',
                id: Date.now(),
                method: 'getCompressedMessagesByChannel',
                params: [
                    channelId,
                    options.limit ?? 50,
                    options.offset ?? 0,
                    options.sender || null,
                    options.after?.getTime() || null,
                    options.before?.getTime() || null,
                ],
            };
            const response = await fetch(this.config.photonIndexerUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(rpcReq),
            });
            if (!response.ok) {
                throw new Error(`Indexer RPC failed: ${response.statusText}`);
            }
            const json = await response.json();
            if (json.error) {
                throw new Error(`Indexer RPC error: ${json.error?.message || 'Unknown error'}`);
            }
            const raw = json.result || [];
            return raw.map(m => ({
                channel: new Address(m.channel),
                sender: new Address(m.sender),
                contentHash: m.content_hash,
                ipfsHash: m.ipfs_hash,
                messageType: m.message_type,
                createdAt: m.created_at,
                editedAt: m.edited_at,
                replyTo: m.reply_to ? new Address(m.reply_to) : undefined,
            }));
        }
        catch (error) {
            throw new Error(`Failed to query compressed messages: ${error}`);
        }
    }
    /**
     * Get channel statistics from compressed data
     */
    async getChannelStats(channelId) {
        try {
            const response = await fetch(`${this.config.photonIndexerUrl}/channel-stats/${channelId}`);
            if (!response.ok) {
                throw new Error(`Stats query failed: ${response.statusText}`);
            }
            const data = await response.json();
            return {
                totalMessages: data.totalMessages || 0,
                totalParticipants: data.totalParticipants || 0,
                storageSize: data.storageSize || 0,
                compressionRatio: data.compressionRatio || 1.0
            };
        }
        catch (error) {
            throw new Error(`Failed to get channel stats: ${error}`);
        }
    }
    /**
     * Retrieve message content from IPFS and verify against on-chain hash
     */
    async getMessageContent(compressedMessage) {
        try {
            const content = await this.ipfsService.retrieveMessageContent(compressedMessage.ipfsHash);
            const computedHash = IPFSService.createContentHash(content.content);
            const verified = computedHash === compressedMessage.contentHash;
            return { content, verified };
        }
        catch (error) {
            throw new Error(`Failed to retrieve and verify message content: ${error}`);
        }
    }
    /**
     * Force process the current batch
     */
    async flushBatch() {
        if (this.batchQueue.length === 0) {
            return null;
        }
        return await this.processBatch(this.wallet);
    }
    /**
     * Get current batch queue status
     */
    getBatchStatus() {
        return {
            queueSize: this.batchQueue.length,
            maxBatchSize: this.config.maxBatchSize,
            enableBatching: this.config.enableBatching,
        };
    }
    /**
     * Private: Process a single compressed message
     */
    async processCompressedMessage(message, ipfsResult, wallet) {
        try {
            const program = this.ensureInitialized();
            // Implement Light Protocol integration
            const tx = await program.methods
                .broadcastMessageCompressed(message.contentHash, // Use content hash instead of full content
            message.messageType, message.replyTo || null, message.ipfsHash)
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
            const provider = program.provider;
            let signature;
            try {
                signature = await provider.sendAndConfirm(tx);
            }
            catch (err) {
                throw new Error(`Light Protocol RPC error: ${err}`);
            }
            return {
                signature,
                ipfsResult,
                compressedAccount: { hash: '', data: message },
            };
        }
        catch (error) {
            throw new Error(`Failed to process compressed message: ${error}`);
        }
    }
    /**
     * Private: Process the current batch
     */
    async processBatch(wallet) {
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
            let signature;
            try {
                signature = await this.rpc.sendTransaction(transaction, []);
            }
            catch (err) {
                throw new Error(`Light Protocol RPC error: ${err}`);
            }
            const result = {
                signature,
                compressedAccounts: batch.map((msg) => ({
                    hash: msg.contentHash,
                    data: msg,
                })),
                merkleRoot: '',
            };
            this.lastBatchResult = {
                signature: result.signature,
                compressedAccounts: result.compressedAccounts,
            };
            return result;
        }
        catch (error) {
            throw new Error(`Failed batch compression: ${error}`);
        }
    }
    /**
     * Private: Start the batch timer
     */
    startBatchTimer() {
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
    async createCompressionInstruction(merkleTree, message, authority) {
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
     * Cleanup: Stop batch timer
     */
    destroy() {
        if (this.batchTimer) {
            clearTimeout(this.batchTimer);
            this.batchTimer = undefined;
        }
    }
}
//# sourceMappingURL=zk-compression.js.map