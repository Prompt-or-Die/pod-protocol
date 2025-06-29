# Pod Protocol - Documentation Guidelines

## Documentation Overview
All Pod Protocol code must be thoroughly documented with JSDoc/Rustdoc comments, comprehensive README files, and up-to-date API documentation.

## Code Documentation Standards

### TypeScript/JavaScript JSDoc
```typescript
/**
 * Registers a new agent in the Pod Protocol network
 * 
 * @param options - Configuration for agent registration
 * @param options.capabilities - Bitmask of agent capabilities
 * @param options.metadataUri - URI pointing to agent metadata (IPFS recommended)
 * @param options.metadata - Optional metadata object for IPFS upload
 * 
 * @returns Promise resolving to registration result with signature and agent PDA
 * 
 * @throws {AgentError} When registration fails or validation errors occur
 * @throws {ValidationError} When input parameters are invalid
 * 
 * @example
 * ```typescript
 * const result = await client.agents.register({
 *   capabilities: AGENT_CAPABILITIES.TRADING | AGENT_CAPABILITIES.ANALYSIS,
 *   metadataUri: 'https://my-agent.com/metadata.json'
 * });
 * console.log('Agent registered:', result.agentPDA);
 * ```
 * 
 * @since 1.0.0
 */
async register(options: RegisterAgentOptions): Promise<AgentRegistrationResult> {
  // Implementation...
}
```

### Rust Documentation
```rust
/// Registers a new agent in the Pod Protocol
/// 
/// This instruction creates a new agent account with the specified capabilities
/// and metadata URI. The agent account uses a PDA derived from the signer's
/// public key to ensure uniqueness and deterministic addressing.
/// 
/// # Arguments
/// 
/// * `ctx` - The instruction context containing account references
/// * `capabilities` - Bitmask representing the agent's capabilities
/// * `metadata_uri` - URI pointing to the agent's metadata (max 200 chars)
/// 
/// # Returns
/// 
/// * `Result<()>` - Success or error result
/// 
/// # Errors
/// 
/// * `ErrorCode::InvalidMetadataUriLength` - URI exceeds maximum length
/// * `ErrorCode::InvalidCapabilities` - Capabilities value is invalid
/// 
/// # Examples
/// 
/// ```rust
/// let capabilities = AGENT_CAPABILITIES::TRADING | AGENT_CAPABILITIES::ANALYSIS;
/// let metadata_uri = "https://my-agent.com/metadata.json".to_string();
/// 
/// register_agent(ctx, capabilities, metadata_uri)?;
/// ```
/// 
/// # Security Considerations
/// 
/// - Only the account owner can register an agent for their account
/// - Metadata URI is stored on-chain and publicly visible
/// - Capabilities cannot be modified after registration
pub fn register_agent(
    ctx: Context<RegisterAgent>,
    capabilities: u64,
    metadata_uri: String,
) -> Result<()> {
    // Implementation...
}
```

## README Documentation Standards

### Project README Structure
```markdown
# Project Name

Brief description of what the project does.

## Features

- Key feature 1
- Key feature 2
- Key feature 3

## Installation

```bash
npm install @pod-protocol/package-name
```

## Quick Start

```typescript
import { PodComClient } from '@pod-protocol/sdk';

const client = new PodComClient({
  endpoint: 'https://api.devnet.solana.com'
});

// Example usage
```

## API Reference

Link to detailed API documentation.

## Examples

Link to examples directory.

## Contributing

Link to contributing guidelines.

## License

License information.
```

### Package README Requirements
Each package must include:
1. **Purpose**: What the package does
2. **Installation**: How to install and set up
3. **Quick Start**: Basic usage example
4. **API Reference**: Link to detailed documentation
5. **Examples**: Code examples and use cases
6. **Dependencies**: Required dependencies and peer dependencies
7. **Changelog**: Version history and breaking changes
8. **License**: License information

## API Documentation Standards

### OpenAPI/Swagger for REST APIs
```yaml
# api-server/openapi.yml
openapi: 3.0.3
info:
  title: Pod Protocol API
  description: REST API for Pod Protocol agent communication
  version: 1.0.0
  
paths:
  /api/agents:
    post:
      summary: Register a new agent
      description: Creates a new agent in the Pod Protocol network
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/RegisterAgentRequest'
      responses:
        '201':
          description: Agent successfully registered
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/AgentRegistrationResponse'
        '400':
          description: Invalid request parameters
        '429':
          description: Rate limit exceeded
          
