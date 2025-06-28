import { address } from "@solana/addresses";
import type { Address } from "@solana/addresses";
import { generateKeyPairSigner } from "@solana/signers";
import type { KeyPairSigner } from "@solana/signers";
import { BaseService, BaseServiceConfig } from './base.js';
import { IDL } from "../pod_com";
import * as anchor from "@coral-xyz/anchor";
const { BN, web3 } = anchor;

// Define the instruction type that matches what other services expect
export interface TransactionInstruction {
  programAddress: Address;
  accounts: Array<{ address: Address; role: any }>;
  data: Uint8Array;
}

export interface SessionKeyConfig {
  /** Target programs this session key can interact with */
  targetPrograms: Address[];
  /** Session expiry timestamp */
  expiryTime: number;
  /** Maximum number of uses for this session */
  maxUses?: number;
  /** Allowed instruction types */
  allowedInstructions?: string[];
}

export interface SessionToken {
  /** Ephemeral keypair for this session */
  sessionKeyPairSigner: KeyPairSigner;
  /** Session configuration */
  config: SessionKeyConfig;
  /** Session token account address */
  sessionTokenAccount: Address;
  /** Number of uses remaining */
  usesRemaining?: number;
}

export class SessionKeysService extends BaseService {
  private sessions: Map<string, SessionToken> = new Map();
  private wallet: any = null;

  constructor(rpcUrl: string, programId: string, commitment: any) {
    super(rpcUrl, programId, commitment);
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

  private async sendTransactionWithAnchor(methodName: string, methodArgs: any[], accounts: any, signers: KeyPairSigner[] = []): Promise<string> {
    const program = this.ensureInitialized();
    
    // Build the transaction using Anchor's method chaining
    let txBuilder = (program.methods as any)[methodName](...methodArgs)
      .accounts(accounts);
    
    // Add signers if provided
    if (signers.length > 0) {
      txBuilder = txBuilder.signers(signers);
    }
    
    // Execute the transaction
    return await txBuilder.rpc({ commitment: this.commitment });
  }

  /**
   * Create a new session key for AI agent interactions
   */
  async createSessionKey(config: SessionKeyConfig): Promise<SessionToken> {
    try {
      // Generate ephemeral keypair
      const sessionKeyPairSigner = await generateKeyPairSigner();
      
      // Create session token account (PDA)
      const wallet = this.ensureWallet();
      
      // Generate session token account deterministically using PDA
      const [sessionTokenAccount] = web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from("session"),
          new web3.PublicKey(wallet.publicKey || wallet.address).toBuffer(),
          new web3.PublicKey(sessionKeyPairSigner.address).toBuffer(),
        ],
        new web3.PublicKey(this.programId)
      );
      
      const sessionTokenAccountAddr = address(sessionTokenAccount.toString());

      // Create and send session token transaction
      const signature = await this.sendTransactionWithAnchor(
        'createSession',
        [new BN(config.expiryTime), config.maxUses ? new BN(config.maxUses) : null],
        {
          sessionTokenAccount: sessionTokenAccountAddr,
          sessionKey: sessionKeyPairSigner.address,
          authority: wallet.publicKey || wallet.address,
          systemProgram: address("11111111111111111111111111111112"),
          rent: address("SysvarRent111111111111111111111111111111111"),
        },
        [sessionKeyPairSigner]
      );

      const sessionToken: SessionToken = {
        sessionKeyPairSigner,
        config,
        sessionTokenAccount: sessionTokenAccountAddr,
        usesRemaining: config.maxUses,
      };

      // Store session locally
      const sessionId = sessionKeyPairSigner.address;
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
          throw new Error(`Instruction not allowed for this session: ${instruction.programAddress}`);
        }
      }

      // Use session key to execute instructions
      const wallet = this.ensureWallet();
      const signature = await this.sendTransactionWithAnchor(
        'useSession',
        [new BN(instructions.length)],
        {
          sessionTokenAccount: session.sessionTokenAccount,
          sessionKey: session.sessionKeyPairSigner.address,
          authority: wallet.publicKey || wallet.address,
        },
        [session.sessionKeyPairSigner]
      );

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
      // Revoke session key
      const wallet = this.ensureWallet();
      const signature = await this.sendTransactionWithAnchor(
        'revokeSession',
        [],
        {
          sessionTokenAccount: session.sessionTokenAccount,
          authority: wallet.publicKey || wallet.address,
        }
      );

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
    const sessions: SessionToken[] = [];
    for (const session of this.sessions.values()) {
      if (session.config.expiryTime > now) {
        sessions.push(session);
      }
    }
    return sessions;
  }

  /**
   * Create session for AI agent messaging (convenience method)
   */
  async createMessagingSession(durationHours: number = 24): Promise<SessionToken> {
    const config: SessionKeyConfig = {
      targetPrograms: [address(this.programId)], // PoD Protocol program
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

  private isInstructionAllowed(
    instruction: TransactionInstruction,
    config: SessionKeyConfig
  ): boolean {
    // Check if the program is allowed
    const programAllowed = config.targetPrograms.some(
      program => {
        const programAddr = typeof program === 'string' ? address(program) : program;
        const instructionProgramAddr = typeof instruction.programAddress === 'string' ? address(instruction.programAddress) : instruction.programAddress;
        return programAddr === instructionProgramAddr;
      }
    );

    if (!programAllowed) {
      return false;
    }

    // If no specific instructions are specified, allow all for the program
    if (!config.allowedInstructions || config.allowedInstructions.length === 0) {
      return true;
    }

    // Decode the instruction name from the discriminator
    const instructionDiscriminator = Buffer.from(instruction.data.slice(0, 8));
    const allowedInstruction = IDL.instructions.find(ix => Buffer.from(ix.discriminator).equals(instructionDiscriminator));

    if (!allowedInstruction) {
      return false; // Unknown instruction
    }

    return config.allowedInstructions.includes(allowedInstruction.name);
  }
}