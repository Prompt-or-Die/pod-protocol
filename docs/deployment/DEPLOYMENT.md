# 🚀 PoD Protocol - Production Deployment Guide

> **Complete guide for deploying PoD Protocol to production environments**

---

## 🎯 Deployment Overview

PoD Protocol supports multiple deployment scenarios, from single-server setups to enterprise-scale distributed deployments.

<div align="center">

| Deployment Type | Use Case | Complexity | Scalability |
|-----------------|----------|------------|-------------|
| **Single Server** | Development, small teams | Low | Limited |
| **Container Deployment** | CI/CD, cloud native | Medium | High |
| **Kubernetes Cluster** | Enterprise, high availability | High | Very High |
| **Serverless** | Event-driven, cost-optimized | Medium | Auto-scaling |

</div>

---

## 🏗️ Architecture Overview

```mermaid
graph TB
    subgraph "Load Balancer Layer"
        LB[Load Balancer]
    end
    
    subgraph "Application Layer"
        LB --> API1[API Server 1]
        LB --> API2[API Server 2]
        LB --> API3[API Server 3]
    end
    
    subgraph "Service Layer"
        API1 --> WS[WebSocket Service]
        API2 --> ANALYTICS[Analytics Service]
        API3 --> IPFS[IPFS Gateway]
    end
    
    subgraph "Data Layer"
        WS --> SOLANA[Solana RPC]
        ANALYTICS --> DB[(PostgreSQL)]
        IPFS --> STORAGE[(File Storage)]
    end
    
    subgraph "Monitoring"
        METRICS[Metrics]
        LOGS[Logs]
        ALERTS[Alerts]
    end
```

---

## 🐳 Container Deployment

### Docker Configuration

#### Dockerfile

```dockerfile
# Multi-stage build for optimization
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
COPY bun.lock ./
RUN npm install -g bun
RUN bun install

COPY . .
RUN bun run build:all

# Production image
FROM node:20-alpine AS production

WORKDIR /app

# Install production dependencies only
COPY package*.json ./
COPY bun.lock ./
RUN npm install -g bun
RUN bun install --production

# Copy built application
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S podprotocol -u 1001
USER podprotocol

EXPOSE 3000
CMD ["bun", "start"]
```

#### Docker Compose

```yaml
version: '3.8'

services:
  pod-protocol-api:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - SOLANA_RPC_URL=${SOLANA_RPC_URL}
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
    depends_on:
      - postgres
      - redis
    volumes:
      - ./logs:/app/logs
    restart: unless-stopped
    
  postgres:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=pod_protocol
      - POSTGRES_USER=${DB_USER}
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backups:/backups
    restart: unless-stopped
    
  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
    restart: unless-stopped
    
  ipfs:
    image: ipfs/go-ipfs:latest
    ports:
      - "4001:4001"
      - "5001:5001"
    volumes:
      - ipfs_data:/data/ipfs
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
  ipfs_data:
```

### Build and Deploy

```bash
# Build images
docker-compose build

# Start services
docker-compose up -d

# View logs
docker-compose logs -f pod-protocol-api

# Scale API servers
docker-compose up -d --scale pod-protocol-api=3

# Health check
curl http://localhost:3000/health
```

---

## ☸️ Kubernetes Deployment

### Namespace and ConfigMap

```yaml
# namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: pod-protocol

---
# configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: pod-protocol-config
  namespace: pod-protocol
data:
  NODE_ENV: "production"
  LOG_LEVEL: "info"
  SOLANA_CLUSTER: "mainnet"
  API_PORT: "3000"
  WS_PORT: "3001"
```

### Application Deployment

