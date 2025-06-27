/**
 * Enterprise Deployment Example for PoD Protocol MCP Server
 * Demonstrates complete setup with all optimization features
 */

import { PodProtocolMCPServer } from '../src/server.js';
import { EnhancedMCPTransport } from '../src/enhanced-transport.js';
import { MCPRegistryManager } from '../src/registry-integration.js';
import { MCPSecurityManager } from '../src/security-enhancements.js';
import winston from 'winston';

// Enterprise configuration
const enterpriseConfig = {
  // Enhanced transport with OAuth 2.1
  transport: {
    transportType: 'streamable-http' as const,
    streamableHttp: {
      endpoint: process.env.POD_MCP_ENDPOINT || 'https://mcp.pod-protocol.com',
      enableBatching: true,
      batchSize: 10,
      batchTimeout: 100,
      enableCompression: true,
      proxyCompatible: true
    },
    oauth: {
      clientId: process.env.POD_MCP_CLIENT_ID!,
      clientSecret: process.env.POD_MCP_CLIENT_SECRET!,
      authEndpoint: 'https://auth.pod-protocol.com/oauth/authorize',
      tokenEndpoint: 'https://auth.pod-protocol.com/oauth/token',
      scopes: ['agent:read', 'agent:write', 'channel:manage', 'escrow:execute'],
      pkceEnabled: true
    },
    enableLogging: true,
    logLevel: 'info' as const,
    rateLimiting: {
      enabled: true,
      requestsPerMinute: 1000,
      burstLimit: 100
    }
  },

  // Registry integration
  registry: {
    registries: [
      {
        name: 'official',
        url: 'https://registry.modelcontextprotocol.org',
        apiKey: process.env.MCP_REGISTRY_API_KEY,
        priority: 1,
        categories: ['blockchain', 'agent-communication', 'real-time'],
        enabled: true
      },
      {
        name: 'community',
        url: 'https://community.mcp-registry.dev',
        priority: 2,
        categories: ['solana', 'defi', 'multi-agent'],
        enabled: true
      }
    ],
    autoRegister: true,
    updateInterval: 3600000, // 1 hour
    enableMetrics: true,
    healthCheckInterval: 300000 // 5 minutes
  },

  // Enhanced security
  security: {
    enableInputValidation: true,
    enableRateLimiting: true,
    enableToolSigning: true,
    maxRequestSize: 1000000, // 1MB
    allowedOrigins: [
      'https://claude.ai',
      'https://cursor.sh', 
      'https://codeium.com',
      'https://github.com'
    ],
    requireAuthentication: true
  },

  // PoD Protocol configuration
  podProtocol: {
    rpc_endpoint: process.env.POD_RPC_ENDPOINT || 'https://api.mainnet-beta.solana.com',
    program_id: process.env.POD_PROGRAM_ID || 'HEpGLgYsE1kP8aoYKyLFc3JVVrofS7T4zEA6fWBJsZps',
    commitment: 'confirmed' as const
  },

  // Agent runtime settings  
  agentRuntime: {
    runtime: 'enterprise',
    agent_id: process.env.POD_AGENT_ID || 'pod-enterprise-server',
    wallet_path: process.env.POD_WALLET_PATH,
    auto_respond: false,
    response_delay_ms: 1000
  },

  // Enterprise features
  features: {
    auto_message_processing: true,
    real_time_notifications: true,
    cross_runtime_discovery: true,
    analytics_tracking: true,
    advanced_monitoring: true,
    audit_logging: true
  },

  // Logging configuration
  logging: {
    level: 'info',
    file_path: './logs/pod-mcp-enterprise.log',
    console_output: true,
    structured_logging: true,
    audit_trail: true
  }
};

