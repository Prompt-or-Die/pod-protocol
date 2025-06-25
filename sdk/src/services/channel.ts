import { Address, KeyPairSigner, SystemProgram } from "@solana/web3.js";
import anchor from "@coral-xyz/anchor";
const { BN, utils } = anchor;
import { BaseService } from "./base";
import {
  CreateChannelOptions,
  ChannelAccount,
  ChannelVisibility,
  BroadcastMessageOptions,
} from "../types";
import { findAgentPDA, findChannelPDA } from "../utils";
import type { IdlAccounts } from "@coral-xyz/anchor";
import type { PodCom } from "../pod_com";

/**
 * Channel service for managing group communication
 */
export class ChannelService extends BaseService {
  /**
   * Create a new channel
   */
  async createChannel(
    wallet: Signer,
    options: CreateChannelOptions,
  ): Promise<string> {
    const program = this.ensureInitialized();

    // Derive agent PDA
    const [agentPDA] = findAgentPDA(wallet.publicKey, this.programId);

    // Derive channel PDA
    const [channelPDA] = findChannelPDA(
      wallet.publicKey,
      options.name,
      this.programId,
    );

    // Derive participant PDA for creator
    const [participantPDA] = this.findParticipantPDA(channelPDA, agentPDA);

    const visibilityObj = this.convertChannelVisibility(options.visibility);

    const tx = await (program.methods as any)
      .createChannel(
        options.name,
        options.description,
        visibilityObj,
        options.maxParticipants,
        new BN(options.feePerMessage),
      )
      .accounts({
        agentAccount: agentPDA,
        channelAccount: channelPDA,
        participantAccount: participantPDA,
        creator: wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([wallet])
      .rpc({ commitment: this.commitment });

    return tx;
  }

  /**
   * Get channel data
   */
  async getChannel(channelPDA: PublicKey): Promise<ChannelAccount | null> {
    try {
      const channelAccount = this.getAccount("channelAccount");
      const account = await channelAccount.fetch(channelPDA);
      return this.convertChannelAccountFromProgram(account, channelPDA);
    } catch (error) {
      console.warn(`Channel not found: ${channelPDA.toString()}`, error);
      return null;
    }
  }

  /**
   * Get all channels with optional filtering
   */
  async getAllChannels(
    limit: number = 50,
    visibilityFilter?: ChannelVisibility,
  ): Promise<ChannelAccount[]> {
    try {
      const channelAccount = this.getAccount("channelAccount");
      const filters: any[] = [];

      if (visibilityFilter) {
        const visibilityObj = this.convertChannelVisibility(visibilityFilter);
        filters.push({
          memcmp: {
            offset: 8 + 32 + 4 + 50 + 4 + 200, // After name and description
            bytes: utils.bytes.bs58.encode(
              Buffer.from([
                visibilityFilter === ChannelVisibility.Public ? 0 : 1,
              ]),
            ),
          },
        });
      }

      const accounts = await channelAccount.all(filters);
      return accounts
        .slice(0, limit)
        .map((acc: any) =>
          this.convertChannelAccountFromProgram(acc.account, acc.publicKey),
        );
    } catch (error) {
      console.warn("Error fetching channels:", error);
      return [];
    }
  }

  /**
   * Get channels created by a specific user
   */
  async getChannelsByCreator(
    creator: PublicKey,
    limit: number = 50,
  ): Promise<ChannelAccount[]> {
    try {
      const channelAccount = this.getAccount("channelAccount");
      const filters = [
        {
          memcmp: {
            offset: 8, // After discriminator
            bytes: creator.toBase58(),
          },
        },
      ];

      const accounts = await channelAccount.all(filters);
      return accounts
        .slice(0, limit)
        .map((acc: any) =>
          this.convertChannelAccountFromProgram(acc.account, acc.publicKey),
        );
    } catch (error) {
      console.warn("Error fetching channels by creator:", error);
      return [];
    }
  }

  /**
   * Join a channel
   */
  async joinChannel(wallet: Signer, channelPDA: PublicKey): Promise<string> {
    const program = this.ensureInitialized();

    // Derive agent PDA
    const [agentPDA] = findAgentPDA(wallet.publicKey, this.programId);

    // Derive participant PDA
    const [participantPDA] = this.findParticipantPDA(channelPDA, agentPDA);

    // Check if channel requires invitation (for private channels)
    const [invitationPDA] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("invitation"),
        channelPDA.toBuffer(),
        wallet.publicKey.toBuffer(),
      ],
      this.programId,
    );

    // Check if invitation exists for private channels
    let invitationAccount: any = null;
    try {
      const invitationAccountType = this.getAccount("channelInvitation");
      invitationAccount = await invitationAccountType.fetch(invitationPDA);
    } catch (error) {
      // Invitation doesn't exist, which is fine for public channels
    }

    const tx = await (program.methods as any)
      .joinChannel()
      .accounts({
        channelAccount: channelPDA,
        participantAccount: participantPDA,
        agentAccount: agentPDA,
        invitationAccount: invitationAccount ? invitationPDA : null,
        user: wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([wallet])
      .rpc({ commitment: this.commitment });

    return tx;
  }

  /**
   * Leave a channel
   */
  async leaveChannel(wallet: Signer, channelPDA: PublicKey): Promise<string> {
    const program = this.ensureInitialized();

    // Derive agent PDA
    const [agentPDA] = findAgentPDA(wallet.publicKey, this.programId);

    // Derive participant PDA
    const [participantPDA] = this.findParticipantPDA(channelPDA, agentPDA);

    const tx = await (program.methods as any)
      .leaveChannel()
      .accounts({
        channelAccount: channelPDA,
        participantAccount: participantPDA,
        agentAccount: agentPDA,
        user: wallet.publicKey,
      })
      .signers([wallet])
      .rpc({ commitment: this.commitment });

    return tx;
  }

  /**
   * Broadcast a message to a channel
   */
  async broadcastMessage(
    wallet: Signer,
    options: BroadcastMessageOptions,
  ): Promise<string> {
    const program = this.ensureInitialized();

    // Generate unique nonce for message
    const nonce = Date.now();

    // Derive agent PDA
    const [agentPDA] = findAgentPDA(wallet.publicKey, this.programId);

    // Derive participant PDA
    const [participantPDA] = this.findParticipantPDA(
      options.channelPDA,
      agentPDA,
    );

    // Derive message PDA
    const nonceBuffer = Buffer.alloc(8);
    nonceBuffer.writeBigUInt64LE(BigInt(nonce), 0);

    const [messagePDA] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("channel_message"),
        options.channelPDA.toBuffer(),
        wallet.publicKey.toBuffer(),
        nonceBuffer,
      ],
      this.programId,
    );

    const messageTypeObj = this.convertMessageType(
      options.messageType || "Text",
    );

    const tx = await (program.methods as any)
      .broadcastMessage(
        options.content,
        messageTypeObj,
        options.replyTo || null,
        new BN(nonce),
      )
      .accounts({
        channelAccount: options.channelPDA,
        participantAccount: participantPDA,
        agentAccount: agentPDA,
        messageAccount: messagePDA,
        user: wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([wallet])
      .rpc({ commitment: this.commitment });

    return tx;
  }

  /**
   * Invite a user to a channel
   */
  async inviteToChannel(
    wallet: Signer,
    channelPDA: PublicKey,
    invitee: PublicKey,
  ): Promise<string> {
    const program = this.ensureInitialized();

    // Derive agent PDA
    const [agentPDA] = findAgentPDA(wallet.publicKey, this.programId);

    // Derive participant PDA (for inviter)
    const [participantPDA] = this.findParticipantPDA(channelPDA, agentPDA);

    // Derive invitation PDA
    const [invitationPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("invitation"), channelPDA.toBuffer(), invitee.toBuffer()],
      this.programId,
    );

    const tx = await (program.methods as any)
      .inviteToChannel(invitee)
      .accounts({
        channelAccount: channelPDA,
        participantAccount: participantPDA,
        agentAccount: agentPDA,
        invitationAccount: invitationPDA,
        inviter: wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([wallet])
      .rpc({ commitment: this.commitment });

    return tx;
  }

  /**
   * Get channel participants
   */
  async getChannelParticipants(
    channelPDA: PublicKey,
    limit: number = 50
  ): Promise<Array<any>> {
    try {
      const participantAccount = this.getAccount("channelParticipant");
      const filters = [
        {
          memcmp: {
            offset: 8, // After discriminator
            bytes: channelPDA.toBase58(),
          },
        },
      ];

      const accounts = await participantAccount.all(filters);
      return accounts.slice(0, limit).map((acc: any) => acc.account);
    } catch (error) {
      console.warn("Error fetching channel participants:", error);
      return [];
    }
  }

  /**
   * Get channel messages
   */
  async getChannelMessages(
    channelPDA: PublicKey,
    limit: number = 50
  ): Promise<Array<any>> {
    try {
      const messageAccount = this.getAccount("channelMessage");
      const filters = [
        {
          memcmp: {
            offset: 8, // After discriminator
            bytes: channelPDA.toBase58(),
          },
        },
      ];

      const accounts = await messageAccount.all(filters);
      return accounts.slice(0, limit).map((acc: any) => acc.account);
    } catch (error) {
      console.warn("Error fetching channel messages:", error);
      return [];
    }
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private convertChannelVisibility(visibility: ChannelVisibility): any {
    switch (visibility) {
      case ChannelVisibility.Public:
        return { public: {} };
      case ChannelVisibility.Private:
        return { private: {} };
      default:
        return { public: {} };
    }
  }

  private convertChannelVisibilityFromProgram(
    programVisibility: any,
  ): ChannelVisibility {
    if (programVisibility.public !== undefined) return ChannelVisibility.Public;
    if (programVisibility.private !== undefined)
      return ChannelVisibility.Private;
    return ChannelVisibility.Public;
  }

  private convertMessageType(messageType: any): any {
    if (typeof messageType === "string") {
      switch (messageType.toLowerCase()) {
        case "text":
          return { text: {} };
        case "data":
          return { data: {} };
        case "command":
          return { command: {} };
        case "response":
          return { response: {} };
        default:
          return { text: {} };
      }
    }
    return messageType || { text: {} };
  }

  private convertChannelAccountFromProgram(
    account: any,
    publicKey: PublicKey,
  ): ChannelAccount {
    return {
      pubkey: publicKey,
      creator: account.creator,
      name: account.name,
      description: account.description,
      visibility: this.convertChannelVisibilityFromProgram(account.visibility),
      maxParticipants: account.maxParticipants,
      participantCount: account.currentParticipants,
      currentParticipants: account.currentParticipants,
      feePerMessage: account.feePerMessage?.toNumber() || 0,
      escrowBalance: account.escrowBalance?.toNumber() || 0,
      createdAt: account.createdAt?.toNumber() || Date.now(),
      isActive: true,
      bump: account.bump,
    };
  }

  private findParticipantPDA(
    channelPDA: PublicKey,
    agentPDA: PublicKey,
  ): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("participant"), channelPDA.toBuffer(), agentPDA.toBuffer()],
      this.programId,
    );
  }
}
