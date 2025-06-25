import { describe, it, expect, beforeEach } from '@jest/globals';
import { PodComClient } from '../src/index.js';
import { Connection, PublicKey } from '@solana/web3.js';

describe('SDK Basic Tests', () => {
  let client;

  beforeEach(() => {
    client = new PodComClient({
      endpoint: 'http://localhost:8899',
      programId: new PublicKey('11111111111111111111111111111111')
    });
  });

  it('should initialize client correctly', () => {
    expect(client).toBeDefined();
    expect(client.agents).toBeDefined();
    expect(client.messages).toBeDefined();
    expect(client.channels).toBeDefined();
    expect(client.escrow).toBeDefined();
    expect(client.analytics).toBeDefined();
    expect(client.discovery).toBeDefined();
    expect(client.ipfs).toBeDefined();
    expect(client.zkCompression).toBeDefined();
    expect(client.sessionKeys).toBeDefined();
    expect(client.jitoBundles).toBeDefined();
  });

  it('should have all services initialized', () => {
    expect(client.agents.constructor.name).toBe('AgentService');
    expect(client.messages.constructor.name).toBe('MessageService');
    expect(client.channels.constructor.name).toBe('ChannelService');
    expect(client.escrow.constructor.name).toBe('EscrowService');
    expect(client.analytics.constructor.name).toBe('AnalyticsService');
    expect(client.discovery.constructor.name).toBe('DiscoveryService');
    expect(client.ipfs.constructor.name).toBe('IPFSService');
    expect(client.zkCompression.constructor.name).toBe('ZKCompressionService');
    expect(client.sessionKeys.constructor.name).toBe('SessionKeysService');
    expect(client.jitoBundles.constructor.name).toBe('JitoBundlesService');
  });

  it('should pass basic test', () => {
    expect(true).toBe(true);
  });
});
