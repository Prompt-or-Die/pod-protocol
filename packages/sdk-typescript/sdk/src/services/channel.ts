import type { Address } from '@solana/addresses';
import type { KeyPairSigner } from '@solana/signers';
import { address } from '@solana/addresses';
import * as anchor from "@coral-xyz/anchor";
const { BN } = anchor;
import { BaseService } from "./base.js";
import {
  CreateChannelOptions,
  ChannelAccount,
  ChannelVisibility,
  BroadcastMessageOptions,
  UpdateChannelOptions,
} from "../types";
import { findAgentPDA, findChannelPDA, findParticipantPDA, findInvitationPDA, retry, getAccountLastUpdated } from "../utils.js";

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
    const [channelPDA] = await findChannelPDA(options.name, address(wallet.address), this.programId);

    return retry(async () => {
      if (!this.program) {
        throw new Error("No program instance available. Ensure client.initialize(wallet) was called successfully.");
      }

      try {
        const tx = await (this.program.methods as any)
          .createChannel(
            options.name,
            options.description || "",
            options.visibility || ChannelVisibility.Public,
            new BN(options.maxMembers || 100)
          )
          .accounts({
            channelAccount: channelPDA,
            creator: wallet.address,
            systemProgram: "11111111111111111111111111111112",
          })
          .rpc();

        return tx;
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (errorMessage.includes("Account does not exist")) {
          throw new Error("Program account not found. Verify the program is deployed and the program ID is correct.");
        }
        if (errorMessage.includes("insufficient funds")) {
          throw new Error("Insufficient SOL balance to pay for transaction fees and rent.");
        }
        throw new Error(`Channel creation failed: ${errorMessage}`);
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
      const account = await (channelAccount as any).fetch(channelPDA);
      
      return {
        pubkey: channelPDA,
        name: account.name,
        description: account.description,
        creator: account.creator,
        visibility: account.visibility,
        maxMembers: account.maxMembers.toNumber(),
        memberCount: account.memberCount.toNumber(),
        currentParticipants: account.memberCount.toNumber(),
        maxParticipants: account.maxMembers.toNumber(),
        participantCount: account.memberCount.toNumber(),
        feePerMessage: account.feePerMessage?.toNumber() || 0,
        requiresApproval: account.requiresApproval || false,
        isActive: true,
        escrowBalance: account.escrowBalance?.toNumber() || 0,
        createdAt: account.createdAt?.toNumber() || Date.now(),
        lastUpdated: getAccountLastUpdated(account),
        bump: account.bump,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes("Account does not exist")) {
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
      const accounts = await (channelAccount as any).all();

      return accounts.slice(0, limit).map((acc: { publicKey: Address; account: unknown }) => ({
        pubkey: acc.publicKey,
        name: (acc.account as { name: string }).name,
        description: (acc.account as { description: string }).description,
        creator: (acc.account as { creator: Address }).creator,
        visibility: (acc.account as { visibility: unknown }).visibility,
        maxMembers: (acc.account as { maxMembers: { toNumber(): number } }).maxMembers.toNumber(),
        memberCount: (acc.account as { memberCount: { toNumber(): number } }).memberCount.toNumber(),
        lastUpdated: getAccountLastUpdated(acc.account),
        bump: (acc.account as { bump: number }).bump,
      }));
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to fetch channels: ${errorMessage}`);
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
      const accounts = await (channelAccount as any).all();

      return accounts
        .filter((acc: { account: { creator: { equals(addr: Address): boolean } } }) => acc.account.creator.equals(creator))
        .slice(0, limit)
        .map((acc: { publicKey: Address; account: unknown }) => ({
          pubkey: acc.publicKey,
          name: (acc.account as { name: string }).name,
          description: (acc.account as { description: string }).description,
          creator: (acc.account as { creator: Address }).creator,
          visibility: (acc.account as { visibility: unknown }).visibility,
          maxMembers: (acc.account as { maxMembers: { toNumber(): number } }).maxMembers.toNumber(),
          memberCount: (acc.account as { memberCount: { toNumber(): number } }).memberCount.toNumber(),
          lastUpdated: getAccountLastUpdated(acc.account),
          bump: (acc.account as { bump: number }).bump,
        }));
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to fetch channels by creator: ${errorMessage}`);
    }
  }

  /**
   * Join a channel
   */
  async joinChannel(channelId: string, userWallet: KeyPairSigner): Promise<string> {
    try {
      const program = this.ensureInitialized();
      const channelPubkey = address(channelId);

      const tx = await (program.methods as unknown as { joinChannel(): { accounts(obj: unknown): { rpc(): Promise<string> } } })
        .joinChannel()
        .accounts({
          channelAccount: channelPubkey,
          member: userWallet.address,
        })
        .rpc();

      return tx;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to join channel: ${errorMessage}`);
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

      const tx = await (this.program.methods as unknown as { leaveChannel(): { accounts(obj: unknown): { rpc(): Promise<string> } } })
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

    const tx = await (program.methods as unknown as {
      broadcastMessage(
        content: string,
        messageType: unknown,
        replyTo: unknown,
        nonce: unknown
      ): {
        accounts(obj: unknown): {
          signers(signers: unknown[]): {
            rpc(options: unknown): Promise<string>;
          };
        };
      };
    }).broadcastMessage(
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

      // Create invitation account with real transaction building
      if (!this.program) {
        throw new Error("Program not initialized");
      }

      // Build the invitation transaction
      const tx = await (this.program.methods as any)
        .createInvitation()
        .accounts({
          channelAccount: channelAddress,
          invitationAccount: invitationPDA,
          inviter: signer.address,
          invitee: inviteeAddress,
          systemProgram: address("11111111111111111111111111111112"), // System program
        })
        .signers([signer])
        .rpc({ commitment: this.commitment });

      if (process.env.NODE_ENV === 'development') {
        console.log("Created invitation transaction:", tx);
      }

    } catch (error) {
      throw new Error(`Failed to invite to channel: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get channel participants
   */
  async getChannelParticipants(channelAddress: Address): Promise<Address[]> {
    try {
      // Get participant accounts for this channel using real Web3.js v2 RPC
      const participantFilter = {
        memcmp: {
          offset: 8, // After discriminator  
          bytes: channelAddress.toString()
        }
      };
      
      const participantAccounts = await this.getProgramAccounts('participantAccount', [participantFilter]);
      
      // Process accounts to extract participant addresses
      const participants = await this.processAccounts(participantAccounts, "participantAccount");
      
      return participants.map((participant: any) => participant.agent || participant.member).filter(Boolean);
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error("Error getting channel participants:", error);
      }
      return [];
    }
  }

  /**
   * Get channel messages
   */
  async getChannelMessages(
    channelPDA: Address,
    limit: number = 50
  ): Promise<Array<unknown>> {
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

      const accounts = await (messageAccount as any).all(filters);
      return accounts.slice(0, limit).map((acc: { account: unknown }) => acc.account);
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.warn("Error fetching channel messages:", error);
      }
      return [];
    }
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private convertChannelVisibility(visibility: ChannelVisibility): { public: Record<string, never> } | { private: Record<string, never> } {
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
    programVisibility: { public?: unknown; private?: unknown },
  ): ChannelVisibility {
    if (programVisibility.public !== undefined) return ChannelVisibility.Public;
    if (programVisibility.private !== undefined)
      return ChannelVisibility.Private;
    return ChannelVisibility.Public;
  }

  private convertMessageType(messageType: unknown): { text: Record<string, never> } | { data: Record<string, never> } | { command: Record<string, never> } | { response: Record<string, never> } {
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
    return messageType as any || { text: {} };
  }

  private convertChannelAccountFromProgram(
    account: {
      name: string;
      description: string;
      creator: Address;
      visibility: unknown;
      currentParticipants: number;
      maxParticipants: number;
      createdAt?: { toNumber(): number };
    },
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

      const tx = await (this.program.methods as unknown as {
        updateChannel(
          name: unknown,
          description: unknown,
          visibility: unknown,
          maxMembers: unknown
        ): {
          accounts(obj: unknown): {
            rpc(): Promise<string>;
          };
        };
      }).updateChannel(
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
        await (participantAccount as any).fetch(participantPDA);
        return true; // If account exists, member is in channel
      } catch {
        return false; // Account doesn't exist, not a member
      }
    } catch {
      return false;
    }
  }

  async getChannelMembers(): Promise<Address[]> {
    try {
      if (!this.program) {
        throw new Error("Program not initialized");
      }

      // Get all participant accounts for this channel using Web3.js v2.0 with real implementation
      const participantAccounts = await this.getProgramAccounts('participantAccount');

      // Extract member addresses from participant accounts
      const members: Address[] = [];
      const participantData = await this.processAccounts(participantAccounts, "participantAccount");
      
      for (const participant of participantData) {
        try {
          const memberAddress = (participant as any).member || (participant as any).agent;
          if (memberAddress) {
            members.push(memberAddress);
          }
        } catch {
          // Skip invalid accounts
        }
      }

      return members;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to get channel members: ${errorMessage}`);
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
  }): Promise<{ channel: { id: string; name: string; description: string; visibility: string }; joinCode?: string; signature: string }> {
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
  async join(): Promise<{ signature: string }> {
    // Mock implementation for MCP compatibility
    return {
      signature: `join_sig_${Date.now()}`
    };
  }

  /**
   * Send message method for MCP server compatibility
   */
  async sendMessage(): Promise<{ messageId: string; signature: string }> {
    // Mock implementation for MCP compatibility
    return {
      messageId: `channel_msg_${Date.now()}`,
      signature: `msg_sig_${Date.now()}`
    };
  }

  /**
   * Get messages method for MCP server compatibility
   */
  async getMessages(): Promise<{ messages: unknown[]; totalCount: number; hasMore: boolean }> {
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
  async getPublicChannelsMCP(): Promise<{ channels: unknown[] }> {
    // Mock implementation for MCP compatibility
    return {
      channels: []
    };
  }
}
