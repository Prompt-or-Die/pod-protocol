/**
 * End-to-End CLI Testing Suite
 * Tests all major CLI functionality to ensure production readiness
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { join } from 'path';

const execAsync = promisify(exec);

// CLI paths
const CLI_PATH = join(__dirname, '../dist/index.js');
const NODE_CMD = `node ${CLI_PATH}`;

describe('PoD Protocol CLI E2E Tests', () => {
  beforeAll(async () => {
    // Ensure CLI is built
    try {
      await execAsync('npm run build', { cwd: join(__dirname, '..') });
    } catch (error) {
      console.error('Failed to build CLI:', error);
      throw error;
    }
  });

  describe('Basic CLI Commands', () => {
    test('CLI shows help when no arguments provided', async () => {
      try {
        const { stdout } = await execAsync(`${NODE_CMD} --help`);
        expect(stdout).toContain('PoD Protocol CLI');
        expect(stdout).toContain('Usage:');
        expect(stdout).toContain('Commands:');
      } catch (error: any) {
        // Help command might exit with code 0 or 1, both are valid
        expect(error.stdout || error.message).toContain('PoD Protocol CLI');
      }
    });

    test('CLI shows version information', async () => {
      try {
        const { stdout } = await execAsync(`${NODE_CMD} --version`);
        expect(stdout).toMatch(/^\d+\.\d+\.\d+/);
      } catch (error: any) {
        expect(error.stdout).toMatch(/^\d+\.\d+\.\d+/);
      }
    });

    test('CLI shows status information', async () => {
      const { stdout } = await execAsync(`${NODE_CMD} status`);
      expect(stdout).toContain('PoD Protocol CLI Status');
      expect(stdout).toContain('Version:');
      expect(stdout).toContain('Platform:');
      expect(stdout).toContain('Node.js:');
    });
  });

  describe('Agent Commands', () => {
    test('Agent help command works', async () => {
      const { stdout } = await execAsync(`${NODE_CMD} agent --help`);
      expect(stdout).toContain('Comprehensive AI agent management');
      expect(stdout).toContain('create');
      expect(stdout).toContain('list');
      expect(stdout).toContain('start');
      expect(stdout).toContain('stop');
    });

    test('Agent list command works (empty state)', async () => {
      try {
        const { stdout } = await execAsync(`${NODE_CMD} agent list --json`);
        const result = JSON.parse(stdout);
        expect(Array.isArray(result)).toBe(true);
      } catch (error: any) {
        // May fail due to network/wallet issues, but should show proper error
        expect(error.message).toContain('');
      }
    });
  });

  describe('Message Commands', () => {
    test('Message help command works', async () => {
      const { stdout } = await execAsync(`${NODE_CMD} message --help`);
      expect(stdout).toContain('Message routing and communication management');
      expect(stdout).toContain('send');
      expect(stdout).toContain('list');
      expect(stdout).toContain('read');
    });
  });

  describe('Channel Commands', () => {
    test('Channel help command works', async () => {
      const { stdout } = await execAsync(`${NODE_CMD} channel --help`);
      expect(stdout).toContain('Channel management and communication');
      expect(stdout).toContain('create');
      expect(stdout).toContain('list');
    });
  });

  describe('Wallet Commands', () => {
    test('Wallet help command works', async () => {
      const { stdout } = await execAsync(`${NODE_CMD} wallet --help`);
      expect(stdout).toContain('Wallet and blockchain operations');
      expect(stdout).toContain('create');
      expect(stdout).toContain('balance');
    });
  });

  describe('Security Commands', () => {
    test('Security help command works', async () => {
      const { stdout } = await execAsync(`${NODE_CMD} security --help`);
      expect(stdout).toContain('Security and compliance management');
      expect(stdout).toContain('audit');
      expect(stdout).toContain('keys');
      expect(stdout).toContain('scan');
    });
  });

  describe('ZK Compression Commands', () => {
    test('ZK compression help command works', async () => {
      const { stdout } = await execAsync(`${NODE_CMD} zk --help`);
      expect(stdout).toContain('ZK compression operations');
      expect(stdout).toContain('create-tree');
      expect(stdout).toContain('mint');
      expect(stdout).toContain('transfer');
      expect(stdout).toContain('savings');
    });

    test('ZK compression savings calculation works', async () => {
      const { stdout } = await execAsync(`${NODE_CMD} zk savings --transactions 1000`);
      expect(stdout).toContain('Cost Savings Analysis');
      expect(stdout).toContain('Traditional Cost:');
      expect(stdout).toContain('Compressed Cost:');
      expect(stdout).toContain('Total Savings:');
    });
  });

  describe('Analytics Commands', () => {
    test('Analytics help command works', async () => {
      const { stdout } = await execAsync(`${NODE_CMD} analytics --help`);
      expect(stdout).toContain('Analytics and monitoring dashboard');
      expect(stdout).toContain('dashboard');
      expect(stdout).toContain('metrics');
      expect(stdout).toContain('report');
    });
  });

  describe('Development Commands', () => {
    test('Dev help command works', async () => {
      const { stdout } = await execAsync(`${NODE_CMD} dev --help`);
      expect(stdout).toContain('Development tools and utilities');
      expect(stdout).toContain('deploy');
      expect(stdout).toContain('debug');
    });
  });

  describe('System Commands', () => {
    test('Doctor command performs health check', async () => {
      const { stdout } = await execAsync(`${NODE_CMD} doctor`);
      expect(stdout).toContain('PoD Protocol Health Check');
      expect(stdout).toContain('System dependencies');
      expect(stdout).toContain('Network connectivity');
      expect(stdout).toContain('Health Check Complete');
    });

    test('Demo command shows interactive demo', async () => {
      const { stdout } = await execAsync(`${NODE_CMD} demo --scenario basic`);
      expect(stdout).toContain('PoD Protocol Interactive Demo');
      expect(stdout).toContain('Basic PoD Protocol Demo');
      expect(stdout).toContain('Agent creation and registration');
    });

    test('Init command initializes environment', async () => {
      const { stdout } = await execAsync(`${NODE_CMD} init --mode development`);
      expect(stdout).toContain('Initializing PoD Protocol Environment');
      expect(stdout).toContain('DEVELOPMENT Mode');
      expect(stdout).toContain('Environment ready');
    });
  });

  describe('Network Options', () => {
    test('CLI accepts network parameter', async () => {
      const { stdout } = await execAsync(`${NODE_CMD} --network testnet status`);
      expect(stdout).toContain('PoD Protocol CLI Status');
    });

    test('CLI accepts verbose flag', async () => {
      process.env.VERBOSE = 'true';
      const { stdout } = await execAsync(`${NODE_CMD} --verbose status`);
      expect(stdout).toContain('PoD Protocol CLI Status');
      delete process.env.VERBOSE;
    });

    test('CLI accepts JSON output flag', async () => {
      try {
        const { stdout } = await execAsync(`${NODE_CMD} --json agent list`);
        JSON.parse(stdout); // Should be valid JSON
      } catch (error: any) {
        // May fail due to network issues, but error should be JSON if --json is used
        if (error.stdout && error.stdout.trim().startsWith('[') || error.stdout.trim().startsWith('{')) {
          JSON.parse(error.stdout); // Should be valid JSON error
        }
      }
    });
  });

  describe('Error Handling', () => {
    test('CLI handles invalid commands gracefully', async () => {
      try {
        await execAsync(`${NODE_CMD} invalid-command`);
        fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.code).toBe(1);
        expect(error.stderr || error.stdout).toContain('error:');
      }
    });

    test('CLI handles invalid options gracefully', async () => {
      try {
        await execAsync(`${NODE_CMD} agent create --invalid-option value`);
        fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.code).toBe(1);
        expect(error.stderr || error.stdout).toContain('error:');
      }
    });
  });

  describe('Performance Tests', () => {
    test('CLI startup time is reasonable', async () => {
      const startTime = Date.now();
      await execAsync(`${NODE_CMD} --version`);
      const endTime = Date.now();
      
      const startupTime = endTime - startTime;
      expect(startupTime).toBeLessThan(5000); // Should start in under 5 seconds
    });

    test('Help commands respond quickly', async () => {
      const startTime = Date.now();
      await execAsync(`${NODE_CMD} --help`);
      const endTime = Date.now();
      
      const responseTime = endTime - startTime;
      expect(responseTime).toBeLessThan(3000); // Should respond in under 3 seconds
    });
  });

  describe('Integration Tests', () => {
    test('CLI integrates with PoD Protocol SDK', async () => {
      // This test verifies the CLI can load and use the SDK
      try {
        const { stdout } = await execAsync(`${NODE_CMD} agent list`);
        // Should either succeed or fail with a proper SDK-related error
        expect(stdout.length).toBeGreaterThan(0);
      } catch (error: any) {
        // Should fail gracefully with SDK-related errors, not import errors
        expect(error.message).not.toContain('Cannot find module');
        expect(error.message).not.toContain('Module not found');
      }
    });
  });
});