/**
 * Feature Parity Test for PoD Protocol JavaScript SDK
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { 
  PodComClient, 
  AgentService, 
  MessageService, 
  ChannelService, 
  EscrowService,
  AnalyticsService,
  DiscoveryService,
  IPFSService,
  ZKCompressionService,
  SessionKeysService,
  JitoBundlesService,
  PROGRAM_ID,
  MessageType,
  MessageStatus,
  ChannelVisibility,
  AGENT_CAPABILITIES
} from '../src/index.js';
import { Connection, PublicKey } from '@solana/web3.js';

describe('PoD Protocol JavaScript SDK Feature Parity', () => {
  let client;

  beforeEach(() => {
    client = new PodComClient({
      endpoint: 'http://localhost:8899',
      programId: new PublicKey('11111111111111111111111111111111'),
      commitment: 'confirmed'
    });
  });

  it('should have all required services', () => {
    expect(client.agents).toBeInstanceOf(AgentService);
    expect(client.messages).toBeInstanceOf(MessageService);
    expect(client.channels).toBeInstanceOf(ChannelService);
    expect(client.escrow).toBeInstanceOf(EscrowService);
    expect(client.analytics).toBeInstanceOf(AnalyticsService);
    expect(client.discovery).toBeInstanceOf(DiscoveryService);
    expect(client.ipfs).toBeInstanceOf(IPFSService);
    expect(client.zkCompression).toBeInstanceOf(ZKCompressionService);
    expect(client.sessionKeys).toBeInstanceOf(SessionKeysService);
    expect(client.jitoBundles).toBeInstanceOf(JitoBundlesService);
  });

  it('should export all constants', () => {
    expect(PROGRAM_ID).toBeInstanceOf(PublicKey);
    expect(MessageType).toBeDefined();
    expect(MessageStatus).toBeDefined();
    expect(ChannelVisibility).toBeDefined();
    expect(AGENT_CAPABILITIES).toBeDefined();
  });

  it('should have agent service methods', () => {
    expect(typeof client.agents.register).toBe('function');
    expect(typeof client.agents.update).toBe('function');
    expect(typeof client.agents.get).toBe('function');
    expect(typeof client.agents.list).toBe('function');
    expect(typeof client.agents.getAgentPDA).toBe('function');
    expect(typeof client.agents.generateMetadataURI).toBe('function');
  });

  it('should support cleanup', () => {
    expect(typeof client.cleanup).toBe('function');
    expect(() => client.cleanup()).not.toThrow();
  });
}); 