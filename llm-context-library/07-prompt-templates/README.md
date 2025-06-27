# Pod Protocol - LLM Prompt Templates

> **Ready-to-use prompts for LLMs working with Pod Protocol platform**

---

## Overview

This collection provides structured prompts specifically designed for LLMs working with the Pod Protocol codebase. Each prompt includes context, task definition, requirements, and expected outcomes.

---

## Quick Reference

### Essential Prompts
- **[Platform Context](#platform-context-prompt)** - Get complete understanding of Pod Protocol
- **[Component Analysis](#component-analysis-prompt)** - Analyze specific packages
- **[Implementation Task](#implementation-task-prompt)** - Build new features
- **[Bug Fix](#bug-fix-prompt)** - Diagnose and fix issues
- **[Code Review](#code-review-prompt)** - Review code for quality and security
- **[Testing](#testing-prompt)** - Create comprehensive tests
- **[Documentation](#documentation-prompt)** - Generate accurate documentation

### Specialized Prompts
- **[Agent Development](#agent-development-prompt)** - Build AI agents
- **[Blockchain Integration](#blockchain-integration-prompt)** - Work with Solana programs
- **[SDK Enhancement](#sdk-enhancement-prompt)** - Improve SDK functionality
- **[Security Audit](#security-audit-prompt)** - Security review and hardening
- **[Performance Optimization](#performance-optimization-prompt)** - Optimize performance

---

## Essential Prompts

### Platform Context Prompt

Use this prompt when an LLM needs complete understanding of Pod Protocol:

```
CONTEXT: Pod Protocol Platform Understanding

You are working with Pod Protocol (Prompt or Die), a decentralized AI agent communication protocol built on Solana blockchain. Before proceeding with any task, you need complete understanding of the platform.

REQUIRED READING:
1. Read llm-context-library/01-platform-overview/README.md - Complete platform understanding
2. Read llm-context-library/02-architecture-guide/README.md - Technical architecture details
3. Read llm-context-library/03-component-reference/README.md - All package information

KEY PLATFORM FACTS:
- Program ID: HEpGLgYsE1kP8aoYKyLFc3JVVrofS7T4zEA6fWBJsZps
- Network: Solana Devnet (Mainnet Ready)
- Primary SDK: TypeScript (packages/sdk-typescript/)
- Architecture: Service-based with PDA addressing
- Cost Optimization: ZK compression via Light Protocol (99% cost reduction)
- Storage: IPFS integration for large content

CRITICAL PATTERNS:
1. All accounts use Program Derived Addresses (PDAs)
2. Service-oriented architecture: client.agents, client.messages, client.channels, etc.
3. Agents are first-class citizens with unique blockchain identities
4. ZK compression should be considered for cost optimization
5. IPFS handles large content automatically
6. Comprehensive error handling with specific error types
7. Async/await patterns throughout (blockchain operations)

CURRENT TASK: [Specify your specific task here]

REQUIREMENTS:
- Use exact naming conventions from the codebase
- Follow established patterns and architectures
- Consider security implications for all blockchain operations
- Implement proper error handling
- Test all implementations thoroughly
- Document all decisions and changes

EXPECTED OUTCOME:
[Specify what you expect the LLM to deliver]
```

### Component Analysis Prompt

Use this when you need detailed analysis of a specific package:

```
CONTEXT: Pod Protocol Component Analysis

You need to analyze and understand a specific component within the Pod Protocol monorepo.

TARGET COMPONENT: [Specify component, e.g., "packages/sdk-typescript/"]

ANALYSIS REQUIREMENTS:
1. Read the component's README and documentation
2. Examine the main entry points and APIs
3. Understand the service architecture and patterns
4. Identify key dependencies and integration points
5. Review error handling and type definitions
6. Analyze testing strategies and coverage

REFERENCE MATERIALS:
- llm-context-library/03-component-reference/README.md (Component overview)
- llm-context-library/04-development-standards/README.md (Coding standards)
- Component-specific documentation in the package directory

KEY ANALYSIS POINTS:
1. **Purpose & Scope**: What does this component do?
2. **Architecture**: How is it structured and organized?
3. **APIs**: What interfaces does it expose?
4. **Dependencies**: What does it depend on?
5. **Integration**: How does it integrate with other components?
6. **Status**: Current completion and production readiness
7. **Patterns**: What design patterns does it use?
8. **Testing**: How is it tested?

DELIVERABLE:
Provide a comprehensive analysis including:
- Component overview and purpose
- Key classes, interfaces, and APIs
- Integration patterns with other components
- Current status and any limitations
- Recommendations for usage or improvement
```

### Implementation Task Prompt

Use this for building new features or functionality:

```
CONTEXT: Pod Protocol Feature Implementation

You are implementing a new feature for Pod Protocol. Follow established patterns and maintain consistency with the existing codebase.

TASK: [Specify the feature to implement]

REQUIREMENTS:
1. **Architecture Consistency**: Follow service-based architecture patterns
2. **PDA Usage**: Use Program Derived Addresses for all accounts
3. **Error Handling**: Implement comprehensive error handling with proper types
4. **Type Safety**: Use strict TypeScript typing throughout
5. **Testing**: Include unit tests and integration tests
6. **Documentation**: Provide clear documentation and examples
7. **Security**: Consider security implications and validate all inputs
8. **Performance**: Optimize for performance and consider ZK compression

REFERENCE MATERIALS:
- llm-context-library/02-architecture-guide/README.md (Architecture patterns)
- llm-context-library/04-development-standards/README.md (Coding standards)
- llm-context-library/05-api-specifications/README.md (API patterns)
- llm-context-library/09-security-protocols/README.md (Security requirements)
- Similar implementations in the codebase for pattern reference

IMPLEMENTATION CHECKLIST:
□ Follow service-based architecture pattern
□ Use correct PDA addressing scheme
□ Implement proper TypeScript types
□ Add comprehensive error handling
□ Include input validation and sanitization
□ Consider ZK compression for cost optimization
□ Add unit tests with good coverage
□ Add integration tests for blockchain interactions
□ Document public APIs and provide usage examples
□ Review security implications and add safeguards
□ Optimize for performance
□ Ensure backward compatibility

EXPECTED DELIVERABLE:
- Complete, production-ready implementation
- Comprehensive test suite
- Documentation with examples
- Security review and considerations
```

### Bug Fix Prompt

Use this when diagnosing and fixing issues:

```
CONTEXT: Pod Protocol Bug Fix

You are diagnosing and fixing a bug in the Pod Protocol codebase.

BUG DESCRIPTION: [Describe the bug, error messages, expected vs actual behavior]

ERROR DETAILS:
- Error Message: [Include exact error message]
- Stack Trace: [Include stack trace if available]
- Reproduction Steps: [How to reproduce the issue]
- Environment: [Package version, Node.js version, etc.]

DIAGNOSTIC PROCESS:
1. **Error Analysis**: Understand the exact error and its context
2. **Code Review**: Examine the relevant code sections
3. **Pattern Check**: Verify against established patterns in llm-context-library/
4. **Dependency Check**: Review related dependencies and integrations
5. **Test Analysis**: Check if tests cover the failing scenario

REFERENCE MATERIALS:
- llm-context-library/08-troubleshooting-guide/README.md (Common issues)
- llm-context-library/04-development-standards/README.md (Coding standards)
- Related test files for expected behavior patterns

DEBUGGING CHECKLIST:
□ Reproduced the issue locally
□ Identified the root cause
□ Checked for similar issues in codebase
□ Verified the fix doesn't break existing functionality
□ Added test cases to prevent regression
□ Updated documentation if needed
□ Considered edge cases and error handling
□ Tested the fix thoroughly

FIX REQUIREMENTS:
1. **Root Cause**: Address the actual cause, not just symptoms
2. **Testing**: Add tests to prevent regression
3. **Documentation**: Update docs if the bug was due to unclear documentation
4. **Error Handling**: Improve error handling to prevent similar issues
5. **Validation**: Ensure the fix doesn't introduce new issues

EXPECTED DELIVERABLE:
- Complete bug fix with explanation
- Test cases covering the bug scenario
- Updated documentation if relevant
- Analysis of why the bug occurred and how to prevent similar issues
```

### Code Review Prompt

Use this for reviewing code quality and security:

```
CONTEXT: Pod Protocol Code Review

You are reviewing code for the Pod Protocol platform. Ensure it meets all quality, security, and architectural standards.

CODE TO REVIEW: [Specify files, PRs, or code sections]

REVIEW CRITERIA:
1. **Architecture Compliance**: Follows Pod Protocol patterns and service architecture
2. **Code Quality**: Clean, readable, maintainable code
3. **Security**: Proper input validation, error handling, and security practices
4. **Performance**: Efficient algorithms and resource usage
5. **Testing**: Adequate test coverage and quality
6. **Documentation**: Clear comments and documentation
7. **Type Safety**: Proper TypeScript usage and type definitions
8. **Best Practices**: Follows established development standards

REFERENCE STANDARDS:
- llm-context-library/04-development-standards/README.md (Coding standards)
- llm-context-library/09-security-protocols/README.md (Security requirements)
- llm-context-library/10-testing-standards/README.md (Testing standards)
- Existing codebase patterns for consistency

REVIEW CHECKLIST:
□ **Architecture**: Follows service-based patterns
□ **PDAs**: Correct PDA usage and addressing
□ **Types**: Proper TypeScript types and interfaces
□ **Errors**: Comprehensive error handling
□ **Security**: Input validation and sanitization
□ **Performance**: Efficient code and resource usage
□ **Tests**: Adequate coverage and quality
□ **Docs**: Clear documentation and comments
□ **Consistency**: Matches existing codebase patterns
□ **Edge Cases**: Handles edge cases and error conditions

SECURITY REVIEW:
□ Input validation on all user data
□ Proper error handling without information leakage
□ Secure PDA generation and validation
□ Protection against common blockchain vulnerabilities
□ Proper access control and authorization
□ Safe handling of sensitive data (private keys, etc.)

DELIVERABLE:
Provide detailed review feedback including:
- Overall assessment of code quality
- Specific issues found with suggested fixes
- Security concerns and recommendations
- Performance improvements
- Testing gaps and recommendations
- Documentation improvements needed
- Architectural feedback and suggestions
```

---

## Specialized Prompts

### Agent Development Prompt

```
CONTEXT: AI Agent Development for Pod Protocol

You are developing an AI agent that will interact with the Pod Protocol network autonomously.

AGENT TYPE: [Specify: TradingAgent, ContentAgent, DataAgent, or Custom]

AGENT REQUIREMENTS:
1. **Identity Management**: Register and maintain agent identity on-chain
2. **Communication**: Send and receive messages with other agents
3. **Channel Participation**: Join relevant channels and participate in discussions
4. **Reputation Building**: Build reputation through successful interactions
5. **Autonomous Operation**: Operate without human intervention
6. **Error Recovery**: Handle errors gracefully and recover from failures
7. **Monitoring**: Report status and performance metrics

BASE ARCHITECTURE:
```typescript
export class CustomAgent extends PodAgent {
  constructor(config: AgentConfig) {
    super(config);
    // Agent-specific initialization
  }
  
  async initialize(): Promise<void> {
    await super.initialize();
    // Custom initialization logic
  }
  
  async start(): Promise<void> {
    await super.start();
    // Start agent-specific operations
  }
}
```

IMPLEMENTATION REQUIREMENTS:
□ Extend base PodAgent class
□ Implement agent-specific capabilities
□ Add proper error handling and recovery
□ Include monitoring and logging
□ Add configuration management
□ Implement graceful shutdown
□ Add performance optimization
□ Include security measures

REFERENCE MATERIALS:
- packages/agents/agents/README.md (Agent examples)
- llm-context-library/06-implementation-guides/README.md (Implementation patterns)

DELIVERABLE:
- Complete agent implementation
- Configuration documentation
- Deployment instructions
- Monitoring and logging setup
```

### Blockchain Integration Prompt

```
CONTEXT: Solana Program Integration with Pod Protocol

You are working with the Solana blockchain program (Rust/Anchor) that powers Pod Protocol.

TASK: [Specify the blockchain-related task]

PROGRAM DETAILS:
- Program ID: HEpGLgYsE1kP8aoYKyLFc3JVVrofS7T4zEA6fWBJsZps
- Framework: Anchor v0.30.0
- Location: packages/core/programs/pod-com/

KEY PATTERNS:
1. **PDA Usage**: All accounts use Program Derived Addresses
2. **Validation**: Comprehensive input validation in all instructions
3. **Error Handling**: Custom error types with descriptive messages
4. **Security**: Authorization checks and access control
5. **Efficiency**: Optimized for minimal compute units

REFERENCE MATERIALS:
- packages/core/programs/pod-com/src/lib.rs (Main program)
- llm-context-library/09-security-protocols/README.md (Security patterns)
- Existing instruction implementations for patterns

BLOCKCHAIN CHECKLIST:
□ Follow PDA addressing patterns
□ Implement comprehensive validation
□ Add proper error handling
□ Include security checks
□ Optimize for compute efficiency
□ Add appropriate tests
□ Document instruction usage
□ Consider upgrade paths

SECURITY REQUIREMENTS:
□ Validate all account ownership
□ Check account state before operations
□ Prevent unauthorized access
□ Validate all input parameters
□ Handle edge cases securely
□ Protect against common vulnerabilities

DELIVERABLE:
- Complete instruction implementation
- Comprehensive tests
- Security analysis
- Documentation and usage examples
```

---

## Context-Specific Templates

### New Feature Development

```
TASK: Implement [Feature Name] for Pod Protocol

CONTEXT: You're adding a new feature to Pod Protocol. This feature should integrate seamlessly with the existing architecture.

FEATURE REQUIREMENTS:
[Specify detailed requirements]

ARCHITECTURE INTEGRATION:
1. Which service should handle this feature?
2. What new types/interfaces are needed?
3. How does it integrate with existing services?
4. What blockchain operations are required?
5. What are the security implications?

IMPLEMENTATION PLAN:
1. Design the service interface
2. Implement the core functionality
3. Add comprehensive error handling
4. Create unit and integration tests
5. Add documentation and examples
6. Consider ZK compression optimizations
7. Security review and hardening

REFERENCE EXISTING PATTERNS:
- Similar features in the codebase
- Service architecture patterns
- Error handling patterns
- Testing strategies
```

### Performance Optimization

```
TASK: Optimize [Component/Feature] Performance in Pod Protocol

CURRENT PERFORMANCE ISSUE:
[Describe the performance problem]

OPTIMIZATION AREAS:
1. **Blockchain Operations**: Reduce transaction costs and improve speed
2. **Caching**: Implement efficient caching strategies
3. **Batch Operations**: Group operations for efficiency
4. **ZK Compression**: Leverage compression for cost savings
5. **Connection Pooling**: Optimize RPC connections
6. **Memory Usage**: Reduce memory footprint

MEASUREMENT CRITERIA:
- Transaction cost reduction
- Response time improvement
- Memory usage optimization
- CPU utilization reduction
- Throughput increase

OPTIMIZATION CHECKLIST:
□ Profile current performance
□ Identify bottlenecks
□ Implement optimizations
□ Measure improvements
□ Add performance tests
□ Document optimizations
```

---

## Error-Specific Prompts

### Common Error Scenarios

**Anchor Error Resolution:**
```
CONTEXT: Resolving Anchor/Solana Program Error

ERROR: [Specific anchor error code and message]

DIAGNOSTIC STEPS:
1. Check account ownership and permissions
2. Verify PDA generation matches program expectations
3. Validate instruction parameters
4. Check account state requirements
5. Review transaction size and compute limits

COMMON ANCHOR ERRORS:
- AccountNotInitialized: Account PDA incorrect or not created
- ConstraintViolation: Account constraints not met
- InvalidInstruction: Wrong instruction parameters
- InsufficientFunds: Not enough SOL for transaction
```

**SDK Integration Error:**
```
CONTEXT: SDK Integration Error Resolution

ERROR: [Specific SDK error]

TROUBLESHOOTING:
1. Verify SDK version compatibility
2. Check configuration parameters
3. Validate wallet and connection setup
4. Review service initialization
5. Check for network connectivity issues

REFERENCE: llm-context-library/08-troubleshooting-guide/README.md
```

---

## Usage Guidelines

### How to Use These Prompts

1. **Copy the relevant prompt template**
2. **Fill in the specific details** for your task
3. **Include relevant context** from the Pod Protocol knowledge base
4. **Specify clear requirements** and expected outcomes
5. **Reference appropriate documentation** from llm-context-library

### Customizing Prompts

- Add project-specific requirements
- Include additional context as needed
- Modify checklists for your specific use case
- Add relevant examples from the codebase

### Best Practices

- Always include complete context about Pod Protocol
- Reference the appropriate sections of the knowledge base
- Be specific about requirements and expectations
- Include security and performance considerations
- Specify testing and documentation requirements

---

**Remember**: These prompts are designed to ensure LLMs have complete context and clear guidance when working with Pod Protocol. Always include relevant sections from the llm-context-library for comprehensive understanding.
