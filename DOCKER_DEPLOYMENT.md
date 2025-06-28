# PoD Protocol Docker Deployment Guide

This guide provides comprehensive instructions for deploying the PoD Protocol stack using Docker Compose.

## 🏗️ Architecture Overview

The Docker deployment includes:

- **Phala Cloud App**: Next.js frontend application with Phala integration
- **PostgreSQL 16**: Primary database with optimized configuration
- **Redis 7**: Caching and session storage
- **API Server**: Express.js REST API with Prisma ORM
- **MCP Server**: Model Context Protocol server for AI agent communication
- **Nginx** (Optional): Reverse proxy with load balancing and SSL termination

## 🚀 Quick Start

### Prerequisites

- Docker Engine 20.10+
- Docker Compose 2.0+
- At least 4GB RAM
- 10GB free disk space

### 1. Clone and Setup

```bash
git clone https://github.com/pod-protocol/pod-protocol.git
cd pod-protocol
```

### 2. Configure Environment

```bash
# Copy environment template
cp .env.docker .env

# Edit configuration (IMPORTANT: Change default passwords!)
nano .env
```

### 3. Deploy Stack

```bash
# Full deployment with migrations
./scripts/docker-deploy.sh deploy

# Or manually
docker-compose up -d
```

### 4. Verify Deployment

```bash
# Check service status
./scripts/docker-deploy.sh status

# View logs
./scripts/docker-deploy.sh logs
```

## 📋 Service Configuration

### Phala Cloud App (Port 3000)

**Endpoints:**
- Frontend: `http://localhost:3000`
- Health: `http://localhost:3000/api/health`

**Features:**
- Next.js application with Phala Cloud integration
- Connects to Phala blockchain via tappd socket
- Optimized for Web3 and decentralized applications
- Server-side rendering and static generation

### API Server (Port 4000)

**Endpoints:**
- Health: `http://localhost:4000/health`
- API Base: `http://localhost:4000/api`
- Documentation: `http://localhost:4000/api/docs`

**Features:**
- JWT Authentication with Solana wallet signatures
- Rate limiting (100 req/15min per IP)
- Comprehensive input validation
- Real-time WebSocket support
- Database migrations on startup

### MCP Server (Ports 8080/8081)

**Endpoints:**
- HTTP Transport: `http://localhost:8080/mcp`
- WebSocket: `ws://localhost:8081/ws`
- Health: `http://localhost:8080/health`

**Features:**
- Multi-transport support (HTTP, WebSocket, stdio)
- Session management with Redis
- Solana blockchain integration
- AI agent framework compatibility
- Real-time event streaming

### Database (PostgreSQL 16)

**Configuration:**
- User: `podprotocol`
- Database: `podprotocol`
- Port: `5432` (exposed in development)
- Backup: Automated via deployment script

**Features:**
- Optimized for JSON workloads
- Automated migrations
- Connection pooling
- Point-in-time recovery

## 🔧 Configuration Options

### Environment Variables

#### Core Settings
```env
NODE_ENV=production
LOG_LEVEL=info
```

#### Database
```env
DB_USER=podprotocol
DB_PASSWORD=your_secure_password
DB_NAME=podprotocol
```

#### Security
```env
JWT_SECRET=your_very_long_secret_key_minimum_32_chars
REDIS_PASSWORD=your_redis_password
```

#### Solana Blockchain
```env
SOLANA_RPC_ENDPOINT=https://api.mainnet-beta.solana.com
SOLANA_COMMITMENT=confirmed
POD_PROGRAM_ID=your_program_id
```

#### MCP Server
```env
MCP_MODE=self-hosted
MCP_HTTP_PORT=8080
MCP_WS_PORT=8081
MCP_RATE_LIMIT=120
```

### Production Configuration

For production deployments:

1. **Change all default passwords**
2. **Use secure secrets management**
3. **Configure SSL certificates**
4. **Set up monitoring and logging**
5. **Configure backup strategies**

## 🚢 Deployment Commands

### Basic Operations

```bash
# Start services
./scripts/docker-deploy.sh start

# Stop services
./scripts/docker-deploy.sh stop

# Restart services
./scripts/docker-deploy.sh restart

# View logs
./scripts/docker-deploy.sh logs [service-name]

# Check status
./scripts/docker-deploy.sh status
```

### Advanced Operations

```bash
# Full deployment with backup
./scripts/docker-deploy.sh deploy --backup

# Rebuild and redeploy
./scripts/docker-deploy.sh rebuild

# Create database backup
./scripts/docker-deploy.sh backup

# Clean up containers and images
./scripts/docker-deploy.sh cleanup
```

### Development Mode

```bash
# Start with development overrides
docker-compose -f docker-compose.yml -f docker-compose.override.yml up -d

# Enable hot reloading for API server
docker-compose exec api-server npm run dev

# Enable hot reloading for MCP server
docker-compose exec mcp-server npm run dev
```

## 🔍 Monitoring and Troubleshooting

### Health Checks

All services include comprehensive health checks:

