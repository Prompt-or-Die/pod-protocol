import { Address, KeyPairSigner, address, lamports } from '@solana/web3.js';
import anchor from "@coral-xyz/anchor";
const { BN, utils, web3 } = anchor;
import { BaseService } from "./base.js";
import {
  CreateChannelOptions,
  ChannelAccount,
  ChannelVisibility,
  BroadcastMessageOptions,
} from "../types";
import { findAgentPDA, findChannelPDA, findParticipantPDA, findInvitationPDA } from "../utils.js";
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
    signer: KeyPairSigner,
    config: ChannelConfig,
  ): Promise<Address> {
    try {
      // Generate channel ID
      const channelId = Math.random().toString(36).substring(2);
      const [channelPDA] = findChannelPDA(channelId, signer.address);

      // TODO: Implement actual transaction building with Web3.js v2
      console.log("Creating channel with config:", config);
      console.log("Channel PDA:", channelPDA);

      // For now, return mock channel address
      return channelPDA;
    } catch (error) {
      throw new Error(`Failed to create channel: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get channel data
   */
  async getChannel(channelPDA: Address): Promise<ChannelData | null> {
    try {
      // TODO: Implement actual account fetching with Web3.js v2 RPC
      console.log("Getting channel:", channelPDA);

      // Return mock data for now
      return {
        pubkey: channelPDA,
        account: {
          name: "Mock Channel",
          description: "Mock channel during migration",
          creator: address("11111111111111111111111111111112"),
          isPublic: true,
          participantCount: 1,
          maxParticipants: 100,
          requiresApproval: false,
          tags: ["demo"],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        }
      };
    } catch (error) {
      console.error("Error getting channel:", error);
      return null;
    }
  }

  /**
   * Get all channels with optional filtering
   */
  async getAllChannels(
    limit: number = 50,
    visibilityFilter?: ChannelVisibility,
  ): Promise<ChannelData[]> {
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
    creator: Address,
    limit: number = 50,
  ): Promise<ChannelData[]> {
    try {
      const channelAccount = this.getAccount("channelAccount");
      const filters = [
        {
          memcmp: {
            offset: 8, // After discriminator
            bytes: creator, // Address can be used directly in memcmp
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
  async joinChannel(
    signer: KeyPairSigner,
    channelAddress: Address,
  ): Promise<void> {
    try {
      const [participantPDA] = findParticipantPDA(channelAddress, signer.address);

      // TODO: Implement actual transaction building with Web3.js v2
      console.log("Joining channel:", channelAddress);
      console.log("Participant PDA:", participantPDA);

    } catch (error) {
      throw new Error(`Failed to join channel: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Leave a channel
   */
  async leaveChannel(
    signer: KeyPairSigner,
    channelAddress: Address,
  ): Promise<void> {
    try {
      const [participantPDA] = findParticipantPDA(channelAddress, signer.address);

      // TODO: Implement actual transaction building with Web3.js v2
      console.log("Leaving channel:", channelAddress);
      console.log("Participant PDA:", participantPDA);

    } catch (error) {
      throw new Error(`Failed to leave channel: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
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

    // Derive agent PDA
    const [agentPDA] = findAgentPDA(wallet.address, this.programId);

    // Derive participant PDA
    const [participantPDA] = this.findParticipantPDA(
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
      const [invitationPDA] = findInvitationPDA(channelAddress, inviteeAddress);

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
  async getChannelParticipants(channelAddress: Address): Promise<ParticipantData[]> {
    try {
      // TODO: Implement actual account fetching with Web3.js v2 RPC
      console.log("Getting participants for channel:", channelAddress);

      // Return mock data for now
      return [
        {
          pubkey: address("11111111111111111111111111111114"),
          account: {
            channel: channelAddress,
            agent: address("11111111111111111111111111111115"),
            role: "member",
            joinedAt: Date.now() - 3600000,
            permissions: 1,
          }
        }
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

    // Using legacy PDA derivation through anchor utils
    const [pda, bump] = address.findProgramAddressSync(
      [
        Buffer.from("channel_message"),
        new address(channelPDA).toBuffer(),
        new address(sender).toBuffer(),
        nonceBuffer,
      ],
      new address(this.programId),
    );
    return [address(pda), bump];
  }

  /**
   * Helper methods for PDA finding (implementing the missing methods)
   */
  private findParticipantPDA(channel: Address, agent: Address): [Address, number] {
    return findParticipantPDA(channel, agent, this.programId);
  }

  private findInvitationPDA(channel: Address, invitee: Address): [Address, number] {
    return findInvitationPDA(channel, invitee, this.programId);
  }

  private findChannelPDA(channelId: string, creator: Address): [Address, number] {
    return findChannelPDA(channelId, creator, this.programId);
  }
}
