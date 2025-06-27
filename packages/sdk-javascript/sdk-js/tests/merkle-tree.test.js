import { describe, it, expect, beforeEach } from '@jest/globals';
import { createHash } from 'crypto';
import { Connection, PublicKey } from '@solana/web3.js';
import { ZKCompressionService } from '../src/services/zkCompression.js';
import { IPFSService } from '../src/services/ipfs.js';

describe('Merkle Tree Tests', () => {
  let zkService;
  let ipfsService;

  beforeEach(() => {
    const connection = new Connection('http://localhost:8899');
    const programId = new PublicKey('11111111111111111111111111111111');
    const config = { connection, programId, commitment: 'confirmed' };
    
    ipfsService = new IPFSService(config);
    zkService = new ZKCompressionService(
      config,
      { enableBatching: false },
      ipfsService
    );
  });

  function sha256Hex(data) {
    return createHash('sha256').update(data).digest('hex');
  }

  it('should build merkle tree and compute correct root', () => {
    // Test case from the TypeScript SDK
    const msgs = ['hello', 'world', 'test'];
    const hashes = msgs.map(sha256Hex).map(h => Buffer.from(h, 'hex'));
    
    // Mock the buildMerkleTree method since it's internal
    const mockRoot = zkService.mockBuildMerkleTree(hashes);
    
    expect(mockRoot).toBe('51f8ef61c28fbe2a9d67319302117104259d46a16a69f5b8fffeb9b5b70abada');
  });

  it('should handle single leaf merkle tree', () => {
    const singleMsg = ['hello'];
    const hashes = singleMsg.map(sha256Hex).map(h => Buffer.from(h, 'hex'));
    
    const mockRoot = zkService.mockBuildMerkleTree(hashes);
    
    // Single leaf should return the hash itself
    expect(mockRoot).toBe(sha256Hex('hello'));
  });

  it('should handle empty merkle tree', () => {
    const emptyHashes = [];
    
    expect(() => zkService.mockBuildMerkleTree(emptyHashes)).toThrow();
  });

  it('should generate consistent merkle proofs', () => {
    const msgs = ['hello', 'world', 'test', 'merkle'];
    const hashes = msgs.map(sha256Hex).map(h => Buffer.from(h, 'hex'));
    
    const tree = zkService.mockBuildMerkleTreeWithProofs(hashes);
    
    // Verify each leaf has a valid proof
    msgs.forEach((msg, index) => {
      const proof = tree.getProof(index);
      const isValid = zkService.verifyMerkleProof(
        Buffer.from(sha256Hex(msg), 'hex'),
        proof,
        tree.root
      );
      expect(isValid).toBe(true);
    });
  });

  it('should detect invalid merkle proofs', () => {
    const msgs = ['hello', 'world', 'test'];
    const hashes = msgs.map(sha256Hex).map(h => Buffer.from(h, 'hex'));
    
    const tree = zkService.mockBuildMerkleTreeWithProofs(hashes);
    const validProof = tree.getProof(0);
    
    // Test with wrong leaf
    const wrongLeaf = Buffer.from(sha256Hex('wrong'), 'hex');
    const isInvalid = zkService.verifyMerkleProof(wrongLeaf, validProof, tree.root);
    expect(isInvalid).toBe(false);
    
    // Test with corrupted proof
    const corruptedProof = [...validProof];
    if (corruptedProof.length > 0) {
      corruptedProof[0] = Buffer.from('corrupted'.padEnd(64, '0'), 'hex');
      const isCorrupted = zkService.verifyMerkleProof(
        Buffer.from(sha256Hex('hello'), 'hex'),
        corruptedProof,
        tree.root
      );
      expect(isCorrupted).toBe(false);
    }
  });

  it('should handle power of 2 and non-power of 2 leaf counts', () => {
    // Power of 2 (4 leaves)
    const powerOf2Msgs = ['a', 'b', 'c', 'd'];
    const powerOf2Hashes = powerOf2Msgs.map(sha256Hex).map(h => Buffer.from(h, 'hex'));
    const powerOf2Root = zkService.mockBuildMerkleTree(powerOf2Hashes);
    expect(powerOf2Root).toBeDefined();
    expect(powerOf2Root.length).toBe(64); // 32 bytes = 64 hex chars
    
    // Non-power of 2 (5 leaves)
    const nonPowerOf2Msgs = ['a', 'b', 'c', 'd', 'e'];
    const nonPowerOf2Hashes = nonPowerOf2Msgs.map(sha256Hex).map(h => Buffer.from(h, 'hex'));
    const nonPowerOf2Root = zkService.mockBuildMerkleTree(nonPowerOf2Hashes);
    expect(nonPowerOf2Root).toBeDefined();
    expect(nonPowerOf2Root.length).toBe(64); // 32 bytes = 64 hex chars
  });

  it('should maintain consistency across multiple builds', () => {
    const msgs = ['consistent', 'merkle', 'tree'];
    const hashes = msgs.map(sha256Hex).map(h => Buffer.from(h, 'hex'));
    
    const root1 = zkService.mockBuildMerkleTree(hashes);
    const root2 = zkService.mockBuildMerkleTree(hashes);
    const root3 = zkService.mockBuildMerkleTree(hashes);
    
    expect(root1).toBe(root2);
    expect(root2).toBe(root3);
  });

  it('should produce different roots for different inputs', () => {
    const msgs1 = ['hello', 'world'];
    const msgs2 = ['world', 'hello']; // Same elements, different order
    const msgs3 = ['hello', 'universe']; // Different elements
    
    const hashes1 = msgs1.map(sha256Hex).map(h => Buffer.from(h, 'hex'));
    const hashes2 = msgs2.map(sha256Hex).map(h => Buffer.from(h, 'hex'));
    const hashes3 = msgs3.map(sha256Hex).map(h => Buffer.from(h, 'hex'));
    
    const root1 = zkService.mockBuildMerkleTree(hashes1);
    const root2 = zkService.mockBuildMerkleTree(hashes2);
    const root3 = zkService.mockBuildMerkleTree(hashes3);
    
    expect(root1).not.toBe(root2); // Order matters
    expect(root1).not.toBe(root3); // Content matters
    expect(root2).not.toBe(root3); // Both order and content matter
  });
});
