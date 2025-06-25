/**
 * PoD Protocol MCP Server
 * Bridges AI agent runtimes (ElizaOS, AutoGen, CrewAI) with PoD Protocol
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
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
import { createKeyPairFromBytes } from '@solana/web3.js';
import winston from 'winston';
import { readFileSync } from 'fs';
import {
  MCPServerConfig,
  PodAgent,
  PodMessage,
  PodChannel,
  PodEscrow,
  ToolResponse,
  AgentDiscoveryResponse,
  MessageResponse,
  ChannelResponse,
  EscrowResponse,
  PodEventHandler,
  PodEvent
} from './types.js';
import { WebSocketEventManager } from './websocket.js';
import {
  RegisterAgentSchema,
  DiscoverAgentsSchema,
  GetAgentSchema,
  SendMessageSchema,
  GetMessagesSchema,
  MarkMessageReadSchema,
  CreateChannelSchema,
  JoinChannelSchema,
  SendChannelMessageSchema,
  GetChannelMessagesSchema,
  CreateEscrowSchema,
  ReleaseEscrowSchema,
  GetAgentStatsSchema,
  GetNetworkStatsSchema
} from './types.js';

export class PodProtocolMCPServer {
  private server: Server;
  private client: PodComClient;
  private config: MCPServerConfig;
  private logger: winston.Logger;
  private eventHandlers: Map<string, PodEventHandler[]> = new Map();
  private wsEventManager: WebSocketEventManager;
  
  // Cache for performance
  private agentCache: Map<string, PodAgent> = new Map();
  private channelCache: Map<string, PodChannel> = new Map();
  
  constructor(config: MCPServerConfig) {
    this.config = config;
    this.setupLogger();
    this.setupClient();
    this.setupServer();
    this.wsEventManager = new WebSocketEventManager(config, this.logger);
  }

  private setupLogger(): void {
    this.logger = winston.createLogger({
      level: this.config.logging.level,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      transports: [
        ...(this.config.logging.console_output ? [new winston.transports.Console()] : []),
        ...(this.config.logging.file_path ? [
          new winston.transports.File({ filename: this.config.logging.file_path })
        ] : [])
      ]
    });
  }

  private async setupClient(): Promise<void> {
    this.client = new PodComClient({
      endpoint: this.config.pod_protocol.rpc_endpoint,
      programId: this.config.pod_protocol.program_id,
      commitment: this.config.pod_protocol.commitment
    });

    // Initialize with wallet if available
    if (this.config.agent_runtime.wallet_path) {
      try {
        const walletBytes = readFileSync(this.config.agent_runtime.wallet_path);
        const keypair = createKeyPairFromBytes(walletBytes);
        await this.client.initialize(keypair);
        this.logger.info('PoD Protocol client initialized with wallet');
      } catch (error) {
        this.logger.warn('Failed to load wallet, running in read-only mode', { error });
        await this.client.initialize();
      }
    } else {
      await this.client.initialize();
    }
  }

  private setupServer(): void {
    this.server = new Server(
      {
        name: 'pod-protocol-mcp-server',
        version: '1.0.0'
      },
      {
        capabilities: {
          tools: {},
          resources: {}
        }
      }
    );

    this.setupTools();
    this.setupResources();
    this.setupHandlers();
  }

  private setupTools(): void {
    // Agent Management Tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        // Agent Management
        {
          name: 'register_agent',
          description: 'Register a new AI agent on PoD Protocol network',
          inputSchema: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'Agent name' },
              description: { type: 'string', description: 'Agent description' },
              capabilities: { 
                type: 'array', 
                items: { type: 'string' },
                description: 'Agent capabilities (e.g., ["trading", "analysis"])' 
              },
              endpoint: { type: 'string', description: 'Agent API endpoint (optional)' },
              metadata: { type: 'object', description: 'Additional agent metadata' }
            },
            required: ['name', 'capabilities']
          }
        },
        {
          name: 'discover_agents',
          description: 'Discover other agents on the network by capabilities or search terms',
          inputSchema: {
            type: 'object',
            properties: {
              capabilities: { 
                type: 'array', 
                items: { type: 'string' },
                description: 'Filter by capabilities' 
              },
              search_term: { type: 'string', description: 'Search term for agent name/description' },
              limit: { type: 'number', default: 20, description: 'Results limit' },
              offset: { type: 'number', default: 0, description: 'Results offset' }
            }
          }
        },
        {
          name: 'get_agent',
          description: 'Get detailed information about a specific agent',
          inputSchema: {
            type: 'object',
            properties: {
              agent_id: { type: 'string', description: 'Agent ID or address' }
            },
            required: ['agent_id']
          }
        },

        // Message Management
        {
          name: 'send_message',
          description: 'Send a direct message to another agent',
          inputSchema: {
            type: 'object',
            properties: {
              recipient: { type: 'string', description: 'Recipient agent ID' },
              content: { type: 'string', description: 'Message content' },
              message_type: { 
                type: 'string', 
                enum: ['text', 'data', 'command', 'response'],
                default: 'text' 
              },
              metadata: { type: 'object', description: 'Additional message metadata' },
              expires_in: { type: 'number', description: 'Message expiration in seconds' }
            },
            required: ['recipient', 'content']
          }
        },
        {
          name: 'get_messages',
          description: 'Get messages for the current agent',
          inputSchema: {
            type: 'object',
            properties: {
              limit: { type: 'number', default: 20 },
              offset: { type: 'number', default: 0 },
              message_type: { type: 'string', enum: ['text', 'data', 'command', 'response'] },
              status: { type: 'string', enum: ['pending', 'delivered', 'read', 'expired'] }
            }
          }
        },
        {
          name: 'mark_message_read',
          description: 'Mark a message as read',
          inputSchema: {
            type: 'object',
            properties: {
              message_id: { type: 'string', description: 'Message ID' }
            },
            required: ['message_id']
          }
        },

        // Channel Management
        {
          name: 'create_channel',
          description: 'Create a new communication channel',
          inputSchema: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'Channel name' },
              description: { type: 'string', description: 'Channel description' },
              visibility: { 
                type: 'string', 
                enum: ['public', 'private', 'restricted'],
                default: 'public' 
              },
              max_participants: { type: 'number', default: 100 },
              requires_deposit: { type: 'boolean', default: false },
              deposit_amount: { type: 'number', description: 'Required deposit in SOL' }
            },
            required: ['name']
          }
        },
        {
          name: 'join_channel',
          description: 'Join an existing channel',
          inputSchema: {
            type: 'object',
            properties: {
              channel_id: { type: 'string', description: 'Channel ID' },
              invite_code: { type: 'string', description: 'Invite code for private channels' }
            },
            required: ['channel_id']
          }
        },
        {
          name: 'send_channel_message',
          description: 'Send a message to a channel',
          inputSchema: {
            type: 'object',
            properties: {
              channel_id: { type: 'string', description: 'Channel ID' },
              content: { type: 'string', description: 'Message content' },
              message_type: { 
                type: 'string', 
                enum: ['text', 'announcement', 'system'],
                default: 'text' 
              },
              reply_to: { type: 'string', description: 'Reply to message ID' },
              metadata: { type: 'object', description: 'Additional metadata' }
            },
            required: ['channel_id', 'content']
          }
        },
        {
          name: 'get_channel_messages',
          description: 'Get messages from a channel',
          inputSchema: {
            type: 'object',
            properties: {
              channel_id: { type: 'string', description: 'Channel ID' },
              limit: { type: 'number', default: 20 },
              offset: { type: 'number', default: 0 },
              since: { type: 'number', description: 'Unix timestamp to get messages since' }
            },
            required: ['channel_id']
          }
        },

        // Escrow Management
        {
          name: 'create_escrow',
          description: 'Create an escrow agreement with another agent',
          inputSchema: {
            type: 'object',
            properties: {
              counterparty: { type: 'string', description: 'Counterparty agent ID' },
              amount: { type: 'number', description: 'Escrow amount in SOL' },
              description: { type: 'string', description: 'Escrow description' },
              conditions: { 
                type: 'array', 
                items: { type: 'string' },
                description: 'Escrow release conditions' 
              },
              timeout_hours: { type: 'number', default: 24, description: 'Timeout in hours' },
              arbitrator: { type: 'string', description: 'Arbitrator agent ID (optional)' }
            },
            required: ['counterparty', 'amount', 'description', 'conditions']
          }
        },
        {
          name: 'release_escrow',
          description: 'Release funds from an escrow',
          inputSchema: {
            type: 'object',
            properties: {
              escrow_id: { type: 'string', description: 'Escrow ID' },
              signature: { type: 'string', description: 'Counterparty signature (optional)' }
            },
            required: ['escrow_id']
          }
        },

        // Analytics
        {
          name: 'get_agent_stats',
          description: 'Get statistics for an agent',
          inputSchema: {
            type: 'object',
            properties: {
              agent_id: { type: 'string', description: 'Agent ID' },
              time_range: { 
                type: 'string', 
                enum: ['24h', '7d', '30d', '90d'],
                default: '24h' 
              }
            },
            required: ['agent_id']
          }
        },
        {
          name: 'get_network_stats',
          description: 'Get overall network statistics',
          inputSchema: {
            type: 'object',
            properties: {
              time_range: { 
                type: 'string', 
                enum: ['24h', '7d', '30d', '90d'],
                default: '24h' 
              }
            }
          }
        }
      ] as Tool[]
    }));
  }

  private setupResources(): void {
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => ({
      resources: [
        {
          uri: 'pod://agents/active',
          name: 'Active Agents',
          description: 'List of currently active agents on the network',
          mimeType: 'application/json'
        },
        {
          uri: 'pod://channels/public',
          name: 'Public Channels',
          description: 'List of public channels available to join',
          mimeType: 'application/json'
        },
        {
          uri: 'pod://network/stats',
          name: 'Network Statistics',
          description: 'Real-time network statistics and metrics',
          mimeType: 'application/json'
        },
        {
          uri: 'pod://agent/profile',
          name: 'Agent Profile',
          description: 'Current agent profile and configuration',
          mimeType: 'application/json'
        }
      ] as Resource[]
    }));

    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const { uri } = request.params;
      
      try {
        switch (uri) {
          case 'pod://agents/active':
            const activeAgents = await this.getActiveAgents();
            return {
              contents: [{
                type: 'text',
                text: JSON.stringify(activeAgents, null, 2)
              } as TextContent]
            };

          case 'pod://channels/public':
            const publicChannels = await this.getPublicChannels();
            return {
              contents: [{
                type: 'text',
                text: JSON.stringify(publicChannels, null, 2)
              } as TextContent]
            };

          case 'pod://network/stats':
            const networkStats = await this.getNetworkStats('24h');
            return {
              contents: [{
                type: 'text',
                text: JSON.stringify(networkStats, null, 2)
              } as TextContent]
            };

          case 'pod://agent/profile':
            const agentProfile = await this.getCurrentAgentProfile();
            return {
              contents: [{
                type: 'text',
                text: JSON.stringify(agentProfile, null, 2)
              } as TextContent]
            };

          default:
            throw new Error(`Unknown resource: ${uri}`);
        }
      } catch (error) {
        this.logger.error('Error reading resource', { uri, error });
        throw error;
      }
    });
  }

  private setupHandlers(): void {
    this.server.setRequestHandler(CallToolRequestSchema, async (request: CallToolRequest) => {
      const { name, arguments: args } = request.params;
      
      try {
        this.logger.info('Tool call received', { tool: name, args });
        
        // Rate limiting check
        if (await this.isRateLimited()) {
          throw new Error('Rate limit exceeded');
        }

        switch (name) {
          // Agent Management
          case 'register_agent':
            return await this.handleRegisterAgent(args);
          case 'discover_agents':
            return await this.handleDiscoverAgents(args);
          case 'get_agent':
            return await this.handleGetAgent(args);

          // Message Management
          case 'send_message':
            return await this.handleSendMessage(args);
          case 'get_messages':
            return await this.handleGetMessages(args);
          case 'mark_message_read':
            return await this.handleMarkMessageRead(args);

          // Channel Management
          case 'create_channel':
            return await this.handleCreateChannel(args);
          case 'join_channel':
            return await this.handleJoinChannel(args);
          case 'send_channel_message':
            return await this.handleSendChannelMessage(args);
          case 'get_channel_messages':
            return await this.handleGetChannelMessages(args);

          // Escrow Management
          case 'create_escrow':
            return await this.handleCreateEscrow(args);
          case 'release_escrow':
            return await this.handleReleaseEscrow(args);

          // Analytics
          case 'get_agent_stats':
            return await this.handleGetAgentStats(args);
          case 'get_network_stats':
            return await this.handleGetNetworkStats(args);

          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        this.logger.error('Tool execution failed', { tool: name, error });
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

  // =====================================================
  // Tool Handlers
  // =====================================================

  private async handleRegisterAgent(args: any): Promise<any> {
    const validated = RegisterAgentSchema.parse(args);
    
    const result = await this.client.agents.register({
      name: validated.name,
      description: validated.description || '',
      capabilities: validated.capabilities,
      endpoint: validated.endpoint,
      metadata: validated.metadata || {}
    });

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          data: {
            agent_id: result.agentId,
            transaction_signature: result.signature,
            registration_timestamp: Date.now(),
            capabilities: validated.capabilities
          },
          timestamp: Date.now()
        } as ToolResponse, null, 2)
      } as TextContent]
    };
  }

  private async handleDiscoverAgents(args: any): Promise<any> {
    const validated = DiscoverAgentsSchema.parse(args);
    
    const agents = await this.client.discovery.findAgents({
      capabilities: validated.capabilities,
      searchTerm: validated.search_term,
      limit: validated.limit,
      offset: validated.offset
    });

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          data: {
            agents: agents.agents,
            total_count: agents.totalCount,
            has_more: agents.hasMore
          },
          timestamp: Date.now()
        } as AgentDiscoveryResponse, null, 2)
      } as TextContent]
    };
  }

  private async handleGetAgent(args: any): Promise<any> {
    const validated = GetAgentSchema.parse(args);
    
    const agent = await this.client.agents.get(validated.agent_id);
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          data: agent,
          timestamp: Date.now()
        } as ToolResponse<PodAgent>, null, 2)
      } as TextContent]
    };
  }

  private async handleSendMessage(args: any): Promise<any> {
    const validated = SendMessageSchema.parse(args);
    
    const result = await this.client.messages.send({
      recipient: validated.recipient,
      content: validated.content,
      messageType: validated.message_type,
      metadata: validated.metadata,
      expiresIn: validated.expires_in
    });

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          data: {
            message_id: result.messageId,
            status: 'sent',
            estimated_delivery: Date.now() + 1000, // Estimate 1 second
            transaction_signature: result.signature
          },
          timestamp: Date.now()
        } as MessageResponse, null, 2)
      } as TextContent]
    };
  }

  private async handleGetMessages(args: any): Promise<any> {
    const validated = GetMessagesSchema.parse(args);
    
    const messages = await this.client.messages.getFiltered({
      limit: validated.limit,
      offset: validated.offset,
      messageType: validated.message_type,
      status: validated.status
    });

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          data: {
            messages: messages.messages,
            total_count: messages.totalCount,
            has_more: messages.hasMore
          },
          timestamp: Date.now()
        } as ToolResponse, null, 2)
      } as TextContent]
    };
  }

  private async handleMarkMessageRead(args: any): Promise<any> {
    const validated = MarkMessageReadSchema.parse(args);
    
    const result = await this.client.messages.markAsRead(validated.message_id);

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          data: {
            message_id: validated.message_id,
            marked_read_at: Date.now(),
            transaction_signature: result.signature
          },
          timestamp: Date.now()
        } as ToolResponse, null, 2)
      } as TextContent]
    };
  }

  private async handleCreateChannel(args: any): Promise<any> {
    const validated = CreateChannelSchema.parse(args);
    
    const result = await this.client.channels.create({
      name: validated.name,
      description: validated.description,
      visibility: validated.visibility as any,
      maxParticipants: validated.max_participants,
      requiresDeposit: validated.requires_deposit,
      depositAmount: validated.deposit_amount
    });

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          data: {
            channel: result.channel,
            join_code: result.joinCode,
            transaction_signature: result.signature
          },
          timestamp: Date.now()
        } as ChannelResponse, null, 2)
      } as TextContent]
    };
  }

  private async handleJoinChannel(args: any): Promise<any> {
    const validated = JoinChannelSchema.parse(args);
    
    const result = await this.client.channels.join(
      validated.channel_id,
      validated.invite_code
    );

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          data: {
            channel_id: validated.channel_id,
            joined_at: Date.now(),
            transaction_signature: result.signature
          },
          timestamp: Date.now()
        } as ToolResponse, null, 2)
      } as TextContent]
    };
  }

  private async handleSendChannelMessage(args: any): Promise<any> {
    const validated = SendChannelMessageSchema.parse(args);
    
    const result = await this.client.channels.sendMessage({
      channelId: validated.channel_id,
      content: validated.content,
      messageType: validated.message_type as any,
      replyTo: validated.reply_to,
      metadata: validated.metadata
    });

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          data: {
            message_id: result.messageId,
            channel_id: validated.channel_id,
            sent_at: Date.now(),
            transaction_signature: result.signature
          },
          timestamp: Date.now()
        } as ToolResponse, null, 2)
      } as TextContent]
    };
  }

  private async handleGetChannelMessages(args: any): Promise<any> {
    const validated = GetChannelMessagesSchema.parse(args);
    
    const messages = await this.client.channels.getMessages({
      channelId: validated.channel_id,
      limit: validated.limit,
      offset: validated.offset,
      since: validated.since
    });

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          data: {
            messages: messages.messages,
            channel_id: validated.channel_id,
            total_count: messages.totalCount,
            has_more: messages.hasMore
          },
          timestamp: Date.now()
        } as ToolResponse, null, 2)
      } as TextContent]
    };
  }

  private async handleCreateEscrow(args: any): Promise<any> {
    const validated = CreateEscrowSchema.parse(args);
    
    const result = await this.client.escrow.create({
      counterparty: validated.counterparty,
      amount: validated.amount,
      description: validated.description,
      conditions: validated.conditions,
      timeoutHours: validated.timeout_hours,
      arbitrator: validated.arbitrator
    });

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          data: {
            escrow: result.escrow,
            required_confirmations: 1,
            transaction_signature: result.signature
          },
          timestamp: Date.now()
        } as EscrowResponse, null, 2)
      } as TextContent]
    };
  }

  private async handleReleaseEscrow(args: any): Promise<any> {
    const validated = ReleaseEscrowSchema.parse(args);
    
    const result = await this.client.escrow.release(
      validated.escrow_id,
      validated.signature
    );

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          data: {
            escrow_id: validated.escrow_id,
            released_at: Date.now(),
            transaction_signature: result.signature
          },
          timestamp: Date.now()
        } as ToolResponse, null, 2)
      } as TextContent]
    };
  }

  private async handleGetAgentStats(args: any): Promise<any> {
    const validated = GetAgentStatsSchema.parse(args);
    
    const stats = await this.client.analytics.getAgentStats(
      validated.agent_id,
      validated.time_range as any
    );

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          data: stats,
          timestamp: Date.now()
        } as ToolResponse, null, 2)
      } as TextContent]
    };
  }

  private async handleGetNetworkStats(args: any): Promise<any> {
    const validated = GetNetworkStatsSchema.parse(args);
    
    const stats = await this.getNetworkStats(validated.time_range);

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          data: stats,
          timestamp: Date.now()
        } as ToolResponse, null, 2)
      } as TextContent]
    };
  }

  // =====================================================
  // Helper Methods
  // =====================================================

  private async getActiveAgents(): Promise<PodAgent[]> {
    const result = await this.client.discovery.findAgents({
      limit: 50,
      activeOnly: true
    });
    return result.agents;
  }

  private async getPublicChannels(): Promise<PodChannel[]> {
    const result = await this.client.channels.getPublicChannels({
      limit: 50
    });
    return result.channels;
  }

  private async getNetworkStats(timeRange: string): Promise<any> {
    return await this.client.analytics.getNetworkStats(timeRange as any);
  }

  private async getCurrentAgentProfile(): Promise<any> {
    // Implementation would depend on current agent context
    return {
      agent_id: this.config.agent_runtime.agent_id,
      runtime: this.config.agent_runtime.runtime,
      connected_at: Date.now(),
      features_enabled: Object.entries(this.config.features)
        .filter(([_, enabled]) => enabled)
        .map(([feature]) => feature)
    };
  }

  private async isRateLimited(): Promise<boolean> {
    // Simple rate limiting implementation
    // In production, this would use Redis or similar
    return false;
  }

  // =====================================================
  // Server Lifecycle
  // =====================================================

  async start(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    
    // Start WebSocket server for real-time events
    await this.wsEventManager.start(8080);
    
    this.logger.info('PoD Protocol MCP Server started', {
      agent_runtime: this.config.agent_runtime.runtime,
      features: this.config.features,
      websocket_enabled: this.config.features.real_time_notifications
    });
  }

  async stop(): Promise<void> {
    await this.server.close();
    await this.wsEventManager.stop();
    this.logger.info('PoD Protocol MCP Server stopped');
  }
} 