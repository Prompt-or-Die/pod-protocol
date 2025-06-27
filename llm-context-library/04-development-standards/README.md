# Pod Protocol - Development Standards

> **Coding patterns, conventions, and best practices for Pod Protocol development**

---

## Overview

This guide establishes the development standards, patterns, and conventions used throughout the Pod Protocol codebase. All LLMs working with Pod Protocol must follow these standards to ensure consistency, maintainability, and security.

---

## Core Principles

### 1. Production-First Development

All code must be production-ready from the start:
- No development or preview code in main branches
- Comprehensive error handling for all edge cases
- Full test coverage with integration tests
- Security considerations at every level
- Performance optimization built-in

### 2. Type Safety First

TypeScript is the primary language with strict typing:
- Use strict TypeScript configuration
- All public APIs must be strongly typed
- No `any` types in production code
- Comprehensive interface definitions
- Type guards for runtime validation

### 3. Service-Oriented Architecture

All functionality organized into services:
- Single responsibility principle
- Clear service boundaries
- Consistent API patterns across services
- Dependency injection patterns
- Testable service interfaces

---

## Naming Conventions

### TypeScript/JavaScript

```typescript
// Classes: PascalCase
export class PodComClient { }
export class AgentService { }

// Interfaces: PascalCase with descriptive names
export interface AgentAccount { }
export interface RegisterAgentOptions { }
export interface PodComConfig { }

// Functions and methods: camelCase
export function getAgentPDA() { }
async registerAgent() { }

// Constants: SCREAMING_SNAKE_CASE
export const PROGRAM_ID = "HEpGLgYsE1kP8aoYKyLFc3JVVrofS7T4zEA6fWBJsZps";
export const DEFAULT_RPC_ENDPOINT = "https://api.devnet.solana.com";

// Variables: camelCase
const agentPublicKey = new PublicKey("...");
const messageAccount = await client.messages.getMessage(id);

// File names: kebab-case
agent-service.ts
message-types.ts
pod-com-client.ts
```

### Rust

```rust
// Structs: PascalCase
pub struct AgentAccount { }
pub struct RegisterAgentParams { }

// Functions: snake_case
pub fn register_agent() -> Result<()> { }
pub fn get_agent_pda() -> (Pubkey, u8) { }

// Constants: SCREAMING_SNAKE_CASE
pub const PROGRAM_ID: &str = "HEpGLgYsE1kP8aoYKyLFc3JVVrofS7T4zEA6fWBJsZps";
pub const MAX_MESSAGE_LENGTH: usize = 1000;

// Modules: snake_case
pub mod agent_service;
pub mod message_types;
```

### Python

```python
# Classes: PascalCase
class PodComClient:
class AgentService:

# Functions and methods: snake_case
def register_agent():
async def send_message():

# Constants: SCREAMING_SNAKE_CASE
PROGRAM_ID = "HEpGLgYsE1kP8aoYKyLFc3JVVrofS7T4zEA6fWBJsZps"
DEFAULT_ENDPOINT = "https://api.devnet.solana.com"

# Variables: snake_case
agent_public_key = PublicKey("...")
message_account = await client.messages.get_message(message_id)
```

---

## Code Organization Patterns

### Service Architecture Pattern

All SDKs follow this consistent service pattern:

