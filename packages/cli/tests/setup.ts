/**
 * Test Setup for ZK Compression Integration Tests
 * Configures environment variables and global test utilities
 */

// Set environment to development for all tests
process.env.ZK_COMPRESSION_DEV = 'true';

// Mock console methods to reduce noise in tests unless explicitly needed
const originalConsoleLog = console.log;
const originalConsoleWarn = console.warn;
const originalConsoleError = console.error;

// Global test utilities
(global as any).testUtils = {
  enableConsole: () => {
    console.log = originalConsoleLog;
    console.warn = originalConsoleWarn;
    console.error = originalConsoleError;
  },
  
  silenceConsole: () => {
    console.log = jest.fn();
    console.warn = jest.fn(); 
    console.error = jest.fn();
  },
  
  createMockWallet: (address = 'TEST_WALLET_ADDRESS') => ({
    address: { toString: () => address },
    signTransactions: jest.fn().mockResolvedValue([]),
    signTransaction: jest.fn().mockResolvedValue({}),
  }),
  
  createMockAsset: (id: string, compressed = true) => ({
    id,
    content: {
      metadata: {
        name: `Test Asset ${id}`,
        symbol: 'TEST',
        description: 'A test compressed NFT'
      },
      files: [{
        uri: `https://example.com/${id}.png`,
        mime: 'image/png'
      }],
      json_uri: `https://example.com/${id}.json`
    },
    compression: compressed ? {
      compressed: true,
      tree: `tree_${Math.random().toString(36).substring(7)}`,
      leaf_id: Math.floor(Math.random() * 1000),
      data_hash: `data_${Math.random().toString(36).substring(7)}`,
      creator_hash: `creator_${Math.random().toString(36).substring(7)}`,
      asset_hash: `asset_${Math.random().toString(36).substring(7)}`,
      seq: Math.floor(Math.random() * 100)
    } : undefined,
    ownership: {
      owner: `owner_${Math.random().toString(36).substring(7)}`,
      ownership_model: 'single'
    },
    royalty: {
      royalty_model: 'creators',
      percent: 5,
      basis_points: 500
    }
  }),
  
  createMockTreeConfig: (maxDepth = 14, maxBufferSize = 64, canopyDepth = 10) => ({
    maxDepth,
    maxBufferSize,
    canopyDepth,
    capacity: Math.pow(2, maxDepth),
    storageSize: Math.pow(2, maxDepth) * 32 + maxBufferSize * 32 + canopyDepth * 32
  }),
  
  wait: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),
  
  expectValidAddress: (address: string) => {
    expect(typeof address).toBe('string');
    expect(address.length).toBeGreaterThan(0);
    expect(address).not.toBe('undefined');
    expect(address).not.toBe('null');
  },
  
  expectValidSignature: (signature: string) => {
    expect(typeof signature).toBe('string');
    expect(signature.length).toBeGreaterThan(0);
    // Development signatures should have a prefix
    expect(signature).toMatch(/^(sig_|mint_|transfer_|dev_)/);
  }
};

// Silence console by default for cleaner test output
(global as any).testUtils.silenceConsole();

// Add custom Jest matchers for ZK compression testing
expect.extend({
  toBeValidTreeConfig(received: any) {
    const pass = received &&
      typeof received.maxDepth === 'number' &&
      typeof received.maxBufferSize === 'number' &&
      typeof received.canopyDepth === 'number' &&
      received.maxDepth >= 3 && received.maxDepth <= 30 &&
      received.maxBufferSize > 0 &&
      received.canopyDepth >= 0;

    return {
      message: () => `Expected ${received} to be a valid tree configuration`,
      pass
    };
  },

  toBeCompressedAsset(received: any) {
    const pass = received &&
      received.compression &&
      received.compression.compressed === true &&
      received.compression.tree &&
      typeof received.compression.leaf_id === 'number';

    return {
      message: () => `Expected ${received} to be a compressed asset`,
      pass
    };
  },

  toHaveValidDASStructure(received: any) {
    const pass = received &&
      received.id &&
      received.content &&
      received.ownership &&
      received.content.metadata;

    return {
      message: () => `Expected ${received} to have valid DAS API structure`,
      pass
    };
  }
});

// Custom Jest matchers removed for TypeScript compatibility

// Clean up after all tests
afterAll(() => {
  // Restore console methods
  console.log = originalConsoleLog;
  console.warn = originalConsoleWarn;
  console.error = originalConsoleError;
  
  // Clean up environment variables
  delete process.env.ZK_COMPRESSION_DEV;
}); 