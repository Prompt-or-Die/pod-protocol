#!/bin/bash
# PoD Protocol - Distributed Repository Setup Script
# Sets up individual repositories that sync with the main monorepo

set -e

echo "🚀 Setting up PoD Protocol distributed repositories..."

# Repository configurations
declare -A repos=(
    ["pod-typescript-sdk"]="packages/sdk-typescript"
    ["pod-javascript-sdk"]="packages/sdk-javascript" 
    ["pod-python-sdk"]="packages/sdk-python"
    ["pod-rust-sdk"]="packages/sdk-rust"
    ["pod-mcp-server"]="packages/mcp-server"
    ["pod-frontend"]="packages/frontend"
    ["pod-api-server"]="packages/api-server"
    ["pod-cli"]="packages/cli"
)

# Check if GitHub CLI is installed
if ! command -v gh &> /dev/null; then
    echo "❌ GitHub CLI (gh) is required. Install from: https://cli.github.com/"
    exit 1
fi

# Check if we're in the right directory
if [ ! -d "packages" ]; then
    echo "❌ Run this script from the root of your monorepo"
    exit 1
fi

echo "📋 Creating individual repositories..."

for repo_name in "${!repos[@]}"; do
    package_path="${repos[$repo_name]}"
    
    if [ ! -d "$package_path" ]; then
        echo "⚠️  Skipping $repo_name - directory $package_path not found"
        continue
    fi
    
    echo "🔧 Setting up $repo_name..."
    
    # Create repository on GitHub
    echo "  📦 Creating GitHub repository: PoD-Protocol/$repo_name"
    gh repo create "PoD-Protocol/$repo_name" --public --description "PoD Protocol ${repo_name/pod-/} - Prompt or Die ⚡" || true
    
    # Add as git remote
    echo "  🔗 Adding git remote: $repo_name"
    git remote add "$repo_name" "git@github.com:PoD-Protocol/$repo_name.git" 2>/dev/null || true
    
    # Initial subtree push
    echo "  🌳 Pushing subtree to $repo_name"
    if git subtree push --prefix="$package_path" "$repo_name" main; then
        echo "  ✅ Successfully set up $repo_name"
    else
        echo "  ⚠️  Issues with $repo_name setup - check manually"
    fi
    
    echo ""
done

echo "🎉 Distributed repository setup complete!"
echo ""
echo "🔄 Next steps:"
echo "1. Set up GitHub Actions for auto-sync"
echo "2. Customize each individual repository"
echo "3. Configure package publishing (npm, PyPI, crates.io)"
echo "4. Update documentation with individual repo links"
echo ""
echo "⚡ The PoD Protocol cult is now distributed across the GitHub universe!" 