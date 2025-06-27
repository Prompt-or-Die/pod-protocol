import { Channel, ChannelMember, MemberRole } from '@prisma/client';
import { prisma } from '../lib/database.js';

export interface CreateChannelData {
  name: string;
  description?: string;
  isPrivate?: boolean;
  maxMembers?: number;
  ownerId: string;
}

export interface UpdateChannelData {
  name?: string;
  description?: string;
  isPrivate?: boolean;
  maxMembers?: number;
}

export class ChannelService {
  /**
   * Create a new channel
   */
  static async createChannel(data: CreateChannelData): Promise<Channel> {
    return await prisma.$transaction(async (tx) => {
      // Create the channel
      const channel = await tx.channel.create({
        data,
        include: {
          owner: {
            select: { id: true, publicKey: true }
          }
        }
      });

      // Add the owner as a member with OWNER role
      await tx.channelMember.create({
        data: {
          userId: data.ownerId,
          channelId: channel.id,
          role: MemberRole.OWNER
        }
      });

      return channel;
    });
  }

  /**
   * Get channels for a user (channels they're a member of)
   */
  static async getUserChannels(userId: string) {
    const memberships = await prisma.channelMember.findMany({
      where: { userId },
      include: {
        channel: {
          include: {
            owner: {
              select: { id: true, publicKey: true }
            },
            _count: {
              select: { members: true, messages: true }
            }
          }
        }
      },
      orderBy: { joinedAt: 'desc' }
    });

    return memberships.map(membership => ({
      ...membership.channel,
      memberCount: membership.channel._count.members,
      messageCount: membership.channel._count.messages,
      userRole: membership.role,
      joinedAt: membership.joinedAt
    }));
  }

  /**
   * Get channel by ID with member info
   */
  static async getChannelById(channelId: string, userId?: string) {
    const channel = await prisma.channel.findUnique({
      where: { id: channelId },
      include: {
        owner: {
          select: { id: true, publicKey: true }
        },
        members: {
          include: {
            user: {
              select: { id: true, publicKey: true }
            }
          }
        },
        _count: {
          select: { members: true, messages: true }
        }
      }
    });

    if (!channel) return null;

    // Check if the requesting user is a member
    const userMembership = userId ? channel.members.find(m => m.userId === userId) : null;

    return {
      ...channel,
      memberCount: channel._count.members,
      messageCount: channel._count.messages,
      userRole: userMembership?.role || null,
      isMember: !!userMembership
    };
  }

  /**
   * Update channel
   */
  static async updateChannel(channelId: string, data: UpdateChannelData): Promise<Channel> {
    return await prisma.channel.update({
      where: { id: channelId },
      data,
      include: {
        owner: {
          select: { id: true, publicKey: true }
        }
      }
    });
  }

  /**
   * Delete channel
   */
  static async deleteChannel(channelId: string): Promise<void> {
    await prisma.channel.delete({
      where: { id: channelId }
    });
  }

  /**
   * Add user to channel
   */
  static async addMember(channelId: string, userId: string, role: MemberRole = MemberRole.MEMBER): Promise<ChannelMember> {
    // Check if channel exists and has space
    const channel = await prisma.channel.findUnique({
      where: { id: channelId },
      include: {
        _count: { select: { members: true } }
      }
    });

    if (!channel) {
      throw new Error('Channel not found');
    }

    if (channel._count.members >= channel.maxMembers) {
      throw new Error('Channel is full');
    }

    // Check if user is already a member
    const existingMember = await prisma.channelMember.findUnique({
      where: {
        userId_channelId: {
          userId,
          channelId
        }
      }
    });

    if (existingMember) {
      throw new Error('User is already a member of this channel');
    }

    return await prisma.channelMember.create({
      data: {
        userId,
        channelId,
        role
      },
      include: {
        user: {
          select: { id: true, publicKey: true }
        },
        channel: {
          select: { id: true, name: true }
        }
      }
    });
  }

  /**
   * Remove user from channel
   */
  static async removeMember(channelId: string, userId: string): Promise<void> {
    await prisma.channelMember.delete({
      where: {
        userId_channelId: {
          userId,
          channelId
        }
      }
    });
  }

  /**
   * Update member role
   */
  static async updateMemberRole(channelId: string, userId: string, role: MemberRole): Promise<ChannelMember> {
    return await prisma.channelMember.update({
      where: {
        userId_channelId: {
          userId,
          channelId
        }
      },
      data: { role },
      include: {
        user: {
          select: { id: true, publicKey: true }
        }
      }
    });
  }

  /**
   * Check if user has permission to perform action
   */
  static async checkPermission(channelId: string, userId: string, requiredRole: MemberRole): Promise<boolean> {
    const member = await prisma.channelMember.findUnique({
      where: {
        userId_channelId: {
          userId,
          channelId
        }
      }
    });

    if (!member) return false;

    // Role hierarchy: OWNER > ADMIN > MEMBER
    const roleHierarchy = {
      [MemberRole.MEMBER]: 1,
      [MemberRole.ADMIN]: 2,
      [MemberRole.OWNER]: 3
    };

    return roleHierarchy[member.role] >= roleHierarchy[requiredRole];
  }
} 