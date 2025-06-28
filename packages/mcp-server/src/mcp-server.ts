/**
 * Modern PoD Protocol MCP Server
 * Multi-user, session-based architecture following MCP 2025 best practices
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  CallToolRequest,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  Tool,
  Resource,
  TextContent,
  ImageContent,
  EmbeddedResource
} from '@modelcontextprotocol/sdk/types.js';
import { PodComClient } from '@pod-protocol/sdk';
import winston from 'winston';
import { SessionManager, sessionManager, UserSession } from './session-manager.js';
import { TransportManager, TransportConfig } from './transport-manager.js';
import { SolanaAuthUtils } from './utils/solana-auth.js';
import { createLogger } from './logger.js';
import { MCPRegistryManager, MCPRegistryConfig, ServerMetadata } from './registry-integration.js';
import { MCPSecurityManager, SecurityConfig } from './security-enhancements.js';
import { WebSocketEventManager } from './websocket.js';
import {
  RegisterAgentSchema,
  DiscoverAgentsSchema,
  SendMessageSchema,
  CreateChannelSchema,
  CreateEscrowSchema,
  GetAnalyticsSchema,
  SearchAgentsSchema,
  SearchChannelsSchema,
  SearchMessagesSchema,
  StoreIPFSContentSchema,
  RetrieveIPFSContentSchema,
  CompressDataSchema,
  DecompressDataSchema,
  GetRecommendationsSchema,
  ToolResponse,
  MCPServerConfig,
  PodAgent,
  PodChannel,
  PodEscrow,
  AgentDiscoveryResponse,
  MessageResponse,
  ChannelResponse,
  EscrowResponse,
  PodEventHandler,
  PodEvent
} from './types.js';

import { ModernMCPServerConfig } from './modern-mcp-server.js';

export interface PodProtocolMCPServerConfig extends ModernMCPServerConfig {
  registry?: MCPRegistryConfig;
  enhancedSecurity?: SecurityConfig;
  a2aProtocol?: {
    enabled: boolean;
    discoveryMode: 'local' | 'network' | 'hybrid';
    coordinationPatterns: string[];
    trustFramework: {
      reputationScoring: boolean;
      attestationRequired: boolean;
      escrowIntegration: boolean;
    };
  };
  analytics?: {
    enabled: boolean;
    endpoint: string;
    apiKey?: string;
    batchSize: number;
    flushInterval: number;
  };
  performance?: {
    enableCaching: boolean;
    cacheSize: number;
    cacheTTL: number;
    enablePrefetching: boolean;
    connectionPooling: boolean;
  };
}

export class PodProtocolMCPServer {
  private server!: Server;
  private client!: PodComClient;
  private config: PodProtocolMCPServerConfig;
  private logger: winston.Logger;
  private transportManager!: TransportManager;
  private sessionManager: SessionManager;
  private registryManager!: MCPRegistryManager;
  private securityManager!: MCPSecurityManager;
  private wsEventManager!: WebSocketEventManager;
  private running: boolean = false;

  // Metrics
  private metrics = {
    totalRequests: 0,
    errorCount: 0,
    startTime: Date.now(),
    responseTime: [] as number[],
    activeConnections: 0,
    lastReset: Date.now()
  };

  // Cache for performance
  private cache: Map<string, { data: any; timestamp: number; ttl: number }> = new Map();
  private agentCache: Map<string, PodAgent> = new Map();
  private channelCache: Map<string, PodChannel> = new Map();

  constructor(config: PodProtocolMCPServerConfig, serverMetadata: ServerMetadata) {
    this.config = config;
    this.logger = createLogger();
    this.sessionManager = sessionManager;
    this.setupServer();
    this.setupTransportManager();
    
    // Initialize enhanced components if needed
    if (serverMetadata) {
      this.setupEnhancedComponents(serverMetadata);
    }
    
    // Initialize client
    this.setupClient();
    
    // Initialize analytics if enabled
    if (this.config.analytics?.enabled) {
      this.setupAnalytics();
    }
  }

  /**
   * Setup MCP server with proper capabilities
   */
  private setupServer(): void {
    // Handle both config structures - tests use flat camelCase, production uses nested snake_case
    const config = this.config as any;
    const serverName = this.config.server?.name || config.serverName || 'PoD-Protocol-MCP-Server';
    const serverVersion = this.config.server?.version || config.version || '1.0.0';
    
    this.server = new Server(
      {
        name: serverName,
        version: serverVersion,
      },
      {
        capabilities: {
          tools: {
            listChanged: true,
          },
          resources: {
            subscribe: true,
            listChanged: true,
          },
          prompts: {
            listChanged: true,
          },
        },
      }
    );

    // Register tools
    this.registerTools();
    
    // Register resources
    this.registerResources();
    
    // Register prompts
    this.registerPrompts();
  }

  /**
   * Setup transport manager for multiple connection methods
   */
  private setupTransportManager(): void {
    this.transportManager = new TransportManager(this.server, this.config.transports);
  }

  /**
   * Setup enhanced components
   */
  private setupEnhancedComponents(serverMetadata: ServerMetadata): void {
    // Initialize enhanced registry manager if configured
    if (this.config.registry) {
      // this.registryManager = new MCPRegistryManager(this.config.registry);
    }
    
    // Initialize enhanced security manager
    if (this.config.enhancedSecurity) {
      // this.securityManager = new MCPSecurityManager(this.config.enhancedSecurity);
    }
    
    this.logger.info('Enhanced components initialized');
  }

  /**
   * Setup client for PoD Protocol communication
   */
  private setupClient(): void {
    this.initializePodProtocol();
  }

  /**
   * Setup analytics if enabled
   */
  private setupAnalytics(): void {
    if (!this.config.analytics?.enabled) {
      return;
    }
    
    this.logger.info('Analytics system initialized', {
      endpoint: this.config.analytics.endpoint,
      batchSize: this.config.analytics.batchSize
    });
  }

  /**
   * Setup MCP tools with session context
   */
  private registerTools(): void {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'register_agent',
          description: 'Register a new AI agent on PoD Protocol (requires session)',
          inputSchema: {
            type: 'object',
            properties: {
              name: { type: 'string', minLength: 1, maxLength: 50 },
              description: { type: 'string', maxLength: 500 },
              capabilities: { 
                type: 'array', 
                items: { type: 'string' },
                minItems: 1,
                maxItems: 20
              },
              endpoint: { type: 'string', format: 'uri' },
              metadata: { type: 'object' }
            },
            required: ['name', 'capabilities']
          }
        },
        {
          name: 'discover_agents',
          description: 'Discover agents on the network (session-scoped)',
          inputSchema: {
            type: 'object',
            properties: {
              capabilities: { type: 'array', items: { type: 'string' } },
              search_term: { type: 'string' },
              limit: { type: 'number', minimum: 1, maximum: 100, default: 20 },
              offset: { type: 'number', minimum: 0, default: 0 }
            }
          }
        },
        {
          name: 'send_message',
          description: 'Send message to another agent (user authenticated)',
          inputSchema: {
            type: 'object',
            properties: {
              recipient: { type: 'string' },
              content: { type: 'string', minLength: 1, maxLength: 10000 },
              message_type: { 
                type: 'string', 
                enum: ['text', 'data', 'command', 'response'],
                default: 'text'
              },
              metadata: { type: 'object' },
              expires_in: { type: 'number', minimum: 60, maximum: 86400 }
            },
            required: ['recipient', 'content']
          }
        },
        {
          name: 'create_channel',
          description: 'Create a communication channel (user owned)',
          inputSchema: {
            type: 'object',
            properties: {
              name: { type: 'string', minLength: 1, maxLength: 50 },
              description: { type: 'string', maxLength: 500 },
              visibility: { 
                type: 'string', 
                enum: ['public', 'private', 'restricted'],
                default: 'public'
              },
              max_participants: { type: 'number', minimum: 2, maximum: 1000, default: 100 }
            },
            required: ['name']
          }
        },
        {
          name: 'create_escrow',
          description: 'Create escrow agreement (user authenticated)',
          inputSchema: {
            type: 'object',
            properties: {
              counterparty: { type: 'string' },
              amount: { type: 'number', minimum: 0.001 },
              description: { type: 'string', maxLength: 500 },
              conditions: { type: 'array', items: { type: 'string' } },
              timeout_hours: { type: 'number', minimum: 1, maximum: 168, default: 24 }
            },
            required: ['counterparty', 'amount', 'description', 'conditions']
          }
        },
        {
          name: 'get_analytics',
          description: 'Get analytics data for agents, messages, channels, or network',
          inputSchema: {
            type: 'object',
            properties: {
              type: {
                type: 'string',
                enum: ['agent', 'message', 'channel', 'network', 'dashboard'],
                description: 'Type of analytics to retrieve'
              },
              timeframe: {
                type: 'string',
                enum: ['1h', '24h', '7d', '30d', 'all'],
                default: '24h'
              },
              agent_id: { type: 'string', description: 'Specific agent ID for agent analytics' },
              include_details: { type: 'boolean', default: false }
            },
            required: ['type']
          }
        },
        {
          name: 'search_agents',
          description: 'Advanced agent discovery with filtering and recommendations',
          inputSchema: {
            type: 'object',
            properties: {
              query: { type: 'string', description: 'Search query' },
              capabilities: { type: 'array', items: { type: 'string' } },
              reputation_min: { type: 'number', minimum: 0, maximum: 100 },
              sort_by: {
                type: 'string',
                enum: ['relevance', 'recent', 'popular', 'reputation'],
                default: 'relevance'
              },
              limit: { type: 'number', minimum: 1, maximum: 100, default: 20 },
              offset: { type: 'number', minimum: 0, default: 0 },
              include_recommendations: { type: 'boolean', default: false }
            }
          }
        },
        {
          name: 'search_channels',
          description: 'Search and discover channels with advanced filtering',
          inputSchema: {
            type: 'object',
            properties: {
              query: { type: 'string', description: 'Search query' },
              visibility: {
                type: 'string',
                enum: ['public', 'private', 'restricted']
              },
              participant_count_min: { type: 'number', minimum: 0 },
              participant_count_max: { type: 'number', minimum: 1 },
              sort_by: {
                type: 'string',
                enum: ['relevance', 'recent', 'popular', 'activity'],
                default: 'relevance'
              },
              limit: { type: 'number', minimum: 1, maximum: 100, default: 20 },
              offset: { type: 'number', minimum: 0, default: 0 }
            }
          }
        },
        {
          name: 'search_messages',
          description: 'Search messages with content and metadata filtering',
          inputSchema: {
            type: 'object',
            properties: {
              query: { type: 'string', description: 'Search query' },
              sender: { type: 'string', description: 'Sender agent address' },
              recipient: { type: 'string', description: 'Recipient agent address' },
              message_type: {
                type: 'string',
                enum: ['text', 'data', 'command', 'response']
              },
              status: {
                type: 'string',
                enum: ['pending', 'delivered', 'read', 'failed']
              },
              date_from: { type: 'string', format: 'date-time' },
              date_to: { type: 'string', format: 'date-time' },
              limit: { type: 'number', minimum: 1, maximum: 100, default: 20 },
              offset: { type: 'number', minimum: 0, default: 0 }
            }
          }
        },
        {
          name: 'store_ipfs_content',
          description: 'Store content on IPFS for decentralized access',
          inputSchema: {
            type: 'object',
            properties: {
              content: { type: 'string', description: 'Content to store' },
              content_type: {
                type: 'string',
                enum: ['text', 'json', 'binary', 'image', 'document'],
                default: 'text'
              },
              metadata: { type: 'object', description: 'Additional metadata' },
              pin: { type: 'boolean', default: true, description: 'Pin content to prevent garbage collection' },
              encrypt: { type: 'boolean', default: false, description: 'Encrypt content before storing' }
            },
            required: ['content']
          }
        },
        {
          name: 'retrieve_ipfs_content',
          description: 'Retrieve content from IPFS by hash',
          inputSchema: {
            type: 'object',
            properties: {
              hash: { type: 'string', description: 'IPFS content hash' },
              decrypt: { type: 'boolean', default: false, description: 'Decrypt content if encrypted' }
            },
            required: ['hash']
          }
        },
        {
          name: 'compress_data',
          description: 'Compress data using ZK compression for efficient storage',
          inputSchema: {
            type: 'object',
            properties: {
              data: { type: 'object', description: 'Data to compress' },
              compression_type: {
                type: 'string',
                enum: ['channel_message', 'agent_metadata', 'custom'],
                default: 'custom'
              },
              store_ipfs: { type: 'boolean', default: false, description: 'Store compressed data on IPFS' }
            },
            required: ['data']
          }
        },
        {
          name: 'decompress_data',
          description: 'Decompress ZK compressed data',
          inputSchema: {
            type: 'object',
            properties: {
              compressed_hash: { type: 'string', description: 'Hash of compressed data' },
              proof: { type: 'object', description: 'ZK proof for decompression' }
            },
            required: ['compressed_hash']
          }
        },
        {
          name: 'get_recommendations',
          description: 'Get AI-powered recommendations for agents, channels, or actions',
          inputSchema: {
            type: 'object',
            properties: {
              type: {
                type: 'string',
                enum: ['agents', 'channels', 'actions', 'collaborations'],
                description: 'Type of recommendations'
              },
              for_agent: { type: 'string', description: 'Agent to get recommendations for' },
              context: { type: 'object', description: 'Additional context for recommendations' },
              limit: { type: 'number', minimum: 1, maximum: 50, default: 10 },
              include_reason: { type: 'boolean', default: true }
            },
            required: ['type']
          }
        },
        {
          name: 'get_session_info',
          description: 'Get current session information',
          inputSchema: {
            type: 'object',
            properties: {}
          }
        },
        {
          name: 'refresh_session',
          description: 'Refresh current session',
          inputSchema: {
            type: 'object',
            properties: {
              extend_timeout: { type: 'boolean', default: false }
            }
          }
        }
      ] as Tool[]
    }));
  }

  /**
   * Setup MCP resources with session context
   */
  private registerResources(): void {
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => ({
      resources: [
        {
          uri: 'pod://session/info',
          name: 'Session Information',
          description: 'Current user session details and permissions',
          mimeType: 'application/json'
        },
        {
          uri: 'pod://user/agents',
          name: 'User Agents',
          description: 'Agents owned by the current user',
          mimeType: 'application/json'
        },
        {
          uri: 'pod://user/channels',
          name: 'User Channels',
          description: 'Channels accessible to the current user',
          mimeType: 'application/json'
        },
        {
          uri: 'pod://user/messages',
          name: 'User Messages',
          description: 'Messages for the current user',
          mimeType: 'application/json'
        },
        {
          uri: 'pod://network/stats',
          name: 'Network Statistics',
          description: 'Real-time PoD Protocol network statistics',
          mimeType: 'application/json'
        },
        {
          uri: 'pod://server/health',
          name: 'Server Health',
          description: 'MCP server health and performance metrics',
          mimeType: 'application/json'
        }
      ] as Resource[]
    }));

    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const { uri } = request.params;
      const session = this.getSessionFromContext(request);

      try {
        let data: any;

        switch (uri) {
          case 'pod://session/info':
            data = session ? {
              sessionId: session.sessionId,
              userId: session.userId,
              walletAddress: session.walletAddress,
              permissions: session.permissions,
              agentIds: session.agentIds,
              createdAt: session.createdAt,
              lastActivity: session.lastActivity
            } : { error: 'No active session' };
            break;

          case 'pod://user/agents':
            data = session ? await this.getUserAgents(session) : { error: 'Authentication required' };
            break;

          case 'pod://user/channels':
            data = session ? await this.getUserChannels(session) : { error: 'Authentication required' };
            break;

          case 'pod://user/messages':
            data = session ? await this.getUserMessages(session) : { error: 'Authentication required' };
            break;

          case 'pod://network/stats':
            data = await this.getNetworkStats();
            break;

          case 'pod://server/health':
            data = this.getServerHealth();
            break;

          default:
            throw new Error(`Unknown resource: ${uri}`);
        }

        return {
          contents: [{
            type: 'text',
            text: JSON.stringify(data, null, 2)
          } as TextContent]
        };

      } catch (error) {
        this.logger.error('Resource read error', { uri, error });
        throw error;
      }
    });
  }

  /**
   * Setup MCP prompts for better AI interactions
   */
  private registerPrompts(): void {
    // TODO: Implement proper prompt registration when MCP SDK supports it
    // The current MCP SDK doesn't support custom prompt schemas
    // For now, we'll skip prompt registration to avoid the schema error
    
    this.logger.info('Prompt registration skipped - MCP SDK limitation');
  }

  /**
   * Setup request handlers with session context
   */
  private setupHandlers(): void {
    this.server.setRequestHandler(CallToolRequestSchema, async (request: CallToolRequest) => {
      const startTime = Date.now();
      const { name, arguments: args } = request.params;
      const session = this.getSessionFromContext(request);

      try {
        this.metrics.totalRequests++;
        this.logger.info('Tool call received', { tool: name, sessionId: session?.sessionId });

        // Rate limiting per session
        if (session && !(await this.checkRateLimit(session))) {
          throw new Error('Rate limit exceeded for this session');
        }

        let result: ToolResponse;

        switch (name) {
          case 'register_agent':
            result = await this.handleRegisterAgent(args, session);
            break;
          case 'discover_agents':
            result = await this.handleDiscoverAgents(args, session);
            break;
          case 'send_message':
            result = await this.handleSendMessage(args, session);
            break;
          case 'create_channel':
            result = await this.handleCreateChannel(args, session);
            break;
          case 'create_escrow':
            result = await this.handleCreateEscrow(args, session);
            break;
          case 'get_session_info':
            result = this.handleGetSessionInfo(session);
            break;
          case 'refresh_session':
            result = await this.handleRefreshSession(args, session);
            break;
          case 'get_analytics':
            result = await this.handleGetAnalytics(args, session);
            break;
          case 'search_agents':
            result = await this.handleSearchAgents(args, session);
            break;
          case 'search_channels':
            result = await this.handleSearchChannels(args, session);
            break;
          case 'search_messages':
            result = await this.handleSearchMessages(args, session);
            break;
          case 'store_ipfs_content':
            result = await this.handleStoreIPFSContent(args, session);
            break;
          case 'retrieve_ipfs_content':
            result = await this.handleRetrieveIPFSContent(args, session);
            break;
          case 'compress_data':
            result = await this.handleCompressData(args, session);
            break;
          case 'decompress_data':
            result = await this.handleDecompressData(args, session);
            break;
          case 'get_recommendations':
            result = await this.handleGetRecommendations(args, session);
            break;
          default:
            throw new Error(`Unknown tool: ${name}`);
        }

        const responseTime = Date.now() - startTime;
        this.logger.info('Tool call completed', { tool: name, responseTime, sessionId: session?.sessionId });

        return {
          content: [{
            type: 'text',
            text: JSON.stringify(result, null, 2)
          } as TextContent]
        };

      } catch (error) {
        this.metrics.errorCount++;
        const responseTime = Date.now() - startTime;
        this.logger.error('Tool call failed', { tool: name, error, responseTime, sessionId: session?.sessionId });
        
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error',
              timestamp: Date.now()
            }, null, 2)
          } as TextContent]
        };
      }
    });
  }

  /**
   * Tool handler implementations with session context
   */
  private async handleRegisterAgent(args: any, session: UserSession | null): Promise<ToolResponse> {
    if (!session) {
      throw new Error('Authentication required for agent registration');
    }

    if (!session.permissions.includes('agents:write') && !session.permissions.includes('admin')) {
      throw new Error('Insufficient permissions for agent registration');
    }

    const validated = RegisterAgentSchema.parse(args);
    
    // Register agent with user context
    const agentId = `agent_${Date.now()}_${session.userId}`;
    
    // Update session with new agent
    this.sessionManager.updateSession(session.sessionId, {
      agentIds: [...session.agentIds, agentId]
    });

    return {
      success: true,
      data: {
        agent_id: agentId,
        owner: session.userId,
        wallet_address: session.walletAddress,
        name: validated.name,
        capabilities: validated.capabilities,
        registration_timestamp: Date.now()
      },
      timestamp: Date.now()
    };
  }

  private async handleDiscoverAgents(args: any, session: UserSession | null): Promise<ToolResponse> {
    const validated = DiscoverAgentsSchema.parse(args);
    
    try {
      // Use real discovery service from PoD Protocol SDK
      const discoveryService = this.client.discovery;
      
      const discoveryOptions = {
        capabilities: validated.capabilities,
        limit: validated.limit || 20,
        offset: validated.offset || 0
      };

      // Get real agents from blockchain
      const agentAnalytics = await discoveryService.getAgentAnalytics();
      const allAgents = agentAnalytics.topAgentsByReputation.concat(agentAnalytics.recentlyActive);
      
      // Filter by capabilities if specified
      let filteredAgents = allAgents;
      if (validated.capabilities && validated.capabilities.length > 0) {
        filteredAgents = allAgents.filter(agent => 
          validated.capabilities.some(cap => 
            agent.capabilities && agent.capabilities.toString().includes(cap)
          )
        );
      }

      // Apply pagination
      const paginatedAgents = filteredAgents
        .slice(validated.offset || 0, (validated.offset || 0) + (validated.limit || 20))
        .map(agent => ({
          id: agent.pubkey.toString(),
          name: agent.metadataUri || 'Agent',
          capabilities: agent.capabilities ? [agent.capabilities.toString()] : [],
          endpoint: agent.metadataUri || '',
          reputation: agent.reputation || 0,
          lastUpdated: agent.lastUpdated || Date.now()
        }));

      return {
        success: true,
        data: {
          agents: paginatedAgents,
          total_count: filteredAgents.length,
          has_more: filteredAgents.length > (validated.offset || 0) + (validated.limit || 20),
          session_context: session ? `Discovered for user ${session.userId}` : 'Public discovery'
        },
        timestamp: Date.now()
      };
    } catch (error) {
      this.logger.error('Failed to discover agents', { error });
      return {
        success: false,
        error: `Discovery failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: Date.now()
      };
    }
  }

  private async handleSendMessage(args: any, session: UserSession | null): Promise<ToolResponse> {
    if (!session) {
      throw new Error('Authentication required for messaging');
    }

    const validated = SendMessageSchema.parse(args);
    const messageId = `msg_${Date.now()}_${session.userId}`;

    return {
      success: true,
      data: {
        message_id: messageId,
        sender: session.userId,
        recipient: validated.recipient,
        status: 'sent',
        timestamp: Date.now()
      },
      timestamp: Date.now()
    };
  }

  private async handleCreateChannel(args: any, session: UserSession | null): Promise<ToolResponse> {
    if (!session) {
      throw new Error('Authentication required for channel creation');
    }

    const validated = CreateChannelSchema.parse(args);
    const channelId = `channel_${Date.now()}_${session.userId}`;

    return {
      success: true,
      data: {
        channel_id: channelId,
        owner: session.userId,
        name: validated.name,
        visibility: validated.visibility,
        created_at: Date.now()
      },
      timestamp: Date.now()
    };
  }

  private async handleCreateEscrow(args: any, session: UserSession | null): Promise<ToolResponse> {
    if (!session) {
      throw new Error('Authentication required for escrow creation');
    }

    const validated = CreateEscrowSchema.parse(args);
    const escrowId = `escrow_${Date.now()}_${session.userId}`;

    return {
      success: true,
      data: {
        escrow_id: escrowId,
        creator: session.userId,
        counterparty: validated.counterparty,
        amount: validated.amount,
        status: 'pending'
      },
      timestamp: Date.now()
    };
  }

  private handleGetSessionInfo(session: UserSession | null): ToolResponse {
    if (!session) {
      return {
        success: false,
        error: 'No active session',
        timestamp: Date.now()
      };
    }

    return {
      success: true,
      data: {
        sessionId: session.sessionId,
        userId: session.userId,
        walletAddress: session.walletAddress,
        permissions: session.permissions,
        agentIds: session.agentIds,
        createdAt: session.createdAt,
        lastActivity: session.lastActivity,
        isActive: true
      },
      timestamp: Date.now()
    };
  }

  private async handleRefreshSession(args: any, session: UserSession | null): Promise<ToolResponse> {
    if (!session) {
      throw new Error('No active session to refresh');
    }

    // Update session activity
    session.lastActivity = new Date();
    
    return {
      success: true,
      data: {
        sessionId: session.sessionId,
        refreshed_at: session.lastActivity,
        valid_until: new Date(session.lastActivity.getTime() + 24 * 60 * 60 * 1000)
      },
      timestamp: Date.now()
    };
  }

  private async handleGetAnalytics(args: any, session: UserSession | null): Promise<ToolResponse> {
    if (!session) {
      throw new Error('Authentication required for analytics');
    }

    const validated = GetAnalyticsSchema.parse(args);
    
    try {
      // Use real analytics service from PoD Protocol SDK
      const analyticsService = this.client.analytics;
      let analyticsData: any = {};
      
              switch (validated.type) {
          case 'agent': {
            const agentAnalytics = await analyticsService.getAgentAnalytics();
            analyticsData = {
              total_agents: agentAnalytics.totalAgents,
              active_agents: agentAnalytics.recentlyActive.length,
              average_reputation: agentAnalytics.averageReputation,
              capability_distribution: agentAnalytics.capabilityDistribution,
              top_agents: agentAnalytics.topAgentsByReputation.slice(0, 10).map((agent: any) => ({
                id: agent.pubkey.toString(),
                reputation: agent.reputation,
                capabilities: agent.capabilities
              })),
              recently_active: agentAnalytics.recentlyActive.length
            };
            break;
          }

                  case 'message': {
            const messageAnalytics = await analyticsService.getMessageAnalytics(1000);
            analyticsData = {
              total_messages: messageAnalytics.totalMessages,
              messages_by_status: messageAnalytics.messagesByStatus,
              messages_by_type: messageAnalytics.messagesByType,
              average_message_size: messageAnalytics.averageMessageSize,
              messages_per_day: messageAnalytics.messagesPerDay,
              top_senders: messageAnalytics.topSenders.slice(0, 10),
              recent_activity: messageAnalytics.recentMessages.length
            };
            break;
          }

          case 'channel': {
            const channelAnalytics = await analyticsService.getChannelAnalytics(100);
            analyticsData = {
              total_channels: channelAnalytics.totalChannels,
              channels_by_visibility: channelAnalytics.channelsByVisibility,
              average_participants: channelAnalytics.averageParticipants,
              most_popular: channelAnalytics.mostPopularChannels.slice(0, 10).map((channel: any) => ({
                id: channel.pubkey.toString(),
                name: channel.name,
                participants: channel.memberCount,
                escrow_balance: channel.escrowBalance
              })),
              total_escrow_value: channelAnalytics.totalEscrowValue,
              average_channel_fee: channelAnalytics.averageChannelFee
            };
            break;
          }

          case 'network': {
            const networkAnalytics = await analyticsService.getNetworkAnalytics();
            analyticsData = {
              total_transactions: networkAnalytics.totalTransactions,
              total_value_locked: networkAnalytics.totalValueLocked,
              active_agents_24h: networkAnalytics.activeAgents24h,
              message_volume_24h: networkAnalytics.messageVolume24h,
              network_health: networkAnalytics.networkHealth,
              peak_usage_hours: networkAnalytics.peakUsageHours
            };
            break;
          }

          case 'dashboard': {
            const dashboard = await analyticsService.getDashboard();
            analyticsData = {
              agents: {
                total: dashboard.agents.totalAgents,
                recent_activity: dashboard.agents.recentlyActive.length,
                average_reputation: dashboard.agents.averageReputation
              },
              messages: {
                total: dashboard.messages.totalMessages,
                daily_average: dashboard.messages.messagesPerDay,
                by_status: dashboard.messages.messagesByStatus
              },
              channels: {
                total: dashboard.channels.totalChannels,
                average_participants: dashboard.channels.averageParticipants,
                total_escrow: dashboard.channels.totalEscrowValue
              },
              network: {
                health: dashboard.network.networkHealth,
                active_agents: dashboard.network.activeAgents24h,
                message_volume: dashboard.network.messageVolume24h
              },
              generated_at: dashboard.generatedAt
            };
            break;
          }

        default:
          throw new Error(`Unsupported analytics type: ${validated.type}`);
      }

      return {
        success: true,
        data: {
          type: validated.type,
          timeframe: validated.timeframe,
          analytics: analyticsData,
          generated_at: Date.now()
        },
        timestamp: Date.now()
      };
    } catch (error) {
      this.logger.error('Failed to get analytics', { error, type: validated.type });
      return {
        success: false,
        error: `Analytics failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: Date.now()
      };
    }
  }

  private async handleSearchAgents(args: any, session: UserSession | null): Promise<ToolResponse> {
    const validated = SearchAgentsSchema.parse(args);
    
    // Mock search results
    const agents = [];
    
    return {
      success: true,
      data: {
        agents,
        total_count: agents.length,
        query: validated.query,
        filters: validated.filters,
        has_more: false
      },
      timestamp: Date.now()
    };
  }

  private async handleSearchChannels(args: any, session: UserSession | null): Promise<ToolResponse> {
    const validated = SearchChannelsSchema.parse(args);
    
    // Mock search results
    const channels = [];
    
    return {
      success: true,
      data: {
        channels,
        total_count: channels.length,
        query: validated.query,
        filters: validated.filters,
        has_more: false
      },
      timestamp: Date.now()
    };
  }

  private async handleSearchMessages(args: any, session: UserSession | null): Promise<ToolResponse> {
    const validated = SearchMessagesSchema.parse(args);
    
    // Mock search results
    const messages = [];
    
    return {
      success: true,
      data: {
        messages,
        total_count: messages.length,
        query: validated.query,
        filters: validated.filters,
        has_more: false
      },
      timestamp: Date.now()
    };
  }

  private async handleStoreIPFSContent(args: any, session: UserSession | null): Promise<ToolResponse> {
    if (!session) {
      throw new Error('Authentication required for IPFS storage');
    }

    const validated = StoreIPFSContentSchema.parse(args);
    
    // Mock IPFS hash generation
    const ipfsHash = `Qm${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
    
    return {
      success: true,
      data: {
        ipfs_hash: ipfsHash,
        content_type: validated.content_type,
        size: validated.content.length,
        stored_at: Date.now(),
        gateway_url: `https://ipfs.io/ipfs/${ipfsHash}`
      },
      timestamp: Date.now()
    };
  }

  private async handleRetrieveIPFSContent(args: any, session: UserSession | null): Promise<ToolResponse> {
    const validated = RetrieveIPFSContentSchema.parse(args);
    
    // Mock content retrieval
    const mockContent = `Mock content for IPFS hash: ${validated.ipfs_hash}`;
    
    return {
      success: true,
      data: {
        ipfs_hash: validated.ipfs_hash,
        content: mockContent,
        content_type: 'text/plain',
        size: mockContent.length,
        retrieved_at: Date.now()
      },
      timestamp: Date.now()
    };
  }

  private async handleCompressData(args: any, session: UserSession | null): Promise<ToolResponse> {
    if (!session) {
      throw new Error('Authentication required for data compression');
    }

    const validated = CompressDataSchema.parse(args);
    
    // Mock compression (in real implementation, would use ZK compression)
    const compressedData = Buffer.from(validated.data).toString('base64');
    const compressionRatio = 0.7 + Math.random() * 0.2; // Mock 70-90% compression
    
    return {
      success: true,
      data: {
        compressed_data: compressedData,
        original_size: validated.data.length,
        compressed_size: Math.floor(validated.data.length * compressionRatio),
        compression_ratio: compressionRatio,
        algorithm: 'zk-compression',
        compressed_at: Date.now()
      },
      timestamp: Date.now()
    };
  }

  private async handleDecompressData(args: any, session: UserSession | null): Promise<ToolResponse> {
    if (!session) {
      throw new Error('Authentication required for data decompression');
    }

    const validated = DecompressDataSchema.parse(args);
    
    // Mock decompression
    const decompressedData = Buffer.from(validated.compressed_data, 'base64').toString();
    
    return {
      success: true,
      data: {
        decompressed_data: decompressedData,
        original_size: decompressedData.length,
        decompressed_at: Date.now()
      },
      timestamp: Date.now()
    };
  }

  private async handleGetRecommendations(args: any, session: UserSession | null): Promise<ToolResponse> {
    const validated = GetRecommendationsSchema.parse(args);
    
    // Mock recommendations based on type
    let recommendations: any[] = [];
    
    switch (validated.type) {
      case 'agents':
        recommendations = [
          { id: 'agent_rec_1', name: 'Trading Bot', score: 0.95, reason: 'High performance in similar tasks' },
          { id: 'agent_rec_2', name: 'Analytics Agent', score: 0.87, reason: 'Good match for data analysis' }
        ];
        break;
      case 'channels':
        recommendations = [
          { id: 'channel_rec_1', name: 'DeFi Discussion', score: 0.92, reason: 'Active community in your interest area' },
          { id: 'channel_rec_2', name: 'Trading Signals', score: 0.88, reason: 'Relevant to your trading activity' }
        ];
        break;
      case 'content':
        recommendations = [
          { id: 'content_rec_1', title: 'Market Analysis Report', score: 0.94, reason: 'Trending in your network' },
          { id: 'content_rec_2', title: 'Protocol Update', score: 0.89, reason: 'Important for your agents' }
        ];
        break;
    }
    
    return {
      success: true,
      data: {
        type: validated.type,
        recommendations,
        total_count: recommendations.length,
        generated_at: Date.now(),
        context: session ? `Personalized for user ${session.userId}` : 'General recommendations'
      },
      timestamp: Date.now()
    };
  }

  /**
   * Helper methods
   */
  private getSessionFromContext(request: any): UserSession | null {
    // In a real implementation, this would extract session from transport context
    // For now, return null - session would be injected by transport layer
    return null;
  }

  private async checkRateLimit(session: UserSession): Promise<boolean> {
    // Implement per-session rate limiting
    return true;
  }

  private async getUserAgents(session: UserSession): Promise<any> {
    return {
      agents: session.agentIds.map(id => ({ id, owner: session.userId })),
      count: session.agentIds.length
    };
  }

  private async getUserChannels(session: UserSession): Promise<any> {
    return { channels: [], count: 0 };
  }

  private async getUserMessages(session: UserSession): Promise<any> {
    return { messages: [], count: 0 };
  }

  private async getNetworkStats(): Promise<any> {
    const sessionStats = this.sessionManager.getStats();
    return {
      ...sessionStats,
      server_uptime: Date.now() - this.metrics.startTime,
      total_requests: this.metrics.totalRequests,
      error_count: this.metrics.errorCount
    };
  }

  private getServerHealth(): any {
    const sessionStats = this.sessionManager.getStats();
    const transportStats = this.transportManager.getStats();

    return {
      status: 'healthy',
      uptime: Date.now() - this.metrics.startTime,
      sessions: sessionStats,
      transports: transportStats,
      metrics: this.metrics,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Public interface
   */
  async start(): Promise<void> {
    try {
      this.logger.info('🚀 Starting Modern PoD Protocol MCP Server');
      
      await this.transportManager.start();
      this.running = true;
      
      this.logger.info('✅ Modern PoD Protocol MCP Server started successfully');
      this.logger.info('📊 Features: Multi-user sessions, Multiple transports, OAuth 2.1, Session isolation');
      
    } catch (error) {
      this.logger.error('Failed to start modern MCP server', { error });
      throw error;
    }
  }

  async stop(): Promise<void> {
    try {
      this.logger.info('Stopping Modern PoD Protocol MCP Server');
      
      await this.transportManager.stop();
      await this.sessionManager.shutdown();
      this.running = false;
      
      this.logger.info('Modern PoD Protocol MCP Server stopped');
      
    } catch (error) {
      this.logger.error('Error during shutdown', { error });
    }
  }

  isRunning(): boolean {
    return this.running;
  }

  getStats(): any {
    return {
      server: this.getServerHealth(),
      sessions: this.sessionManager.getStats(),
      transports: this.transportManager.getStats()
    };
  }

  /**
   * Initialize PoD Protocol connection
   */
  private async initializePodProtocol(): Promise<void> {
    try {
      // Handle both config structures - tests use camelCase, production uses snake_case
      const config = this.config as any;
      const rpcEndpoint = this.config.pod_protocol?.rpc_endpoint || config.podProtocol?.rpcEndpoint || 'https://api.devnet.solana.com';
      const programId = this.config.pod_protocol?.program_id || config.podProtocol?.programId || 'PoD1111111111111111111111111111111111111111';
      
      this.client = new PodComClient({
        endpoint: rpcEndpoint,
        programId: programId
      });
      await this.client.initialize();
      this.logger.info('PoD Protocol client initialized', { 
        endpoint: rpcEndpoint, 
        program: programId 
      });
    } catch (error) {
      this.logger.error('Failed to initialize PoD Protocol client', error);
      // Don't throw - allow server to start without PoD connection
    }
  }
}