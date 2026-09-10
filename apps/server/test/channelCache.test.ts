import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ChannelSchema, type Channel, type CreateChannelInput } from "@studio/shared";
import { ChannelCache } from "../src/repository/cache/channelCache.js";
import { RepositoryService } from "../src/repository/service.js";
import { RepositoryError } from "../src/repository/errors.js";
import { releaseWriterAdmission } from "../src/repository/shortReelStorage.js";

const roots: string[] = [];

async function createFixture(): Promise<RepositoryService> {
  const root = await mkdtemp(path.join(os.tmpdir(), "repo-channel-cache-"));
  roots.push(root);
  await mkdir(path.join(root, "templates"), { recursive: true });
  await writeFile(
    path.join(root, "templates", "example_channel_dna.md"),
    "# Channel DNA\n\n## Channel Identity\n\n- Channel name: \n",
    "utf8",
  );
  await writeFile(path.join(root, "templates", "example_style_guide.md"), "# Style Guide\n", "utf8");
  const repo = new RepositoryService(root);
  await repo.ensureBootstrap();
  return repo;
}

afterEach(async () => {
  vi.restoreAllMocks();
  const currentRoots = roots.splice(0);
  for (const root of currentRoots) {
    await releaseWriterAdmission(root);
  }
  await Promise.all(currentRoots.map((root) => rm(root, { recursive: true, force: true })));
});

function makeChannelFixture(overrides: Partial<Channel> = {}): Channel {
  return ChannelSchema.parse({
    channel_id: "ch_test_01",
    slug: "test-slug",
    display_name: "Test Channel",
    channel_dna_path: "channels/test-slug/channel_dna.md",
    style_guide_path: "channels/test-slug/style_guide.md",
    status: "DRAFT",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    episode_count: 0,
    ...overrides,
  });
}

function createTopicCandidate(channelId: string, topicId: string, title: string) {
  return {
    topic_id: topicId,
    channel_id: channelId,
    content_kind: "episode" as const,
    title,
    premise: `Premise for ${title}`,
    why_it_fits: "Educational and entertaining quiz",
    hook: `Hook for ${title}`,
    estimated_potential: "High",
    generated_at: new Date().toISOString(),
    selected: false,
  };
}

