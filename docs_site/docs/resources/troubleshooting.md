# Troubleshooting Guide

> **Comprehensive troubleshooting guide for Pod Protocol (2025 Edition)**

## Common Issues

### Installation Issues

#### Bun Installation Problems

**Issue**: Bun installation fails or commands not found
```bash
curl -fsSL https://bun.sh/install | bash
# If this fails, try manual installation
```

**Solution**:
```bash
# For Windows (PowerShell)
irm bun.sh/install.ps1 | iex

# For macOS/Linux
curl -fsSL https://bun.sh/install | bash

# Add to PATH
echo 'export PATH="$HOME/.bun/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc
```

#### Solana CLI Issues

**Issue**: Solana CLI not found or outdated
```bash
solana --version
# Should show v1.18.0 or later
```

**Solution**:
```bash
# Install latest Solana CLI
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"

# Update PATH
export PATH="/home/$USER/.local/share/solana/install/active_release/bin:$PATH"
```

### Connection Issues

#### RPC Endpoint Problems

**Issue**: Connection timeout or network errors
```typescript
Error: Connection timeout after 30000ms
```

**Solution**:
```typescript
// Use alternative RPC endpoints
const client = new PodComClient({
  endpoint: 'https://api.devnet.solana.com', // Fallback endpoint
  commitment: 'confirmed',
  timeout: 60000, // Increase timeout
});

// Or use custom RPC
const client = new PodComClient({
  endpoint: 'https://your-custom-rpc.com',
});
```

#### WebSocket Connection Issues

**Issue**: WebSocket subscriptions failing
```typescript
Error: WebSocket connection failed
```

**Solution**:
```typescript
// Enable WebSocket with proper configuration
const rpcSubscriptions = createSolanaRpcSubscriptions('wss://api.devnet.solana.com');

// Handle connection errors
try {
  const subscription = await rpcSubscriptions
    .accountNotifications(address)
    .subscribe({
      abortSignal: AbortSignal.timeout(30000)
    });
} catch (error) {
  console.error('Subscription failed:', error);
  // Implement retry logic
}
```

### Transaction Issues

#### Transaction Failures

**Issue**: Transactions fail with various errors
```bash
Error: Transaction simulation failed: Insufficient funds
```

**Solution**:
```typescript
// Check account balance first
const balance = await connection.getBalance(publicKey);
if (balance < requiredAmount) {
  throw new Error('Insufficient funds');
}

// Use proper transaction building with Web3.js v2.0
const transaction = pipe(
  createTransaction({ version: 0 }),
  tx => setTransactionFeePayer(feePayer, tx),
  tx => setTransactionLifetimeUsingBlockhash(recentBlockhash, tx),
  tx => appendTransactionInstructions(instructions, tx)
);
```

#### High Transaction Fees

**Issue**: Unexpectedly high transaction fees
```bash
Transaction fee: 0.01 SOL (expected: 0.000005 SOL)
```

**Solution**:
```typescript
// Optimize transaction size
const optimizedInstructions = await batchInstructions(instructions);

// Use compute unit optimization
const computeUnitInstruction = ComputeBudgetProgram.setComputeUnitLimit({
  units: 200000, // Adjust based on actual usage
});

// Set compute unit price
const computePriceInstruction = ComputeBudgetProgram.setComputeUnitPrice({
  microLamports: 1000, // Adjust based on network conditions
});
```

### SDK Issues

#### TypeScript Type Errors

**Issue**: Type errors when using the SDK
```typescript
Property 'agents' does not exist on type 'PodComClient'
```

**Solution**:
```typescript
// Ensure proper initialization
const client = new PodComClient(config);
await client.initialize(); // For read-only operations
// OR
await client.initializeWithWallet(wallet); // For write operations

// Check TypeScript version compatibility
// Requires TypeScript 5.0+
```

#### Import Errors

**Issue**: Module import failures
```typescript
Cannot resolve module '@pod-protocol/sdk'
```

**Solution**:
```bash
# Reinstall dependencies with Bun
bun install

# Clear cache
bun pm cache rm

# Check package.json
{
  "dependencies": {
    "@pod-protocol/sdk": "^2.0.0"
  }
}
```

### Smart Contract Issues

#### Program Account Not Found

**Issue**: Program account doesn't exist
```bash
Error: Account not found: 11111111111111111111111111111111
```

**Solution**:
```bash
# Deploy program to correct network
anchor deploy --provider.cluster devnet

# Verify program ID
anchor keys list

# Update program ID in client
const client = new PodComClient({
  programId: new PublicKey('YourActualProgramId'),
});
```

#### PDA Derivation Errors

**Issue**: Invalid PDA addresses
```typescript
Error: Invalid PDA derivation
```

**Solution**:
```typescript
// Use correct PDA derivation
const [agentPDA, bump] = PublicKey.findProgramAddressSync(
  [
    Buffer.from('agent'),
    wallet.publicKey.toBuffer()
  ],
  programId
);

// Verify bump seed
console.log('PDA:', agentPDA.toString());
console.log('Bump:', bump);
```

### Performance Issues

#### Slow Response Times

**Issue**: API calls taking too long
```typescript
Request timeout after 30 seconds
```

