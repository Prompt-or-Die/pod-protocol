# Web3.js v2 Migration Rollup Plan for CLIs and Interactive Scripts

## 🎯 Current Status (2025)

### ✅ Completed Components
- [x] CLI package.json updated to Web3.js v2 RC packages
- [x] AI Assistant implementation updated
- [x] Basic CLI structure with Web3.js v2 patterns
- [x] Enhanced error handling and branding
- [x] Interactive onboarding wizard base structure

### 🚧 In Progress
- [ ] CLI command implementations (agent, message, channel, etc.)
- [ ] SDK service layer complete migration  
- [ ] Interactive scripts Web3.js v2 compatibility

## 📋 Priority Rollup Tasks

### Phase 1: CLI Core (High Priority)
1. **Update CLI Commands**
   - [x] `cli/src/commands/config.ts` - Basic Web3.js v2 patterns
   - [ ] `cli/src/commands/agent.ts` - Migrate PublicKey → Address
   - [ ] `cli/src/commands/message.ts` - Update transaction building
   - [ ] `cli/src/commands/channel.ts` - RPC client updates
   - [ ] `cli/src/commands/session.ts` - KeyPairSigner patterns
   - [ ] `cli/src/commands/bundle.ts` - Transaction API updates

2. **Update CLI Utilities**
   - [x] `cli/src/utils/client.ts` - Web3.js v2 RPC creation
   - [x] `cli/src/utils/config.ts` - Keypair handling with v2
   - [ ] `cli/src/utils/validation.ts` - Address validation
   - [ ] `cli/src/utils/shared.ts` - Helper function updates

### Phase 2: Interactive Scripts (Medium Priority)
1. **Onboarding Scripts**
   - [ ] `scripts/onboarding-wizard.js` - Web3.js v2 imports
   - [ ] `scripts/sdk-setup-wizard.js` - Keypair generation with v2
   - [ ] `scripts/interactive-setup.js` - Address handling

2. **Development Scripts**
   - [x] `scripts/dev-experience-enhancer.js` - Already compatible
   - [ ] `scripts/pod-installer.js` - SDK installation with v2
   - [ ] `scripts/final-verification.js` - Testing with v2 patterns

### Phase 3: SDK Integration (Critical)
1. **Service Layer Migration**
   - [ ] Replace all `PublicKey` → `Address` patterns
   - [ ] Replace `Connection` → `Rpc` patterns  
   - [ ] Replace `Keypair` → `KeyPairSigner` patterns
   - [ ] Update transaction building APIs

2. **Type Definitions**
   - [ ] Update all type exports
   - [ ] Ensure compatibility layers
   - [ ] Add migration helpers

## 🔧 Web3.js v2 Pattern Migration Guide

### Key Changes Required:

```typescript
// OLD (Web3.js v1)
import { PublicKey, Keypair, Connection } from '@solana/web3.js';

const pubkey = new PublicKey(address);
const keypair = Keypair.generate();
const connection = new Connection(rpcUrl);

// NEW (Web3.js v2)
import { address, generateKeyPairSigner, createSolanaRpc } from '@solana/web3.js';
import type { Address, KeyPairSigner, Rpc } from '@solana/web3.js';

const addr = address(addressString);
const signer = generateKeyPairSigner();
const rpc = createSolanaRpc(rpcUrl);
```

### Migration Patterns:
1. **Address Creation**: `new PublicKey(str)` → `address(str)`
2. **Keypair Generation**: `Keypair.generate()` → `generateKeyPairSigner()`
3. **RPC Client**: `new Connection(url)` → `createSolanaRpc(url)`
4. **Transaction Building**: Use new transaction APIs
5. **Program Interactions**: Update to use modular packages

## 🎮 Interactive Features Status

### CLI Commands
- [x] `pod help-me` - AI assistant working
- [x] `pod tutorial` - Interactive tutorials 
- [x] `pod migration-status` - Track migration progress
- [ ] `pod agent register --interactive` - Needs v2 patterns
- [ ] `pod message send --interactive` - Needs v2 patterns
- [ ] `pod config generate-keypair` - Partially migrated

### Interactive Scripts
- [x] Onboarding wizard base structure
- [ ] SDK setup wizard v2 compatibility
- [x] Dev experience enhancer (compatible)
- [ ] Interactive setup scripts

## 🚀 Rollup Execution Plan

### Week 1: CLI Core Commands
```bash
# Update all CLI command files
cd cli/src/commands
# Migrate each command file systematically
# Test each command individually
```

### Week 2: Interactive Scripts
```bash
# Update onboarding and setup scripts
cd scripts
# Ensure all scripts use Web3.js v2 patterns
# Test complete onboarding flow
```

### Week 3: SDK Integration
```bash
# Complete SDK service layer migration
cd sdk/src/services
# Update all service files systematically
# Rebuild and test all integrations
```

### Week 4: Testing & Polish
```bash
# Comprehensive testing
bun run test:all
# Performance validation
# User experience testing
```

## 📊 Migration Progress Tracking

### CLI Commands Progress:
- [ ] agent.ts (0/100%)
- [x] config.ts (80/100%)
- [ ] message.ts (0/100%)
- [ ] channel.ts (0/100%)
- [ ] session.ts (0/100%)
- [ ] bundle.ts (0/100%)
- [ ] zk-compression.ts (0/100%)

### Interactive Scripts Progress:
- [x] onboarding-wizard.js (20/100%)
- [ ] sdk-setup-wizard.js (10/100%)
- [x] dev-experience-enhancer.js (100/100%)
- [ ] pod-installer.js (0/100%)

### SDK Services Progress:
- [ ] agent.ts (0/100%)
- [ ] message.ts (0/100%)
- [ ] channel.ts (0/100%)
- [ ] discovery.ts (0/100%)
- [ ] zk-compression.ts (0/100%)

## 🎯 Success Criteria

### CLI Functionality
- [ ] All commands work with Web3.js v2
- [ ] Interactive modes fully functional
- [ ] AI assistant provides v2-specific help
- [ ] Migration status tracking works

### Interactive Scripts
- [ ] Onboarding wizard completes successfully
- [ ] SDK setup generates v2-compatible code
- [ ] Development tools work with v2 patterns

### Performance
- [ ] No performance regression
- [ ] Faster startup with modular imports
- [ ] Improved error messages

## 🔄 Continuous Integration

### Testing Strategy
1. **Unit Tests**: Each migrated component
2. **Integration Tests**: CLI command flows
3. **E2E Tests**: Complete user workflows
4. **Performance Tests**: Build and runtime performance

### Rollback Plan
- Keep v1 compatibility layers during transition
- Staged rollout with feature flags
- Comprehensive error monitoring
- Quick rollback mechanisms

## 📚 Documentation Updates

### User-Facing
- [ ] Update CLI help text with v2 examples
- [ ] Migration guide for existing users
- [ ] New Web3.js v2 tutorials

### Developer-Facing  
- [ ] Updated API documentation
- [ ] Migration patterns and examples
- [ ] Troubleshooting guide

---

**Note**: This migration maintains backward compatibility where possible and provides clear migration paths for users transitioning from Web3.js v1 to v2 patterns. 