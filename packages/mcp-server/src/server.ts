/**
 * PoD Protocol MCP Server - Legacy Compatibility Export
 * This file provides backward compatibility for older imports
 */

// Re-export the main server class for compatibility
export { PodProtocolMCPServer } from './mcp-server.js';
export type { PodProtocolMCPServerConfig } from './mcp-server.js';

// Re-export other commonly used types
export * from './types.js';
export * from './config-loader.js';
export * from './session-manager.js';
export * from './transport-manager.js'; 