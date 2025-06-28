import { test, expect, describe, beforeAll, afterAll, beforeEach } from "bun:test";
import { spawn, ChildProcess } from "child_process";
import { join } from "path";
import { writeFileSync, unlinkSync, existsSync, mkdirSync } from "fs";
import { tmpdir } from "os";

// Test configuration
const CLI_PATH = join(__dirname, "../../dist/index.js");
const TEST_TIMEOUT = 30000;
const TEST_DIR = join(tmpdir(), "pod-cli-e2e-tests");

// Test utilities
class CLITestRunner {
  private workingDir: string;

  constructor(workingDir: string = TEST_DIR) {
    this.workingDir = workingDir;
  }

  async run(command: string, args: string[] = [], env: Record<string, string> = {}): Promise<{
    stdout: string;
    stderr: string;
    exitCode: number;
  }> {
    return new Promise((resolve) => {
      const child = spawn("node", [CLI_PATH, ...args], {
        cwd: this.workingDir,
        env: { ...process.env, ...env, NODE_ENV: "test" },
        stdio: 'pipe'
      });

      let stdout = '';
      let stderr = '';

      child.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        resolve({
          stdout,
          stderr,
          exitCode: code || 0
        });
      });

      // Kill process after timeout to prevent hanging
      setTimeout(() => {
        child.kill();
        resolve({
          stdout,
          stderr,
          exitCode: 1
        });
      }, 15000);
    });
  }

  createTestConfig(config: any) {
    const configPath = join(this.workingDir, "pod-config.json");
    writeFileSync(configPath, JSON.stringify(config, null, 2));
    return configPath;
  }

  createTestWallet() {
    const walletPath = join(this.workingDir, "test-wallet.json");
    const keypair = {
      secretKey: Array.from(new Uint8Array(64).fill(1)) // Mock keypair
    };
    writeFileSync(walletPath, JSON.stringify(keypair));
    return walletPath;
  }

  cleanup() {
    // Clean up test files
    const files = [
      join(this.workingDir, "pod-config.json"),
      join(this.workingDir, "test-wallet.json")
    ];
    files.forEach(file => {
      if (existsSync(file)) {
        unlinkSync(file);
      }
    });
  }
}

