/**
 * Channel service for PoD Protocol SDK
 */

import { BaseService } from './base.js';
import { Address, address } from '@solana/web3.js';
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
   * @param {CreateChannelOptions} options - Channel creation options
   * @param {KeyPairSigner} wallet - Creator's wallet
   * @returns {Promise} Transaction signature
   * 
   * @example
   * ```javascript
   * const tx = await client.channels.create({
   *   name: 'ai-collective',
   *   description: 'A channel for AI collaboration',
   *   visibility.PUBLIC,
   *   maxParticipants,
   *   feePerMessage
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
          agentAccount,
          channelAccount,
          participantAccount,
          creator.publicKey,
          systemProgram.programId
        })
        .rpc();

      return tx;
    });
  }

  /**
   * Get channel data
   * 
   * @param {Address} channelPDA - Channel PDA
   * @returns {Promise} Channel account data
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
        pubkey,
        creator.creator,
        name.name,
        description.description,
        visibility._convertChannelVisibilityFromProgram(account.visibility),
        maxParticipants.maxParticipants,
        participantCount.currentParticipants,
        currentParticipants.currentParticipants,
        feePerMessage.feePerMessage?.toNumber() || 0,
        escrowBalance.escrowBalance?.toNumber() || 0,
        createdAt.createdAt?.toNumber() || Date.now(),
        isActive.isActive !== false,
        bump.bump
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
   * @param {ChannelVisibility} [filters.visibility] - Filter by visibility
   * @param {Address} [filters.creator] - Filter by creator
   * @returns {Promise} Array of channel accounts
   * 
   * @example
   * ```javascript
   * const publicChannels = await client.channels.list({
   *   visibility.PUBLIC,
   *   limit
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
        pubkey.publicKey,
        creator.account.creator,
        name.account.name,
        description.account.description,
        visibility._convertChannelVisibilityFromProgram(account.account.visibility),
        maxParticipants.account.maxParticipants,
        participantCount.account.currentParticipants,
        currentParticipants.account.currentParticipants,
        feePerMessage.account.feePerMessage?.toNumber() || 0,
        escrowBalance.account.escrowBalance?.toNumber() || 0,
        createdAt.account.createdAt?.toNumber() || Date.now(),
        isActive.account.isActive !== false,
        bump.account.bump
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
   * @param {Address} channelPDA - Channel PDA
   * @param {KeyPairSigner} wallet - User's wallet
   * @returns {Promise} Transaction signature
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

    // Check for invitation (for private channels)
    const [invitationPDA] = Address.findProgramAddressSync(
      [
        Buffer.from('invitation'),
        channelPDA.toBuffer(),
        wallet.publicKey.toBuffer()
      ],
      this.programId
    );

    // Check if invitation exists
    let invitationAccount = null;
    try {
      invitationAccount = await this.program.account.channelInvitation.fetch(invitationPDA);
    } catch (error) {
      // Invitation doesn't exist, which is fine for public channels
    }

    return this.retry(async () => {
      const tx = await this.program.methods
        .joinChannel()
        .accounts({
          channelAccount,
          participantAccount,
          agentAccount,
          invitationAccount ? invitationPDA ,
          user.publicKey,
          systemProgram.programId
        })
        .rpc();

      return tx;
    });
  }

  /**
   * Leave a channel
   * 
   * @param {Address} channelPDA - Channel PDA
   * @param {KeyPairSigner} wallet - User's wallet
   * @returns {Promise} Transaction signature
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
          channelAccount,
          participantAccount,
          agentAccount,
          user.publicKey
        })
        .rpc();

      return tx;
    });
  }

  /**
   * Send message to a channel
   * 
   * @param {Address} channelPDA - Channel PDA
   * @param {Object} options - Message options
   * @param {string} options.content - Message content
   * @param {MessageType} [options.messageType] - Type of message
   * @param {Address} [options.replyTo] - Message being replied to
   * @param {KeyPairSigner} wallet - Sender's wallet
   * @returns {Promise} Transaction signature
   * 
   * @example
   * ```javascript
   * const tx = await client.channels.sendMessage(channelPDA, {
   *   content: 'Hello channel!',
   *   messageType.TEXT
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

    // Derive message PDA
    const nonceBuffer = Buffer.alloc(8);
    nonceBuffer.writeBigUInt64LE(BigInt(nonce), 0);

    const [messagePDA] = Address.findProgramAddressSync(
      [
        Buffer.from('channel_message'),
        channelPDA.toBuffer(),
        wallet.publicKey.toBuffer(),
        nonceBuffer
      ],
      this.programId
    );

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
          channelAccount,
          participantAccount,
          agentAccount,
          messageAccount,
          user.publicKey,
          systemProgram.programId
        })
        .rpc();

      return tx;
    });
  }

  /**
   * Invite a user to a channel
   * 
   * @param {Address} channelPDA - Channel PDA
   * @param {Address} invitee - User to invite
   * @param {KeyPairSigner} wallet - Inviter's wallet
   * @returns {Promise} Transaction signature
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

    // Derive invitation PDA
    const [invitationPDA] = Address.findProgramAddressSync(
      [Buffer.from('invitation'), channelPDA.toBuffer(), invitee.toBuffer()],
      this.programId
    );

    return this.retry(async () => {
      const tx = await this.program.methods
        .inviteToChannel(invitee)
        .accounts({
          channelAccount,
          participantAccount,
          agentAccount,
          invitationAccount,
          inviter.publicKey,
          systemProgram.programId
        })
        .rpc();

      return tx;
    });
  }

  /**
   * Get channel participants
   * 
   * @param {Address} channelPDA - Channel PDA
   * @param {Object} [options] - Query options
   * @param {number} [options.limit=50] - Maximum number of participants
   * @returns {Promise} Array of participant accounts
   * 
   * @example
   * ```javascript
   * const participants = await client.channels.getParticipants(channelPDA, { limit });
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
   * @param {Address} channelPDA - Channel PDA
   * @param {Object} [options] - Query options
   * @param {number} [options.limit=50] - Maximum number of messages
   * @returns {Promise} Array of message accounts
   * 
   * @example
   * ```javascript
   * const messages = await client.channels.getMessages(channelPDA, { limit });
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
          pubkey.publicKey,
          timestamp.account.timestamp?.toNumber() || Date.now()
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
      case ChannelVisibility.PUBLIC { public: {} };
      case ChannelVisibility.PRIVATE { private: {} };
      default { public: {} };
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
        case 'text' { text: {} };
        case 'data' { data: {} };
        case 'command' { command: {} };
        case 'response' { response: {} };
        default { text: {} };
      }
    }
    return messageType || { text: {} };
  }

  _findParticipantPDA(channelPDA, agentPDA) {
    return Address.findProgramAddressSync(
      [Buffer.from('participant'), channelPDA.toBuffer(), agentPDA.toBuffer()],
      this.programId
    );
  }
}
