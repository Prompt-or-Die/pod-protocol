/**
 * Message service for PoD Protocol SDK
 */

import { BaseService } from './base.js';
import { Address, address } from '@solana/web3.js';
import { BN } from '@coral-xyz/anchor';
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
   * @param {SendMessageOptions} options - Message options
   * @param {KeyPairSigner} wallet - Sender's wallet
   * @returns {Promise} Transaction signature
   * 
   * @example
   * ```javascript
   * const tx = await client.messages.send({
   *   recipient,
   *   content: 'Hello from PoD Protocol!',
   *   messageType.TEXT,
   *   expirationDays
   * }, wallet);
   * ```
   */
  async send(options, wallet) {
    if (!this.isInitialized()) {
      throw new Error('Service not initialized. Call client.initialize() first.');
    }

    // Validate recipient exists
    const [recipientPDA] = findAgentPDA(options.recipient, this.programId);
    try {
      await this.program.account.agentAccount.fetch(recipientPDA);
    } catch (error) {
      throw new Error('Recipient agent not found');
    }

    // Hash the payload
    const payloadHash = hashPayload(options.content);
    const [messagePDA] = findMessagePDA(
      wallet.publicKey,
      options.recipient,
      payloadHash,
      this.programId
    );

    // Calculate expiration timestamp
    const expirationDays = options.expirationDays || 7;
    const expiresAt = Math.floor(Date.now() / 1000) + (expirationDays * 24 * 60 * 60);

    return this.retry(async () => {
      const tx = await this.program.methods
        .sendMessage(
          Array.from(payloadHash),
          options.content,
          options.messageType || MessageType.TEXT,
          new BN(expiresAt)
        )
        .accounts({
          messageAccount,
          sender.publicKey,
          recipient.recipient,
          systemProgram.programId
        })
        .rpc();

      return tx;
    });
  }

  /**
   * Get a message by its PDA
   * 
   * @param {Address} messagePDA - Message PDA
   * @returns {Promise} Message account data
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
        pubkey,
        ...messageAccount,
        // Convert BN to number for JavaScript compatibility
        timestamp.timestamp.toNumber(),
        createdAt.timestamp.toNumber(),
        expiresAt.expiresAt.toNumber()
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
   * @param {Address} agentPubkey - Agent's public key
   * @param {Object} [options] - Query options
   * @param {string} [options.direction='both'] - 'sent', 'received', or 'both'
   * @param {number} [options.limit=100] - Maximum number of messages
   * @param {string} [options.status] - Filter by message status
   * @returns {Promise} Array of message accounts
   * 
   * @example
   * ```javascript
   * // Get last 50 received messages
   * const messages = await client.messages.getForAgent(agentAddress, {
   *   direction: 'received',
   *   limit
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
          pubkey.publicKey,
          ...account.account,
          timestamp.account.timestamp.toNumber(),
          createdAt.account.timestamp.toNumber(),
          expiresAt.account.expiresAt.toNumber()
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
   * @param {Address} messagePDA - Message PDA
   * @param {KeyPairSigner} wallet - Recipient's wallet
   * @returns {Promise} Transaction signature
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
          messageAccount,
          signer.publicKey
        })
        .rpc();

      return tx;
    });
  }

  /**
   * Delete a message (only sender can delete)
   * 
   * @param {Address} messagePDA - Message PDA
   * @param {KeyPairSigner} wallet - Sender's wallet
   * @returns {Promise} Transaction signature
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
          messageAccount,
          sender.publicKey
        })
        .rpc();

      return tx;
    });
  }

  /**
   * Get conversation between two agents
   * 
   * @param {Address} agent1 - First agent's public key
   * @param {Address} agent2 - Second agent's public key
   * @param {Object} [options] - Query options
   * @param {number} [options.limit=100] - Maximum number of messages
   * @returns {Promise} Array of message accounts
   * 
   * @example
   * ```javascript
   * const conversation = await client.messages.getConversation(
   *   myAgentKey, 
   *   otherAgentKey,
   *   { limit }
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
          pubkey.publicKey,
          ...account.account,
          timestamp.account.timestamp.toNumber(),
          createdAt.account.timestamp.toNumber(),
          expiresAt.account.expiresAt.toNumber()
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
   * @param {Address} agentPubkey - Agent's public key
   * @returns {Promise} Number of unread messages
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
}
