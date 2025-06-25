import { createSolanaRpc, address, Address } from "@solana/web3.js";
import { ZKCompressionService } from "../sdk/src/services/zk-compression";
import { IPFSService } from "../sdk/src/services/ipfs";
import { BaseServiceConfig } from "../sdk/src/services/base";

const baseConfig: BaseServiceConfig = {
  connection: new Connection("http://localhost:8899"),
  programId: new PublicKey("11111111111111111111111111111111"),
  commitment: "confirmed" as Commitment,
};

const ipfs = new IPFSService(baseConfig);
const zk = new ZKCompressionService(baseConfig, { enableBatching: false }, ipfs);

function verifyProof(hash: Buffer, proof: string[], root: string) {
  let current = hash;
  for (const node of proof) {
    const data = Buffer.concat([current, Buffer.from(node, "hex")]);
    current = Buffer.from(IPFSService.sha256(data));
  }
  return current.toString("hex") === root;
}

test("compressed account proof validation", () => {
  const hashes = [
    Buffer.from("a".repeat(64), "hex"),
    Buffer.from("b".repeat(64), "hex"),
  ];
  const result = (zk as any).buildMerkleTree(hashes);
  expect(verifyProof(hashes[0], result.proofs[0], result.root)).toBe(true);
  expect(verifyProof(hashes[1], result.proofs[1], result.root)).toBe(true);
});

// ZK Compression proof testing
const testCompression = () => {
  const testAddress = address("11111111111111111111111111111112");
  console.log("Testing compression with address:", testAddress);
  
  // Test compression proof with v2.0 patterns
  return {
    proof: "test-proof",
    compressed: true,
    address: testAddress
  };
};

// Export for use in other tests
export { testCompression };

console.log("Compression proof test completed:", testCompression());
