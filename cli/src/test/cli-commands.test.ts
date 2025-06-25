import { spawn } from "child_process";
import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(__filename);
const cliPath = join(__dirname, "..", "..", "dist", "index.js");
const cwd = join(__dirname, "..", "..");

async function runCli(args: string[], timeoutMs = 15000): Promise<{
  stdout: string;
  stderr: string;
  exitCode: number;
}> {
  const cliPath = join(__dirname, "../../dist/index.js");
  console.log(`Running CLI command: node ${cliPath} ${args.join(' ')}`);
  const proc = spawn("node", [cliPath, "--no-banner", ...args], {
    stdio: ["pipe", "pipe", "pipe"],
  });

  let stdout = "";
  let stderr = "";

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
      proc.kill();
      throw new Error(`CLI command timed out after ${timeoutMs}ms`);
    }, timeoutMs);

    proc.stdout?.on("data", (data) => {
      stdout += data.toString();
    });

    proc.stderr?.on("data", (data) => {
      stderr += data.toString();
    });

    const exitCode = await new Promise<number>((resolve, reject) => {
      proc.on("close", (code) => {
        clearTimeout(timeoutId);
        resolve(code || 0);
      });
      proc.on("error", (error) => {
        clearTimeout(timeoutId);
        reject(error);
      });
      controller.signal.addEventListener("abort", () => {
        proc.kill();
        reject(new Error("Aborted"));
      });
    });

    return { stdout, stderr, exitCode };
  } catch (error) {
    proc.kill();
    if (error instanceof Error && error.message === "Aborted") {
      return { stdout, stderr, exitCode: 1 };
    }
    throw new Error(`CLI process error: ${error}`);
  }
}

describe("CLI Command Tests", () => {
  // Set up test environment variables
  beforeAll(() => {
    process.env.SOLANA_NETWORK = "devnet";
    process.env.SOLANA_KEYPAIR_PATH = "/tmp/test-solana/id.json";
  });

  afterAll(() => {
    delete process.env.SOLANA_NETWORK;
    delete process.env.SOLANA_KEYPAIR_PATH;
  });

  it("agent register dry run", async () => {
    const res = await runCli([
      "--no-banner",
      "--dry-run",
      "agent",
      "register",
      "--capabilities",
      "1",
      "--metadata",
      "test",
    ]);
    expect(res.exitCode).toBe(0);
     // Check for the actual output that's produced in dry-run mode
     expect(res.stdout).toContain("Capabilities: TRADING");
     expect(res.stdout).toContain("Metadata URI: test");
  });

  it("message send dry run", async () => {
    const res = await runCli([
      "--no-banner",
      "--dry-run",
      "message",
      "send",
      "--recipient",
      "11111111111111111111111111111111111111111111",
      "--payload",
      "hello",
    ]);
    expect(res.exitCode).toBe(1);
     expect(res.stderr).toContain("Invalid recipient");
  });

  it("channel create dry run", async () => {
    const res = await runCli([
      "--no-banner",
      "--dry-run",
      "channel",
      "create",
      "--name",
      "test",
      "--description",
      "test channel",
      "--visibility",
      "public",
    ]);
    expect(res.exitCode).toBe(0);
     expect(res.stdout).toContain("Name: test");
     expect(res.stdout).toContain("Description: test channel");
  });

  it("escrow deposit dry run", async () => {
    const res = await runCli([
      "--no-banner",
      "--dry-run",
      "escrow",
      "deposit",
      "--channel",
      "11111111111111111111111111111111111111111111",
      "--lamports",
      "1000",
    ]);
    expect(res.exitCode).toBe(1);
    expect(res.stderr).toContain("Invalid channel ID");
  });

  it("config show", async () => {
    const res = await runCli(["--no-banner", "config", "show"]);
    expect(res.exitCode).toBe(0);
    expect(res.stdout).toContain("Configuration");
  });

  it("status command", async () => {
    const res = await runCli(["--no-banner", "status"]);
    expect(res.exitCode).toBe(0);
    expect(res.stdout).toContain("Status");
  });

  it("participant join invalid custom key", async () => {
    const res = await runCli([
      "zk",
      "participant",
      "join",
      "11111111111111111111111111111111111111111111",
      "--participant",
      "badkey",
    ]);
    expect(res.exitCode).toBe(1);
    expect(res.stderr).toContain("Invalid address");
  });
});
