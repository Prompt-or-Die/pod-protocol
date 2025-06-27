# 🚀 PoD Protocol - Railway Deployment Guide

Complete guide for deploying the entire PoD Protocol platform on Railway.

## 🏗️ Architecture Overview

The PoD Protocol platform now consists of these services:

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   API Server    │    │   Database      │
│   (Next.js)     │───▶│   (Express)     │───▶│   (PostgreSQL)  │
│   Port: 3000    │    │   Port: 4000    │    │   Port: 5432    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │              ┌─────────────────┐    ┌─────────────────┐
         │              │   WebSocket     │    │     Redis       │
         └─────────────▶│   (Socket.IO)   │    │   (Cache)       │
                        │   Port: 4000    │    │   Port: 6379    │
                        └─────────────────┘    └─────────────────┘
                                │
                       ┌─────────────────┐
                       │   MCP Server    │
                       │   (AI Models)   │  
                       │   Port: 5000    │
                       └─────────────────┘
```

## 🎯 What Gets Deployed

### **Core Services (Required):**
1. **🎨 Frontend** - Next.js application with wallet integration
2. **🖥️ API Server** - Express.js REST API with WebSocket support  
3. **🗄️ PostgreSQL** - Database (Railway managed service)
4. **🔄 Redis** - Caching (Railway managed service)

### **Optional Services:**
5. **🤖 MCP Server** - For AI model integrations (Claude, GPT, etc.)

## 🚀 Quick Deployment (5 Minutes)

### **Step 1: Install Railway CLI**

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway (opens browser)
railway login
```

### **Step 2: Deploy with Automation Script**

```bash
# Windows
./scripts/deploy-railway.bat

# Linux/Mac  
./scripts/deploy-railway.sh
```

The script will:
- ✅ Create Railway project
- ✅ Deploy API Server (Express + WebSocket)
- ✅ Deploy Frontend (Next.js)
- ✅ Set up PostgreSQL database
- ✅ Set up Redis cache
- ✅ Configure environment variables
- ✅ Set up custom domains

## 📋 Manual Deployment Steps

### **Step 1: Create Railway Project**

```bash
# Initialize new Railway project
railway init

# Choose "Create new project"
# Name: "pod-protocol"
```

### **Step 2: Deploy API Server**

```bash
# Navigate to API server
cd api-server

# Deploy API server
railway up

# Set environment variables
railway variables set JWT_SECRET="your-super-secret-jwt-key"
railway variables set NODE_ENV="production"
railway variables set FRONTEND_URL="https://your-frontend-domain.railway.app"
```

### **Step 3: Deploy Frontend**

```bash
# Navigate to frontend
cd ../frontend

# Deploy frontend  
railway up

# Set environment variables
railway variables set NEXT_PUBLIC_API_URL="https://your-api-domain.railway.app"
railway variables set NEXT_PUBLIC_WS_URL="wss://your-api-domain.railway.app"
```

### **Step 4: Add Database Services**

```bash
# Add PostgreSQL
railway add postgresql

# Add Redis
railway add redis

# Variables are automatically set by Railway
```

## 🔧 Environment Variables Setup

### **API Server Environment Variables:**
```bash
railway variables set JWT_SECRET="your-super-secret-jwt-key-minimum-32-chars"
railway variables set NODE_ENV="production"  
railway variables set LOG_LEVEL="info"
railway variables set FRONTEND_URL="https://your-frontend.railway.app"
railway variables set SOLANA_RPC_URL="https://api.mainnet-beta.solana.com"
```

### **Frontend Environment Variables:**
```bash
railway variables set NEXT_PUBLIC_API_URL="https://your-api.railway.app"
railway variables set NEXT_PUBLIC_WS_URL="wss://your-api.railway.app"
railway variables set NEXT_PUBLIC_SOLANA_NETWORK="mainnet-beta"
```

### **Database Variables (Auto-generated):**
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string

## 🌐 Custom Domains (Optional)

```bash
# Set custom domain for frontend
railway domain add your-domain.com

# Set custom domain for API
railway domain add api.your-domain.com
```

## 🔍 Verification & Testing

### **1. Health Checks**

```bash
# Check API server health
curl https://your-api-domain.railway.app/health

# Expected response:
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 3600,
  "version": "1.0.0"
}
```

### **2. Frontend Check**

```bash
# Visit your frontend URL
https://your-frontend-domain.railway.app

# Should show PoD Protocol landing page
```

### **3. WebSocket Test**

```javascript
// Test WebSocket connection
const socket = io('wss://your-api-domain.railway.app', {
  auth: { token: 'your-jwt-token' }
});

socket.on('connect', () => {
  console.log('WebSocket connected!');
});
```

## 📊 Monitoring & Logs

```bash
# View API server logs
railway logs

# View frontend logs  
railway logs --service frontend

# View database logs
railway logs --service postgresql
```

## 🔒 Security Configuration

### **JWT Secret Generation**
```bash
# Generate secure JWT secret (32+ characters)
openssl rand -base64 32
```

### **Environment Security**
- ✅ All sensitive data in environment variables
- ✅ CORS configured for frontend domain only
- ✅ Rate limiting enabled (100 requests/15min)
- ✅ Helmet.js security headers
- ✅ JWT token validation

## 🚨 Troubleshooting

### **Common Issues:**

**1. Build Failures:**
```bash
# Clear Railway cache
railway environment delete staging
railway environment create staging
```

**2. Environment Variable Issues:**
```bash
# List all variables
railway variables

# Update specific variable
railway variables set VARIABLE_NAME="new-value"
```

**3. Database Connection Issues:**
```bash
# Check database status
railway status postgresql

# Reset database connection
railway variables set DATABASE_URL="new-connection-string"
```

## 💰 Railway Pricing

### **Estimated Monthly Costs:**

- **Hobby Plan (Free Tier):**
  - ✅ Frontend: $0 (512MB RAM)
  - ✅ API Server: $0 (512MB RAM) 
  - ✅ PostgreSQL: $0 (1GB storage)
  - ✅ Redis: $0 (1GB memory)
  - **Total: FREE** for development/testing

- **Pro Plan ($20/month):**
  - ✅ All services with higher limits
  - ✅ Custom domains included
  - ✅ Priority support
  - ✅ Advanced metrics

## 🎯 Next Steps After Deployment

1. **✅ Custom Domain Setup** - Point your domain to Railway
2. **✅ SSL Certificates** - Automatic with Railway domains  
3. **✅ CI/CD Setup** - Auto-deploy from GitHub
4. **✅ Environment Promotion** - staging → production
5. **✅ Monitoring** - Set up alerts and dashboards

## 🤝 Support

- **Railway Discord:** https://discord.gg/railway
- **PoD Protocol Issues:** Create GitHub issue
- **Documentation:** https://docs.railway.app

---

## ✨ Success! 

Your PoD Protocol platform is now deployed on Railway with:

- 🎨 **Frontend** - Modern Next.js application  
- 🖥️ **API Server** - Express.js with real-time WebSocket
- 🗄️ **Database** - PostgreSQL with Redis caching
- 🔒 **Security** - JWT auth, rate limiting, CORS
- 🚀 **Performance** - Optimized for production use

**Ready for users!** 🎉 