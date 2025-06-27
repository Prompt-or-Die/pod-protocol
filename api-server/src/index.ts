import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import { logger } from './lib/logger.js';

// Import route handlers
import agentRoutes from './routes/agents.js';
import channelRoutes from './routes/channels.js';
import messageRoutes from './routes/messages.js';
import analyticsRoutes from './routes/analytics.js';
import authRoutes from './routes/auth.js';
import protocolRoutes from './routes/protocol.js';

// Import middleware
import { errorHandler } from './middleware/error.js';

// Import socket handlers
import { setupSocketHandlers } from './sockets/index.js';

// Database imports
import { testDatabaseConnection, disconnectDatabase } from './lib/database.js';

dotenv.config();

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' 
      ? process.env.FRONTEND_URL 
      : ['http://localhost:3000'],
    methods: ['GET', 'POST']
  }
});

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later'
});

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.FRONTEND_URL 
    : ['http://localhost:3000'],
  credentials: true
}));
app.use(compression() as any); // Type assertion for Express v5 compatibility
app.use(morgan('combined', { stream: { write: msg => logger.info(msg.trim()) } }));
app.use(limiter);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', async (req, res) => {
  const dbConnected = await testDatabaseConnection();
  
  res.json({
    status: dbConnected ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    database: dbConnected ? 'connected' : 'disconnected',
    uptime: process.uptime()
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/agents', agentRoutes);
app.use('/api/channels', channelRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/protocol', protocolRoutes);

// WebSocket setup
setupSocketHandlers(io, logger);

// Error handling
app.use(errorHandler);

// 404 handler - Express v5 compatible
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

const PORT = process.env.PORT || 4000;

// Database connection and server startup
async function startServer() {
  try {
    // Test database connection
    const dbConnected = await testDatabaseConnection();
    if (!dbConnected) {
      logger.error('Failed to connect to database. Server starting without database.');
    }
    
    server.listen(PORT, () => {
      logger.info(`🚀 PoD Protocol API Server running on port ${PORT}`);
      logger.info(`📊 Health check available at http://localhost:${PORT}/health`);
      logger.info(`🔗 Database: ${dbConnected ? 'Connected' : 'Disconnected'}`);
      
      if (process.env.NODE_ENV === 'development') {
        logger.info(`🔧 Development mode - API docs at http://localhost:${PORT}/api`);
      }
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  
  server.close(async () => {
    await disconnectDatabase();
    logger.info('Server shut down complete');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  
  server.close(async () => {
    await disconnectDatabase();
    logger.info('Server shut down complete');
    process.exit(0);
  });
});

// Start the server
startServer();

export { app, io }; 