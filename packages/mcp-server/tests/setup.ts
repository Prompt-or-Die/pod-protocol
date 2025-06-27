import { jest } from '@jest/globals';

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.POD_PROTOCOL_RPC_ENDPOINT = 'http://localhost:8899';
process.env.POD_PROTOCOL_PROGRAM_ID = 'test-program-id';
process.env.MCP_SERVER_NAME = 'test-server';
process.env.HTTP_PORT = '3001';
process.env.WS_PORT = '3002';

// Increase timeout for integration tests
jest.setTimeout(30000);

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Mock fetch for HTTP requests
global.fetch = jest.fn() as jest.MockedFunction<typeof fetch>;

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
});