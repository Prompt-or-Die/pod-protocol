import { Message, MessageType, MessageStatus } from '@prisma/client';
import { prisma } from '../lib/database.js';
import { PodComClient, Keypair, Connection, clusterApiUrl, PublicKey } from '@pod-protocol/sdk';
import { logger } from '../lib/logger.js';

// TODO: Implement secure wallet management for the API server.
// For now, using a placeholder keypair. This is NOT secure for production.
const placeholderKeypair = Keypair.generate();
const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
const sdkClient = new PodComClient(connection, placeholderKeypair);

export interface CreateMessageData {
  content: string;
  type?: MessageType;
  channelId: string;
  senderId: string;
  agentId?: string;
  transactionSignature?: string;
}

export interface UpdateMessageData {
  content?: string;
  status?: MessageStatus;
}

export class MessageService {
  /**
   * Create a new message
   */
  static async createMessage(data: CreateMessageData): Promise<Message> {
    try {
      // Ensure sender and channel public keys are available
      const sender = await prisma.user.findUnique({ where: { id: data.senderId } });
      const channel = await prisma.channel.findUnique({ where: { id: data.channelId } });

      if (!sender || !sender.publicKey) {
        throw new Error('Sender public key not found.');
      }
      if (!channel || !channel.publicKey) {
        throw new Error('Channel public key not found.');
      }

      // Send message on-chain via SDK
      const tx = await sdkClient.messages.sendMessage(
        placeholderKeypair,
        {
          recipient: new PublicKey(channel.publicKey), // Assuming channel is the recipient
          payload: data.content,
          messageType: data.type || MessageType.TEXT, // Default to TEXT if not provided
        }
      );
      logger.info(`Message sent on-chain. Transaction: ${tx}`);

      // Store message data in the database
      return await prisma.message.create({
        data: {
          ...data,
          transactionSignature: tx,
        },
        include: {
          sender: {
            select: { id: true, publicKey: true }
          },
          agent: {
            select: { id: true, name: true }
          },
          channel: {
            select: { id: true, name: true }
          }
        }
      });
    } catch (error) {
      logger.error('Failed to create message on-chain or in database:', error);
      throw error;
    }
  }

