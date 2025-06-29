# Master Setup Workflow

## Purpose
This workflow provides the comprehensive master setup process for new POD Protocol projects, ensuring consistent initialization, configuration, and development environment setup.

---

## Project Initialization

### Prerequisites Check

#### System Requirements
```bash
# Check required software versions
node --version          # >= 18.0.0
bun --version          # >= 1.0.0
git --version          # >= 2.30.0
docker --version       # >= 20.10.0
```

#### Development Tools
- **Code Editor**: VS Code with recommended extensions
- **Terminal**: Modern terminal with shell completion
- **Git Configuration**: User name and email configured
- **SSH Keys**: Set up for GitHub/repository access
- **Environment Variables**: Development environment configured

#### Account Access
- [ ] **GitHub/GitLab** access with appropriate permissions
- [ ] **NPM registry** access for package publishing
- [ ] **Docker Hub** or container registry access
- [ ] **Cloud provider** credentials (if applicable)
- [ ] **Third-party services** API keys and credentials

### Project Structure Creation

#### Repository Setup
```bash
# Clone or create new repository
git clone https://github.com/pod-protocol/new-project.git
cd new-project

# Initialize if creating from scratch
git init
git remote add origin https://github.com/pod-protocol/new-project.git

# Create standard directory structure
mkdir -p {packages,docs,scripts,tests,config}
mkdir -p .cursor/{rules,workflows,memory}
mkdir -p .github/{workflows,ISSUE_TEMPLATE}
```

#### Essential Files Creation
```bash
# Create root package.json
cat > package.json << EOF
{
  "name": "@pod-protocol/new-project",
  "version": "0.1.0",
  "private": true,
  "workspaces": ["packages/*"],
  "scripts": {
    "build": "bun run build --recursive",
    "test": "bun run test --recursive",
    "lint": "eslint packages/",
    "format": "prettier --write packages/"
  },
  "devDependencies": {
    "eslint": "^8.0.0",
    "prettier": "^3.0.0",
    "typescript": "^5.0.0"
  }
}
EOF

# Create .gitignore
cat > .gitignore << EOF
node_modules/
dist/
build/
.env*
!.env.example
*.log
.DS_Store
coverage/
.nyc_output/
EOF

# Create README.md
cat > README.md << EOF
# POD Protocol - New Project

## Overview
Brief description of the project and its purpose.

## Getting Started
\`\`\`bash
bun install
bun run build
bun run test
\`\`\`

## Documentation
See [docs/](./docs/) for detailed documentation.
EOF
```

---

## Cursor Workspace Setup

### Required Rule Files

#### Copy Standard Rules
```bash
# Copy rule files from template or existing project
cp ../template/.cursor/rules/* .cursor/rules/

# Or create from scratch using standard templates
./scripts/setup-cursor-rules.sh
```

#### Verify Rule Files
```bash
# Check all required rule files exist
REQUIRED_RULES=(
  "coding_standards.md"
  "architecture_patterns.md"
  "security_protocols.md"
  "testing_standards.md"
  "documentation_guidelines.md"
  "performance_guidelines.md"
  "api_standards.md"
  "compliance_checklist.md"
  "runtime_preferences.md"
)

for rule in "${REQUIRED_RULES[@]}"; do
  if [[ ! -f ".cursor/rules/$rule" ]]; then
    echo "Missing rule file: $rule"
    exit 1
  fi
done
echo "All rule files present ✓"
```

### Memory Files Initialization

