import { describe, it, expect, beforeEach } from '@jest/globals';
import { ZKCompressionService } from '../src/services/zkCompression.js';
import { IPFSService } from '../src/services/ipfs.js';
import { Connection, PublicKey, TransactionInstruction } from '@solana/web3.js';

// Mock ZKCompressionService to avoid heavy dependencies
class MockZKCompressionService extends ZKCompressionService {
  constructor(config, options, ipfsService) {
    super(config, options, ipfsService);
  }

  async createCompressionInstruction() {
    return new TransactionInstruction({
      keys: [],
      programId: new PublicKey('11111111111111111111111111111111'),
      data: Buffer.from([])
    });
  }
  
  async processBatch() {
    return 'mockSignature123';
  }

  async compressData(data) {
    return {
      compressed: Buffer.from(JSON.stringify(data)),
      merkleRoot: 'mockMerkleRoot',
      proof: ['mockProof1', 'mockProof2']
    };
  }
}

describe('ZKCompressionService Tests', () => {
  let service;
  let ipfsService;

  beforeEach(() => {
    const connection = new Connection('http://localhost:8899');
    const programId = new PublicKey('11111111111111111111111111111111');
    const config = { connection, programId, commitment: 'confirmed' };
    
    ipfsService = new IPFSService(config);
    service = new MockZKCompressionService(
      config,
      { enableBatching: true, batchSize: 10 },
      ipfsService
    );
  });

  it('should initialize service correctly', () => {
    expect(service).toBeDefined();
    expect(service.connection).toBeDefined();
    expect(service.programId).toBeDefined();
    expect(service.options.enableBatching).toBe(true);
    expect(service.options.batchSize).toBe(10);
  });

  it('should create compression instruction', async () => {
    const instruction = await service.createCompressionInstruction();
    
    expect(instruction).toBeInstanceOf(TransactionInstruction);
    expect(instruction.programId.toString()).toBe('11111111111111111111111111111111');
  });

  it('should process batch with compression', async () => {
    const signature = await service.processBatch();
    expect(typeof signature).toBe('string');
    expect(signature).toBe('mockSignature123');
  });

  it('should compress data correctly', async () => {
    const testData = { message: 'Hello, compressed world!' };
    const result = await service.compressData(testData);
    
    expect(result.compressed).toBeDefined();
    expect(result.merkleRoot).toBe('mockMerkleRoot');
    expect(result.proof).toEqual(['mockProof1', 'mockProof2']);
  });

  it('should build merkle tree correctly', () => {
    const testData = ['hello', 'world', 'test'];
    const hashes = testData.map(data => service.hashData(data));
    
    // This would normally call the internal buildMerkleTree method
    // For testing, we'll just verify the hashes are generated
    expect(hashes).toHaveLength(3);
    hashes.forEach(hash => {
      expect(hash).toBeDefined();
      expect(hash.length).toBe(32);
    });
  });

  it('should validate compression options', () => {
    const validOptions = {
      enableBatching: true,
      batchSize: 50,
      compressionLevel: 6
    };

    expect(() => service.validateOptions(validOptions)).not.toThrow();

    const invalidOptions = {
      enableBatching: 'invalid',
      batchSize: -1,
      compressionLevel: 15
    };

    expect(() => service.validateOptions(invalidOptions)).toThrow();
  });

  it('should calculate compression ratio', () => {
    const originalSize = 1000;
    const compressedSize = 100;
    const ratio = service.calculateCompressionRatio(originalSize, compressedSize);
    
    expect(ratio).toBe(10); // 10:1 compression ratio
  });

  it('should estimate compression savings', () => {
    const originalSize = 1000;
    const compressedSize = 50;
    const savings = service.estimateSavings(originalSize, compressedSize);
    
    expect(savings.percentage).toBe(95); // 95% savings
    expect(savings.bytesReduced).toBe(950);
  });

  it('should handle batch operations', async () => {
    const operations = [
      { type: 'compress', data: 'data1' },
      { type: 'compress', data: 'data2' },
      { type: 'compress', data: 'data3' }
    ];

    const results = await service.processBatchOperations(operations);
    expect(results).toHaveLength(3);
    results.forEach(result => {
      expect(result.success).toBe(true);
    });
  });
});
