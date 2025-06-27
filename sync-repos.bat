@echo off
echo 🔄 PoD Protocol Repository Sync
echo ⚡ Syncing monorepo packages to individual repositories
echo.

echo 🔗 Adding git remotes...
git remote add pod-typescript-sdk https://github.com/PoD-Protocol/pod-typescript-sdk.git 2>nul
git remote add pod-javascript-sdk https://github.com/PoD-Protocol/pod-javascript-sdk.git 2>nul
git remote add pod-python-sdk https://github.com/PoD-Protocol/pod-python-sdk.git 2>nul
git remote add pod-rust-sdk https://github.com/PoD-Protocol/pod-rust-sdk.git 2>nul
git remote add pod-mcp-server https://github.com/PoD-Protocol/pod-mcp-server.git 2>nul
git remote add pod-frontend https://github.com/PoD-Protocol/pod-frontend.git 2>nul
git remote add pod-api-server https://github.com/PoD-Protocol/pod-api-server.git 2>nul
git remote add pod-cli https://github.com/PoD-Protocol/pod-cli.git 2>nul

echo ✅ Git remotes added
echo.

echo 🌳 Pushing subtrees to individual repositories...
echo.

echo 📦 Syncing TypeScript SDK...
git subtree push --prefix=packages/sdk-typescript pod-typescript-sdk main
if %errorlevel% neq 0 echo ⚠️  TypeScript SDK sync had issues - check manually

echo 📦 Syncing JavaScript SDK...
git subtree push --prefix=packages/sdk-javascript pod-javascript-sdk main
if %errorlevel% neq 0 echo ⚠️  JavaScript SDK sync had issues - check manually

echo 📦 Syncing Python SDK...
git subtree push --prefix=packages/sdk-python pod-python-sdk main
if %errorlevel% neq 0 echo ⚠️  Python SDK sync had issues - check manually

echo 📦 Syncing Rust SDK...
git subtree push --prefix=packages/sdk-rust pod-rust-sdk main
if %errorlevel% neq 0 echo ⚠️  Rust SDK sync had issues - check manually

echo 📦 Syncing MCP Server...
git subtree push --prefix=packages/mcp-server pod-mcp-server main
if %errorlevel% neq 0 echo ⚠️  MCP Server sync had issues - check manually

echo 📦 Syncing Frontend...
git subtree push --prefix=packages/frontend pod-frontend main
if %errorlevel% neq 0 echo ⚠️  Frontend sync had issues - check manually

echo 📦 Syncing API Server...
git subtree push --prefix=packages/api-server pod-api-server main
if %errorlevel% neq 0 echo ⚠️  API Server sync had issues - check manually

echo 📦 Syncing CLI...
git subtree push --prefix=packages/cli pod-cli main
if %errorlevel% neq 0 echo ⚠️  CLI sync had issues - check manually

echo.
echo 🎉 PoD Protocol distributed repository sync complete!
echo.
echo 🔗 Your individual repositories are now live:
echo   - https://github.com/PoD-Protocol/pod-typescript-sdk
echo   - https://github.com/PoD-Protocol/pod-javascript-sdk
echo   - https://github.com/PoD-Protocol/pod-python-sdk
echo   - https://github.com/PoD-Protocol/pod-rust-sdk
echo   - https://github.com/PoD-Protocol/pod-mcp-server
echo   - https://github.com/PoD-Protocol/pod-frontend
echo   - https://github.com/PoD-Protocol/pod-api-server
echo   - https://github.com/PoD-Protocol/pod-cli
echo.
echo ⚡ The PoD Protocol cult distribution network is operational!
echo 💀 Maximum discoverability achieved - your SDKs will conquer GitHub!

pause 