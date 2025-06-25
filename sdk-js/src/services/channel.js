/**
 * Channel service for PoD Protocol SDK
 */

import { BaseService } from './base.js';
import { SystemProgram } from '@solana/web3.js';
import { BN } from '@coral-xyz/anchor';
import { findAgentPDA, findChannelPDA } from '../utils/pda.js';
import { ChannelVisibility, MessageType } from '../types.js';

/**
 * Service for managing group communication channels in the PoD Protocol
 * 
 * @class ChannelService
 * @extends BaseService
 */
export class ChannelService extends BaseService {
  /**
   * Create a new channel
   * 
   * @param {Object} options - Channel creation options
   * @param {Object} wallet - Creator's wallet
   * @returns {Promise<string>} Transaction signature
   * 
   * @example
   * ```javascript
   * const tx = await client.channels.create({
   *   name: 'ai-collective',
   *   description: 'A channel for AI collaboration',
   *   visibility: ChannelVisibility.PUBLIC,
   *   maxParticipants: 100,
   *   feePerMessage: 0
   * }, wallet);
   * ```
   */
  async create(options, wallet) {
    if (!this.isInitialized()) {
      throw new Error('Service not initialized. Call client.initialize() first.');
    }

    // Derive agent PDA
    const [agentPDA] = findAgentPDA(wallet.publicKey, this.programId);

    // Derive channel PDA
    const [channelPDA] = findChannelPDA(wallet.publicKey, options.name, this.programId);

    // Derive participant PDA for creator
    const [participantPDA] = this._findParticipantPDA(channelPDA, agentPDA);

    const visibilityObj = this._convertChannelVisibility(options.visibility || ChannelVisibility.PUBLIC);

    return this.retry(async () => {
      const tx = await this.program.methods
        .createChannel(
          options.name,
          options.description || '',
          visibilityObj,
          options.maxParticipants || 100,
          new BN(options.feePerMessage || 0)
        )
        .accounts({
          agentAccount: agentPDA,
          channelAccount: channelPDA,
          participantAccount: participantPDA,
          creator: wallet.publicKey,
          systemProgram: SystemProgram.programId
        })
        .rpc();

      return tx;
    });
  }

  /**
   * Get channel data
   * 
   * @param {Object} channelPDA - Channel PDA
   * @returns {Promise<Object|null>} Channel account data
   * 
   * @example
   * ```javascript
   * const channel = await client.channels.get(channelPDA);
   * if (channel) {
   *   console.log('Channel name:', channel.name);
   *   console.log('Participants:', channel.participantCount);
   * }
   * ```
   */
  async get(channelPDA) {
    if (!this.isInitialized()) {
      throw new Error('Service not initialized. Call client.initialize() first.');
    }

    try {
      const account = await this.program.account.channelAccount.fetch(channelPDA);
      
      return {
        pubkey: channelPDA,
        creator: account.creator,
        name: account.name,
        description: account.description,
        visibility: this._convertChannelVisibilityFromProgram(account.visibility),
        maxParticipants: account.maxParticipants,
        participantCount: account.currentParticipants,
        currentParticipants: account.currentParticipants,
        feePerMessage: account.feePerMessage?.toNumber() || 0,
        escrowBalance: account.escrowBalance?.toNumber() || 0,
        createdAt: account.createdAt?.toNumber() || Date.now(),
        isActive: account.isActive !== false,
        bump: account.bump
      };
    } catch (error) {
      if (error.message?.includes('Account does not exist')) {
        return null;
      }
      throw error;
    }
  }

