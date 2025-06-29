/**
 * Intelligent caching infrastructure for PoD Protocol SDK
 * Provides TTL-based caching with invalidation strategies
 */

/**
 * Cache utilities for PoD Protocol SDK
 */

/**
 * LRU Cache implementation
 */
export class LRUCache<K = string, V = unknown> {
  private cache = new Map<K, { value: V; timestamp: number }>();
  private maxSize: number;
  private ttl: number;
  private hits = 0;
  private misses = 0;

  constructor(maxSize: number = 100, ttl: number = 300000) { // 5 minutes default TTL
    this.maxSize = maxSize;
    this.ttl = ttl;
  }

  get(key: K): V | undefined {
    const item = this.cache.get(key);
    if (!item) {
      this.misses++;
      return undefined;
    }

    // Check if expired
    if (Date.now() - item.timestamp > this.ttl) {
      this.cache.delete(key);
      this.misses++;
      return undefined;
    }

    // Move to end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, item);
    this.hits++;
    return item.value;
  }

  set(key: K, value: V): void {
    // Remove if exists
    this.cache.delete(key);

    // Remove oldest if at capacity
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    // Add new item
    this.cache.set(key, { value, timestamp: Date.now() });
  }

  delete(key: K): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }

  get size(): number {
    return this.cache.size;
  }

  has(key: K): boolean {
    const item = this.cache.get(key);
    if (!item) return false;
    
    // Check if expired
    if (Date.now() - item.timestamp > this.ttl) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }

  getStats(): { hits: number; misses: number; hitRate: number; size: number } {
    const total = this.hits + this.misses;
    return {
      hits: this.hits,
      misses: this.misses,
      hitRate: total > 0 ? this.hits / total : 0,
      size: this.cache.size
    };
  }
}

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  accessCount: number;
  lastAccessed: number;
}

export interface CacheOptions {
  defaultTtl?: number;
  maxSize?: number;
  checkInterval?: number;
}

export interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  hitRate: number;
  memoryUsage: number;
}

/**
 * Generic cache implementation with TTL and LRU eviction
 */
export class Cache<K, V> {
  private data = new Map<K, CacheEntry<V>>();
  private stats = { hits: 0, misses: 0 };
  private cleanupTimer?: NodeJS.Timeout;
  
  constructor(private options: CacheOptions = {}) {
    const {
      defaultTtl = 30000, // 30 seconds default
      maxSize = 1000,
      checkInterval = 60000 // 1 minute cleanup interval
    } = options;

    this.options = { defaultTtl, maxSize, checkInterval };
    
    // Start periodic cleanup
    this.startCleanup();
  }

  /**
   * Get value from cache or fetch using provider
   */
  async getOrFetch<T extends V>(
    key: K,
    fetcher: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    const cached = this.get(key);
    if (cached !== undefined) {
      return cached as T;
    }

    try {
      const data = await fetcher();
      this.set(key, data, ttl);
      return data;
    } catch (error) {
      // Return stale data if available during errors
      const stale = this.getStale(key);
      if (stale !== undefined) {
        return stale as T;
      }
      throw error;
    }
  }

  /**
   * Get value from cache (returns undefined if expired or not found)
   */
  get(key: K): V | undefined {
    const entry = this.data.get(key);
    if (!entry) {
      this.stats.misses++;
      return undefined;
    }

    if (this.isExpired(entry)) {
      this.data.delete(key);
      this.stats.misses++;
      return undefined;
    }

    // Update access stats
    entry.accessCount++;
    entry.lastAccessed = Date.now();
    this.stats.hits++;
    
    return entry.data;
  }

  /**
   * Get value even if expired (for stale-while-revalidate patterns)
   */
  getStale(key: K): V | undefined {
    const entry = this.data.get(key);
    return entry?.data;
  }

  /**
   * Set value in cache with optional TTL
   */
  set(key: K, value: V, ttl?: number): void {
    const actualTtl = ttl ?? this.options.defaultTtl!;
    
    // Evict oldest entries if cache is full
    if (this.data.size >= this.options.maxSize!) {
      this.evictLRU();
    }

    const entry: CacheEntry<V> = {
      data: value,
      timestamp: Date.now(),
      ttl: actualTtl,
      accessCount: 1,
      lastAccessed: Date.now()
    };

    this.data.set(key, entry);
  }

  /**
   * Delete specific key from cache
   */
  delete(key: K): boolean {
    return this.data.delete(key);
  }

