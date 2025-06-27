import { z } from 'zod';
import { logger } from '../lib/logger.js';
import { BlockchainService } from './blockchain.js';

// Agent Protocol Standards
export const AgentCapabilitySchema = z.object({
  name: z.string(),
  version: z.string(),
  description: z.string(),
  inputs: z.array(z.object({
    name: z.string(),
    type: z.string(),
    required: z.boolean(),
    description: z.string()
  })),
  outputs: z.array(z.object({
    name: z.string(),
    type: z.string(),
    description: z.string()
  }))
});

export const AgentProtocolMessageSchema = z.object({
  version: z.string().default('1.0'),
  type: z.enum(['request', 'response', 'notification', 'discovery']),
  id: z.string(),
  timestamp: z.string(),
  from: z.string(), // Agent public key
  to: z.string().optional(), // Target agent public key
  channel: z.string().optional(), // Channel public key
  payload: z.any(),
  signature: z.string().optional()
});

export const AgentDiscoveryMessageSchema = z.object({
  agentId: z.string(),
  name: z.string(),
  description: z.string(),
  capabilities: z.array(AgentCapabilitySchema),
  endpoint: z.string().optional(),
  publicKey: z.string(),
  version: z.string(),
  lastSeen: z.string(),
  reputation: z.number().min(0).max(1),
  metadata: z.any().optional()
});

export type AgentCapability = z.infer<typeof AgentCapabilitySchema>;
export type AgentProtocolMessage = z.infer<typeof AgentProtocolMessageSchema>;
export type AgentDiscoveryMessage = z.infer<typeof AgentDiscoveryMessageSchema>;

export class AgentProtocolService {
  private static agents = new Map<string, AgentDiscoveryMessage>();
  private static capabilities = new Map<string, AgentCapability[]>();

  /**
   * Register an agent with the protocol
   */
  static async registerAgent(agent: AgentDiscoveryMessage): Promise<boolean> {
    try {
      // Validate agent data
      const validatedAgent = AgentDiscoveryMessageSchema.parse(agent);
      
      // Store agent info
      this.agents.set(validatedAgent.agentId, validatedAgent);
      this.capabilities.set(validatedAgent.agentId, validatedAgent.capabilities);
      
      logger.info('Agent registered with protocol:', { 
        agentId: validatedAgent.agentId,
        name: validatedAgent.name,
        capabilities: validatedAgent.capabilities.length 
      });
      
      return true;
    } catch (error) {
      logger.error('Failed to register agent:', error);
      return false;
    }
  }

  /**
   * Discover agents by capability
   */
  static async discoverAgents(capabilityName?: string): Promise<AgentDiscoveryMessage[]> {
    try {
      // Get agents from local registry
      const agents = Array.from(this.agents.values());
      
      // Get agents from blockchain
      const blockchainAgents = await BlockchainService.getAgentsFromBlockchain({ limit: 100 });
      
      // Merge blockchain agents into discovery format
      const blockchainDiscoveryAgents: AgentDiscoveryMessage[] = blockchainAgents.map(agent => ({
        agentId: agent.publicKey,
        name: agent.name,
        description: agent.description || '',
        capabilities: agent.capabilities.map(cap => ({
          name: cap,
          version: '1.0',
          description: `${cap} capability`,
          inputs: [],
          outputs: []
        })),
        publicKey: agent.publicKey,
        version: '1.0',
        lastSeen: agent.lastActiveAt?.toISOString() || agent.createdAt.toISOString(),
        reputation: agent.status === 'active' ? 0.8 : 0.5,
        metadata: {
          blockchainData: true,
          status: agent.status,
          transactionSignature: agent.transactionSignature,
          blockNumber: agent.blockNumber
        }
      }));

      // Combine local and blockchain agents
      const allAgents = [...agents, ...blockchainDiscoveryAgents];
      
      // Filter by capability if specified
      if (capabilityName) {
        return allAgents.filter(agent => 
          agent.capabilities.some(cap => cap.name.toLowerCase().includes(capabilityName.toLowerCase()))
        );
      }
      
      return allAgents;
    } catch (error) {
      logger.error('Error discovering agents:', error);
      return [];
    }
  }