```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: pod-protocol-api
  namespace: pod-protocol
spec:
  replicas: 3
  selector:
    matchLabels:
      app: pod-protocol-api
  template:
    metadata:
      labels:
        app: pod-protocol-api
    spec:
      containers:
      - name: api
        image: pod-protocol/api:latest
        ports:
        - containerPort: 3000
        - containerPort: 3001
        env:
        - name: NODE_ENV
          valueFrom:
            configMapKeyRef:
              name: pod-protocol-config
              key: NODE_ENV
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: pod-protocol-secrets
              key: DATABASE_URL
        - name: SOLANA_RPC_URL
          valueFrom:
            secretKeyRef:
              name: pod-protocol-secrets
              key: SOLANA_RPC_URL
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5

---
# service.yaml
apiVersion: v1
kind: Service
metadata:
  name: pod-protocol-api-service
  namespace: pod-protocol
spec:
  selector:
    app: pod-protocol-api
  ports:
  - name: http
    port: 80
    targetPort: 3000
  - name: websocket
    port: 3001
    targetPort: 3001
  type: ClusterIP

---
# ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: pod-protocol-ingress
  namespace: pod-protocol
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
spec:
  tls:
  - hosts:
    - api.podprotocol.com
    secretName: pod-protocol-tls
  rules:
  - host: api.podprotocol.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: pod-protocol-api-service
            port:
              number: 80
```

### Database Deployment

```yaml
# postgres.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
  namespace: pod-protocol
spec:
  serviceName: postgres
  replicas: 1
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
      - name: postgres
        image: postgres:15-alpine
        env:
        - name: POSTGRES_DB
          value: pod_protocol
        - name: POSTGRES_USER
          valueFrom:
            secretKeyRef:
              name: postgres-secret
              key: username
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: postgres-secret
              key: password
        volumeMounts:
        - name: postgres-storage
          mountPath: /var/lib/postgresql/data
        resources:
          requests:
            memory: "1Gi"
            cpu: "500m"
          limits:
            memory: "2Gi"
            cpu: "1000m"
  volumeClaimTemplates:
  - metadata:
      name: postgres-storage
    spec:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 20Gi
```

### Secrets Management

```yaml
# secrets.yaml
apiVersion: v1
kind: Secret
metadata:
  name: pod-protocol-secrets
  namespace: pod-protocol
type: Opaque
data:
  DATABASE_URL: <base64-encoded-database-url>
  SOLANA_RPC_URL: <base64-encoded-rpc-url>
  JWT_SECRET: <base64-encoded-jwt-secret>
  ENCRYPTION_KEY: <base64-encoded-encryption-key>
```

### Deployment Commands

```bash
# Apply all configurations
kubectl apply -f k8s/

# Check deployment status
kubectl get pods -n pod-protocol

# View logs
kubectl logs -f deployment/pod-protocol-api -n pod-protocol

# Scale deployment
kubectl scale deployment pod-protocol-api --replicas=5 -n pod-protocol

# Update deployment
kubectl set image deployment/pod-protocol-api api=pod-protocol/api:v1.2.0 -n pod-protocol
```

---

## ☁️ Cloud Provider Deployments

### AWS Deployment

#### ECS Fargate

```json
{
  "family": "pod-protocol-api",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "1024",
  "memory": "2048",
  "executionRoleArn": "arn:aws:iam::account:role/ecsTaskExecutionRole",
  "taskRoleArn": "arn:aws:iam::account:role/ecsTaskRole",
  "containerDefinitions": [
    {
      "name": "pod-protocol-api",
      "image": "your-account.dkr.ecr.region.amazonaws.com/pod-protocol:latest",
      "portMappings": [
        {
          "containerPort": 3000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        }
      ],
      "secrets": [
        {
          "name": "DATABASE_URL",
          "valueFrom": "arn:aws:secretsmanager:region:account:secret:pod-protocol/database-url"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/pod-protocol",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
```

#### Terraform Configuration

```hcl
# main.tf
provider "aws" {
  region = var.aws_region
}

# VPC and Networking
resource "aws_vpc" "pod_protocol_vpc" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name = "pod-protocol-vpc"
  }
}

# ECS Cluster
resource "aws_ecs_cluster" "pod_protocol_cluster" {
  name = "pod-protocol"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }
}

# Application Load Balancer
resource "aws_lb" "pod_protocol_alb" {
  name               = "pod-protocol-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb_sg.id]
  subnets           = aws_subnet.public[*].id

  enable_deletion_protection = false
}

# RDS Instance
resource "aws_db_instance" "pod_protocol_db" {
  identifier = "pod-protocol-db"
  
  engine         = "postgres"
  engine_version = "15.4"
  instance_class = "db.t3.micro"
  
  allocated_storage     = 20
  max_allocated_storage = 100
  storage_encrypted     = true
  
  db_name  = "pod_protocol"
  username = var.db_username
  password = var.db_password
  
  vpc_security_group_ids = [aws_security_group.rds_sg.id]
  db_subnet_group_name   = aws_db_subnet_group.default.name
  
  backup_retention_period = 7
  backup_window          = "07:00-09:00"
  maintenance_window     = "sun:09:00-sun:10:00"
  
  skip_final_snapshot = true
}

# ElastiCache Redis
resource "aws_elasticache_subnet_group" "default" {
  name       = "pod-protocol-cache-subnet"
  subnet_ids = aws_subnet.private[*].id
}

resource "aws_elasticache_cluster" "pod_protocol_redis" {
  cluster_id           = "pod-protocol-redis"
  engine               = "redis"
  node_type            = "cache.t3.micro"
  num_cache_nodes      = 1
  parameter_group_name = "default.redis7"
  port                 = 6379
  subnet_group_name    = aws_elasticache_subnet_group.default.name
  security_group_ids   = [aws_security_group.redis_sg.id]
}
```

