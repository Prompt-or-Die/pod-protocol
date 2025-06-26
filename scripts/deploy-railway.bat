@echo off
REM PoD Protocol - Railway Deployment Script (Windows)
REM Automated deployment of all services to Railway

echo.
echo 🚀 PoD Protocol - Railway Deployment
echo ⚡ Deploying complete platform to Railway
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

REM Check if Railway CLI is installed
where railway >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Railway CLI not found. Installing...
    npm install -g @railway/cli
)

REM Login check
echo 🔐 Checking Railway authentication...
railway status >nul 2>nul
if %errorlevel% neq 0 (
    echo ⚠️  Not logged in to Railway. Please login:
    railway login
)

REM Create or link project
echo 📋 Setting up Railway project...
set /p project_choice="Do you want to create a new project or link to existing? (new/existing): "

if /i "%project_choice%"=="new" (
    echo 🆕 Creating new Railway project...
    railway init
) else (
    set /p project_id="Enter your Railway project ID: "
    railway link %project_id%
)

REM Deploy database services first
echo 🗄️  Setting up database services...

echo 📊 Adding PostgreSQL database...
railway add postgresql
timeout /t 5 /nobreak >nul

echo 🔄 Adding Redis cache...
railway add redis
timeout /t 5 /nobreak >nul

REM Deploy MCP Server (Backend)
echo 🖥️  Deploying MCP Server (Backend)...
cd mcp-server

REM Set environment variables for MCP server
echo ⚙️  Configuring MCP Server environment...
railway variables set NODE_ENV=production
railway variables set POD_RPC_ENDPOINT=https://api.mainnet-beta.solana.com
railway variables set POD_PROGRAM_ID=HEpGLgYsE1kP8aoYKyLFc3JVVrofS7T4zEA6fWBJsZps
railway variables set LOG_LEVEL=info
railway variables set AGENT_ID=railway-production-mcp

REM Deploy MCP server
echo 🚀 Deploying MCP Server...
railway up --detach

REM Get MCP server URL
echo 📋 Getting MCP Server URL...
for /f %%i in ('railway domain') do set MCP_URL=%%i

if "%MCP_URL%"=="" (
    echo 🌐 Generating domain for MCP Server...
    railway domain
    for /f %%i in ('railway domain') do set MCP_URL=%%i
)

echo ✅ MCP Server deployed at: %MCP_URL%

REM Deploy Frontend
echo 🎨 Deploying Frontend...
cd ..\frontend

REM Set environment variables for frontend
echo ⚙️  Configuring Frontend environment...
railway variables set NODE_ENV=production
railway variables set NEXT_PUBLIC_MCP_SERVER_URL=https://%MCP_URL%
railway variables set NEXT_PUBLIC_WS_URL=wss://%MCP_URL%

REM Deploy frontend
echo 🚀 Deploying Frontend...
railway up --detach

REM Get frontend URL
echo 📋 Getting Frontend URL...
for /f %%i in ('railway domain') do set FRONTEND_URL=%%i

if "%FRONTEND_URL%"=="" (
    echo 🌐 Generating domain for Frontend...
    railway domain
    for /f %%i in ('railway domain') do set FRONTEND_URL=%%i
)

echo ✅ Frontend deployed at: %FRONTEND_URL%

REM Update CORS in MCP server
echo 🔒 Configuring CORS for Frontend...
cd ..\mcp-server
railway variables set CORS_ORIGIN=https://%FRONTEND_URL%

REM Wait for deployments to complete
echo ⏳ Waiting for deployments to complete...
timeout /t 30 /nobreak >nul

REM Display deployment summary
echo.
echo 🎉 Deployment Complete!
echo.
echo 📋 Deployment Summary:
echo    Frontend:    https://%FRONTEND_URL%
echo    MCP Server:  https://%MCP_URL%
echo    Health:      https://%MCP_URL%/health
echo    Metrics:     https://%MCP_URL%/metrics
echo.
echo 📊 Next Steps:
echo 1. Configure custom domains in Railway dashboard
echo 2. Set up monitoring alerts
echo 3. Configure SSL certificates if using custom domains
echo 4. Test all functionality in production environment
echo.
echo 🔥 PoD Protocol is now live on Railway! 🔥
echo ⚡ Full-stack AI agent communication platform deployed ⚡

REM Return to root directory
cd ..

pause 