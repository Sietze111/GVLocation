import { MAP_CONSTANTS } from '../constants/map.js';

interface CacheEntry {
  buffer: Buffer;
  expiresAt: number;
}

/**
 * Tile cache state is stored on globalThis so that even if this module is
 * evaluated more than once by the runtime, all instances share the same
 * cache and counters.
 */
const globalKey = '__gvlocation_tileCache__';

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

  get(url: string): Buffer | null {
    const entry = this.cache.get(url);

    if (!entry) {
      this.misses++;
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(url);
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

    this.cache.set(url, {
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
    this.hits = 0;
    this.misses = 0;
  }
}

const getSingleton = (): TileCache => {
  const existing = (globalThis as any)[globalKey] as TileCache | undefined;
  if (existing) return existing;
  const instance = new TileCache(
    MAP_CONSTANTS.CACHE_MAX_SIZE,
    MAP_CONSTANTS.CACHE_TTL_MS
  );
  (globalThis as any)[globalKey] = instance;
  return instance;
};

export const tileCache = getSingleton();
