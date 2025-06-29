# Pod Protocol - Coding Standards

## Overview
Pod Protocol follows strict production-first development standards with comprehensive type safety, security-first design, and service-oriented architecture.

## Language Standards

### TypeScript (Primary Language)
- **Strict TypeScript**: Always use strict mode, **NEVER** use `any` types anywhere
- **Type Safety Requirements**:
  - Every variable, parameter, and return value must have explicit types
  - Create custom interfaces/types for all data structures
  - Maintain type definition files (`*.d.ts`) as source of truth
  - Use generic types for reusable components
  - Prefer `unknown` over `any` when type is truly unknown
- **Naming Conventions**:
  - Classes/Interfaces: PascalCase (`PodComClient`, `AgentService`)
  - Functions/Variables: camelCase (`registerAgent`, `messageAccount`)
  - Constants: SCREAMING_SNAKE_CASE (`PROGRAM_ID`, `DEFAULT_RPC_ENDPOINT`)
  - Files: kebab-case (`agent-service.ts`, `pod-com-client.ts`)
  - Type definitions: PascalCase with `Type` suffix (`UserDataType`, `ConfigType`)

### Rust (Blockchain Programs)
- **Anchor Framework**: All Solana programs use Anchor
- **Naming Conventions**:
  - Structs: PascalCase (`AgentAccount`, `MessageAccount`)
  - Functions: snake_case (`register_agent`, `send_message`)
  - Constants: SCREAMING_SNAKE_CASE (`PROGRAM_ID`, `MAX_MESSAGE_LENGTH`)
  - Modules: snake_case (`agent_service`, `message_types`)

### Python (AI/ML Integration)
- **Type Hints**: All functions must have type hints
- **Naming Conventions**:
  - Classes: PascalCase (`PodComClient`, `AgentService`)
  - Functions/Variables: snake_case (`register_agent`, `message_account`)
  - Constants: SCREAMING_SNAKE_CASE (`PROGRAM_ID`, `DEFAULT_ENDPOINT`)

## PROHIBITED CODE PATTERNS

### Absolutely Forbidden
- **NO STUB CODE**: Never use stub, skeleton, or placeholder implementations
- **NO TODO MARKERS**: Never commit code with TODO, FIXME, or HACK comments
- **NO MOCK DATA**: Never use mock, fake, or dummy data in any environment
- **NO PLACEHOLDER VALUES**: Never use "placeholder", "example", "temp" values
- **NO COMMENTED CODE**: Never commit commented-out code blocks
- **NO ANY TYPES**: Never use `any`, `object`, or `unknown` without proper typing
- **NO CONSOLE LOGS**: Never commit `console.log`, `print`, or debug statements

### Code Quality Enforcement
```typescript
// ❌ FORBIDDEN - These patterns are never allowed
const data: any = getData();  // NO any types
const TODO_IMPLEMENT_LATER = true;  // NO TODO markers
// const oldCode = something;  // NO commented code
const mockUser = { name: "placeholder" };  // NO mock/placeholder data

// ✅ REQUIRED - Proper implementation
interface UserData {
  id: string;
  name: string;
  email: string;
}

const userData: UserData = await userService.fetchUser(userId);
```

### Implementation Requirements
- **Complete functionality** from first commit
- **Real data flows** through entire application
- **Proper error handling** for all scenarios
- **Full type definitions** for all data structures
- **Production-ready code** at all times

## DIRECTORY SOURCE OF TRUTH

### Type Definition Management
Each directory must maintain its authoritative type definitions:

```
packages/
├── core/
│   ├── src/types/           # Core type definitions
│   │   ├── index.ts        # Export all types
│   │   ├── config.d.ts     # Configuration types
│   │   ├── errors.d.ts     # Error types
│   │   └── common.d.ts     # Shared types
│   └── README.md           # Type documentation
├── api-server/
│   ├── src/types/          # API-specific types
│   │   ├── index.ts        # API type exports
│   │   ├── requests.d.ts   # Request schemas
│   │   ├── responses.d.ts  # Response schemas
│   │   └── database.d.ts   # Database models
│   └── API_REFERENCE.md    # API documentation
└── frontend/
    ├── src/types/          # Frontend types
    │   ├── index.ts        # UI type exports
    │   ├── components.d.ts # Component props
    │   ├── state.d.ts      # State management
    │   └── api.d.ts        # API client types
    └── COMPONENT_DOCS.md   # Component documentation
```

### Documentation Requirements
- **README.md**: Purpose, structure, and usage for each package
- **Type documentation**: All custom types must be documented
- **API documentation**: All public interfaces documented
- **Examples**: Real usage examples (no mock data)
- **Change logs**: Track type changes and breaking updates

### Source of Truth Rules
- **Single source**: Each type defined in exactly one location
- **Re-export pattern**: Use index files to re-export types
- **Dependency direction**: Types flow from core → specific packages
- **No duplication**: Shared types must be in common/core packages
- **Version tracking**: All type changes must be versioned and documented