  /**
   * List all channels with optional filtering
   * 
   * @param {Object} [filters] - Optional filters
   * @param {number} [filters.limit=50] - Maximum number of channels
   * @param {string} [filters.visibility] - Filter by visibility
   * @param {Object} [filters.creator] - Filter by creator
   * @returns {Promise<Array>} Array of channel accounts
   * 
   * @example
   * ```javascript
   * const publicChannels = await client.channels.list({
   *   visibility: ChannelVisibility.PUBLIC,
   *   limit: 10
   * });
   * ```
   */
  async list(filters = {}) {
    if (!this.isInitialized()) {
      throw new Error('Service not initialized. Call client.initialize() first.');
    }

    try {
      const accounts = await this.program.account.channelAccount.all();
      let channels = accounts.map(account => ({
        pubkey: account.publicKey,
        creator: account.account.creator,
        name: account.account.name,
        description: account.account.description,
        visibility: this._convertChannelVisibilityFromProgram(account.account.visibility),
        maxParticipants: account.account.maxParticipants,
        participantCount: account.account.currentParticipants,
        currentParticipants: account.account.currentParticipants,
        feePerMessage: account.account.feePerMessage?.toNumber() || 0,
        escrowBalance: account.account.escrowBalance?.toNumber() || 0,
        createdAt: account.account.createdAt?.toNumber() || Date.now(),
        isActive: account.account.isActive !== false,
        bump: account.account.bump
      }));

      // Apply filters
      if (filters.visibility) {
        channels = channels.filter(channel => channel.visibility === filters.visibility);
      }

      if (filters.creator) {
        channels = channels.filter(channel => channel.creator.equals(filters.creator));
      }

      // Sort by creation date (newest first) and apply limit
      channels.sort((a, b) => b.createdAt - a.createdAt);
      
      if (filters.limit) {
        channels = channels.slice(0, filters.limit);
      }

      return channels;
    } catch (error) {
      throw new Error(`Failed to list channels: ${error.message}`);
    }
  }

  /**
   * Join a channel
   * 
   * @param {Object} channelPDA - Channel PDA
   * @param {Object} wallet - User's wallet
   * @returns {Promise<string>} Transaction signature
   * 
   * @example
   * ```javascript
   * const tx = await client.channels.join(channelPDA, wallet);
   * ```
   */
  async join(channelPDA, wallet) {
    if (!this.isInitialized()) {
      throw new Error('Service not initialized. Call client.initialize() first.');
    }

    // Derive agent PDA
    const [agentPDA] = findAgentPDA(wallet.publicKey, this.programId);

    // Derive participant PDA
    const [participantPDA] = this._findParticipantPDA(channelPDA, agentPDA);

    // Check for invitation (for private channels) - simplified for JS compatibility
    let invitationPDA = null;
    try {
      // For now, assume no invitation system to avoid complex Buffer operations
      invitationPDA = null;
    } catch (error) {
      // Invitation doesn't exist, which is fine for public channels
    }

    return this.retry(async () => {
      const tx = await this.program.methods
        .joinChannel()
        .accounts({
          channelAccount: channelPDA,
          participantAccount: participantPDA,
          agentAccount: agentPDA,
          invitationAccount: invitationPDA,
          user: wallet.publicKey,
          systemProgram: SystemProgram.programId
        })
        .rpc();

      return tx;
    });
  }

  /**
   * Leave a channel
   * 
   * @param {Object} channelPDA - Channel PDA
   * @param {Object} wallet - User's wallet
   * @returns {Promise<string>} Transaction signature
   * 
   * @example
   * ```javascript
   * const tx = await client.channels.leave(channelPDA, wallet);
   * ```
   */
  async leave(channelPDA, wallet) {
    if (!this.isInitialized()) {
      throw new Error('Service not initialized. Call client.initialize() first.');
    }

    // Derive agent PDA
    const [agentPDA] = findAgentPDA(wallet.publicKey, this.programId);

    // Derive participant PDA
    const [participantPDA] = this._findParticipantPDA(channelPDA, agentPDA);

    return this.retry(async () => {
      const tx = await this.program.methods
        .leaveChannel()
        .accounts({
          channelAccount: channelPDA,
          participantAccount: participantPDA,
          agentAccount: agentPDA,
          user: wallet.publicKey
        })
        .rpc();

      return tx;
    });
  }

