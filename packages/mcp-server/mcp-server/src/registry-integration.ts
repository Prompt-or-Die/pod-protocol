/**
 * MCP Registry Integration for PoD Protocol
 * Connects to official MCP registries for enhanced discoverability
 */

import { EventEmitter } from 'events';
import winston from 'winston';

export interface MCPRegistryConfig {
  registries: RegistryEndpoint[];
  autoRegister: boolean;
  updateInterval: number;
  enableMetrics: boolean;
  healthCheckInterval: number;
}

export interface RegistryEndpoint {
  name: string;
  url: string;
  apiKey?: string;
  priority: number;
  categories: string[];
  enabled: boolean;
}

export interface ServerMetadata {
  name: string;
  displayName: string;
  description: string;
  version: string;
  author: {
    name: string;
    url?: string;
    email?: string;
  };
  license: string;
  homepage: string;
  repository: {
    type: string;
    url: string;
    directory?: string;
  };
  keywords: string[];
  categories: string[];
  capabilities: {
    tools: ToolCapability[];
    resources: ResourceCapability[];
    features: string[];
  };
  installation: {
    npm?: string;
    command?: string;
    docker?: string;
  };
  configuration: {
    required: boolean;
    environment: EnvironmentVariable[];
  };
  integrations: {
    frameworks: FrameworkIntegration[];
  };
  maturity: 'experimental' | 'beta' | 'stable' | 'deprecated';
  maintained: boolean;
  tags: Record<string, boolean>;
  stats?: {
    downloads?: number;
    stars?: number;
    lastUpdated?: string;
  };
}

export interface ToolCapability {
  name: string;
  description: string;
  parameters: Record<string, any>;
  category: string;
}

export interface ResourceCapability {
  uri: string;
  name: string;
  description: string;
  mimeType: string;
}

export interface EnvironmentVariable {
  name: string;
  description: string;
  required?: boolean;
  default?: string;
  example?: string;
  enum?: string[];
}

export interface FrameworkIntegration {
  name: string;
  description: string;
  configuration?: any;
  example?: string;
}

export class MCPRegistryManager extends EventEmitter {
  private config: MCPRegistryConfig;
  private logger: winston.Logger;
  private serverMetadata: ServerMetadata;
  private registrationStatus: Map<string, RegistrationStatus> = new Map();
  private healthCheckTimer?: NodeJS.Timeout;
  private updateTimer?: NodeJS.Timeout;

  constructor(config: MCPRegistryConfig, serverMetadata: ServerMetadata, logger: winston.Logger) {
    super();
    this.config = config;
    this.serverMetadata = serverMetadata;
    this.logger = logger;
  }

  // Initialize registry integration
  async initialize(): Promise<void> {
    this.logger.info('Initializing MCP registry integration');

    // Auto-register if enabled
    if (this.config.autoRegister) {
      await this.registerWithAllRegistries();
    }

    // Start periodic updates
    this.startPeriodicUpdates();

    // Start health checks
    this.startHealthChecks();

    this.logger.info('MCP registry integration initialized');
  }

  // Register server with all configured registries
  async registerWithAllRegistries(): Promise<void> {
    const registrationPromises = this.config.registries
      .filter(registry => registry.enabled)
      .map(registry => this.registerWithRegistry(registry));

    await Promise.allSettled(registrationPromises);
  }

