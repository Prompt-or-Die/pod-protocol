import { IAgentRuntime, Service } from "@elizaos/core";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import bs58 from "bs58";
import {
  PodProtocolConfig,
  PodProtocolService,
  PodAgent,
  PodMessage,
  PodChannel,
  PodEscrow,
  AgentDiscoveryFilter,
  MessageFilter,
  PodPluginState,
} from "../types.js";
import { parseConfig, validateConfig } from "../environment.js";

/**
 * PoD Protocol service implementation for ElizaOS
 */
export class PodProtocolServiceImpl extends Service implements PodProtocolService {
  private connection: Connection | null = null;
  private keypair: Keypair | null = null;
  private config: PodProtocolConfig | null = null;
  private state: PodPluginState | null = null;
  private runtime: IAgentRuntime | null = null;

  static serviceType = "pod_protocol";

  constructor() {
    super();
  }

  /**
   * Initialize the PoD Protocol service
   */
  async initialize(runtime: IAgentRuntime): Promise<void> {
    try {
      this.runtime = runtime;
      
      // Parse and validate configuration
      this.config = parseConfig(runtime);
      const validation = validateConfig(this.config);
      
      if (!validation.isValid) {
        throw new Error(`Configuration validation failed: ${validation.errors.join(", ")}`);
      }

      // Initialize Solana connection
      this.connection = new Connection(this.config.rpcEndpoint, "confirmed");
      
      // Initialize keypair from private key
      try {
        const privateKeyBytes = bs58.decode(this.config.walletPrivateKey);
        this.keypair = Keypair.fromSecretKey(privateKeyBytes);
      } catch (error) {
        throw new Error(`Failed to create keypair from private key: ${error instanceof Error ? error.message : String(error)}`);
      }

      // Initialize plugin state
      this.state = {
        agent: null,
        isRegistered: false,
        connectedAgents: new Map(),
        channels: new Map(),
        messages: [],
        escrows: new Map(),
        lastSync: new Date(),
      };

      // Auto-register if enabled
      if (this.config.autoRegister) {
        try {
          await this.registerAgent(this.config);
          runtime.getLogger?.()?.info("PoD Protocol agent auto-registered successfully");
        } catch (error) {
          runtime.getLogger?.()?.warn(`Auto-registration failed: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      runtime.getLogger?.()?.info("PoD Protocol service initialized successfully");
    } catch (error) {
      runtime.getLogger?.()?.error(`Failed to initialize PoD Protocol service: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Register agent on PoD Protocol
   */
  async registerAgent(config: PodProtocolConfig): Promise<PodAgent> {
    if (!this.connection || !this.keypair || !this.state) {
      throw new Error("Service not initialized");
    }

    try {
      // Create agent object
      const agent: PodAgent = {
        agentId: `eliza_${this.keypair.publicKey.toBase58().slice(0, 8)}`,
        name: config.agentName || "ElizaOS Agent",
        description: `ElizaOS agent with capabilities: ${config.capabilities.join(", ")}`,
        capabilities: config.capabilities,
        reputation: 50, // Starting reputation
        walletAddress: this.keypair.publicKey.toBase58(),
        lastActive: new Date(),
        status: "online",
        framework: "ElizaOS",
      };

      // In a real implementation, this would interact with the PoD Protocol program
      // For now, we'll simulate the registration
      this.state.agent = agent;
      this.state.isRegistered = true;

      this.runtime?.getLogger?.()?.info(`Agent registered: ${agent.agentId}`);
      return agent;
    } catch (error) {
      this.runtime?.getLogger?.()?.error(`Agent registration failed: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Discover other agents on the network
   */
  async discoverAgents(filter?: AgentDiscoveryFilter): Promise<PodAgent[]> {
    if (!this.connection || !this.state) {
      throw new Error("Service not initialized");
    }

    try {
      // In a real implementation, this would query the PoD Protocol program
      // For now, we'll return mock data
      const mockAgents: PodAgent[] = [
        {
          agentId: "trading_bot_001",
          name: "Advanced Trading Bot",
          description: "AI trading agent with market analysis capabilities",
          capabilities: ["trading", "analysis", "risk_management"],
          reputation: 95,
          walletAddress: "8vK2...mN8p",
          lastActive: new Date(Date.now() - 15 * 60 * 1000), // 15 minutes ago
          status: "online",
          framework: "ElizaOS",
        },
        {
          agentId: "research_pro_v2",
          name: "Research Assistant Pro",
          description: "Academic research and data analysis specialist",
          capabilities: ["research", "data_analysis", "reporting"],
          reputation: 94,
          walletAddress: "9wL3...pK9q",
          lastActive: new Date(Date.now() - 3 * 60 * 1000), // 3 minutes ago
          status: "online",
          framework: "AutoGen",
        },
        {
          agentId: "content_creator_x",
          name: "Content Creator Agent",
          description: "Creative writing and content strategy specialist",
          capabilities: ["writing", "content_strategy", "seo"],
          reputation: 89,
          walletAddress: "7tM4...qR8n",
          lastActive: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
          status: "offline",
          framework: "CrewAI",
        },
      ];

      // Apply filters if provided
      let filteredAgents = mockAgents;

      if (filter) {
        if (filter.capabilities) {
          filteredAgents = filteredAgents.filter(agent =>
            filter.capabilities!.some(cap => agent.capabilities.includes(cap))
          );
        }

        if (filter.framework) {
          filteredAgents = filteredAgents.filter(agent => agent.framework === filter.framework);
        }

        if (filter.searchTerm) {
          const term = filter.searchTerm.toLowerCase();
          filteredAgents = filteredAgents.filter(agent =>
            agent.name.toLowerCase().includes(term) ||
            agent.description.toLowerCase().includes(term) ||
            agent.capabilities.some(cap => cap.toLowerCase().includes(term))
          );
        }

        if (filter.minReputation) {
          filteredAgents = filteredAgents.filter(agent => agent.reputation >= filter.minReputation!);
        }

        if (filter.status && filter.status !== "any") {
          filteredAgents = filteredAgents.filter(agent => agent.status === filter.status);
        }

        if (filter.limit) {
          filteredAgents = filteredAgents.slice(filter.offset || 0, (filter.offset || 0) + filter.limit);
        }
      }

      // Update connected agents cache
      filteredAgents.forEach(agent => {
        this.state!.connectedAgents.set(agent.agentId, agent);
      });

      return filteredAgents;
    } catch (error) {
      this.runtime?.getLogger?.()?.error(`Agent discovery failed: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Send message to another agent
   */
  async sendMessage(recipientId: string, content: string, options?: Partial<PodMessage>): Promise<PodMessage> {
    if (!this.connection || !this.keypair || !this.state?.agent) {
      throw new Error("Service not initialized or agent not registered");
    }

    try {
      const message: PodMessage = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        senderId: this.state.agent.agentId,
        recipientId,
        content,
        type: options?.type || "text",
        priority: options?.priority || "normal",
        timestamp: new Date(),
        status: "pending",
        encrypted: options?.encrypted || true,
        transactionHash: undefined,
        ...options,
      };

      // In a real implementation, this would send the message via PoD Protocol
      // For now, we'll simulate the sending
      message.status = "delivered";
      message.transactionHash = `tx_${Math.random().toString(36).substr(2, 16)}`;

      // Add to message history
      this.state.messages.push(message);

      this.runtime?.getLogger?.()?.info(`Message sent to ${recipientId}: ${content.substring(0, 50)}...`);
      return message;
    } catch (error) {
      this.runtime?.getLogger?.()?.error(`Failed to send message: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Get messages
   */
  async getMessages(filter?: MessageFilter): Promise<PodMessage[]> {
    if (!this.state) {
      throw new Error("Service not initialized");
    }

    try {
      let messages = [...this.state.messages];

      if (filter) {
        if (filter.senderId) {
          messages = messages.filter(msg => msg.senderId === filter.senderId);
        }

        if (filter.recipientId) {
          messages = messages.filter(msg => msg.recipientId === filter.recipientId);
        }

        if (filter.type) {
          messages = messages.filter(msg => msg.type === filter.type);
        }

        if (filter.status) {
          messages = messages.filter(msg => msg.status === filter.status);
        }

        if (filter.since) {
          messages = messages.filter(msg => msg.timestamp >= filter.since!);
        }

        if (filter.unreadOnly) {
          messages = messages.filter(msg => msg.status !== "read");
        }

        if (filter.limit) {
          messages = messages.slice(0, filter.limit);
        }
      }

      return messages.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    } catch (error) {
      this.runtime?.getLogger?.()?.error(`Failed to get messages: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Create a new channel
   */
  async createChannel(name: string, description: string, options?: Partial<PodChannel>): Promise<PodChannel> {
    if (!this.connection || !this.state?.agent) {
      throw new Error("Service not initialized or agent not registered");
    }

    try {
      const channel: PodChannel = {
        id: `channel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name,
        description,
        type: options?.type || "public",
        creatorId: this.state.agent.agentId,
        participants: [this.state.agent.agentId],
        maxParticipants: options?.maxParticipants || 50,
        createdAt: new Date(),
        lastActivity: new Date(),
        ...options,
      };

      // Add to channels cache
      this.state.channels.set(channel.id, channel);

      this.runtime?.getLogger?.()?.info(`Channel created: ${channel.name} (${channel.id})`);
      return channel;
    } catch (error) {
      this.runtime?.getLogger?.()?.error(`Failed to create channel: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Join a channel
   */
  async joinChannel(channelId: string): Promise<boolean> {
    if (!this.state?.agent) {
      throw new Error("Service not initialized or agent not registered");
    }

    try {
      // In a real implementation, this would interact with the PoD Protocol program
      // For now, we'll simulate joining
      const channel = this.state.channels.get(channelId);
      if (channel && !channel.participants.includes(this.state.agent.agentId)) {
        channel.participants.push(this.state.agent.agentId);
        channel.lastActivity = new Date();
      }

      this.runtime?.getLogger?.()?.info(`Joined channel: ${channelId}`);
      return true;
    } catch (error) {
      this.runtime?.getLogger?.()?.error(`Failed to join channel: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }

  /**
   * Leave a channel
   */
  async leaveChannel(channelId: string): Promise<boolean> {
    if (!this.state?.agent) {
      throw new Error("Service not initialized or agent not registered");
    }

    try {
      const channel = this.state.channels.get(channelId);
      if (channel) {
        channel.participants = channel.participants.filter(id => id !== this.state!.agent!.agentId);
        channel.lastActivity = new Date();
      }

      this.runtime?.getLogger?.()?.info(`Left channel: ${channelId}`);
      return true;
    } catch (error) {
      this.runtime?.getLogger?.()?.error(`Failed to leave channel: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }

  /**
   * Get channel participants
   */
  async getChannelParticipants(channelId: string): Promise<PodAgent[]> {
    if (!this.state) {
      throw new Error("Service not initialized");
    }

    try {
      const channel = this.state.channels.get(channelId);
      if (!channel) {
        return [];
      }

      const participants: PodAgent[] = [];
      for (const participantId of channel.participants) {
        const agent = this.state.connectedAgents.get(participantId);
        if (agent) {
          participants.push(agent);
        }
      }

      return participants;
    } catch (error) {
      this.runtime?.getLogger?.()?.error(`Failed to get channel participants: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Create an escrow transaction
   */
  async createEscrow(counterpartyId: string, amount: number, service: string, deliverables: string[]): Promise<PodEscrow> {
    if (!this.connection || !this.state?.agent) {
      throw new Error("Service not initialized or agent not registered");
    }

    try {
      const escrow: PodEscrow = {
        id: `escrow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        amount,
        counterpartyId,
        service,
        deliverables,
        deadline: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
        status: "created",
        transactionHash: undefined,
      };

      // Add to escrows cache
      this.state.escrows.set(escrow.id, escrow);

      this.runtime?.getLogger?.()?.info(`Escrow created: ${escrow.id} (${amount} SOL)`);
      return escrow;
    } catch (error) {
      this.runtime?.getLogger?.()?.error(`Failed to create escrow: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Get agent reputation
   */
  async getAgentReputation(agentId?: string): Promise<number> {
    if (!this.state) {
      throw new Error("Service not initialized");
    }

    try {
      const targetId = agentId || this.state.agent?.agentId;
      if (!targetId) {
        throw new Error("No agent ID specified and no current agent");
      }

      // Check if it's the current agent
      if (targetId === this.state.agent?.agentId) {
        return this.state.agent.reputation;
      }

      // Check connected agents
      const agent = this.state.connectedAgents.get(targetId);
      if (agent) {
        return agent.reputation;
      }

      // Default reputation for unknown agents
      return 50;
    } catch (error) {
      this.runtime?.getLogger?.()?.error(`Failed to get agent reputation: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Get protocol statistics
   */
  async getProtocolStats(): Promise<any> {
    if (!this.state) {
      throw new Error("Service not initialized");
    }

    try {
      return {
        totalAgents: this.state.connectedAgents.size + 1, // +1 for current agent
        totalChannels: this.state.channels.size,
        totalMessages: this.state.messages.length,
        activeEscrows: Array.from(this.state.escrows.values()).filter(e => e.status === "created" || e.status === "funded").length,
        lastSync: this.state.lastSync,
        isRegistered: this.state.isRegistered,
        currentAgent: this.state.agent,
      };
    } catch (error) {
      this.runtime?.getLogger?.()?.error(`Failed to get protocol stats: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      if (!this.connection) {
        return false;
      }

      // Test connection to Solana
      const version = await this.connection.getVersion();
      return !!version;
    } catch (error) {
      this.runtime?.getLogger?.()?.error(`Health check failed: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }

  /**
   * Get current plugin state
   */
  getState(): PodPluginState | null {
    return this.state;
  }

  /**
   * Get current configuration
   */
  getConfig(): PodProtocolConfig | null {
    return this.config;
  }
}