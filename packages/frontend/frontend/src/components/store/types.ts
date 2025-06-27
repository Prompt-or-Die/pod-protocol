// User and Authentication
export interface User {
  id: string;
  walletAddress: string;
  username?: string;
  avatar?: string;
  reputation: number;
  createdAt: Date;
  lastActive: Date;
}

// Agent Types
export interface Agent {
  id: string;
  name: string;
  description: string;
  avatar?: string;
  owner: string;
  category: AgentCategory;
  tags: string[];
  pricing: AgentPricing;
  capabilities: string[];
  status: AgentStatus;
  reputation: number;
  totalInteractions: number;
  createdAt: Date;
  updatedAt: Date;
  isVerified: boolean;
  metadata?: Record<string, unknown>;
}

export enum AgentCategory {
  CODING = 'coding',
  WRITING = 'writing',
  ANALYSIS = 'analysis',
  CREATIVE = 'creative',
  RESEARCH = 'research',
  TRADING = 'trading',
  GAMING = 'gaming',
  EDUCATION = 'education',
  PRODUCTIVITY = 'productivity',
  OTHER = 'other',
}

export enum AgentStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  MAINTENANCE = 'maintenance',
  SUSPENDED = 'suspended',
}

export interface AgentPricing {
  type: 'free' | 'fixed' | 'subscription' | 'usage';
  amount?: number; // in SOL
  currency: 'SOL' | 'USDC';
  billingPeriod?: 'hour' | 'day' | 'week' | 'month';
}

// Channel and Communication
export interface Channel {
  id: string;
  name: string;
  description?: string;
  type: ChannelType;
  participants: string[]; // user IDs
  agents: string[]; // agent IDs
  owner: string;
  isPrivate: boolean;
  createdAt: Date;
  lastActivity: Date;
  messageCount: number;
  settings: ChannelSettings;
}

export enum ChannelType {
  DIRECT = 'direct',
  GROUP = 'group',
  AGENT_CHAT = 'agent_chat',
  MARKETPLACE = 'marketplace',
  SUPPORT = 'support',
}

export interface ChannelSettings {
  allowFileUploads: boolean;
  maxParticipants: number;
  autoArchiveAfter?: number; // days
  moderationEnabled: boolean;
  allowedFileTypes: string[];
}

// Messages
export interface Message {
  id: string;
  channelId: string;
  senderId: string;
  senderType: 'user' | 'agent';
  content: string;
  type: MessageType;
  timestamp: Date;
  editedAt?: Date;
  replyTo?: string;
  attachments: MessageAttachment[];
  reactions: MessageReaction[];
  metadata?: Record<string, unknown>;
  status: MessageStatus;
}

export enum MessageType {
  TEXT = 'text',
  IMAGE = 'image',
  FILE = 'file',
  CODE = 'code',
  SYSTEM = 'system',
  PAYMENT = 'payment',
  AGENT_RESPONSE = 'agent_response',
}

export enum MessageStatus {
  SENDING = 'sending',
  SENT = 'sent',
  DELIVERED = 'delivered',
  READ = 'read',
  FAILED = 'failed',
}

export interface MessageAttachment {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
  thumbnail?: string;
}

export interface MessageReaction {
  emoji: string;
  users: string[];
  count: number;
}

// Escrow and Payments
export interface EscrowTransaction {
  id: string;
  fromUser: string;
  toAgent: string;
  amount: number;
  currency: 'SOL' | 'USDC';
  status: EscrowStatus;
  createdAt: Date;
  completedAt?: Date;
  description: string;
  metadata?: Record<string, unknown>;
  transactionHash?: string;
}

export enum EscrowStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  DISPUTED = 'disputed',
  REFUNDED = 'refunded',
}

// Notifications
export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  read: boolean;
  createdAt: Date;
  expiresAt?: Date;
}

export enum NotificationType {
  MESSAGE = 'message',
  PAYMENT = 'payment',
  AGENT_UPDATE = 'agent_update',
  SYSTEM = 'system',
  REPUTATION = 'reputation',
  CHANNEL_INVITE = 'channel_invite',
}

// Application State
export interface AppState {
  // Authentication
  user: User | null;
  isAuthenticated: boolean;
  
  // UI State
  theme: 'dark' | 'light';
  sidebarCollapsed: boolean;
  activeChannel: string | null;
  
  // Data
  agents: Agent[];
  channels: Channel[];
  messages: Record<string, Message[]>; // channelId -> messages
  notifications: Notification[];
  escrowTransactions: EscrowTransaction[];
  
  // Loading States
  loading: {
    agents: boolean;
    channels: boolean;
    messages: boolean;
    user: boolean;
  };
  
  // Error States
  errors: {
    agents: string | null;
    channels: string | null;
    messages: string | null;
    user: string | null;
  };
  
  // Actions
  setUser: (user: User | null) => void;
  setTheme: (theme: 'dark' | 'light') => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setActiveChannel: (channelId: string | null) => void;
  
  // Agent Actions
  addAgent: (agent: Agent) => void;
  updateAgent: (id: string, updates: Partial<Agent>) => void;
  removeAgent: (id: string) => void;
  setAgents: (agents: Agent[]) => void;
  setAgentsLoading: (loading: boolean) => void;
  setAgentsError: (error: string | null) => void;
  
  // Channel Actions
  addChannel: (channel: Channel) => void;
  updateChannel: (id: string, updates: Partial<Channel>) => void;
  removeChannel: (id: string) => void;
  setChannels: (channels: Channel[]) => void;
  setChannelsLoading: (loading: boolean) => void;
  setChannelsError: (error: string | null) => void;
  
  // Message Actions
  addMessage: (channelId: string, message: Message) => void;
  updateMessage: (channelId: string, messageId: string, updates: Partial<Message>) => void;
  removeMessage: (channelId: string, messageId: string) => void;
  setMessages: (channelId: string, messages: Message[]) => void;
  setMessagesLoading: (loading: boolean) => void;
  setMessagesError: (error: string | null) => void;
  
  // Notification Actions
  addNotification: (notification: Notification) => void;
  markNotificationRead: (id: string) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
  
  // Escrow Actions
  addEscrowTransaction: (transaction: EscrowTransaction) => void;
  updateEscrowTransaction: (id: string, updates: Partial<EscrowTransaction>) => void;
  setEscrowTransactions: (transactions: EscrowTransaction[]) => void;
}