describe("ChannelCache unit tests", () => {
  it("stores, retrieves, and isolates channel objects in memory", () => {
    const cache = new ChannelCache();
    const channel = makeChannelFixture({
      channel_id: "ch_test_01",
      slug: "test-slug",
      display_name: "Test Channel",
      episode_count: 5,
    });

    cache.set(channel);
    expect(cache.size).toBe(1);

    const retrievedById = cache.get("ch_test_01");
    expect(retrievedById).toBeDefined();
    expect(retrievedById?.display_name).toBe("Test Channel");

    const retrievedBySlug = cache.getBySlug("test-slug");
    expect(retrievedBySlug).toBeDefined();
    expect(retrievedBySlug?.channel_id).toBe("ch_test_01");

    // Mutation isolation: mutating returned object must not mutate internal cached state
    if (retrievedById) {
      retrievedById.display_name = "Mutated Name";
    }
    expect(cache.get("ch_test_01")?.display_name).toBe("Test Channel");
  });

  it("handles incremental episode count modifications", () => {
    const cache = new ChannelCache();
    const channel = makeChannelFixture({
      channel_id: "ch_count_01",
      slug: "count-channel",
      display_name: "Counter Channel",
      episode_count: 3,
    });

    cache.set(channel);
    expect(cache.getEpisodeCount("ch_count_01")).toBe(3);

    const incremented = cache.incrementEpisodeCount("ch_count_01", 2);
    expect(incremented).toBe(5);
    expect(cache.get("ch_count_01")?.episode_count).toBe(5);

    const decremented = cache.decrementEpisodeCount("ch_count_01", 1);
    expect(decremented).toBe(4);
    expect(cache.get("ch_count_01")?.episode_count).toBe(4);

    // Should not drop below 0
    cache.decrementEpisodeCount("ch_count_01", 10);
    expect(cache.get("ch_count_01")?.episode_count).toBe(0);

    // Direct count setter
    cache.setEpisodeCount("ch_count_01", 8);
    expect(cache.get("ch_count_01")?.episode_count).toBe(8);
  });

  it("invalidates and evicts entries properly", () => {
    const cache = new ChannelCache();
    const channel = makeChannelFixture({
      channel_id: "ch_evict_01",
      slug: "evict-channel",
      display_name: "Eviction Channel",
      episode_count: 0,
    });

    cache.set(channel);
    cache.setListWarm(true);
    expect(cache.isListWarm()).toBe(true);

    cache.invalidate("ch_evict_01");
    expect(cache.get("ch_evict_01")).toBeUndefined();
    expect(cache.getBySlug("evict-channel")).toBeUndefined();
    expect(cache.isListWarm()).toBe(false);
  });

  it("enforces TTL expiration when configured", async () => {
    const cache = new ChannelCache({ ttlMs: 30 });
    const channel = makeChannelFixture({
      channel_id: "ch_ttl_01",
      slug: "ttl-channel",
      display_name: "TTL Channel",
      episode_count: 1,
    });

    cache.set(channel);
    cache.setListWarm(true);

    expect(cache.get("ch_ttl_01")).toBeDefined();
    expect(cache.isListWarm()).toBe(true);

    // Wait for TTL to expire
    await new Promise((resolve) => setTimeout(resolve, 45));

    expect(cache.get("ch_ttl_01")).toBeUndefined();
    expect(cache.isListWarm()).toBe(false);
  });

  it("accurately tracks hit and miss telemetry", () => {
    const cache = new ChannelCache();
    const channel = makeChannelFixture({
      channel_id: "ch_stat_01",
      slug: "stat-channel",
      display_name: "Stats Channel",
      episode_count: 0,
    });

    cache.set(channel);
    cache.get("ch_stat_01"); // Hit
    cache.get("ch_non_existent"); // Miss
    cache.getBySlug("stat-channel"); // Hit
    cache.getBySlug("unknown-slug"); // Miss

    cache.recordListHit();
    cache.recordListMiss();

    const stats = cache.getStats();
    expect(stats.hits).toBe(2);
    expect(stats.misses).toBe(2);
    expect(stats.listHits).toBe(1);
    expect(stats.listMisses).toBe(1);
    expect(stats.size).toBe(1);
  });
});