  /**
   * Get messages for a channel with pagination
   */
  static async getChannelMessages(channelId: string, options: {
    page?: number;
    limit?: number;
    before?: Date;
    after?: Date;
  }) {
    // For now, primarily query the database as it acts as an index/cache.
    // TODO: Implement periodic syncing of on-chain messages to the database.
    const { page = 1, limit = 50, before, after } = options;
    const skip = (page - 1) * limit;

    const where: any = { channelId };
    
    if (before || after) {
      where.createdAt = {};
      if (before) where.createdAt.lt = before;
      if (after) where.createdAt.gt = after;
    }

    const [messages, total] = await Promise.all([
      prisma.message.findMany({
        where,
        skip,
        take: limit,
        include: {
          sender: {
            select: { id: true, publicKey: true }
          },
          agent: {
            select: { id: true, name: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.message.count({ where })
    ]);

    return {
      messages: messages.reverse(), // Return in chronological order
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: total > skip + limit
      }
    };
  }

  /**
   * Get message by ID
   */
  static async getMessageById(id: string) {
    // First, try to get from database to get the transaction signature or other identifiers
    const dbMessage = await prisma.message.findUnique({
      where: { id },
      include: {
        sender: {
          select: { id: true, publicKey: true }
        },
        agent: {
          select: { id: true, name: true }
        },
        channel: {
          select: { id: true, name: true }
        }
      }
    });

    if (!dbMessage || !dbMessage.transactionSignature) {
      return null;
    }

    try {
      // TODO: The SDK's getMessage requires a message PDA, not a transaction signature.
      // This will require a way to derive the message PDA from the transaction signature or other means.
      // For now, we'll just return the database message.
      logger.warn(`On-chain message fetching for ID ${id} is not fully implemented yet.`);
      return dbMessage;

      // Example of how it *would* work if we had the PDA:
      // const messagePDA = deriveMessagePDA(dbMessage.transactionSignature);
      // const onChainMessage = await sdkClient.messages.getMessage(messagePDA);
      // if (!onChainMessage) {
      //   logger.warn(`Message with ID ${id} found in DB but not on-chain.`);
      //   return null; // Message not found on-chain
      // }
      // return { ...dbMessage, ...onChainMessage }; // Combine on-chain and off-chain data

    } catch (error) {
      logger.error(`Failed to fetch on-chain message for ID ${id}:`, error);
      throw error;
    }
  }

  /**
   * Update message
   */
  static async updateMessage(id: string, data: UpdateMessageData): Promise<Message> {
    const dbMessage = await prisma.message.findUnique({ where: { id } });
    if (!dbMessage || !dbMessage.transactionSignature) {
      throw new Error(`Message with ID ${id} not found or missing transaction signature.`);
    }

    try {
      // Update message status on-chain via SDK if relevant data is provided
      if (data.status !== undefined) {
        // TODO: This requires the message PDA, which we don't have directly from the DB yet.
        // const messagePDA = deriveMessagePDA(dbMessage.transactionSignature);
        // const tx = await sdkClient.messages.updateMessageStatus(placeholderKeypair as KeyPairSigner, messagePDA, data.status);
        // logger.info(`Message status updated on-chain. Transaction: ${tx}`);
        logger.warn(`On-chain message status update for ID ${id} is not fully implemented yet.`);
      }

      // Update message data in the database
      return await prisma.message.update({
        where: { id },
        data,
        include: {
          sender: {
            select: { id: true, publicKey: true }
          },
          agent: {
            select: { id: true, name: true }
          }
        }
      });
    } catch (error) {
      logger.error('Failed to update message on-chain or in database:', error);
      throw error;
    }
  }

  /**
   * Delete message
   */
  static async deleteMessage(id: string): Promise<void> {
    // No direct on-chain delete for messages in SDK.
    // For now, only delete from the database.
    // TODO: Consider implementing an on-chain "deactivate" or "close" if protocol supports it.
    try {
      await prisma.message.delete({
        where: { id }
      });
      logger.info(`Message with ID ${id} deleted from database.`);
    } catch (error) {
      logger.error(`Failed to delete message with ID ${id} from database:`, error);
      throw error;
    }
  }

  /**
   * Get messages by sender
   */
  static async getMessagesBySender(senderId: string, options: {
    page?: number;
    limit?: number;
    channelId?: string;
  }) {
    const { page = 1, limit = 50, channelId } = options;
    const skip = (page - 1) * limit;

    const where: any = { senderId };
    if (channelId) where.channelId = channelId;

    const [messages, total] = await Promise.all([
      prisma.message.findMany({
        where,
        skip,
        take: limit,
        include: {
          channel: {
            select: { id: true, name: true }
          },
          agent: {
            select: { id: true, name: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.message.count({ where })
    ]);

    return {
      messages,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Get recent messages across all channels user has access to
   */
  static async getRecentMessages(userId: string, limit = 20) {
    // Get channels the user is a member of
    const userChannels = await prisma.channelMember.findMany({
      where: { userId },
      select: { channelId: true }
    });

    const channelIds = userChannels.map((membership: any) => membership.channelId);

    if (channelIds.length === 0) {
      return [];
    }

    return await prisma.message.findMany({
      where: {
        channelId: { in: channelIds }
      },
      take: limit,
      include: {
        sender: {
          select: { id: true, publicKey: true }
        },
        agent: {
          select: { id: true, name: true }
        },
        channel: {
          select: { id: true, name: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  /**
   * Search messages
   */
  static async searchMessages(query: string, options: {
    userId: string;
    channelId?: string;
    page?: number;
    limit?: number;
  }) {
    const { userId, channelId, page = 1, limit = 20 } = options;
    const skip = (page - 1) * limit;

    // Get channels the user has access to
    const userChannels = await prisma.channelMember.findMany({
      where: { userId },
      select: { channelId: true }
    });

    const allowedChannelIds = userChannels.map(membership => membership.channelId);

    if (allowedChannelIds.length === 0) {
      return {
        messages: [],
        pagination: { page, limit, total: 0, totalPages: 0 }
      };
    }

    const where: any = {
      channelId: { in: channelId ? [channelId] : allowedChannelIds },
      content: { contains: query, mode: 'insensitive' }
    };

    // Only include the specific channel if provided and user has access
    if (channelId && !allowedChannelIds.includes(channelId)) {
      return {
        messages: [],
        pagination: { page, limit, total: 0, totalPages: 0 }
      };
    }

    const [messages, total] = await Promise.all([
      prisma.message.findMany({
        where,
        skip,
        take: limit,
        include: {
          sender: {
            select: { id: true, publicKey: true }
          },
          agent: {
            select: { id: true, name: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.message.count({ where })
    ]);

    return {
      messages,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }
} 