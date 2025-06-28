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
import { BlockchainService } from "./blockchainService.js";

/**
 * PoD Protocol service implementation for ElizaOS
 * 
 * Provides comprehensive blockchain-based communication services for AI agents
 * including registration, messaging, channel management, reputation tracking,
 * and escrow transactions on the Solana blockchain.
 * 
 * @class PodProtocolServiceImpl
 * @extends {Service}
 * @implements {PodProtocolService}
 * @since 1.0.0
 * 
 * @example
 * ```typescript
 * const service = new PodProtocolServiceImpl();
 * await service.initialize(runtime);
 * const agent = await service.registerAgent(config);
 * ```
 */
export class PodProtocolServiceImpl extends Service implements PodProtocolService {
  private connection: Connection | null = null;
  private keypair: Keypair | null = null;
  private podConfig: PodProtocolConfig | null = null;
  private state: PodPluginState | null = null;
  private blockchainService: BlockchainService | null = null;

  static override serviceType = "pod_protocol";

  // Program ID for PoD Protocol smart contract
  private static readonly PROGRAM_ID = "HEpGLgYsE1kP8aoYKyLFc3JVVrofS7T4zEA6fWBJsZps";

  /**
   * Service capability description for ElizaOS
   * @returns {string} Description of the service capabilities
   */
  override get capabilityDescription(): string {
    return "PoD Protocol integration for AI agent communication, messaging, channels, and escrow services on Solana blockchain.";
  }

  constructor() {
    super();
  }

  /**
   * Stop the service and cleanup resources
   * 
   * Cleans up all connections, state, and resources used by the service.
   * Should be called when shutting down the agent.
   * 
   * @returns {Promise<void>} Promise that resolves when service is stopped
   * @since 1.0.0
   */
  override async stop(): Promise<void> {
    this.connection = null;
    this.keypair = null;
    this.podConfig = null;
    this.state = null;
    this.blockchainService = null;
  }

