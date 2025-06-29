# Testing Guide

> **Comprehensive testing documentation for Pod Protocol (2025 Edition)**

## Overview

Pod Protocol employs a comprehensive testing strategy covering multiple layers, optimized for the 2025 technology stack including Bun runtime, Web3.js v2.0, and Context7 integration.

## Testing Architecture

### Testing Pyramid

```
        ┌─────────────────┐
        │   E2E Tests     │  ← Few, High-level
        │   (Playwright)  │
        └─────────────────┘
      ┌───────────────────────┐
      │  Integration Tests    │  ← Some, API-level
      │  (Bun Test + Anchor)  │
      └───────────────────────┘
    ┌─────────────────────────────┐
    │      Unit Tests             │  ← Many, Component-level
    │   (Bun Test + Rust)         │
    └─────────────────────────────┘
```

### Test Categories

- **Unit Tests**: Individual functions and components using Bun's built-in test runner
- **Integration Tests**: Service interactions and API endpoints
- **Contract Tests**: Solana program functionality with Web3.js v2.0
- **E2E Tests**: Complete user workflows with Playwright
- **Performance Tests**: Load and stress testing
- **Security Tests**: Vulnerability and penetration testing

## Environment Setup

### Prerequisites

```bash
# Install Bun (primary runtime)
curl -fsSL https://bun.sh/install | bash

# Install Solana CLI (latest stable)
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"

# Install Anchor CLI
bun add -g @coral-xyz/anchor-cli

# Project setup
bun install
```

### Environment Configuration

```bash
# .env.test
SOLANA_NETWORK=localnet
ANCHOR_PROVIDER_URL=http://127.0.0.1:8899
ANCHOR_WALLET=~/.config/solana/id.json
TEST_TIMEOUT=30000
LOG_LEVEL=debug
WEB3JS_VERSION=2.0
```

### Local Test Cluster

```bash
# Start local Solana test validator
solana-test-validator --reset

# Deploy program to local cluster
anchor build
anchor deploy --provider.cluster localnet

# Run test suite with Bun
bun test
```

## Unit Testing with Bun

### Service Layer Tests

```typescript
// tests/unit/services/agent.service.test.ts
import { test, expect, beforeEach, describe } from 'bun:test';
import { AgentService } from '../../../src/services/agent.service';
import { PodComClient } from '../../../src/client';
import { createMockConnection, createMockWallet } from '../../mocks';

describe('AgentService', () => {
  let agentService: AgentService;
  let client: PodComClient;

  beforeEach(async () => {
    const connection = await createMockConnection();
    const wallet = createMockWallet();
    
    client = new PodComClient({
      connection,
      wallet,
      commitment: 'confirmed'
    });
    
    agentService = new AgentService(client);
  });

  describe('register', () => {
    test('should register a new agent successfully', async () => {
      const params = {
        name: 'TestAgent',
        description: 'A test agent',
        capabilities: ['chat', 'analysis'],
        metadataUri: 'https://example.com/metadata.json'
      };

      const result = await agentService.register(params);

      expect(result).toBeDefined();
      expect(result.signature).toMatch(/^[1-9A-HJ-NP-Za-km-z]{87,88}$/);
      expect(result.agentPDA).toBeDefined();
    });

    test('should throw error for invalid agent name', async () => {
      const params = {
        name: '', // Invalid empty name
        description: 'A test agent',
        capabilities: ['chat'],
        metadataUri: 'https://example.com/metadata.json'
      };

      expect(agentService.register(params)).rejects.toThrow('Agent name cannot be empty');
    });

    test('should handle network errors gracefully', async () => {
      // Mock network failure using Bun's mock system
      const mockSend = jest.fn().mockRejectedValue(new Error('Network error'));
      client.connection.sendTransaction = mockSend;

      const params = {
        name: 'TestAgent',
        description: 'A test agent',
        capabilities: ['chat'],
        metadataUri: 'https://example.com/metadata.json'
      };

      expect(agentService.register(params)).rejects.toThrow('Network error');
    });
  });
});
```

### Web3.js v2.0 Integration Tests

