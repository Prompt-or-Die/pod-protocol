/**
 * Logger utility for PoD Protocol MCP Server
 */

import winston from 'winston';
import chalk from 'chalk';

const { combine, timestamp, errors, printf, colorize, json } = winston.format;

/**
 * Custom format for console output with colors and emoji
 */
const consoleFormat = printf(({ level, message, timestamp, ...metadata }) => {
  const emoji = getEmojiForLevel(level);
  const coloredLevel = getColorForLevel(level);
  const time = chalk.gray(new Date(timestamp as string).toLocaleTimeString());
  
  let logMessage = `${emoji} ${time} ${coloredLevel} ${message}`;
  
  // Add metadata if present
  if (Object.keys(metadata).length > 0) {
    logMessage += '\n' + chalk.gray(JSON.stringify(metadata, null, 2));
  }
  
  return logMessage;
});

/**
 * Get emoji for log level
 */
function getEmojiForLevel(level: string): string {
  switch (level) {
    case 'error': return '❌';
    case 'warn': return '⚠️';
    case 'info': return '📊';
    case 'debug': return '🔍';
    default: return '📝';
  }
}

/**
 * Get color for log level
 */
function getColorForLevel(level: string): string {
  switch (level) {
    case 'error': return chalk.red.bold(level.toUpperCase());
    case 'warn': return chalk.yellow.bold(level.toUpperCase());
    case 'info': return chalk.blue.bold(level.toUpperCase());
    case 'debug': return chalk.green.bold(level.toUpperCase());
    default: return chalk.white.bold(level.toUpperCase());
  }
}

/**
 * Create logger instance
 */
export function createLogger(options: {
  level?: string;
  filePath?: string;
  consoleOutput?: boolean;
} = {}): winston.Logger {
  const {
    level = 'info',
    filePath,
    consoleOutput = true
  } = options;

  const transports: winston.transport[] = [];

  // Console transport
  if (consoleOutput) {
    transports.push(
      new winston.transports.Console({
        format: combine(
          errors({ stack: true }),
          timestamp(),
          consoleFormat
        )
      })
    );
  }

  // File transport
  if (filePath) {
    transports.push(
      new winston.transports.File({
        filename: filePath,
        format: combine(
          errors({ stack: true }),
          timestamp(),
          json()
        )
      })
    );
  }

  return winston.createLogger({
    level,
    transports,
    exitOnError: false
  });
}

/**
 * Create a logger with PoD Protocol branding
 */
export function createPodLogger(): winston.Logger {
  const logger = createLogger();
  
  // Add PoD Protocol banner
  logger.info(chalk.hex('#8b5cf6').bold('🔥 PoD Protocol MCP Server'));
  logger.info(chalk.hex('#06d6a0')('⚡ Bridging AI Agents with Blockchain Communication'));
  logger.info(chalk.gray('─'.repeat(60)));
  
  return logger;
} 