```typescript
// Main Client
export class PodComClient {
  // Private infrastructure
  private rpc: Rpc<any>;
  private program?: Program<any>;
  private wallet?: Wallet;
  
  // Public service instances
  public readonly agents: AgentService;
  public readonly messages: MessageService;
  public readonly channels: ChannelService;
  public readonly escrow: EscrowService;
  public readonly analytics: AnalyticsService;
  public readonly discovery: DiscoveryService;
  public readonly ipfs: IPFSService;
  public readonly zkCompression: ZKCompressionService;
  
  constructor(config?: PodComConfig) {
    this.setupInfrastructure(config);
    this.initializeServices();
  }
}

// Base Service Pattern
export abstract class BaseService {
  protected client: PodComClient;
  protected connection: Connection;
  protected program: Program<any>;
  
  constructor(client: PodComClient) {
    this.client = client;
    this.connection = client.connection;
    this.program = client.program;
  }
  
  // Common patterns
  protected async sendTransaction(
    instruction: TransactionInstruction,
    signers: Signer[] = []
  ): Promise<string> {
    // Standard transaction sending logic
  }
  
  protected handleError(error: any): never {
    // Standard error handling logic
  }
}

// Specific Service Implementation
export class AgentService extends BaseService {
  async register(options: RegisterAgentOptions): Promise<AgentRegistrationResult> {
    try {
      // 1. Validate inputs
      this.validateRegistrationOptions(options);
      
      // 2. Generate PDA
      const [agentPDA] = await this.getAgentPDA(this.client.wallet.publicKey);
      
      // 3. Create instruction
      const instruction = await this.createRegisterInstruction(options, agentPDA);
      
      // 4. Send transaction
      const signature = await this.sendTransaction(instruction);
      
      // 5. Return result
      return { signature, agentPDA, ...options };
    } catch (error) {
      this.handleError(error);
    }
  }
}
```

### PDA Generation Pattern

All PDA generation follows consistent patterns:

```typescript
// TypeScript PDA Pattern
export class PDAs {
  static async getAgentPDA(wallet: PublicKey): Promise<[PublicKey, number]> {
    return PublicKey.findProgramAddress(
      [Buffer.from("agent"), wallet.toBuffer()],
      PROGRAM_ID
    );
  }
  
  static async getMessagePDA(
    sender: PublicKey,
    recipient: PublicKey,
    nonce: BN
  ): Promise<[PublicKey, number]> {
    return PublicKey.findProgramAddress(
      [
        Buffer.from("message"),
        sender.toBuffer(),
        recipient.toBuffer(),
        nonce.toBuffer("le", 8)
      ],
      PROGRAM_ID
    );
  }
}
```

```rust
// Rust PDA Pattern
pub fn get_agent_pda(wallet: &Pubkey) -> (Pubkey, u8) {
    Pubkey::find_program_address(
        &[b"agent", wallet.as_ref()],
        &crate::ID
    )
}

pub fn get_message_pda(sender: &Pubkey, recipient: &Pubkey, nonce: u64) -> (Pubkey, u8) {
    Pubkey::find_program_address(
        &[
            b"message",
            sender.as_ref(),
            recipient.as_ref(),
            &nonce.to_le_bytes()
        ],
        &crate::ID
    )
}
```

---

## Error Handling Standards

### Error Type Hierarchy

```typescript
// Base error class
export class PodProtocolError extends Error {
  constructor(
    message: string,
    public code?: number,
    public details?: any
  ) {
    super(message);
    this.name = 'PodProtocolError';
  }
}

// Service-specific errors
export class AgentError extends PodProtocolError {
  constructor(message: string, code?: number, details?: any) {
    super(message, code, details);
    this.name = 'AgentError';
  }
}

export class MessageError extends PodProtocolError {
  constructor(message: string, code?: number, details?: any) {
    super(message, code, details);
    this.name = 'MessageError';
  }
}

// Error handling in services
export class AgentService extends BaseService {
  async register(options: RegisterAgentOptions): Promise<AgentRegistrationResult> {
    try {
      // Implementation...
    } catch (error) {
      if (error instanceof AnchorError) {
        switch (error.error.errorCode.number) {
          case 6000:
            throw new AgentError('Agent already registered', 6000);
          case 6001:
            throw new AgentError('Invalid capabilities', 6001);
          default:
            throw new AgentError(`Registration failed: ${error.error.errorMessage}`);
        }
      }
      throw error;
    }
  }
}
```

### Error Handling Best Practices

1. **Always catch and re-throw with context**
2. **Provide specific error messages**
3. **Include error codes for programmatic handling**
4. **Log errors appropriately**
5. **Never expose sensitive information in errors**

---

## Type Definition Standards

