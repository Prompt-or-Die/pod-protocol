import { Server as SocketServer } from 'socket.io';
import jwt from 'jsonwebtoken';

export const setupSocketHandlers = (io: SocketServer, logger: any) => {
  // Authentication middleware for socket connections
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      
      if (!token || !process.env.JWT_SECRET) {
        return next(new Error('Authentication error'));
      }
      
      const decoded = jwt.verify(token, process.env.JWT_SECRET) as any;
      socket.data.user = decoded;
      next();
    } catch (error) {
      next(new Error('Authentication error'));
    }
  });
  
  io.on('connection', (socket) => {
    const user = socket.data.user;
    logger.info('User connected to WebSocket:', { userId: user?.id });
    
    // Join user to their personal room
    socket.join(`user:${user?.id}`);
    
    // Handle joining channels
    socket.on('join_channel', (channelId: string) => {
      socket.join(`channel:${channelId}`);
      logger.info('User joined channel:', { userId: user?.id, channelId });
    });
    
    // Handle leaving channels
    socket.on('leave_channel', (channelId: string) => {
      socket.leave(`channel:${channelId}`);
      logger.info('User left channel:', { userId: user?.id, channelId });
    });
    
    // Handle real-time messages
    socket.on('send_message', (data) => {
      const { channelId, content, type = 'text' } = data;
      
      const message = {
        id: Date.now().toString(),
        channelId,
        content,
        type,
        sender: {
          id: user?.id,
          publicKey: user?.publicKey,
          name: 'User'
        },
        timestamp: new Date().toISOString(),
        status: 'sent'
      };
      
      // Broadcast to channel members
      socket.to(`channel:${channelId}`).emit('new_message', message);
      
      logger.info('Real-time message sent:', { 
        messageId: message.id, 
        channelId, 
        sender: user?.id 
      });
    });
    
    // Handle typing indicators
    socket.on('typing_start', (channelId: string) => {
      socket.to(`channel:${channelId}`).emit('user_typing', {
        userId: user?.id,
        channelId
      });
    });
    
    socket.on('typing_stop', (channelId: string) => {
      socket.to(`channel:${channelId}`).emit('user_stopped_typing', {
        userId: user?.id,
        channelId
      });
    });
    
    // Handle disconnection
    socket.on('disconnect', () => {
      logger.info('User disconnected from WebSocket:', { userId: user?.id });
    });
  });
}; 