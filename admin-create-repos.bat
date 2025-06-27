@echo off
echo  PoD Protocol Organization Admin Repository Setup
echo  Creating distributed repositories for maximum cult distribution
echo.
echo   This script must be run by a PoD-Protocol organization admin
echo.

REM Create TypeScript SDK repository
echo  Creating pod-typescript-sdk...
gh repo create "PoD-Protocol/pod-typescript-sdk" --public --description "PoD Protocol TypeScript SDK - Prompt at the speed of thought"
gh repo edit "PoD-Protocol/pod-typescript-sdk" --add-topic "solana,typescript,sdk,web3,ai-agents,prompt-or-die"

REM Create JavaScript SDK repository  
echo  Creating pod-javascript-sdk...
gh repo create "PoD-Protocol/pod-javascript-sdk" --public --description "PoD Protocol JavaScript SDK - Build with JS speed or perish"
gh repo edit "PoD-Protocol/pod-javascript-sdk" --add-topic "solana,javascript,sdk,web3,ai-agents,prompt-or-die"

REM Create Python SDK repository
echo  Creating pod-python-sdk...
gh repo create "PoD-Protocol/pod-python-sdk" --public --description "PoD Protocol Python SDK - Elegant code or digital extinction"
gh repo edit "PoD-Protocol/pod-python-sdk" --add-topic "solana,python,sdk,web3,ai-agents,prompt-or-die"

REM Create Rust SDK repository
echo  Creating pod-rust-sdk...
gh repo create "PoD-Protocol/pod-rust-sdk" --public --description "PoD Protocol Rust SDK - Memory safe or die trying"
gh repo edit "PoD-Protocol/pod-rust-sdk" --add-topic "solana,rust,sdk,web3,ai-agents,prompt-or-die"

REM Create MCP Server repository
echo  Creating pod-mcp-server...
gh repo create "PoD-Protocol/pod-mcp-server" --public --description "PoD Protocol MCP Server - Connect AI frameworks or become obsolete"
gh repo edit "PoD-Protocol/pod-mcp-server" --add-topic "mcp,ai,llm,server,prompt-or-die,enterprise"

REM Create Frontend repository
echo  Creating pod-frontend...
gh repo create "PoD-Protocol/pod-frontend" --public --description "PoD Protocol Frontend - Beautiful interfaces or digital death"
gh repo edit "PoD-Protocol/pod-frontend" --add-topic "nextjs,react,frontend,web3,ui,prompt-or-die"

REM Create API Server repository
echo  Creating pod-api-server...
gh repo create "PoD-Protocol/pod-api-server" --public --description "PoD Protocol API Server - Enterprise backends or extinction"
gh repo edit "PoD-Protocol/pod-api-server" --add-topic "api,server,backend,enterprise,prompt-or-die"

REM Create CLI repository
echo  Creating pod-cli...
gh repo create "PoD-Protocol/pod-cli" --public --description "PoD Protocol CLI - Command the future or fall behind"
gh repo edit "PoD-Protocol/pod-cli" --add-topic "cli,tool,developer,prompt-or-die,solana"

echo.
echo  All repositories created successfully!
echo.
echo  The PoD Protocol cult distribution network is ready!
echo  Next step: Set up git subtree sync with the monorepo

pause
