/**
 * WebSocket Event Manager for PoD Protocol MCP Server
 * Provides real-time event streaming for agent activities
 */

import { WebSocketServer, WebSocket } from 'ws';
import { EventEmitter } from 'events';
import { MCPServerConfig, PodEvent, PodEventHandler } from './types.js';
import winston from 'winston';

export interface EventSubscription {
  id: string;
  agentId: string;
  eventTypes: string[];
  callback: PodEventHandler;
}

export class WebSocketEventManager extends EventEmitter {
  private wsServer?: WebSocketServer;
  private clients: Map<string, WebSocket> = new Map();
  private subscriptions: Map<string, EventSubscription[]> = new Map();
  private config: MCPServerConfig;
  private logger: winston.Logger;
  private heartbeatInterval?: NodeJS.Timeout;

  constructor(config: MCPServerConfig, logger: winston.Logger) {
    super();
    this.config = config;
    this.logger = logger;
  }

  /**
   * Start WebSocket server for real-time events
   */
  async start(port: number = 8080): Promise<void> {
    if (!this.config.features.real_time_notifications) {
      this.logger.info('Real-time notifications disabled, skipping WebSocket server');
      return;
    }

    this.wsServer = new WebSocketServer({ 
      port,
      perMessageDeflate: false 
    });

    this.wsServer.on('connection', this.handleConnection.bind(this));
    this.wsServer.on('error', this.handleError.bind(this));

    // Start heartbeat to keep connections alive
    this.startHeartbeat();

    this.logger.info(`WebSocket server started on port ${port}`);
  }

  /**
   * Stop WebSocket server
   */
  async stop(): Promise<void> {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    if (this.wsServer) {
      this.wsServer.close();
      this.clients.clear();
      this.subscriptions.clear();
      this.logger.info('WebSocket server stopped');
    }
  }

