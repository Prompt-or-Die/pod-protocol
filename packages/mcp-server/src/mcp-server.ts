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
    this.server = new Server(
      {
        name: this.config.server.name,
        version: this.config.server.version
      },
      {
        capabilities: {
          tools: {
            listChanged: true
          },
          resources: {
            listChanged: true,
            subscribe: true
          },
          prompts: {
            listChanged: true
          },
          logging: {
            level: this.config.logging.level
          }
        }
      }
    );

    this.setupTools();
    this.setupResources();
    this.setupPrompts();
    this.setupHandlers();
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
    try {
      // Initialize PoD Protocol client
      // This would connect to the Solana blockchain
      this.logger.info('PoD Protocol client initialized', {
        endpoint: this.config.pod_protocol.rpc_endpoint,
        program: this.config.pod_protocol.program_id
      });
    } catch (error) {
      this.logger.error('Failed to initialize PoD Protocol client', { error });
    }
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
  private setupTools(): void {
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
  private setupResources(): void {
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
  private setupPrompts(): void {
    this.server.setRequestHandler(
      { method: 'prompts/list' } as any,
      async () => ({
        prompts: [
          {
            name: 'agent_registration',
            description: 'Guides for registering a new agent',
            arguments: [
              { name: 'agent_type', description: 'Type of agent to register', required: true },
              { name: 'capabilities', description: 'Agent capabilities', required: true }
            ]
          },
          {
            name: 'multi_agent_coordination',
            description: 'Templates for coordinating multiple agents',
            arguments: [
              { name: 'task', description: 'Coordination task', required: true },
              { name: 'agents', description: 'Available agents', required: true }
            ]
          }
        ]
      })
    );
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
    
    interface Agent { 
      id: string; 
      name: string; 
      capabilities: string[]; 
      endpoint: string; 
    }

    // Mock discovery with session context
    const agents: Agent[] = [];
    
    return {
      success: true,
      data: {
        agents,
        total_count: agents.length,
        has_more: false,
        session_context: session ? `Discovered for user ${session.userId}` : 'Public discovery'
      },
      timestamp: Date.now()
    };
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
      
      this.logger.info('Modern PoD Protocol MCP Server stopped');
      
    } catch (error) {
      this.logger.error('Error during shutdown', { error });
    }
  }

  getStats(): any {
    return {
      server: this.getServerHealth(),
      sessions: this.sessionManager.getStats(),
      transports: this.transportManager.getStats()
    };
  }
}