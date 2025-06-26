import type { Address } from '@solana/addresses';
import type { KeyPairSigner } from '@solana/signers';
import { address } from '@solana/addresses';
import { lamports } from '@solana/kit';
import anchor from "@coral-xyz/anchor";
const { BN, utils, web3, AnchorProvider, Program } = anchor;
import { BaseService } from "./base.js";
import {
  CreateChannelOptions,
  ChannelAccount,
  ChannelVisibility,
  BroadcastMessageOptions,
  UpdateChannelOptions,
} from "../types";
import { findAgentPDA, findChannelPDA, findParticipantPDA, findInvitationPDA, retry, getAccountLastUpdated } from "../utils.js";
import type { IdlAccounts } from "@coral-xyz/anchor";
import type { PodCom } from "../pod_com";

export interface ChannelConfig {
  name: string;
  description?: string;
  isPublic: boolean;
  maxParticipants?: number;
  requiresApproval?: boolean;
  tags?: string[];
}

export interface ChannelData {
  pubkey: Address;
  account: {
    name: string;
    description: string;
    creator: Address;
    isPublic: boolean;
    participantCount: number;
    maxParticipants: number;
    requiresApproval: boolean;
    tags: string[];
    createdAt: number;
    updatedAt: number;
  };
}

export interface ParticipantData {
  pubkey: Address;
  account: {
    channel: Address;
    agent: Address;
    role: string;
    joinedAt: number;
    permissions: number;
  };
}

/**
 * Channel service for managing group communication
 */
export class ChannelService extends BaseService {
  /**
   * Create a new channel
   */
  async createChannel(
    wallet: KeyPairSigner,
    options: CreateChannelOptions,
  ): Promise<string> {
    const [channelPDA] = await findChannelPDA(wallet.address, options.name, this.programId);

    return retry(async () => {
      if (!this.program) {
        throw new Error("No program instance available. Ensure client.initialize(wallet) was called successfully.");
      }

      try {
        const tx = await (this.program.methods as any)
          .createChannel(
            options.name,
            options.description || "",
            options.visibility || ChannelVisibility.PUBLIC,
            new BN(options.maxMembers || 100)
          )
          .accounts({
            channelAccount: channelPDA,
            creator: wallet.address,
            systemProgram: "11111111111111111111111111111112",
          })
          .rpc();

        return tx;
      } catch (error: any) {
        if (error.message?.includes("Account does not exist")) {
          throw new Error("Program account not found. Verify the program is deployed and the program ID is correct.");
        }
        if (error.message?.includes("insufficient funds")) {
          throw new Error("Insufficient SOL balance to pay for transaction fees and rent.");
        }
        throw new Error(`Channel creation failed: ${error.message}`);
      }
    });
  }

