import { mkdtemp, mkdir, rm, writeFile, unlink } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BankQuestionSchema, createSourceSnapshot, type CreateChannelInput, type ShortReelTopicSnapshot } from "@studio/shared";
import { RepositoryService } from "../src/repository/service.js";
import { RepositoryError } from "../src/repository/errors.js";
import { releaseWriterAdmission } from "../src/repository/shortReelStorage.js";

const roots: string[] = [];

async function createFixture(): Promise<RepositoryService> {
  const root = await mkdtemp(path.join(os.tmpdir(), "repo-lookup-efficiency-"));
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
  const currentRoots = roots.splice(0);
  for (const root of currentRoots) {
    await releaseWriterAdmission(root);
  }
  await Promise.all(currentRoots.map((root) => rm(root, { recursive: true, force: true })));
});

const testBankQuestion = BankQuestionSchema.parse({
  id: "bank-q-lookup-001",
  archetype_id: "versus_faceoff",
  domain_id: "tech_speed",
  subtopic_id: "velocity",
  language: "English",
  question: "Which travels faster through a vacuum: light or sound?",
  format: "multiple_choice",
  choices: [
    { id: "A", text: "Light", is_correct: true },
    { id: "B", text: "Sound", is_correct: false },
  ],
  correct_choice_id: "A",
  explanation: "Light travels at 300,000 km/s in vacuum; sound cannot travel through vacuum.",
  age_band: "family",
  status: "approved",
  locale_origin: "en",
  source_channel_id: "system",
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
});

function createTopicCandidate(channelId: string, topicId: string, title: string) {
  return {
    topic_id: topicId,
    channel_id: channelId,
    content_kind: "episode" as const,
    title,
    premise: `Premise for ${title}`,
    why_it_fits: "Engaging and fast-paced knowledge comparison",
    hook: `Hook for ${title}`,
    estimated_potential: "High",
    generated_at: new Date().toISOString(),
    selected: false,
  };
}

