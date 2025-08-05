import { config } from '@/config/environment';

export interface CacheEntry<T> {
  value: T;
  timestamp: number;
  ttl: number;
}

export type CacheTTL = 'short' | 'medium' | 'long';

export class CacheService {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private readonly maxSize: number;

  constructor(maxSize: number = config.cache.maxSize) {
    this.maxSize = maxSize;
    
    // Clean expired entries every 5 minutes
    setInterval(() => {
      this.cleanExpired();
    }, 5 * 60 * 1000);
  }

  set<T>(key: string, value: T, ttl: CacheTTL | number): void {
    const ttlMs = typeof ttl === 'number' ? ttl * 1000 : this.getTTLMs(ttl);
    
    // If cache is full, remove oldest entries
    if (this.cache.size >= this.maxSize) {
      this.evictOldest();
    }

    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      ttl: ttlMs,
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    // Check if entry has expired
    if (this.isExpired(entry)) {
      this.cache.delete(key);
      return null;
    }

    return entry.value as T;
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return false;
    }

    if (this.isExpired(entry)) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }

  // Get or set pattern
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttl: CacheTTL | number
  ): Promise<T> {
    const cached = this.get<T>(key);
    
    if (cached !== null) {
      return cached;
    }

    const value = await factory();
    this.set(key, value, ttl);
    return value;
  }

  // Batch operations
  mget<T>(keys: string[]): Record<string, T | null> {
    const result: Record<string, T | null> = {};
    
    for (const key of keys) {
      result[key] = this.get<T>(key);
    }

    return result;
  }

  mset<T>(entries: Record<string, T>, ttl: CacheTTL | number): void {
    for (const [key, value] of Object.entries(entries)) {
      this.set(key, value, ttl);
    }
  }

  // Cache statistics
  getStats(): {
    size: number;
    maxSize: number;
    hitRate?: number;
    memoryUsage?: number;
  } {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      // TODO: Implement hit rate tracking
      // TODO: Implement memory usage estimation
    };
  }

  // Prefix-based operations
  keys(pattern?: string): string[] {
    const allKeys = Array.from(this.cache.keys());
    
    if (!pattern) {
      return allKeys;
    }

    // Simple pattern matching (supports * wildcard)
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    return allKeys.filter(key => regex.test(key));
  }

  deleteByPattern(pattern: string): number {
    const keysToDelete = this.keys(pattern);
    let deleted = 0;

    for (const key of keysToDelete) {
      if (this.delete(key)) {
        deleted++;
      }
    }

    return deleted;
  }

  private getTTLMs(ttl: CacheTTL): number {
    switch (ttl) {
      case 'short':
        return config.cache.ttl.short * 1000;
      case 'medium':
        return config.cache.ttl.medium * 1000;
      case 'long':
        return config.cache.ttl.long * 1000;
      default:
        return config.cache.ttl.medium * 1000;
    }
  }

  private isExpired(entry: CacheEntry<any>): boolean {
    return Date.now() - entry.timestamp > entry.ttl;
  }

  private cleanExpired(): void {
    let cleaned = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      if (this.isExpired(entry)) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    if (config.nodeEnv === 'development' && cleaned > 0) {
      console.log(`[CacheService] Cleaned ${cleaned} expired entries`);
    }
  }

  private evictOldest(): void {
    // Remove 10% of oldest entries when cache is full
    const entriesToRemove = Math.max(1, Math.floor(this.maxSize * 0.1));
    const sortedEntries = Array.from(this.cache.entries())
      .sort(([, a], [, b]) => a.timestamp - b.timestamp);

    for (let i = 0; i < entriesToRemove && i < sortedEntries.length; i++) {
      const entry = sortedEntries[i];
      if (entry) {
        this.cache.delete(entry[0]);
      }
    }
  }
}

// Global cache instance
export const cacheService = new CacheService();

// Cache key generators
export const CacheKeys = {
  // LLM/GPT related
  themeExpansion: (theme: string) => `theme_expansion:${theme}`,
  
  // Qloo related
  tasteCorrelation: (category: string, keywords: string) => 
    `taste_correlation:${category}:${Buffer.from(keywords).toString('base64')}`,
  
  // CoinGecko related
  tokenPrice: (symbol: string) => `coingecko:price:${symbol.toLowerCase()}`,
  tokenInfo: (id: string) => `coingecko:info:${id}`,
  trendingCoins: () => 'coingecko:trending',
  
  // OpenSea related
  collection: (slug: string) => `opensea:collection:${slug}`,
  collectionStats: (slug: string) => `opensea:stats:${slug}`,
  
  // Social media related
  twitterTrends: (location?: string) => `twitter:trends:${location || 'global'}`,
  farcasterTrends: () => 'farcaster:trends',
  
  // Orchestration related
  fullPipeline: (vibe: string) => `pipeline:${Buffer.from(vibe).toString('base64')}`,
};