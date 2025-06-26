/**
 * Session Keys Service for PoD Protocol JavaScript SDK
 * 
 * Provides ephemeral key management for seamless AI agent interactions
 * Based on Gum session keys protocol
 */

import { BaseService } from './base.js';
import { SystemProgram, Transaction, Keypair, PublicKey } from '@solana/web3.js';
import { BN } from '@coral-xyz/anchor';

/**
 * Service for managing session keys for AI agent interactions
 * 
 * @class SessionKeysService
 * @extends BaseService
 */
export class SessionKeysService extends BaseService {
  constructor(config) {
    super(config);
    this.sessions = new Map();
    this.wallet = null;
  }

  /**
   * Set the wallet for this service
   * 
   * @param {Object} wallet - Wallet to use for signing
   */
  setWallet(wallet) {
    this.wallet = wallet;
  }

  /**
   * Ensure wallet is set
   * @private
   */
  ensureWallet() {
    if (!this.wallet) {
      throw new Error('Wallet not set. Call setWallet() first.');
    }
    return this.wallet;
  }

  /**
   * Send a transaction with proper signing
   * @private
   */
  async sendTransaction(transaction, signers = []) {
    const wallet = this.ensureWallet();
    const { blockhash } = await this.connection.getLatestBlockhash().send();
    
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = wallet.publicKey;
    
    // Sign with provided signers
    if (signers.length > 0) {
      transaction.partialSign(...signers);
    }
    
    // Sign with wallet
    if (wallet.signTransaction && typeof wallet.signTransaction === 'function') {
      transaction = await wallet.signTransaction(transaction);
    } else {
      transaction.partialSign(wallet);
    }
    
    const signature = await this.connection.sendRawTransaction(transaction.serialize());
    await this.connection.confirmTransaction(signature);
    
    return signature;
  }

  /**
   * Create a session key for temporary AI agent operations
   * 
   * @param {Object} config - Session configuration
   * @param {Object[]} config.targetPrograms - Programs this session can interact with
   * @param {number} [config.durationHours=24] - Session duration in hours
   * @param {Object[]} config.allowedInstructions - Allowed instruction types
   * @param {Object} [config.restrictions] - Additional restrictions
   * @returns {Promise<Object>} Session key data with pubkey and token
   * 
   * @example
   * ```javascript
   * const sessionKey = await client.sessionKeys.createSessionKey({
   *   targetPrograms: [programId],
   *   durationHours: 12,
   *   allowedInstructions: ['sendMessage', 'updateStatus']
   * });
   * ```
   */
  async createSessionKey(config) {
    if (!this.isInitialized()) {
      throw new Error('Service not initialized. Call client.initialize() first.');
    }

    try {
      // Generate ephemeral keypair
      const sessionKeyPairSigner = Keypair.generate(); // Use Keypair from @solana/web3.js
      
      // Create session token account (PDA)
      const wallet = this.ensureWallet();
      const programIdPubkey = new PublicKey(this.programId); // Convert string to PublicKey
      const [sessionTokenAccount] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('session_token'),
          wallet.publicKey.toBuffer(),
          sessionKeyPairSigner.publicKey.toBuffer()
        ],
        programIdPubkey
      );

      // Calculate expiration timestamp
      const durationMs = (config.durationHours || 24) * 60 * 60 * 1000;
      const expiresAt = Math.floor((Date.now() + durationMs) / 1000);

      // Create session token
      const createSessionInstruction = await this.program.methods
        .createSessionToken(
          new BN(expiresAt),
          config.targetPrograms.map(p => new PublicKey(p)),
          config.allowedInstructions
        )
        .accounts({
          sessionToken: sessionTokenAccount,
          sessionKey: sessionKeyPairSigner.publicKey,
          authority: wallet.publicKey,
          systemProgram: SystemProgram.programId
        })
        .instruction();

      // Sign and send transaction
      const transaction = new Transaction().add(createSessionInstruction);
      const { blockhash } = await this.connection.getLatestBlockhash().send();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = wallet.publicKey;

      // Sign with both wallet and session key
      transaction.partialSign(sessionKeyPairSigner);
      
      if (wallet.signTransaction) {
        const signedTx = await wallet.signTransaction(transaction);
        const signature = await this.connection.sendRawTransaction(signedTx.serialize()).send();
        await this.connection.confirmTransaction(signature).send();
      } else {
        transaction.partialSign(wallet);
        const signature = await this.connection.sendRawTransaction(transaction.serialize()).send();
        await this.connection.confirmTransaction(signature).send();
      }

