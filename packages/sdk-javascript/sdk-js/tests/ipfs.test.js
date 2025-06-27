import { describe, it, expect, beforeEach } from '@jest/globals';
import { IPFSService } from '../src/services/ipfs.js';
import { Connection, PublicKey } from '@solana/web3.js';
import { createHash } from 'crypto';

describe('IPFSService Tests', () => {
  let service;

  beforeEach(() => {
    const connection = new Connection('http://localhost:8899');
    const programId = new PublicKey('11111111111111111111111111111111');
    service = new IPFSService({
      connection,
      programId,
      commitment: 'confirmed'
    });
  });

  it('should initialize service correctly', () => {
    expect(service).toBeDefined();
    expect(service.connection).toBeDefined();
    expect(service.programId).toBeDefined();
  });

  it('should create content hash correctly', () => {
    const testCases = {
      'hello world': '001e332a8d817b5fb3b49af17074488b700c13e2d2611e4aaec24704bcc6c60c',
      'OpenAI': '002f5def325e554d0601b6a3fcb788ae8f071f39ef85baae22c27e11046a4202',
      '': '001a944cf13a9a1c08facb2c9e98623ef3254d2ddb48113885c3e8e97fec8db9'
    };

    for (const [input, expected] of Object.entries(testCases)) {
      const result = IPFSService.calculateIntegrityHash(input);
      expect(result).toBe(expected);
    }
  });

  it('should validate IPFS hash format', () => {
    const validHashes = [
      'QmYjtig7VJQ6XsnUjqqJvj7QaMcCAwtrgNdahSiFofrE7o',
      'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi'
    ];

    const invalidHashes = [
      'invalidhash',
      '',
      null,
      undefined,
      '12345'
    ];

    validHashes.forEach(hash => {
      expect(service.isValidIPFSHash(hash)).toBe(true);
    });

    invalidHashes.forEach(hash => {
      expect(service.isValidIPFSHash(hash)).toBe(false);
    });
  });

  it('should generate IPFS URL correctly', () => {
    const hash = 'QmYjtig7VJQ6XsnUjqqJvj7QaMcCAwtrgNdahSiFofrE7o';
    const url = service.generateIPFSUrl(hash);
    
    expect(url).toBe(`https://ipfs.io/ipfs/${hash}`);
  });

  it('should generate IPFS URL with custom gateway', () => {
    const hash = 'QmYjtig7VJQ6XsnUjqqJvj7QaMcCAwtrgNdahSiFofrE7o';
    const gateway = 'https://gateway.pinata.cloud/ipfs/';
    const url = service.generateIPFSUrl(hash, gateway);
    
    expect(url).toBe(`${gateway}${hash}`);
  });

  it('should prepare metadata for upload', () => {
    const metadata = {
      name: 'Test Agent',
      description: 'A test agent for the protocol',
      image: 'QmImageHash',
      attributes: [
        { trait_type: 'Capability', value: 'Text Processing' }
      ]
    };

    const prepared = service.prepareMetadata(metadata);
    
    expect(prepared).toBeDefined();
    expect(prepared.name).toBe(metadata.name);
    expect(prepared.description).toBe(metadata.description);
    expect(prepared.image).toBe(`https://ipfs.io/ipfs/${metadata.image}`);
    expect(prepared.attributes).toEqual(metadata.attributes);
    expect(prepared.version).toBe('1.0.0');
  });

  it('should validate metadata structure', () => {
    const validMetadata = {
      name: 'Test Agent',
      description: 'A test agent',
      version: '1.0.0'
    };

    expect(() => service.validateMetadata(validMetadata)).not.toThrow();

    const invalidMetadata = [
      { name: '' }, // Missing description
      { description: 'test' }, // Missing name
      { name: 'test', description: null }, // Invalid description
      null,
      undefined
    ];

    invalidMetadata.forEach(metadata => {
      expect(() => service.validateMetadata(metadata)).toThrow();
    });
  });

  it('should estimate storage costs', () => {
    const dataSize = 1024; // 1KB
    const cost = service.estimateStorageCost(dataSize);
    
    expect(cost).toBeDefined();
    expect(cost.size).toBe(dataSize);
    expect(cost.estimatedCost).toBeGreaterThanOrEqual(0);
    expect(typeof cost.currency).toBe('string');
  });

  it('should handle pin management', async () => {
    const hash = 'QmYjtig7VJQ6XsnUjqqJvj7QaMcCAwtrgNdahSiFofrE7o';
    
    // Mock the pin operations since we don't have actual IPFS connection
    const pinResult = await service.mockPin(hash);
    expect(pinResult.success).toBe(true);
    expect(pinResult.hash).toBe(hash);

    const unpinResult = await service.mockUnpin(hash);
    expect(unpinResult.success).toBe(true);
    expect(unpinResult.hash).toBe(hash);
  });

  it('should compress and decompress data', () => {
    const originalData = 'This is test data that should be compressed and decompressed correctly.';
    
    const compressed = service.compressData(originalData);
    expect(compressed.length).toBeLessThan(originalData.length);
    
    const decompressed = service.decompressData(compressed);
    expect(decompressed).toBe(originalData);
  });

  it('should calculate data integrity hash', () => {
    const data = 'test data for integrity checking';
    const hash1 = service.calculateIntegrityHash(data);
    const hash2 = service.calculateIntegrityHash(data);
    const hash3 = service.calculateIntegrityHash(data + ' modified');
    
    expect(hash1).toBe(hash2); // Same data should produce same hash
    expect(hash1).not.toBe(hash3); // Different data should produce different hash
    expect(hash1.length).toBe(64); // SHA-256 produces 64 character hex string
  });
});