#### Create Base Memory Files
```bash
# Initialize activeContext.md
cat > .cursor/memory/activeContext.md << EOF
# Active Context

## Current Objective
Project setup and initialization for new POD Protocol project.

## Current Session State
- **Status**: SETTING_UP
- **Phase**: Initial project configuration
- **Focus**: Repository structure and development environment

## Active Tasks
- [ ] Complete project initialization
- [ ] Set up development environment
- [ ] Configure CI/CD pipeline
- [ ] Create initial documentation

## Blockers
None currently identified.

## Recent Decisions
- Using bun as primary runtime
- Following POD Protocol standards
- Implementing monorepo structure

## Next Steps
1. Complete workspace setup
2. Initialize package structure
3. Configure build pipeline
4. Set up testing framework
EOF

# Initialize productContext.md
cat > .cursor/memory/productContext.md << EOF
# Product Context

## Project Overview
**Name**: New POD Protocol Project
**Type**: [Specify: SDK, API, Frontend, CLI, etc.]
**Purpose**: [Brief description of project purpose]

## Architecture
- **Language**: TypeScript/JavaScript (primary), Rust (if applicable)
- **Runtime**: Bun
- **Database**: [TBD]
- **Framework**: [TBD]

## Package Structure
\`\`\`
packages/
├── core/           # Core functionality
├── api/           # API server (if applicable)
├── frontend/      # UI components (if applicable)
├── cli/           # Command line tools (if applicable)
└── docs/          # Documentation
\`\`\`

## Dependencies
- Core: TypeScript, Bun
- Testing: Vitest, Playwright
- Linting: ESLint, Prettier
- Build: [TBD based on project type]

## Integration Points
[List external services and integrations]
EOF

# Initialize progress.md
cat > .cursor/memory/progress.md << EOF
# Progress Log

## Project Setup Progress

### Completed ✅
- [x] Repository initialization
- [x] Basic project structure
- [x] Cursor workspace setup

### In Progress 🔄
- [ ] Development environment configuration
- [ ] Package initialization
- [ ] CI/CD setup

### Planned 📋
- [ ] Documentation structure
- [ ] Testing framework setup
- [ ] Security configuration
- [ ] Performance monitoring

## Metrics
- **Setup Progress**: 30%
- **Files Created**: 15
- **Packages Configured**: 0/4
- **Tests Written**: 0
EOF
```

### Workflow Files Setup

#### Copy Standard Workflows
```bash
# Copy workflow files from template
WORKFLOW_FILES=(
  "project_initialization.md"
  "feature_development.md"
  "deployment_process.md"
  "status_check.md"
  "duplication_prevention.md"
  "incident_response.md"
  "release_management.md"
  "refactoring.md"
  "dependency_review.md"
  "master_setup.md"
)

for workflow in "${WORKFLOW_FILES[@]}"; do
  if [[ ! -f ".cursor/workflows/$workflow" ]]; then
    echo "Missing workflow file: $workflow"
    ./scripts/create-workflow.sh "$workflow"
  fi
done
```

---

## Development Environment Configuration

### Bun Configuration

#### Create bunfig.toml
```toml
# bunfig.toml
[install]
# Use exact versions for reproducible builds
exact = true

# Configure registry
registry = "https://registry.npmjs.org"

# Development optimizations
dev = true
peer = true

[install.scopes]
"@pod-protocol" = { registry = "https://registry.npmjs.org" }
```

#### Package Manager Setup
```bash
# Initialize bun workspace
echo '{ "workspaces": ["packages/*"] }' > package.json

# Install core dependencies
bun add -D typescript @types/node
bun add -D eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin
bun add -D prettier
bun add -D vitest @vitest/ui
bun add -D husky lint-staged
```

### TypeScript Configuration

#### Root tsconfig.json
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true,
    "esModuleInterop": true,
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@pod-protocol/*": ["./packages/*/src"]
    }
  },
  "include": ["src/**/*", "packages/*/src/**/*"],
  "exclude": ["node_modules", "dist", "build"]
}
```

#### Package-specific tsconfig
```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"],
  "exclude": ["dist", "node_modules", "**/*.test.ts"]
}
```

### Code Quality Setup

#### ESLint Configuration
```javascript
// eslint.config.js
module.exports = {
  root: true,
  env: {
    node: true,
    es2022: true,
  },
  extends: [
    'eslint:recommended',
    '@typescript-eslint/recommended',
    'prettier',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint'],
  rules: {
    '@typescript-eslint/no-unused-vars': 'error',
    '@typescript-eslint/explicit-function-return-type': 'warn',
    'prefer-const': 'error',
    'no-var': 'error',
  },
  ignorePatterns: ['dist/', 'node_modules/', '*.js'],
};
```

#### Prettier Configuration
```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 80,
  "tabWidth": 2,
  "useTabs": false,
  "quoteProps": "as-needed",
  "bracketSpacing": true,
  "arrowParens": "avoid"
}
```

---

## Package Structure Setup

### Core Package Creation

#### Create Core Package
```bash
# Create core package structure
mkdir -p packages/core/src/{lib,types,utils}
mkdir -p packages/core/{tests,docs}