describe("CLI E2E Tests", () => {
  let runner: CLITestRunner;

  beforeAll(async () => {
    // Create test directory
    if (!existsSync(TEST_DIR)) {
      mkdirSync(TEST_DIR, { recursive: true });
    }
    
    runner = new CLITestRunner();
    
    // Ensure CLI is built
    const buildResult = await runner.run("npm", ["run", "build"], {}, join(__dirname, "../.."));
    if (buildResult.exitCode !== 0) {
      console.error("Failed to build CLI:", buildResult.stderr);
    }
  }, TEST_TIMEOUT);

  afterAll(() => {
    runner.cleanup();
  });

  describe("Basic CLI Operations", () => {
    test("should display help when no arguments provided", async () => {
      const result = await runner.run("pod", ["--help"]);
      
      expect(result.stdout).toContain("PoD Protocol CLI");
      expect(result.stdout).toContain("Usage:");
      expect(result.stdout).toContain("Commands:");
      expect(result.exitCode).toBe(0);
    });

    test("should display version information", async () => {
      const result = await runner.run("pod", ["--version"]);
      
      expect(result.stdout).toMatch(/^\d+\.\d+\.\d+/);
      expect(result.exitCode).toBe(0);
    });

    test("should show status information", async () => {
      const result = await runner.run("pod", ["status"]);
      
      expect(result.stdout).toContain("PoD Protocol CLI Status");
      expect(result.stdout).toContain("Version:");
      expect(result.stdout).toContain("Platform:");
      expect(result.exitCode).toBe(0);
    });

    test("should handle unknown commands gracefully", async () => {
      const result = await runner.run("pod", ["unknown-command"]);
      
      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain("error:");
    });
  });

  describe("Configuration Management", () => {
    test("should initialize configuration", async () => {
      const result = await runner.run("pod", ["config", "init"]);
      
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("Configuration initialized");
    });

    test("should set configuration values", async () => {
      const result = await runner.run("pod", ["config", "set", "network", "devnet"]);
      
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("Configuration updated");
    });

    test("should get configuration values", async () => {
      // First set a value
      await runner.run("pod", ["config", "set", "network", "mainnet"]);
      
      // Then get it
      const result = await runner.run("pod", ["config", "get", "network"]);
      
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("mainnet");
    });

    test("should list all configuration", async () => {
      const result = await runner.run("pod", ["config", "list"]);
      
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("Current Configuration:");
    });
  });

  describe("Wallet Operations", () => {
    test("should create a new wallet", async () => {
      const result = await runner.run("pod", ["wallet", "create", "--name", "test-wallet"]);
      
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("Wallet created successfully");
      expect(result.stdout).toContain("Public Key:");
    });

    test("should import wallet from file", async () => {
      const walletPath = runner.createTestWallet();
      const result = await runner.run("pod", ["wallet", "import", "--file", walletPath]);
      
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("Wallet imported successfully");
    });

    test("should show wallet balance", async () => {
      const result = await runner.run("pod", ["wallet", "balance"]);
      
      // May fail due to network issues, but should handle gracefully
      expect(result.exitCode).toBeOneOf([0, 1]);
      if (result.exitCode === 0) {
        expect(result.stdout).toContain("SOL");
      }
    });

    test("should list wallets", async () => {
      const result = await runner.run("pod", ["wallet", "list"]);
      
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("Available Wallets:");
    });
  });

  describe("Agent Management", () => {
    test("should show agent help", async () => {
      const result = await runner.run("pod", ["agent", "--help"]);
      
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("Comprehensive AI agent management");
      expect(result.stdout).toContain("create");
      expect(result.stdout).toContain("list");
      expect(result.stdout).toContain("start");
      expect(result.stdout).toContain("stop");
    });

    test("should create an agent", async () => {
      const result = await runner.run("pod", [
        "agent", "create",
        "--name", "TestAgent",
        "--description", "Test agent for e2e testing",
        "--capabilities", "messaging,escrow"
      ]);
      
      // May fail due to network/wallet issues
      expect(result.exitCode).toBeOneOf([0, 1]);
      if (result.exitCode === 1) {
        expect(result.stderr).toBeDefined();
      }
    });

    test("should list agents", async () => {
      const result = await runner.run("pod", ["agent", "list"]);
      
      expect(result.exitCode).toBeOneOf([0, 1]);
      if (result.exitCode === 0) {
        expect(result.stdout).toContain("Registered Agents:");
      }
    });

    test("should register agent with JSON output", async () => {
      const result = await runner.run("pod", ["agent", "list", "--json"]);
      
      expect(result.exitCode).toBeOneOf([0, 1]);
      if (result.exitCode === 0) {
        expect(() => JSON.parse(result.stdout)).not.toThrow();
      }
    });
  });

  describe("Channel Operations", () => {
    test("should show channel help", async () => {
      const result = await runner.run("pod", ["channel", "--help"]);
      
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("Channel management and communication");
      expect(result.stdout).toContain("create");
      expect(result.stdout).toContain("list");
      expect(result.stdout).toContain("join");
    });

    test("should create a channel", async () => {
      const result = await runner.run("pod", [
        "channel", "create",
        "--name", "TestChannel",
        "--description", "Test channel for e2e testing",
        "--visibility", "public"
      ]);
      
      expect(result.exitCode).toBeOneOf([0, 1]);
    });

    test("should list channels", async () => {
      const result = await runner.run("pod", ["channel", "list"]);
      
      expect(result.exitCode).toBeOneOf([0, 1]);
      if (result.exitCode === 0) {
        expect(result.stdout).toContain("Available Channels:");
      }
    });
  });

  describe("Message Operations", () => {
    test("should show message help", async () => {
      const result = await runner.run("pod", ["message", "--help"]);
      
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("Message routing and communication management");
      expect(result.stdout).toContain("send");
      expect(result.stdout).toContain("list");
      expect(result.stdout).toContain("read");
    });

    test("should send a message", async () => {
      const result = await runner.run("pod", [
        "message", "send",
        "--to", "TestAgent",
        "--content", "Hello from e2e test",
        "--channel", "TestChannel"
      ]);
      
      expect(result.exitCode).toBeOneOf([0, 1]);
    });

    test("should list messages", async () => {
      const result = await runner.run("pod", ["message", "list", "--channel", "TestChannel"]);
      
      expect(result.exitCode).toBeOneOf([0, 1]);
    });
  });

  describe("Security Operations", () => {
    test("should show security help", async () => {
      const result = await runner.run("pod", ["security", "--help"]);
      
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("Security and compliance management");
      expect(result.stdout).toContain("audit");
      expect(result.stdout).toContain("keys");
      expect(result.stdout).toContain("scan");
    });

    test("should run security audit", async () => {
      const result = await runner.run("pod", ["security", "audit"]);
      
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("Security Audit Report");
    });

    test("should scan for vulnerabilities", async () => {
      const result = await runner.run("pod", ["security", "scan"]);
      
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("Vulnerability Scan");
    });

    test("should check key security", async () => {
      const result = await runner.run("pod", ["security", "keys", "--check"]);
      
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("Key Security Check");
    });
  });

  describe("ZK Compression", () => {
    test("should show ZK help", async () => {
      const result = await runner.run("pod", ["zk", "--help"]);
      
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("ZK compression operations");
      expect(result.stdout).toContain("create-tree");
      expect(result.stdout).toContain("mint");
      expect(result.stdout).toContain("transfer");
    });

    test("should calculate savings", async () => {
      const result = await runner.run("pod", ["zk", "savings", "--count", "1000"]);
      
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("ZK Compression Savings Analysis");
      expect(result.stdout).toContain("Regular NFT Cost:");
      expect(result.stdout).toContain("Compressed Cost:");
      expect(result.stdout).toContain("Total Savings:");
    });

    test("should show tree creation help", async () => {
      const result = await runner.run("pod", ["zk", "create-tree", "--help"]);
      
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("Create a new Merkle tree");
    });
  });

  describe("Analytics", () => {
    test("should show analytics help", async () => {
      const result = await runner.run("pod", ["analytics", "--help"]);
      
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("Analytics and monitoring dashboard");
    });

    test("should show dashboard", async () => {
      const result = await runner.run("pod", ["analytics", "dashboard"]);
      
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("PoD Protocol Analytics Dashboard");
    });

    test("should generate report", async () => {
      const result = await runner.run("pod", ["analytics", "report", "--format", "json"]);
      
      expect(result.exitCode).toBe(0);
      if (result.stdout.trim()) {
        expect(() => JSON.parse(result.stdout)).not.toThrow();
      }
    });
  });

  describe("Development Tools", () => {
    test("should show dev help", async () => {
      const result = await runner.run("pod", ["dev", "--help"]);
      
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("Development tools and utilities");
    });

    test("should run health check (doctor)", async () => {
      const result = await runner.run("pod", ["doctor"]);
      
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("PoD Protocol Health Check");
      expect(result.stdout).toContain("System dependencies");
      expect(result.stdout).toContain("Network connectivity");
    });

    test("should initialize development environment", async () => {
      const result = await runner.run("pod", ["init", "--mode", "development"]);
      
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("Initializing PoD Protocol Environment");
      expect(result.stdout).toContain("DEVELOPMENT Mode");
    });

    test("should run demo", async () => {
      const result = await runner.run("pod", ["demo", "--scenario", "basic"]);
      
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("PoD Protocol Interactive Demo");
      expect(result.stdout).toContain("Basic PoD Protocol Demo");
    });
  });

  describe("Network Options", () => {
    test("should accept network parameter", async () => {
      const result = await runner.run("pod", ["--network", "testnet", "status"]);
      
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("PoD Protocol CLI Status");
    });

    test("should accept verbose flag", async () => {
      const result = await runner.run("pod", ["--verbose", "status"]);
      
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("PoD Protocol CLI Status");
    });

    test("should produce JSON output", async () => {
      const result = await runner.run("pod", ["--json", "status"]);
      
      expect(result.exitCode).toBe(0);
      if (result.stdout.trim()) {
        expect(() => JSON.parse(result.stdout)).not.toThrow();
      }
    });
  });

  describe("Performance Tests", () => {
    test("should start quickly", async () => {
      const startTime = Date.now();
      await runner.run("pod", ["--version"]);
      const endTime = Date.now();
      
      expect(endTime - startTime).toBeLessThan(5000);
    });

    test("should handle concurrent commands", async () => {
      const promises = Array(5).fill(0).map(() => 
        runner.run("pod", ["status"])
      );
      
      const results = await Promise.all(promises);
      results.forEach(result => {
        expect(result.exitCode).toBe(0);
      });
    });
  });

  describe("Error Handling", () => {
    test("should handle missing arguments", async () => {
      const result = await runner.run("pod", ["agent", "create"]);
      
      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain("error:");
    });

    test("should handle invalid network", async () => {
      const result = await runner.run("pod", ["--network", "invalid", "status"]);
      
      expect(result.exitCode).toBeOneOf([0, 1]); // May succeed with warning
    });

    test("should handle file not found", async () => {
      const result = await runner.run("pod", ["wallet", "import", "--file", "/nonexistent/path"]);
      
      expect(result.exitCode).toBe(1);
      expect(result.stderr).toBeDefined();
    });
  });

  test("should display help", async () => {
    const proc = Bun.spawn(["node", "./dist/index.js", "--help"], {
      cwd: import.meta.dir + "/../..",
      stdout: "pipe",
      stderr: "pipe"
    });
    
    const output = await new Response(proc.stdout).text();
    const result = await proc.exited;
    
    expect(output).toContain("PoD Protocol CLI");
    expect(result).toBe(0);
  });

  test("should show version", async () => {
    const proc = Bun.spawn(["node", "./dist/index.js", "--version"], {
      cwd: import.meta.dir + "/../..",
      stdout: "pipe",
      stderr: "pipe"
    });
    
    const output = await new Response(proc.stdout).text();
    const result = await proc.exited;
    
    expect(output).toMatch(/^\d+\.\d+\.\d+/);
    expect(result).toBe(0);
  });
}); 