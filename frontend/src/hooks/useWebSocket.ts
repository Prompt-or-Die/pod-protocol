'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { 
  ChannelMessage, 
  UserPresence, 
  TypingIndicator,
  ServerToClientEvents,
  ClientToServerEvents 
} from '../lib/websocket-types';
import toast from 'react-hot-toast';

export interface UseWebSocketOptions {
  userId?: string;
  username?: string;
  autoConnect?: boolean;
  reconnectAttempts?: number;
  reconnectDelay?: number;
}

export interface WebSocketState {
  connected: boolean;
  connecting: boolean;
  error: string | null;
  reconnectCount: number;
}

export interface UseWebSocketReturn {
  socket: Socket<ServerToClientEvents, ClientToServerEvents> | null;
  state: WebSocketState;
  
  // Connection methods
  connect: () => void;
  disconnect: () => void;
  
  // Message methods
  sendMessage: (channelId: string, content: string, type?: 'text' | 'image' | 'file') => void;
  editMessage: (messageId: string, content: string) => void;
  deleteMessage: (messageId: string, channelId: string) => void;
  
  // Channel methods
  joinChannel: (channelId: string) => void;
  leaveChannel: (channelId: string) => void;
  
  // User methods
  setUserStatus: (status: UserPresence['status']) => void;
  startTyping: (channelId: string) => void;
  stopTyping: (channelId: string) => void;
  
  // Event listeners
  onMessage: (callback: (message: ChannelMessage) => void) => () => void;
  onMessageUpdated: (callback: (message: ChannelMessage) => void) => () => void;
  onMessageDeleted: (callback: (messageId: string, channelId: string) => void) => () => void;
  onUserPresence: (callback: (presence: UserPresence) => void) => () => void;
  onUserTyping: (callback: (typing: TypingIndicator) => void) => () => void;
  onChannelJoined: (callback: (userId: string, channelId: string) => void) => () => void;
  onChannelLeft: (callback: (userId: string, channelId: string) => void) => () => void;
}