  /**
   * Clear all cached data
   */
  clear(): void {
    this.data.clear();
    this.stats = { hits: 0, misses: 0 };
  }

  /**
   * Check if key exists and is not expired
   */
  has(key: K): boolean {
    const entry = this.data.get(key);
    return entry ? !this.isExpired(entry) : false;
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const memoryUsage = this.estimateMemoryUsage();
    const totalRequests = this.stats.hits + this.stats.misses;
    const hitRate = totalRequests > 0 ? this.stats.hits / totalRequests : 0;

    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      size: this.data.size,
      hitRate,
      memoryUsage
    };
  }

  /**
   * Get all keys (for debugging)
   */
  keys(): K[] {
    return Array.from(this.data.keys());
  }

  /**
   * Invalidate entries matching a pattern or predicate
   */
  invalidate(predicate: (key: K, value: V) => boolean): number {
    let count = 0;
    for (const [key, entry] of this.data.entries()) {
      if (predicate(key, entry.data)) {
        this.data.delete(key);
        count++;
      }
    }
    return count;
  }

  /**
   * Update TTL for existing entries
   */
  updateTtl(key: K, newTtl: number): boolean {
    const entry = this.data.get(key);
    if (entry) {
      entry.ttl = newTtl;
      entry.timestamp = Date.now(); // Reset timestamp
      return true;
    }
    return false;
  }

  /**
   * Get entries that will expire soon
   */
  getExpiringSoon(withinMs: number = 5000): Array<{ key: K; value: V; expiresIn: number }> {
    const now = Date.now();
    const result: Array<{ key: K; value: V; expiresIn: number }> = [];

    for (const [key, entry] of this.data.entries()) {
      const expiresAt = entry.timestamp + entry.ttl;
      const expiresIn = expiresAt - now;
      
      if (expiresIn > 0 && expiresIn <= withinMs) {
        result.push({ key, value: entry.data, expiresIn });
      }
    }

    return result;
  }

  /**
   * Cleanup and destroy cache
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    this.clear();
  }

  // Private methods

  private isExpired(entry: CacheEntry<V>): boolean {
    return Date.now() - entry.timestamp > entry.ttl;
  }

  private evictLRU(): void {
    let oldestKey: K | undefined;
    let oldestTime = Infinity;

    for (const [key, entry] of this.data.entries()) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey !== undefined) {
      this.data.delete(oldestKey);
    }
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.data.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.data.delete(key);
      }
    }
  }

  private startCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.options.checkInterval);
  }

  private estimateMemoryUsage(): number {
    // Rough estimation of memory usage in bytes
    let size = 0;
    for (const [key, entry] of this.data.entries()) {
      size += this.estimateSize(key) + this.estimateSize(entry);
    }
    return size;
  }

  private estimateSize(obj: unknown): number {
    if (obj === null || obj === undefined) return 0;
    if (typeof obj === 'string') return obj.length * 2; // UTF-16
    if (typeof obj === 'number') return 8;
    if (typeof obj === 'boolean') return 1;
    if (Array.isArray(obj)) return obj.reduce((sum, item) => sum + this.estimateSize(item), 0);
    if (typeof obj === 'object') {
      return Object.entries(obj).reduce((sum, [key, value]) => 
        sum + this.estimateSize(key) + this.estimateSize(value), 0);
    }
    return 0;
  }
}

/**
 * Specialized cache for account data
 */
export class AccountCache extends LRUCache {
  constructor(options?: { defaultTtl?: number; maxSize?: number } | number) {
    if (typeof options === 'number') {
      super(500, options); // ttl provided as number
    } else {
      super(options?.maxSize || 500, options?.defaultTtl || 30000); // 30 seconds default TTL for accounts
    }
  }

  static keys = {
    account: (address: string) => `account:${address}`,
    typedAccount: (type: string, address: string) => `account:${type}:${address}`,
    programAccounts: (accountType: string, filters: any[]) => {
      const filterStr = JSON.stringify(filters);
      return `accounts:${accountType}:${filterStr}`;
    }
  };

  setAccount(address: string, accountInfo: any): void {
    this.set(AccountCache.keys.account(address), accountInfo);
  }

  getAccount(address: string): any {
    return this.get(AccountCache.keys.account(address));
  }

  setTypedAccount(type: string, address: string, account: any): void {
    this.set(AccountCache.keys.typedAccount(type, address), account);
  }

  getTypedAccount(type: string, address: string): any {
    return this.get(AccountCache.keys.typedAccount(type, address));
  }