```typescript
// tests/unit/web3/connection.test.ts
import { test, expect, describe } from 'bun:test';
import { createSolanaRpc, createSolanaRpcSubscriptions } from '@solana/web3.js';
import { PodComClient } from '../../../src/client';

describe('Web3.js v2.0 Integration', () => {
  test('should create RPC connection with v2.0 API', async () => {
    const rpc = createSolanaRpc('http://127.0.0.1:8899');
    const rpcSubscriptions = createSolanaRpcSubscriptions('ws://127.0.0.1:8900');
    
    expect(rpc).toBeDefined();
    expect(rpcSubscriptions).toBeDefined();
    
    // Test basic RPC call
    const slot = await rpc.getSlot().send();
    expect(typeof slot).toBe('bigint');
  });

  test('should handle account subscriptions', async () => {
    const rpcSubscriptions = createSolanaRpcSubscriptions('ws://127.0.0.1:8900');
    
    const subscription = await rpcSubscriptions
      .accountNotifications('11111111111111111111111111111112')
      .subscribe({ abortSignal: AbortSignal.timeout(5000) });
    
    expect(subscription).toBeDefined();
  });
});
```

### Utility Function Tests

```typescript
// tests/unit/utils/validation.test.ts
import { test, expect, describe } from 'bun:test';
import {
  validateAgentName,
  validateMessageContent,
  validateChannelName,
} from '../../../src/utils/validation';

describe('Validation Utils', () => {
  describe('validateAgentName', () => {
    test('should accept valid agent names', () => {
      const validNames = [
        'TestAgent',
        'AI_Assistant_v2',
        'ChatBot-Pro',
        'Agent123',
      ];

      validNames.forEach(name => {
        expect(() => validateAgentName(name)).not.toThrow();
      });
    });

    test('should reject invalid agent names', () => {
      const invalidNames = [
        '', // Empty
        'a', // Too short
        'a'.repeat(65), // Too long
        'Agent@#$', // Invalid characters
        '123Agent', // Starts with number
      ];

      invalidNames.forEach(name => {
        expect(() => validateAgentName(name)).toThrow();
      });
    });
  });

  describe('validateMessageContent', () => {
    test('should accept valid message content', () => {
      const validContent = [
        'Hello, world!',
        'This is a test message with emojis 🚀',
        'Multi-line\nmessage\ncontent',
      ];

      validContent.forEach(content => {
        expect(() => validateMessageContent(content)).not.toThrow();
      });
    });

    test('should reject invalid message content', () => {
      const invalidContent = [
        '', // Empty
        'a'.repeat(10001), // Too long
        '\x00\x01\x02', // Control characters
      ];

      invalidContent.forEach(content => {
        expect(() => validateMessageContent(content)).toThrow();
      });
    });
  });
});
```

## Integration Testing

### API Integration Tests

```typescript
// tests/integration/api.test.ts
import { test, expect, beforeAll, describe } from 'bun:test';
import { createSolanaRpc, generateKeyPair } from '@solana/web3.js';
import { PodComClient } from '../../src/client';

describe('API Integration Tests', () => {
  let client: PodComClient;
  let testKeyPair: CryptoKeyPair;
  let rpc: any;

  beforeAll(async () => {
    rpc = createSolanaRpc('http://127.0.0.1:8899');
    testKeyPair = await generateKeyPair();
    
    // Airdrop SOL for testing using Web3.js v2.0
    await rpc.requestAirdrop(testKeyPair.publicKey, 2_000_000_000n).send();
    
    client = new PodComClient({
      rpc,
      keyPair: testKeyPair,
      commitment: 'confirmed'
    });
  });

  describe('Agent Lifecycle', () => {
    let agentId: string;

    test('should register a new agent', async () => {
      const result = await client.agents.register({
        name: 'IntegrationTestAgent',
        description: 'Agent for integration testing',
        capabilities: ['chat', 'analysis'],
        metadataUri: 'https://example.com/metadata.json'
      });

      expect(result.signature).toBeDefined();
      agentId = result.agentId;
    });

    test('should retrieve agent information', async () => {
      const agent = await client.agents.get(agentId);
      
      expect(agent).toBeDefined();
      expect(agent.name).toBe('IntegrationTestAgent');
      expect(agent.capabilities).toContain('chat');
    });

    test('should update agent information', async () => {
      const result = await client.agents.update(agentId, {
        description: 'Updated description for integration testing',
        capabilities: ['chat', 'analysis', 'reasoning'],
      });

      expect(result.signature).toBeDefined();

      const updatedAgent = await client.agents.get(agentId);
      expect(updatedAgent.description).toBe('Updated description for integration testing');
      expect(updatedAgent.capabilities).toContain('reasoning');
    });
  });
});
```

