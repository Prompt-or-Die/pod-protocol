import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { 
  LRUCache, 
  AnalyticsCache, 
  AccountCache, 
  CacheStats 
} from '../../src/utils/cache.js';

describe('LRUCache', () => {
  let cache: LRUCache<string, any>;

  beforeEach(() => {
    cache = new LRUCache(3); // Small size for easy testing
  });

  afterEach(() => {
    cache.clear();
  });

  describe('basic operations', () => {
    it('should set and get values', () => {
      cache.set('key1', 'value1');
      expect(cache.get('key1')).toBe('value1');
    });

    it('should return undefined for non-existent keys', () => {
      expect(cache.get('nonexistent')).toBeUndefined();
    });

    it('should handle has() correctly', () => {
      cache.set('key1', 'value1');
      expect(cache.has('key1')).toBe(true);
      expect(cache.has('nonexistent')).toBe(false);
    });

    it('should delete entries', () => {
      cache.set('key1', 'value1');
      expect(cache.has('key1')).toBe(true);
      
      cache.delete('key1');
      expect(cache.has('key1')).toBe(false);
    });

    it('should clear all entries', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      expect(cache.size).toBe(2);
      
      cache.clear();
      expect(cache.size).toBe(0);
    });
  });

  describe('LRU eviction', () => {
    it('should evict least recently used items when capacity is exceeded', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');
      
      // All items should be present
      expect(cache.size).toBe(3);
      expect(cache.has('key1')).toBe(true);
      
      // Add fourth item, should evict key1 (oldest)
      cache.set('key4', 'value4');
      expect(cache.size).toBe(3);
      expect(cache.has('key1')).toBe(false);
      expect(cache.has('key4')).toBe(true);
    });

    it('should update item position on access', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');
      
      // Access key1 to make it recently used
      cache.get('key1');
      
      // Add fourth item, should evict key2 (now oldest)
      cache.set('key4', 'value4');
      expect(cache.has('key1')).toBe(true); // Should still be present
      expect(cache.has('key2')).toBe(false); // Should be evicted
    });

    it('should update item position on set of existing key', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');
      
      // Update key1 to make it recently used
      cache.set('key1', 'newvalue1');
      
      // Add fourth item, should evict key2 (now oldest)
      cache.set('key4', 'value4');
      expect(cache.get('key1')).toBe('newvalue1'); // Should still be present with new value
      expect(cache.has('key2')).toBe(false); // Should be evicted
    });
  });

  describe('TTL functionality', () => {
    it('should expire items after TTL', async () => {
      const shortTtlCache = new LRUCache<string, string>(10, 100); // 100ms TTL
      
      shortTtlCache.set('key1', 'value1');
      expect(shortTtlCache.get('key1')).toBe('value1');
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 150));
      
      expect(shortTtlCache.get('key1')).toBeUndefined();
      expect(shortTtlCache.has('key1')).toBe(false);
    });

    it('should not expire items before TTL', async () => {
      const longTtlCache = new LRUCache<string, string>(10, 1000); // 1s TTL
      
      longTtlCache.set('key1', 'value1');
      
      // Wait less than TTL
      await new Promise(resolve => setTimeout(resolve, 50));
      
      expect(longTtlCache.get('key1')).toBe('value1');
    });

    it('should handle mixed expired and non-expired items', async () => {
      const mixedCache = new LRUCache<string, string>(10, 100); // 100ms TTL
      
      mixedCache.set('key1', 'value1');
      
      // Wait for partial expiration
      await new Promise(resolve => setTimeout(resolve, 50));
      
      mixedCache.set('key2', 'value2'); // Fresh item
      
      // Wait for key1 to expire
      await new Promise(resolve => setTimeout(resolve, 75));
      
      expect(mixedCache.get('key1')).toBeUndefined();
      expect(mixedCache.get('key2')).toBe('value2');
    });
  });

  describe('statistics', () => {
    it('should track cache statistics', () => {
      cache.set('key1', 'value1');
      cache.get('key1'); // hit
      cache.get('nonexistent'); // miss
      
      const stats = cache.getStats();
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBe(0.5);
      expect(stats.size).toBe(1);
    });

    it('should handle zero operations gracefully', () => {
      const stats = cache.getStats();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
      expect(stats.hitRate).toBe(0);
      expect(stats.size).toBe(0);
    });
  });
});

