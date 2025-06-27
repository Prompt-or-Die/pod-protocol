import { describe, it, expect, beforeEach } from '@jest/globals';
import { MessageService } from '../src/services/message.js';
import { Connection, PublicKey, Keypair } from '@solana/web3.js';

describe('MessageService Tests', () => {
  let service;
  let senderKeypair;
  let recipientKeypair;

  beforeEach(() => {
    const connection = new Connection('http://localhost:8899');
    const programId = new PublicKey('11111111111111111111111111111111');
    service = new MessageService({
      connection,
      programId: programId.toBase58(),
      commitment: 'confirmed'
    });
    senderKeypair = Keypair.generate();
    recipientKeypair = Keypair.generate();
  });

  it('should initialize service correctly', () => {
    expect(service).toBeDefined();
    expect(service.connection).toBeDefined();
    expect(service.programId).toBeDefined();
  });

  it('should generate message PDA correctly', async () => {
    const content = 'Hello, world!';
    const messageType = { text: {} };
    
    const pda = await service.getMessagePDA(
      senderKeypair.publicKey,
      recipientKeypair.publicKey,
      content,
      messageType
    );
    
    expect(pda).toBeInstanceOf(PublicKey);
  });

  it('should hash message content correctly', () => {
    const content = 'Hello, world!';
    const hash = service.hashContent(content);
    
    expect(hash).toBeDefined();
    expect(hash.length).toBe(32);
    expect(hash).toBeInstanceOf(Uint8Array);
  });

  it('should validate message type', () => {
    const validTypes = [
      { text: {} },
      { image: {} },
      { code: {} },
      { data: {} }
    ];

    validTypes.forEach(type => {
      expect(() => service.validateMessageType(type)).not.toThrow();
    });

    const invalidTypes = [
      { invalid: {} },
      null,
      undefined,
      {}
    ];

    invalidTypes.forEach(type => {
      expect(() => service.validateMessageType(type)).toThrow();
    });
  });

  it('should create send message instruction', async () => {
    const content = 'Hello, world!';
    const messageType = { text: {} };
    
    const instruction = await service.createSendInstruction(
      senderKeypair.publicKey,
      recipientKeypair.publicKey,
      content,
      messageType
    );
    
    expect(instruction).toBeDefined();
    expect(instruction.programId.equals(service.programId)).toBe(true);
  });

  it('should create update message status instruction', async () => {
    const content = 'Hello, world!';
    const messageType = { text: {} };
    const status = { delivered: {} };
    
    const instruction = await service.createUpdateStatusInstruction(
      senderKeypair.publicKey,
      recipientKeypair.publicKey,
      content,
      messageType,
      status
    );
    
    expect(instruction).toBeDefined();
    expect(instruction.programId.equals(service.programId)).toBe(true);
  });

  it('should validate message content', () => {
    const validContent = 'Hello, world!';
    expect(() => service.validateContent(validContent)).not.toThrow();

    const invalidContent = [
      '',
      null,
      undefined,
      'a'.repeat(10001) // Too long
    ];

    invalidContent.forEach(content => {
      expect(() => service.validateContent(content)).toThrow();
    });
  });

  it('should calculate message expiry correctly', () => {
    const ttl = 3600; // 1 hour
    const expiry = service.calculateExpiry(ttl);
    const now = Date.now() / 1000;
    
    expect(expiry).toBeGreaterThan(now);
    expect(expiry).toBeLessThanOrEqual(now + ttl + 1); // Allow 1 second tolerance
  });

  it('should check if message is expired', () => {
    const pastTimestamp = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago
    const futureTimestamp = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
    
    expect(service.isExpired(pastTimestamp)).toBe(true);
    expect(service.isExpired(futureTimestamp)).toBe(false);
  });

  it('should format message for display', () => {
    const message = {
      sender: senderKeypair.publicKey,
      recipient: recipientKeypair.publicKey,
      content: 'Hello, world!',
      messageType: { text: {} },
      timestamp: Math.floor(Date.now() / 1000),
      status: { pending: {} }
    };

    const formatted = service.formatMessage(message);
    
    expect(formatted).toBeDefined();
    expect(formatted.sender).toBe(message.sender.toString());
    expect(formatted.recipient).toBe(message.recipient.toString());
    expect(formatted.content).toBe(message.content);
    expect(formatted.type).toBe('text');
    expect(formatted.status).toBe('pending');
    expect(formatted.timestamp).toBeDefined();
  });
});