### Interface Design

```typescript
// Configuration interfaces
export interface PodComConfig {
  endpoint?: string;
  commitment?: Commitment;
  programId?: PublicKey;
  ipfs?: IPFSConfig;
  zkCompression?: ZKCompressionConfig;
}

// Option interfaces for methods
export interface RegisterAgentOptions {
  capabilities: number;
  metadataUri: string;
  metadata?: AgentMetadata;
}

// Result interfaces
export interface AgentRegistrationResult {
  signature: string;
  agentPDA: PublicKey;
  capabilities: number;
  metadataUri: string;
}

// Account interfaces (matching on-chain structure)
export interface AgentAccount {
  agent: PublicKey;
  capabilities: BN;
  metadataUri: string;
  reputationScore: BN;
  totalMessages: BN;
  createdAt: BN;
  updatedAt: BN;
  isActive: boolean;
  bump: number;
}
```

### Enum Definitions

```typescript
// Use string enums for better debugging
export enum MessageType {
  TEXT = "text",
  DATA = "data", 
  COMMAND = "command",
  RESPONSE = "response"
}

export enum MessageStatus {
  PENDING = "pending",
  DELIVERED = "delivered",
  READ = "read",
  EXPIRED = "expired"
}

// Capability flags using bit masks
export const AGENT_CAPABILITIES = {
  NONE: 0,
  TRADING: 1 << 0,
  ANALYSIS: 1 << 1,
  DATA_PROCESSING: 1 << 2,
  COMMUNICATION: 1 << 3,
  LEARNING: 1 << 4,
  ALL: (1 << 5) - 1
} as const;
```

---

## Testing Standards

### Unit Test Pattern

```typescript
// Service test structure
describe('AgentService', () => {
  let client: PodComClient;
  let agentService: AgentService;
  let mockWallet: Keypair;
  
  beforeEach(async () => {
    mockWallet = Keypair.generate();
    client = new PodComClient({
      endpoint: 'http://localhost:8899'
    });
    await client.initialize(mockWallet);
    agentService = client.agents;
  });
  
  describe('register', () => {
    it('should register agent with valid options', async () => {
      const options: RegisterAgentOptions = {
        capabilities: AGENT_CAPABILITIES.TRADING,
        metadataUri: 'https://example.com/metadata.json'
      };
      
      const result = await agentService.register(options);
      
      expect(result.signature).toBeDefined();
      expect(result.agentPDA).toBeDefined();
      expect(result.capabilities).toBe(options.capabilities);
    });
    
    it('should throw error for invalid capabilities', async () => {
      const options: RegisterAgentOptions = {
        capabilities: -1,
        metadataUri: 'https://example.com/metadata.json'
      };
      
      await expect(agentService.register(options))
        .rejects
        .toThrow(AgentError);
    });
  });
});
```

### Integration Test Pattern

```typescript
describe('AgentService Integration', () => {
  let client: PodComClient;
  let wallet: Keypair;
  
  beforeAll(async () => {
    // Setup real blockchain connection
    wallet = Keypair.generate();
    await requestAirdrop(wallet.publicKey);
    
    client = new PodComClient({
      endpoint: 'https://api.devnet.solana.com'
    });
    await client.initialize(wallet);
  });
  
  it('should complete full agent lifecycle', async () => {
    // Register agent
    const registerResult = await client.agents.register({
      capabilities: AGENT_CAPABILITIES.TRADING,
      metadataUri: 'https://example.com/metadata.json'
    });
    
    // Verify agent exists
    const agent = await client.agents.getAgent(registerResult.agentPDA);
    expect(agent.capabilities.toNumber()).toBe(AGENT_CAPABILITIES.TRADING);
    
    // Update agent
    const updateResult = await client.agents.update({
      capabilities: AGENT_CAPABILITIES.TRADING | AGENT_CAPABILITIES.ANALYSIS,
      metadataUri: 'https://example.com/updated-metadata.json'
    });
    
    // Verify update
    const updatedAgent = await client.agents.getAgent(registerResult.agentPDA);
    expect(updatedAgent.capabilities.toNumber())
      .toBe(AGENT_CAPABILITIES.TRADING | AGENT_CAPABILITIES.ANALYSIS);
  });
});
```

