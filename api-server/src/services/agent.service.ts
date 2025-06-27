import { Agent, AgentStatus } from '@prisma/client';
import { prisma } from '../lib/database.js';

export interface CreateAgentData {
  name: string;
  description?: string;
  capabilities: string[];
  metadata?: any;
  publicKey?: string;
  programId?: string;
  ownerId: string;
}

export interface UpdateAgentData {
  name?: string;
  description?: string;
  capabilities?: string[];
  status?: AgentStatus;
  metadata?: any;
  lastActiveAt?: Date;
}

export class AgentService {
  /**
   * Create a new agent
   */
  static async createAgent(data: CreateAgentData): Promise<Agent> {
    return await prisma.agent.create({
      data,
      include: {
        owner: true
      }
    });
  }

  /**
   * Get agents with pagination and filtering
   */
  static async getAgents(options: {
    page?: number;
    limit?: number;
    search?: string;
    ownerId?: string;
    status?: AgentStatus;
  }) {
    const { page = 1, limit = 20, search, ownerId, status } = options;
    const skip = (page - 1) * limit;

    const where: any = {};
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }
    
    if (ownerId) where.ownerId = ownerId;
    if (status) where.status = status;

    const [agents, total] = await Promise.all([
      prisma.agent.findMany({
        where,
        skip,
        take: limit,
        include: {
          owner: {
            select: { id: true, publicKey: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.agent.count({ where })
    ]);

    return {
      agents,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Get agent by ID
   */
  static async getAgentById(id: string, includeStats = false) {
    const agent = await prisma.agent.findUnique({
      where: { id },
      include: {
        owner: {
          select: { id: true, publicKey: true }
        }
      }
    });

    if (!agent) return null;

    if (includeStats) {
      const stats = await AgentService.getAgentStats(id);
      return { ...agent, stats };
    }

    return agent;
  }

  /**
   * Update agent
   */
  static async updateAgent(id: string, data: UpdateAgentData): Promise<Agent> {
    return await prisma.agent.update({
      where: { id },
      data,
      include: {
        owner: {
          select: { id: true, publicKey: true }
        }
      }
    });
  }

  /**
   * Delete agent
   */
  static async deleteAgent(id: string): Promise<void> {
    await prisma.agent.delete({
      where: { id }
    });
  }

  /**
   * Get agent statistics
   */
  static async getAgentStats(agentId: string) {
    const [messagesProcessed, lastActiveMessage] = await Promise.all([
      prisma.message.count({ where: { agentId } }),
      prisma.message.findFirst({
        where: { agentId },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true }
      })
    ]);

    return {
      messagesProcessed,
      lastActive: lastActiveMessage?.createdAt || null,
      uptime: '99.5%' // TODO: Calculate real uptime
    };
  }

  /**
   * Update agent's last active time
   */
  static async updateLastActive(agentId: string): Promise<void> {
    await prisma.agent.update({
      where: { id: agentId },
      data: { lastActiveAt: new Date() }
    });
  }

  /**
   * Get agents by owner
   */
  static async getAgentsByOwner(ownerId: string): Promise<Agent[]> {
    return await prisma.agent.findMany({
      where: { ownerId },
      include: {
        owner: {
          select: { id: true, publicKey: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }
} 