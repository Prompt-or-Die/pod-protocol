import { Address, KeyPairSigner, address } from "@solana/web3.js";
import anchor from "@coral-xyz/anchor";
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
    const [agentPDA] = findAgentPDA(address(wallet.address), address(this.programId));

    // Derive escrow PDA
    const [escrowPDA] = findEscrowPDA(
      address(options.channel),
      address(wallet.address),
      address(this.programId),
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
    const [agentPDA] = findAgentPDA(address(wallet.address), address(this.programId));

    // Derive escrow PDA
    const [escrowPDA] = findEscrowPDA(
      address(options.channel),
      address(wallet.address),
      address(this.programId),
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
      const [escrowPDA] = findEscrowPDA(address(channel), address(depositor), address(this.programId));
      const escrowAccount = this.getAccount("escrowAccount");
      const account = await escrowAccount.fetch(escrowPDA);
      return this.convertEscrowAccountFromProgram(account);
    } catch (error) {
      console.warn(
        `Escrow not found for channel: ${channel}, depositor: ${depositor}`,
        error,
      );
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

      const accounts = await escrowAccount.all(filters);
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
}
