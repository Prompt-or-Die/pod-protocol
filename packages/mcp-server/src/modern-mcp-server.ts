/**
 * Modern MCP Server Configuration Types
 * Enhanced configuration structure for the PoD Protocol MCP Server
 */

export interface ServerConfig {
  name: string;
  version: string;
  description: string;
}

export interface PodProtocolConfig {
  rpc_endpoint: string;
  program_id: string;
  commitment: 'processed' | 'confirmed' | 'finalized';
}

export interface HttpTransportConfig {
  enabled: boolean;
  port: number;
  path: string;
  corsOrigins: string[];
}

export interface WebSocketTransportConfig {
  enabled: boolean;
  port: number;
  path: string;
}

export interface StdioTransportConfig {
  enabled: boolean;
}

export interface TransportSecurityConfig {
  rateLimitWindowMs: number;
  rateLimitMax: number;
  requireAuth: boolean;
}

export interface TransportsConfig {
  http: HttpTransportConfig;
  websocket: WebSocketTransportConfig;
  stdio: StdioTransportConfig;
  security: TransportSecurityConfig;
}

export interface SessionConfig {
  sessionTimeoutMs: number;
  maxSessionsPerUser: number;
  cleanupIntervalMs: number;
  enablePersistence: boolean;
}

export interface SecurityConfig {
  jwtSecret: string;
  rateLimitPerMinute: number;
  maxMessageSize: number;
  allowedOrigins: string[];
}

export interface LoggingConfig {
  level: 'debug' | 'info' | 'warn' | 'error';
  file?: string;
  console: boolean;
  enableAnalytics: boolean;
}

export interface ModernMCPServerConfig {
  server: ServerConfig;
  pod_protocol: PodProtocolConfig;
  transports: TransportsConfig;
  session: SessionConfig;
  security: SecurityConfig;
  logging: LoggingConfig;
}

// Default configurations for different modes
export const defaultHostedConfig: ModernMCPServerConfig = {
  server: {
    name: "@pod-protocol/mcp-server",
    version: "2.0.0",
    description: "PoD Protocol MCP Server - Enterprise Edition"
  },
  pod_protocol: {
    rpc_endpoint: "https://api.mainnet-beta.solana.com",
    program_id: "PodComXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX", // Placeholder
    commitment: "confirmed"
  },
  transports: {
    http: {
      enabled: true,
      port: 3000,
      path: "/mcp",
      corsOrigins: ["*"]
    },
    websocket: {
      enabled: true,
      port: 3001,
      path: "/ws"
    },
    stdio: {
      enabled: false
    },
    security: {
      rateLimitWindowMs: 60000,
      rateLimitMax: 100,
      requireAuth: true
    }
  },
  session: {
    sessionTimeoutMs: 3600000, // 1 hour
    maxSessionsPerUser: 5,
    cleanupIntervalMs: 300000, // 5 minutes
    enablePersistence: true
  },
  security: {
    jwtSecret: "ENV:JWT_SECRET",
    rateLimitPerMinute: 60,
    maxMessageSize: 1024 * 1024, // 1MB
    allowedOrigins: ["*"]
  },
  logging: {
    level: "info",
    console: true,
    enableAnalytics: true
  }
};

export const defaultSelfHostedConfig: ModernMCPServerConfig = {
  ...defaultHostedConfig,
  pod_protocol: {
    ...defaultHostedConfig.pod_protocol,
    rpc_endpoint: "https://api.devnet.solana.com"
  },
  transports: {
    ...defaultHostedConfig.transports,
    http: {
      ...defaultHostedConfig.transports.http,
      port: 8080
    },
    websocket: {
      ...defaultHostedConfig.transports.websocket,
      port: 8081
    },
    stdio: {
      enabled: true
    },
    security: {
      ...defaultHostedConfig.transports.security,
      requireAuth: false
    }
  },
  security: {
    ...defaultHostedConfig.security,
    jwtSecret: "development-secret-key-change-in-production"
  },
  logging: {
    ...defaultHostedConfig.logging,
    level: "debug"
  }
}; 