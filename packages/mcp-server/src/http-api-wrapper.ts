/**
 * HTTP API Wrapper for PoD Protocol MCP Server
 * Provides REST API compatibility layer over MCP
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { PodProtocolMCPServer } from './mcp-server.js';
import { createLogger } from './logger.js';

export interface HttpApiConfig {
  enabled: boolean;
  port: number;
  path: string;
  corsOrigins: string[];
  rateLimitWindowMs: number;
  rateLimitMax: number;
}

export class HttpApiWrapper {
  private app: express.Application;
  private server: any;
  private logger = createLogger();
  private mcpServer: PodProtocolMCPServer;
  private config: HttpApiConfig;

  constructor(mcpServer: PodProtocolMCPServer, config: HttpApiConfig) {
    this.mcpServer = mcpServer;
    this.config = config;
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware(): void {
    // Security middleware
    this.app.use(helmet());
    this.app.use(compression());

    // CORS configuration
    this.app.use(cors({
      origin: this.config.corsOrigins,
      credentials: true
    }));

    // Rate limiting
    const limiter = rateLimit({
      windowMs: this.config.rateLimitWindowMs,
      max: this.config.rateLimitMax,
      message: 'Too many requests from this IP'
    });
    this.app.use(limiter);

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));
  }

  private setupRoutes(): void {
    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: Date.now(),
        uptime: process.uptime()
      });
    });

    // MCP endpoints proxy
    this.app.post('/mcp/call-tool', async (req, res) => {
      try {
        // Proxy MCP tool calls to REST API
        const result = await this.proxyToolCall(req.body);
        res.json(result);
      } catch (error) {
        this.logger.error('HTTP API tool call failed', { error });
        res.status(500).json({
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    // Server status endpoint
    this.app.get('/status', (req, res) => {
      res.json(this.mcpServer.getStats());
    });
  }

  private async proxyToolCall(body: any): Promise<any> {
    // Convert HTTP request to MCP tool call
    const { tool, arguments: args } = body;
    
    // This would need to be implemented based on the actual MCP server structure
    // For now, return a placeholder response
    return {
      success: true,
      message: 'HTTP API wrapper not fully implemented yet',
      tool,
      args
    };
  }

  async start(): Promise<void> {
    if (!this.config.enabled) {
      this.logger.info('HTTP API is disabled');
      return;
    }

    return new Promise((resolve, reject) => {
      this.server = this.app.listen(this.config.port, () => {
        this.logger.info(`HTTP API started on port ${this.config.port}`);
        resolve();
      });

      this.server.on('error', (error: Error) => {
        this.logger.error('HTTP API failed to start', { error });
        reject(error);
      });
    });
  }

  async stop(): Promise<void> {
    if (this.server) {
      return new Promise((resolve) => {
        this.server.close(() => {
          this.logger.info('HTTP API stopped');
          resolve();
        });
      });
    }
  }
} 