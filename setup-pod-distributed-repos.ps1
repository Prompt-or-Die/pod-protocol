# PoD Protocol - Distributed Repository Setup Script (PowerShell)
# Sets up individual repositories under PoD-Protocol organization

param(
    [switch]$DryRun = $false,
    [switch]$SkipRepoCreation = $false
)

Write-Host "🚀 PoD Protocol Distributed Repository Setup" -ForegroundColor Cyan
Write-Host "⚡ Prompt or Die - Repository Distribution Commencing" -ForegroundColor Yellow
Write-Host ""

# Repository configurations
$repos = @{
    "pod-typescript-sdk" = @{
        path = "packages/sdk-typescript"
        description = "PoD Protocol TypeScript SDK - Prompt at the speed of thought ⚡"
        topics = @("solana", "typescript", "sdk", "web3", "ai-agents", "prompt-or-die")
    }
    "pod-javascript-sdk" = @{
        path = "packages/sdk-javascript" 
        description = "PoD Protocol JavaScript SDK - Build with JS speed or perish 💀"
        topics = @("solana", "javascript", "sdk", "web3", "ai-agents", "prompt-or-die")
    }
    "pod-python-sdk" = @{
        path = "packages/sdk-python"
        description = "PoD Protocol Python SDK - Elegant code or digital extinction 🐍"
        topics = @("solana", "python", "sdk", "web3", "ai-agents", "prompt-or-die")
    }
    "pod-rust-sdk" = @{
        path = "packages/sdk-rust"
        description = "PoD Protocol Rust SDK - Memory safe or die trying 🦀"
        topics = @("solana", "rust", "sdk", "web3", "ai-agents", "prompt-or-die")
    }
    "pod-mcp-server" = @{
        path = "packages/mcp-server"
        description = "PoD Protocol MCP Server - Connect AI frameworks or become obsolete 🤖"
        topics = @("mcp", "ai", "llm", "server", "prompt-or-die", "enterprise")
    }
    "pod-frontend" = @{
        path = "packages/frontend"
        description = "PoD Protocol Frontend - Beautiful interfaces or digital death 🎨"
        topics = @("nextjs", "react", "frontend", "web3", "ui", "prompt-or-die")
    }
    "pod-api-server" = @{
        path = "packages/api-server"
        description = "PoD Protocol API Server - Enterprise backends or extinction 🖥️"
        topics = @("api", "server", "backend", "enterprise", "prompt-or-die")
    }
    "pod-cli" = @{
        path = "packages/cli"
        description = "PoD Protocol CLI - Command the future or fall behind 💻"
        topics = @("cli", "tool", "developer", "prompt-or-die", "solana")
    }
}

# Check prerequisites
function Test-Prerequisites {
    Write-Host "🔍 Checking prerequisites..." -ForegroundColor Yellow
    
    # Check GitHub CLI
    if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
        Write-Error "❌ GitHub CLI (gh) is required. Install from: https://cli.github.com/"
        exit 1
    }
    
    # Check authentication
    $authStatus = gh auth status 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Error "❌ Not authenticated with GitHub CLI. Run: gh auth login"
        exit 1
    }
    
    # Check if we're in the right directory
    if (-not (Test-Path "packages")) {
        Write-Error "❌ Run this script from the root of your monorepo (packages directory not found)"
        exit 1
    }
    
    Write-Host "✅ Prerequisites satisfied" -ForegroundColor Green
}

# Fix GitHub token if needed
function Fix-GitHubToken {
    Write-Host "🔧 Checking GitHub token..." -ForegroundColor Yellow
    
    $testAccess = gh repo list PoD-Protocol --limit 1 2>&1
    if ($LASTEXITCODE -ne 0 -and $testAccess -match "fine-grained personal access token") {
        Write-Host "⚠️  Token lifetime issue detected" -ForegroundColor Red
        Write-Host "🔗 Please visit: https://github.com/settings/personal-access-tokens/6865121" -ForegroundColor Cyan
        Write-Host "📝 Set token expiration to 366 days or less" -ForegroundColor Cyan
        Write-Host "🔄 Then run this script again" -ForegroundColor Cyan
        Read-Host "Press Enter after fixing the token to continue"
        
        # Test again
        $testAccess = gh repo list PoD-Protocol --limit 1 2>&1
        if ($LASTEXITCODE -ne 0) {
            Write-Error "❌ Token issue not resolved. Please fix and try again."
            exit 1
        }
    }
    
    Write-Host "✅ GitHub token working correctly" -ForegroundColor Green
}