---

## Documentation Standards

### Function Documentation

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
 * @throws {AgentError} When agent is already registered or capabilities are invalid
 * @throws {ValidationError} When metadataUri format is invalid
 * 
 * @example
 * ```typescript
 * const result = await client.agents.register({
 *   capabilities: AGENT_CAPABILITIES.TRADING | AGENT_CAPABILITIES.ANALYSIS,
 *   metadataUri: 'https://ipfs.io/ipfs/QmExample...'
 * });
 * console.log('Agent registered:', result.agentPDA.toString());
 * ```
 */
async register(options: RegisterAgentOptions): Promise<AgentRegistrationResult> {
  // Implementation...
}
```

### Interface Documentation

```typescript
/**
 * Configuration options for registering a new agent
 */
export interface RegisterAgentOptions {
  /** 
   * Bitmask representing agent capabilities
   * Use AGENT_CAPABILITIES constants for standard capabilities
   */
  capabilities: number;
  
  /** 
   * URI pointing to agent metadata
   * IPFS URIs recommended for decentralization
   * Must be accessible via HTTP/HTTPS
   * Maximum length: 200 characters
   */
  metadataUri: string;
  
  /** 
   * Optional metadata object
   * If provided, will be uploaded to IPFS automatically
   * metadataUri will be ignored if this is provided
   */
  metadata?: AgentMetadata;
}
```

---

## Security Standards

### Input Validation

```typescript
// Always validate inputs at service boundaries
private validateRegistrationOptions(options: RegisterAgentOptions): void {
  if (!options) {
    throw new ValidationError('Registration options are required');
  }
  
  if (typeof options.capabilities !== 'number' || options.capabilities < 0) {
    throw new ValidationError('Invalid capabilities: must be non-negative number');
  }
  
  if (!options.metadataUri || typeof options.metadataUri !== 'string') {
    throw new ValidationError('Invalid metadataUri: must be non-empty string');
  }
  
  if (options.metadataUri.length > MAX_METADATA_URI_LENGTH) {
    throw new ValidationError(`metadataUri too long: maximum ${MAX_METADATA_URI_LENGTH} characters`);
  }
  
  // Validate URI format
  try {
    new URL(options.metadataUri);
  } catch {
    throw new ValidationError('Invalid metadataUri: must be valid URL');
  }
}
```

### Secure Key Handling

```typescript
// Never log private keys or sensitive data
export class SecureWalletManager {
  private wallet: Keypair;
  
  constructor(privateKey?: Uint8Array) {
    if (privateKey) {
      this.wallet = Keypair.fromSecretKey(privateKey);
      // Clear the input array for security
      privateKey.fill(0);
    } else {
      this.wallet = Keypair.generate();
    }
  }
  
  getPublicKey(): PublicKey {
    return this.wallet.publicKey;
  }
  
  // Never expose the private key directly
  sign(message: Uint8Array): Uint8Array {
    return this.wallet.sign(message);
  }
  
  // Secure cleanup
  destroy(): void {
    // Zero out the private key
    this.wallet.secretKey.fill(0);
  }
}
```

---

## Performance Standards

### Caching Patterns

```typescript
export class CacheManager {
  private cache = new Map<string, CacheEntry>();
  private readonly defaultTTL = 5 * 60 * 1000; // 5 minutes
  
  async get<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl: number = this.defaultTTL
  ): Promise<T> {
    const entry = this.cache.get(key);
    
    if (entry && Date.now() < entry.expiresAt) {
      return entry.value as T;
    }
    
    const value = await fetcher();
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttl
    });
    
    return value;
  }
  
  invalidate(pattern: string): void {
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }
}

