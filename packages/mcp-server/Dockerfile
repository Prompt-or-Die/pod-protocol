# MCP Server Dockerfile
FROM node:20-alpine AS base

# Install system dependencies
RUN apk add --no-cache \
    git \
    python3 \
    make \
    g++ \
    curl \
    && rm -rf /var/cache/apk/*

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Development stage
FROM base AS development
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM node:20-alpine AS production

# Install curl for health checks
RUN apk add --no-cache curl

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S mcpserver -u 1001 -G nodejs

WORKDIR /app

# Copy built application and dependencies
COPY --from=development --chown=mcpserver:nodejs /app/dist ./dist
COPY --from=development --chown=mcpserver:nodejs /app/node_modules ./node_modules
COPY --from=development --chown=mcpserver:nodejs /app/package*.json ./
COPY --from=development --chown=mcpserver:nodejs /app/config ./config
COPY --from=development --chown=mcpserver:nodejs /app/mcp.json ./

# Create logs directory
RUN mkdir -p /app/logs && chown mcpserver:nodejs /app/logs

# Switch to non-root user
USER mcpserver

# Expose ports
EXPOSE 8080 8081

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1

# Start MCP server
CMD ["node", "dist/index.js"]