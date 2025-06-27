import { PrismaClient } from '@prisma/client';
import { logger } from './logger.js';

// Global instance to prevent multiple connections
declare global {
  var __prisma: PrismaClient | undefined;
}

// Create Prisma client instance
const createPrismaClient = () => {
  return new PrismaClient({
    log: [
      { level: 'error', emit: 'event' },
      { level: 'warn', emit: 'event' },
      { level: 'info', emit: 'event' },
    ],
  });
};

// Use global instance in development to prevent hot reloading issues
const prisma = globalThis.__prisma || createPrismaClient();

if (process.env.NODE_ENV === 'development') {
  globalThis.__prisma = prisma;
}

// Set up logging (commented out until proper database setup)
/*
prisma.$on('error', (e: any) => {
  logger.error('Database error:', e);
});

prisma.$on('warn', (e: any) => {
  logger.warn('Database warning:', e);
});

prisma.$on('info', (e: any) => {
  logger.info('Database info:', e);
});
*/

// Test database connection
export const testDatabaseConnection = async (): Promise<boolean> => {
  try {
    await prisma.$connect();
    logger.info('✅ Database connected successfully');
    return true;
  } catch (error) {
    logger.error('❌ Database connection failed:', error);
    return false;
  }
};

// Graceful shutdown
export const disconnectDatabase = async (): Promise<void> => {
  try {
    await prisma.$disconnect();
    logger.info('📡 Database disconnected');
  } catch (error) {
    logger.error('Error disconnecting from database:', error);
  }
};

export { prisma };
export default prisma; 