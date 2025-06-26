/**
 * Session Keys Service for PoD Protocol JavaScript SDK
 * 
 * Provides ephemeral key management for seamless AI agent interactions
 * Based on Gum session keys protocol
 */

import { address } from '@solana/addresses';
import { BaseService } from './base.js';

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
   * @param {KeyPairSigner|Wallet} wallet - Wallet to use for signing
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
   * Create a new session key for AI agent interactions
   * 
   * @param {Object} config - Session configuration
   * @param {Address[]} config.targetPrograms - Programs this session can interact with
   * @param {number} config.expiryTime - Session expiry timestamp
   * @param {number} [config.maxUses] - Maximum number of uses
   * @param {string[]} [config.allowedInstructions] - Allowed instruction types
   * @returns {Promise<Object>} Session token object
   * 
   * @example
   * ```javascript
   * const session = await client.sessionKeys.createSessionKey({
   *   targetPrograms: [PROGRAM_ID],
   *   expiryTime: Date.now() + (24 * 60 * 60 * 1000), // 24 hours
   *   maxUses: 100
   * });
   * ```
   */
  async createSessionKey(config) {
    if (!this.isInitialized()) {
      throw new Error('Service not initialized. Call client.initialize() first.');
    }

    try {
      // Generate ephemeral keypair
      const sessionKeyPairSigner = KeyPairSigner.generate();
      
      // Create session token account (PDA)
      const wallet = this.ensureWallet();
      const [sessionTokenAccount] = Address.findProgramAddressSync(
        [
          Buffer.from('session_token'),
          wallet.publicKey.toBuffer(),
          sessionKeyPairSigner.publicKey.toBuffer(),
        ],
        this.programId
      );

      // Create session token instruction
      const instruction = await this.createSessionTokenInstruction(
        sessionKeyPairSigner.publicKey,
        sessionTokenAccount,
        config
      );

      // Create and send transaction
      const transaction = new Transaction().add(instruction);
      const signature = await this.sendTransaction(transaction, [sessionKeyPairSigner]);

      const sessionToken = {
        sessionKeyPairSigner,
        config,
        sessionTokenAccount,
        usesRemaining: config.maxUses,
      };

      // Store session locally
      const sessionId = sessionKeyPairSigner.publicKey;
      this.sessions.set(sessionId, sessionToken);

      console.log(`Session key created: ${sessionId}`);
      console.log(`Transaction: ${signature}`);

      return sessionToken;
    } catch (error) {
      console.error('Failed to create session key:', error);
      throw error;
    }
  }

  /**
   * Use a session key to sign a transaction
   * 
   * @param {string} sessionId - Session key ID
   * @param {TransactionInstruction[]} instructions - Instructions to execute
   * @returns {Promise<string>} Transaction signature
   * 
   * @example
   * ```javascript
   * const signature = await client.sessionKeys.useSessionKey(
   *   sessionId, 
   *   [sendMessageInstruction]
   * );
   * ```
   */
  async useSessionKey(sessionId, instructions) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session key not found: ${sessionId}`);
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
   * Create session token instruction
   * @private
   */
  async createSessionTokenInstruction(sessionAddress, sessionTokenAccount, config) {
    if (!this.program) {
      throw new Error('Program not initialized');
    }

    return this.program.methods
      .createSessionToken(
        config.targetPrograms,
        config.expiryTime,
        config.maxUses || null,
        config.allowedInstructions || null
      )
      .accounts({
        sessionTokenAccount,
        sessionKey: sessionAddress,
        authority: this.wallet.publicKey,
        systemProgram: SystemProgram.programId
      })
      .instruction();
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
   * Clean up expired sessions
   */
  cleanup() {
    const now = Date.now();
    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.config.expiryTime <= now || 
          (session.usesRemaining !== undefined && session.usesRemaining <= 0)) {
        this.sessions.delete(sessionId);
      }
    }
  }
} 