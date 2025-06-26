// Shared WebSocket types for client and server
export interface ChannelMessage {
  id: string;
  channelId: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: number;
  type: 'text' | 'image' | 'file';
  metadata?: Record<string, unknown>;
}

export interface UserPresence {
  userId: string;
  username: string;
  status: 'online' | 'away' | 'offline';
  lastSeen: number;
  channelId?: string;
}

export interface TypingIndicator {
  userId: string;
  username: string;
  channelId: string;
  isTyping: boolean;
}

// Server-side events
export interface ServerToClientEvents {
  'message:new': (message: ChannelMessage) => void;
  'message:updated': (message: ChannelMessage) => void;
  'message:deleted': (messageId: string, channelId: string) => void;
  
  'channel:joined': (userId: string, channelId: string) => void;
  'channel:left': (userId: string, channelId: string) => void;
  'channel:updated': (channelId: string, updates: Record<string, unknown>) => void;
  
  'user:presence': (presence: UserPresence) => void;
  'user:typing': (typing: TypingIndicator) => void;
  
  'notification:new': (notification: Record<string, unknown>) => void;
  'error': (error: string) => void;
}

// Client-side events
export interface ClientToServerEvents {
  'message:send': (message: Omit<ChannelMessage, 'id' | 'timestamp'>) => void;
  'message:edit': (messageId: string, content: string) => void;
  'message:delete': (messageId: string, channelId: string) => void;
  
  'channel:join': (channelId: string) => void;
  'channel:leave': (channelId: string) => void;
  
  'user:status': (status: UserPresence['status']) => void;
  'user:typing:start': (channelId: string) => void;
  'user:typing:stop': (channelId: string) => void;
  
  'ping': () => void;
} 