  // Register with a specific registry
  async registerWithRegistry(registry: RegistryEndpoint): Promise<void> {
    try {
      this.logger.info('Registering with registry', { registry: registry.name });

      const registrationData = this.prepareRegistrationData(registry);
      
      const response = await fetch(`${registry.url}/api/v1/servers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(registry.apiKey && { 'Authorization': `Bearer ${registry.apiKey}` }),
          'User-Agent': 'PoD-Protocol-MCP/1.0.0'
        },
        body: JSON.stringify(registrationData)
      });

      if (!response.ok) {
        throw new Error(`Registration failed: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      
      this.registrationStatus.set(registry.name, {
        status: 'registered',
        lastUpdate: new Date(),
        registryId: result.id,
        url: result.url
      });

      this.logger.info('Successfully registered with registry', { 
        registry: registry.name, 
        id: result.id 
      });

      this.emit('registered', { registry: registry.name, id: result.id });

    } catch (error) {
      this.logger.error('Failed to register with registry', { 
        registry: registry.name, 
        error: error instanceof Error ? error.message : String(error)
      });

      this.registrationStatus.set(registry.name, {
        status: 'failed',
        lastUpdate: new Date(),
        error: error instanceof Error ? error.message : String(error)
      });

      this.emit('registration-failed', { registry: registry.name, error });
    }
  }

  // Prepare registration data for a specific registry
  private prepareRegistrationData(registry: RegistryEndpoint): any {
    const baseData = {
      ...this.serverMetadata,
      categories: this.serverMetadata.categories.filter(cat => 
        registry.categories.length === 0 || registry.categories.includes(cat)
      )
    };

    // Add registry-specific customizations
    switch (registry.name) {
      case 'official':
        return {
          ...baseData,
          verification: {
            method: 'github',
            repository: this.serverMetadata.repository.url
          }
        };

      case 'community':
        return {
          ...baseData,
          community: {
            tags: Object.keys(this.serverMetadata.tags).filter(tag => 
              this.serverMetadata.tags[tag]
            ),
            maintenance_score: this.calculateMaintenanceScore()
          }
        };

      default:
        return baseData;
    }
  }

  // Calculate maintenance score for registry submission
  private calculateMaintenanceScore(): number {
    let score = 0;
    
    // Base score for maintained projects
    if (this.serverMetadata.maintained) score += 50;
    
    // Maturity bonus
    switch (this.serverMetadata.maturity) {
      case 'stable': score += 30; break;
      case 'beta': score += 20; break;
      case 'experimental': score += 10; break;
    }
    
    // Documentation bonus
    if (this.serverMetadata.homepage) score += 10;
    if (this.serverMetadata.repository) score += 10;
    
    return Math.min(score, 100);
  }

  // Update server information in registries
  async updateRegistrations(): Promise<void> {
    const updatePromises = Array.from(this.registrationStatus.entries())
      .filter(([_, status]) => status.status === 'registered')
      .map(([registryName, status]) => {
        const registry = this.config.registries.find(r => r.name === registryName);
        if (registry) {
          return this.updateRegistryEntry(registry, status);
        }
        return Promise.resolve();
      });

    await Promise.allSettled(updatePromises);
  }

  // Update a specific registry entry
  private async updateRegistryEntry(registry: RegistryEndpoint, status: RegistrationStatus): Promise<void> {
    try {
      const updateData = this.prepareRegistrationData(registry);
      
      const response = await fetch(`${registry.url}/api/v1/servers/${status.registryId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(registry.apiKey && { 'Authorization': `Bearer ${registry.apiKey}` }),
          'User-Agent': 'PoD-Protocol-MCP/1.0.0'
        },
        body: JSON.stringify(updateData)
      });

      if (!response.ok) {
        throw new Error(`Update failed: ${response.status} ${response.statusText}`);
      }

      status.lastUpdate = new Date();
      this.logger.info('Successfully updated registry entry', { registry: registry.name });

    } catch (error) {
      this.logger.error('Failed to update registry entry', { 
        registry: registry.name, 
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  // Discover other servers from registries
  async discoverServers(filters?: {
    categories?: string[];
    keywords?: string[];
    frameworks?: string[];
    maturity?: string[];
  }): Promise<ServerMetadata[]> {
    const discoveryPromises = this.config.registries
      .filter(registry => registry.enabled)
      .map(registry => this.discoverFromRegistry(registry, filters));

    const results = await Promise.allSettled(discoveryPromises);
    
    const servers: ServerMetadata[] = [];
    results.forEach(result => {
      if (result.status === 'fulfilled' && result.value) {
        servers.push(...result.value);
      }
    });

    // Deduplicate by name/repository
    const uniqueServers = servers.filter((server, index, arr) => 
      arr.findIndex(s => s.name === server.name || s.repository.url === server.repository.url) === index
    );

    return uniqueServers;
  }

  // Discover servers from a specific registry
  private async discoverFromRegistry(
    registry: RegistryEndpoint, 
    filters?: any
  ): Promise<ServerMetadata[]> {
    try {
      const searchParams = new URLSearchParams();
      
      if (filters?.categories) {
        searchParams.append('categories', filters.categories.join(','));
      }
      if (filters?.keywords) {
        searchParams.append('keywords', filters.keywords.join(','));
      }
      if (filters?.frameworks) {
        searchParams.append('frameworks', filters.frameworks.join(','));
      }
      if (filters?.maturity) {
        searchParams.append('maturity', filters.maturity.join(','));
      }

      const response = await fetch(`${registry.url}/api/v1/servers?${searchParams}`, {
        headers: {
          ...(registry.apiKey && { 'Authorization': `Bearer ${registry.apiKey}` }),
          'User-Agent': 'PoD-Protocol-MCP/1.0.0'
        }
      });

      if (!response.ok) {
        throw new Error(`Discovery failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data.servers || [];

    } catch (error) {
      this.logger.error('Failed to discover servers from registry', { 
        registry: registry.name, 
        error: error instanceof Error ? error.message : String(error)
      });
      return [];
    }
  }

  // Start periodic updates
  private startPeriodicUpdates(): void {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
    }

    this.updateTimer = setInterval(async () => {
      await this.updateRegistrations();
    }, this.config.updateInterval);
  }

  // Start health checks
  private startHealthChecks(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }

    this.healthCheckTimer = setInterval(async () => {
      await this.performHealthChecks();
    }, this.config.healthCheckInterval);
  }

