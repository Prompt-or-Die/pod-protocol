// Jest setup file for PoD Protocol JavaScript SDK tests
// @ts-nocheck
import { jest, beforeAll, afterAll } from '@jest/globals';
import { Connection, PublicKey } from '@solana/web3.js';

// Mock Solana web3.js Connection for tests that don't need real network
jest.mock('@solana/web3.js', () => {
  // @ts-ignore
  const actual = jest.requireActual('@solana/web3.js');
  return {
    // @ts-ignore
    ...actual,
    Connection: jest.fn().mockImplementation(() => ({
      requestAirdrop: jest.fn().mockResolvedValue('mockTxSignature'),
      getAccountInfo: jest.fn().mockResolvedValue(null),
      sendTransaction: jest.fn().mockResolvedValue('mockTxSignature'),
      confirmTransaction: jest.fn().mockResolvedValue({ value: { err: null } }),
      getRecentBlockhash: jest.fn().mockResolvedValue({ 
        blockhash: 'mockBlockhash', 
        feeCalculator: { lamportsPerSignature: 5000 } 
      }),
    })),
  };
});

// Global test configuration
global.testConfig = {
  timeout: 30000,
  retries: 3,
  mockMode: process.env.NODE_ENV === 'test',
};

// Console override for cleaner test output
const originalConsoleError = console.error;
console.error = (...args) => {
  // Filter out expected errors during testing
  const message = args[0];
  if (typeof message === 'string' && (
    message.includes('Warning:') ||
    message.includes('validateAgentData') ||
    message.includes('Expected error for testing')
  )) {
    return;
  }
  originalConsoleError.apply(console, args);
};

// Setup and teardown
beforeAll(() => {
  console.log('🚀 Starting PoD Protocol JavaScript SDK Tests');
});

afterAll(() => {
  console.log('✅ PoD Protocol JavaScript SDK Tests Complete');
});
