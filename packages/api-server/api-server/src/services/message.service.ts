import { Message, MessageType, MessageStatus } from '@prisma/client';
import { prisma } from '../lib/database.js';

export interface CreateMessageData {
  content: string;
  type?: MessageType;
  channelId: string;
  senderId: string;
  agentId?: string;
  transactionSignature?: string;
  blockchainData?: any;
}

export interface UpdateMessageData {
  content?: string;
  status?: MessageStatus;
  blockchainData?: any;
}

export class MessageService {
  /**
   * Create a new message
   */
  static async createMessage(data: CreateMessageData): Promise<Message> {
    return await prisma.message.create({
      data,
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
    return await prisma.message.findUnique({
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
  }

  /**
   * Update message
   */
  static async updateMessage(id: string, data: UpdateMessageData): Promise<Message> {
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
  }

  /**
   * Delete message
   */
  static async deleteMessage(id: string): Promise<void> {
    await prisma.message.delete({
      where: { id }
    });
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
          },
          channel: {
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