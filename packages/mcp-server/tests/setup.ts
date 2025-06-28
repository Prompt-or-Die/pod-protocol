import { mock } from 'bun:test';

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.POD_PROTOCOL_RPC_ENDPOINT = 'http://localhost:8899';
process.env.POD_PROTOCOL_PROGRAM_ID = 'test-program-id';
process.env.MCP_SERVER_NAME = 'test-server';
process.env.HTTP_PORT = '3001';
process.env.WS_PORT = '3002';

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: mock(),
  debug: mock(),
  info: mock(),
  warn: mock(),
  error: mock(),
};

// Mock fetch for HTTP requests
global.fetch = mock() as any;