### Google Cloud Deployment

#### Cloud Run

```yaml
# cloudrun.yaml
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: pod-protocol-api
  annotations:
    run.googleapis.com/ingress: all
spec:
  template:
    metadata:
      annotations:
        autoscaling.knative.dev/maxScale: "100"
        run.googleapis.com/cpu-throttling: "false"
        run.googleapis.com/execution-environment: gen2
    spec:
      containerConcurrency: 1000
      timeoutSeconds: 300
      containers:
      - image: gcr.io/project-id/pod-protocol-api:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: production
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: pod-protocol-secrets
              key: DATABASE_URL
        resources:
          limits:
            cpu: "2"
            memory: "4Gi"
          requests:
            cpu: "1"
            memory: "2Gi"
```

---

## 🔧 Environment Configuration

### Production Environment Variables

```bash
# Core Configuration
NODE_ENV=production
PORT=3000
HOST=0.0.0.0

# Solana Configuration
SOLANA_CLUSTER=mainnet-beta
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
SOLANA_WS_URL=wss://api.mainnet-beta.solana.com
PROGRAM_ID=HEpGLgYsE1kP8aoYKyLFc3JVVrofS7T4zEA6fWBJsZps

# Database Configuration
DATABASE_URL=postgresql://user:password@host:5432/pod_protocol
DATABASE_POOL_SIZE=20
DATABASE_TIMEOUT=30000

# Redis Configuration
REDIS_URL=redis://localhost:6379
REDIS_PREFIX=pod_protocol:
REDIS_TTL=3600

# Security
JWT_SECRET=your-super-secret-jwt-key
ENCRYPTION_KEY=your-32-character-encryption-key
CORS_ORIGIN=https://podprotocol.com
RATE_LIMIT_MAX=1000
RATE_LIMIT_WINDOW=900000

# Monitoring
LOG_LEVEL=info
METRICS_ENABLED=true
HEALTH_CHECK_PORT=8080

# IPFS Configuration
IPFS_API_URL=http://localhost:5001
IPFS_GATEWAY_URL=https://ipfs.podprotocol.com

# External Services
ANALYTICS_API_KEY=your-analytics-api-key
NOTIFICATION_SERVICE_URL=https://notifications.podprotocol.com
```

### Configuration Validation

```typescript
// config/validation.ts
import Joi from 'joi';

const configSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'test', 'production').required(),
  PORT: Joi.number().port().default(3000),
  
  SOLANA_CLUSTER: Joi.string().valid('mainnet-beta', 'testnet', 'devnet').required(),
  SOLANA_RPC_URL: Joi.string().uri().required(),
  PROGRAM_ID: Joi.string().length(44).required(),
  
  DATABASE_URL: Joi.string().uri().required(),
  DATABASE_POOL_SIZE: Joi.number().min(1).max(100).default(20),
  
  JWT_SECRET: Joi.string().min(32).required(),
  ENCRYPTION_KEY: Joi.string().length(32).required(),
}).unknown();

export function validateConfig(config: any) {
  const { error, value } = configSchema.validate(config);
  if (error) {
    throw new Error(`Config validation error: ${error.message}`);
  }
  return value;
}
```

---

## 📊 Monitoring and Observability

### Health Checks

