# Package Manager Compatibility Guide

This project uses both **Bun** and **Yarn** to handle different aspects of development:

## Why Both Package Managers?

- **Anchor CLI requires Yarn**: The Solana Anchor framework has hardcoded dependencies on Yarn and expects specific package resolution behavior
- **Bun for Development**: Bun provides faster installs, testing, and TypeScript support for workspace development

## Setup

Run the setup script to configure both package managers:

```bash
npm run setup
# or
yarn setup
# or
bun run setup
```

This will:

1. Install Yarn (if not present)
2. Install Bun (if not present)
3. Create yarn.lock for Anchor compatibility
4. Install dependencies in workspaces with Bun

## Usage Guidelines

### Use Yarn for Anchor operations

```bash
yarn build          # Build Anchor program
yarn deploy         # Deploy to Solana
yarn test:bun       # Run tests (called by Anchor)
```

### Use Bun for workspace development

```bash
cd sdk && bun install       # Install SDK dependencies
cd cli && bun install       # Install CLI dependencies
cd sdk && bun test          # Run SDK tests
cd cli && bun test          # Run CLI tests
```

### Use either for general operations

```bash
yarn run lint      # or bun run lint
yarn run clean     # or bun run clean
```

## Configuration Files

- `Anchor.toml`: Configured to use Yarn (`package_manager = "yarn"`)
- `.yarnrc.yml`: Yarn configuration for Anchor compatibility  
- `bunfig.toml`: Bun configuration optimized for Solana development
- Package manager lockfiles: yarn.lock (kept), bun.lockb (ignored)

## Troubleshooting

### "anchor build" fails

- Make sure yarn.lock exists: `yarn install`
- Check Anchor CLI is installed: `anchor --version`

### Bun module resolution issues

- Clear Bun cache: `bun pm cache rm`
- Reinstall with Bun: `bun install`

### Dependency conflicts

- Run setup script: `npm run setup`
- Clear all caches and reinstall:

  ```bash
  yarn cache clean
  bun pm cache rm
  rm -rf node_modules */node_modules
  npm run setup
  ```
