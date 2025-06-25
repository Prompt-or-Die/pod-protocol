/**
 * Session Keys Service for PoD Protocol
 * 
 * Provides ephemeral key management for seamless AI agent interactions
 * Based on Gum session keys protocol
 */

import { Connection, Keypair, PublicKey, Transaction, TransactionInstruction, Signer } from '@solana/web3.js';
import { BaseService, BaseServiceConfig } from './base.js';

export interface SessionKeyConfig {
  /** Target programs this session key can interact with */
  targetPrograms: PublicKey[];
  /** Session expiry timestamp */
  expiryTime: number;
  /** Maximum number of uses for this session */
  maxUses?: number;
  /** Allowed instruction types */
  allowedInstructions?: string[];
}

export interface SessionToken {
  /** Ephemeral keypair for this session */
  sessionKeypair: Keypair;
  /** Session configuration */
  config: SessionKeyConfig;
  /** Session token account address */
  sessionTokenAccount: PublicKey;
  /** Number of uses remaining */
  usesRemaining?: number;
}

export class SessionKeysService extends BaseService {
  private sessions: Map<string, SessionToken> = new Map();
  private wallet: any = null;

  constructor(config: BaseServiceConfig) {
    super(config);
  }

  setWallet(wallet: any): void {
    this.wallet = wallet;
  }

  private ensureWallet(): any {
    if (!this.wallet) {
      throw new Error('Wallet not set. Call setWallet() first.');
    }
    return this.wallet;
  }

  private async sendTransaction(transaction: Transaction, signers: Keypair[] = []): Promise<string> {
    const wallet = this.ensureWallet();
    const { blockhash } = await this.connection.getLatestBlockhash();
    
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = wallet.publicKey;
    
    // Sign with provided signers
    if (signers.length > 0) {
      transaction.partialSign(...signers);
    }
    
    // Sign with wallet
    if ('signTransaction' in wallet && typeof wallet.signTransaction === 'function') {
      transaction = await wallet.signTransaction(transaction);
    } else {
      transaction.partialSign(wallet as Keypair);
    }
    
    const signature = await this.connection.sendRawTransaction(transaction.serialize());
    await this.connection.confirmTransaction(signature);
    
    return signature;
  }

  /**
   * Create a new session key for AI agent interactions
   */
  async createSessionKey(config: SessionKeyConfig): Promise<SessionToken> {
    try {
      // Generate ephemeral keypair
      const sessionKeypair = Keypair.generate();
      
      // Create session token account (PDA)
      const wallet = this.ensureWallet();
      const [sessionTokenAccount] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('session_token'),
          wallet.publicKey.toBuffer(),
          sessionKeypair.publicKey.toBuffer(),
        ],
        this.programId
      );

      // Create session token instruction
      const instruction = await this.createSessionTokenInstruction(
        sessionKeypair.publicKey,
        sessionTokenAccount,
        config
      );

      // Create and send transaction
      const transaction = new Transaction().add(instruction);
      const signature = await this.sendTransaction(transaction, [sessionKeypair]);

      const sessionToken: SessionToken = {
        sessionKeypair,
        config,
        sessionTokenAccount,
        usesRemaining: config.maxUses,
      };

      // Store session locally
      const sessionId = sessionKeypair.publicKey.toBase58();
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
   */
  async useSessionKey(
    sessionId: string, 
    instructions: TransactionInstruction[]
  ): Promise<string> {
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
          throw new Error(`Instruction not allowed for this session: ${instruction.programId.toBase58()}`);
        }
      }

      // Create transaction with session key
      const transaction = new Transaction().add(...instructions);
      const signature = await this.sendTransaction(transaction, [session.sessionKeypair]);

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
   */
  async revokeSessionKey(sessionId: string): Promise<string> {
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
   * Get all active sessions for current wallet
   */
  getActiveSessions(): SessionToken[] {
    const now = Date.now();
    return Array.from(this.sessions.values()).filter(
      session => session.config.expiryTime > now
    );
  }

  /**
   * Create session for AI agent messaging (convenience method)
   */
  async createMessagingSession(durationHours: number = 24): Promise<SessionToken> {
    const config: SessionKeyConfig = {
      targetPrograms: [this.programId], // PoD Protocol program
      expiryTime: Date.now() + (durationHours * 60 * 60 * 1000),
      maxUses: 1000, // Generous limit for AI messaging
      allowedInstructions: [
        'send_message',
        'broadcast_message',
        'join_channel',
        'leave_channel'
      ]
    };

    return this.createSessionKey(config);
  }

  private async createSessionTokenInstruction(
    sessionPublicKey: PublicKey,
    sessionTokenAccount: PublicKey,
    config: SessionKeyConfig
  ): Promise<TransactionInstruction> {
    // This would create the actual session token instruction
    // For now, return a placeholder instruction
    const wallet = this.ensureWallet();
    return new TransactionInstruction({
      keys: [
        { pubkey: wallet.publicKey, isSigner: true, isWritable: false },
        { pubkey: sessionTokenAccount, isSigner: false, isWritable: true },
        { pubkey: sessionPublicKey, isSigner: true, isWritable: false },
      ],
      programId: this.programId,
      data: Buffer.from([0]), // Placeholder instruction data
    });
  }

  private async createRevokeSessionInstruction(
    sessionTokenAccount: PublicKey
  ): Promise<TransactionInstruction> {
    const wallet = this.ensureWallet();
    return new TransactionInstruction({
      keys: [
        { pubkey: wallet.publicKey, isSigner: true, isWritable: false },
        { pubkey: sessionTokenAccount, isSigner: false, isWritable: true },
      ],
      programId: this.programId,
      data: Buffer.from([1]), // Placeholder instruction data
    });
  }

  private isInstructionAllowed(
    instruction: TransactionInstruction,
    config: SessionKeyConfig
  ): boolean {
    // Check if program is allowed
    const programAllowed = config.targetPrograms.some(
      program => program.equals(instruction.programId)
    );

    if (!programAllowed) {
      return false;
    }

    // If no specific instructions are specified, allow all for the program
    if (!config.allowedInstructions || config.allowedInstructions.length === 0) {
      return true;
    }

    // For a real implementation, you'd decode the instruction data
    // and check against allowed instruction types
    return true;
  }
}