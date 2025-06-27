#!/usr/bin/env node

/**
 * PoD Protocol MCP Server v2.0 - Modern Multi-User Edition
 * Standards-compliant Model Context Protocol server with session management
 */

import { ModernPodProtocolMCPServer, ModernMCPServerConfig } from './modern-mcp-server.js';
import { ConfigLoader } from './config-loader.js';
import { createLogger } from './logger.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const logger = createLogger();

async function main() {
  try {
    logger.info('🚀 Starting Modern PoD Protocol MCP Server...');
    
    // Determine configuration mode
    const mode = process.env.MCP_MODE as 'hosted' | 'self-hosted' | 'development' || 'self-hosted';
    const configPath = process.env.MCP_CONFIG_PATH;
    
    logger.info('Loading configuration', { mode, configPath });
    
    // Load configuration
    const config: ModernMCPServerConfig = await ConfigLoader.load({
      mode,
      configPath,
      overrides: {
        // Allow runtime overrides via environment
        ...(process.env.JWT_SECRET && {
          security: { jwtSecret: process.env.JWT_SECRET }
        })
      }
    });
    
    logger.info('Configuration loaded successfully', {
      serverName: config.server.name,
      transports: {
        http: config.transports.http.enabled,
        websocket: config.transports.websocket.enabled,
        stdio: config.transports.stdio.enabled
      },
      podEndpoint: config.pod_protocol.rpc_endpoint,
      authRequired: config.transports.security.requireAuth
    });

    // Create and start server
    const server = new ModernPodProtocolMCPServer(config);
    
    // Handle graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info(`📊 Received ${signal}, shutting down gracefully...`);
      try {
        await server.stop();
        logger.info('✅ Graceful shutdown completed');
        process.exit(0);
      } catch (error) {
        logger.error('❌ Error during shutdown', { error });
        process.exit(1);
      }
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));

    // Start the server
    await server.start();
    
    // Log success with connection info
    logger.info('🎉 Server started successfully!');
    if (config.transports.http.enabled) {
      logger.info(`🌐 HTTP endpoint: http://localhost:${config.transports.http.port}${config.transports.http.path}`);
    }
    if (config.transports.websocket.enabled) {
      logger.info(`🔗 WebSocket endpoint: ws://localhost:${config.transports.websocket.port}${config.transports.websocket.path}`);
    }
    if (config.transports.stdio.enabled) {
      logger.info('📟 stdio transport: enabled');
    }
    
  } catch (error) {
    logger.error('❌ Failed to start Modern PoD Protocol MCP Server', { error });
    process.exit(1);
  }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('💥 Uncaught Exception', { error });
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('💥 Unhandled Rejection', { reason, promise });
  process.exit(1);
});

// Start the server
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    logger.error('💥 Fatal error during startup', { error });
    process.exit(1);
  });
}

// Exports for library usage
export { ModernPodProtocolMCPServer } from './modern-mcp-server.js';
export { ConfigLoader } from './config-loader.js';
export { SessionManager, sessionManager } from './session-manager.js';
export { TransportManager } from './transport-manager.js';
export { SolanaAuthUtils } from './utils/solana-auth.js';

// Legacy exports (for backward compatibility)
export { PodProtocolMCPServer } from './server.js';
export { WebSocketEventManager } from './websocket.js';
export * from './types.js';

// Default export
export default ModernPodProtocolMCPServer; 