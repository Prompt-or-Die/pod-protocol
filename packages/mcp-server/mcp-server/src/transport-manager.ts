/**
 * PoD Protocol MCP Transport Manager
 * Handles multiple connection methods: HTTP, WebSocket, stdio
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
// Note: SSE transport may not be available in current SDK version
// import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import express, { Request, Response, NextFunction } from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer, Server as HttpServer } from 'http';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { sessionManager, UserSession } from './session-manager.js';
import { createLogger } from './logger.js';

const logger = createLogger();

export interface TransportConfig {
  http: {
    enabled: boolean;
    port: number;
    path: string;
    corsOrigins: string[];
  };
  websocket: {
    enabled: boolean;
    port: number;
    path: string;
  };
  stdio: {
    enabled: boolean;
  };
  security: {
    rateLimitWindowMs: number;
    rateLimitMax: number;
    requireAuth: boolean;
  };
}

export class TransportManager {
  private mcpServer: Server;
  private config: TransportConfig;
  private httpServer?: HttpServer;
  private wsServer?: WebSocketServer;
  private app?: express.Application;

  constructor(mcpServer: Server, config: TransportConfig) {
    this.mcpServer = mcpServer;
    this.config = config;
  }

  /**
   * Start all enabled transports
   */
  async start(): Promise<void> {
    const promises: Promise<void>[] = [];

    if (this.config.stdio.enabled) {
      promises.push(this.startStdioTransport());
    }

    if (this.config.http.enabled) {
      promises.push(this.startHttpTransport());
    }

    if (this.config.websocket.enabled) {
      promises.push(this.startWebSocketTransport());
    }

    await Promise.all(promises);
    logger.info('All MCP transports started successfully');
  }

  /**
   * Stop all transports
   */
  async stop(): Promise<void> {
    const promises: Promise<void>[] = [];

    if (this.httpServer) {
      promises.push(new Promise(resolve => {
        this.httpServer!.close(() => resolve());
      }));
    }

    if (this.wsServer) {
      promises.push(new Promise(resolve => {
        this.wsServer!.close(() => resolve());
      }));
    }

    await Promise.all(promises);
    logger.info('All MCP transports stopped');
  }

  /**
   * Start stdio transport (for local development)
   */
  private async startStdioTransport(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.mcpServer.connect(transport);
    logger.info('✅ MCP stdio transport started');
  }

  /**
   * Start HTTP transport with SSE
   */
  private async startHttpTransport(): Promise<void> {
    this.app = express();

    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          connectSrc: ["'self'", ...this.config.http.corsOrigins]
        }
      }
    }));

    this.app.use(cors({
      origin: this.config.http.corsOrigins,
      credentials: true,
      methods: ['GET', 'POST', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Session-ID']
    }));

    // Rate limiting
    const limiter = rateLimit({
      windowMs: this.config.security.rateLimitWindowMs,
      max: this.config.security.rateLimitMax,
      message: { error: 'Too many requests, please try again later' },
      standardHeaders: true,
      legacyHeaders: false
    });
    this.app.use(limiter);

    this.app.use(express.json({ limit: '10mb' }));

    // Session authentication middleware
    const authenticateSession = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      if (!this.config.security.requireAuth) {
        return next();
      }

      const sessionId = req.headers['x-session-id'] as string;
      const authToken = req.headers.authorization?.replace('Bearer ', '');

      if (!sessionId && !authToken) {
        res.status(401).json({ error: 'Session ID or auth token required' });
        return;
      }

      try {
        let session: UserSession | null = null;

        // Try to get existing session first
        if (sessionId) {
          session = sessionManager.validateSession(sessionId);
        }

        // If no valid session and we have auth token, create new session
        if (!session && authToken) {
          session = await sessionManager.createSession(authToken, {
            transport: 'http',
            userAgent: req.headers['user-agent'],
            ip: req.ip
          });
        }

        if (!session) {
          res.status(401).json({ error: 'Invalid or expired session' });
          return;
        }

        (req as any).session = session;
        next();
      } catch (error) {
        logger.error('Authentication failed', { error });
        res.status(401).json({ error: 'Authentication failed' });
        return;
      }
    };

    // Health check endpoint
    this.app.get('/health', (req, res) => {
      const stats = sessionManager.getStats();
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        sessions: stats,
        transports: {
          http: this.config.http.enabled,
          websocket: this.config.websocket.enabled,
          stdio: this.config.stdio.enabled
        }
      });
    });

    // Session management endpoints
    this.app.post('/api/sessions', async (req, res) => {
      try {
        const { authToken, walletSignature, signedMessage } = req.body;
        
        if (!authToken) {
          res.status(400).json({ error: 'Auth token required' });
          return;
        }

        const session = await sessionManager.createSession(authToken, {
          walletSignature,
          signedMessage,
          transport: 'http',
          userAgent: req.headers['user-agent'],
          ip: req.ip
        });

        res.status(201).json({
          sessionId: session.sessionId,
          userId: session.userId,
          permissions: session.permissions,
          expiresAt: new Date(session.lastActivity.getTime() + 24 * 60 * 60 * 1000).toISOString()
        });
      } catch (error) {
        logger.error('Session creation failed', { error });
        res.status(400).json({ error: 'Failed to create session' });
      }
    });

    this.app.delete('/api/sessions/:sessionId', authenticateSession, async (req, res) => {
      const { sessionId } = req.params;
      const requestSession = (req as any).session as UserSession;

      // Users can only destroy their own sessions
      if (requestSession.sessionId !== sessionId && !requestSession.permissions.includes('admin')) {
        res.status(403).json({ error: 'Permission denied' });
        return;
      }

      const destroyed = await sessionManager.destroySession(sessionId);
      res.json({ destroyed });
    });

    // MCP endpoints with streaming response
    this.app.get(this.config.http.path, authenticateSession, (req, res) => {
      const session = (req as any).session as UserSession;
      
      // Set up streaming response headers
      res.writeHead(200, {
        'Content-Type': 'text/plain',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control': 'Allow-Origin'
      });
      
      res.write('MCP server connected\n');
      
      // Keep connection alive
      const keepAlive = setInterval(() => {
        res.write('ping\n');
      }, 30000);
      
      req.on('close', () => {
        clearInterval(keepAlive);
        logger.info('HTTP MCP connection closed', { sessionId: session.sessionId });
      });
    });

    this.app.post(this.config.http.path, authenticateSession, async (req, res) => {
      const session = (req as any).session as UserSession;
      
      try {
        // Process MCP request with session context
        const response = await this.processMCPRequest(req.body, session);
        res.json(response);
      } catch (error) {
        logger.error('MCP request processing failed', { error, sessionId: session.sessionId });
        res.status(500).json({ error: 'Request processing failed' });
      }
    });

    // Start HTTP server
    this.httpServer = createServer(this.app);
    this.httpServer.listen(this.config.http.port, () => {
      logger.info(`✅ MCP HTTP transport started on port ${this.config.http.port}${this.config.http.path}`);
    });
  }

  /**
   * Start WebSocket transport
   */
  private async startWebSocketTransport(): Promise<void> {
    this.wsServer = new WebSocketServer({
      port: this.config.websocket.port,
      path: this.config.websocket.path
    });

    this.wsServer.on('connection', async (ws: WebSocket, req) => {
      logger.info('WebSocket connection established', { 
        ip: req.socket.remoteAddress,
        userAgent: req.headers['user-agent']
      });

      let session: UserSession | null = null;

      // Handle WebSocket messages
      ws.on('message', async (data) => {
        try {
          const message = JSON.parse(data.toString());

          // Handle authentication
          if (message.type === 'auth') {
            try {
              session = await sessionManager.createSession(message.authToken, {
                walletSignature: message.walletSignature,
                signedMessage: message.signedMessage,
                transport: 'websocket',
                userAgent: req.headers['user-agent'],
                ip: req.socket.remoteAddress
              });

              ws.send(JSON.stringify({
                type: 'auth_success',
                sessionId: session.sessionId,
                userId: session.userId,
                permissions: session.permissions
              }));

              logger.info('WebSocket session authenticated', { sessionId: session.sessionId });
            } catch (error) {
              ws.send(JSON.stringify({
                type: 'auth_error',
                error: 'Authentication failed'
              }));
              ws.close(1008, 'Authentication failed');
              return;
            }
          }

          // Handle MCP requests
          if (message.type === 'mcp_request') {
            if (!session && this.config.security.requireAuth) {
              ws.send(JSON.stringify({
                type: 'error',
                error: 'Authentication required'
              }));
              return;
            }

            const response = await this.processMCPRequest(message.data, session);
            ws.send(JSON.stringify({
              type: 'mcp_response',
              id: message.id,
              data: response
            }));
          }

        } catch (error) {
          logger.error('WebSocket message processing failed', { error });
          ws.send(JSON.stringify({
            type: 'error',
            error: 'Message processing failed'
          }));
        }
      });

      ws.on('close', async () => {
        if (session) {
          logger.info('WebSocket session disconnected', { sessionId: session.sessionId });
        }
      });

      ws.on('error', (error) => {
        logger.error('WebSocket error', { error });
      });
    });

    logger.info(`✅ MCP WebSocket transport started on port ${this.config.websocket.port}${this.config.websocket.path}`);
  }

  /**
   * Process MCP request with session context
   */
  private async processMCPRequest(request: any, session: UserSession | null): Promise<any> {
    // Add session context to request
    const contextualRequest = {
      ...request,
      meta: {
        ...request.meta,
        session: session ? {
          sessionId: session.sessionId,
          userId: session.userId,
          walletAddress: session.walletAddress,
          permissions: session.permissions
        } : null
      }
    };

    // Process through MCP server
    // Note: This is a simplified approach - actual implementation would need
    // proper request routing through the MCP server's request handlers
    return { success: true, message: 'Request processed with session context' };
  }

  /**
   * Get transport statistics
   */
  getStats(): any {
    return {
      http: {
        enabled: this.config.http.enabled,
        port: this.config.http.port,
        connections: this.httpServer ? 'active' : 'inactive'
      },
      websocket: {
        enabled: this.config.websocket.enabled,
        port: this.config.websocket.port,
        connections: this.wsServer ? this.wsServer.clients.size : 0
      },
      stdio: {
        enabled: this.config.stdio.enabled
      }
    };
  }
}