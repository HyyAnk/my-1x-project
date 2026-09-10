import type { Channel } from "@studio/shared";

export interface ChannelCacheOptions {
  /**
   * Time-to-live in milliseconds for cached channel entries.
   * Default is 300,000 ms (5 minutes). Set to 0 or Infinity for no expiration.
   */
  ttlMs?: number;
}

export interface ChannelCacheStats {
  size: number;
  isListWarm: boolean;
  hits: number;
  misses: number;
  listHits: number;
  listMisses: number;
}

interface CachedChannelEntry {
  channel: Channel;
  cachedAt: number;
}

/**
 * ChannelCache maintains an in-memory cache of Channel profiles and episode counts,
 * eliminating recurring disk scans and directory readdirs across API operations.
 */
export class ChannelCache {
  private readonly ttlMs: number;
  private readonly byId = new Map<string, CachedChannelEntry>();
  private readonly slugToId = new Map<string, string>();
  private isListWarmFlag = false;
  private listWarmAt = 0;

  private hitsCount = 0;
  private missesCount = 0;
  private listHitsCount = 0;
  private listMissesCount = 0;

  constructor(options: ChannelCacheOptions = {}) {
    this.ttlMs = options.ttlMs ?? 300_000;
  }

  private isExpired(entry: CachedChannelEntry, now: number): boolean {
    if (this.ttlMs <= 0 || !Number.isFinite(this.ttlMs)) return false;
    return now - entry.cachedAt > this.ttlMs;
  }

  get(channelId: string): Channel | undefined {
    const entry = this.byId.get(channelId);
    const now = Date.now();
    if (!entry) {
      this.missesCount++;
      return undefined;
    }
    if (this.isExpired(entry, now)) {
      this.delete(channelId);
      this.missesCount++;
      return undefined;
    }
    this.hitsCount++;
    return { ...entry.channel };
  }

  getBySlug(slug: string): Channel | undefined {
    const channelId = this.slugToId.get(slug);
    if (!channelId) {
      this.missesCount++;
      return undefined;
    }
    return this.get(channelId);
  }

  set(channel: Channel): void {
    const now = Date.now();
    const existing = this.byId.get(channel.channel_id);
    if (existing && existing.channel.slug !== channel.slug) {
      this.slugToId.delete(existing.channel.slug);
    }
    const previousIdForSlug = this.slugToId.get(channel.slug);
    if (previousIdForSlug && previousIdForSlug !== channel.channel_id) {
      this.byId.delete(previousIdForSlug);
    }
    this.byId.set(channel.channel_id, {
      channel: { ...channel },
      cachedAt: now,
    });
    this.slugToId.set(channel.slug, channel.channel_id);
  }

  delete(channelId: string): void {
    const entry = this.byId.get(channelId);
    if (entry) {
      this.slugToId.delete(entry.channel.slug);
      this.byId.delete(channelId);
    }
  }

  deleteBySlug(slug: string): void {
    const channelId = this.slugToId.get(slug);
    if (channelId) {
      this.delete(channelId);
    }
  }

  invalidate(channelId: string): void {
    this.delete(channelId);
    this.isListWarmFlag = false;
  }

  isListWarm(): boolean {
    if (!this.isListWarmFlag) {
      return false;
    }
    if (this.ttlMs > 0 && Number.isFinite(this.ttlMs)) {
      if (Date.now() - this.listWarmAt > this.ttlMs) {
        this.isListWarmFlag = false;
        return false;
      }
    }
    return true;
  }

  setListWarm(warm: boolean): void {
    this.isListWarmFlag = warm;
    this.listWarmAt = warm ? Date.now() : 0;
  }

  recordListHit(): void {
    this.listHitsCount++;
  }

  recordListMiss(): void {
    this.listMissesCount++;
  }

  getAll(): Channel[] {
    const now = Date.now();
    const result: Channel[] = [];
    for (const [id, entry] of this.byId.entries()) {
      if (this.isExpired(entry, now)) {
        this.delete(id);
      } else {
        result.push({ ...entry.channel });
      }
    }
    return result;
  }

  incrementEpisodeCount(channelId: string, delta = 1): number | undefined {
    const entry = this.byId.get(channelId);
    if (!entry) return undefined;
    const currentCount = entry.channel.episode_count ?? 0;
    const nextCount = Math.max(0, currentCount + delta);
    entry.channel.episode_count = nextCount;
    return nextCount;
  }

  decrementEpisodeCount(channelId: string, delta = 1): number | undefined {
    return this.incrementEpisodeCount(channelId, -delta);
  }

  setEpisodeCount(channelId: string, count: number): void {
    const entry = this.byId.get(channelId);
    if (entry) {
      entry.channel.episode_count = Math.max(0, count);
    }
  }

  getEpisodeCount(channelId: string): number | undefined {
    const entry = this.byId.get(channelId);
    return entry?.channel.episode_count;
  }

  invalidateEpisodeCount(channelId: string): void {
    this.invalidate(channelId);
  }

  clear(): void {
    this.byId.clear();
    this.slugToId.clear();
    this.isListWarmFlag = false;
    this.listWarmAt = 0;
  }

  get size(): number {
    return this.byId.size;
  }

  getStats(): ChannelCacheStats {
    return {
      size: this.byId.size,
      isListWarm: this.isListWarmFlag,
      hits: this.hitsCount,
      misses: this.missesCount,
      listHits: this.listHitsCount,
      listMisses: this.listMissesCount,
    };
  }
}
