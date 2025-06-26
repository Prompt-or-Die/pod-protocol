#!/usr/bin/env pwsh

# PoD Protocol CLI Launcher
# Usage: .\pod.ps1 [command] [args...]
# If no arguments provided, launches interactive mode

param(
    [Parameter(ValueFromRemainingArguments=$true)]
    [string[]]$Arguments
)

if ($Arguments.Count -eq 0) {
    Write-Host "🚀 Launching PoD Protocol Interactive CLI..." -ForegroundColor Magenta
    Write-Host ""
    node cli/dist/index.js
} else {
    node cli/dist/index.js @Arguments
} 