describe("Repository Lookup Efficiency and O(1) Identifier Resolution", () => {
  describe("Direct O(1) lookup behavior of getEpisode", () => {
    it("resolves indexed episodes directly without invoking listEpisodes directory re-scans", async () => {
      const repo = await createFixture();
      const channelInput: CreateChannelInput = {
        name: "Efficiency Testing Channel",
        description: "Testing repository lookup performance",
        target_audience: "Engineers",
        language: "English",
        market: "Global",
        dna_mode: "example",
      };
      const channel = await repo.createChannel(channelInput);

      // Create three episodes
      const topic1 = createTopicCandidate(channel.channel_id, "topic-eff-1", "First Efficiency Episode");
      const topic2 = createTopicCandidate(channel.channel_id, "topic-eff-2", "Second Efficiency Episode");
      const topic3 = createTopicCandidate(channel.channel_id, "topic-eff-3", "Third Efficiency Episode");
      await repo.saveTopicRun(channel.channel_id, [topic1, topic2, topic3]);

      const ep1 = await repo.confirmTopic(channel.channel_id, topic1.topic_id);
      const ep2 = await repo.confirmTopic(channel.channel_id, topic2.topic_id);
      const ep3 = await repo.confirmTopic(channel.channel_id, topic3.topic_id);

      // Verify that confirmTopic indexed the episodes in entityIdResolver
      expect(repo.entityIdResolver.getEpisodeSlug(channel.channel_id, ep1.episode_id)).toBe(ep1.slug);
      expect(repo.entityIdResolver.getEpisodeSlug(channel.channel_id, ep2.episode_id)).toBe(ep2.slug);
      expect(repo.entityIdResolver.getEpisodeSlug(channel.channel_id, ep3.episode_id)).toBe(ep3.slug);

      // Spy on listEpisodes to verify O(1) bypass of full scans
      const listEpisodesSpy = vi.spyOn(repo, "listEpisodes");

      // Retrieve each episode
      const fetched1 = await repo.getEpisode(channel.channel_id, ep1.episode_id);
      const fetched2 = await repo.getEpisode(channel.channel_id, ep2.episode_id);
      const fetched3 = await repo.getEpisode(channel.channel_id, ep3.episode_id);

      expect(fetched1.title).toBe(ep1.title);
      expect(fetched2.title).toBe(ep2.title);
      expect(fetched3.title).toBe(ep3.title);

      // listEpisodes must NOT be called for indexed episodes
      expect(listEpisodesSpy).not.toHaveBeenCalled();
    });

    it("populates index on cold start scan and executes subsequent lookups in O(1)", async () => {
      const repo = await createFixture();
      const channel = await repo.createChannel({
        name: "Cold Start Channel",
        description: "Testing cold start fallback",
        target_audience: "Everyone",
        language: "English",
        market: "Global",
        dna_mode: "example",
      });

      const topic = createTopicCandidate(channel.channel_id, "topic-cold-1", "Cold Start Episode");
      await repo.saveTopicRun(channel.channel_id, [topic]);
      const createdEp = await repo.confirmTopic(channel.channel_id, topic.topic_id);

      // Simulate a cold cache (e.g. server restart)
      repo.entityIdResolver.clear();
      expect(repo.entityIdResolver.getEpisodeSlug(channel.channel_id, createdEp.episode_id)).toBeUndefined();

      const listEpisodesSpy = vi.spyOn(repo, "listEpisodes");

      // First lookup triggers fallback scan
      const firstLookup = await repo.getEpisode(channel.channel_id, createdEp.episode_id);
      expect(firstLookup.episode_id).toBe(createdEp.episode_id);
      expect(listEpisodesSpy).toHaveBeenCalledTimes(1);

      // Index is now populated
      expect(repo.entityIdResolver.getEpisodeSlug(channel.channel_id, createdEp.episode_id)).toBe(createdEp.slug);

      // Second lookup should be direct O(1) without calling listEpisodes again
      listEpisodesSpy.mockClear();
      const secondLookup = await repo.getEpisode(channel.channel_id, createdEp.episode_id);
      expect(secondLookup.episode_id).toBe(createdEp.episode_id);
      expect(listEpisodesSpy).not.toHaveBeenCalled();
    });
  });

  describe("Accurate resolution of getShortReelByTopic", () => {
    it("resolves short reels by topic directly without calling listShortReels", async () => {
      const repo = await createFixture();
      const channel = await repo.createChannel({
        name: "Reel Lookup Channel",
        description: "Short reel performance",
        target_audience: "Youth",
        language: "English",
        market: "Global",
        dna_mode: "example",
      });

      const topicSnapshot: ShortReelTopicSnapshot = {
        topic_id: "topic-reel-eff-1",
        channel_id: channel.channel_id,
        title: "Speed of Sound vs Light",
        premise: "Comparing physics constants",
        hook: "Can sound beat light?",
        origin: "keyword",
      };

      const sourceSnapshot = createSourceSnapshot(testBankQuestion);
      const createdReel = await repo.createShortReel(channel.channel_id, topicSnapshot, sourceSnapshot, "req-lookup-1");

      // Verify createShortReel registered the topic in entityIdResolver
      expect(repo.entityIdResolver.getShortReelIdByTopic(channel.channel_id, topicSnapshot.topic_id)).toBe(createdReel.reel_id);

      const listShortReelsSpy = vi.spyOn(repo, "listShortReels");

      // Call getShortReelByTopic
      const resolved = await repo.getShortReelByTopic(channel.channel_id, topicSnapshot.topic_id);
      expect(resolved).not.toBeNull();
      expect(resolved?.reel_id).toBe(createdReel.reel_id);
      expect(resolved?.topic_id).toBe(topicSnapshot.topic_id);

      // Verify listShortReels was bypassed
      expect(listShortReelsSpy).not.toHaveBeenCalled();
    });

    it("returns null when topic does not exist and updates cache when found", async () => {
      const repo = await createFixture();
      const channel = await repo.createChannel({
        name: "Non-Existent Reel Channel",
        description: "Checking missing topic",
        target_audience: "Everyone",
        language: "English",
        market: "Global",
        dna_mode: "example",
      });

      const result = await repo.getShortReelByTopic(channel.channel_id, "unknown-topic-id");
      expect(result).toBeNull();
    });
  });

  describe("Correct cache invalidation and lifecycle updates", () => {
    it("updates resolver on episode stage changes and file modifications", async () => {
      const repo = await createFixture();
      const channel = await repo.createChannel({
        name: "Lifecycle Channel",
        description: "Testing updates",
        target_audience: "All",
        language: "English",
        market: "Global",
        dna_mode: "example",
      });

      const topic = createTopicCandidate(channel.channel_id, "topic-life-1", "Lifecycle Episode");
      await repo.saveTopicRun(channel.channel_id, [topic]);
      const ep = await repo.confirmTopic(channel.channel_id, topic.topic_id);

      // Update episode stage
      const updated = await repo.updateEpisodeStage(channel.channel_id, ep.episode_id, "SCRIPT_READY");
      expect(updated.stage).toBe("SCRIPT_READY");

      const listEpisodesSpy = vi.spyOn(repo, "listEpisodes");
      const fetched = await repo.getEpisode(channel.channel_id, ep.episode_id);
      expect(fetched.stage).toBe("SCRIPT_READY");
      expect(listEpisodesSpy).not.toHaveBeenCalled();

      // Save an episode file
      await repo.saveEpisodeFile(channel.channel_id, ep.episode_id, "script.md", "# New Script Content\n");
      const fetchedAfterSave = await repo.getEpisode(channel.channel_id, ep.episode_id);
      expect(fetchedAfterSave.episode_id).toBe(ep.episode_id);
      expect(listEpisodesSpy).not.toHaveBeenCalled();
    });

    it("invalidates resolver on episode deletion and throws EPISODE_NOT_FOUND", async () => {
      const repo = await createFixture();
      const channel = await repo.createChannel({
        name: "Deletion Channel",
        description: "Testing deletion",
        target_audience: "All",
        language: "English",
        market: "Global",
        dna_mode: "example",
      });

      const topic = createTopicCandidate(channel.channel_id, "topic-del-1", "Episode To Delete");
      await repo.saveTopicRun(channel.channel_id, [topic]);
      const ep = await repo.confirmTopic(channel.channel_id, topic.topic_id);

      // Delete the episode
      await repo.deleteEpisode(channel.channel_id, ep.episode_id);

      // Resolver index should be deleted
      expect(repo.entityIdResolver.getEpisodeSlug(channel.channel_id, ep.episode_id)).toBeUndefined();
      expect(repo.entityIdResolver.getEpisodeIdBySlug(channel.channel_id, ep.slug)).toBeUndefined();

      // Subsequent getEpisode should fail
      await expect(repo.getEpisode(channel.channel_id, ep.episode_id)).rejects.toThrow(RepositoryError);
      await expect(repo.getEpisode(channel.channel_id, ep.episode_id)).rejects.toThrow(/not found/i);
    });

    it("handles stale external deletion gracefully by clearing resolver and scanning", async () => {
      const repo = await createFixture();
      const channel = await repo.createChannel({
        name: "Stale Cache Channel",
        description: "Testing external file removal",
        target_audience: "All",
        language: "English",
        market: "Global",
        dna_mode: "example",
      });

      const topic = createTopicCandidate(channel.channel_id, "topic-stale-1", "Episode Externally Removed");
      await repo.saveTopicRun(channel.channel_id, [topic]);
      const ep = await repo.confirmTopic(channel.channel_id, topic.topic_id);

      // Ensure it is indexed
      expect(repo.entityIdResolver.getEpisodeSlug(channel.channel_id, ep.episode_id)).toBe(ep.slug);

      // Delete episode.json directly from disk behind the resolver's back
      const episodeJsonPath = repo.resolvePath("channels", channel.slug, "episodes", ep.slug, "episode.json");
      await unlink(episodeJsonPath);

      // getEpisode should catch the missing file, evict from cache, fallback to scan, and throw EPISODE_NOT_FOUND
      await expect(repo.getEpisode(channel.channel_id, ep.episode_id)).rejects.toThrow(RepositoryError);
      expect(repo.entityIdResolver.getEpisodeSlug(channel.channel_id, ep.episode_id)).toBeUndefined();
    });

    it("invalidates short reel resolver on deletion", async () => {
      const repo = await createFixture();
      const channel = await repo.createChannel({
        name: "Reel Deletion Channel",
        description: "Testing short reel deletion",
        target_audience: "All",
        language: "English",
        market: "Global",
        dna_mode: "example",
      });

      const topicSnapshot: ShortReelTopicSnapshot = {
        topic_id: "topic-reel-del-1",
        channel_id: channel.channel_id,
        title: "Short Reel For Deletion",
        premise: "Premise",
        hook: "Hook",
        origin: "keyword",
      };

      const sourceSnapshot = createSourceSnapshot(testBankQuestion);
      const reel = await repo.createShortReel(channel.channel_id, topicSnapshot, sourceSnapshot, "req-del-1");

      expect(repo.entityIdResolver.getShortReelIdByTopic(channel.channel_id, topicSnapshot.topic_id)).toBe(reel.reel_id);

      // Delete the short reel
      const deleted = await repo.deleteShortReel({ channel_id: channel.channel_id, reel_id: reel.reel_id });
      expect(deleted).toBe(true);

      // Resolver mapping must be cleared
      expect(repo.entityIdResolver.getShortReelIdByTopic(channel.channel_id, topicSnapshot.topic_id)).toBeUndefined();

      // getShortReelByTopic should return null
      const check = await repo.getShortReelByTopic(channel.channel_id, topicSnapshot.topic_id);
      expect(check).toBeNull();
    });

    it("clears all channel mappings on deleteChannel", async () => {
      const repo = await createFixture();
      const channel = await repo.createChannel({
        name: "Channel Cleanup Test",
        description: "Testing channel deletion cleanup",
        target_audience: "All",
        language: "English",
        market: "Global",
        dna_mode: "example",
      });

      const topic = createTopicCandidate(channel.channel_id, "topic-clean-1", "Channel Cleanup Episode");
      await repo.saveTopicRun(channel.channel_id, [topic]);
      const ep = await repo.confirmTopic(channel.channel_id, topic.topic_id);

      expect(repo.entityIdResolver.getChannelSlug(channel.channel_id)).toBe(channel.slug);
      expect(repo.entityIdResolver.getEpisodeSlug(channel.channel_id, ep.episode_id)).toBe(ep.slug);

      await repo.deleteChannel(channel.channel_id);

      expect(repo.entityIdResolver.getChannelSlug(channel.channel_id)).toBeUndefined();
      expect(repo.entityIdResolver.getEpisodeSlug(channel.channel_id, ep.episode_id)).toBeUndefined();
    });
  });
});