  /**
   * Get channel data
   */
  async getChannel(channelPDA: Address): Promise<ChannelAccount | null> {
    try {
      if (!this.program) {
        throw new Error("Program not initialized");
      }

      const channelAccount = this.getAccount("channelAccount");
      const account = await channelAccount.fetch(channelPDA);
      
      return {
        pubkey: channelPDA,
        name: account.name,
        description: account.description,
        creator: account.creator,
        visibility: account.visibility,
        maxMembers: account.maxMembers.toNumber(),
        memberCount: account.memberCount.toNumber(),
        lastUpdated: getAccountLastUpdated(account),
        bump: account.bump,
      };
    } catch (error: any) {
      if (error?.message?.includes("Account does not exist")) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Get all channels with optional filtering
   */
  async getAllChannels(limit: number = 100): Promise<ChannelAccount[]> {
    try {
      if (!this.program) {
        throw new Error("Program not initialized");
      }

      const channelAccount = this.getAccount("channelAccount");
      const accounts = await channelAccount.all();

      return accounts.slice(0, limit).map((acc: any) => ({
        pubkey: acc.publicKey,
        name: acc.account.name,
        description: acc.account.description,
        creator: acc.account.creator,
        visibility: acc.account.visibility,
        maxMembers: acc.account.maxMembers.toNumber(),
        memberCount: acc.account.memberCount.toNumber(),
        lastUpdated: getAccountLastUpdated(acc.account),
        bump: acc.account.bump,
      }));
    } catch (error: any) {
      throw new Error(`Failed to fetch channels: ${error.message}`);
    }
  }

  /**
   * Get channels created by a specific user
   */
  async getChannelsByCreator(creator: Address, limit: number = 100): Promise<ChannelAccount[]> {
    try {
      if (!this.program) {
        throw new Error("Program not initialized");
      }

      const channelAccount = this.getAccount("channelAccount");
      const accounts = await channelAccount.all();

      return accounts
        .filter((acc: any) => acc.account.creator.equals(creator))
        .slice(0, limit)
        .map((acc: any) => ({
          pubkey: acc.publicKey,
          name: acc.account.name,
          description: acc.account.description,
          creator: acc.account.creator,
          visibility: acc.account.visibility,
          maxMembers: acc.account.maxMembers.toNumber(),
          memberCount: acc.account.memberCount.toNumber(),
          lastUpdated: getAccountLastUpdated(acc.account),
          bump: acc.account.bump,
        }));
    } catch (error: any) {
      throw new Error(`Failed to fetch channels by creator: ${error.message}`);
    }
  }

  /**
   * Join a channel
   */
  async joinChannel(channelId: string, userWallet: KeyPairSigner): Promise<string> {
    try {
      const program = this.ensureInitialized();
      const channelPubkey = address(channelId);

      const tx = await (program.methods as any)
        .joinChannel()
        .accounts({
          channelAccount: channelPubkey,
          member: userWallet.address,
        })
        .rpc();

      return tx;
    } catch (error: any) {
      throw new Error(`Failed to join channel: ${error.message}`);
    }
  }

  /**
   * Leave a channel
   */
  async leaveChannel(
    wallet: KeyPairSigner,
    channelPDA: Address,
  ): Promise<string> {
    return retry(async () => {
      if (!this.program) {
        throw new Error("Program not initialized");
      }

      const tx = await (this.program.methods as any)
        .leaveChannel()
        .accounts({
          channelAccount: channelPDA,
          member: wallet.address,
        })
        .rpc();

      return tx;
    });
  }

  /**
   * Broadcast a message to a channel
   */
  async broadcastMessage(
    wallet: KeyPairSigner,
    options: BroadcastMessageOptions,
  ): Promise<string> {
    const program = this.ensureInitialized();

    // Generate unique nonce for message
    const nonce = Date.now();

    const [agentPDA] = await findAgentPDA(wallet.address, this.programId);

    // Derive participant PDA
    const [participantPDA] = await this.findParticipantPDA(
      options.channelPDA,
      agentPDA,
    );

    // Derive message PDA
    const [messagePDA] = this.findChannelMessagePDA(
      options.channelPDA,
      wallet.address,
      nonce,
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
        user: wallet.address,
        systemProgram: address("11111111111111111111111111111112"), // SystemProgram.programId
      })
      .signers([wallet])
      .rpc({ commitment: this.commitment });

    return tx;
  }

  /**
   * Invite an agent to a channel
   */
  async inviteToChannel(
    signer: KeyPairSigner,
    channelAddress: Address,
    inviteeAddress: Address,
  ): Promise<void> {
    try {
      const [invitationPDA] = await findInvitationPDA(channelAddress, inviteeAddress, this.programId);

      // TODO: Implement actual transaction building with Web3.js v2
      console.log("Inviting to channel:", channelAddress);
      console.log("Invitee:", inviteeAddress);
      console.log("Invitation PDA:", invitationPDA);

    } catch (error) {
      throw new Error(`Failed to invite to channel: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get channel participants
   */
  async getChannelParticipants(channelAddress: Address): Promise<Address[]> {
    try {
      // TODO: Implement actual account fetching with Web3.js v2 RPC
      console.log("Getting participants for channel:", channelAddress);

      // Return mock data for now
      return [
        address("11111111111111111111111111111114"),
      ];
    } catch (error) {
      console.error("Error getting channel participants:", error);
      return [];
    }
  }

  /**
   * Get channel messages
   */
  async getChannelMessages(
    channelPDA: Address,
    limit: number = 50
  ): Promise<Array<any>> {
    try {
      const messageAccount = this.getAccount("channelMessage");
      const filters = [
        {
          memcmp: {
            offset: 8, // After discriminator
            bytes: channelPDA,
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
    publicKey: Address,
  ): ChannelData {
    return {
      pubkey: publicKey,
      account: {
        name: account.name,
        description: account.description,
        creator: account.creator,
        isPublic: this.convertChannelVisibilityFromProgram(account.visibility) === ChannelVisibility.Public,
        participantCount: account.currentParticipants,
        maxParticipants: account.maxParticipants,
        requiresApproval: false,
        tags: [],
        createdAt: account.createdAt?.toNumber() || Date.now(),
        updatedAt: Date.now(),
      },
    };
  }

  private findChannelMessagePDA(
    channelPDA: Address,
    sender: Address,
    nonce: number,
  ): [Address, number] {
    const nonceBuffer = Buffer.alloc(8);
    nonceBuffer.writeBigUInt64LE(BigInt(nonce), 0);

    // Generate PDA deterministically - temporary mock implementation
    const mockPDA = address(channelPDA + sender + nonce.toString());
    const bump = 255;
    return [mockPDA, bump];
  }

  /**
   * Helper methods for PDA finding (implementing the missing methods)
   */
  async findParticipantPDA(channel: Address, agent: Address): Promise<[Address, number]> {
    return await findParticipantPDA(channel, agent, this.programId);
  }

  async findInvitationPDA(channel: Address, invitee: Address): Promise<[Address, number]> {
    return await findInvitationPDA(channel, invitee, this.programId);
  }

  async findChannelPDA(channelId: string, creator: Address): Promise<[Address, number]> {
    return await findChannelPDA(channelId, creator, this.programId);
  }

  async updateChannel(
    wallet: KeyPairSigner,
    channelPDA: Address,
    options: UpdateChannelOptions,
  ): Promise<string> {
    return retry(async () => {
      if (!this.program) {
        throw new Error("Program not initialized");
      }

      const tx = await (this.program.methods as any)
        .updateChannel(
          options.name || null,
          options.description || null,
          options.visibility !== undefined ? options.visibility : null,
          options.maxMembers !== undefined ? new BN(options.maxMembers) : null,
        )
        .accounts({
          channelAccount: channelPDA,
          creator: wallet.address,
        })
        .rpc();

      return tx;
    });
  }

  async getPublicChannels(limit: number = 100): Promise<ChannelAccount[]> {
    const allChannels = await this.getAllChannels(limit * 2);
    return allChannels
      .filter(channel => channel.visibility === ChannelVisibility.Public)
      .slice(0, limit);
  }

  async searchChannels(query: string, limit: number = 50): Promise<ChannelAccount[]> {
    const allChannels = await this.getAllChannels(limit * 3);
    const lowerQuery = query.toLowerCase();
    
    return allChannels
      .filter(channel => 
        channel.name.toLowerCase().includes(lowerQuery) ||
        channel.description.toLowerCase().includes(lowerQuery)
      )
      .slice(0, limit);
  }

  async isChannelMember(channelPDA: Address, memberAddress: Address): Promise<boolean> {
    try {
      if (!this.program) {
        throw new Error("Program not initialized");
      }

      // Get participant PDA to check membership
      const [participantPDA] = await findParticipantPDA(channelPDA, memberAddress, this.programId);
      
      try {
        const participantAccount = this.getAccount("participantAccount");
        await participantAccount.fetch(participantPDA);
        return true; // If account exists, member is in channel
      } catch (error) {
        return false; // Account doesn't exist, not a member
      }
    } catch (error) {
      return false;
    }
  }

  async getChannelMembers(channelPDA: Address): Promise<Address[]> {
    try {
      if (!this.program) {
        throw new Error("Program not initialized");
      }

      // Get all participant accounts for this channel using Web3.js v2.0
      const participantAccounts = await this.rpc.getProgramAccounts(this.programId, {
        commitment: this.commitment,
        filters: [
          {
            memcmp: {
              offset: 0,
              bytes: "participant_account" // Account discriminator
            }
          },
          {
            memcmp: {
              offset: 8, // After discriminator
              bytes: channelPDA // Channel address
            }
          }
        ]
      }).send();

      // Extract member addresses from participant accounts
      const members: Address[] = [];
      for (const acc of participantAccounts) {
        try {
          const participantData = this.program.coder.accounts.decode("participantAccount", acc.account.data);
          members.push(participantData.member);
        } catch (error) {
          // Skip invalid accounts
        }
      }

      return members;
    } catch (error: any) {
      throw new Error(`Failed to get channel members: ${error.message}`);
    }
  }

  // ============================================================================
  // MCP Server Compatibility Methods
  // ============================================================================

  /**
   * Create method for MCP server compatibility
   */
  async create(options: {
    name: string;
    description?: string;
    visibility?: string;
    maxParticipants?: number;
    requiresDeposit?: boolean;
    depositAmount?: number;
  }): Promise<{ channel: any; joinCode?: string; signature: string }> {
    // Mock implementation for MCP compatibility
    return {
      channel: {
        id: `channel_${Date.now()}`,
        name: options.name,
        description: options.description || '',
        visibility: options.visibility || 'public'
      },
      joinCode: options.visibility === 'private' ? `join_${Date.now()}` : undefined,
      signature: `sig_${Date.now()}`
    };
  }

  /**
   * Join method for MCP server compatibility
   */
  async join(channelId: string, inviteCode?: string): Promise<{ signature: string }> {
    // Mock implementation for MCP compatibility
    return {
      signature: `join_sig_${Date.now()}`
    };
  }

  /**
   * Send message method for MCP server compatibility
   */
  async sendMessage(options: {
    channelId: string;
    content: string;
    messageType?: string;
    replyTo?: string;
    metadata?: any;
  }): Promise<{ messageId: string; signature: string }> {
    // Mock implementation for MCP compatibility
    return {
      messageId: `channel_msg_${Date.now()}`,
      signature: `msg_sig_${Date.now()}`
    };
  }

  /**
   * Get messages method for MCP server compatibility
   */
  async getMessages(options: {
    channelId: string;
    limit?: number;
    offset?: number;
    since?: number;
  }): Promise<{ messages: any[]; totalCount: number; hasMore: boolean }> {
    // Mock implementation for MCP compatibility
    return {
      messages: [],
      totalCount: 0,
      hasMore: false
    };
  }

  /**
   * Get public channels method for MCP server compatibility
   */
  async getPublicChannels(options: {
    limit?: number;
  }): Promise<{ channels: any[] }> {
    // Mock implementation for MCP compatibility
    return {
      channels: []
    };
  }
}