describe('AnalyticsCache', () => {
  let analyticsCache: AnalyticsCache;

  beforeEach(() => {
    analyticsCache = new AnalyticsCache();
  });

  describe('cache keys', () => {
    it('should generate consistent keys for agent analytics', () => {
      const key1 = AnalyticsCache.keys.agentAnalytics();
      const key2 = AnalyticsCache.keys.agentAnalytics();
      expect(key1).toBe(key2);
      expect(key1).toBe('analytics:agents');
    });

    it('should generate parameterized keys', () => {
      const messageKey = AnalyticsCache.keys.messageAnalytics(100);
      expect(messageKey).toBe('analytics:messages:100');
      
      const channelKey = AnalyticsCache.keys.channelAnalytics(50);
      expect(channelKey).toBe('analytics:channels:50');
    });

    it('should generate unique keys for different agents', () => {
      const key1 = AnalyticsCache.keys.agentMetrics('agent1');
      const key2 = AnalyticsCache.keys.agentMetrics('agent2');
      expect(key1).not.toBe(key2);
      expect(key1).toBe('analytics:agent:agent1');
      expect(key2).toBe('analytics:agent:agent2');
    });
  });

  describe('specialized methods', () => {
    it('should cache agent analytics', () => {
      const analytics = {
        totalAgents: 100,
        capabilityDistribution: { 'trading': 50, 'data': 30 },
        averageReputation: 85.5,
        topAgentsByReputation: [],
        recentlyActive: []
      };

      analyticsCache.setAgentAnalytics(analytics);
      const retrieved = analyticsCache.getAgentAnalytics();
      
      expect(retrieved).toEqual(analytics);
    });

    it('should cache message analytics with limit', () => {
      const analytics = {
        totalMessages: 1000,
        messagesByStatus: {},
        messagesByType: {},
        averageMessageSize: 256,
        messagesPerDay: 150,
        topSenders: [],
        recentMessages: []
      };

      analyticsCache.setMessageAnalytics(analytics, 100);
      const retrieved = analyticsCache.getMessageAnalytics(100);
      
      expect(retrieved).toEqual(analytics);
    });

    it('should return undefined for cache misses', () => {
      expect(analyticsCache.getAgentAnalytics()).toBeUndefined();
      expect(analyticsCache.getMessageAnalytics(100)).toBeUndefined();
    });

    it('should differentiate between different limits', () => {
      const analytics1 = { totalMessages: 100 };
      const analytics2 = { totalMessages: 200 };

      analyticsCache.setMessageAnalytics(analytics1, 100);
      analyticsCache.setMessageAnalytics(analytics2, 200);
      
      expect(analyticsCache.getMessageAnalytics(100)).toEqual(analytics1);
      expect(analyticsCache.getMessageAnalytics(200)).toEqual(analytics2);
    });
  });

  describe('TTL behavior', () => {
    it('should respect default TTL for analytics', async () => {
      const shortTtlCache = new AnalyticsCache(50); // 50ms TTL
      
      const analytics = { totalAgents: 10 };
      shortTtlCache.setAgentAnalytics(analytics);
      
      expect(shortTtlCache.getAgentAnalytics()).toEqual(analytics);
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 75));
      
      expect(shortTtlCache.getAgentAnalytics()).toBeUndefined();
    });
  });
});

