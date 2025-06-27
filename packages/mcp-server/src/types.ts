/**
 * PoD Protocol MCP Server Types
 * Comprehensive type definitions for bridging agent runtimes with PoD Protocol
 */

import { z } from 'zod';
import type { Address } from '@solana/addresses';

// =====================================================
// MCP Tool Schemas (Zod validation for safety)
// =====================================================

// Agent Management Tools
export const RegisterAgentSchema = z.object({
  name: z.string().min(1).max(50),
  description: z.string().max(500).optional(),
  capabilities: z.array(z.string()),
  endpoint: z.string().url().optional(),
  metadata: z.record(z.any()).optional(),
  avatar_url: z.string().url().optional()
});

export const DiscoverAgentsSchema = z.object({
  capabilities: z.array(z.string()).optional(),
  search_term: z.string().optional(),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0)
});

export const GetAgentSchema = z.object({
  agent_id: z.string()
});

// Message Management Tools
export const SendMessageSchema = z.object({
  recipient: z.string(), // Agent ID or address
  content: z.string().min(1).max(10000),
  message_type: z.enum(['text', 'data', 'command', 'response']).default('text'),
  metadata: z.record(z.any()).optional(),
  expires_in: z.number().min(60).max(86400).optional() // 1 minute to 24 hours
});

export const GetMessagesSchema = z.object({
  agent_id: z.string().optional(),
  channel_id: z.string().optional(),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
  message_type: z.enum(['text', 'data', 'command', 'response']).optional(),
  status: z.enum(['pending', 'delivered', 'read', 'expired']).optional()
});

export const MarkMessageReadSchema = z.object({
  message_id: z.string()
});

// Channel Management Tools
export const CreateChannelSchema = z.object({
  name: z.string().min(1).max(50),
  description: z.string().max(500).optional(),
  visibility: z.enum(['public', 'private', 'restricted']).default('public'),
  max_participants: z.number().min(2).max(1000).default(100),
  requires_deposit: z.boolean().default(false),
  deposit_amount: z.number().min(0).optional()
});

export const JoinChannelSchema = z.object({
  channel_id: z.string(),
  invite_code: z.string().optional()
});

export const SendChannelMessageSchema = z.object({
  channel_id: z.string(),
  content: z.string().min(1).max(10000),
  message_type: z.enum(['text', 'announcement', 'system']).default('text'),
  reply_to: z.string().optional(),
  metadata: z.record(z.any()).optional()
});

export const GetChannelMessagesSchema = z.object({
  channel_id: z.string(),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
  since: z.number().optional() // Unix timestamp
});

// Escrow Management Tools
export const CreateEscrowSchema = z.object({
  counterparty: z.string(), // Agent ID
  amount: z.number().min(0.001), // SOL amount
  description: z.string().max(500),
  conditions: z.array(z.string()),
  timeout_hours: z.number().min(1).max(168).default(24), // 1 hour to 1 week
  arbitrator: z.string().optional() // Agent ID for arbitration
});

export const ReleaseEscrowSchema = z.object({
  escrow_id: z.string(),
  signature: z.string().optional() // Counterparty signature for release
});

// Analytics Tools
export const GetAgentStatsSchema = z.object({
  agent_id: z.string(),
  time_range: z.enum(['24h', '7d', '30d', '90d']).default('24h')
});

export const GetNetworkStatsSchema = z.object({
  time_range: z.enum(['24h', '7d', '30d', '90d']).default('24h')
});

// =====================================================
// Agent Runtime Integration Types
// =====================================================

export interface AgentRuntimeConfig {
  runtime: 'eliza' | 'autogen' | 'crewai' | 'langchain' | 'custom';
  agent_id: string;
  wallet_path?: string;
  rpc_endpoint?: string;
  auto_respond?: boolean;
  response_delay_ms?: number;
}

export interface ElizaIntegration {
  character_file: string;
  memory_enabled: boolean;
  twitter_integration?: boolean;
  discord_integration?: boolean;
}

export interface AutoGenIntegration {
  team_name: string;
  role: string;
  conversation_history: boolean;
}

export interface CrewAIIntegration {
  crew_name: string;
  agent_role: string;
  task_delegation: boolean;
}

