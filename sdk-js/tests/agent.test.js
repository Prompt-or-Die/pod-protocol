import { describe, it, expect, beforeEach } from '@jest/globals';
import { AgentService } from '../src/services/agent.js';
import { Connection, PublicKey, Keypair } from '@solana/web3.js';

describe('AgentService Tests', () => {
  let service;
  let keypair;

  beforeEach(() => {
    const connection = new Connection('http://localhost:8899');
    const programId = '11111111111111111111111111111111';
    service = new AgentService({
      connection,
      programId,
      commitment: 'confirmed'
    });
    keypair = Keypair.generate();
  });

  it('should initialize service correctly', () => {
    expect(service).toBeDefined();
    expect(service.connection).toBeDefined();
    expect(service.programId).toBeDefined();
  });

  it('should generate agent PDA correctly', async () => {
    const pda = await service.getAgentPDA(keypair.publicKey.toBase58());
    expect(typeof pda).toBe('string');
  });

  it('should generate metadata URI correctly', () => {
    const metadata = {
      name: 'Test Agent',
      description: 'A test agent',
      capabilities: 'text,image'
    };
    const uri = service.generateMetadataURI(metadata);
    expect(uri).toContain('data:application/json;base64,');
  });

  it('should create register agent instruction', async () => {
    const capabilities = 1;
    const metadataUri = 'https://example.com/metadata';
    
    const instruction = await service.createRegisterInstruction(
      keypair.publicKey.toBase58(),
      capabilities,
      metadataUri
    );
    
    expect(instruction).toBeDefined();
    expect(instruction).toHaveProperty('keys');
  });

  it('should create update agent instruction', async () => {
    const capabilities = 2;
    const metadataUri = 'https://example.com/metadata/updated';
    
    const instruction = await service.createUpdateInstruction(
      keypair.publicKey.toBase58(),
      capabilities,
      metadataUri
    );
    
    expect(instruction).toBeDefined();
    expect(instruction).toHaveProperty('keys');
  });

  it('should validate agent data correctly', () => {
    const validData = {
      pubkey: keypair.publicKey,
      capabilities: 1,
      metadataUri: 'https://example.com/metadata',
      messageCount: 0,
      reputation: 100,
      isActive: true
    };

    expect(() => service.validateAgentData(validData)).not.toThrow();

    const invalidData = {
      pubkey: null,
      capabilities: -1,
      metadataUri: '',
      messageCount: -1
    };

    expect(() => service.validateAgentData(invalidData)).toThrow();
  });

  it('should calculate reputation correctly', () => {
    const metrics = {
      successfulMessages: 10,
      failedMessages: 2,
      averageResponseTime: 1000,
      totalMessages: 12
    };

    const reputation = service.calculateReputation(metrics);
    expect(reputation).toBeGreaterThan(0);
    expect(reputation).toBeLessThanOrEqual(1000);
    expect(typeof reputation).toBe('number');
  });

  it('should get agent capabilities as array', () => {
    const capabilities = 7; // Binary: 111 (text, image, code)
    const capabilitiesArray = service.getCapabilitiesArray(capabilities);
    
    expect(capabilitiesArray).toContain('text');
    expect(capabilitiesArray).toContain('image');
    expect(capabilitiesArray).toContain('code');
    expect(capabilitiesArray.length).toBe(3);
  });

  it('should convert capabilities from array to number', () => {
    const capabilitiesArray = ['text', 'image'];
    const capabilities = service.capabilitiesFromArray(capabilitiesArray);
    
    expect(capabilities).toBe(3); // Binary: 11
  });
});