# Package.json for core
cat > packages/core/package.json << EOF
{
  "name": "@pod-protocol/core",
  "version": "0.1.0",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    }
  },
  "scripts": {
    "build": "tsc",
    "test": "vitest",
    "lint": "eslint src/",
    "format": "prettier --write src/"
  },
  "dependencies": {},
  "devDependencies": {
    "typescript": "^5.0.0",
    "vitest": "^0.34.0"
  }
}
EOF

# Core index.ts
cat > packages/core/src/index.ts << EOF
/**
 * POD Protocol Core Package
 * 
 * This package provides core functionality for the POD Protocol ecosystem.
 */

export * from './lib';
export * from './types';
export * from './utils';
EOF

# Create basic types
cat > packages/core/src/types/index.ts << EOF
/**
 * Core type definitions for POD Protocol
 */

export interface BaseConfig {
  environment: 'development' | 'staging' | 'production';
  debug?: boolean;
}

export interface Logger {
  info(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  error(message: string, ...args: any[]): void;
  debug(message: string, ...args: any[]): void;
}
EOF
```

### Testing Setup

#### Vitest Configuration
```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      threshold: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80,
        },
      },
    },
  },
});
```

#### Example Test File
```typescript
// packages/core/tests/example.test.ts
import { describe, it, expect } from 'vitest';

describe('Core Package', () => {
  it('should have basic functionality', () => {
    expect(true).toBe(true);
  });
  
  it('should export main modules', async () => {
    const coreModule = await import('../src/index');
    expect(coreModule).toBeDefined();
  });
});
```

---

## CI/CD Pipeline Setup

### GitHub Actions Configuration

#### Main CI Pipeline
```yaml
# .github/workflows/ci.yml
name: CI Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - uses: oven-sh/setup-bun@v1
        with:
          bun-version: latest
          
      - name: Install dependencies
        run: bun install
        
      - name: Lint code
        run: bun run lint
        
      - name: Type check
        run: bun run type-check
        
      - name: Run tests
        run: bun run test:coverage
        
      - name: Build packages
        run: bun run build
        
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage/lcov.info
```

#### Security Scanning
```yaml
# .github/workflows/security.yml
name: Security Scan

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
  schedule:
    - cron: '0 0 * * 1'  # Weekly

jobs:
  security:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - uses: oven-sh/setup-bun@v1
        
      - name: Install dependencies
        run: bun install
        
      - name: Run security audit
        run: bun audit
        
      - name: Run Snyk to check for vulnerabilities
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
```

### Pre-commit Hooks

#### Husky Setup
```bash
# Install and configure husky
bun add -D husky lint-staged
bunx husky install

# Create pre-commit hook
bunx husky add .husky/pre-commit "bunx lint-staged"
bunx husky add .husky/commit-msg 'bunx commitlint --edit "$1"'
```

#### Lint-staged Configuration
```json
{
  "lint-staged": {
    "**/*.{ts,tsx,js,jsx}": [
      "eslint --fix",
      "prettier --write"
    ],
    "**/*.{json,md,yml,yaml}": [
      "prettier --write"
    ]
  }
}
```

---

## Documentation Setup

### Documentation Structure

#### Create Documentation Framework
```bash
# Create documentation structure
mkdir -p docs/{api,guides,architecture,deployment}

# Main documentation index
cat > docs/README.md << EOF
# POD Protocol Project Documentation

## Overview
This directory contains comprehensive documentation for the POD Protocol project.