```typescript
// health/health-check.ts
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';

interface HealthStatus {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  services: {
    database: 'up' | 'down';
    redis: 'up' | 'down';
    solana: 'up' | 'down';
    ipfs: 'up' | 'down';
  };
  version: string;
  uptime: number;
}

export async function healthCheck(req: Request, res: Response) {
  const startTime = Date.now();
  const health: HealthStatus = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      database: 'down',
      redis: 'down',
      solana: 'down',
      ipfs: 'down'
    },
    version: process.env.npm_package_version || '1.0.0',
    uptime: process.uptime()
  };

  try {
    // Check database
    await prisma.$queryRaw`SELECT 1`;
    health.services.database = 'up';
  } catch (error) {
    health.status = 'unhealthy';
  }

  try {
    // Check Redis
    await redis.ping();
    health.services.redis = 'up';
  } catch (error) {
    health.status = 'unhealthy';
  }

  try {
    // Check Solana RPC
    await solanaConnection.getSlot();
    health.services.solana = 'up';
  } catch (error) {
    health.status = 'unhealthy';
  }

  const statusCode = health.status === 'healthy' ? 200 : 503;
  res.status(statusCode).json(health);
}
```

### Metrics Collection

```typescript
// monitoring/metrics.ts
import { createPrometheusMetrics } from 'prom-client';

// Custom metrics
export const metrics = {
  httpRequestDuration: new Histogram({
    name: 'http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['method', 'route', 'status_code']
  }),

  messagesSent: new Counter({
    name: 'pod_protocol_messages_sent_total',
    help: 'Total number of messages sent',
    labelNames: ['message_type', 'success']
  }),

  agentsRegistered: new Gauge({
    name: 'pod_protocol_agents_registered',
    help: 'Number of registered agents'
  }),

  channelsActive: new Gauge({
    name: 'pod_protocol_channels_active',
    help: 'Number of active channels'
  }),

  solanaTransactions: new Counter({
    name: 'pod_protocol_solana_transactions_total',
    help: 'Total Solana transactions',
    labelNames: ['type', 'status']
  })
};

// Middleware to collect HTTP metrics
export function metricsMiddleware(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    metrics.httpRequestDuration
      .labels(req.method, req.route?.path || req.path, res.statusCode.toString())
      .observe(duration);
  });
  
  next();
}
```

### Logging Configuration

```typescript
// logging/logger.ts
import winston from 'winston';
import { ElasticsearchTransport } from 'winston-elasticsearch';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { 
    service: 'pod-protocol-api',
    version: process.env.npm_package_version 
  },
  transports: [
    new winston.transports.File({ 
      filename: 'logs/error.log', 
      level: 'error' 
    }),
    new winston.transports.File({ 
      filename: 'logs/combined.log' 
    }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// Add Elasticsearch transport in production
if (process.env.NODE_ENV === 'production') {
  logger.add(new ElasticsearchTransport({
    level: 'info',
    clientOpts: {
      node: process.env.ELASTICSEARCH_URL
    },
    index: 'pod-protocol-logs'
  }));
}

export { logger };
```

---

## 🔒 Security Configuration

### SSL/TLS Configuration

```nginx
# nginx.conf
server {
    listen 443 ssl http2;
    server_name api.podprotocol.com;

    ssl_certificate /etc/ssl/certs/podprotocol.com.crt;
    ssl_certificate_key /etc/ssl/private/podprotocol.com.key;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    ssl_prefer_server_ciphers off;
    
    # Security headers
    add_header Strict-Transport-Security "max-age=63072000" always;
    add_header X-Content-Type-Options nosniff;
    add_header X-Frame-Options DENY;
    add_header X-XSS-Protection "1; mode=block";
    
    location / {
        proxy_pass http://pod-protocol-backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    location /ws {
        proxy_pass http://pod-protocol-backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
```

### Firewall Rules

```bash
# UFW Configuration
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Allow SSH
sudo ufw allow ssh

# Allow HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Allow specific application ports
sudo ufw allow 3000/tcp  # API server
sudo ufw allow 3001/tcp  # WebSocket server

# Database (only from application servers)
sudo ufw allow from 10.0.1.0/24 to any port 5432

# Enable firewall
sudo ufw enable
```

---

## 📈 Performance Optimization

### Database Optimization

