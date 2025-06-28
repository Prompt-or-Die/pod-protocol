import { Agent, AgentStatus } from '@prisma/client';
import { prisma } from '../lib/database.js';
import { PodComClient } from '@pod-protocol/sdk';
import { KeyPairSigner } from '@solana/signers';
import { KeyPairSigner } from '@solana/signers';
import { Keypair, Connection, clusterApiUrl, PublicKey } from '@solana/web3.js';
import { logger } from '../lib/logger.js';

// TODO: Implement secure wallet management for the API server.
// For now, using a placeholder keypair. This is NOT secure for production.
const placeholderKeypair = Keypair.generate();
const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
const sdkClient = new PodComClient(connection, placeholderKeypair);

export interface CreateAgentData {
  name: string;
  description?: string;
  capabilities: string[];
  metadata?: any;
  publicKey?: string;
  ownerId: string;
}

export class AgentService {
  /**
   * Create a new agent
   */
  static async createAgent(data: CreateAgentData): Promise<Agent> {
    try {
      // Register agent on-chain via SDK
      const tx = await sdkClient.agent.registerAgent(placeholderKeypair, {
        capabilities: data.capabilities.map(c => parseInt(c)), // Assuming capabilities are numbers
        metadataUri: JSON.stringify(data.metadata), // Store metadata as URI
      });
      logger.info(`Agent registered on-chain. Transaction: ${tx}`);

      // Store agent data in the database
      return await prisma.agent.create({
        data: {
          ...data,
          
          
        },
        include: {
          owner: true
        }
      });
    } catch (error) {
      logger.error('Failed to create agent on-chain or in database:', error);
      throw error;
    }
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
    // For now, primarily query the database as it acts as an index/cache.
    // TODO: Implement periodic syncing of on-chain agents to the database.
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
    // First, try to get from database to get the public key
    const dbAgent = await prisma.agent.findUnique({
      where: { id },
      include: {
        owner: {
          select: { id: true, publicKey: true }
        }
      }
    });

    if (!dbAgent || !dbAgent.publicKey) {
      return null;
    }

    try {
      // Then, fetch the on-chain agent data using the SDK
      const onChainAgent = await sdkClient.agents.getAgent(new PublicKey(dbAgent.publicKey));

      if (!onChainAgent) {
        logger.warn(`Agent with ID ${id} found in DB but not on-chain.`);
        return null; // Agent not found on-chain
      }

      // Combine on-chain and off-chain data
      const combinedAgent = {
        ...dbAgent,
        capabilities: onChainAgent.capabilities.toString(), // Convert BN to string for now
        metadataUri: onChainAgent.metadataUri,
        // Add other on-chain properties as needed
      };

      if (includeStats) {
        const stats = await AgentService.getAgentStats(id);
        return { ...combinedAgent, stats };
      }

      return combinedAgent;
    } catch (error) {
      logger.error(`Failed to fetch on-chain agent for ID ${id}:`, error);
      throw error;
    }
  }

  /**
   * Update agent
   */
  static async updateAgent(id: string, data: UpdateAgentData): Promise<Agent> {
    const dbAgent = await prisma.agent.findUnique({ where: { id } });
    if (!dbAgent || !dbAgent.publicKey) {
      throw new Error(`Agent with ID ${id} not found.`);
    }

    try {
      // Update agent on-chain via SDK if relevant data is provided
      if (data.capabilities !== undefined || data.metadata !== undefined) {
        const tx = await sdkClient.agents.updateAgent(placeholderKeypair as KeyPairSigner, {
          capabilities: data.capabilities ? data.capabilities.map(c => parseInt(c)) : undefined,
          metadataUri: data.metadata ? JSON.stringify(data.metadata) : undefined,
        });
        logger.info(`Agent updated on-chain. Transaction: ${tx}`);
      }

      // Update agent data in the database
      return await prisma.agent.update({
        where: { id },
        data,
        include: {
          owner: {
            select: { id: true, publicKey: true }
          }
        }
      });
    } catch (error) {
      logger.error('Failed to update agent on-chain or in database:', error);
      throw error;
    }
  }

  /**
   * Delete agent
   */
  static async deleteAgent(id: string): Promise<void> {
    // No direct on-chain delete for agents in SDK.
    // For now, only delete from the database.
    // TODO: Consider implementing an on-chain "deactivate" or "close" if protocol supports it.
    try {
      await prisma.agent.delete({
        where: { id }
      });
      logger.info(`Agent with ID ${id} deleted from database.`);
    } catch (error) {
      logger.error(`Failed to delete agent with ID ${id} from database:`, error);
      throw error;
    }
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