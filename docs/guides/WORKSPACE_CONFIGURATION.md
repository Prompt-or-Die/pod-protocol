# Workspace Configuration Guide

This guide covers the workspace structure, build system, and package management for the PoD Protocol project.

## Workspace Overview

PoD Protocol uses a **monorepo structure** with multiple packages managed through workspace configuration:

```
PoD-Protocol-1/
├── package.json          # Root workspace configuration
├── sdk/                  # TypeScript SDK package
│   └── package.json      # SDK-specific configuration
├── cli/                  # Command-line interface package
│   └── package.json      # CLI-specific configuration
├── frontend/             # Next.js frontend application
│   └── package.json      # Frontend-specific configuration
└── programs/             # Rust Solana programs
    └── pod-com/          # Core protocol program
        └── Cargo.toml    # Rust package configuration
```

## Package Management

### Supported Package Managers

The project supports multiple package managers:

1. **Bun** (Recommended for development)
2. **Yarn** (Primary for CI/CD)
3. **npm** (Fallback support)

### Configuration Files

#### Root Workspace (`package.json`)

```json
{
  "name": "pod-protocol",
  "version": "1.2.0",
  "private": true,
  "type": "module",
  "workspaces": [
    "sdk",
    "cli",
    "frontend"
  ]
}
```

**Key Features:**
- **Private workspace**: Not published to npm
- **ES Modules**: Uses `"type": "module"`
- **Unified scripts**: Coordinates builds across packages
- **Version synchronization**: All packages use same version

#### SDK Package (`sdk/package.json`)

```json
{
  "name": "@pod-protocol/sdk",
  "version": "1.2.0",
  "type": "module",
  "main": "dist/index.esm.js",
  "types": "dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.esm.js",
      "require": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  }
}
```

**Key Features:**
- **Dual format**: Supports both ESM and CommonJS
- **TypeScript support**: Includes type definitions
- **Modern exports**: Uses package.json exports field

#### CLI Package (`cli/package.json`)

```json
{
  "name": "@pod-protocol/cli",
  "version": "1.2.0",
  "type": "module",
  "bin": {
    "pod": "dist/index.js",
    "pod": "dist/index.js"
  }
}
```

**Key Features:**
- **Binary exports**: Provides `pod` command
- **ES Modules**: Native ESM support
- **TypeScript compilation**: Built with `tsc`

## Build System

### Build Scripts

The root workspace provides unified build commands:

```bash
# Build all packages
bun run build:all

# Build with verification
bun run build:verify

# Production build
bun run build:prod

# Build only Anchor program
bun run build:idl
```

### Build Process

1. **Anchor Program Build**:
   ```bash
   anchor build
   ```
   - Compiles Rust program to BPF bytecode
   - Generates IDL (Interface Definition Language) files
   - Outputs to `target/deploy/`

2. **SDK Build**:
   ```bash
   cd sdk && bun run build
   ```
   - Uses Rollup for bundling
   - Generates ESM and CommonJS outputs
   - Creates TypeScript declarations

3. **CLI Build**:
   ```bash
   cd cli && bun run build
   ```
   - Uses TypeScript compiler (`tsc`)
   - Outputs to `dist/` directory
   - Preserves ES module structure

4. **Frontend Build**:
   ```bash
   cd frontend && bun run build
   ```
   - Next.js production build
   - Static optimization
   - Asset bundling

### Build Tools Configuration

#### Rollup (SDK)

```javascript
// sdk/rollup.config.js
export default {
  input: 'src/index.ts',
  output: [
    {
      file: 'dist/index.esm.js',
      format: 'esm'
    },
    {
      file: 'dist/index.js',
      format: 'cjs'
    }
  ],
  plugins: [
    typescript(),
    resolve(),
    commonjs()
  ]
}
```

#### TypeScript (CLI)

```json
// cli/tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "outDir": "dist",
    "rootDir": "src"
  }
}
```

## Dependency Management

### Workspace Dependencies

Dependencies are managed at different levels:

1. **Root Level**: Shared development tools
   - Build scripts
   - Linting tools
   - Testing frameworks

2. **Package Level**: Package-specific dependencies
   - Runtime dependencies
   - Package-specific dev tools

