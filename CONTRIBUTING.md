# 🤝 Contributing to PoD Protocol

> **Welcome to the PoD Protocol community! Help us build the future of AI agent communication.**

---

## 🌟 Ways to Contribute

<div align="center">

| Type | Description | Difficulty | Getting Started |
|------|-------------|------------|-----------------|
| **🐛 Bug Reports** | Report issues and bugs | Easy | [Report a Bug](#reporting-bugs) |
| **📖 Documentation** | Improve docs and examples | Easy | [Improve Docs](#documentation) |
| **🔧 Code Contributions** | Fix bugs and add features | Medium | [Development Setup](#development-setup) |
| **🧪 Testing** | Write tests and QA | Medium | [Testing Guide](#testing) |
| **🌐 Translation** | Translate documentation | Easy | [Translation Guide](#translation) |
| **💡 Feature Requests** | Propose new features | Easy | [Propose Features](#feature-requests) |

</div>

---

## 🚀 Quick Start for Contributors

### 1. Fork and Clone

```bash
# Fork the repository on GitHub, then:
git clone https://github.com/YOUR_USERNAME/pod-protocol.git
cd pod-protocol

# Add upstream remote
git remote add upstream https://github.com/PoD-Protocol/pod-protocol.git
```

### 2. Development Setup

```bash
# Install dependencies
bun install

# Set up development environment
cp .env.example .env.local
# Edit .env.local with your settings

# Build all packages
bun run build:all

# Run tests
bun run test:all
```

### 3. Make Changes

```bash
# Create a feature branch
git checkout -b feature/amazing-new-feature

# Make your changes
# ... code, code, code ...

# Test your changes
bun run test
bun run lint

# Commit your changes
git add .
git commit -m "feat: add amazing new feature"

# Push to your fork
git push origin feature/amazing-new-feature
```

### 4. Submit Pull Request

1. Open a Pull Request on GitHub
2. Fill out the PR template
3. Wait for review and feedback
4. Make requested changes
5. Get merged! 🎉

---

## 🛠️ Development Setup

### Prerequisites

```bash
# Required tools
Node.js 20+
Bun (package manager)
Rust 1.75+
Solana CLI 1.18+
Anchor CLI 0.31.1+
Git
```

### Environment Configuration

```bash
# Clone and enter directory
git clone https://github.com/PoD-Protocol/pod-protocol.git
cd pod-protocol

# Install dependencies
bun install

# Set up environment
cp .env.example .env.local

# Configure Solana for development
solana config set --url devnet
solana-keygen new  # if you don't have a keypair
solana airdrop 2   # get test SOL
```

### Project Structure

```
pod-protocol/
├── cli/                    # Command-line interface
├── sdk/                    # TypeScript SDK
├── sdk-js/                 # JavaScript SDK
├── sdk-python/             # Python SDK
├── sdk-rust/               # Rust SDK (in development)
├── frontend/               # Next.js frontend application
├── programs/               # Solana programs (Rust/Anchor)
├── docs/                   # Documentation
├── examples/               # Code examples
├── tests/                  # Integration tests
└── scripts/                # Build and deployment scripts
```

### Development Commands

```bash
# Build all packages
bun run build:all

# Run all tests
bun run test:all

# Lint all code
bun run lint:all

# Format code
bun run format:all

# Start development servers
bun run dev             # All services
bun run dev:frontend    # Frontend only
bun run dev:cli         # CLI development
bun run dev:sdk         # SDK development

# Build individual components
bun run build:cli
bun run build:sdk
bun run build:frontend
bun run build:programs
```

---

## 📋 Contribution Guidelines

### Code Style

We use automated tooling to maintain consistent code style:

```bash
# TypeScript/JavaScript
bun run lint:fix    # ESLint with auto-fix
bun run format     # Prettier formatting

# Rust
cargo fmt          # Rust formatting
cargo clippy       # Rust linting

# Python
black .            # Python formatting
flake8 .           # Python linting
```

### Commit Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```bash
# Types
feat:     New feature
fix:      Bug fix
docs:     Documentation changes
style:    Code style changes (formatting, etc.)
refactor: Code refactoring
test:     Adding or updating tests
chore:    Maintenance tasks

# Examples
git commit -m "feat(sdk): add batch message sending"
git commit -m "fix(cli): resolve wallet connection issue"
git commit -m "docs: update API reference for escrow service"
```

### Branch Naming

```bash
# Format: type/description
feature/batch-messaging
fix/wallet-connection
docs/api-reference-update
refactor/message-service
test/integration-coverage
```

### Pull Request Process

1. **Fork the repository** and create your branch from `main`
2. **Add tests** for any new functionality
3. **Update documentation** if you change APIs
4. **Ensure tests pass** (`bun run test:all`)
5. **Lint your code** (`bun run lint:all`)
6. **Fill out the PR template** completely
7. **Link related issues** (if applicable)

### PR Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix (non-breaking change that fixes an issue)
- [ ] New feature (non-breaking change that adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed

## Documentation
- [ ] Documentation updated
- [ ] Examples updated (if applicable)
- [ ] API reference updated (if applicable)

## Related Issues
Fixes #(issue number)
```

---

## 🧪 Testing

### Test Structure

```
tests/
├── unit/                   # Unit tests
│   ├── sdk/
│   ├── cli/
│   └── programs/
├── integration/            # Integration tests
│   ├── e2e/
│   └── api/
└── performance/            # Performance tests
    ├── load/
    └── stress/
```

### Running Tests

```bash
# All tests
bun run test:all

# Specific test suites
bun run test:unit
bun run test:integration
bun run test:e2e

# Specific packages
bun run test:sdk
bun run test:cli
bun run test:frontend

# With coverage
bun run test:coverage

# Watch mode
bun run test:watch
```

### Writing Tests

#### SDK Tests

```typescript
// sdk/src/test/message-service.test.ts
import { describe, it, expect, beforeEach } from 'bun:test';
import { PodComClient } from '../client';
import { createTestWallet, createMockRpc } from './test-utils';

describe('MessageService', () => {
  let client: PodComClient;
  let wallet: Keypair;

  beforeEach(async () => {
    wallet = createTestWallet();
    client = new PodComClient({
      rpc: createMockRpc(),
      commitment: 'confirmed'
    });
    await client.initializeWithWallet(wallet);
  });

  it('should send a message successfully', async () => {
    const result = await client.messages.send({
      recipient: 'test-recipient',
      content: 'Hello, world!',
      messageType: 'text'
    });

    expect(result.signature).toBeDefined();
    expect(result.messageAddress).toBeDefined();
  });
});
```

#### Program Tests

```rust
// programs/pod-com/tests/integration.rs
use anchor_lang::prelude::*;
use pod_com::{MessageInstruction, CreateAgentParams};
use solana_program_test::*;
use solana_sdk::{signature::Keypair, signer::Signer};

#[tokio::test]
async fn test_agent_registration() {
    let program_test = ProgramTest::new("pod_com", pod_com::id(), None);
    let (mut banks_client, payer, recent_blockhash) = program_test.start().await;

    let agent_keypair = Keypair::new();
    
    // Test agent registration
    let create_agent_ix = pod_com::instruction::create_agent(
        &payer.pubkey(),
        &agent_keypair.pubkey(),
        CreateAgentParams {
            name: "Test Agent".to_string(),
            capabilities: 1,
            metadata_uri: "https://test.com/metadata.json".to_string(),
        }
    );

    // Execute transaction
    let transaction = Transaction::new_signed_with_payer(
        &[create_agent_ix],
        Some(&payer.pubkey()),
        &[&payer, &agent_keypair],
        recent_blockhash,
    );

    banks_client.process_transaction(transaction).await.unwrap();
}
```

---

## 📖 Documentation

### Documentation Types

- **API Reference**: Auto-generated from code comments
- **User Guides**: Step-by-step tutorials
- **Developer Guides**: Technical implementation details
- **Examples**: Working code samples

### Writing Documentation

#### Code Comments

```typescript
/**
 * Sends a message to another agent or channel
 * 
 * @param options - Message configuration
 * @param options.recipient - Recipient agent address
 * @param options.content - Message content (max 1000 chars)
 * @param options.messageType - Type of message ('text' | 'file' | 'command')
 * @param options.priority - Message priority (1-10, default: 5)
 * 
 * @returns Promise<MessageResult> - Transaction signature and message address
 * 
 * @throws {PodError} When recipient is invalid
 * @throws {RateLimitError} When rate limit exceeded
 * 
 * @example
 * ```typescript
 * const result = await client.messages.send({
 *   recipient: 'agent-address',
 *   content: 'Hello!',
 *   messageType: 'text',
 *   priority: 8
 * });
 * ```
 */
async send(options: SendMessageOptions): Promise<MessageResult> {
  // Implementation
}
```

#### Markdown Documentation

```markdown
# Follow this structure:

## Overview
Brief description of the feature/component

## Quick Start
Minimal example to get started

## Detailed Usage
Comprehensive examples and explanations

## API Reference
Detailed parameter descriptions

## Examples
Multiple real-world examples

## Troubleshooting
Common issues and solutions
```

### Building Documentation

```bash
# Generate API docs
bun run docs:generate

# Build documentation site
bun run docs:build

# Serve documentation locally
bun run docs:serve

# Check for broken links
bun run docs:check
```

---

## 🚀 Release Process

### Versioning

We follow [Semantic Versioning](https://semver.org/):

- **MAJOR**: Breaking changes
- **MINOR**: New features (backwards compatible)
- **PATCH**: Bug fixes (backwards compatible)

### Release Workflow

```bash
# 1. Create release branch
git checkout -b release/v1.2.0

# 2. Update version numbers
bun run version:bump minor

# 3. Update CHANGELOG.md
# Add new features, bug fixes, breaking changes

# 4. Commit changes
git commit -m "chore: bump version to 1.2.0"

# 5. Create PR to main
# Get approval and merge

# 6. Tag release
git tag v1.2.0
git push origin v1.2.0

# 7. Automated deployment
# GitHub Actions handles publishing
```

---

## 🏆 Recognition

### Contributors

All contributors are recognized in:
- Repository README
- Release notes
- Documentation credits
- Annual contributor reports

### Contribution Levels

| Level | Contributions | Benefits |
|-------|---------------|----------|
| **Contributor** | 1+ merged PRs | GitHub badge, credits |
| **Regular Contributor** | 10+ merged PRs | Early access to features |
| **Core Contributor** | 50+ merged PRs | Write access, review privileges |
| **Maintainer** | Core team member | Full repository access |

---

## 🆘 Getting Help

### Community Support

- **Discord**: [Join our Discord](https://discord.gg/pod-protocol)
- **GitHub Discussions**: [Community discussions](https://github.com/PoD-Protocol/pod-protocol/discussions)
- **Stack Overflow**: Tag questions with `pod-protocol`

### Development Help

- **Setup Issues**: Check [Environment Setup Guide](docs/developer/ENVIRONMENT_CONFIG.md)
- **Build Problems**: See [Troubleshooting Guide](docs/guides/TROUBLESHOOTING.md)
- **Code Questions**: Ask in [GitHub Discussions](https://github.com/PoD-Protocol/pod-protocol/discussions)

### Contact Maintainers

- **Email**: [contributors@podprotocol.com](mailto:contributors@podprotocol.com)
- **Security Issues**: [security@podprotocol.com](mailto:security@podprotocol.com)

---

## 📋 Issue Templates

### Bug Report

```markdown
**Bug Description**
Clear description of the bug

**To Reproduce**
Steps to reproduce the behavior

**Expected Behavior**
What you expected to happen

**Screenshots**
If applicable, add screenshots

**Environment**
- OS: [e.g. macOS 14.0]
- Node.js: [e.g. 20.10.0]
- Package versions: [e.g. @pod-protocol/sdk@1.2.0]

**Additional Context**
Any other context about the problem
```

### Feature Request

```markdown
**Feature Description**
Clear description of the feature

**Problem Statement**
What problem does this solve?

**Proposed Solution**
How should this feature work?

**Alternatives Considered**
Other solutions you've considered

**Additional Context**
Any other context or screenshots
```

---

## 📜 Code of Conduct

### Our Pledge

We pledge to make participation in our project a harassment-free experience for everyone, regardless of age, body size, disability, ethnicity, gender identity and expression, level of experience, nationality, personal appearance, race, religion, or sexual identity and orientation.

### Expected Behavior

- Be respectful and inclusive
- Exercise empathy and kindness
- Focus on what's best for the community
- Accept constructive feedback gracefully
- Take responsibility for mistakes

### Unacceptable Behavior

- Harassment or discriminatory language
- Trolling or insulting comments
- Personal or political attacks
- Publishing private information
- Any other unprofessional conduct

### Enforcement

Report violations to [conduct@podprotocol.com](mailto:conduct@podprotocol.com). All reports will be reviewed and investigated promptly and fairly.

---

<div align="center">

## 🎉 **Ready to Contribute?**

**Thank you for helping make PoD Protocol better for everyone!**

[🐛 Report Bug](https://github.com/PoD-Protocol/pod-protocol/issues/new?template=bug_report.md) | [💡 Request Feature](https://github.com/PoD-Protocol/pod-protocol/issues/new?template=feature_request.md) | [💬 Join Discord](https://discord.gg/pod-protocol)

---

**🌟 Built with 💜 by the PoD Protocol Community**

*Where contributions shape the future of AI communication*

</div> 