  setProgramAccounts(accountType: string, filters: any[], accounts: any[]): void {
    this.set(AccountCache.keys.programAccounts(accountType, filters), accounts);
  }

  getProgramAccounts(accountType: string, filters: any[]): any[] | undefined {
    return this.get(AccountCache.keys.programAccounts(accountType, filters)) as any[] | undefined;
  }

  // Add methods expected by BaseService
  getOrFetch<T>(key: string, fetcher: () => Promise<T>, ttl?: number): Promise<T> {
    const cached = this.get(key);
    if (cached !== undefined) {
      return Promise.resolve(cached);
    }
    
    return fetcher().then(result => {
      this.set(key, result);
      return result;
    });
  }

  invalidateByType(accountType: string): number {
    const count = 0;
    // Implementation would scan keys and remove matching patterns
    return count;
  }

  invalidateByProgram(programId: string): number {
    const count = 0;
    // Implementation would scan keys and remove matching patterns
    return count;
  }

  invalidate(predicate: (key: string) => boolean): number {
    const count = 0;
    // Implementation would scan keys and remove matching patterns
    return count;
  }

  destroy(): void {
    this.clear();
  }
}

/**
 * Specialized cache for analytics data
 */
export class AnalyticsCache extends LRUCache {
  constructor(options?: { defaultTtl?: number; maxSize?: number } | number) {
    if (typeof options === 'number') {
      super(100, options); // ttl provided as number
    } else {
      super(options?.maxSize || 100, options?.defaultTtl || 60000); // 1 minute default TTL for analytics
    }
  }

  static keys = {
    agentAnalytics: () => 'analytics:agents',
    agentMetrics: (agentId: string) => `analytics:agent:${agentId}`,
    messageAnalytics: (limit: string) => `analytics:messages:${limit}`,
    channelAnalytics: (limit: string) => `analytics:channels:${limit}`,
    networkAnalytics: () => 'analytics:network',
  };

  setAgentAnalytics(analytics: any): void {
    this.set(AnalyticsCache.keys.agentAnalytics(), analytics);
  }

  getAgentAnalytics(): any {
    return this.get(AnalyticsCache.keys.agentAnalytics());
  }

  setMessageAnalytics(analytics: any, limit: number): void {
    this.set(AnalyticsCache.keys.messageAnalytics(limit.toString()), analytics);
  }

  getMessageAnalytics(limit: number): any {
    return this.get(AnalyticsCache.keys.messageAnalytics(limit.toString()));
  }

  setChannelAnalytics(analytics: any, limit: number): void {
    this.set(AnalyticsCache.keys.channelAnalytics(limit.toString()), analytics);
  }

  getChannelAnalytics(limit: number): any {
    return this.get(AnalyticsCache.keys.channelAnalytics(limit.toString()));
  }

  setNetworkAnalytics(analytics: any): void {
    this.set(AnalyticsCache.keys.networkAnalytics(), analytics);
  }

  getNetworkAnalytics(): any {
    return this.get(AnalyticsCache.keys.networkAnalytics());
  }

  // Add methods expected by BaseService
  getOrFetch<T>(key: string, fetcher: () => Promise<T>, ttl?: number): Promise<T> {
    const cached = this.get(key);
    if (cached !== undefined) {
      return Promise.resolve(cached);
    }
    
    return fetcher().then(result => {
      this.set(key, result);
      return result;
    });
  }

  destroy(): void {
    this.clear();
  }
}

/**
 * Global cache manager
 */
export class CacheManager {
  private caches = new Map<string, Cache<any, any>>();

  /**
   * Get or create a named cache
   */
  getCache<K, V>(name: string, options?: CacheOptions): Cache<K, V> {
    if (!this.caches.has(name)) {
      this.caches.set(name, new Cache<K, V>(options));
    }
    return this.caches.get(name)!;
  }

  /**
   * Clear all caches
   */
  clearAll(): void {
    for (const cache of this.caches.values()) {
      cache.clear();
    }
  }

  /**
   * Get stats for all caches
   */
  getAllStats(): Record<string, CacheStats> {
    const stats: Record<string, CacheStats> = {};
    for (const [name, cache] of this.caches.entries()) {
      stats[name] = cache.getStats();
    }
    return stats;
  }

  /**
   * Destroy all caches
   */
  destroy(): void {
    for (const cache of this.caches.values()) {
      cache.destroy();
    }
    this.caches.clear();
  }
}

// Export default cache manager instance
export const cacheManager = new CacheManager(); 