  // Perform health checks on all registries
  private async performHealthChecks(): Promise<void> {
    const healthPromises = this.config.registries
      .filter(registry => registry.enabled)
      .map(registry => this.checkRegistryHealth(registry));

    await Promise.allSettled(healthPromises);
  }

  // Check health of a specific registry
  private async checkRegistryHealth(registry: RegistryEndpoint): Promise<void> {
    try {
      const response = await fetch(`${registry.url}/api/v1/health`, {
        method: 'GET',
        headers: {
          'User-Agent': 'PoD-Protocol-MCP/1.0.0'
        },
        timeout: 5000
      } as any);

      const isHealthy = response.ok;
      
      this.emit('registry-health', { 
        registry: registry.name, 
        healthy: isHealthy,
        status: response.status 
      });

    } catch (error) {
      this.emit('registry-health', { 
        registry: registry.name, 
        healthy: false,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  // Get registration status for all registries
  getRegistrationStatus(): Record<string, RegistrationStatus> {
    const status: Record<string, RegistrationStatus> = {};
    
    this.config.registries.forEach(registry => {
      status[registry.name] = this.registrationStatus.get(registry.name) || {
        status: 'not-registered',
        lastUpdate: new Date()
      };
    });

    return status;
  }

  // Unregister from all registries
  async unregisterFromAllRegistries(): Promise<void> {
    const unregistrationPromises = Array.from(this.registrationStatus.entries())
      .filter(([_, status]) => status.status === 'registered')
      .map(([registryName, status]) => {
        const registry = this.config.registries.find(r => r.name === registryName);
        if (registry) {
          return this.unregisterFromRegistry(registry, status);
        }
        return Promise.resolve();
      });

    await Promise.allSettled(unregistrationPromises);
  }

  // Unregister from a specific registry
  private async unregisterFromRegistry(registry: RegistryEndpoint, status: RegistrationStatus): Promise<void> {
    try {
      const response = await fetch(`${registry.url}/api/v1/servers/${status.registryId}`, {
        method: 'DELETE',
        headers: {
          ...(registry.apiKey && { 'Authorization': `Bearer ${registry.apiKey}` }),
          'User-Agent': 'PoD-Protocol-MCP/1.0.0'
        }
      });

      if (!response.ok) {
        throw new Error(`Unregistration failed: ${response.status} ${response.statusText}`);
      }

      this.registrationStatus.delete(registry.name);
      this.logger.info('Successfully unregistered from registry', { registry: registry.name });

    } catch (error) {
      this.logger.error('Failed to unregister from registry', { 
        registry: registry.name, 
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  // Cleanup
  async shutdown(): Promise<void> {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
    }
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }

    // Optionally unregister from all registries on shutdown
    // await this.unregisterFromAllRegistries();
    
    this.logger.info('MCP registry integration shut down');
  }
}

interface RegistrationStatus {
  status: 'not-registered' | 'registering' | 'registered' | 'failed' | 'updating';
  lastUpdate: Date;
  registryId?: string;
  url?: string;
  error?: string;
} 