import { User } from '@prisma/client';
import { prisma } from '../lib/database.js';

export interface CreateUserData {
  publicKey: string;
  walletAddress: string;
}

export interface UpdateUserData {
  lastAuthenticatedAt?: Date;
}

export class UserService {
  /**
   * Create a new user or return existing user
   */
  static async createOrGetUser(data: CreateUserData): Promise<User> {
    // Try to find existing user first
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { publicKey: data.publicKey },
          { walletAddress: data.walletAddress }
        ]
      }
    });

    if (existingUser) {
      // Update last authenticated time
      return await prisma.user.update({
        where: { id: existingUser.id },
        data: { lastAuthenticatedAt: new Date() }
      });
    }

    // Create new user
    return await prisma.user.create({
      data: {
        ...data,
        lastAuthenticatedAt: new Date()
      }
    });
  }

  /**
   * Get user by public key
   */
  static async getUserByPublicKey(publicKey: string): Promise<User | null> {
    return await prisma.user.findUnique({
      where: { publicKey }
    });
  }

  /**
   * Get user by ID with optional relations
   */
  static async getUserById(id: string, includeRelations = false): Promise<User | null> {
    return await prisma.user.findUnique({
      where: { id },
      include: includeRelations ? {
        ownedAgents: true,
        ownedChannels: true,
        channelMembers: {
          include: { channel: true }
        }
      } : undefined
    });
  }

  /**
   * Update user data
   */
  static async updateUser(id: string, data: UpdateUserData): Promise<User> {
    return await prisma.user.update({
      where: { id },
      data
    });
  }

  /**
   * Get user's statistics
   */
  static async getUserStats(userId: string) {
    const [ownedAgents, ownedChannels, messageCount] = await Promise.all([
      prisma.agent.count({ where: { ownerId: userId } }),
      prisma.channel.count({ where: { ownerId: userId } }),
      prisma.message.count({ where: { senderId: userId } })
    ]);

    return {
      ownedAgents,
      ownedChannels,
      messageCount
    };
  }

  /**
   * Delete user and all related data
   */
  static async deleteUser(id: string): Promise<void> {
    await prisma.user.delete({
      where: { id }
    });
  }
} 