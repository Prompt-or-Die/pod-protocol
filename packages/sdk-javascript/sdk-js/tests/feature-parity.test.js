/**
 * Feature Parity Test for PoD Protocol JavaScript SDK
 * 
 * This test verifies that the JavaScript SDK has feature parity with the TypeScript SDK
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
      programId: '11111111111111111111111111111111',
      commitment: 'confirmed',
      jitoRpcUrl: 'https://mainnet.block-engine.jito.wtf/api/v1/bundles'
    });
  });

  describe('Core Client Features', () => {
    it('should initialize with all required services', () => {
      expect(client).toBeDefined();
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

    it('should have correct connection info', () => {
      const info = client.getConnectionInfo();
      expect(info.endpoint).toBe('http://localhost:8899');
      expect(info.commitment).toBe('confirmed');
      expect(info.programId).toBeDefined();
    });

    it('should check initialization status', () => {
      expect(typeof client.isInitialized()).toBe('boolean');
    });

    it('should get connection and program', () => {
      expect(client.getConnection()).toBeDefined();
      expect(client.getProgram()).toBeDefined();
    });
  });

  describe('Service Initialization', () => {
    it('should initialize all services correctly', () => {
      const services = [
        client.agents,
        client.messages, 
        client.channels,
        client.escrow,
        client.analytics,
        client.discovery,
        client.ipfs,
        client.zkCompression,
        client.sessionKeys,
        client.jitoBundles
      ];

      services.forEach(service => {
        expect(service.connection).toBeDefined();
        expect(service.programId).toBeDefined();
        expect(service.commitment).toBeDefined();
      });
    });
  });

  describe('Agent Service Features', () => {
    it('should have all required agent methods', () => {
      const requiredMethods = [
        'register',
        'update', 
        'get',
        'list',
        'exists',
        'getStats',
        'getAgentPDA',
        'generateMetadataURI',
        'validateAgentData',
        'calculateReputation',
        'getCapabilitiesArray',
        'capabilitiesFromArray'
      ];

      requiredMethods.forEach(method => {
        expect(typeof client.agents[method]).toBe('function');
      });
    });
  });

  describe('Message Service Features', () => {
    it('should have all required message methods', () => {
      const requiredMethods = [
        'send',
        'updateStatus',
        'get',
        'list',
        'getByAgent'
      ];

      requiredMethods.forEach(method => {
        expect(typeof client.messages[method]).toBe('function');
      });
    });
  });

  describe('Channel Service Features', () => {
    it('should have all required channel methods', () => {
      const requiredMethods = [
        'create',
        'get',
        'list',
        'join',
        'leave',
        'broadcast',
        'invite'
      ];

      requiredMethods.forEach(method => {
        expect(typeof client.channels[method]).toBe('function');
      });
    });
  });

  describe('Session Keys Service Features', () => {
    it('should have all required session key methods', () => {
      const requiredMethods = [
        'createSessionKey',
        'useSessionKey',
        'revokeSessionKey',
        'getActiveSessions',
        'createMessagingSession',
        'setWallet',
        'cleanup'
      ];

      requiredMethods.forEach(method => {
        expect(typeof client.sessionKeys[method]).toBe('function');
      });
    });
  });

  describe('Jito Bundles Service Features', () => {
    it('should have all required bundle methods', () => {
      const requiredMethods = [
        'sendBundle',
        'sendMessagingBundle', 
        'sendChannelBundle',
        'getOptimalTip',
        'getBundleStatus',
        'setWallet',
        'cleanup'
      ];

      requiredMethods.forEach(method => {
        expect(typeof client.jitoBundles[method]).toBe('function');
      });
    });
  });

  describe('Constants and Types', () => {
    it('should export all required constants', () => {
      expect(PROGRAM_ID).toBeInstanceOf(PublicKey);
      expect(MessageType).toBeDefined();
      expect(MessageStatus).toBeDefined();
      expect(ChannelVisibility).toBeDefined();
      expect(AGENT_CAPABILITIES).toBeDefined();
    });

    it('should have correct message types', () => {
      expect(MessageType.TEXT).toBeDefined();
      expect(MessageType.DATA).toBeDefined();
      expect(MessageType.COMMAND).toBeDefined();
      expect(MessageType.RESPONSE).toBeDefined();
      expect(MessageType.CUSTOM).toBeDefined();
    });

    it('should have correct agent capabilities', () => {
      expect(AGENT_CAPABILITIES.TRADING).toBe(1);
      expect(AGENT_CAPABILITIES.ANALYSIS).toBe(2);
      expect(AGENT_CAPABILITIES.DATA_PROCESSING).toBe(4);
      expect(AGENT_CAPABILITIES.CONTENT_GENERATION).toBe(8);
    });
  });

  describe('Utility Functions', () => {
    it('should export utility functions from index', async () => {
      // These should be imported from the utils
      const utils = await import('../src/utils/index.js');
      
      const requiredUtils = [
        'findAgentPDA',
        'findMessagePDA', 
        'findChannelPDA',
        'findEscrowPDA',
        'hashPayload',
        'lamportsToSol',
        'solToLamports',
        'isValidPublicKey',
        'retry',
        'hasCapability',
        'addCapability',
        'removeCapability'
      ];

      requiredUtils.forEach(util => {
        expect(typeof utils[util]).toBe('function');
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle service initialization errors gracefully', () => {
      expect(() => {
        client.agents.register(); // Should throw due to missing parameters
      }).toThrow();
    });

    it('should provide meaningful error messages', async () => {
      try {
        await client.agents.register({}, null);
      } catch (error) {
        expect(error.message).toBeDefined();
        expect(typeof error.message).toBe('string');
      }
    });
  });

  describe('Cleanup and Resource Management', () => {
    it('should support cleanup operations', () => {
      expect(typeof client.cleanup).toBe('function');
      
      // Should be able to cleanup without throwing
      expect(() => client.cleanup()).not.toThrow();
    });
  });

  describe('Advanced Features', () => {
    it('should support ZK compression', () => {
      expect(client.zkCompression).toBeDefined();
      expect(typeof client.zkCompression.compress).toBe('function');
      expect(typeof client.zkCompression.decompress).toBe('function');
    });

    it('should support IPFS operations', () => {
      expect(client.ipfs).toBeDefined();
      expect(typeof client.ipfs.upload).toBe('function');
      expect(typeof client.ipfs.retrieve).toBe('function');
    });

    it('should support analytics', () => {
      expect(client.analytics).toBeDefined();
      expect(typeof client.analytics.getAgentAnalytics).toBe('function');
      expect(typeof client.analytics.getNetworkAnalytics).toBe('function');
    });

    it('should support discovery', () => {
      expect(client.discovery).toBeDefined();
      expect(typeof client.discovery.searchAgents).toBe('function');
      expect(typeof client.discovery.searchMessages).toBe('function');
    });
  });
});

describe('TypeScript SDK Compatibility', () => {
  it('should maintain API compatibility', () => {
    // The JavaScript SDK should have the same main interface as TypeScript
    const client = new PodComClient();
    
    // Check that all service properties exist
          expect(client.agent).toBeDefined();
      expect(client.message).toBeDefined();
      expect(client.channel).toBeDefined();
    expect(client.escrow).toBeDefined();
    expect(client.analytics).toBeDefined();
    expect(client.discovery).toBeDefined();
    expect(client.ipfs).toBeDefined();
    expect(client.zkCompression).toBeDefined();
    expect(client.sessionKeys).toBeDefined();
    expect(client.jitoBundles).toBeDefined();
  });

  it('should support same configuration options', () => {
    const config = {
      endpoint: 'https://api.devnet.solana.com',
      programId: '11111111111111111111111111111111',
      commitment: 'confirmed',
      ipfs: {
        disabled: false,
        url: 'https://ipfs.io'
      },
      zkCompression: {
        enableBatching: true,
        batchTimeout: 5000
      },
      jitoRpcUrl: 'https://mainnet.block-engine.jito.wtf/api/v1/bundles',
      sessionKeys: {
        defaultDurationHours: 24,
        autoCleanup: true
      }
    };

    expect(() => new PodComClient(config)).not.toThrow();
  });
}); 