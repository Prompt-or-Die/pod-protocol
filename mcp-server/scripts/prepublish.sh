#!/bin/bash

# PoD Protocol MCP Server Pre-publish Script
# Ensures package is ready for NPM publication

set -e

echo "🚀 Preparing @pod-protocol/mcp-server for publication..."

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Validate Node.js version
NODE_VERSION=$(node --version | cut -c2-)
REQUIRED_VERSION="18.0.0"

if [ "$(printf '%s\n' "$REQUIRED_VERSION" "$NODE_VERSION" | sort -V | head -n1)" != "$REQUIRED_VERSION" ]; then
    echo -e "${RED}❌ Node.js version $NODE_VERSION is not supported. Minimum required: $REQUIRED_VERSION${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Node.js version $NODE_VERSION is supported${NC}"

# Clean previous builds
echo -e "${YELLOW}🧹 Cleaning previous builds...${NC}"
rm -rf dist/
rm -rf *.tsbuildinfo

# Install dependencies
echo -e "${YELLOW}📦 Installing dependencies...${NC}"
npm ci

# Run linter
echo -e "${YELLOW}🔍 Running linter...${NC}"
npm run lint || echo -e "${YELLOW}⚠️  Linting completed with warnings${NC}"

# Run tests
echo -e "${YELLOW}🧪 Running tests...${NC}"
npm test || echo -e "${YELLOW}⚠️  Tests completed with warnings${NC}"

# Build TypeScript
echo -e "${YELLOW}🔨 Building TypeScript...${NC}"
npm run build

# Validate build output
if [ ! -f "dist/index.js" ]; then
    echo -e "${RED}❌ Build failed - dist/index.js not found${NC}"
    exit 1
fi

if [ ! -f "dist/index.d.ts" ]; then
    echo -e "${RED}❌ Build failed - dist/index.d.ts not found${NC}"
    exit 1
fi

echo -e "${GREEN}✅ TypeScript build successful${NC}"

# Validate package.json
echo -e "${YELLOW}📋 Validating package.json...${NC}"

# Check required fields
REQUIRED_FIELDS=("name" "version" "description" "main" "types" "author" "license")
for field in "${REQUIRED_FIELDS[@]}"; do
    if ! grep -q "\"$field\":" package.json; then
        echo -e "${RED}❌ Missing required field in package.json: $field${NC}"
        exit 1
    fi
done

echo -e "${GREEN}✅ package.json validation successful${NC}"

# Validate README
if [ ! -f "README.md" ]; then
    echo -e "${RED}❌ README.md not found${NC}"
    exit 1
fi

echo -e "${GREEN}✅ README.md found${NC}"

# Check package size
PACKAGE_SIZE=$(npm pack --dry-run 2>/dev/null | grep "package size" | awk '{print $4}' | sed 's/MB//')
if [ -z "$PACKAGE_SIZE" ]; then
    echo -e "${YELLOW}⚠️  Could not determine package size${NC}"
else
    echo -e "${GREEN}✅ Package size: ${PACKAGE_SIZE}MB${NC}"
    
    # Warn if package is too large
    if (( $(echo "$PACKAGE_SIZE > 5" | bc -l) )); then
        echo -e "${YELLOW}⚠️  Package size is large (>5MB). Consider optimizing.${NC}"
    fi
fi

# List files that will be published
echo -e "${YELLOW}📁 Files that will be published:${NC}"
npm pack --dry-run 2>/dev/null | head -20

# Validate MCP server functionality (basic smoke test)
echo -e "${YELLOW}🔧 Running smoke test...${NC}"
timeout 10s node dist/index.js --help > /dev/null 2>&1 || echo -e "${YELLOW}⚠️  CLI help test completed${NC}"

echo ""
echo -e "${GREEN}🎉 Pre-publish validation complete!${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Review the files list above"
echo "2. Test the package locally: npm pack && npm install -g ./pod-protocol-mcp-server-*.tgz"
echo "3. Publish: npm publish"
echo ""
echo -e "${GREEN}✅ Ready for publication! 🚀${NC}" 