  /**
   * Create a standardized protocol message
   */
  static createMessage(
    type: 'request' | 'response' | 'notification' | 'discovery',
    from: string,
    payload: any,
    options: {
      to?: string;
      channel?: string;
      id?: string;
    } = {}
  ): AgentProtocolMessage {
    return {
      version: '1.0',
      type,
      id: options.id || `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      from,
      to: options.to,
      channel: options.channel,
      payload
    };
  }

  /**
   * Validate a protocol message
   */
  static validateMessage(message: any): AgentProtocolMessage | null {
    try {
      return AgentProtocolMessageSchema.parse(message);
    } catch (error) {
      logger.warn('Invalid protocol message:', error);
      return null;
    }
  }

  /**
   * Route message to appropriate agent
   */
  static async routeMessage(message: AgentProtocolMessage): Promise<boolean> {
    try {
      // Validate message
      const validMessage = this.validateMessage(message);
      if (!validMessage) return false;

      // Log message routing
      logger.info('Routing protocol message:', {
        type: validMessage.type,
        from: validMessage.from.slice(0, 8) + '...',
        to: validMessage.to?.slice(0, 8) + '...',
        id: validMessage.id
      });

      // TODO: Implement actual message routing logic
      // This would involve:
      // 1. Finding the target agent
      // 2. Delivering the message via appropriate transport
      // 3. Handling responses
      
      return true;
    } catch (error) {
      logger.error('Error routing message:', error);
      return false;
    }
  }

  /**
   * Get agent capabilities
   */
  static getAgentCapabilities(agentId: string): AgentCapability[] {
    return this.capabilities.get(agentId) || [];
  }

  /**
   * Update agent last seen timestamp
   */
  static updateAgentLastSeen(agentId: string): void {
    const agent = this.agents.get(agentId);
    if (agent) {
      agent.lastSeen = new Date().toISOString();
      this.agents.set(agentId, agent);
    }
  }

  /**
   * Get protocol statistics
   */
  static getProtocolStats() {
    const totalAgents = this.agents.size;
    const totalCapabilities = Array.from(this.capabilities.values())
      .reduce((sum, caps) => sum + caps.length, 0);
    
    const uniqueCapabilities = new Set(
      Array.from(this.capabilities.values())
        .flat()
        .map(cap => cap.name)
    ).size;

    return {
      totalAgents,
      totalCapabilities,
      uniqueCapabilities,
      averageCapabilitiesPerAgent: totalAgents > 0 ? totalCapabilities / totalAgents : 0,
      protocolVersion: '1.0'
    };
  }

  /**
   * Handle agent discovery broadcast
   */
  static async broadcastDiscovery(agentId: string): Promise<void> {
    try {
      const agent = this.agents.get(agentId);
      if (!agent) return;

      const discoveryMessage = this.createMessage('discovery', agentId, agent);
      
      // TODO: Implement actual broadcast mechanism
      // This could be through WebSocket, pub/sub, or blockchain events
      
      logger.info('Agent discovery broadcasted:', { 
        agentId,
        name: agent.name 
      });
    } catch (error) {
      logger.error('Error broadcasting discovery:', error);
    }
  }

  /**
   * Standard capability definitions
   */
  static getStandardCapabilities(): Record<string, AgentCapability> {
    return {
      'trading': {
        name: 'trading',
        version: '1.0',
        description: 'Execute trading operations on DEXs',
        inputs: [
          { name: 'action', type: 'string', required: true, description: 'buy/sell/swap' },
          { name: 'token', type: 'string', required: true, description: 'Token mint address' },
          { name: 'amount', type: 'number', required: true, description: 'Amount to trade' }
        ],
        outputs: [
          { name: 'transactionSignature', type: 'string', description: 'Transaction signature' },
          { name: 'status', type: 'string', description: 'Transaction status' }
        ]
      },
      'analysis': {
        name: 'analysis',
        version: '1.0',
        description: 'Provide market and data analysis',
        inputs: [
          { name: 'data', type: 'object', required: true, description: 'Data to analyze' },
          { name: 'analysisType', type: 'string', required: true, description: 'Type of analysis' }
        ],
        outputs: [
          { name: 'insights', type: 'array', description: 'Analysis insights' },
          { name: 'confidence', type: 'number', description: 'Confidence score' }
        ]
      },
      'notification': {
        name: 'notification',
        version: '1.0',
        description: 'Send notifications and alerts',
        inputs: [
          { name: 'message', type: 'string', required: true, description: 'Notification message' },
          { name: 'priority', type: 'string', required: false, description: 'Priority level' }
        ],
        outputs: [
          { name: 'delivered', type: 'boolean', description: 'Delivery status' },
          { name: 'timestamp', type: 'string', description: 'Delivery timestamp' }
        ]
      }
    };
  }
} 