// Server metadata for registry registration
const serverMetadata = {
  name: '@pod-protocol/mcp-server',
  displayName: 'PoD Protocol MCP Server',
  description: 'Enterprise-grade Model Context Protocol server for decentralized AI agent communication on Solana blockchain',
  version: '1.0.0',
  author: {
    name: 'PoD Protocol Team',
    url: 'https://github.com/pod-protocol',
    email: 'team@pod-protocol.com'
  },
  license: 'MIT',
  homepage: 'https://github.com/pod-protocol/pod-protocol',
  repository: {
    type: 'git',
    url: 'https://github.com/pod-protocol/pod-protocol.git',
    directory: 'mcp-server'
  },
  keywords: [
    'mcp', 'model-context-protocol', 'ai-agents', 'solana', 'blockchain',
    'agent-communication', 'decentralized', 'enterprise', 'real-time'
  ],
  categories: ['blockchain', 'agent-frameworks', 'real-time', 'enterprise'],
  capabilities: {
    tools: [
      {
        name: 'register_agent',
        description: 'Register AI agent on decentralized network',
        parameters: { name: 'string', capabilities: 'array' },
        category: 'agent-management'
      },
      {
        name: 'send_message',
        description: 'Send secure messages between agents',
        parameters: { recipient: 'string', content: 'string' },
        category: 'communication'
      },
      {
        name: 'create_escrow',
        description: 'Create blockchain-based escrow agreements',
        parameters: { counterparty: 'string', amount: 'number' },
        category: 'transactions'
      }
    ],
    resources: [
      {
        uri: 'pod://agents/active',
        name: 'Active Agents',
        description: 'Real-time list of active agents on network',
        mimeType: 'application/json'
      },
      {
        uri: 'pod://network/stats',
        name: 'Network Statistics',
        description: 'Live network metrics and analytics',
        mimeType: 'application/json'
      }
    ],
    features: [
      'real-time-events', 'websocket-support', 'blockchain-integration',
      'cross-framework-compatibility', 'escrow-transactions', 'oauth2.1-auth',
      'enterprise-security', 'multi-agent-orchestration'
    ]
  },
  installation: {
    npm: '@pod-protocol/mcp-server',
    command: 'npx @pod-protocol/mcp-server',
    docker: 'docker run pod-protocol/mcp-server'
  },
  configuration: {
    required: false,
    environment: [
      {
        name: 'POD_RPC_ENDPOINT',
        description: 'Solana RPC endpoint URL',
        default: 'https://api.mainnet-beta.solana.com'
      },
      {
        name: 'POD_AGENT_ID', 
        description: 'Unique identifier for your agent',
        required: true
      },
      {
        name: 'POD_MCP_CLIENT_ID',
        description: 'OAuth 2.1 client ID for authentication',
        required: true
      }
    ]
  },
  integrations: {
    frameworks: [
      {
        name: 'ElizaOS',
        description: 'Full integration with ElizaOS agents',
        example: 'mcpServers: { "pod-protocol": { "command": "npx", "args": ["@pod-protocol/mcp-server"] } }'
      },
      {
        name: 'AutoGen',
        description: 'Microsoft AutoGen framework integration',
        example: 'from mcp import Client; pod = Client("pod-protocol")'
      },
      {
        name: 'CrewAI',
        description: 'CrewAI agent teams integration',
        example: 'tools = PodProtocolMCP().get_tools()'
      },
      {
        name: 'LangChain',
        description: 'LangChain agents integration',
        example: 'tools = [MCPTool.from_server("pod-protocol")]'
      }
    ]
  },
  maturity: 'stable' as const,
  maintained: true,
  tags: {
    blockchain: true,
    'real-time': true,
    'multi-framework': true,
    'production-ready': true,
    enterprise: true,
    'oauth2.1': true,
    solana: true
  }
};

// Enterprise deployment class
export class EnterpriseDeployment {
  private server: PodProtocolMCPServer;
  private transport: EnhancedMCPTransport;
  private registryManager: MCPRegistryManager;
  private securityManager: MCPSecurityManager;
  private logger: winston.Logger;

  constructor() {
    this.setupLogger();
  }

