import { Server as HTTPServer } from 'http';
import { Socket as NetSocket } from 'net';
import { NextApiResponse } from 'next';
import { Server as IOServer } from 'socket.io';
import {
  ChannelMessage,
  UserPresence
} from './websocket-types';

export interface SocketServer extends HTTPServer {
  io?: IOServer | undefined;
}

export interface SocketWithIO extends NetSocket {
  server: SocketServer;
}

export interface NextApiResponseWithSocket extends NextApiResponse {
  socket: SocketWithIO;
}

// Types are now imported from websocket-types.ts

// In-memory storage for demo (in production, use Redis or database)
export class MessageStore {
  private messages: Map<string, ChannelMessage[]> = new Map();
  private presence: Map<string, UserPresence> = new Map();
  private typing: Map<string, Set<string>> = new Map(); // channelId -> Set of userIds

  addMessage(message: ChannelMessage): void {
    const channelMessages = this.messages.get(message.channelId) || [];
    channelMessages.push(message);
    this.messages.set(message.channelId, channelMessages);
    
    // Keep only last 100 messages per channel
    if (channelMessages.length > 100) {
      channelMessages.splice(0, channelMessages.length - 100);
    }
  }

  getMessages(channelId: string, limit = 50): ChannelMessage[] {
    const messages = this.messages.get(channelId) || [];
    return messages.slice(-limit);
  }

  updateMessage(messageId: string, channelId: string, content: string): ChannelMessage | null {
    const messages = this.messages.get(channelId) || [];
    const messageIndex = messages.findIndex(m => m.id === messageId);
    
    if (messageIndex !== -1) {
      messages[messageIndex].content = content;
      messages[messageIndex].metadata = {
        ...messages[messageIndex].metadata,
        edited: true,
        editedAt: Date.now(),
      };
      return messages[messageIndex];
    }
    
    return null;
  }

  deleteMessage(messageId: string, channelId: string): boolean {
    const messages = this.messages.get(channelId) || [];
    const messageIndex = messages.findIndex(m => m.id === messageId);
    
    if (messageIndex !== -1) {
      messages.splice(messageIndex, 1);
      return true;
    }
    
    return false;
  }

  setUserPresence(presence: UserPresence): void {
    this.presence.set(presence.userId, presence);
  }

  getUserPresence(userId: string): UserPresence | null {
    return this.presence.get(userId) || null;
  }

  getAllPresence(): UserPresence[] {
    return Array.from(this.presence.values());
  }

  setTyping(channelId: string, userId: string, isTyping: boolean): void {
    if (!this.typing.has(channelId)) {
      this.typing.set(channelId, new Set());
    }
    
    const typingUsers = this.typing.get(channelId)!;
    
    if (isTyping) {
      typingUsers.add(userId);
    } else {
      typingUsers.delete(userId);
    }
  }

  getTypingUsers(channelId: string): string[] {
    const typingUsers = this.typing.get(channelId);
    return typingUsers ? Array.from(typingUsers) : [];
  }
}

export const messageStore = new MessageStore();

