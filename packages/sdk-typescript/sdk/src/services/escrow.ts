import type { Address } from '@solana/addresses';
import type { KeyPairSigner } from '@solana/signers';
import { address } from '@solana/addresses';
import * as anchor from "@coral-xyz/anchor";
const { BN, web3 } = anchor;
import { BaseService } from "./base";
import {
  DepositEscrowOptions,
  WithdrawEscrowOptions,
  EscrowAccount,
} from "../types";
import { findAgentPDA, findEscrowPDA } from "../utils";

/**
 * Escrow service for managing channel deposits and payments
 */
export class EscrowService extends BaseService {
  /**
   * Deposit funds to escrow for a channel
   */
  async depositEscrow(
    wallet: KeyPairSigner,
    options: DepositEscrowOptions,
  ): Promise<string> {
    const program = this.ensureInitialized();

    // Derive agent PDA
    const [agentPDA] = await findAgentPDA(wallet.address, this.programId);

    // Derive escrow PDA
    const [escrowPDA] = await findEscrowPDA(
      options.channel,
      wallet.address,
      this.programId,
    );

    const tx = await (program.methods as any)
      .depositEscrow(new BN(options.amount))
      .accounts({
        escrowAccount: escrowPDA,
        channelAccount: options.channel,
        depositorAgent: agentPDA,
        depositor: wallet.address,
        systemProgram: address("11111111111111111111111111111112"), // SystemProgram.programId
      })
      .signers([wallet])
      .rpc({ commitment: this.commitment });

    return tx;
  }

  /**
   * Withdraw funds from escrow
   */
  async withdrawEscrow(
    wallet: KeyPairSigner,
    options: WithdrawEscrowOptions,
  ): Promise<string> {
    const program = this.ensureInitialized();

    // Derive agent PDA
    const [agentPDA] = await findAgentPDA(wallet.address, this.programId);

    // Derive escrow PDA
    const [escrowPDA] = await findEscrowPDA(
      options.channel,
      wallet.address,
      this.programId,
    );

    const tx = await (program.methods as any)
      .withdrawEscrow(new BN(options.amount))
      .accounts({
        escrowAccount: escrowPDA,
        channelAccount: options.channel,
        depositorAgent: agentPDA,
        depositor: wallet.address,
        systemProgram: address("11111111111111111111111111111112"), // SystemProgram.programId
      })
      .signers([wallet])
      .rpc({ commitment: this.commitment });

    return tx;
  }

  /**
   * Get escrow account data
   */
  async getEscrow(
    channel: Address,
    depositor: Address,
  ): Promise<EscrowAccount | null> {
    try {
      const [escrowPDA] = await findEscrowPDA(channel, depositor, this.programId);
      const escrowAccount = this.getAccount("escrowAccount");
      const account = await (escrowAccount as any).fetch(escrowPDA);
      return this.convertEscrowAccountFromProgram(account);
    } catch (error) {
      console.error("Error fetching escrow details:", error);
      return null;
    }
  }

  /**
   * Get all escrow accounts by depositor
   */
  async getEscrowsByDepositor(
    depositor: Address,
    limit: number = 50,
  ): Promise<EscrowAccount[]> {
    try {
      const escrowAccount = this.getAccount("escrowAccount");
      const filters = [
        {
          memcmp: {
            offset: 8 + 32, // After discriminator and channel pubkey
            bytes: depositor, // Address can be used directly in memcmp
          },
        },
      ];

      const accounts = await (escrowAccount as any).all(filters);
      return accounts
        .slice(0, limit)
        .map((acc: any) => this.convertEscrowAccountFromProgram(acc.account));
    } catch (error) {
      console.warn("Error fetching escrows by depositor:", error);
      return [];
    }
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private convertEscrowAccountFromProgram(account: any): EscrowAccount {
    return {
      channel: account.channel,
      depositor: account.depositor,
      balance: account.balance?.toNumber() || 0,
      amount: account.balance?.toNumber() || 0, // alias for compatibility
      createdAt: account.createdAt?.toNumber() || Date.now(),
      lastUpdated: account.lastUpdated?.toNumber() || Date.now(),
      bump: account.bump,
    };
  }

  // ============================================================================
  // MCP Server Compatibility Methods
  // ============================================================================

  /**
   * Create escrow method for MCP server compatibility
   */
  async create(options: {
    channelId: string;
    amount: number;
    conditions?: string[];
    expiresIn?: number;
  }): Promise<{ escrowId: string; signature: string }> {
    // Real implementation using depositEscrow
    if (!this.wallet) {
      throw new Error('Wallet not configured for escrow service');
    }

    const channelAddress = address(options.channelId);
    const signature = await this.depositEscrow(this.wallet, {
      channel: channelAddress,
      amount: options.amount
    });

    // Generate escrow ID from signature
    const escrowId = `esc_${signature.slice(0, 16)}`;
    
    return {
      escrowId,
      signature
    };
  }

  /**
   * Release escrow method for MCP server compatibility
   */
  async release(escrowId: string, amount?: number): Promise<{ signature: string }> {
    // Real implementation using withdrawEscrow
    if (!this.wallet) {
      throw new Error('Wallet not configured for escrow service');
    }

    // For release, we need the channel address and amount
    // Since we only have escrowId, we'll need to fetch the escrow details first
    // This is a simplified implementation - in practice you'd parse the escrowId or maintain a mapping
    throw new Error('Release functionality requires channel address and amount. Use withdrawEscrow directly.');
  }

  // Wallet property for MCP compatibility
  private wallet?: KeyPairSigner;

  setWallet(wallet: KeyPairSigner): void {
    this.wallet = wallet;
  }
}