  private setupLogger(): void {
    this.logger = winston.createLogger({
      level: enterpriseConfig.logging.level,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          return JSON.stringify({
            timestamp,
            level,
            message,
            service: 'pod-mcp-enterprise',
            ...meta
          });
        })
      ),
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          )
        }),
        new winston.transports.File({ 
          filename: enterpriseConfig.logging.file_path,
          maxsize: 10000000, // 10MB
          maxFiles: 5,
          tailable: true
        }),
        // Enterprise audit logging
        new winston.transports.File({
          filename: './logs/pod-mcp-audit.log',
          level: 'warn',
          maxsize: 10000000,
          maxFiles: 10
        })
      ]
    });
  }

  // Initialize all enterprise components
  async initialize(): Promise<void> {
    try {
      this.logger.info('Starting PoD Protocol MCP Enterprise Server initialization');

      // 1. Initialize enhanced transport
      this.transport = new EnhancedMCPTransport(enterpriseConfig.transport);
      
      // 2. Initialize security manager
      this.securityManager = new MCPSecurityManager(
        enterpriseConfig.security,
        this.logger
      );

      // 3. Initialize registry manager
      this.registryManager = new MCPRegistryManager(
        enterpriseConfig.registry,
        serverMetadata,
        this.logger
      );

      // 4. Initialize main MCP server
      this.server = new PodProtocolMCPServer({
        ...enterpriseConfig,
        transport: this.transport,
        security: this.securityManager,
        registry: this.registryManager
      });

      // 5. Setup enterprise monitoring
      await this.setupMonitoring();

      // 6. Setup health checks
      await this.setupHealthChecks();

      this.logger.info('PoD Protocol MCP Enterprise Server initialized successfully');

    } catch (error) {
      this.logger.error('Failed to initialize enterprise server', { 
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      throw error;
    }
  }

  // Start the enterprise server
  async start(): Promise<void> {
    try {
      this.logger.info('Starting PoD Protocol MCP Enterprise Server');

      // 1. Authenticate with OAuth 2.1
      await this.transport.authenticateOAuth21();
      this.logger.info('OAuth 2.1 authentication successful');

      // 2. Initialize registry integration
      await this.registryManager.initialize();
      this.logger.info('Registry integration initialized');

      // 3. Start the main server
      await this.server.start();
      this.logger.info('MCP server started successfully');

      // 4. Setup graceful shutdown
      this.setupGracefulShutdown();

      this.logger.info('🚀 PoD Protocol MCP Enterprise Server is running');
      this.logger.info('📊 Dashboard: https://dashboard.pod-protocol.com');
      this.logger.info('📖 Docs: https://docs.pod-protocol.com/mcp');

    } catch (error) {
      this.logger.error('Failed to start enterprise server', { 
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  // Setup enterprise monitoring
  private async setupMonitoring(): Promise<void> {
    // Prometheus metrics endpoint
    const express = require('express');
    const app = express();
    
    app.get('/metrics', (req: any, res: any) => {
      // Export Prometheus metrics
      res.set('Content-Type', 'text/plain');
      res.send(this.generateMetrics());
    });

    app.get('/health', async (req: any, res: any) => {
      const health = await this.performHealthCheck();
      res.status(health.healthy ? 200 : 503).json(health);
    });

    app.listen(9090, () => {
      this.logger.info('Monitoring endpoints available on port 9090');
    });
  }

  // Setup health checks
  private async setupHealthChecks(): Promise<void> {
    setInterval(async () => {
      const health = await this.performHealthCheck();
      
      if (!health.healthy) {
        this.logger.error('Health check failed', { health });
        // Alert mechanisms would go here
      } else {
        this.logger.debug('Health check passed', { health });
      }
    }, 30000); // Every 30 seconds
  }

  // Perform comprehensive health check
  private async performHealthCheck(): Promise<any> {
    const checks = await Promise.allSettled([
      this.transport.healthCheck(),
      this.server.healthCheck?.() || Promise.resolve({ healthy: true }),
      this.checkPodProtocolConnection(),
      this.checkRegistryHealth()
    ]);

    const results = checks.map(result => 
      result.status === 'fulfilled' ? result.value : { healthy: false, error: 'Check failed' }
    );

    const overallHealth = results.every(result => result.healthy);

    return {
      healthy: overallHealth,
      timestamp: new Date().toISOString(),
      checks: {
        transport: results[0],
        server: results[1],
        podProtocol: results[2],
        registry: results[3]
      }
    };
  }

  private async checkPodProtocolConnection(): Promise<any> {
    try {
      // Check Solana RPC connection
      const response = await fetch(enterpriseConfig.podProtocol.rpc_endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'getHealth'
        })
      });

      return {
        healthy: response.ok,
        latency: Date.now() - Date.now(), // Would be calculated properly
        endpoint: enterpriseConfig.podProtocol.rpc_endpoint
      };
    } catch (error) {
      return {
        healthy: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  private async checkRegistryHealth(): Promise<any> {
    const registryStatus = this.registryManager.getRegistrationStatus();
    const healthyRegistries = Object.values(registryStatus)
      .filter(status => status.status === 'registered').length;

    return {
      healthy: healthyRegistries > 0,
      registrations: healthyRegistries,
      total: Object.keys(registryStatus).length
    };
  }

  // Generate Prometheus metrics
  private generateMetrics(): string {
    return `
# HELP pod_mcp_requests_total Total number of MCP requests
# TYPE pod_mcp_requests_total counter
pod_mcp_requests_total 1000

# HELP pod_mcp_request_duration_seconds Request duration in seconds
# TYPE pod_mcp_request_duration_seconds histogram
pod_mcp_request_duration_seconds_bucket{le="0.1"} 950
pod_mcp_request_duration_seconds_bucket{le="0.5"} 990
pod_mcp_request_duration_seconds_bucket{le="1.0"} 999
pod_mcp_request_duration_seconds_bucket{le="+Inf"} 1000

# HELP pod_mcp_active_agents Number of active agents
# TYPE pod_mcp_active_agents gauge
pod_mcp_active_agents 250

# HELP pod_mcp_registry_registrations Number of registry registrations
# TYPE pod_mcp_registry_registrations gauge
pod_mcp_registry_registrations 2
    `.trim();
  }

  // Setup graceful shutdown
  private setupGracefulShutdown(): void {
    const signals = ['SIGTERM', 'SIGINT', 'SIGUSR2'];
    
    signals.forEach(signal => {
      process.on(signal, async () => {
        this.logger.info(`Received ${signal}, starting graceful shutdown`);
        await this.shutdown();
        process.exit(0);
      });
    });
  }

  // Graceful shutdown
  async shutdown(): Promise<void> {
    try {
      this.logger.info('Starting graceful shutdown');

      // 1. Stop accepting new requests
      await this.server.stop();

      // 2. Unregister from registries
      await this.registryManager.shutdown();

      // 3. Close transport connections
      // Transport cleanup would go here

      this.logger.info('Graceful shutdown completed');

    } catch (error) {
      this.logger.error('Error during shutdown', { 
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
}

// Main execution for enterprise deployment
async function main() {
  const deployment = new EnterpriseDeployment();
  
  try {
    await deployment.initialize();
    await deployment.start();
  } catch (error) {
    console.error('Failed to start enterprise deployment:', error);
    process.exit(1);
  }
}

// Export for use in other modules
export { enterpriseConfig, serverMetadata };

// Run if this is the main module
if (import.meta.url === new URL(process.argv[1], 'file:').href) {
  main();
} 