  /**
   * Handle new WebSocket connection
   */
  private handleConnection(ws: WebSocket, request: any): void {
    const clientId = `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.clients.set(clientId, ws);

    this.logger.info('New WebSocket connection', { clientId });

    // Set up message handlers
    ws.on('message', (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString());
        this.handleClientMessage(clientId, message);
      } catch (error) {
        this.logger.error('Invalid WebSocket message', { clientId, error });
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Invalid JSON message'
        }));
      }
    });

    ws.on('close', () => {
      this.handleDisconnection(clientId);
    });

    ws.on('error', (error) => {
      this.logger.error('WebSocket client error', { clientId, error });
      this.handleDisconnection(clientId);
    });

    // Send welcome message
    ws.send(JSON.stringify({
      type: 'connected',
      clientId,
      timestamp: Date.now(),
      features: {
        realTimeEvents: true,
        agentDiscovery: true,
        messageNotifications: true
      }
    }));
  }

  /**
   * Handle client disconnection
   */
  private handleDisconnection(clientId: string): void {
    this.clients.delete(clientId);
    
    // Remove client subscriptions
    for (const [agentId, subs] of this.subscriptions) {
      const filtered = subs.filter(sub => sub.id !== clientId);
      if (filtered.length === 0) {
        this.subscriptions.delete(agentId);
      } else {
        this.subscriptions.set(agentId, filtered);
      }
    }

    this.logger.info('WebSocket client disconnected', { clientId });
  }

  /**
   * Handle messages from WebSocket clients
   */
  private handleClientMessage(clientId: string, message: any): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    switch (message.type) {
      case 'subscribe':
        this.handleSubscribe(clientId, message);
        break;
      
      case 'unsubscribe':
        this.handleUnsubscribe(clientId, message);
        break;
      
      case 'ping':
        client.send(JSON.stringify({
          type: 'pong',
          timestamp: Date.now()
        }));
        break;
      
      default:
        this.logger.warn('Unknown WebSocket message type', { 
          clientId, 
          type: message.type 
        });
    }
  }

  /**
   * Handle event subscription
   */
  private handleSubscribe(clientId: string, message: any): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    const { agentId, eventTypes = [] } = message;
    
    if (!agentId) {
      client.send(JSON.stringify({
        type: 'error',
        message: 'agentId is required for subscription'
      }));
      return;
    }

    // Create subscription
    const subscription: EventSubscription = {
      id: clientId,
      agentId,
      eventTypes,
      callback: async (event: PodEvent) => {
        this.sendEventToClient(clientId, event);
      }
    };

    // Add to subscriptions
    const existing = this.subscriptions.get(agentId) || [];
    existing.push(subscription);
    this.subscriptions.set(agentId, existing);

    client.send(JSON.stringify({
      type: 'subscribed',
      agentId,
      eventTypes,
      timestamp: Date.now()
    }));

    this.logger.info('Client subscribed to events', { 
      clientId, 
      agentId, 
      eventTypes 
    });
  }

  /**
   * Handle event unsubscription
   */
  private handleUnsubscribe(clientId: string, message: any): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    const { agentId } = message;
    
    if (agentId) {
      // Unsubscribe from specific agent
      const subs = this.subscriptions.get(agentId) || [];
      const filtered = subs.filter(sub => sub.id !== clientId);
      
      if (filtered.length === 0) {
        this.subscriptions.delete(agentId);
      } else {
        this.subscriptions.set(agentId, filtered);
      }
    } else {
      // Unsubscribe from all
      for (const [agentKey, subs] of this.subscriptions) {
        const filtered = subs.filter(sub => sub.id !== clientId);
        if (filtered.length === 0) {
          this.subscriptions.delete(agentKey);
        } else {
          this.subscriptions.set(agentKey, filtered);
        }
      }
    }

    client.send(JSON.stringify({
      type: 'unsubscribed',
      agentId: agentId || 'all',
      timestamp: Date.now()
    }));

    this.logger.info('Client unsubscribed from events', { 
      clientId, 
      agentId: agentId || 'all' 
    });
  }

  /**
   * Send event to specific client
   */
  private sendEventToClient(clientId: string, event: PodEvent): void {
    const client = this.clients.get(clientId);
    if (!client || client.readyState !== WebSocket.OPEN) {
      return;
    }

    try {
      client.send(JSON.stringify({
        messageType: 'event',
        ...event
      }));
    } catch (error) {
      this.logger.error('Failed to send event to client', { 
        clientId, 
        error 
      });
    }
  }

  /**
   * Broadcast event to all subscribed clients
   */
  public broadcastEvent(event: PodEvent): void {
    const subscriptions = this.subscriptions.get(event.agent_id) || [];
    
    for (const subscription of subscriptions) {
      // Check if client is subscribed to this event type
      if (subscription.eventTypes.length === 0 || 
          subscription.eventTypes.includes(event.type)) {
        subscription.callback(event);
      }
    }

    this.emit('event', event);
  }

  /**
   * Broadcast network-wide events
   */
  public broadcastNetworkEvent(eventType: string, data: any): void {
    const event: PodEvent = {
      type: eventType as any,
      agent_id: 'network',
      data,
      timestamp: Date.now()
    };

    // Send to all clients
    for (const [clientId, client] of this.clients) {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(JSON.stringify({
            type: 'network_event',
            eventType,
            data,
            timestamp: event.timestamp
          }));
        } catch (error) {
          this.logger.error('Failed to send network event', { 
            clientId, 
            error 
          });
        }
      }
    }
  }

  /**
   * Handle WebSocket server errors
   */
  private handleError(error: Error): void {
    this.logger.error('WebSocket server error', { error });
  }

  /**
   * Start heartbeat to keep connections alive
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      for (const [clientId, client] of this.clients) {
        if (client.readyState === WebSocket.OPEN) {
          try {
            client.ping();
          } catch (error) {
            this.logger.warn('Heartbeat failed for client', { 
              clientId, 
              error 
            });
            this.handleDisconnection(clientId);
          }
        } else {
          this.handleDisconnection(clientId);
        }
      }
    }, 30000); // 30 seconds
  }

  /**
   * Get connection statistics
   */
  public getStats(): { 
    activeConnections: number; 
    totalSubscriptions: number;
    subscriptionsByAgent: Record<string, number>;
  } {
    const subscriptionsByAgent: Record<string, number> = {};
    
    for (const [agentId, subs] of this.subscriptions) {
      subscriptionsByAgent[agentId] = subs.length;
    }

    return {
      activeConnections: this.clients.size,
      totalSubscriptions: Array.from(this.subscriptions.values())
        .reduce((total, subs) => total + subs.length, 0),
      subscriptionsByAgent
    };
  }

  /**
   * Create convenient event builders
   */
  public static createMessageReceivedEvent(agentId: string, message: any): PodEvent {
    return {
      type: 'message_received',
      agent_id: agentId,
      data: {
        message_id: message.id,
        sender: message.sender,
        content: message.content,
        timestamp: message.timestamp
      },
      timestamp: Date.now()
    };
  }

  public static createChannelMessageEvent(agentId: string, channelId: string, message: any): PodEvent {
    return {
      type: 'channel_message',
      agent_id: agentId,
      data: {
        channel_id: channelId,
        message_id: message.id,
        sender: message.sender,
        content: message.content,
        timestamp: message.timestamp
      },
      timestamp: Date.now()
    };
  }

  public static createAgentRegisteredEvent(agent: any): PodEvent {
    return {
      type: 'agent_registered',
      agent_id: agent.id,
      data: {
        name: agent.name,
        capabilities: agent.capabilities,
        created_at: agent.created_at
      },
      timestamp: Date.now()
    };
  }

  public static createEscrowUpdatedEvent(agentId: string, escrow: any): PodEvent {
    return {
      type: 'escrow_updated',
      agent_id: agentId,
      data: {
        escrow_id: escrow.id,
        status: escrow.status,
        amount: escrow.amount,
        updated_at: Date.now()
      },
      timestamp: Date.now()
    };
  }
} 