export function useWebSocket(options: UseWebSocketOptions = {}): UseWebSocketReturn {
  const {
    userId = 'anonymous',
    username = 'Anonymous User',
    autoConnect = true,
    reconnectAttempts = 5,
    reconnectDelay = 2000,
  } = options;

  const socketRef = useRef<Socket<ServerToClientEvents, ClientToServerEvents> | null>(null);
  const [state, setState] = useState<WebSocketState>({
    connected: false,
    connecting: false,
    error: null,
    reconnectCount: 0,
  });

  const typingTimeoutRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Connection methods
  const connect = useCallback(() => {
    if (socketRef.current?.connected) return;

    setState(prev => ({ ...prev, connecting: true, error: null }));

    try {
      const socket = io({
        path: '/api/socket',
        auth: {
          userId,
          username,
        },
        reconnection: true,
        reconnectionAttempts: reconnectAttempts,
        reconnectionDelay: reconnectDelay,
        timeout: 10000,
      });

      socketRef.current = socket;

      // Connection event handlers
      socket.on('connect', () => {
        console.log('WebSocket connected');
        setState(prev => ({
          ...prev,
          connected: true,
          connecting: false,
          error: null,
          reconnectCount: 0,
        }));
        toast.success('Connected to real-time messaging');
      });

      socket.on('disconnect', (reason) => {
        console.log('WebSocket disconnected:', reason);
        setState(prev => ({
          ...prev,
          connected: false,
          connecting: false,
        }));
        
        if (reason === 'io server disconnect') {
          // Server disconnected, manual reconnection needed
          toast.error('Connection lost. Please refresh the page.');
        }
      });

      socket.on('connect_error', (error) => {
        console.error('WebSocket connection error:', error);
        setState(prev => ({
          ...prev,
          connected: false,
          connecting: false,
          error: error.message,
        }));
        toast.error('Failed to connect to real-time messaging');
      });

      socket.on('reconnect', (attemptNumber) => {
        console.log(`WebSocket reconnected after ${attemptNumber} attempts`);
        setState(prev => ({
          ...prev,
          connected: true,
          connecting: false,
          error: null,
          reconnectCount: attemptNumber,
        }));
        toast.success('Reconnected to real-time messaging');
      });

      socket.on('reconnect_attempt', (attemptNumber) => {
        console.log(`WebSocket reconnection attempt ${attemptNumber}`);
        setState(prev => ({
          ...prev,
          connecting: true,
          reconnectCount: attemptNumber,
        }));
      });

      socket.on('reconnect_error', (error) => {
        console.error('WebSocket reconnection error:', error);
      });

      socket.on('reconnect_failed', () => {
        console.error('WebSocket reconnection failed');
        setState(prev => ({
          ...prev,
          connecting: false,
          error: 'Reconnection failed',
        }));
        toast.error('Unable to reconnect. Please refresh the page.');
      });

      // Error handling
      socket.on('error', (error) => {
        console.error('WebSocket error:', error);
        toast.error(error);
      });

    } catch (error) {
      console.error('Failed to initialize WebSocket:', error);
      setState(prev => ({
        ...prev,
        connecting: false,
        error: error instanceof Error ? error.message : 'Connection failed',
      }));
    }
  }, [userId, username, reconnectAttempts, reconnectDelay]);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    setState(prev => ({ ...prev, connected: false, connecting: false }));
  }, []);

  // Message methods
  const sendMessage = useCallback((channelId: string, content: string, type: 'text' | 'image' | 'file' = 'text') => {
    if (!socketRef.current) return;

    socketRef.current.emit('message:send', {
      channelId,
      content,
      type,
      senderId: userId,
      senderName: username,
    });
  }, [userId, username]);

  const editMessage = useCallback((messageId: string, content: string) => {
    if (!socketRef.current) return;
    socketRef.current.emit('message:edit', messageId, content);
  }, []);

  const deleteMessage = useCallback((messageId: string, channelId: string) => {
    if (!socketRef.current) return;
    socketRef.current.emit('message:delete', messageId, channelId);
  }, []);

  // Channel methods
  const joinChannel = useCallback((channelId: string) => {
    if (!socketRef.current) return;
    socketRef.current.emit('channel:join', channelId);
  }, []);

  const leaveChannel = useCallback((channelId: string) => {
    if (!socketRef.current) return;
    socketRef.current.emit('channel:leave', channelId);
  }, []);

  // User methods
  const setUserStatus = useCallback((status: UserPresence['status']) => {
    if (!socketRef.current) return;
    socketRef.current.emit('user:status', status);
  }, []);

  const startTyping = useCallback((channelId: string) => {
    if (!socketRef.current) return;
    
    socketRef.current.emit('user:typing:start', channelId);
    
    // Auto-stop typing after 3 seconds
    const existingTimeout = typingTimeoutRef.current.get(channelId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }
    
    const timeout = setTimeout(() => {
      stopTyping(channelId);
    }, 3000);
    
    typingTimeoutRef.current.set(channelId, timeout);
  }, []);

  const stopTyping = useCallback((channelId: string) => {
    if (!socketRef.current) return;
    
    socketRef.current.emit('user:typing:stop', channelId);
    
    const timeout = typingTimeoutRef.current.get(channelId);
    if (timeout) {
      clearTimeout(timeout);
      typingTimeoutRef.current.delete(channelId);
    }
  }, []);

  // Event listener methods
  const onMessage = useCallback((callback: (message: ChannelMessage) => void) => {
    if (!socketRef.current) return () => {};
    
    socketRef.current.on('message:new', callback);
    return () => socketRef.current?.off('message:new', callback);
  }, []);

  const onMessageUpdated = useCallback((callback: (message: ChannelMessage) => void) => {
    if (!socketRef.current) return () => {};
    
    socketRef.current.on('message:updated', callback);
    return () => socketRef.current?.off('message:updated', callback);
  }, []);

  const onMessageDeleted = useCallback((callback: (messageId: string, channelId: string) => void) => {
    if (!socketRef.current) return () => {};
    
    socketRef.current.on('message:deleted', callback);
    return () => socketRef.current?.off('message:deleted', callback);
  }, []);

  const onUserPresence = useCallback((callback: (presence: UserPresence) => void) => {
    if (!socketRef.current) return () => {};
    
    socketRef.current.on('user:presence', callback);
    return () => socketRef.current?.off('user:presence', callback);
  }, []);

  const onUserTyping = useCallback((callback: (typing: TypingIndicator) => void) => {
    if (!socketRef.current) return () => {};
    
    socketRef.current.on('user:typing', callback);
    return () => socketRef.current?.off('user:typing', callback);
  }, []);

  const onChannelJoined = useCallback((callback: (userId: string, channelId: string) => void) => {
    if (!socketRef.current) return () => {};
    
    socketRef.current.on('channel:joined', callback);
    return () => socketRef.current?.off('channel:joined', callback);
  }, []);

  const onChannelLeft = useCallback((callback: (userId: string, channelId: string) => void) => {
    if (!socketRef.current) return () => {};
    
    socketRef.current.on('channel:left', callback);
    return () => socketRef.current?.off('channel:left', callback);
  }, []);

  // Auto-connect on mount
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      // Cleanup typing timeouts
      typingTimeoutRef.current.forEach(timeout => clearTimeout(timeout));
      typingTimeoutRef.current.clear();
      
      // Disconnect on unmount
      disconnect();
    };
  }, [autoConnect, connect, disconnect]);

  return {
    socket: socketRef.current,
    state,
    connect,
    disconnect,
    sendMessage,
    editMessage,
    deleteMessage,
    joinChannel,
    leaveChannel,
    setUserStatus,
    startTyping,
    stopTyping,
    onMessage,
    onMessageUpdated,
    onMessageDeleted,
    onUserPresence,
    onUserTyping,
    onChannelJoined,
    onChannelLeft,
  };
}