export function initializeWebSocketServer(
  res: NextApiResponseWithSocket,
  options: {
    cors?: {
      origin: string | string[];
      methods: string[];
    };
  } = {}
): IOServer {
  if (!res.socket.server.io) {
    console.log('Initializing Socket.IO server...');
    
    const io = new IOServer(res.socket.server, {
      path: '/api/socket',
      addTrailingSlash: false,
      cors: options.cors || {
        origin: process.env.NODE_ENV === 'production' 
          ? ['https://pod-protocol.com'] // Update with your domain
          : ['http://localhost:3000'],
        methods: ['GET', 'POST'],
      },
    });

    // Connection handling
    io.on('connection', (socket) => {
      console.log(`Client connected: ${socket.id}`);
      
      // User authentication (simplified - in production, verify JWT tokens)
      const userId = socket.handshake.auth.userId || socket.id;
      const username = socket.handshake.auth.username || `User_${socket.id.slice(0, 6)}`;
      
      // Set user presence
      messageStore.setUserPresence({
        userId,
        username,
        status: 'online',
        lastSeen: Date.now(),
      });

      // Broadcast user presence to all clients
      socket.broadcast.emit('user:presence', {
        userId,
        username,
        status: 'online',
        lastSeen: Date.now(),
      });

      // Message handling
      socket.on('message:send', (messageData) => {
        try {
          const message: ChannelMessage = {
            id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: Date.now(),
            senderId: userId,
            senderName: username,
            ...messageData,
          };

          messageStore.addMessage(message);
          
          // Broadcast to all users in the channel
          io.emit('message:new', message);
          
          console.log(`Message sent in channel ${message.channelId}: ${message.content}`);
        } catch (error) {
          console.error('Error handling message:send:', error);
          socket.emit('error', 'Failed to send message');
        }
      });

      socket.on('message:edit', (messageId, content) => {
        try {
          // In a real app, verify user owns the message
          const channels = Array.from(socket.rooms).filter(room => room !== socket.id);
          const channelId = channels[0]; // Simplified - get from message
          
          if (channelId) {
            const updatedMessage = messageStore.updateMessage(messageId, channelId, content);
            if (updatedMessage) {
              io.emit('message:updated', updatedMessage);
            }
          }
        } catch (error) {
          console.error('Error handling message:edit:', error);
          socket.emit('error', 'Failed to edit message');
        }
      });

      socket.on('message:delete', (messageId, channelId) => {
        try {
          // In a real app, verify user owns the message or has permissions
          const deleted = messageStore.deleteMessage(messageId, channelId);
          if (deleted) {
            io.emit('message:deleted', messageId, channelId);
          }
        } catch (error) {
          console.error('Error handling message:delete:', error);
          socket.emit('error', 'Failed to delete message');
        }
      });

      // Channel handling
      socket.on('channel:join', (channelId) => {
        try {
          socket.join(channelId);
          socket.broadcast.to(channelId).emit('channel:joined', userId, channelId);
          
          // Send recent messages to the user
          const recentMessages = messageStore.getMessages(channelId);
          recentMessages.forEach(message => {
            socket.emit('message:new', message);
          });
          
          console.log(`User ${username} joined channel ${channelId}`);
        } catch (error) {
          console.error('Error handling channel:join:', error);
          socket.emit('error', 'Failed to join channel');
        }
      });

      socket.on('channel:leave', (channelId) => {
        try {
          socket.leave(channelId);
          socket.broadcast.to(channelId).emit('channel:left', userId, channelId);
          
          // Stop typing indicator
          messageStore.setTyping(channelId, userId, false);
          
          console.log(`User ${username} left channel ${channelId}`);
        } catch (error) {
          console.error('Error handling channel:leave:', error);
          socket.emit('error', 'Failed to leave channel');
        }
      });

      // Typing indicators
      socket.on('user:typing:start', (channelId) => {
        try {
          messageStore.setTyping(channelId, userId, true);
          socket.broadcast.to(channelId).emit('user:typing', {
            userId,
            username,
            channelId,
            isTyping: true,
          });
        } catch (error) {
          console.error('Error handling user:typing:start:', error);
        }
      });

      socket.on('user:typing:stop', (channelId) => {
        try {
          messageStore.setTyping(channelId, userId, false);
          socket.broadcast.to(channelId).emit('user:typing', {
            userId,
            username,
            channelId,
            isTyping: false,
          });
        } catch (error) {
          console.error('Error handling user:typing:stop:', error);
        }
      });

      // User status updates
      socket.on('user:status', (status) => {
        try {
          const presence = messageStore.getUserPresence(userId);
          if (presence) {
            presence.status = status;
            presence.lastSeen = Date.now();
            messageStore.setUserPresence(presence);
            
            socket.broadcast.emit('user:presence', presence);
          }
        } catch (error) {
          console.error('Error handling user:status:', error);
        }
      });

      // Ping/pong for connection monitoring
      socket.on('ping', () => {
        socket.emit('pong');
      });

      // Disconnect handling
      socket.on('disconnect', (reason) => {
        console.log(`Client disconnected: ${socket.id}, reason: ${reason}`);
        
        // Update user presence
        const presence = messageStore.getUserPresence(userId);
        if (presence) {
          presence.status = 'offline';
          presence.lastSeen = Date.now();
          messageStore.setUserPresence(presence);
          
          socket.broadcast.emit('user:presence', presence);
        }

        // Clear typing indicators
        const channels = Array.from(socket.rooms);
        channels.forEach(channelId => {
          if (channelId !== socket.id) {
            messageStore.setTyping(channelId, userId, false);
            socket.broadcast.to(channelId).emit('user:typing', {
              userId,
              username,
              channelId,
              isTyping: false,
            });
          }
        });
      });
    });

    res.socket.server.io = io;
  }

  return res.socket.server.io;
}