interface CacheEntry {
  value: any;
  expiresAt: number;
}
```

### Batch Operations

```typescript
// Prefer batch operations for efficiency
export class MessageService extends BaseService {
  async sendBatch(messages: SendMessageOptions[]): Promise<BatchResult[]> {
    // Validate all messages first
    messages.forEach(msg => this.validateSendOptions(msg));
    
    // Create all instructions
    const instructions = await Promise.all(
      messages.map(msg => this.createSendInstruction(msg))
    );
    
    // Batch into transactions (Solana limit: ~10 instructions per transaction)
    const batches = this.chunkArray(instructions, 8);
    const results: BatchResult[] = [];
    
    for (const batch of batches) {
      const transaction = new Transaction();
      batch.forEach(ix => transaction.add(ix));
      
      const signature = await this.sendTransaction(transaction);
      results.push({ signature, instructionCount: batch.length });
    }
    
    return results;
  }
}
```

---

## File Organization Standards

### Directory Structure

```
package/
├── src/
│   ├── client.ts              # Main client export
│   ├── services/              # Service implementations
│   │   ├── base.ts           # Base service class
│   │   ├── agent.ts          # Agent service
│   │   ├── message.ts        # Message service
│   │   └── index.ts          # Service exports
│   ├── types/                # Type definitions
│   │   ├── accounts.ts       # Account interfaces
│   │   ├── options.ts        # Option interfaces
│   │   ├── results.ts        # Result interfaces
│   │   └── index.ts          # Type exports
│   ├── utils/                # Utility functions
│   │   ├── pdas.ts          # PDA generation
│   │   ├── validation.ts     # Input validation
│   │   ├── cache.ts         # Caching utilities
│   │   └── index.ts         # Utility exports
│   ├── errors/               # Error definitions
│   │   ├── base.ts          # Base error classes
│   │   ├── agent.ts         # Agent-specific errors
│   │   └── index.ts         # Error exports
│   └── index.ts              # Main package export
├── test/                     # Test files
│   ├── unit/                # Unit tests
│   ├── integration/         # Integration tests
│   └── helpers/             # Test utilities
├── docs/                    # Package documentation
├── package.json
├── tsconfig.json
└── README.md
```

### Import/Export Standards

```typescript
// Use absolute imports for better maintainability
import { PodComClient } from './client';
import { AgentService, MessageService } from './services';
import { AgentAccount, MessageAccount } from './types';
import { getPodComError } from './errors';

// Organize exports by category
export {
  // Main client
  PodComClient,
  
  // Services
  AgentService,
  MessageService,
  ChannelService,
  
  // Types
  AgentAccount,
  MessageAccount,
  RegisterAgentOptions,
  
  // Constants
  PROGRAM_ID,
  AGENT_CAPABILITIES,
  
  // Utilities
  getPodComError,
  validateOptions
};
```

---

## Version Control Standards

### Commit Message Format

```
type(scope): description

[body]

[footer]
```

Examples:
- `feat(agents): add reputation tracking to agent service`
- `fix(messages): resolve PDA generation for message accounts`
- `docs(api): update agent service documentation`
- `test(integration): add comprehensive channel tests`
- `refactor(types): improve type safety for service options`

### Branch Naming

- `feature/agent-reputation-system`
- `fix/message-pda-generation`
- `docs/api-reference-update`
- `test/integration-coverage`

---

## Key Takeaways for LLMs

When developing for Pod Protocol:

1. **Follow service architecture** - All functionality organized into services
2. **Use strict typing** - TypeScript with comprehensive type definitions
3. **Implement proper error handling** - Specific error types with clear messages
4. **Validate all inputs** - Security and reliability through validation
5. **Write comprehensive tests** - Unit and integration test coverage
6. **Document thoroughly** - Clear documentation with examples
7. **Optimize for performance** - Caching, batching, and efficient algorithms
8. **Follow security best practices** - Input validation, secure key handling
9. **Maintain consistency** - Follow established patterns throughout
10. **Think production-first** - All code must be production-ready

Continue to API Specifications for detailed interface documentation.
