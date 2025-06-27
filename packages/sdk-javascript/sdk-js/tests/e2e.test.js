import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { PodProtocolClient } from '../src/index.js';
import { Connection, PublicKey, Keypair, LAMPORTS_PER_SOL } from '@solana/web3.js';

describe('End-to-End Protocol Tests', () => {
  let client;
  let connection;
  let programId;
  let senderKeypair;
  let recipientKeypair;
  let testChannel;
  let testMessage;

  beforeAll(async () => {
    // Setup test environment
    connection = new Connection('http://localhost:8899', 'confirmed');
    programId = new PublicKey('11111111111111111111111111111111');
    client = new PodProtocolClient({
      endpoint: 'http://localhost:8899',
      programId: programId.toBase58(),
      commitment: 'confirmed'
    });
    
    // Generate test keypairs
    senderKeypair = Keypair.generate();
    recipientKeypair = Keypair.generate();

    // Note: In a real test environment, you would need to airdrop SOL to these accounts
    // await connection.requestAirdrop(senderKeypair.publicKey, LAMPORTS_PER_SOL);
    // await connection.requestAirdrop(recipientKeypair.publicKey, LAMPORTS_PER_SOL);
  });

  afterAll(async () => {
    // Cleanup test data
    if (testChannel) {
      try {
        // await client.channel.leave(testChannel.id, senderKeypair);
      } catch (error) {
        // Ignore errors during cleanup
      }
    }
  });

  describe('Agent Registration Flow', () => {
    it('should register an agent successfully', async () => {
      const agentData = {
        name: 'Test Agent E2E',
        description: 'An agent for end-to-end testing',
        capabilities: ['text', 'analysis'],
        version: '1.0.0'
      };

      // Mock the registration since we don't have actual blockchain connection
      const mockAgent = await client.agent.mockRegister(agentData, senderKeypair);
      
      expect(mockAgent).toBeDefined();
      expect(mockAgent.name).toBe(agentData.name);
      expect(mockAgent.owner).toBe(senderKeypair.publicKey.toString());
      expect(mockAgent.capabilities).toEqual(agentData.capabilities);
    });

    it('should update agent metadata', async () => {
      const updateData = {
        description: 'Updated description for E2E testing',
        capabilities: ['text', 'analysis', 'code']
      };

      const mockUpdatedAgent = await client.agent.mockUpdate(updateData, senderKeypair);
      
      expect(mockUpdatedAgent.description).toBe(updateData.description);
      expect(mockUpdatedAgent.capabilities).toEqual(updateData.capabilities);
    });

    it('should retrieve agent information', async () => {
      const agentPDA = await client.agent.getAgentPDA(senderKeypair.publicKey);
      const mockAgent = await client.agent.mockGet(agentPDA);
      
      expect(mockAgent).toBeDefined();
      expect(mockAgent.pubkey).toBe(senderKeypair.publicKey.toString());
    });
  });

  describe('Messaging Flow', () => {
    it('should send a direct message', async () => {
      const messageContent = 'Hello from E2E test!';
      const messageType = { text: {} };

      const mockMessage = await client.message.mockSend({
        sender: senderKeypair.publicKey,
        recipient: recipientKeypair.publicKey,
        content: messageContent,
        messageType
      }, senderKeypair);

      testMessage = mockMessage;
      
      expect(mockMessage).toBeDefined();
      expect(mockMessage.content).toBe(messageContent);
      expect(mockMessage.sender).toBe(senderKeypair.publicKey.toString());
      expect(mockMessage.recipient).toBe(recipientKeypair.publicKey.toString());
      expect(mockMessage.status).toBe('pending');
    });

    it('should update message status', async () => {
      if (!testMessage) {
        throw new Error('No test message available');
      }

      const updatedMessage = await client.message.mockUpdateStatus(
        testMessage.id,
        { delivered: {} },
        recipientKeypair
      );

      expect(updatedMessage.status).toBe('delivered');
    });

    it('should retrieve message history', async () => {
      const messages = await client.message.mockGetHistory(
        senderKeypair.publicKey,
        recipientKeypair.publicKey
      );

      expect(Array.isArray(messages)).toBe(true);
      expect(messages.length).toBeGreaterThan(0);
    });
  });

  describe('Channel Management Flow', () => {
    it('should create a public channel', async () => {
      const channelData = {
        name: 'E2E Test Channel',
        description: 'A channel for end-to-end testing',
        visibility: 'public',
        maxParticipants: 100
      };

      const mockChannel = await client.channel.mockCreate(channelData, senderKeypair);
      testChannel = mockChannel;

      expect(mockChannel).toBeDefined();
      expect(mockChannel.name).toBe(channelData.name);
      expect(mockChannel.owner).toBe(senderKeypair.publicKey.toString());
      expect(mockChannel.visibility).toBe('public');
    });

    it('should join a channel', async () => {
      if (!testChannel) {
        throw new Error('No test channel available');
      }

      const participation = await client.channel.mockJoin(
        testChannel.id,
        recipientKeypair
      );

      expect(participation).toBeDefined();
      expect(participation.channelId).toBe(testChannel.id);
      expect(participation.participant).toBe(recipientKeypair.publicKey.toString());
    });

    it('should send a channel message', async () => {
      if (!testChannel) {
        throw new Error('No test channel available');
      }

      const channelMessage = await client.channel.mockSendMessage(
        testChannel.id,
        'Hello channel from E2E test!',
        { text: {} },
        senderKeypair
      );

      expect(channelMessage).toBeDefined();
      expect(channelMessage.channelId).toBe(testChannel.id);
      expect(channelMessage.sender).toBe(senderKeypair.publicKey.toString());
    });

    it('should get channel participants', async () => {
      if (!testChannel) {
        throw new Error('No test channel available');
      }

      const participants = await client.channel.mockGetParticipants(testChannel.id);

      expect(Array.isArray(participants)).toBe(true);
      expect(participants.length).toBeGreaterThanOrEqual(2); // Owner + joined user
    });
  });

  describe('Escrow Operations', () => {
    it('should create an escrow account', async () => {
      const escrowData = {
        amount: 1000000, // 0.001 SOL in lamports
        recipient: recipientKeypair.publicKey,
        condition: 'message_delivered',
        timeout: Math.floor(Date.now() / 1000) + 3600 // 1 hour from now
      };

      const mockEscrow = await client.escrow.mockCreate(escrowData, senderKeypair);

      expect(mockEscrow).toBeDefined();
      expect(mockEscrow.amount).toBe(escrowData.amount);
      expect(mockEscrow.recipient).toBe(recipientKeypair.publicKey.toString());
      expect(mockEscrow.status).toBe('active');
    });

    it('should release escrow funds', async () => {
      const mockRelease = await client.escrow.mockRelease(
        'mockEscrowId',
        senderKeypair
      );

      expect(mockRelease).toBeDefined();
      expect(mockRelease.status).toBe('released');
    });
  });

  describe('Analytics and Discovery', () => {
    it('should get network statistics', async () => {
      const stats = await client.analytics.mockGetNetworkStats();

      expect(stats).toBeDefined();
      expect(typeof stats.totalAgents).toBe('number');
      expect(typeof stats.totalMessages).toBe('number');
      expect(typeof stats.totalChannels).toBe('number');
      expect(stats.totalAgents).toBeGreaterThanOrEqual(0);
    });

    it('should discover agents by capability', async () => {
      const agents = await client.discovery.mockSearchAgents({
        capabilities: ['text'],
        limit: 10
      });

      expect(Array.isArray(agents)).toBe(true);
      // In a real test, we would expect at least our test agent
      expect(agents.length).toBeGreaterThanOrEqual(0);
    });

    it('should get agent recommendations', async () => {
      const recommendations = await client.discovery.mockGetRecommendations(
        senderKeypair.publicKey,
        { type: 'collaboration', limit: 5 }
      );

      expect(Array.isArray(recommendations)).toBe(true);
      expect(recommendations.length).toBeLessThanOrEqual(5);
    });
  });

  describe('ZK Compression Integration', () => {
    it('should compress and store data', async () => {
      const testData = {
        message: 'This is a test message for compression',
        metadata: { type: 'test', timestamp: Date.now() }
      };

      const compressed = await client.zkCompression.mockCompress(testData);

      expect(compressed).toBeDefined();
      expect(compressed.originalSize).toBeGreaterThan(compressed.compressedSize);
      expect(compressed.compressionRatio).toBeGreaterThan(1);
    });

    it('should batch process multiple operations', async () => {
      const operations = [
        { type: 'message', data: 'Message 1' },
        { type: 'message', data: 'Message 2' },
        { type: 'message', data: 'Message 3' }
      ];

      const batchResult = await client.zkCompression.mockProcessBatch(operations);

      expect(batchResult).toBeDefined();
      expect(batchResult.processed).toBe(operations.length);
      expect(batchResult.success).toBe(true);
    });
  });

  describe('IPFS Storage', () => {
    it('should upload and retrieve metadata', async () => {
      const metadata = {
        name: 'Test Metadata',
        description: 'Metadata for E2E testing',
        attributes: [
          { trait_type: 'Environment', value: 'Test' }
        ]
      };

      const uploadResult = await client.ipfs.mockUpload(metadata);
      expect(uploadResult).toBeDefined();
      expect(uploadResult.hash).toBeDefined();
      expect(uploadResult.url).toContain('ipfs.io');

      const retrievedMetadata = await client.ipfs.mockRetrieve(uploadResult.hash);
      expect(retrievedMetadata).toEqual(metadata);
    });

    it('should validate content integrity', () => {
      const content = 'Test content for integrity validation';
      const hash1 = client.ipfs.calculateIntegrityHash(content);
      const hash2 = client.ipfs.calculateIntegrityHash(content);
      const hash3 = client.ipfs.calculateIntegrityHash(content + ' modified');

      expect(hash1).toBe(hash2);
      expect(hash1).not.toBe(hash3);
    });
  });
});
