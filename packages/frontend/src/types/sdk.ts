// Re-export SDK types for frontend use with proper alignment
export type {
  AgentAccount,
  MessageAccount,
  ChannelAccount,
  EscrowAccount,
  NetworkStatistics,
  AgentSearchFilters,
  ChannelSearchFilters,
  MessageSearchFilters,
  CreateAgentOptions,
  UpdateAgentOptions,
  SendMessageOptions,
  CreateChannelOptions,
  DepositEscrowOptions,
  WithdrawEscrowOptions,
  PodComConfig
} from '@pod-protocol/sdk';

export {
  MessageType,
  MessageStatus,
  ChannelVisibility,
  AGENT_CAPABILITIES,
  PROGRAM_ID
} from '@pod-protocol/sdk';

// Frontend-specific enhanced types that extend SDK types
export interface EnhancedAgentAccount {
  // SDK base properties
  pubkey: string;
  capabilities: number;
  metadataUri: string;
  reputation: number;
  lastUpdated: number;
  invitesSent: number;
  lastInviteAt: number;
  bump: number;
  
  // Frontend-specific properties
  name?: string;
  description?: string;
  isActive?: boolean;
  avatar?: string;
  tags?: string[];
  lastSeen?: number;
  performanceScore?: number;
}

export interface EnhancedChannelAccount {
  // SDK base properties
  pubkey: string;
  creator: string;
  name: string;
  description: string;
  visibility: number;
  maxMembers: number;
  memberCount: number;
  currentParticipants: number;
  maxParticipants: number;
  participantCount: number;
  feePerMessage: number;
  escrowBalance: number;
  createdAt: number;
  lastUpdated: number;
  isActive: boolean;
  requiresApproval?: boolean;
  bump: number;
  
  // Frontend-specific properties
  avatar?: string;
  tags?: string[];
  recentActivity?: number;
  popularityScore?: number;
  categories?: string[];
}

export interface EnhancedMessageAccount {
  // SDK base properties
  pubkey: string;
  sender: string;
  recipient: string;
  payloadHash: Uint8Array;
  payload: string;
  messageType: number;
  timestamp: number;
  createdAt: number;
  expiresAt: number;
  status: string;
  bump: number;
  
  // Frontend-specific properties
  senderName?: string;
  recipientName?: string;
  channelId?: string;
  channelName?: string;
  reactions?: Array<{ emoji: string; count: number; users: string[] }>;
  replies?: string[];
  edited?: boolean;
  editedAt?: number;
  attachments?: Array<{ type: string; url: string; name: string }>;
  encrypted?: boolean;
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

// Search and filter types
export interface SearchResult<T> {
  items: T[];
  total: number;
  hasMore: boolean;
  executionTime?: number;
}

export interface PaginationOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Analytics types
export interface AnalyticsData {
  agents: {
    totalAgents: number;
    activeAgents: number;
    averageReputation: number;
    topPerformers: EnhancedAgentAccount[];
  };
  channels: {
    totalChannels: number;
    activeChannels: number;
    totalMessages: number;
    popularChannels: EnhancedChannelAccount[];
  };
  network: {
    totalTransactions: number;
    tps: number;
    slotHeight: number;
    epoch: number;
    health: string;
    activeNodes?: number;
    stakingRatio?: number;
  };
  zkCompression: {
    totalTrees: number;
    totalCompressedNFTs: number;
    costSavings: string;
    compressionRatio: string;
  };
}

// UI State types
export interface LoadingState {
  isLoading: boolean;
  loadingText?: string;
  progress?: number;
}

export interface ErrorState {
  hasError: boolean;
  error?: Error | string;
  errorCode?: string;
}

// Component prop types
export interface BaseComponentProps {
  className?: string;
  children?: React.ReactNode;
  loading?: boolean;
  error?: string;
}

// Form types
export interface CreateAgentFormData {
  name: string;
  description: string;
  capabilities: string[];
  metadataUri: string;
  isPublic: boolean;
  avatar?: string;
  tags?: string[];
}

export interface CreateChannelFormData {
  name: string;
  description: string;
  visibility: 'public' | 'private';
  maxParticipants: number;
  feePerMessage: number;
  requiresApproval?: boolean;
  avatar?: string;
  tags?: string[];
  categories?: string[];
}

export interface SendMessageFormData {
  recipient: string;
  content: string;
  channelId?: string;
  messageType?: 'text' | 'image' | 'file' | 'code';
  encrypted?: boolean;
  attachments?: File[];
}

// Wallet and authentication types
export interface AuthUser {
  id: string;
  publicKey: string;
  walletAddress: string;
  authenticatedAt?: string;
  refreshedAt?: string;
  profile?: {
    name?: string;
    avatar?: string;
    bio?: string;
  };
}

export interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: AuthUser | null;
  error: string | null;
}

// WebSocket types
export interface WebSocketMessage {
  type: string;
  data: any;
  timestamp: number;
  id?: string;
}

export interface RealtimeUpdate {
  type: 'agent_update' | 'channel_update' | 'message_received' | 'status_change';
  entityId: string;
  data: any;
  timestamp: number;
}

// Error types
export class PodProtocolError extends Error {
  constructor(
    message: string,
    public code?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'PodProtocolError';
  }
}

export class ApiError extends PodProtocolError {
  constructor(
    message: string,
    public statusCode?: number,
    public endpoint?: string
  ) {
    super(message, 'API_ERROR');
  }
}

export class ValidationError extends PodProtocolError {
  constructor(
    message: string,
    public field?: string,
    public value?: any
  ) {
    super(message, 'VALIDATION_ERROR');
  }
}

export class AuthenticationError extends PodProtocolError {
  constructor(message: string) {
    super(message, 'AUTH_ERROR');
  }
}