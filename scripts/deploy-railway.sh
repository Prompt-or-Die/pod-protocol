#!/bin/bash

# PoD Protocol - Railway Deployment Script
# Automated deployment of all services to Railway

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${PURPLE}🚀 PoD Protocol - Railway Deployment${NC}"
echo -e "${CYAN}⚡ Deploying complete platform to Railway${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo -e "${RED}❌ Railway CLI not found. Installing...${NC}"
    npm install -g @railway/cli
fi

# Login check
echo -e "${BLUE}🔐 Checking Railway authentication...${NC}"
if ! railway status &> /dev/null; then
    echo -e "${YELLOW}⚠️  Not logged in to Railway. Please login:${NC}"
    railway login
fi

# Create or link project
echo -e "${BLUE}📋 Setting up Railway project...${NC}"
read -p "Do you want to create a new project or link to existing? (new/existing): " project_choice

if [ "$project_choice" = "new" ]; then
    echo -e "${YELLOW}🆕 Creating new Railway project...${NC}"
    railway init
else
    read -p "Enter your Railway project ID: " project_id
    railway link $project_id
fi

# Deploy database services first
echo -e "${BLUE}🗄️  Setting up database services...${NC}"

echo -e "${YELLOW}📊 Adding PostgreSQL database...${NC}"
railway add postgresql
sleep 5

echo -e "${YELLOW}🔄 Adding Redis cache...${NC}"
railway add redis
sleep 5

# Deploy MCP Server (Backend)
echo -e "${BLUE}🖥️  Deploying MCP Server (Backend)...${NC}"
cd mcp-server

# Set environment variables for MCP server
echo -e "${YELLOW}⚙️  Configuring MCP Server environment...${NC}"
railway variables set NODE_ENV=production
railway variables set POD_RPC_ENDPOINT=https://api.mainnet-beta.solana.com
railway variables set POD_PROGRAM_ID=HEpGLgYsE1kP8aoYKyLFc3JVVrofS7T4zEA6fWBJsZps
railway variables set LOG_LEVEL=info
railway variables set AGENT_ID=railway-production-mcp

# Deploy MCP server
echo -e "${YELLOW}🚀 Deploying MCP Server...${NC}"
railway up --detach

# Get MCP server URL
echo -e "${YELLOW}📋 Getting MCP Server URL...${NC}"
MCP_URL=$(railway domain)

if [ -z "$MCP_URL" ]; then
    echo -e "${YELLOW}🌐 Generating domain for MCP Server...${NC}"
    railway domain
    MCP_URL=$(railway domain)
fi

echo -e "${GREEN}✅ MCP Server deployed at: $MCP_URL${NC}"

# Deploy Frontend
echo -e "${BLUE}🎨 Deploying Frontend...${NC}"
cd ../frontend

# Set environment variables for frontend
echo -e "${YELLOW}⚙️  Configuring Frontend environment...${NC}"
railway variables set NODE_ENV=production
railway variables set NEXT_PUBLIC_MCP_SERVER_URL=https://$MCP_URL
railway variables set NEXT_PUBLIC_WS_URL=wss://$MCP_URL

# Deploy frontend
echo -e "${YELLOW}🚀 Deploying Frontend...${NC}"
railway up --detach

# Get frontend URL
echo -e "${YELLOW}📋 Getting Frontend URL...${NC}"
FRONTEND_URL=$(railway domain)

if [ -z "$FRONTEND_URL" ]; then
    echo -e "${YELLOW}🌐 Generating domain for Frontend...${NC}"
    railway domain
    FRONTEND_URL=$(railway domain)
fi

echo -e "${GREEN}✅ Frontend deployed at: $FRONTEND_URL${NC}"

# Update CORS in MCP server
echo -e "${BLUE}🔒 Configuring CORS for Frontend...${NC}"
cd ../mcp-server
railway variables set CORS_ORIGIN=https://$FRONTEND_URL

# Wait for deployments to complete
echo -e "${BLUE}⏳ Waiting for deployments to complete...${NC}"
sleep 30

# Health checks
echo -e "${BLUE}🏥 Performing health checks...${NC}"

echo -e "${YELLOW}🔍 Checking MCP Server health...${NC}"
if curl -f https://$MCP_URL/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ MCP Server is healthy${NC}"
else
    echo -e "${RED}❌ MCP Server health check failed${NC}"
fi

echo -e "${YELLOW}🔍 Checking Frontend...${NC}"
if curl -f https://$FRONTEND_URL > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Frontend is accessible${NC}"
else
    echo -e "${RED}❌ Frontend health check failed${NC}"
fi

# Display deployment summary
echo ""
echo -e "${GREEN}🎉 Deployment Complete!${NC}"
echo ""
echo -e "${BLUE}📋 Deployment Summary:${NC}"
echo -e "   Frontend:    ${CYAN}https://$FRONTEND_URL${NC}"
echo -e "   MCP Server:  ${CYAN}https://$MCP_URL${NC}"
echo -e "   Health:      ${CYAN}https://$MCP_URL/health${NC}"
echo -e "   Metrics:     ${CYAN}https://$MCP_URL/metrics${NC}"
echo ""
echo -e "${YELLOW}📊 Next Steps:${NC}"
echo "1. Configure custom domains in Railway dashboard"
echo "2. Set up monitoring alerts"
echo "3. Configure SSL certificates if using custom domains"
echo "4. Test all functionality in production environment"
echo ""
echo -e "${PURPLE}🔥 PoD Protocol is now live on Railway! 🔥${NC}"
echo -e "${CYAN}⚡ Full-stack AI agent communication platform deployed ⚡${NC}"

# Return to root directory
cd .. 