@echo off
echo 🚀 PoD Protocol Distributed Repository Setup
echo ⚡ Prompt or Die - Repository Distribution Commencing
echo.

echo 📦 Creating individual repositories under PoD-Protocol organization...
echo.

REM Create TypeScript SDK repository
echo 🔧 Creating pod-typescript-sdk...
gh repo create "PoD-Protocol/pod-typescript-sdk" --public --description "PoD Protocol TypeScript SDK - Prompt at the speed of thought ⚡"
gh repo edit "PoD-Protocol/pod-typescript-sdk" --add-topic "solana,typescript,sdk,web3,ai-agents,prompt-or-die"

REM Create JavaScript SDK repository  
echo 🔧 Creating pod-javascript-sdk...
gh repo create "PoD-Protocol/pod-javascript-sdk" --public --description "PoD Protocol JavaScript SDK - Build with JS speed or perish 💀"
gh repo edit "PoD-Protocol/pod-javascript-sdk" --add-topic "solana,javascript,sdk,web3,ai-agents,prompt-or-die"

REM Create Python SDK repository
echo 🔧 Creating pod-python-sdk...
gh repo create "PoD-Protocol/pod-python-sdk" --public --description "PoD Protocol Python SDK - Elegant code or digital extinction 🐍"
gh repo edit "PoD-Protocol/pod-python-sdk" --add-topic "solana,python,sdk,web3,ai-agents,prompt-or-die"

REM Create Rust SDK repository
echo 🔧 Creating pod-rust-sdk...
gh repo create "PoD-Protocol/pod-rust-sdk" --public --description "PoD Protocol Rust SDK - Memory safe or die trying 🦀"
gh repo edit "PoD-Protocol/pod-rust-sdk" --add-topic "solana,rust,sdk,web3,ai-agents,prompt-or-die"

REM Create MCP Server repository
echo 🔧 Creating pod-mcp-server...
gh repo create "PoD-Protocol/pod-mcp-server" --public --description "PoD Protocol MCP Server - Connect AI frameworks or become obsolete 🤖"
gh repo edit "PoD-Protocol/pod-mcp-server" --add-topic "mcp,ai,llm,server,prompt-or-die,enterprise"

REM Create Frontend repository
echo 🔧 Creating pod-frontend...
gh repo create "PoD-Protocol/pod-frontend" --public --description "PoD Protocol Frontend - Beautiful interfaces or digital death 🎨"
gh repo edit "PoD-Protocol/pod-frontend" --add-topic "nextjs,react,frontend,web3,ui,prompt-or-die"

REM Create API Server repository
echo 🔧 Creating pod-api-server...
gh repo create "PoD-Protocol/pod-api-server" --public --description "PoD Protocol API Server - Enterprise backends or extinction 🖥️"
gh repo edit "PoD-Protocol/pod-api-server" --add-topic "api,server,backend,enterprise,prompt-or-die"

REM Create CLI repository
echo 🔧 Creating pod-cli...
gh repo create "PoD-Protocol/pod-cli" --public --description "PoD Protocol CLI - Command the future or fall behind 💻"
gh repo edit "PoD-Protocol/pod-cli" --add-topic "cli,tool,developer,prompt-or-die,solana"

echo.
echo 🎉 Repositories created successfully!
echo.
echo 🔄 Next steps:
echo 1. ✅ Individual repositories created under PoD-Protocol organization
echo 2. 🔗 Add git remotes for each repository
echo 3. 🌳 Push subtrees to sync code
echo 4. 🔑 Set up GitHub Actions for auto-sync
echo.
echo ⚡ The PoD Protocol cult is now distributed across GitHub!
echo 💀 Your SDKs will be discovered or your project will die in obscurity!

pause 