### Version Synchronization

All packages maintain the same version number:
- Root: `1.2.0`
- SDK: `1.2.0`
- CLI: `1.2.0`
- Frontend: `1.2.0`

### Lock Files

Multiple lock files are maintained:
- `bun.lock` - Bun dependencies
- `yarn.lock` - Yarn dependencies
- `package-lock.json` - npm dependencies (if present)

## Development Workflow

### Setup

```bash
# Install dependencies
bun install

# Setup package managers
bun run setup

# Build all packages
bun run build:all
```

### Development Commands

```bash
# Run tests across all packages
bun run test:all

# Lint all packages
bun run lint:all

# Clean build artifacts
bun run clean

# Development mode
bun run dev
```

### Package-Specific Development

```bash
# SDK development
cd sdk
bun run dev        # Watch mode
bun run test       # Run tests
bun run lint       # Lint code

# CLI development
cd cli
bun run dev        # Development mode
bun run test       # Run tests
bun run lint       # Lint code

# Frontend development
cd frontend
bun run dev        # Next.js dev server
bun run build      # Production build
bun run start      # Start production server
```

## CI/CD Integration

### GitHub Actions

The workspace is configured for automated CI/CD:

```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v1
      - run: bun install
      - run: bun run ci:build
      - run: bun run ci:test
```

### Build Verification

Automated checks ensure build integrity:

```bash
# Verify all builds work
bun run build:verify

# Production readiness test
bun run production:test

# Validate GitHub workflows
bun run validate:workflows
```

## Configuration Files

### Bun Configuration

```toml
# bunfig.toml
[install]
registry = "https://registry.npmjs.org/"
frozenLockfile = true

[install.scopes]
"@solana" = "https://registry.npmjs.org/"
"@lightprotocol" = "https://registry.npmjs.org/"
```

### Yarn Configuration

```yaml
# .yarnrc.yml
nodeLinker: node-modules
yarnPath: .yarn/releases/yarn-4.0.2.cjs
```

### TypeScript Configuration

```json
// tsconfig.json (Root)
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true
  },
  "references": [
    { "path": "./sdk" },
    { "path": "./cli" },
    { "path": "./frontend" }
  ]
}
```

## Best Practices

### Version Management

1. **Synchronized Versions**: Keep all packages at the same version
2. **Semantic Versioning**: Follow semver for releases
3. **Lock File Commits**: Commit lock files for reproducible builds

### Dependency Management

1. **Minimal Dependencies**: Only add necessary dependencies
2. **Security Updates**: Regularly update dependencies
3. **Peer Dependencies**: Use peer deps for shared libraries

### Build Optimization

1. **Incremental Builds**: Use build caching where possible
2. **Parallel Builds**: Build packages in parallel when safe
3. **Build Verification**: Always verify builds before release

### Development Experience

1. **Fast Feedback**: Use watch modes for development
2. **Consistent Tooling**: Use same tools across packages
3. **Clear Scripts**: Provide clear, documented npm scripts

## Troubleshooting

### Common Issues

1. **Version Mismatches**:
   ```bash
   # Check versions
   grep -r '"version"' */package.json
   
   # Sync versions
   # Update all package.json files to match
   ```

2. **Build Failures**:
   ```bash
   # Clean and rebuild
   bun run clean
   bun run build:all
   
   # Check individual packages
   cd sdk && bun run build
   cd cli && bun run build
   ```

3. **Dependency Issues**:
   ```bash
   # Clear caches
   rm -rf node_modules
   rm bun.lock yarn.lock
   
   # Reinstall
   bun install
   ```

### Debug Commands

```bash
# Check workspace structure
bun run verify:build

# Validate configurations
bun run validate:workflows

# Test production build
bun run production:test
```

## References

- [Bun Workspaces](https://bun.sh/docs/install/workspaces)
- [Yarn Workspaces](https://yarnpkg.com/features/workspaces)
- [npm Workspaces](https://docs.npmjs.com/cli/v7/using-npm/workspaces)
- [TypeScript Project References](https://www.typescriptlang.org/docs/handbook/project-references.html)
- [Rollup Configuration](https://rollupjs.org/configuration-options/)