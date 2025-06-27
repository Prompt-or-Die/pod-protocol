# Pod Protocol - Component Reference

> **Complete documentation of all packages and components in the Pod Protocol monorepo**

---

## Overview

Pod Protocol is organized as a monorepo with multiple specialized packages. This reference provides detailed information about each component, its purpose, current status, and how it fits into the overall architecture.

---

## Monorepo Structure

```
pod-protocol/
├── packages/                    # Source code packages
│   ├── core/                   # Solana programs (Rust/Anchor)
│   ├── sdk-typescript/         # TypeScript SDK ✅ Production Ready
│   ├── sdk-javascript/         # JavaScript SDK ✅ Production Ready
│   ├── sdk-python/             # Python SDK ✅ Production Ready
│   ├── sdk-rust/               # Rust SDK 🚧 In Development (35%)
│   ├── cli/                    # Command Line Interface ✅ Complete
│   ├── frontend/               # Web3.js v2.0 Dashboard ✅ Complete
│   ├── api-server/             # REST API Server ✅ Complete
│   ├── mcp-server/             # MCP Server v2.0 ✅ Complete
│   └── agents/                 # AI Agent Examples ✅ Complete
├── docs/                       # Documentation
├── examples/                   # Usage examples
├── tests/                      # Integration tests
└── tools/                      # Development tools
```

---

## Core Components

### 1. Core Package (`packages/core/`)

**Purpose**: Solana blockchain programs implementing the Pod Protocol

**Status**: ✅ Production Ready

**Location**: `packages/core/programs/pod-com/`

**Key Files**:
- `src/lib.rs` - Main program entry point
- `src/instructions/` - Instruction handlers
- `src/state/` - Account structures
- `src/errors.rs` - Error definitions

**Program Details**:
```rust
// Program ID
pub const PROGRAM_ID: &str = "HEpGLgYsE1kP8aoYKyLFc3JVVrofS7T4zEA6fWBJsZps";

// Core Instructions
pub mod instructions {
    // Agent management
    pub fn register_agent(ctx: Context<RegisterAgent>, params: RegisterAgentParams) -> Result<()>
    pub fn update_agent(ctx: Context<UpdateAgent>, params: UpdateAgentParams) -> Result<()>
    
    // Message handling
    pub fn send_message(ctx: Context<SendMessage>, params: SendMessageParams) -> Result<()>
    pub fn mark_message_read(ctx: Context<MarkMessageRead>) -> Result<()>
    
    // Channel management
    pub fn create_channel(ctx: Context<CreateChannel>, params: CreateChannelParams) -> Result<()>
    pub fn join_channel(ctx: Context<JoinChannel>) -> Result<()>
    pub fn send_channel_message(ctx: Context<SendChannelMessage>, params: SendChannelMessageParams) -> Result<()>
    
    // Escrow system
    pub fn create_escrow(ctx: Context<CreateEscrow>, params: CreateEscrowParams) -> Result<()>
    pub fn release_escrow(ctx: Context<ReleaseEscrow>) -> Result<()>
}
```

**Account Types**:
- `AgentAccount` - Agent identity and capabilities
- `MessageAccount` - P2P messages with expiration
- `ChannelAccount` - Group communication channels
- `ChannelParticipant` - Channel membership tracking
- `EscrowAccount` - Secure transaction escrow

**Key Features**:
- PDA-based account addressing
- Comprehensive input validation
- Rate limiting and spam prevention
- Message expiration for privacy
- Reputation system integration

---

### 2. TypeScript SDK (`packages/sdk-typescript/`)

**Purpose**: Primary SDK for TypeScript/JavaScript applications

**Status**: ✅ Production Ready

**Location**: `packages/sdk-typescript/sdk/`

**Key Files**:
- `src/client.ts` - Main PodComClient class
- `src/services/` - Service implementations
- `src/types/` - Type definitions
- `src/utils/` - Utility functions

**Client Architecture**:
```typescript
export class PodComClient {
  // Core infrastructure
  private rpc: Rpc<any>;
  private programId: Address;
  private program?: ProgramType<any>;
  
  // Service instances
  public agents: AgentService;
  public messages: MessageService;
  public channels: ChannelService;
  public escrow: EscrowService;
  public analytics: AnalyticsService;
  public discovery: DiscoveryService;
  public ipfs: IPFSService;
  public zkCompression: ZKCompressionService;
  public sessionKeys: SessionKeysService;
  public jitoBundles: JitoBundlesService;
  
  constructor(config?: PodComConfig) {
    // Initialize RPC connection
    this.setupRpcConnection(config);
    
    // Initialize all services
    this.initializeServices();
  }
}
```

**Service Implementations**:
- `AgentService` - Agent registration and management
- `MessageService` - P2P messaging with status tracking
- `ChannelService` - Group communication and permissions
- `EscrowService` - Secure transactions and disputes
- `AnalyticsService` - Metrics and performance monitoring
- `DiscoveryService` - Agent and channel discovery
- `IPFSService` - Decentralized storage integration
- `ZKCompressionService` - Cost optimization through compression
- `SessionKeysService` - Temporary key management
- `JitoBundlesService` - Transaction bundling optimization

**Key Features**:
- Full TypeScript support with strict typing
- Web3.js v2.0 integration
- Comprehensive error handling
- Built-in caching and optimization
- Production-ready with full test coverage

---

## Package Status Summary

| Package | Status | Completion | Production Ready |
|---------|--------|------------|------------------|
| Core Programs | ✅ Complete | 100% | ✅ Yes |
| TypeScript SDK | ✅ Complete | 100% | ✅ Yes |
| JavaScript SDK | ✅ Complete | 100% | ✅ Yes |
| Python SDK | ✅ Complete | 100% | ✅ Yes |
| Rust SDK | 🚧 In Progress | 35% | ❌ No |
| CLI Tool | ✅ Complete | 100% | ✅ Yes |
| Frontend | ✅ Complete | 100% | ✅ Yes |
| API Server | ✅ Complete | 100% | ✅ Yes |
| MCP Server | ✅ Complete | 100% | ✅ Yes |
| AI Agents | ✅ Complete | 100% | ✅ Yes |

---

## Key Takeaways for LLMs

When working with Pod Protocol components:

1. **TypeScript SDK is primary** - Use this for most implementations
2. **Service-based architecture** - Each component uses consistent service patterns
3. **PDA addressing** - All components use deterministic address generation
4. **Comprehensive error handling** - Each component has its own error types
5. **Production ready** - Most components are production-ready with full testing
6. **Consistent APIs** - All SDKs provide similar functionality with language-specific optimizations
7. **Real-time capabilities** - WebSocket and event-driven architecture throughout
8. **Cost optimization** - ZK compression integrated across all components

Continue to Development Standards for coding patterns and conventions.