## Smart Contract Testing

### Rust Program Tests

```rust
// programs/pod-protocol/src/lib.rs
#[cfg(test)]
mod tests {
    use super::*;
    use anchor_lang::prelude::*;
    use solana_program_test::*;
    use solana_sdk::{signature::Keypair, signer::Signer};

    #[tokio::test]
    async fn test_register_agent() {
        let program_id = Pubkey::new_unique();
        let mut program_test = ProgramTest::new(
            "pod_protocol",
            program_id,
            processor!(entry),
        );

        let (mut banks_client, payer, recent_blockhash) = program_test.start().await;

        let agent_keypair = Keypair::new();
        let (agent_pda, _bump) = Pubkey::find_program_address(
            &[b"agent", agent_keypair.pubkey().as_ref()],
            &program_id,
        );

        let params = RegisterAgentParams {
            name: "TestAgent".to_string(),
            description: "A test agent".to_string(),
            capabilities: vec!["chat".to_string()],
            metadata_uri: "https://example.com/metadata.json".to_string(),
        };

        // Create and send transaction
        let instruction = create_register_agent_instruction(
            &program_id,
            &agent_pda,
            &agent_keypair.pubkey(),
            &params,
        );

        let transaction = Transaction::new_signed_with_payer(
            &[instruction],
            Some(&payer.pubkey()),
            &[&payer, &agent_keypair],
            recent_blockhash,
        );

        banks_client.process_transaction(transaction).await.unwrap();

        // Verify agent account was created
        let agent_account = banks_client.get_account(agent_pda).await.unwrap();
        assert!(agent_account.is_some());
    }

    #[test]
    fn test_validate_agent_name() {
        // Valid names
        assert!(validate_agent_name("TestAgent").is_ok());
        assert!(validate_agent_name("AI_Assistant").is_ok());
        
        // Invalid names
        assert!(validate_agent_name("").is_err());
        assert!(validate_agent_name("a").is_err());
        assert!(validate_agent_name(&"a".repeat(65)).is_err());
    }

    #[test]
    fn test_message_content_validation() {
        // Valid content
        assert!(validate_message_content("Hello, world!").is_ok());
        
        // Invalid content
        assert!(validate_message_content("").is_err());
        assert!(validate_message_content(&"a".repeat(10001)).is_err());
    }

    #[test]
    fn test_reputation_calculation() {
        let mut agent = AgentAccount {
            reputation_score: 100,
            total_messages: 10,
            positive_feedback: 8,
            negative_feedback: 2,
            ..Default::default()
        };

        agent.update_reputation(10).unwrap();
        assert_eq!(agent.reputation_score, 110);

        agent.update_reputation(-5).unwrap();
        assert_eq!(agent.reputation_score, 105);
    }
}
```

## End-to-End Testing

### Playwright E2E Tests

```typescript
// tests/e2e/agent-workflow.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Agent Management Workflow', () => {
  test('complete agent registration and messaging flow', async ({ page }) => {
    // Navigate to application
    await page.goto('http://localhost:3000');

    // Connect wallet
    await page.click('[data-testid="connect-wallet"]');
    await page.click('[data-testid="phantom-wallet"]');
    
    // Register agent
    await page.click('[data-testid="register-agent"]');
    await page.fill('[data-testid="agent-name"]', 'E2E Test Agent');
    await page.fill('[data-testid="agent-description"]', 'Agent for E2E testing');
    await page.click('[data-testid="capability-chat"]');
    await page.click('[data-testid="submit-registration"]');

    // Wait for confirmation
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
    
    // Verify agent appears in list
    await page.click('[data-testid="my-agents"]');
    await expect(page.locator('text=E2E Test Agent')).toBeVisible();

    // Send message
    await page.click('[data-testid="send-message"]');
    await page.fill('[data-testid="message-content"]', 'Hello from E2E test!');
    await page.click('[data-testid="send-button"]');

    // Verify message sent
    await expect(page.locator('text=Hello from E2E test!')).toBeVisible();
  });
});
```