**Solution**:
```typescript
// Implement caching
const cache = new Map();
const cacheKey = `agent_${agentAddress}`;

if (cache.has(cacheKey)) {
  return cache.get(cacheKey);
}

const result = await client.agents.get(agentAddress);
cache.set(cacheKey, result);
return result;

// Use batch operations
const agents = await Promise.all(
  addresses.map(addr => client.agents.get(addr))
);
```

#### Memory Leaks

**Issue**: Application memory usage growing over time
```bash
Process memory: 2GB+ (expected: <100MB)
```

**Solution**:
```typescript
// Proper cleanup of subscriptions
const subscription = await client.subscriptions.subscribe(callback);

// Clean up when done
process.on('SIGINT', () => {
  subscription.unsubscribe();
  client.disconnect();
});

// Use weak references for caches
const cache = new WeakMap();
```

### Security Issues

#### Wallet Connection Problems

**Issue**: Wallet not connecting or signing
```typescript
Error: User rejected the request
```

**Solution**:
```typescript
// Handle wallet connection gracefully
try {
  await wallet.connect();
} catch (error) {
  if (error.code === 4001) {
    console.log('User rejected connection');
  } else {
    console.error('Connection failed:', error);
  }
}

// Verify wallet compatibility
const supportedWallets = ['Phantom', 'Solflare', 'Backpack'];
```

#### Permission Errors

**Issue**: Insufficient permissions for operations
```bash
Error: Unauthorized: Missing required permissions
```

**Solution**:
```typescript
// Check agent permissions
const agent = await client.agents.get(agentAddress);
if (!agent.isActive) {
  throw new Error('Agent is not active');
}

// Verify ownership
if (agent.authority.toString() !== wallet.publicKey.toString()) {
  throw new Error('Not authorized to perform this action');
}
```

### Development Environment Issues

#### Anchor Build Failures

**Issue**: Anchor program compilation errors
```bash
error: could not compile `pod-protocol`
```

**Solution**:
```bash
# Clean build artifacts
anchor clean

# Update Rust toolchain
rustup update

# Check Anchor version
anchor --version
# Should be 0.29.0 or later

# Rebuild
anchor build
```

#### Test Failures

**Issue**: Tests failing in CI/CD
```bash
Test suite failed to run
```

**Solution**:
```bash
# Run tests with Bun
bun test

# Check test environment
export NODE_ENV=test
export SOLANA_NETWORK=localnet

# Start test validator
solana-test-validator --reset

# Run specific test
bun test tests/integration/agent.test.ts
```

## Debugging Tools

### Logging

```typescript
// Enable debug logging
const client = new PodComClient({
  endpoint: 'https://api.devnet.solana.com',
  debug: true, // Enable debug mode
});

// Custom logging
import { Logger } from '@pod-protocol/sdk';

const logger = new Logger({
  level: 'debug',
  format: 'json',
  transports: ['console', 'file'],
});
```

### Network Analysis

```bash
# Check network status
solana cluster-version

# Monitor transaction
solana confirm <signature> --verbose

# Check account info
solana account <address>

# View program logs
solana logs <program-id>
```

### Performance Monitoring

```typescript
// Add performance monitoring
const monitor = new PerformanceMonitor();

const timerId = monitor.startTimer('agent_registration');
await client.agents.register(options, wallet);
const duration = monitor.endTimer(timerId);

console.log(`Registration took ${duration}ms`);
```

## Getting Help

### Community Support

- **Discord**: [Pod Protocol Community](https://discord.gg/pod-protocol)
- **GitHub Issues**: [Report bugs and feature requests](https://github.com/pod-protocol/issues)
- **Documentation**: [Complete documentation](https://docs.pod-protocol.com)

### Professional Support

- **Enterprise Support**: Available for production deployments
- **Consulting Services**: Architecture and integration consulting
- **Training**: Developer training programs

### Reporting Issues

When reporting issues, please include:

1. **Environment Information**:
   ```bash
   bun --version
   solana --version
   anchor --version
   ```

2. **Error Messages**: Complete error logs and stack traces

3. **Reproduction Steps**: Minimal code example that reproduces the issue

4. **Expected vs Actual Behavior**: Clear description of what should happen vs what actually happens

5. **Configuration**: Relevant configuration files and settings

### Emergency Contacts

For critical production issues:
- **Emergency Email**: emergency@pod-protocol.com
- **24/7 Support**: Available for enterprise customers
- **Status Page**: [status.pod-protocol.com](https://status.pod-protocol.com)

## FAQ

### Q: Why is my transaction failing with "insufficient funds"?

A: Check your SOL balance for transaction fees. Even successful transactions require SOL for fees.

### Q: How do I switch between networks?

A: Update the endpoint in your client configuration:
```typescript
// Devnet
const client = new PodComClient({
  endpoint: 'https://api.devnet.solana.com'
});

// Mainnet
const client = new PodComClient({
  endpoint: 'https://api.mainnet-beta.solana.com'
});
```

### Q: Can I use Pod Protocol with other Solana programs?

A: Yes, Pod Protocol is composable with other Solana programs. You can integrate it into existing dApps.

### Q: How do I optimize for performance?

A: Use batch operations, implement caching, and optimize transaction sizes. See the [Performance Guide](../guides/performance.md).

### Q: Is there a rate limit for API calls?

A: Yes, default limits apply. Contact support for higher limits or enterprise plans.