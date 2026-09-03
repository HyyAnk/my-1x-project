import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { VoicePlan } from "@studio/shared";
import { RepositoryService } from "../src/repository.js";

const roots: string[] = [];

async function fixture(): Promise<RepositoryService> {
  const root = await mkdtemp(path.join(os.tmpdir(), "quiz-studio-analytics-"));
  roots.push(root);
  await mkdir(path.join(root, "templates"), { recursive: true });
  await writeFile(
    path.join(root, "templates", "example_channel_dna.md"),
    "# Channel DNA\n",
    "utf8",
  );
  await writeFile(path.join(root, "templates", "example_style_guide.md"), "# Style Guide\n", "utf8");
  return new RepositoryService(root);
}

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe("UsageLedger Analytics & Persistence", () => {
  it("initializes an empty ledger on first read if none exists", async () => {
    const repository = await fixture();
    await repository.ensureBootstrap();

    const ledger = await repository.readUsageLedger();
    expect(ledger.version).toBe(1);
    expect(ledger.voice.rendered_characters).toBe(0);
    expect(ledger.voice.rendered_duration_seconds).toBe(0);
    expect(ledger.voice.rendered_episodes_count).toBe(0);
    expect(ledger.image.total_images_generated).toBe(0);
    expect(ledger.recent_events).toEqual([]);
  });

  it("auto-bootstraps historical metrics from existing on-disk channels and voice plans", async () => {
    const repository = await fixture();
    await repository.ensureBootstrap();

    const channel = await repository.createChannel({
      name: "Quiz History Channel",
      description: "Testing bootstrap",
      target_audience: "Everyone",
      language: "Vietnamese",
      market: "Global",
      dna_mode: "example",
    });

    const topics = Array.from({ length: 5 }, (_, index) => ({
      topic_id: `topic-solar-${index}`,
      channel_id: channel.channel_id,
      title: `Solar System ${index}`,
      premise: "Space quiz",
      why_it_fits: "Fits",
      hook: "Hook",
      estimated_potential: "High",
      generated_at: new Date().toISOString(),
      selected: false,
    }));
    await repository.saveTopicRun(channel.channel_id, topics);
    const episode = await repository.confirmTopic(channel.channel_id, topics[0].topic_id);

    const voicePlan: VoicePlan = {
      schema_version: 2,
      channel_id: channel.channel_id,
      episode_id: episode.episode_id,
      segments: [
        {
          segment_id: "seg-1",
          role: "intro",
          text: "Xin chào các bạn đến với câu đố hôm nay!",
          duration_seconds: 4.5,
        },
        {
          segment_id: "seg-2",
          role: "question",
          text: "Câu hỏi số một là gì?",
          duration_seconds: 3.2,
        },
      ],
    };
    await repository.writeVoicePlan(channel.channel_id, episode.episode_id, voicePlan);

    // Read metrics via getRenderedVoiceMetrics
    const metrics = await repository.getRenderedVoiceMetrics();
    const expectedChars = voicePlan.segments.reduce((acc, s) => acc + (s.text || "").length, 0);
    expect(metrics.rendered_characters).toBe(expectedChars);
    expect(metrics.rendered_duration_seconds).toBe(7.7);
    expect(metrics.rendered_segments_count).toBe(2);
    expect(metrics.rendered_episodes_count).toBe(1);

    const ledger = await repository.readUsageLedger();
    expect(ledger.voice.rendered_characters).toBe(expectedChars);
    expect(ledger.voice.estimated_savings_usd).toBeCloseTo((expectedChars / 1000) * 0.1, 4);
  });

  it("records voice usage cumulatively and preserves stats even when episodes are deleted", async () => {
    const repository = await fixture();
    await repository.ensureBootstrap();

    const channel = await repository.createChannel({
      name: "Voice Test Channel",
      description: "Testing voice accumulation",
      target_audience: "Everyone",
      language: "Vietnamese",
      market: "Global",
      dna_mode: "example",
    });

    const topics = Array.from({ length: 5 }, (_, index) => ({
      topic_id: `topic-del-${index}`,
      channel_id: channel.channel_id,
      title: `Temporary Topic ${index}`,
      premise: "Temp quiz",
      why_it_fits: "Fits",
      hook: "Hook",
      estimated_potential: "High",
      generated_at: new Date().toISOString(),
      selected: false,
    }));
    await repository.saveTopicRun(channel.channel_id, topics);
    const episode = await repository.confirmTopic(channel.channel_id, topics[0].topic_id);

    // Record voice usage
    await repository.recordVoiceUsage({
      channelId: channel.channel_id,
      episodeId: episode.episode_id,
      characters: 500,
      durationSeconds: 30.5,
      segmentsCount: 5,
      note: "Episode 1 Voice Render",
    });

    let metrics = await repository.getRenderedVoiceMetrics();
    expect(metrics.rendered_characters).toBe(500);
    expect(metrics.rendered_duration_seconds).toBe(30.5);
    expect(metrics.rendered_segments_count).toBe(5);

    // Record a second voice batch
    await repository.recordVoiceUsage({
      channelId: channel.channel_id,
      episodeId: "ep-2",
      characters: 750,
      durationSeconds: 45.0,
      segmentsCount: 8,
      note: "Episode 2 Voice Render",
    });

    metrics = await repository.getRenderedVoiceMetrics();
    expect(metrics.rendered_characters).toBe(1250);
    expect(metrics.rendered_duration_seconds).toBe(75.5);
    expect(metrics.rendered_segments_count).toBe(13);

    // Delete episode on disk
    await repository.deleteEpisode(channel.channel_id, episode.episode_id);

    // Persistent metrics MUST NOT reset
    const afterDeleteMetrics = await repository.getRenderedVoiceMetrics();
    expect(afterDeleteMetrics.rendered_characters).toBe(1250);
    expect(afterDeleteMetrics.rendered_duration_seconds).toBe(75.5);
    expect(afterDeleteMetrics.rendered_segments_count).toBe(13);

    const ledger = await repository.readUsageLedger();
    expect(ledger.voice.rendered_characters).toBe(1250);
    expect(ledger.voice.estimated_savings_usd).toBe(0.125);
    expect(ledger.recent_events.length).toBe(2);
    expect(ledger.recent_events[0].type).toBe("voice_render");
  });

  it("records image usage cumulatively with provider and model breakdown", async () => {
    const repository = await fixture();
    await repository.ensureBootstrap();

    await repository.recordImageUsage({
      channelId: "ch-1",
      episodeId: "ep-1",
      provider: "gpti2",
      model: "gpt-image-2",
      count: 3,
      costVnd: 1500,
      costUsd: 0.06,
      note: "Hero bundle images",
    });

    await repository.recordImageUsage({
      channelId: "ch-1",
      episodeId: "ep-1",
      provider: "shopaikey",
      model: "gpt-image-2",
      count: 2,
      costVnd: 1000,
      costUsd: 0.04,
      note: "Secondary images",
    });

    const ledger = await repository.readUsageLedger();
    expect(ledger.image.total_images_generated).toBe(5);
    expect(ledger.image.estimated_cost_vnd).toBe(2500);
    expect(ledger.image.estimated_cost_usd).toBeCloseTo(0.1, 4);
    expect(ledger.image.by_provider.gpti2).toBe(3);
    expect(ledger.image.by_provider.shopaikey).toBe(2);
    expect(ledger.image.by_model["gpt-image-2"]).toBe(5);
    expect(ledger.recent_events.length).toBe(2);
  });

  it("auto-bootstraps image metrics from on-disk quiz-images, meta.json, and thumbnails", async () => {
    const repository = await fixture();
    await repository.ensureBootstrap();

    const channel = await repository.createChannel({
      name: "Image History Channel",
      description: "Testing image bootstrap",
      target_audience: "Everyone",
      language: "Vietnamese",
      market: "Global",
      dna_mode: "example",
    });

    const topics = Array.from({ length: 5 }, (_, index) => ({
      topic_id: `topic-img-${index}`,
      channel_id: channel.channel_id,
      title: `Images Topic ${index}`,
      premise: "Image quiz",
      why_it_fits: "Fits",
      hook: "Hook",
      estimated_potential: "High",
      generated_at: new Date().toISOString(),
      selected: false,
    }));
    await repository.saveTopicRun(channel.channel_id, topics);
    const episode = await repository.confirmTopic(channel.channel_id, topics[0].topic_id);

    // Write a dummy PNG asset with meta.json
    // Valid 1x1 PNG bytes
    const pngBytes = new Uint8Array([
      137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82,
      0, 0, 0, 1, 0, 0, 0, 1, 8, 6, 0, 0, 0, 31, 21, 196,
      137, 0, 0, 0, 10, 73, 68, 65, 84, 120, 156, 99, 0, 1, 0, 0,
      5, 0, 1, 13, 10, 45, 180, 0, 0, 0, 0, 73, 69, 78, 68, 174, 66, 96, 130
    ]);
    const fingerprint = "a".repeat(64);
    await repository.writeQuizImageAsset(
      channel.channel_id,
      episode.episode_id,
      "asset-question-01-hero",
      fingerprint,
      pngBytes,
      { price_vnd: 100, model: "nano-banana" },
    );

    // Reconcile ledger from disk
    const ledger = await repository.reconcileUsageLedgerFromDisk();
    expect(ledger.image.total_images_generated).toBe(1);
    expect(ledger.image.estimated_cost_vnd).toBe(100);
    expect(ledger.image.estimated_cost_usd).toBeCloseTo(100 / 25500, 4);
    expect(ledger.image.by_provider.gpti2).toBe(1);
    expect(ledger.image.by_model["nano-banana"]).toBe(1);
  });

  it("safely handles concurrent writes without data loss or corruption", async () => {
    const repository = await fixture();
    await repository.ensureBootstrap();

    const writeTasks = Array.from({ length: 20 }).map((_, index) =>
      repository.recordVoiceUsage({
        channelId: "ch-concurrency",
        episodeId: `ep-${index}`,
        characters: 100,
        durationSeconds: 5,
        segmentsCount: 1,
      }),
    );

    await Promise.all(writeTasks);

    const ledger = await repository.readUsageLedger();
    expect(ledger.voice.rendered_characters).toBe(2000);
    expect(ledger.voice.rendered_duration_seconds).toBe(100);
    expect(ledger.voice.rendered_segments_count).toBe(20);
    expect(ledger.recent_events.length).toBe(20);
  });
});
