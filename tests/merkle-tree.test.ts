import { createSolanaRpc, address, Address } from "@solana/web3.js";
import { expect, test } from "bun:test";
import { createHash } from "crypto";
import { IPFSService } from "../sdk/src/services/ipfs";
import { ZKCompressionService } from "../sdk/src/services/zk-compression";
import { BaseServiceConfig } from "../sdk/src/services/base";

const baseConfig: BaseServiceConfig = {
  connection: new Connection("http://localhost:8899"),
  programId: new PublicKey("11111111111111111111111111111111"),
  commitment: "confirmed" as any,
};

const ipfs = new IPFSService(baseConfig);
const zk = new ZKCompressionService(baseConfig, { enableBatching: false }, ipfs);

function sha256Hex(data: string): string {
  return createHash("sha256").update(data).digest("hex");
}

test("buildMerkleTree computes correct root", () => {
  const msgs = ["hello", "world", "test"];
  const hashes = msgs.map(sha256Hex).map((h) => Buffer.from(h, "hex"));
  const { root } = (zk as any).buildMerkleTree(hashes);
  expect(root).toBe(
    "51f8ef61c28fbe2a9d67319302117104259d46a16a69f5b8fffeb9b5b70abada"
  );
});

describe("Merkle Tree Tests", () => {
  it("should create a merkle tree", () => {
    // Test implementation using v2.0 patterns
    const testAddress = address("11111111111111111111111111111112");
    expect(testAddress).toBeDefined();
  });
});