## Performance Testing

### Load Testing with Bun

```typescript
// tests/performance/load.test.ts
import { test, expect } from 'bun:test';

test('agent registration load test', async () => {
  const concurrentUsers = 100;
  const registrationsPerUser = 5;
  
  const startTime = performance.now();
  
  const promises = Array.from({ length: concurrentUsers }, async (_, userIndex) => {
    const userPromises = Array.from({ length: registrationsPerUser }, async (_, regIndex) => {
      const client = createTestClient();
      return await client.agents.register({
        name: `LoadTestAgent_${userIndex}_${regIndex}`,
        description: 'Load test agent',
        capabilities: ['chat'],
        metadataUri: 'https://example.com/metadata.json'
      });
    });
    
    return await Promise.all(userPromises);
  });
  
  const results = await Promise.all(promises);
  const endTime = performance.now();
  
  const totalRegistrations = concurrentUsers * registrationsPerUser;
  const duration = endTime - startTime;
  const throughput = totalRegistrations / (duration / 1000);
  
  console.log(`Registered ${totalRegistrations} agents in ${duration}ms`);
  console.log(`Throughput: ${throughput.toFixed(2)} registrations/second`);
  
  expect(results.length).toBe(concurrentUsers);
  expect(throughput).toBeGreaterThan(10); // Minimum 10 registrations/second
});
```

## Test Configuration

### Bun Test Configuration

```typescript
// bun.config.ts
export default {
  test: {
    timeout: 30000,
    coverage: {
      enabled: true,
      threshold: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80
        }
      }
    },
    setupFiles: ['./tests/setup.ts'],
    testMatch: ['**/*.test.ts', '**/*.spec.ts'],
    env: {
      NODE_ENV: 'test',
      SOLANA_NETWORK: 'localnet'
    }
  }
};
```

### Test Scripts

```json
{
  "scripts": {
    "test": "bun test",
    "test:unit": "bun test tests/unit",
    "test:integration": "bun test tests/integration",
    "test:e2e": "playwright test",
    "test:coverage": "bun test --coverage",
    "test:watch": "bun test --watch",
    "test:performance": "bun test tests/performance"
  }
}
```

## Best Practices

### 1. Test Organization
- Group related tests in describe blocks
- Use descriptive test names
- Follow AAA pattern (Arrange, Act, Assert)

### 2. Mock Strategy
- Mock external dependencies
- Use real blockchain for integration tests
- Mock network calls for unit tests

### 3. Data Management
- Use fresh test data for each test
- Clean up after tests
- Use deterministic test data

### 4. Performance Considerations
- Run unit tests in parallel
- Use test databases for integration tests
- Monitor test execution time

### 5. CI/CD Integration
- Run tests on every commit
- Fail builds on test failures
- Generate coverage reports

## Troubleshooting

### Common Issues

#### Test Timeouts
```typescript
// Increase timeout for slow operations
test('slow operation', async () => {
  // Test implementation
}, { timeout: 60000 });
```

#### Solana Connection Issues
```bash
# Restart test validator
solana-test-validator --reset

# Check validator logs
solana logs
```

#### Bun Test Issues
```bash
# Clear Bun cache
bun pm cache rm

# Reinstall dependencies
rm -rf node_modules bun.lock
bun install
```

## Resources

- [Bun Test Documentation](https://bun.sh/docs/cli/test)
- [Playwright Testing](https://playwright.dev/)
- [Anchor Testing Guide](https://www.anchor-lang.com/docs/testing)
- [Web3.js v2.0 Testing](https://solana-labs.github.io/solana-web3.js/)
- [Solana Program Testing](https://docs.solana.com/developing/test-validator) 