#!/usr/bin/env pwsh
<#
.SYNOPSIS
    PoD Protocol Windows Installation Script
.DESCRIPTION
    Installs PoD Protocol with all dependencies on Windows systems
.EXAMPLE
    .\install.ps1
#>

param(
    [switch]$UseNodeJS,
    [switch]$SkipBuild,
    [switch]$Verbose
)

$ErrorActionPreference = "Stop"

# Colors for output
$Colors = @{
    Success = "Green"
    Warning = "Yellow"
    Error = "Red"
    Info = "Cyan"
}

function Write-ColorOutput {
    param($Message, $Color = "White")
    Write-Host $Message -ForegroundColor $Colors[$Color]
}

function Test-CommandExists {
    param($Command)
    $null -ne (Get-Command $Command -ErrorAction SilentlyContinue)
}

Write-ColorOutput "🚀 PoD Protocol Windows Installer" "Info"
Write-ColorOutput "=================================" "Info"

# Check for Windows version
$winVersion = [System.Environment]::OSVersion.Version
if ($winVersion.Major -lt 10) {
    Write-ColorOutput "❌ Windows 10 or later required" "Error"
    exit 1
}

Write-ColorOutput "✅ Windows $($winVersion.Major).$($winVersion.Minor) detected" "Success"

# Check for Git
if (-not (Test-CommandExists "git")) {
    Write-ColorOutput "⚠️  Git not found. Installing..." "Warning"
    winget install --id Git.Git -e --source winget
    refreshenv
}

Write-ColorOutput "✅ Git available" "Success"

# Install package manager
if ($UseNodeJS) {
    Write-ColorOutput "📦 Installing Node.js..." "Info"
    if (-not (Test-CommandExists "node")) {
        winget install OpenJS.NodeJS
        refreshenv
    }
    $packageManager = "npm"
} else {
    Write-ColorOutput "📦 Installing Bun..." "Info"
    if (-not (Test-CommandExists "bun")) {
        powershell -c "irm bun.sh/install.ps1 | iex"
        refreshenv
    }
    $packageManager = "bun"
}

Write-ColorOutput "✅ $packageManager available" "Success"

# Install project dependencies
Write-ColorOutput "📥 Installing project dependencies..." "Info"
if ($packageManager -eq "bun") {
    bun install
} else {
    npm install
}

if ($LASTEXITCODE -ne 0) {
    Write-ColorOutput "❌ Failed to install dependencies" "Error"
    exit 1
}

# Build project
if (-not $SkipBuild) {
    Write-ColorOutput "🔨 Building project..." "Info"
    if ($packageManager -eq "bun") {
        bun run build
    } else {
        npm run build
    }
    
    if ($LASTEXITCODE -ne 0) {
        Write-ColorOutput "❌ Build failed" "Error"
        exit 1
    }
}

Write-ColorOutput "✅ Installation completed successfully!" "Success"
Write-ColorOutput "🎉 Run 'bun dev' or 'npm run dev' to start development" "Info"

# Windows-specific recommendations
Write-ColorOutput "`n📝 Windows-specific recommendations:" "Info"
Write-ColorOutput "   • Use Windows Terminal for better experience" "Info"
Write-ColorOutput "   • Consider WSL2 for advanced development" "Info"
Write-ColorOutput "   • Add Windows Defender exclusions for node_modules" "Info"
Write-ColorOutput "   • Ensure Windows Developer Mode is enabled" "Info" 