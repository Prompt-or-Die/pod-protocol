# API Server Dockerfile
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
    adduser -S apiserver -u 1001 -G nodejs

WORKDIR /app

# Copy built application and dependencies
COPY --from=development --chown=apiserver:nodejs /app/dist ./dist
COPY --from=development --chown=apiserver:nodejs /app/node_modules ./node_modules
COPY --from=development --chown=apiserver:nodejs /app/package*.json ./
COPY --from=development --chown=apiserver:nodejs /app/prisma ./prisma

# Create logs directory
RUN mkdir -p /app/logs && chown apiserver:nodejs /app/logs

# Switch to non-root user
USER apiserver

# Expose port
EXPOSE 4000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:4000/health || exit 1

# Generate Prisma client and start server
CMD ["sh", "-c", "npx prisma generate && npx prisma migrate deploy && node dist/index.js"]