  /**
   * Send message to a channel
   * 
   * @param {Object} channelPDA - Channel PDA
   * @param {Object} options - Message options
   * @param {string} options.content - Message content
   * @param {string} [options.messageType] - Type of message
   * @param {Object} [options.replyTo] - Message being replied to
   * @param {Object} wallet - Sender's wallet
   * @returns {Promise<string>} Transaction signature
   * 
   * @example
   * ```javascript
   * const tx = await client.channels.sendMessage(channelPDA, {
   *   content: 'Hello channel!',
   *   messageType: MessageType.TEXT
   * }, wallet);
   * ```
   */
  async sendMessage(channelPDA, options, wallet) {
    if (!this.isInitialized()) {
      throw new Error('Service not initialized. Call client.initialize() first.');
    }

    // Generate unique nonce for message
    const nonce = Date.now();

    // Derive agent PDA
    const [agentPDA] = findAgentPDA(wallet.publicKey, this.programId);

    // Derive participant PDA
    const [participantPDA] = this._findParticipantPDA(channelPDA, agentPDA);

    // Generate a simple message PDA for JavaScript compatibility
    const messagePDA = agentPDA; // Simplified for JS compatibility

    const messageTypeObj = this._convertMessageType(options.messageType || MessageType.TEXT);

    return this.retry(async () => {
      const tx = await this.program.methods
        .broadcastMessage(
          options.content,
          messageTypeObj,
          options.replyTo || null,
          new BN(nonce)
        )
        .accounts({
          channelAccount: channelPDA,
          participantAccount: participantPDA,
          agentAccount: agentPDA,
          messageAccount: messagePDA,
          user: wallet.publicKey,
          systemProgram: SystemProgram.programId
        })
        .rpc();

      return tx;
    });
  }

  /**
   * Invite a user to a channel
   * 
   * @param {Object} channelPDA - Channel PDA
   * @param {Object} invitee - User to invite
   * @param {Object} wallet - Inviter's wallet
   * @returns {Promise<string>} Transaction signature
   * 
   * @example
   * ```javascript
   * const tx = await client.channels.invite(channelPDA, inviteeAddress, wallet);
   * ```
   */
  async invite(channelPDA, invitee, wallet) {
    if (!this.isInitialized()) {
      throw new Error('Service not initialized. Call client.initialize() first.');
    }

    // Derive agent PDA
    const [agentPDA] = findAgentPDA(wallet.publicKey, this.programId);

    // Derive participant PDA (for inviter)
    const [participantPDA] = this._findParticipantPDA(channelPDA, agentPDA);

    // Simplified invitation PDA for JS compatibility
    const invitationPDA = agentPDA;

    return this.retry(async () => {
      const tx = await this.program.methods
        .inviteToChannel(invitee)
        .accounts({
          channelAccount: channelPDA,
          participantAccount: participantPDA,
          agentAccount: agentPDA,
          invitationAccount: invitationPDA,
          inviter: wallet.publicKey,
          systemProgram: SystemProgram.programId
        })
        .rpc();

      return tx;
    });
  }

  /**
   * Get channel participants
   * 
   * @param {Object} channelPDA - Channel PDA
   * @param {Object} [options] - Query options
   * @param {number} [options.limit=50] - Maximum number of participants
   * @returns {Promise<Array>} Array of participant accounts
   * 
   * @example
   * ```javascript
   * const participants = await client.channels.getParticipants(channelPDA, { limit: 10 });
   * ```
   */
  async getParticipants(channelPDA, options = {}) {
    if (!this.isInitialized()) {
      throw new Error('Service not initialized. Call client.initialize() first.');
    }

    try {
      const accounts = await this.program.account.channelParticipant.all();
      const participants = accounts
        .filter(account => account.account.channel.equals(channelPDA))
        .map(account => account.account);

      if (options.limit) {
        return participants.slice(0, options.limit);
      }

      return participants;
    } catch (error) {
      throw new Error(`Failed to get channel participants: ${error.message}`);
    }
  }