```bash
# API Server health
curl http://localhost:4000/health

# MCP Server health
curl http://localhost:8080/health

# Database health
docker-compose exec postgres pg_isready -U podprotocol
```

### Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f api-server
docker-compose logs -f mcp-server
docker-compose logs -f postgres
```

### Common Issues

#### Database Connection Issues
```bash
# Check database status
docker-compose exec postgres pg_isready -U podprotocol

# Restart database
docker-compose restart postgres

# View database logs
docker-compose logs postgres
```

#### Migration Issues
```bash
# Manual migration
docker-compose exec api-server npx prisma migrate deploy

# Reset database (DANGER: Deletes all data)
docker-compose exec api-server npx prisma migrate reset
```

#### Port Conflicts
```bash
# Check port usage
netstat -tulpn | grep :4000
netstat -tulpn | grep :8080

# Modify ports in .env file
API_PORT=4001
MCP_HTTP_PORT=8081
```

## 🔒 Security Best Practices

### Production Security Checklist

- [ ] Changed all default passwords
- [ ] Generated strong JWT secret (32+ characters)
- [ ] Configured proper CORS origins
- [ ] Enabled SSL/TLS certificates
- [ ] Set up firewall rules
- [ ] Configured log rotation
- [ ] Enabled database encryption
- [ ] Set up monitoring and alerting
- [ ] Implemented backup strategy
- [ ] Reviewed security headers

### Network Security

```bash
# Create custom network with restricted access
docker network create --driver bridge pod-network

# Configure firewall rules
ufw allow 80/tcp
ufw allow 443/tcp
ufw deny 4000/tcp  # Block direct API access
ufw deny 8080/tcp  # Block direct MCP access
```

## 📊 Performance Optimization

### Resource Limits

```yaml
# Add to docker-compose.yml
services:
  api-server:
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 512M
```

### Database Optimization

```sql
-- PostgreSQL optimization
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';
ALTER SYSTEM SET maintenance_work_mem = '64MB';
ALTER SYSTEM SET random_page_cost = 1.1;
```

## 🔄 Backup and Recovery

### Automated Backups

```bash
# Create backup script
cat > backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="./backups"
DATE=$(date +%Y%m%d_%H%M%S)

# Database backup
docker-compose exec -T postgres pg_dump -U podprotocol podprotocol > "$BACKUP_DIR/db_$DATE.sql"

# Compress and rotate backups
gzip "$BACKUP_DIR/db_$DATE.sql"
find "$BACKUP_DIR" -name "*.gz" -mtime +7 -delete
EOF

# Schedule with cron
crontab -e
# Add: 0 2 * * * /path/to/backup.sh
```

### Recovery Process

```bash
# Stop services
docker-compose down

# Restore database
docker-compose up -d postgres
docker-compose exec -T postgres psql -U podprotocol -d podprotocol < backup.sql

# Start services
docker-compose up -d
```

## 🌐 Production Deployment

### SSL/TLS Configuration

```bash
# Generate SSL certificates (Let's Encrypt)
certbot certonly --standalone -d yourdomain.com

# Update nginx configuration
# Mount certificates in docker-compose.yml
volumes:
  - /etc/letsencrypt:/etc/nginx/ssl:ro
```

### Load Balancing

```yaml
# docker-compose.yml - Multiple API instances
services:
  api-server-1:
    <<: *api-server-common
    container_name: pod-api-1
  
  api-server-2:
    <<: *api-server-common
    container_name: pod-api-2
```

### Monitoring Stack

```yaml
# Add monitoring services
services:
  prometheus:
    image: prom/prometheus
    ports:
      - "9090:9090"
  
  grafana:
    image: grafana/grafana
    ports:
      - "3001:3000"
```

## 🌐 Service Endpoints Summary

After successful deployment, the following services will be available:

- **Phala Cloud App**: `http://localhost:3000` - Main frontend application
- **API Server**: `http://localhost:4000` - Backend REST API
- **MCP HTTP**: `http://localhost:8080` - Model Context Protocol HTTP transport
- **MCP WebSocket**: `ws://localhost:8081` - Model Context Protocol WebSocket transport
- **Database**: `postgresql://localhost:5432` - PostgreSQL database (dev mode only)
- **Redis**: `redis://localhost:6379` - Redis cache (dev mode only)
- **Nginx Proxy**: `http://localhost:80` - Reverse proxy (when enabled)

### Health Checks

- **App Health**: `http://localhost:3000/api/health`
- **API Health**: `http://localhost:4000/health`
- **MCP Health**: `http://localhost:8080/health`

## 📞 Support

- **Documentation**: [docs.pod-protocol.com](https://docs.pod-protocol.com)
- **Issues**: [GitHub Issues](https://github.com/pod-protocol/pod-protocol/issues)
- **Discord**: [PoD Protocol Community](https://discord.gg/pod-protocol)
- **Email**: support@pod-protocol.com

---

**⚠️ Security Notice**: Always change default passwords and secrets before production deployment. This configuration is intended for development and testing purposes.