describe('AccountCache', () => {
  let accountCache: AccountCache;

  beforeEach(() => {
    accountCache = new AccountCache();
  });

  describe('cache keys', () => {
    it('should generate consistent keys for accounts', () => {
      const key1 = AccountCache.keys.account('abc123');
      const key2 = AccountCache.keys.account('abc123');
      expect(key1).toBe(key2);
      expect(key1).toBe('account:abc123');
    });

    it('should generate typed account keys', () => {
      const agentKey = AccountCache.keys.typedAccount('agent', 'abc123');
      expect(agentKey).toBe('account:agent:abc123');
      
      const channelKey = AccountCache.keys.typedAccount('channel', 'def456');
      expect(channelKey).toBe('account:channel:def456');
    });

    it('should generate program account keys', () => {
      const key = AccountCache.keys.programAccounts('agentAccount', []);
      expect(key).toBe('accounts:agentAccount:[]');
      
      const keyWithFilters = AccountCache.keys.programAccounts('agentAccount', [
        { memcmp: { offset: 8, bytes: 'test' } }
      ]);
      expect(keyWithFilters).toContain('agentAccount');
      expect(keyWithFilters).toContain('test');
    });
  });

  describe('specialized methods', () => {
    it('should cache individual accounts', () => {
      const accountInfo = {
        pubkey: 'abc123',
        account: {
          data: Buffer.from('test'),
          executable: false,
          lamports: 1000000,
          owner: 'owner123',
          rentEpoch: 200
        }
      };

      accountCache.setAccount('abc123', accountInfo);
      const retrieved = accountCache.getAccount('abc123');
      
      expect(retrieved).toEqual(accountInfo);
    });

    it('should cache typed accounts', () => {
      const agentAccount = {
        pubkey: 'agent123',
        capabilities: 15,
        reputation: 85,
        metadataUri: 'ipfs://test'
      };

      accountCache.setTypedAccount('agent', 'agent123', agentAccount);
      const retrieved = accountCache.getTypedAccount('agent', 'agent123');
      
      expect(retrieved).toEqual(agentAccount);
    });

    it('should cache program accounts with filters', () => {
      const accounts = [
        { pubkey: 'account1', account: { data: Buffer.from('data1') } },
        { pubkey: 'account2', account: { data: Buffer.from('data2') } }
      ];

      const filters = [{ memcmp: { offset: 8, bytes: 'test' } }];
      
      accountCache.setProgramAccounts('agentAccount', filters, accounts);
      const retrieved = accountCache.getProgramAccounts('agentAccount', filters);
      
      expect(retrieved).toEqual(accounts);
    });

    it('should differentiate between different filter sets', () => {
      const accounts1 = [{ pubkey: 'account1' }];
      const accounts2 = [{ pubkey: 'account2' }];
      
      const filters1 = [{ memcmp: { offset: 8, bytes: 'test1' } }];
      const filters2 = [{ memcmp: { offset: 8, bytes: 'test2' } }];

      accountCache.setProgramAccounts('agentAccount', filters1, accounts1);
      accountCache.setProgramAccounts('agentAccount', filters2, accounts2);
      
      expect(accountCache.getProgramAccounts('agentAccount', filters1)).toEqual(accounts1);
      expect(accountCache.getProgramAccounts('agentAccount', filters2)).toEqual(accounts2);
    });
  });

  describe('TTL behavior', () => {
    it('should respect default TTL for accounts', async () => {
      const shortTtlCache = new AccountCache(50); // 50ms TTL
      
      const accountInfo = { pubkey: 'test123' };
      shortTtlCache.setAccount('test123', accountInfo);
      
      expect(shortTtlCache.getAccount('test123')).toEqual(accountInfo);
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 75));
      
      expect(shortTtlCache.getAccount('test123')).toBeUndefined();
    });
  });
});

describe('Cache Integration', () => {
  it('should handle concurrent operations safely', async () => {
    const cache = new LRUCache<string, number>(100);
    
    // Simulate concurrent access
    const promises = Array.from({ length: 50 }, (_, i) => 
      Promise.resolve().then(() => {
        cache.set(`key${i}`, i);
        return cache.get(`key${i}`);
      })
    );
    
    const results = await Promise.all(promises);
    
    // All operations should complete successfully
    results.forEach((result, i) => {
      expect(result).toBe(i);
    });
  });

  it('should maintain performance under load', () => {
    const cache = new LRUCache<string, string>(1000);
    
    const startTime = Date.now();
    
    // Perform many operations
    for (let i = 0; i < 10000; i++) {
      cache.set(`key${i}`, `value${i}`);
      if (i % 2 === 0) {
        cache.get(`key${i / 2}`);
      }
    }
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    // Should complete reasonably quickly (adjust threshold as needed)
    expect(duration).toBeLessThan(1000); // 1 second
    expect(cache.size).toBeLessThanOrEqual(1000);
  });

  it('should handle memory pressure gracefully', () => {
    const cache = new LRUCache<string, string>(100);
    
    // Fill cache beyond capacity
    for (let i = 0; i < 200; i++) {
      cache.set(`key${i}`, `value${i}`);
    }
    
    // Should maintain capacity
    expect(cache.size).toBe(100);
    
    // Recent items should still be present
    expect(cache.has('key199')).toBe(true);
    expect(cache.has('key190')).toBe(true);
    
    // Old items should be evicted
    expect(cache.has('key0')).toBe(false);
    expect(cache.has('key50')).toBe(false);
  });
}); 