## Structure
- [\`api/\`](./api/) - API documentation and reference
- [\`guides/\`](./guides/) - User and developer guides
- [\`architecture/\`](./architecture/) - Architecture decisions and design
- [\`deployment/\`](./deployment/) - Deployment and operations guides

## Getting Started
1. [Installation Guide](./guides/installation.md)
2. [Quick Start](./guides/quick-start.md)
3. [API Reference](./api/README.md)

## Contributing
See [CONTRIBUTING.md](../CONTRIBUTING.md) for development guidelines.
EOF

# Create installation guide
cat > docs/guides/installation.md << EOF
# Installation Guide

## Prerequisites
- Node.js >= 18.0.0
- Bun >= 1.0.0
- Git >= 2.30.0

## Installation
\`\`\`bash
# Clone the repository
git clone https://github.com/pod-protocol/new-project.git
cd new-project

# Install dependencies
bun install

# Build packages
bun run build

# Run tests
bun run test
\`\`\`

## Development Setup
See [Development Guide](./development.md) for detailed setup instructions.
EOF
```

### API Documentation Setup

#### Configure API Documentation
```bash
# Install documentation tools
bun add -D typedoc @typedoc/plugin-markdown

# Create typedoc configuration
cat > typedoc.json << EOF
{
  "entryPoints": ["packages/*/src/index.ts"],
  "out": "docs/api",
  "plugin": ["@typedoc/plugin-markdown"],
  "readme": "none",
  "excludePrivate": true,
  "excludeProtected": true,
  "excludeInternal": true
}
EOF
```

---

## Security Configuration

### Environment Variables

#### Create Environment Template
```bash
# .env.example
NODE_ENV=development
LOG_LEVEL=debug

# Database
DATABASE_URL="postgresql://username:password@localhost:5432/database"

# API Keys (example)
# API_KEY_SERVICE_NAME=""

# Security
JWT_SECRET="your-jwt-secret-here"
ENCRYPTION_KEY="your-encryption-key-here"

# External Services
# THIRD_PARTY_API_URL=""
# THIRD_PARTY_API_KEY=""
```

#### Security Headers Configuration
```typescript
// packages/api/src/middleware/security.ts
import { Request, Response, NextFunction } from 'express';

export const securityHeaders = (req: Request, res: Response, next: NextFunction) => {
  // Security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  next();
};
```

### Secrets Management

#### Create Secrets Configuration
```typescript
// packages/core/src/config/secrets.ts
export interface SecretsConfig {
  jwtSecret: string;
  encryptionKey: string;
  databaseUrl: string;
}

export function loadSecrets(): SecretsConfig {
  const requiredSecrets = [
    'JWT_SECRET',
    'ENCRYPTION_KEY',
    'DATABASE_URL'
  ];
  
  for (const secret of requiredSecrets) {
    if (!process.env[secret]) {
      throw new Error(`Missing required environment variable: ${secret}`);
    }
  }
  
  return {
    jwtSecret: process.env.JWT_SECRET!,
    encryptionKey: process.env.ENCRYPTION_KEY!,
    databaseUrl: process.env.DATABASE_URL!,
  };
}
```

---

## Monitoring and Observability

### Logging Setup

#### Configure Structured Logging
```typescript
// packages/core/src/lib/logger.ts
import { Logger } from '../types';

export class StructuredLogger implements Logger {
  private context: string;
  
  constructor(context: string) {
    this.context = context;
  }
  
  private log(level: string, message: string, ...args: any[]) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      context: this.context,
      message,
      data: args.length > 0 ? args : undefined,
    };
    
    console.log(JSON.stringify(logEntry));
  }
  
  info(message: string, ...args: any[]) {
    this.log('INFO', message, ...args);
  }
  
  warn(message: string, ...args: any[]) {
    this.log('WARN', message, ...args);
  }
  
  error(message: string, ...args: any[]) {
    this.log('ERROR', message, ...args);
  }
  
  debug(message: string, ...args: any[]) {
    if (process.env.NODE_ENV === 'development') {
      this.log('DEBUG', message, ...args);
    }
  }
}

export function createLogger(context: string): Logger {
  return new StructuredLogger(context);
}
```

### Health Checks

#### Basic Health Check Implementation
```typescript
// packages/api/src/routes/health.ts
import { Router, Request, Response } from 'express';
import { createLogger } from '@pod-protocol/core';

const router = Router();
const logger = createLogger('health-check');

router.get('/health', async (req: Request, res: Response) => {
  try {
    // Basic health check
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || 'unknown',
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
    };
    
    logger.info('Health check performed', health);
    res.json(health);
  } catch (error) {
    logger.error('Health check failed', error);
    res.status(500).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check failed',
    });
  }
});

export default router;
```

---

## Finalization and Validation

### Setup Validation Script

#### Create Validation Script
```bash
#!/bin/bash
# scripts/validate-setup.sh

echo "🔍 Validating POD Protocol project setup..."

# Check required files
REQUIRED_FILES=(
  "package.json"
  "tsconfig.json"
  "eslint.config.js"
  ".prettierrc"
  "vitest.config.ts"
  ".gitignore"
  "README.md"
)

echo "📁 Checking required files..."
for file in "${REQUIRED_FILES[@]}"; do
  if [[ -f "$file" ]]; then
    echo "  ✅ $file"
  else
    echo "  ❌ $file (missing)"
    exit 1
  fi
done

# Check Cursor workspace
echo "🎯 Checking Cursor workspace..."
if [[ -d ".cursor" ]]; then
  echo "  ✅ .cursor directory exists"
  
  # Check rule files
  RULE_COUNT=$(find .cursor/rules -name "*.md" | wc -l)
  if [[ $RULE_COUNT -ge 8 ]]; then
    echo "  ✅ Rule files present ($RULE_COUNT files)"
  else
    echo "  ❌ Insufficient rule files ($RULE_COUNT files, need at least 8)"
    exit 1
  fi
  
  # Check workflow files
  WORKFLOW_COUNT=$(find .cursor/workflows -name "*.md" | wc -l)
  if [[ $WORKFLOW_COUNT -ge 8 ]]; then
    echo "  ✅ Workflow files present ($WORKFLOW_COUNT files)"
  else
    echo "  ❌ Insufficient workflow files ($WORKFLOW_COUNT files, need at least 8)"
    exit 1
  fi
  
  # Check memory files
  MEMORY_COUNT=$(find .cursor/memory -name "*.md" | wc -l)
  if [[ $MEMORY_COUNT -ge 3 ]]; then
    echo "  ✅ Memory files present ($MEMORY_COUNT files)"
  else
    echo "  ❌ Insufficient memory files ($MEMORY_COUNT files, need at least 3)"
    exit 1
  fi
else
  echo "  ❌ .cursor directory missing"
  exit 1
fi

# Check package structure
echo "📦 Checking package structure..."
if [[ -d "packages" ]]; then
  echo "  ✅ packages directory exists"
  PACKAGE_COUNT=$(find packages -maxdepth 1 -type d | wc -l)
  echo "  📊 Found $((PACKAGE_COUNT - 1)) packages"
else
  echo "  ❌ packages directory missing"
  exit 1
fi

# Test installation
echo "🧪 Testing installation..."
if bun install > /dev/null 2>&1; then
  echo "  ✅ Dependencies install successfully"
else
  echo "  ❌ Dependency installation failed"
  exit 1
fi

# Test build
echo "🔨 Testing build..."
if bun run build > /dev/null 2>&1; then
  echo "  ✅ Build successful"
else
  echo "  ❌ Build failed"
  exit 1
fi

# Test linting
echo "🔍 Testing linting..."
if bun run lint > /dev/null 2>&1; then
  echo "  ✅ Linting passed"
else
  echo "  ⚠️  Linting issues found (run 'bun run lint' for details)"
fi

echo ""
echo "🎉 Setup validation completed successfully!"
echo ""
echo "Next steps:"
echo "1. Review and customize configuration files"
echo "2. Set up environment variables (.env)"
echo "3. Configure external services and APIs"
echo "4. Start development: bun run dev"
```

### Post-Setup Tasks

#### Update Memory Files
```bash
# Update progress after setup completion
cat >> .cursor/memory/progress.md << EOF

## Setup Completion - $(date)

### Final Status ✅
- [x] Repository initialization
- [x] Cursor workspace configuration
- [x] Development environment setup
- [x] Package structure creation
- [x] CI/CD pipeline configuration
- [x] Documentation framework
- [x] Security configuration
- [x] Monitoring setup

### Validation Results
- Setup validation: PASSED
- Build test: PASSED
- Lint check: PASSED
- Dependencies: INSTALLED

### Next Phase
Project setup complete. Ready for feature development.
EOF
```

---

## Notes
- Run validation script after completing setup
- Customize configuration files based on specific project requirements
- Set up external service integrations as needed
- Update documentation with project-specific information
- Configure monitoring and alerting based on deployment environment
- Review and adjust security settings for production use 