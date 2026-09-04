import { MAP_CONSTANTS } from '../constants/map.js';

interface CacheEntry {
  buffer: Buffer;
  expiresAt: number;
}

class TileCache {
  private cache = new Map<string, CacheEntry>();
  private maxSize: number;
  private ttlMs: number;
  private hits = 0;
  private misses = 0;

  constructor(maxSize: number, ttlMs: number) {
    this.maxSize = maxSize;
    this.ttlMs = ttlMs;
  }

  private getKey(url: string): string {
    return url;
  }

  get(url: string): Buffer | null {
    const key = this.getKey(url);
    const entry = this.cache.get(key);

    if (!entry) {
      this.misses++;
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.misses++;
      return null;
    }

    this.hits++;
    return entry.buffer;
  }

  set(url: string, buffer: Buffer): void {
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey !== undefined) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(this.getKey(url), {
      buffer,
      expiresAt: Date.now() + this.ttlMs,
    });
  }

  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hits: this.hits,
      misses: this.misses,
      hitRate:
        this.hits + this.misses > 0
          ? Math.round((this.hits / (this.hits + this.misses)) * 100)
          : 0,
    };
  }

  clear(): void {
    this.cache.clear();
  }
}

export const tileCache = new TileCache(
  MAP_CONSTANTS.CACHE_MAX_SIZE,
  MAP_CONSTANTS.CACHE_TTL_MS
);