// =====================================================
// PoD Protocol Response Types
// =====================================================

export interface PodAgent {
  id: string;
  address: Address;
  name: string;
  description?: string;
  capabilities: string[];
  endpoint?: string;
  metadata?: Record<string, any>;
  avatar_url?: string;
  reputation_score: number;
  total_messages: number;
  last_active: number;
  created_at: number;
}

export interface PodMessage {
  id: string;
  sender: string;
  recipient: string;
  content: string;
  message_type: 'text' | 'data' | 'command' | 'response';
  status: 'pending' | 'delivered' | 'read' | 'expired';
  metadata?: Record<string, any>;
  created_at: number;
  expires_at?: number;
  signature: string;
}

export interface PodChannel {
  id: string;
  address: Address;
  name: string;
  description?: string;
  visibility: 'public' | 'private' | 'restricted';
  creator: string;
  participants: string[];
  max_participants: number;
  message_count: number;
  requires_deposit: boolean;
  deposit_amount?: number;
  created_at: number;
}

export interface PodChannelMessage {
  id: string;
  channel_id: string;
  sender: string;
  content: string;
  message_type: 'text' | 'announcement' | 'system';
  reply_to?: string;
  metadata?: Record<string, any>;
  created_at: number;
}

export interface PodEscrow {
  id: string;
  address: Address;
  creator: string;
  counterparty: string;
  amount: number;
  description: string;
  conditions: string[];
  status: 'pending' | 'active' | 'released' | 'refunded' | 'disputed';
  arbitrator?: string;
  created_at: number;
  expires_at: number;
}

export interface AgentStats {
  agent_id: string;
  messages_sent: number;
  messages_received: number;
  channels_joined: number;
  escrows_created: number;
  reputation_score: number;
  activity_score: number;
  uptime_percentage: number;
}

export interface NetworkStats {
  total_agents: number;
  active_agents: number;
  total_messages: number;
  total_channels: number;
  total_escrows: number;
  daily_active_users: number;
  network_value_locked: number;
}

// =====================================================
// MCP Server Configuration
// =====================================================

export interface MCPServerConfig {
  pod_protocol: {
    rpc_endpoint: string;
    program_id: string;
    commitment: 'processed' | 'confirmed' | 'finalized';
  };
  agent_runtime: AgentRuntimeConfig;
  features: {
    auto_message_processing: boolean;
    real_time_notifications: boolean;
    cross_runtime_discovery: boolean;
    analytics_tracking: boolean;
  };
  security: {
    rate_limit_per_minute: number;
    max_message_size: number;
    allowed_origins: string[];
    require_signature_verification: boolean;
  };
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error';
    file_path?: string;
    console_output: boolean;
  };
}

// =====================================================
// Tool Response Types
// =====================================================

export interface ToolResponse<T = any> {
  success: boolean;
  data?: T;
  content?: Array<{ type: 'text'; text: string }>;
  error?: string;
  transaction_signature?: string;
  timestamp: number;
}

export interface AgentDiscoveryResponse extends ToolResponse {
  data?: {
    agents: PodAgent[];
    total_count: number;
    has_more: boolean;
  };
}

export interface MessageResponse extends ToolResponse {
  data?: {
    message_id: string;
    status: 'sent' | 'pending' | 'failed';
    estimated_delivery: number;
  };
}

export interface ChannelResponse extends ToolResponse {
  data?: {
    channel: PodChannel;
    join_code?: string;
  };
}

export interface EscrowResponse extends ToolResponse {
  data?: {
    escrow: PodEscrow;
    required_confirmations: number;
  };
}

// =====================================================
// Event Types for Real-time Updates
// =====================================================

export interface PodEvent {
  type: 'message_received' | 'channel_message' | 'agent_registered' | 'escrow_updated' | 'message_sent';
  agent_id: string;
  data: any;
  timestamp: number;
}

export type PodEventHandler = (event: PodEvent) => Promise<void>;

// =====================================================
// Type Exports (schemas are already exported above)
// =====================================================

// Re-export ModernMCPServerConfig for test compatibility
export type { ModernMCPServerConfig } from './modern-mcp-server.js';