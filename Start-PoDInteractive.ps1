#!/usr/bin/env pwsh

Write-Host "🚀 Starting PoD Protocol Interactive CLI Demo..." -ForegroundColor Magenta
Write-Host ""
Write-Host "This demonstrates the concept of a persistent CLI session that stays open!" -ForegroundColor Cyan
Write-Host ""
Write-Host "✨ Features:" -ForegroundColor Yellow
Write-Host "  • Persistent session that doesn't close after each command" -ForegroundColor Gray
Write-Host "  • Tab completion for commands" -ForegroundColor Gray
Write-Host "  • Command history with up/down arrows" -ForegroundColor Gray
Write-Host "  • Network switching (devnet/testnet/mainnet)" -ForegroundColor Gray
Write-Host "  • Clear screen and help functions" -ForegroundColor Gray
Write-Host "  • Demo agent registration and message sending" -ForegroundColor Gray
Write-Host ""
Write-Host "Try these commands once the CLI starts:" -ForegroundColor Green
Write-Host "  help        - Show all available commands" -ForegroundColor White
Write-Host "  demo-agent  - Register a demo agent" -ForegroundColor White
Write-Host "  status      - Show system status" -ForegroundColor White
Write-Host "  clear       - Clear the screen" -ForegroundColor White
Write-Host "  exit        - Leave the interactive mode" -ForegroundColor White
Write-Host ""
Write-Host "Press any key to launch the Interactive CLI..." -ForegroundColor Yellow
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

node interactive-demo.js 