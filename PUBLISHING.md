# PoD Protocol - Package Publishing Guide

This guide explains how to publish all PoD Protocol packages to their respective registries.

## Overview

The PoD Protocol workspace contains multiple packages that need to be published:

- **Main Package**: `pod-protocol` (NPM)
- **TypeScript SDK**: `@pod-protocol/sdk` (NPM)
- **CLI Tool**: `@pod-protocol/cli` (NPM)
- **Python SDK**: `pod-protocol-sdk` (PyPI)

## Prerequisites

### For NPM Packages
1. **NPM Account**: You need an NPM account with publish permissions
2. **Authentication**: Run `npm login` or set `NPM_TOKEN` environment variable
3. **Organization Access**: Ensure you have access to the `@pod-protocol` organization

### For Python Package
1. **PyPI Account**: You need a PyPI account with publish permissions
2. **Authentication**: Configure credentials using one of these methods:
   - `~/.pypirc` file with credentials
   - Environment variables: `TWINE_USERNAME` and `TWINE_PASSWORD`
   - API token: `TWINE_PASSWORD=pypi-...` (recommended)

### Build Tools
- **Node.js** >= 18.0.0
- **npm** or **yarn** or **bun**
- **Python** >= 3.8 (for Python SDK)
- **build** and **twine** Python packages (auto-installed if missing)

## Publishing Methods

### Method 1: Automated Publishing (Recommended)

Use the comprehensive publishing script that handles all packages:

```bash
# Dry run to check what would be published
npm run publish:dry-run

# Publish all packages
npm run publish:all

# Alternative: Use shell script directly
./scripts/publish-all.sh
```

### Method 2: Manual Publishing

Publish packages individually:

```bash
# Build all packages first
npm run build:all

# Publish TypeScript SDK
cd sdk
npm publish --access public

# Publish CLI
cd ../cli
npm publish --access public

# Publish main package
cd ..
npm publish --access public

# Publish Python SDK
cd sdk-python
python -m build
python -m twine upload dist/* --skip-existing
```

### Method 3: GitHub Actions (CI/CD)

The repository includes automated publishing workflows:

1. **Tag-based Publishing**: Create a git tag starting with `v` (e.g., `v1.5.0`)
2. **Manual Trigger**: Use GitHub Actions "workflow_dispatch" event

```bash
# Create and push a tag
git tag v1.5.0
git push origin v1.5.0
```

## Publishing Workflow

The automated publishing script follows this workflow:

1. **Pre-publish Checks**:
   - Run all tests (`npm run test:all`)
   - Run linting (`npm run lint:all`)
   - Verify builds (`npm run verify:build`)

2. **Build Packages**:
   - Build TypeScript SDK (`npm run build:prod`)
   - Build CLI (`npm run build:prod`)
   - Build main package (`npm run build:all`)

3. **Publish to Registries**:
   - Publish NPM packages to npmjs.org
   - Publish Python package to PyPI
   - Skip already published versions

4. **Summary Report**:
   - Display published packages and versions
   - Report any failures

## Version Management

### Updating Versions

Before publishing, ensure all packages have the correct version:

```bash
# Update all package versions (example: 1.5.0 -> 1.5.1)
npm version patch  # Updates root package.json

# Update SDK version
cd sdk
npm version patch

# Update CLI version
cd ../cli
npm version patch

# Update Python SDK version (edit pyproject.toml manually)
cd ../sdk-python
# Edit pyproject.toml: version = "1.5.1"
```

### Version Synchronization

Keep all packages in sync:
- Main package: `package.json` version
- SDK: `sdk/package.json` version
- CLI: `cli/package.json` version
- Python SDK: `sdk-python/pyproject.toml` version

## Troubleshooting

### Common Issues

1. **Authentication Errors**:
   ```bash
   # For NPM
   npm login
   npm whoami  # Verify login
   
   # For PyPI
   python -m twine upload --repository testpypi dist/*  # Test first
   ```

2. **Version Already Exists**:
   - The script automatically skips already published versions
   - Update version numbers before publishing

3. **Build Failures**:
   ```bash
   # Clean and rebuild
   npm run clean
   npm run build:all
   ```

4. **Missing Dependencies**:
   ```bash
   # Install all dependencies
   npm install
   cd sdk && npm install
   cd ../cli && npm install
   cd ../sdk-python && pip install -e .
   ```

### Debug Mode

Run the dry-run script to diagnose issues:

```bash
npm run publish:dry-run
```

This will:
- Check all package configurations
- Verify build artifacts
- Test registry connectivity
- Show what would be published

## Security Considerations

1. **API Tokens**: Use API tokens instead of passwords
2. **Environment Variables**: Store credentials in environment variables
3. **Two-Factor Authentication**: Enable 2FA on NPM and PyPI accounts
4. **Scope Verification**: Ensure packages are published to correct scopes

## Registry Information

### NPM Packages
- **Registry**: https://registry.npmjs.org/
- **Organization**: @pod-protocol
- **Packages**:
  - `pod-protocol` (main package)
  - `@pod-protocol/sdk` (TypeScript SDK)
  - `@pod-protocol/cli` (CLI tool)

### Python Package
- **Registry**: https://pypi.org/
- **Package**: `pod-protocol-sdk`

## Scripts Reference

| Script | Description |
|--------|-------------|
| `npm run publish:dry-run` | Simulate publishing without actual upload |
| `npm run publish:all` | Publish all packages to their registries |
| `./scripts/publish-all.sh` | Shell script version of publish:all |
| `npm run build:all` | Build all packages |
| `npm run test:all` | Run all tests |
| `npm run lint:all` | Run all linting checks |

## Support

For publishing issues:
1. Check this guide first
2. Run `npm run publish:dry-run` to diagnose
3. Check GitHub Actions logs for CI/CD issues
4. Contact the development team

---

**Note**: Always test in a development environment before publishing to production registries.