## Architecture Standards

### Service-Oriented Architecture
All SDKs must follow the service pattern:
```typescript
export class PodComClient {
  public readonly agents: AgentService;
  public readonly messages: MessageService;
  public readonly channels: ChannelService;
  public readonly escrow: EscrowService;
  public readonly analytics: AnalyticsService;
  public readonly discovery: DiscoveryService;
  public readonly ipfs: IPFSService;
  public readonly zkCompression: ZKCompressionService;
}
```

### PDA Generation Pattern
All Program Derived Addresses must follow consistent patterns:
```typescript
// Agent PDA: ["agent", wallet_pubkey]
// Message PDA: ["message", sender, recipient, nonce]
// Channel PDA: ["channel", creator, name]
// Escrow PDA: ["escrow", channel, depositor]
```

### Error Handling Hierarchy
```typescript
export class PodProtocolError extends Error {
  constructor(message: string, public code?: number, public details?: any) {
    super(message);
    this.name = 'PodProtocolError';
  }
}

export class AgentError extends PodProtocolError { }
export class MessageError extends PodProtocolError { }
export class ChannelError extends PodProtocolError { }
```

## Security Standards

### Input Validation
- All user inputs must be validated before processing
- Use type guards for runtime validation
- Implement rate limiting for all public endpoints
- Sanitize all string inputs to prevent injection attacks

### Private Key Management
- Never log private keys
- Use secure memory for sensitive operations
- Implement proper key rotation mechanisms
- Use hardware wallets for production

### Authentication
- All blockchain operations require valid signatures
- Implement capability-based access control
- Use session tokens for web applications
- Implement proper CORS policies

## Performance Standards

### Memory Management
- Use LRU caches for frequently accessed data
- Implement proper cleanup for event listeners
- Avoid memory leaks in long-running processes
- Use efficient data structures

### Blockchain Optimization
- Batch operations when possible
- Use ZK compression for cost efficiency
- Implement proper transaction retry logic
- Cache blockchain state when appropriate

## Code Quality Standards

### Documentation
- All public APIs must have JSDoc/Rustdoc comments
- Include examples for complex functions
- Document all error conditions
- Maintain up-to-date README files

### Testing
- Unit test coverage must be >90%
- Integration tests for all service interactions
- End-to-end tests for critical user flows
- Security tests for all authentication paths

### Production Readiness
- No development or mock code in production
- Comprehensive error handling for all edge cases
- Proper logging and monitoring
- Health checks for all services

## Web3.js v2.0 Standards

### Migration Requirements
- Use new Web3.js v2.0 APIs where available
- Maintain backward compatibility during transition
- Update type definitions for new patterns
- Use new RPC patterns for better performance

### Transaction Handling
```typescript
// Use new transaction patterns
const transaction = await client.rpc.sendTransaction({
  transaction: serializedTransaction,
  config: { commitment: 'confirmed' }
});
```

## Integration Standards

### SDK Consistency
- All SDKs must implement the same interface
- Consistent error handling across languages
- Same method signatures where possible
- Uniform configuration patterns

### External Dependencies
- Pin all dependency versions
- Regular security audits of dependencies
- Prefer well-maintained, popular libraries
- Document all external service requirements

## CRITICAL REQUIREMENTS

### NON-NEGOTIABLE STANDARDS
1. **NEVER use `any` types**: Every piece of data must have explicit, named types
2. **NEVER commit incomplete code**: No stubs, TODOs, placeholders, or commented code
3. **NEVER use mock data**: All environments must use real data flows and APIs
4. **NEVER violate type safety**: Strict TypeScript enforcement at all levels
5. **ALWAYS maintain source of truth**: Each directory owns its type definitions
6. **ALWAYS implement complete functionality**: Production-ready code from first commit

### ENFORCEMENT MECHANISMS
- **Pre-commit hooks**: Automatically reject forbidden patterns
- **CI/CD validation**: Build fails on any violations
- **Code review**: Manual verification of compliance
- **Type checking**: Strict TypeScript compiler settings
- **Linting rules**: ESLint configured to catch violations

### DEVELOPMENT WORKFLOW
1. **Research First**: Always search for latest patterns before implementation
2. **Context7 Usage**: Use Context7 MCP server for up-to-date information
3. **Type Definition**: Define all types before writing implementation
4. **Real Integration**: Connect to actual services and APIs immediately
5. **Documentation**: Document all types and interfaces as you create them
6. **Testing**: Write tests for real functionality, not mocks

### QUALITY GATES
- **Type Coverage**: 100% of code must have explicit types
- **No Forbidden Patterns**: Zero tolerance for prohibited code
- **Documentation**: All public APIs and types documented
- **Source of Truth**: Clear ownership of all type definitions
- **Production Readiness**: Every commit deployable to production 