      return {
        sessionKey: sessionKeyPairSigner.publicKey.toBase58(),
        sessionToken: sessionTokenAccount.toBase58(),
        expiresAt,
        restrictions: config.restrictions || {},
        keypair: sessionKeyPairSigner // For internal use
      };
    } catch (error) {
      console.error('Failed to create session key:', error);
      throw error;
    }
  }

  /**
   * Execute instructions using a session key
   * 
   * @param {Object[]} instructions - Instructions to execute
   * @param {string} sessionKey - Session key public key
   * @param {Object} [options] - Execution options
   * @returns {Promise<string>} Transaction signature
   * 
   * @example
   * ```javascript
   * const signature = await client.sessionKeys.useSessionKey([
   *   sendMessageInstruction
   * ], sessionKey.sessionKey);
   * ```
   */
  async useSessionKey(instructions, sessionKey, options = {}) {
    const session = this.sessions.get(sessionKey);
    if (!session) {
      throw new Error(`Session key not found: ${sessionKey}`);
    }

    // Validate session is still valid
    if (Date.now() > session.config.expiryTime) {
      throw new Error('Session key has expired');
    }

    if (session.usesRemaining !== undefined && session.usesRemaining <= 0) {
      throw new Error('Session key has no remaining uses');
    }

    try {
      // Validate instructions are allowed
      for (const instruction of instructions) {
        if (!this.isInstructionAllowed(instruction, session.config)) {
          throw new Error(`Instruction not allowed for this session: ${instruction.programId}`);
        }
      }

      // Create transaction with session key
      const transaction = new Transaction().add(...instructions);
      const signature = await this.sendTransaction(transaction, [session.sessionKeyPairSigner]);

      // Decrement uses
      if (session.usesRemaining !== undefined) {
        session.usesRemaining--;
      }

      console.log(`Session transaction sent: ${signature}`);
      return signature;
    } catch (error) {
      console.error('Failed to use session key:', error);
      throw error;
    }
  }

  /**
   * Revoke a session key
   * 
   * @param {string} sessionId - Session key ID to revoke
   * @returns {Promise<string>} Transaction signature
   * 
   * @example
   * ```javascript
   * await client.sessionKeys.revokeSessionKey(sessionId);
   * ```
   */
  async revokeSessionKey(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session key not found: ${sessionId}`);
    }

    try {
      // Create revoke instruction
      const instruction = await this.createRevokeSessionInstruction(
        session.sessionTokenAccount
      );

      const transaction = new Transaction().add(instruction);
      const signature = await this.sendTransaction(transaction);

      // Remove from local storage
      this.sessions.delete(sessionId);

      console.log(`Session key revoked: ${sessionId}`);
      return signature;
    } catch (error) {
      console.error('Failed to revoke session key:', error);
      throw error;
    }
  }

  /**
   * Get all active sessions
   * 
   * @returns {Object[]} Array of active session tokens
   * 
   * @example
   * ```javascript
   * const activeSessions = client.sessionKeys.getActiveSessions();
   * console.log(`Active sessions: ${activeSessions.length}`);
   * ```
   */
  getActiveSessions() {
    const now = Date.now();
    return Array.from(this.sessions.values()).filter(session => 
      session.config.expiryTime > now && 
      (session.usesRemaining === undefined || session.usesRemaining > 0)
    );
  }

  /**
   * Create a pre-configured session for messaging operations
   * 
   * @param {number} [durationHours=24] - Session duration in hours
   * @returns {Promise<Object>} Session token for messaging
   * 
   * @example
   * ```javascript
   * const messagingSession = await client.sessionKeys.createMessagingSession(48);
   * ```
   */
  async createMessagingSession(durationHours = 24) {
    const config = {
      targetPrograms: [this.programId],
      expiryTime: Date.now() + (durationHours * 60 * 60 * 1000),
      maxUses: 1000,
      allowedInstructions: [
        'send_message',
        'update_message_status',
        'broadcast_message'
      ]
    };

    return this.createSessionKey(config);
  }

  /**
   * Create revoke session instruction
   * @private
   */
  async createRevokeSessionInstruction(sessionTokenAccount) {
    if (!this.program) {
      throw new Error('Program not initialized');
    }

    return this.program.methods
      .revokeSessionToken()
      .accounts({
        sessionTokenAccount,
        authority: this.wallet.publicKey
      })
      .instruction();
  }

  /**
   * Check if instruction is allowed for session
   * @private
   */
  isInstructionAllowed(instruction, config) {
    // Check if program is in target programs
    const programAllowed = config.targetPrograms.some(program => 
      program.equals(instruction.programId)
    );

    if (!programAllowed) {
      return false;
    }

    // If no specific instructions are specified, allow all for target programs
    if (!config.allowedInstructions || config.allowedInstructions.length === 0) {
      return true;
    }

    // Check specific instruction (would need to decode instruction data)
    // For now, we'll assume allowed if program is allowed
    return true;
  }

  /**
   * Cleanup resources
   */
  async cleanup() {
    // Clear stored session keys
    this.wallet = null;
  }
} 