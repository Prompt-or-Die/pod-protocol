#!/usr/bin/env node

/**
 * PoD Protocol MCP Server Entry Point
 * Bridges AI agent runtimes with PoD Protocol blockchain communication
 */

import { PodProtocolMCPServer } from './server.js';
import { MCPServerConfig } from './types.js';
import { loadConfig } from './config.js';
import { createLogger } from './logger.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const logger = createLogger();

async function main() {
  try {
    logger.info('🚀 Starting PoD Protocol MCP Server...');
    
    // Load configuration
    const config: MCPServerConfig = await loadConfig();
    
    logger.info('Configuration loaded', {
      runtime: config.agent_runtime.runtime,
      endpoint: config.pod_protocol.rpc_endpoint,
      features: Object.entries(config.features)
        .filter(([_, enabled]) => enabled)
        .map(([feature]) => feature)
    });

    // Create and start server
    const server = new PodProtocolMCPServer(config);
    
    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      logger.info('📊 Received SIGINT, shutting down gracefully...');
      await server.stop();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      logger.info('📊 Received SIGTERM, shutting down gracefully...');
      await server.stop();
      process.exit(0);
    });

    // Start the server
    await server.start();
    
  } catch (error) {
    logger.error('❌ Failed to start PoD Protocol MCP Server', { error });
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
main().catch((error) => {
  logger.error('💥 Fatal error during startup', { error });
  process.exit(1);
}); 