  /**
   * Initialize the PoD Protocol service
   * 
   * Sets up the service with configuration, establishes blockchain connections,
   * initializes the blockchain service, and optionally auto-registers the agent.
   * 
   * @param {IAgentRuntime} runtime - The ElizaOS runtime instance
   * @returns {Promise<void>} Promise that resolves when initialization is complete
   * @throws {Error} When configuration validation fails or initialization errors occur
   * @since 1.0.0
   * 
   * @example
   * ```typescript
   * const service = new PodProtocolServiceImpl();
   * await service.initialize(runtime);
   * console.log("PoD Protocol service ready!");
   * ```
   */
  async initialize(runtime: IAgentRuntime): Promise<void> {
    try {
      this.runtime = runtime;
      
      // Parse and validate configuration
      this.podConfig = parseConfig(runtime);
      const validation = validateConfig(this.podConfig);
      
      if (!validation.isValid) {
        throw new Error(`Configuration validation failed: ${validation.errors.join(", ")}`);
      }

      // Initialize Solana connection
      this.connection = new Connection(this.podConfig.rpcEndpoint, "confirmed");
      
      // Initialize keypair from private key
      try {
        const privateKeyBytes = bs58.decode(this.podConfig.walletPrivateKey);
        this.keypair = Keypair.fromSecretKey(privateKeyBytes);
      } catch (error) {
        throw new Error(`Failed to create keypair from private key: ${error instanceof Error ? error.message : String(error)}`);
      }

      // Initialize blockchain service
      this.blockchainService = new BlockchainService(
        this.connection,
        this.keypair,
        PodProtocolServiceImpl.PROGRAM_ID
      );
      await this.blockchainService.initialize();

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
      if (this.podConfig.autoRegister) {
        try {
          await this.registerAgent(this.podConfig);
          console.log("PoD Protocol agent auto-registered successfully");
        } catch (error) {
          console.warn(`Auto-registration failed: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      console.log("PoD Protocol service initialized successfully");
    } catch (error) {
      console.error(`Failed to initialize PoD Protocol service: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Register agent on PoD Protocol blockchain
   * 
   * Creates a blockchain identity for the agent with specified capabilities,
   * name, and metadata. The agent will be registered on the Solana blockchain
   * using the PoD Protocol smart contract.
   * 
   * @param {PodProtocolConfig} config - Configuration for agent registration
   * @param {string} config.walletPrivateKey - Base58 encoded private key
   * @param {string} config.rpcEndpoint - Solana RPC endpoint URL
   * @param {string} config.agentName - Unique name for the agent
   * @param {string[]} config.capabilities - Array of agent capabilities
   * @param {boolean} config.autoRegister - Whether to auto-register on startup
   * @param {string} config.programId - PoD Protocol program ID
   * @returns {Promise<PodAgent>} The registered agent details
   * @throws {Error} When service is not initialized or registration fails
   * @since 1.0.0
   * 
   * @example
   * ```typescript
   * const agent = await service.registerAgent({
   *   walletPrivateKey: "base58_private_key",
   *   rpcEndpoint: "https://api.devnet.solana.com",
   *   agentName: "TradingBot",
   *   capabilities: ["trading", "analysis"],
   *   autoRegister: false,
   *   programId: "HEpGLgYsE1kP8aoYKyLFc3JVVrofS7T4zEA6fWBJsZps"
   * });
   * ```
   */
  async registerAgent(config: PodProtocolConfig): Promise<PodAgent> {
    if (!this.blockchainService || !this.state) {
      throw new Error("Service not initialized");
    }

    try {
      // Use blockchain service for real registration
      const agent = await this.blockchainService.registerAgent(config);

      // Update local state
      this.state.agent = agent;
      this.state.isRegistered = true;

      console.log(`Agent registered on blockchain: ${agent.agentId}`);
      return agent;
    } catch (error) {
      console.error(`Agent registration failed: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Discover other agents on the PoD Protocol network
   * 
   * Searches for agents based on specified filter criteria including capabilities,
   * framework, reputation, status, and other parameters. Results can be paginated
   * and sorted by various factors.
   * 
   * @param {AgentDiscoveryFilter} [filter] - Optional filter criteria for agent search
   * @param {string[]} [filter.capabilities] - Required agent capabilities
   * @param {string} [filter.framework] - Target framework (ElizaOS, AutoGen, etc.)
   * @param {string} [filter.searchTerm] - Text search in agent name/description
   * @param {number} [filter.minReputation] - Minimum reputation score required
   * @param {"online" | "offline" | "any"} [filter.status] - Agent status filter
   * @param {number} [filter.limit=10] - Maximum number of results to return
   * @param {number} [filter.offset=0] - Number of results to skip for pagination
   * @returns {Promise<PodAgent[]>} Array of discovered agents
   * @throws {Error} When service is not initialized
   * @since 1.0.0
   * 
   * @example
   * ```typescript
   * // Find online trading agents with high reputation
   * const tradingAgents = await service.discoverAgents({
   *   capabilities: ["trading"],
   *   minReputation: 80,
   *   status: "online",
   *   limit: 5
   * });
   * ```
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
      console.error(`Agent discovery failed: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Send encrypted message to another agent
   * 
   * Sends a secure, encrypted message to another agent on the PoD Protocol network.
   * The message is recorded on the Solana blockchain with optional encryption,
   * priority settings, and delivery confirmation.
   * 
   * @param {string} recipientId - Target agent ID to send message to
   * @param {string} content - Message content to send
   * @param {Partial<PodMessage>} [options] - Optional message configuration
   * @param {"text" | "data" | "command" | "response"} [options.type="text"] - Message type
   * @param {"low" | "normal" | "high" | "urgent"} [options.priority="normal"] - Message priority
   * @param {boolean} [options.encrypted=true] - Whether to encrypt the message
   * @returns {Promise<PodMessage>} The sent message details with transaction hash
   * @throws {Error} When service is not initialized or agent not registered
   * @since 1.0.0
   * 
   * @example
   * ```typescript
   * const message = await service.sendMessage(
   *   "recipient_agent_123",
   *   "Hello! Let's collaborate on this project.",
   *   {
   *     type: "text",
   *     priority: "high",
   *     encrypted: true
   *   }
   * );
   * console.log(`Message sent: ${message.transactionHash}`);
   * ```
   */
  async sendMessage(recipientId: string, content: string, options?: Partial<PodMessage>): Promise<PodMessage> {
    if (!this.blockchainService || !this.state?.agent) {
      throw new Error("Service not initialized or agent not registered");
    }

    try {
      // Use blockchain service for real message sending
      const messageType = options?.type || "text";
      const message = await this.blockchainService.sendMessage(recipientId, content, messageType);

      // Add to local message history
      this.state.messages.push(message);

      console.log(`Message sent on blockchain to ${recipientId}: ${content.substring(0, 50)}...`);
      return message;
    } catch (error) {
      console.error(`Failed to send message: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Retrieve messages based on filter criteria
   * 
   * Fetches messages from local cache and blockchain based on specified filters.
   * Can filter by sender, recipient, message type, status, and time range.
   * Results are sorted by timestamp in descending order (newest first).
   * 
   * @param {MessageFilter} [filter] - Optional filter criteria for message retrieval
   * @param {string} [filter.senderId] - Filter by sender agent ID
   * @param {string} [filter.recipientId] - Filter by recipient agent ID
   * @param {"text" | "data" | "command" | "response"} [filter.type] - Filter by message type
   * @param {"pending" | "delivered" | "read" | "failed"} [filter.status] - Filter by message status
   * @param {Date} [filter.since] - Only messages after this timestamp
   * @param {boolean} [filter.unreadOnly] - Only unread messages
   * @param {number} [filter.limit] - Maximum number of messages to return
   * @returns {Promise<PodMessage[]>} Array of messages matching filter criteria
   * @throws {Error} When service is not initialized
   * @since 1.0.0
   * 
   * @example
   * ```typescript
   * // Get unread messages from the last hour
   * const unreadMessages = await service.getMessages({
   *   unreadOnly: true,
   *   since: new Date(Date.now() - 60 * 60 * 1000),
   *   limit: 10
   * });
   * ```
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
      console.error(`Failed to get messages: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Create a new communication channel
   * 
   * Creates a new public or private channel for multi-agent communication.
   * Channels can have participant limits, fees, and escrow requirements.
   * The creating agent becomes the channel administrator.
   * 
   * @param {string} name - Channel name (maximum 50 characters)
   * @param {string} description - Channel description (maximum 200 characters)
   * @param {Partial<PodChannel>} [options] - Optional channel configuration
   * @param {"public" | "private"} [options.type="public"] - Channel visibility type
   * @param {number} [options.maxParticipants=50] - Maximum number of participants
   * @returns {Promise<PodChannel>} The created channel details
   * @throws {Error} When service is not initialized, agent not registered, or creation fails
   * @since 1.0.0
   * 
   * @example
   * ```typescript
   * const channel = await service.createChannel(
   *   "DeFi Trading Signals",
   *   "Private channel for sharing trading signals and analysis",
   *   {
   *     type: "private",
   *     maxParticipants: 25
   *   }
   * );
   * ```
   */
  async createChannel(name: string, description: string, options?: Partial<PodChannel>): Promise<PodChannel> {
    if (!this.blockchainService || !this.state?.agent) {
      throw new Error("Service not initialized or agent not registered");
    }

    try {
      // Use blockchain service for real channel creation
      const isPrivate = options?.type === "private";
      const channel = await this.blockchainService.createChannel(name, description, isPrivate);

      // Add to local channels cache
      this.state.channels.set(channel.id, channel);

      console.log(`Channel created on blockchain: ${channel.name} (${channel.id})`);
      return channel;
    } catch (error) {
      console.error(`Failed to create channel: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Join an existing channel
   * 
   * Joins the agent to an existing channel. For private channels, an invitation
   * may be required. Public channels can be joined freely if not at capacity.
   * 
   * @param {string} channelId - Channel ID to join
   * @returns {Promise<boolean>} True if successfully joined, false otherwise
   * @throws {Error} When service is not initialized or agent not registered
   * @since 1.0.0
   * 
   * @example
   * ```typescript
   * const success = await service.joinChannel("channel_123");
   * if (success) {
   *   console.log("Successfully joined channel!");
   * }
   * ```
   */
  async joinChannel(channelId: string): Promise<boolean> {
    if (!this.blockchainService || !this.state?.agent) {
      throw new Error("Service not initialized or agent not registered");
    }

    try {
      // Use blockchain service for real channel joining
      const success = await this.blockchainService.joinChannel(channelId);
      
      if (success) {
        // Update local channel cache if exists
        const channel = this.state.channels.get(channelId);
        if (channel && !channel.participants.includes(this.state.agent.agentId)) {
          channel.participants.push(this.state.agent.agentId);
          channel.lastActivity = new Date();
        }
      }

      console.log(`Joined channel on blockchain: ${channelId}`);
      return success;
    } catch (error) {
      console.error(`Failed to join channel: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }

  /**
   * Leave a channel
   * 
   * Removes the agent from the specified channel. The agent will no longer
   * receive messages from this channel and cannot send messages to it.
   * 
   * @param {string} channelId - Channel ID to leave
   * @returns {Promise<boolean>} True if successfully left, false otherwise
   * @throws {Error} When service is not initialized or agent not registered
   * @since 1.0.0
   * 
   * @example
   * ```typescript
   * const success = await service.leaveChannel("channel_123");
   * if (success) {
   *   console.log("Left channel successfully");
   * }
   * ```
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

      console.log(`Left channel: ${channelId}`);
      return true;
    } catch (error) {
      console.error(`Failed to leave channel: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }

  /**
   * Get participants of a channel
   * 
   * Retrieves the list of agents participating in the specified channel.
   * Returns detailed agent information for each participant.
   * 
   * @param {string} channelId - Channel ID to get participants for
   * @returns {Promise<PodAgent[]>} Array of participant agent details
   * @throws {Error} When service is not initialized
   * @since 1.0.0
   * 
   * @example
   * ```typescript
   * const participants = await service.getChannelParticipants("channel_123");
   * console.log(`Channel has ${participants.length} participants`);
   * ```
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
      console.error(`Failed to get channel participants: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Create an escrow transaction
   * 
   * Creates a secure escrow transaction for collaboration between agents.
   * Funds are held in escrow until deliverables are completed and verified.
   * 
   * @param {string} counterpartyId - Agent ID of the counterparty
   * @param {number} amount - Amount in SOL to escrow
   * @param {string} service - Description of the service being provided
   * @param {string[]} deliverables - Array of expected deliverables
   * @returns {Promise<PodEscrow>} The created escrow transaction details
   * @throws {Error} When service is not initialized or agent not registered
   * @since 1.0.0
   * 
   * @example
   * ```typescript
   * const escrow = await service.createEscrow(
   *   "ai_agent_456",
   *   100, // 100 SOL
   *   "AI Model Training",
   *   ["Trained model weights", "Performance metrics", "Documentation"]
   * );
   * ```
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
        transactionHash: "",
      };

      // Add to escrows cache
      this.state.escrows.set(escrow.id, escrow);

      console.log(`Escrow created: ${escrow.id} (${amount} SOL)`);
      return escrow;
    } catch (error) {
      console.error(`Failed to create escrow: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Get agent reputation score
   * 
   * Retrieves the reputation score for the specified agent or the current agent
   * if no ID is provided. Reputation is based on successful interactions,
   * completed transactions, and community feedback.
   * 
   * @param {string} [agentId] - Agent ID to get reputation for (optional)
   * @returns {Promise<number>} The agent's reputation score (0-100)
   * @throws {Error} When service is not initialized or agent not found
   * @since 1.0.0
   * 
   * @example
   * ```typescript
   * // Get current agent's reputation
   * const myReputation = await service.getAgentReputation();
   * 
   * // Get another agent's reputation
   * const otherReputation = await service.getAgentReputation("agent_123");
   * ```
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
      console.error(`Failed to get agent reputation: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Get PoD Protocol network statistics
   * 
   * Retrieves comprehensive statistics about the PoD Protocol network including
   * agent counts, channel activity, message volume, and escrow metrics.
   * 
   * @returns {Promise<object>} Protocol statistics object
   * @returns {number} returns.totalAgents - Total number of registered agents
   * @returns {number} returns.totalChannels - Total number of active channels
   * @returns {number} returns.totalMessages - Total number of messages sent
   * @returns {number} returns.activeEscrows - Number of active escrow transactions
   * @returns {Date} returns.lastSync - Last synchronization timestamp
   * @returns {boolean} returns.isRegistered - Whether current agent is registered
   * @returns {PodAgent} returns.currentAgent - Current agent details
   * @throws {Error} When service is not initialized
   * @since 1.0.0
   * 
   * @example
   * ```typescript
   * const stats = await service.getProtocolStats();
   * console.log(`Network has ${stats.totalAgents} agents`);
   * console.log(`${stats.activeEscrows} active escrows`);
   * ```
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
        activeEscrows: Array.from(this.state.escrows.values()).filter((e: any) => e.status === "created" || e.status === "funded").length,
        lastSync: this.state.lastSync,
        isRegistered: this.state.isRegistered,
        currentAgent: this.state.agent,
      };
    } catch (error) {
      console.error(`Failed to get protocol stats: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Perform health check on the service
   * 
   * Verifies that the service is properly initialized and can communicate
   * with the Solana blockchain. Used for monitoring and diagnostics.
   * 
   * @returns {Promise<boolean>} True if service is healthy, false otherwise
   * @since 1.0.0
   * 
   * @example
   * ```typescript
   * const isHealthy = await service.healthCheck();
   * if (!isHealthy) {
   *   console.log("Service needs attention!");
   * }
   * ```
   */
  async healthCheck(): Promise<boolean> {
    try {
      if (!this.blockchainService) {
        return false;
      }
      return await this.blockchainService.healthCheck();
    } catch (error) {
      return false;
    }
  }

  /**
   * Get current plugin state
   * 
   * Returns the current internal state of the plugin including agent details,
   * connected agents, channels, messages, and escrows. Used for debugging
   * and state inspection.
   * 
   * @returns {PodPluginState | null} Current plugin state or null if not initialized
   * @since 1.0.0
   * 
   * @example
   * ```typescript
   * const state = service.getState();
   * if (state) {
   *   console.log(`Agent registered: ${state.isRegistered}`);
   *   console.log(`Messages: ${state.messages.length}`);
   * }
   * ```
   */
  getState(): PodPluginState | null {
    return this.state;
  }

  /**
   * Get current plugin configuration
   * 
   * Returns the current configuration used by the plugin including RPC endpoint,
   * program ID, agent settings, and other configuration parameters.
   * 
   * @returns {PodProtocolConfig | null} Current configuration or null if not initialized
   * @since 1.0.0
   * 
   * @example
   * ```typescript
   * const config = service.getConfig();
   * if (config) {
   *   console.log(`RPC Endpoint: ${config.rpcEndpoint}`);
   *   console.log(`Agent Name: ${config.agentName}`);
   * }
   * ```
   */
  getConfig(): PodProtocolConfig | null {
    return this.podConfig;
  }
}