describe("Repository Channel & Episode Count Caching Integration", () => {
  it("serves listChannels from memory once cache is warmed, avoiding repeated disk reads", async () => {
    const repo = await createFixture();
    const input: CreateChannelInput = {
      name: "Speed Channel",
      description: "Fast channel caching verification",
      target_audience: "All",
      language: "English",
      market: "Global",
      dna_mode: "example",
    };
    await repo.createChannel(input);

    // Clear cache to simulate cold start
    repo.channelCache.clear();
    expect(repo.channelCache.isListWarm()).toBe(false);

    // First call: cold start reads disk and warms cache
    const initialChannels = await repo.listChannels(true);
    expect(initialChannels).toHaveLength(1);
    expect(repo.channelCache.isListWarm()).toBe(true);

    // Spy on readChannelBySlug to verify that subsequent calls do not touch disk
    const readChannelBySlugSpy = vi.spyOn(repo, "readChannelBySlug");
    const safeEpisodeCountSpy = vi.spyOn(repo, "safeEpisodeCount");

    const cachedChannels = await repo.listChannels(true);
    expect(cachedChannels).toHaveLength(1);
    expect(cachedChannels[0].channel_id).toBe(initialChannels[0].channel_id);
    expect(readChannelBySlugSpy).not.toHaveBeenCalled();
    expect(safeEpisodeCountSpy).not.toHaveBeenCalled();

    const stats = repo.channelCache.getStats();
    expect(stats.listHits).toBeGreaterThan(0);
  });

  it("serves getChannel from memory cache without disk reads", async () => {
    const repo = await createFixture();
    const input: CreateChannelInput = {
      name: "Direct Hit Channel",
      description: "Direct lookup caching verification",
      target_audience: "All",
      language: "English",
      market: "Global",
      dna_mode: "example",
    };
    const created = await repo.createChannel(input);

    // Channel should be in cache immediately after createChannel
    expect(repo.channelCache.get(created.channel_id)).toBeDefined();

    const readChannelBySlugSpy = vi.spyOn(repo, "readChannelBySlug");
    const safeEpisodeCountSpy = vi.spyOn(repo, "safeEpisodeCount");
    const listChannelsSpy = vi.spyOn(repo, "listChannels");

    const retrieved = await repo.getChannel(created.channel_id);
    expect(retrieved.channel_id).toBe(created.channel_id);
    expect(retrieved.display_name).toBe("Direct Hit Channel");

    // Zero disk reads or scans occurred
    expect(readChannelBySlugSpy).not.toHaveBeenCalled();
    expect(safeEpisodeCountSpy).not.toHaveBeenCalled();
    expect(listChannelsSpy).not.toHaveBeenCalled();
  });

  it("updates memory cache immediately on updateChannel", async () => {
    const repo = await createFixture();
    const input: CreateChannelInput = {
      name: "Mutable Channel",
      description: "Original description",
      target_audience: "All",
      language: "English",
      market: "Global",
      dna_mode: "example",
    };
    const created = await repo.createChannel(input);

    // Update channel
    const updated = await repo.updateChannel(created.channel_id, {
      display_name: "Renamed Channel",
      description: "Updated description",
    });

    expect(updated.display_name).toBe("Renamed Channel");

    // Cache should hold updated profile
    const cached = repo.channelCache.get(created.channel_id);
    expect(cached?.display_name).toBe("Renamed Channel");
    expect(cached?.description).toBe("Updated description");

    // Next getChannel returns updated channel directly from cache
    const fresh = await repo.getChannel(created.channel_id);
    expect(fresh.display_name).toBe("Renamed Channel");
  });

  it("evicts from cache on deleteChannel", async () => {
    const repo = await createFixture();
    const input: CreateChannelInput = {
      name: "Disposable Channel",
      description: "Testing deletion",
      target_audience: "All",
      language: "English",
      market: "Global",
      dna_mode: "example",
    };
    const created = await repo.createChannel(input);
    expect(repo.channelCache.get(created.channel_id)).toBeDefined();

    await repo.deleteChannel(created.channel_id);

    expect(repo.channelCache.get(created.channel_id)).toBeUndefined();
    expect(repo.channelCache.getBySlug(created.slug)).toBeUndefined();
    await expect(repo.getChannel(created.channel_id)).rejects.toThrow(RepositoryError);
  });

  it("maintains episode_count consistency across episode creation, deletion, and cold reload", async () => {
    const repo = await createFixture();
    const input: CreateChannelInput = {
      name: "Episode Counter Channel",
      description: "Testing episode count increments and decrements",
      target_audience: "All",
      language: "English",
      market: "Global",
      dna_mode: "example",
    };
    const channel = await repo.createChannel(input);
    expect(channel.episode_count).toBe(0);

    // Add first episode
    const topic1 = createTopicCandidate(channel.channel_id, "topic-ep-count-1", "First Quiz Episode");
    await repo.saveTopicRun(channel.channel_id, [topic1]);
    const ep1 = await repo.confirmTopic(channel.channel_id, topic1.topic_id);

    // Verify cached episode_count is 1
    const channelAfterEp1 = await repo.getChannel(channel.channel_id);
    expect(channelAfterEp1.episode_count).toBe(1);

    // Add second episode
    const topic2 = createTopicCandidate(channel.channel_id, "topic-ep-count-2", "Second Quiz Episode");
    await repo.saveTopicRun(channel.channel_id, [topic2]);
    await repo.confirmTopic(channel.channel_id, topic2.topic_id);

    const channelAfterEp2 = await repo.getChannel(channel.channel_id);
    expect(channelAfterEp2.episode_count).toBe(2);

    // Delete one episode
    await repo.deleteEpisode(channel.channel_id, ep1.episode_id);

    const channelAfterDelete = await repo.getChannel(channel.channel_id);
    expect(channelAfterDelete.episode_count).toBe(1);

    // Cold cache reload: clear cache and verify it recounts from disk correctly
    repo.channelCache.clear();
    const channelAfterReload = await repo.getChannel(channel.channel_id);
    expect(channelAfterReload.episode_count).toBe(1);

    const listAfterReload = await repo.listChannels(true);
    expect(listAfterReload[0].episode_count).toBe(1);
  });

  it("handles storage root switching by resetting in-memory cache", async () => {
    const repo = await createFixture();
    const input: CreateChannelInput = {
      name: "Switching Root Channel",
      description: "Testing storage root reset",
      target_audience: "All",
      language: "English",
      market: "Global",
      dna_mode: "example",
    };
    await repo.createChannel(input);
    expect(repo.channelCache.size).toBe(1);

    const newRoot = await mkdtemp(path.join(os.tmpdir(), "repo-channel-switch-"));
    roots.push(newRoot);
    await mkdir(path.join(newRoot, "templates"), { recursive: true });
    await writeFile(path.join(newRoot, "templates", "example_channel_dna.md"), "# Channel DNA\n", "utf8");
    await writeFile(path.join(newRoot, "templates", "example_style_guide.md"), "# Style Guide\n", "utf8");

    await repo.setStorageRoot(newRoot);
    expect(repo.channelCache.size).toBe(0);
    expect(repo.channelCache.isListWarm()).toBe(false);
  });

  it("resolves channels by slug through cache without disk reads", async () => {
    const repo = await createFixture();
    const channel = await repo.createChannel({
      name: "Slug Lookup Channel",
      description: "Testing getChannelBySlug caching",
      target_audience: "All",
      language: "English",
      market: "Global",
      dna_mode: "example",
    });

    const readChannelBySlugSpy = vi.spyOn(repo, "readChannelBySlug");

    // Lookup by slug should hit cache
    const retrieved = await repo.getChannelBySlug(channel.slug);
    expect(retrieved.channel_id).toBe(channel.channel_id);
    expect(retrieved.slug).toBe(channel.slug);
    expect(readChannelBySlugSpy).not.toHaveBeenCalled();
  });

  it("correctly filters archived channels when serving listChannels from warm cache", async () => {
    const repo = await createFixture();
    const ch1 = await repo.createChannel({
      name: "Active Channel A",
      description: "Channel A",
      target_audience: "All",
      language: "English",
      market: "Global",
      dna_mode: "example",
    });
    const ch2 = await repo.createChannel({
      name: "Archived Channel B",
      description: "Channel B",
      target_audience: "All",
      language: "English",
      market: "Global",
      dna_mode: "example",
    });

    // Mark channel B as ARCHIVED
    await repo.updateChannel(ch2.channel_id, { status: "ARCHIVED" });

    // Warm cache via listChannels
    const all = await repo.listChannels(true);
    expect(all).toHaveLength(2);

    // Filter archived from warm cache
    const activeOnly = await repo.listChannels(false);
    expect(activeOnly).toHaveLength(1);
    expect(activeOnly[0].channel_id).toBe(ch1.channel_id);
  });

  it("reloads channel from disk when explicitly invalidated", async () => {
    const repo = await createFixture();
    const channel = await repo.createChannel({
      name: "Invalidation Channel",
      description: "Testing explicit channel invalidation",
      target_audience: "All",
      language: "English",
      market: "Global",
      dna_mode: "example",
    });

    expect(repo.channelCache.get(channel.channel_id)).toBeDefined();

    // Invalidate single channel
    repo.channelCache.invalidate(channel.channel_id);
    expect(repo.channelCache.get(channel.channel_id)).toBeUndefined();
    expect(repo.channelCache.isListWarm()).toBe(false);

    // Next getChannel reloads and repopulates cache
    const reloaded = await repo.getChannel(channel.channel_id);
    expect(reloaded.channel_id).toBe(channel.channel_id);
    expect(repo.channelCache.get(channel.channel_id)).toBeDefined();
  });
});
