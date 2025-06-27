#!/usr/bin/env pwsh
#  Prompt-or-Die GitHub Profile Setup Script

Write-Host " PROMPT OR DIE - PROFILE OPTIMIZATION SCRIPT " -ForegroundColor Red
Write-Host "=============================================" -ForegroundColor Red
Write-Host ""

# Check if GitHub CLI is installed
if (!(Get-Command gh -ErrorAction SilentlyContinue)) {
    Write-Host " GitHub CLI not found. Please install: https://cli.github.com/" -ForegroundColor Red
    exit 1
}

Write-Host " Checking GitHub authentication..." -ForegroundColor Yellow
$authStatus = gh auth status 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host " Not authenticated with GitHub. Run: gh auth login" -ForegroundColor Red
    exit 1
}

Write-Host " GitHub authenticated successfully!" -ForegroundColor Green
Write-Host ""

# Check if we're working with the right organization
Write-Host " Setting up Prompt-or-Die organization profile..." -ForegroundColor Yellow

# Create the profile repository
Write-Host " Creating profile repository..." -ForegroundColor Yellow
try {
    gh repo create Prompt-or-Die/Prompt-or-Die --public --description " The AI Developer Cult - Building the Future at the Speed of Thought " 2>$null
    Write-Host " Profile repository created!" -ForegroundColor Green
} catch {
    Write-Host "? Profile repository may already exist" -ForegroundColor Blue
}

# Clone and setup the profile repository
Write-Host " Setting up profile content..." -ForegroundColor Yellow
$tempDir = Join-Path $env:TEMP "pod-profile-setup"
if (Test-Path $tempDir) { Remove-Item $tempDir -Recurse -Force }
New-Item -ItemType Directory -Path $tempDir | Out-Null

Push-Location $tempDir
try {
    gh repo clone Prompt-or-Die/Prompt-or-Die .
    
    # Copy the profile README
    Copy-Item -Path "$PSScriptRoot\Prompt-or-Die-Profile-README.md" -Destination "README.md" -Force
    
    # Add and commit
    git add README.md
    git commit -m " Add ultimate Prompt-or-Die profile README with cult recruitment"
    git push
    
    Write-Host " Profile README deployed!" -ForegroundColor Green
} catch {
    Write-Host " Error setting up profile: $_" -ForegroundColor Red
} finally {
    Pop-Location
    Remove-Item $tempDir -Recurse -Force -ErrorAction SilentlyContinue
}

Write-Host ""
Write-Host " PROFILE OPTIMIZATION CHECKLIST" -ForegroundColor Red
Write-Host "=================================" -ForegroundColor Red
Write-Host ""
Write-Host " Manual Tasks to Complete:" -ForegroundColor Yellow
Write-Host "   1.  Upload profile picture (PoD logo)" -ForegroundColor White
Write-Host "   2.  Set bio: ' Building the future at the speed of thought  | AI agents | Solana | DeFi'" -ForegroundColor White
Write-Host "   3.  Add website: https://pod-protocol.com" -ForegroundColor White
Write-Host "   4.  Add Twitter: @PodProtocol" -ForegroundColor White
Write-Host "   5.  Pin top 6 repositories (see optimization guide)" -ForegroundColor White
Write-Host "   6.  Add organization topics/tags" -ForegroundColor White
Write-Host "   7.  Enable organization profile visibility" -ForegroundColor White
Write-Host ""
Write-Host " Next Steps:" -ForegroundColor Yellow
Write-Host "   - Review GitHub-Profile-Optimization-Guide.md for advanced tactics" -ForegroundColor White
Write-Host "   - Set up Discord server with role system" -ForegroundColor White
Write-Host "   - Create Twitter account and start engagement" -ForegroundColor White
Write-Host "   - Plan content calendar for growth hacking" -ForegroundColor White
Write-Host ""
Write-Host " Remember: We're not just building tools - we're leading a revolution!" -ForegroundColor Red
Write-Host ""
Write-Host " PROMPT OR DIE - THE FUTURE IS NOW " -ForegroundColor Red