components:
  schemas:
    RegisterAgentRequest:
      type: object
      required:
        - capabilities
        - metadataUri
      properties:
        capabilities:
          type: integer
          description: Bitmask of agent capabilities
          example: 7
        metadataUri:
          type: string
          format: uri
          description: URI to agent metadata
          example: "https://my-agent.com/metadata.json"
```

### TypeDoc Configuration
```json
{
  "entryPoints": ["src/index.ts"],
  "out": "docs",
  "theme": "default",
  "includeVersion": true,
  "excludePrivate": true,
  "excludeProtected": true,
  "excludeExternals": true,
  "readme": "README.md",
  "name": "Pod Protocol SDK",
  "tsconfig": "tsconfig.json"
}
```

## Architecture Documentation

### System Architecture Diagrams
```mermaid
graph TB
    subgraph "Client Layer"
        A[TypeScript SDK] --> B[PodComClient]
        C[JavaScript SDK] --> B
        D[Python SDK] --> B
    end
    
    subgraph "Protocol Layer"
        B --> E[Solana Program]
        E --> F[Agent Registry]
        E --> G[Message Router]
        E --> H[Channel Manager]
    end
    
    subgraph "Infrastructure"
        I[Solana Blockchain]
        J[IPFS Storage]
        K[Analytics Engine]
    end
    
    E --> I
    B --> J
    B --> K
```

### Data Flow Documentation
```markdown
## Message Sending Flow

1. **Client Validation**: SDK validates message format and recipient
2. **PDA Generation**: Generate message PDA from sender, recipient, and nonce
3. **Transaction Creation**: Create Solana transaction with message instruction
4. **Signature**: User signs transaction with wallet
5. **Submission**: Transaction submitted to Solana network
6. **Confirmation**: Transaction confirmed and message stored on-chain
7. **Event Emission**: MessageSent event emitted for indexers
8. **Notification**: Recipient notified via WebSocket (if connected)
```

## Change Documentation

### Changelog Format
```markdown
# Changelog

All notable changes to this project will be documented in this file.

## [2.0.0] - 2024-01-15

### Added
- Web3.js v2.0 support
- ZK compression integration
- Batch operations for improved performance

### Changed
- BREAKING: Updated client initialization API
- Improved error handling with more specific error types
- Enhanced type safety with stricter TypeScript configuration

### Deprecated
- Legacy wallet adapter (use new Web3.js v2.0 patterns)

### Removed
- BREAKING: Removed deprecated v1.x APIs

### Fixed
- Memory leak in event listeners
- Race condition in concurrent transactions

### Security
- Enhanced input validation
- Improved rate limiting
```

### Migration Guides
```markdown
# Migration Guide: v1.x to v2.0

## Breaking Changes

### Client Initialization
**Before (v1.x):**
```typescript
const client = new PodComClient(connection, wallet);
```

**After (v2.0):**
```typescript
const client = new PodComClient({ endpoint: 'https://api.devnet.solana.com' });
await client.initialize(wallet);
```

### API Changes
- `registerAgent()` now returns `AgentRegistrationResult` instead of `string`
- Error types have been restructured for better categorization
- All async operations now require explicit await

## Migration Steps

1. Update package dependencies
2. Update client initialization code
3. Update error handling code
4. Test all functionality
```

## Documentation Maintenance

### Documentation Review Process
1. **Code Changes**: All code changes must include documentation updates
2. **API Changes**: Breaking changes require migration guides
3. **Examples**: All public APIs must have working examples
4. **Reviews**: Documentation reviewed as part of code review process
5. **Testing**: Documentation examples must be tested in CI/CD

### Documentation Automation
```yaml
# .github/workflows/docs.yml
name: Documentation
on:
  push:
    branches: [main]
  pull_request:

jobs:
  docs:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run docs:build
      - run: npm run docs:test
      - name: Deploy docs
        if: github.ref == 'refs/heads/main'
        run: npm run docs:deploy
```

## CRITICAL DOCUMENTATION REQUIREMENTS

1. **API Documentation**: All public APIs must have comprehensive documentation
2. **Examples**: Every major feature must have working code examples
3. **Error Documentation**: All error types and conditions must be documented
4. **Migration Guides**: Breaking changes require detailed migration guides
5. **Architecture Docs**: System architecture must be clearly documented
6. **Security Docs**: Security considerations must be documented for all features
7. **Performance Docs**: Performance characteristics and optimization guidelines
8. **Testing Docs**: Testing strategies and patterns must be documented
9. **Deployment Docs**: Production deployment procedures must be documented
10. **Troubleshooting**: Common issues and solutions must be documented 