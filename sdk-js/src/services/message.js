/**
 * Message service for PoD Protocol SDK
 */

import { BaseService } from './base.js';
import { BN } from '@coral-xyz/anchor';
import { SystemProgram } from '@solana/web3.js';
import { findMessagePDA, findAgentPDA } from '../utils/pda.js';
import { hashPayload } from '../utils/crypto.js';
import { MessageType } from '../types.js';

/**
 * Service for managing messages in the PoD Protocol
 * 
 * @class MessageService
 * @extends BaseService
 */
export class MessageService extends BaseService {
  /**
   * Send a message to another agent
   * 
   * @param {Object} options - Message options
   * @param {Object} wallet - Sender's wallet
   * @returns {Promise<string>} Transaction signature
   * 
   * @example
   * ```javascript
   * const tx = await client.messages.send({
   *   recipient: recipientAddress,
   *   content: 'Hello from PoD Protocol!',
   *   messageType: MessageType.TEXT,
   *   expirationDays: 7
   * }, wallet);
   * ```
   */
  async send(options, wallet) {
    if (!this.isInitialized()) {
      throw new Error('Service not initialized. Call client.initialize() first.');
    }

    // Derive recipient agent PDA
    const [recipientPDA] = await findAgentPDA(options.recipient, this.programId);

    // Create payload hash
    const payloadHash = await this.hashPayload(options.content);

    // Calculate expiration timestamp (default 7 days)
    const expirationDays = options.expirationDays || 7;
    const expiresAt = Math.floor(Date.now() / 1000) + (expirationDays * 24 * 60 * 60);

    // Derive message PDA
    const [messagePDA] = await findMessagePDA(
      wallet.publicKey,
      options.recipient,
      this.programId
    );

    return this.retry(async () => {
      const tx = await this.program.methods
        .sendMessage(
          options.recipient,
          Array.from(payloadHash),
          options.content,
          options.messageType || 0,
          new BN(expiresAt)
        )
        .accounts({
          messageAccount: messagePDA,
          sender: wallet.publicKey,
          recipient: options.recipient,
          recipientAgent: recipientPDA,
          systemProgram: SystemProgram.programId
        })
        .rpc();

      return tx;
    });
  }