```sql
-- Database indexes for performance
CREATE INDEX CONCURRENTLY idx_agents_owner ON agents(owner);
CREATE INDEX CONCURRENTLY idx_agents_capabilities ON agents(capabilities);
CREATE INDEX CONCURRENTLY idx_messages_sender ON messages(sender);
CREATE INDEX CONCURRENTLY idx_messages_recipient ON messages(recipient);
CREATE INDEX CONCURRENTLY idx_messages_created_at ON messages(created_at);
CREATE INDEX CONCURRENTLY idx_channels_visibility ON channels(visibility);

-- Analyze query performance
EXPLAIN ANALYZE SELECT * FROM messages 
WHERE recipient = $1 
ORDER BY created_at DESC 
LIMIT 50;
```

### Redis Caching Strategy

```typescript
// caching/redis-cache.ts
class RedisCache {
  private redis: Redis;
  
  constructor() {
    this.redis = new Redis(process.env.REDIS_URL);
  }
  
  async cacheAgent(agentId: string, agent: Agent, ttl = 3600) {
    await this.redis.setex(
      `agent:${agentId}`, 
      ttl, 
      JSON.stringify(agent)
    );
  }
  
  async getAgent(agentId: string): Promise<Agent | null> {
    const cached = await this.redis.get(`agent:${agentId}`);
    return cached ? JSON.parse(cached) : null;
  }
  
  async cacheChannelMembers(channelId: string, members: string[]) {
    await this.redis.sadd(`channel:${channelId}:members`, ...members);
    await this.redis.expire(`channel:${channelId}:members`, 1800);
  }
  
  async invalidateUserCache(userId: string) {
    const keys = await this.redis.keys(`*:${userId}:*`);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }
}
```

### Load Balancing

```yaml
# docker-compose.lb.yml
version: '3.8'

services:
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/ssl
    depends_on:
      - api-1
      - api-2
      - api-3
    restart: unless-stopped

  api-1:
    build: .
    environment:
      - INSTANCE_ID=api-1
    volumes:
      - ./logs:/app/logs

  api-2:
    build: .
    environment:
      - INSTANCE_ID=api-2
    volumes:
      - ./logs:/app/logs

  api-3:
    build: .
    environment:
      - INSTANCE_ID=api-3
    volumes:
      - ./logs:/app/logs
```

---

## 🚨 Disaster Recovery

### Backup Strategy

```bash
#!/bin/bash
# backup.sh - Automated backup script

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups"

# Database backup
pg_dump $DATABASE_URL > $BACKUP_DIR/db_backup_$DATE.sql
gzip $BACKUP_DIR/db_backup_$DATE.sql

# Redis backup
redis-cli --rdb $BACKUP_DIR/redis_backup_$DATE.rdb

# Application files backup
tar -czf $BACKUP_DIR/app_backup_$DATE.tar.gz /app/uploads /app/logs

# Upload to S3
aws s3 cp $BACKUP_DIR/ s3://pod-protocol-backups/ --recursive --exclude "*" --include "*$DATE*"

# Cleanup old backups (keep 30 days)
find $BACKUP_DIR -name "*.sql.gz" -mtime +30 -delete
find $BACKUP_DIR -name "*.rdb" -mtime +30 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +30 -delete
```

### Recovery Procedures

```bash
#!/bin/bash
# restore.sh - Recovery script

BACKUP_DATE=$1
BACKUP_DIR="/backups"

if [ -z "$BACKUP_DATE" ]; then
  echo "Usage: $0 YYYYMMDD_HHMMSS"
  exit 1
fi

# Stop services
docker-compose down

# Restore database
gunzip -c $BACKUP_DIR/db_backup_$BACKUP_DATE.sql.gz | psql $DATABASE_URL

# Restore Redis
redis-cli --rdb $BACKUP_DIR/redis_backup_$BACKUP_DATE.rdb

# Restore application files
tar -xzf $BACKUP_DIR/app_backup_$BACKUP_DATE.tar.gz -C /

# Restart services
docker-compose up -d

echo "Recovery completed for backup: $BACKUP_DATE"
```

---

<div align="center">

## 🎯 **Production Ready**

**Your PoD Protocol deployment is now optimized for production use with high availability, security, and scalability.**

---

**🚀 Need Help with Deployment?**

[📚 Documentation](DOCUMENTATION.md) | [💬 Discord](https://discord.gg/pod-protocol) | [🎫 Support](mailto:support@podprotocol.com)

</div> 