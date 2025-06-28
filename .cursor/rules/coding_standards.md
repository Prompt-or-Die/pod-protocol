# Pod Protocol - Coding Standards

## Overview
Pod Protocol follows strict production-first development standards with comprehensive type safety, security-first design, and service-oriented architecture.

## Language Standards

### TypeScript (Primary Language)
- **Strict TypeScript**: Always use strict mode, no `any` types in production
- **Naming Conventions**:
  - Classes/Interfaces: PascalCase (`PodComClient`, `AgentService`)
  - Functions/Variables: camelCase (`registerAgent`, `messageAccount`)
  - Constants: SCREAMING_SNAKE_CASE (`PROGRAM_ID`, `DEFAULT_RPC_ENDPOINT`)
  - Files: kebab-case (`agent-service.ts`, `pod-com-client.ts`)

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

1. **No Mock Data**: Frontend must always connect to real APIs
2. **Production First**: All code must be production-ready from start
3. **Type Safety**: Strict typing enforced at all levels
4. **Security First**: Security considerations in every design decision
5. **Web Search Required**: Always search for latest patterns before implementation
6. **Context7 Usage**: Use Context7 MCP server for up-to-date information 