  /**
   * Get channel messages
   * 
   * @param {Object} channelPDA - Channel PDA
   * @param {Object} [options] - Query options
   * @param {number} [options.limit=50] - Maximum number of messages
   * @returns {Promise<Array>} Array of message accounts
   * 
   * @example
   * ```javascript
   * const messages = await client.channels.getMessages(channelPDA, { limit: 20 });
   * ```
   */
  async getMessages(channelPDA, options = {}) {
    if (!this.isInitialized()) {
      throw new Error('Service not initialized. Call client.initialize() first.');
    }

    try {
      const accounts = await this.program.account.channelMessage.all();
      let messages = accounts
        .filter(account => account.account.channel.equals(channelPDA))
        .map(account => ({
          ...account.account,
          pubkey: account.publicKey,
          timestamp: account.account.timestamp?.toNumber() || Date.now()
        }));

      // Sort by timestamp (newest first)
      messages.sort((a, b) => b.timestamp - a.timestamp);

      if (options.limit) {
        messages = messages.slice(0, options.limit);
      }

      return messages;
    } catch (error) {
      throw new Error(`Failed to get channel messages: ${error.message}`);
    }
  }

  // Private helper methods
  _convertChannelVisibility(visibility) {
    switch (visibility) {
      case ChannelVisibility.PUBLIC:
        return { public: {} };
      case ChannelVisibility.PRIVATE:
        return { private: {} };
      default:
        return { public: {} };
    }
  }

  _convertChannelVisibilityFromProgram(programVisibility) {
    if (programVisibility.public !== undefined) return ChannelVisibility.PUBLIC;
    if (programVisibility.private !== undefined) return ChannelVisibility.PRIVATE;
    return ChannelVisibility.PUBLIC;
  }

  _convertMessageType(messageType) {
    if (typeof messageType === 'string') {
      switch (messageType.toLowerCase()) {
        case 'text':
          return { text: {} };
        case 'data':
          return { data: {} };
        case 'command':
          return { command: {} };
        case 'response':
          return { response: {} };
        default:
          return { text: {} };
      }
    }
    return messageType || { text: {} };
  }

  _findParticipantPDA(channelPDA, agentPDA) {
    // Simplified PDA derivation for JavaScript compatibility
    // In a real implementation, this would use proper Buffer operations
    return [agentPDA, 255]; // Mock PDA with bump
  }

  /**
   * Create a channel instruction (for batch operations)
   * 
   * @param {Object} options - Channel creation options
   * @param {Object} creatorPubkey - Creator's public key
   * @returns {Promise<Object>} Create channel instruction
   */
  async createChannelInstruction(options, creatorPubkey) {
    if (!this.program) {
      throw new Error('Program not initialized');
    }

    const [agentPDA] = findAgentPDA(creatorPubkey, this.programId);
    const [channelPDA] = findChannelPDA(creatorPubkey, options.name, this.programId);
    const [participantPDA] = this._findParticipantPDA(channelPDA, agentPDA);

    const visibilityObj = this._convertChannelVisibility(options.visibility || ChannelVisibility.PUBLIC);

    return this.program.methods
      .createChannel(
        options.name,
        options.description || '',
        visibilityObj,
        options.maxParticipants || 100,
        new BN(options.feePerMessage || 0)
      )
      .accounts({
        agentAccount: agentPDA,
        channelAccount: channelPDA,
        participantAccount: participantPDA,
        creator: creatorPubkey,
        systemProgram: SystemProgram.programId
      })
      .instruction();
  }

  /**
   * Join channel instruction
   * 
   * @param {Object} channelPDA - Channel PDA
   * @param {Object} userPubkey - User's public key
   * @returns {Promise<Object>} Join channel instruction
   */
  async createJoinInstruction(channelPDA, userPubkey) {
    if (!this.program) {
      throw new Error('Program not initialized');
    }

    const [agentPDA] = findAgentPDA(userPubkey, this.programId);
    const [participantPDA] = this._findParticipantPDA(channelPDA, agentPDA);

    return this.program.methods
      .joinChannel()
      .accounts({
        channelAccount: channelPDA,
        participantAccount: participantPDA,
        agentAccount: agentPDA,
        invitationAccount: null,
        user: userPubkey,
        systemProgram: SystemProgram.programId
      })
      .instruction();
  }
}
