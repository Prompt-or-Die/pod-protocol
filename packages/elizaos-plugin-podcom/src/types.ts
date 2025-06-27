import type { IAgentRuntime } from "@elizaos/core";

/**
 * Configuration interface for PoD Protocol plugin
 */
export interface PodProtocolConfig {
  /** Solana RPC endpoint */
  rpcEndpoint: string;
  /** PoD Protocol program ID */
  programId: string;
  /** Base58 encoded private key */
  walletPrivateKey: string;
  /** Agent name on PoD Protocol */
  agentName?: string;
  /** Agent capabilities */
  capabilities: string[];
  /** MCP server endpoint */
  mcpEndpoint?: string;
  /** Auto-register on startup */
  autoRegister: boolean;
}

/**
 * Agent information on PoD Protocol
 */
export interface PodAgent {
  /** Unique agent identifier */
  agentId: string;
  /** Agent display name */
  name: string;
  /** Agent description */
  description: string;
  /** Agent capabilities */
  capabilities: string[];
  /** Agent reputation score */
  reputation: number;
  /** Agent wallet address */
  walletAddress: string;
  /** Last activity timestamp */
  lastActive: Date;
  /** Agent status */
  status: "online" | "offline" | "busy";
  /** Agent framework */
  framework?: string;
}

/**
 * Message interface for PoD Protocol
 */
export interface PodMessage {
  /** Message ID */
  id: string;
  /** Sender agent ID */
  senderId: string;
  /** Recipient agent ID */
  recipientId: string;
  /** Message content */
  content: string;
  /** Message type */
  type: "text" | "data" | "command" | "response";
  /** Message priority */
  priority: "low" | "normal" | "high" | "urgent";
  /** Timestamp */
  timestamp: Date;
  /** Delivery status */
  status: "pending" | "delivered" | "read" | "failed";
  /** Encryption enabled */
  encrypted: boolean;
  /** Transaction hash */
  transactionHash?: string;
}

/**
 * Channel interface for PoD Protocol
 */
export interface PodChannel {
  /** Channel ID */
  id: string;
  /** Channel name */
  name: string;
  /** Channel description */
  description: string;
  /** Channel type */
  type: "public" | "private";
  /** Channel creator */
  creatorId: string;
  /** Channel participants */
  participants: string[];
  /** Max participants */
  maxParticipants: number;
  /** Creation timestamp */
  createdAt: Date;
  /** Last activity */
  lastActivity: Date;
}

/**
 * Escrow transaction interface
 */
export interface PodEscrow {
  /** Escrow ID */
  id: string;
  /** Amount in SOL */
  amount: number;
  /** Counterparty agent ID */
  counterpartyId: string;
  /** Service description */
  service: string;
  /** Deliverables */
  deliverables: string[];
  /** Deadline */
  deadline: Date;
  /** Escrow status */
  status: "created" | "funded" | "completed" | "released" | "disputed" | "cancelled";
  /** Transaction hash */
  transactionHash?: string;
}

/**
 * Plugin state interface
 */
export interface PodPluginState {
  /** Current agent info */
  agent: PodAgent | null;
  /** Registration status */
  isRegistered: boolean;
  /** Connected agents */
  connectedAgents: Map<string, PodAgent>;
  /** Active channels */
  channels: Map<string, PodChannel>;
  /** Recent messages */
  messages: PodMessage[];
  /** Active escrows */
  escrows: Map<string, PodEscrow>;
  /** Last sync timestamp */
  lastSync: Date;
}

/**
 * Environment configuration type
 */
export interface PodEnvironment {
  POD_RPC_ENDPOINT?: string;
  POD_PROGRAM_ID?: string;
  POD_WALLET_PRIVATE_KEY?: string;
  POD_AGENT_NAME?: string;
  POD_AGENT_CAPABILITIES?: string;
  POD_MCP_ENDPOINT?: string;
  POD_AUTO_REGISTER?: string;
}

/**
 * Validation result interface
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Agent discovery filters
 */
export interface AgentDiscoveryFilter {
  /** Filter by capabilities */
  capabilities?: string[];
  /** Filter by framework */
  framework?: string;
  /** Search term */
  searchTerm?: string;
  /** Minimum reputation */
  minReputation?: number;
  /** Agent status */
  status?: "online" | "offline" | "busy" | "any";
  /** Maximum results */
  limit?: number;
  /** Offset for pagination */
  offset?: number;
}

/**
 * Message filter interface
 */
export interface MessageFilter {
  /** Filter by sender */
  senderId?: string;
  /** Filter by recipient */
  recipientId?: string;
  /** Filter by type */
  type?: string;
  /** Filter by status */
  status?: string;
  /** Since timestamp */
  since?: Date;
  /** Maximum results */
  limit?: number;
  /** Only unread messages */
  unreadOnly?: boolean;
}

/**
 * Plugin service interface
 */
export interface PodProtocolService {
  /** Initialize the service */
  initialize(runtime: IAgentRuntime): Promise<void>;
  
  /** Register agent on PoD Protocol */
  registerAgent(config: PodProtocolConfig): Promise<PodAgent>;
  
  /** Discover other agents */
  discoverAgents(filter?: AgentDiscoveryFilter): Promise<PodAgent[]>;
  
  /** Send message to another agent */
  sendMessage(recipientId: string, content: string, options?: Partial<PodMessage>): Promise<PodMessage>;
  
  /** Get messages */
  getMessages(filter?: MessageFilter): Promise<PodMessage[]>;
  
  /** Create channel */
  createChannel(name: string, description: string, options?: Partial<PodChannel>): Promise<PodChannel>;
  
  /** Join channel */
  joinChannel(channelId: string): Promise<boolean>;
  
  /** Leave channel */
  leaveChannel(channelId: string): Promise<boolean>;
  
  /** Get channel participants */
  getChannelParticipants(channelId: string): Promise<PodAgent[]>;
  
  /** Create escrow */
  createEscrow(counterpartyId: string, amount: number, service: string, deliverables: string[]): Promise<PodEscrow>;
  
  /** Get agent reputation */
  getAgentReputation(agentId?: string): Promise<number>;
  
  /** Get protocol statistics */
  getProtocolStats(): Promise<any>;
  
  /** Health check */
  healthCheck(): Promise<boolean>;
}