# Create individual repositories
function New-DistributedRepos {
    Write-Host "📦 Creating individual repositories..." -ForegroundColor Yellow
    
    foreach ($repoName in $repos.Keys) {
        $config = $repos[$repoName]
        $packagePath = $config.path
        
        Write-Host "🔧 Setting up $repoName..." -ForegroundColor Cyan
        
        # Check if package directory exists
        if (-not (Test-Path $packagePath)) {
            Write-Warning "⚠️  Skipping $repoName - directory $packagePath not found"
            continue
        }
        
        if (-not $SkipRepoCreation) {
            Write-Host "  📦 Creating GitHub repository: PoD-Protocol/$repoName" -ForegroundColor Gray
            
            if ($DryRun) {
                Write-Host "  [DRY RUN] Would create: PoD-Protocol/$repoName" -ForegroundColor Magenta
            } else {
                $createResult = gh repo create "PoD-Protocol/$repoName" --public --description $config.description 2>&1
                if ($LASTEXITCODE -eq 0) {
                    Write-Host "  ✅ Repository created successfully" -ForegroundColor Green
                } elseif ($createResult -match "already exists") {
                    Write-Host "  ✅ Repository already exists" -ForegroundColor Green
                } else {
                    Write-Warning "  ⚠️  Repository creation issue: $createResult"
                }
                
                # Add topics
                Write-Host "  🏷️  Adding topics..." -ForegroundColor Gray
                $topicsString = $config.topics -join ","
                gh repo edit "PoD-Protocol/$repoName" --add-topic $topicsString 2>$null
            }
        }
        
        # Add git remote
        Write-Host "  🔗 Setting up git remote..." -ForegroundColor Gray
        if ($DryRun) {
            Write-Host "  [DRY RUN] Would add remote: $repoName" -ForegroundColor Magenta
        } else {
            git remote remove $repoName 2>$null  # Remove if exists
            git remote add $repoName "https://github.com/PoD-Protocol/$repoName.git"
            if ($LASTEXITCODE -eq 0) {
                Write-Host "  ✅ Git remote added" -ForegroundColor Green
            } else {
                Write-Warning "  ⚠️  Git remote setup issue"
            }
        }
        
        # Push subtree
        Write-Host "  🌳 Pushing subtree..." -ForegroundColor Gray
        if ($DryRun) {
            Write-Host "  [DRY RUN] Would push subtree: $packagePath" -ForegroundColor Magenta
        } else {
            $pushResult = git subtree push --prefix=$packagePath $repoName main 2>&1
            if ($LASTEXITCODE -eq 0) {
                Write-Host "  ✅ Subtree pushed successfully" -ForegroundColor Green
            } else {
                Write-Warning "  ⚠️  Subtree push issue - may need manual resolution"
                Write-Host "  📝 Command to retry: git subtree push --prefix=$packagePath $repoName main" -ForegroundColor Gray
            }
        }
        
        Write-Host ""
    }
}

# Setup GitHub Actions workflow
function Set-GitHubActions {
    Write-Host "⚙️  Setting up GitHub Actions workflow..." -ForegroundColor Yellow
    
    $workflowPath = ".github/workflows/sync-packages.yml"
    
    if (Test-Path $workflowPath) {
        Write-Host "✅ GitHub Actions workflow already exists" -ForegroundColor Green
    } else {
        Write-Host "📝 GitHub Actions workflow needs to be committed and pushed" -ForegroundColor Cyan
        Write-Host "🔑 Don't forget to add SYNC_TOKEN secret in repository settings" -ForegroundColor Cyan
    }
}

# Main execution
function Invoke-Setup {
    Write-Host "🔮 Welcome to the PoD Protocol Cult Distribution System 💀" -ForegroundColor Magenta
    Write-Host ""
    
    if ($DryRun) {
        Write-Host "🧪 DRY RUN MODE - No actual changes will be made" -ForegroundColor Yellow
        Write-Host ""
    }
    
    Test-Prerequisites
    Fix-GitHubToken
    New-DistributedRepos
    Set-GitHubActions
    
    Write-Host "🎉 PoD Protocol distributed repository setup complete!" -ForegroundColor Green
    Write-Host ""
    Write-Host "🔄 Next steps:" -ForegroundColor Cyan
    Write-Host "1. ✅ Individual repositories created under PoD-Protocol organization"
    Write-Host "2. 🔑 Add SYNC_TOKEN secret in main repo settings for auto-sync"
    Write-Host "3. 📝 Customize each individual repository README"
    Write-Host "4. 📦 Set up package publishing (npm, PyPI, crates.io)"
    Write-Host "5. 📊 Monitor individual repository metrics and community growth"
    Write-Host ""
    Write-Host "⚡ The PoD Protocol cult is now distributed across GitHub!" -ForegroundColor Yellow
    Write-Host "💀 Your SDKs will be discovered or your project will die in obscurity!" -ForegroundColor Red
}

# Execute the setup
Invoke-Setup 