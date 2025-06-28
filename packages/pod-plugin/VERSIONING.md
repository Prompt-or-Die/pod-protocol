# Automated Versioning Guide

This package uses automated versioning and changelog generation.

## Quick Commands

```bash
# Interactive commit (recommended)
npm run commit

# Automated releases
npm run release              # Auto-detect version bump
npm run release:patch        # Force patch release 
npm run release:minor        # Force minor release
npm run release:major        # Force major release
npm run release:dry          # Test without changes
```

## Commit Format

Use conventional commits:
- `feat:` for new features (minor bump)
- `fix:` for bug fixes (patch bump)  
- `feat!:` or `BREAKING CHANGE:` for major bumps
- `docs:`, `chore:`, `refactor:`, etc. for other changes

## Examples

```bash
feat: add wallet connection support
fix: resolve memory leak in connection pool
docs: update API documentation
```

The system automatically generates changelogs and publishes to npm! 