  /**
   * Get a message by its PDA
   * 
   * @param {Object} messagePDA - Message PDA
   * @returns {Promise<Object|null>} Message account data
   * 
   * @example
   * ```javascript
   * const message = await client.messages.get(messagePDA);
   * if (message) {
   *   console.log('Message content:', message.payload);
   *   console.log('Message status:', message.status);
   * }
   * ```
   */
  async get(messagePDA) {
    if (!this.isInitialized()) {
      throw new Error('Service not initialized. Call client.initialize() first.');
    }

    try {
      const messageAccount = await this.program.account.messageAccount.fetch(messagePDA);
      
      return {
        pubkey: messagePDA,
        ...messageAccount,
        // Convert BN to number for JavaScript compatibility
        timestamp: messageAccount.timestamp.toNumber(),
        createdAt: messageAccount.timestamp.toNumber(),
        expiresAt: messageAccount.expiresAt.toNumber()
      };
    } catch (error) {
      if (error.message?.includes('Account does not exist')) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Get messages for an agent (sent or received)
   * 
   * @param {Object} agentPubkey - Agent's public key
   * @param {Object} [options] - Query options
   * @param {string} [options.direction='both'] - 'sent', 'received', or 'both'
   * @param {number} [options.limit=100] - Maximum number of messages
   * @param {string} [options.status] - Filter by message status
   * @returns {Promise<Array>} Array of message accounts
   * 
   * @example
   * ```javascript
   * // Get last 50 received messages
   * const messages = await client.messages.getForAgent(agentAddress, {
   *   direction: 'received',
   *   limit: 50
   * });
   * ```
   */
  async getForAgent(agentPubkey, options = {}) {
    if (!this.isInitialized()) {
      throw new Error('Service not initialized. Call client.initialize() first.');
    }

    try {
      const accounts = await this.program.account.messageAccount.all();
      let messages = accounts
        .map(account => ({
          pubkey: account.publicKey,
          ...account.account,
          timestamp: account.account.timestamp.toNumber(),
          createdAt: account.account.timestamp.toNumber(),
          expiresAt: account.account.expiresAt.toNumber()
        }))
        .filter(message => {
          const direction = options.direction || 'both';
          
          if (direction === 'sent') {
            return message.sender.equals(agentPubkey);
          } else if (direction === 'received') {
            return message.recipient.equals(agentPubkey);
          } else {
            return message.sender.equals(agentPubkey) || message.recipient.equals(agentPubkey);
          }
        });

      // Filter by status if specified
      if (options.status) {
        messages = messages.filter(message => message.status === options.status);
      }

      // Sort by timestamp (newest first) and apply limit
      messages.sort((a, b) => b.timestamp - a.timestamp);
      
      if (options.limit) {
        messages = messages.slice(0, options.limit);
      }

      return messages;
    } catch (error) {
      throw new Error(`Failed to get messages: ${error.message}`);
    }
  }

  /**
   * Mark a message as read
   * 
   * @param {Object} messagePDA - Message PDA
   * @param {Object} wallet - Recipient's wallet
   * @returns {Promise<string>} Transaction signature
   * 
   * @example
   * ```javascript
   * const tx = await client.messages.markAsRead(messagePDA, wallet);
   * ```
   */
  async markAsRead(messagePDA, wallet) {
    if (!this.isInitialized()) {
      throw new Error('Service not initialized. Call client.initialize() first.');
    }

    return this.retry(async () => {
      const tx = await this.program.methods
        .updateMessageStatus('read')
        .accounts({
          messageAccount: messagePDA,
          signer: wallet.publicKey
        })
        .rpc();

      return tx;
    });
  }

  /**
   * Delete a message (only sender can delete)
   * 
   * @param {Object} messagePDA - Message PDA
   * @param {Object} wallet - Sender's wallet
   * @returns {Promise<string>} Transaction signature
   * 
   * @example
   * ```javascript
   * const tx = await client.messages.delete(messagePDA, wallet);
   * ```
   */
  async delete(messagePDA, wallet) {
    if (!this.isInitialized()) {
      throw new Error('Service not initialized. Call client.initialize() first.');
    }

    return this.retry(async () => {
      const tx = await this.program.methods
        .deleteMessage()
        .accounts({
          messageAccount: messagePDA,
          sender: wallet.publicKey
        })
        .rpc();

      return tx;
    });
  }

  /**
   * Get conversation between two agents
   * 
   * @param {Object} agent1 - First agent's public key
   * @param {Object} agent2 - Second agent's public key
   * @param {Object} [options] - Query options
   * @param {number} [options.limit=100] - Maximum number of messages
   * @returns {Promise<Array>} Array of message accounts
   * 
   * @example
   * ```javascript
   * const conversation = await client.messages.getConversation(
   *   myAgentKey, 
   *   otherAgentKey,
   *   { limit: 50 }
   * );
   * ```
   */
  async getConversation(agent1, agent2, options = {}) {
    if (!this.isInitialized()) {
      throw new Error('Service not initialized. Call client.initialize() first.');
    }

    try {
      const accounts = await this.program.account.messageAccount.all();
      let messages = accounts
        .map(account => ({
          pubkey: account.publicKey,
          ...account.account,
          timestamp: account.account.timestamp.toNumber(),
          createdAt: account.account.timestamp.toNumber(),
          expiresAt: account.account.expiresAt.toNumber()
        }))
        .filter(message => 
          (message.sender.equals(agent1) && message.recipient.equals(agent2)) ||
          (message.sender.equals(agent2) && message.recipient.equals(agent1))
        );

      // Sort by timestamp (oldest first for conversation view)
      messages.sort((a, b) => a.timestamp - b.timestamp);
      
      if (options.limit) {
        messages = messages.slice(-options.limit); // Get last N messages
      }

      return messages;
    } catch (error) {
      throw new Error(`Failed to get conversation: ${error.message}`);
    }
  }

  /**
   * Get unread message count for an agent
   * 
   * @param {Object} agentPubkey - Agent's public key
   * @returns {Promise<number>} Number of unread messages
   * 
   * @example
   * ```javascript
   * const unreadCount = await client.messages.getUnreadCount(agentAddress);
   * console.log(`You have ${unreadCount} unread messages`);
   * ```
   */
  async getUnreadCount(agentPubkey) {
    const messages = await this.getForAgent(agentPubkey, {
      direction: 'received',
      status: 'delivered'
    });
    
    return messages.length;
  }

  /**
   * Send a message instruction (for batch operations)
   * 
   * @param {Object} options - Message options  
   * @param {Object} senderPubkey - Sender's public key
   * @returns {Promise<Object>} Send message instruction
   */
  async createSendInstruction(options, senderPubkey) {
    if (!this.program) {
      throw new Error('Program not initialized');
    }

    const payloadHash = hashPayload(options.content);
    const [messagePDA] = findMessagePDA(
      senderPubkey,
      options.recipient,
      payloadHash,
      this.programId
    );

    const expirationDays = options.expirationDays || 7;
    const expiresAt = Math.floor(Date.now() / 1000) + (expirationDays * 24 * 60 * 60);

    return this.program.methods
      .sendMessage(
        Array.from(payloadHash),
        options.content,
        options.messageType || MessageType.TEXT,
        new BN(expiresAt)
      )
      .accounts({
        messageAccount: messagePDA,
        sender: senderPubkey,
        recipient: options.recipient,
        systemProgram: SystemProgram.programId
      })
      .instruction();
  }

  /**
   * Update message status instruction
   * 
   * @param {Object} messagePDA - Message PDA
   * @param {string} status - New status
   * @param {Object} signerPubkey - Signer's public key
   * @returns {Promise<Object>} Update status instruction
   */
  async createUpdateStatusInstruction(messagePDA, status, signerPubkey) {
    if (!this.program) {
      throw new Error('Program not initialized');
    }

    return this.program.methods
      .updateMessageStatus(status)
      .accounts({
        messageAccount: messagePDA,
        signer: signerPubkey
      })
      .instruction();
  }

  /**
   * Get message by PDA
   * @private
   */
  async _getMessageByPDA(senderPubkey, recipientPubkey) {
    try {
      const [messagePDA] = await findMessagePDA(
        senderPubkey,
        recipientPubkey,
        this.programId
      );
      
      const messageAccount = await this.program.account.messageAccount.fetch(messagePDA);
      return {
        pubkey: messagePDA,
        ...messageAccount,
        // Convert BN fields to numbers for JavaScript compatibility
        timestamp: messageAccount.timestamp.toNumber(),
        expiresAt: messageAccount.expiresAt.toNumber()
      };
    } catch (error) {
      if (error.message?.includes('Account does not exist')) {
        return null;
      }
      throw error;
    }
  }
}
