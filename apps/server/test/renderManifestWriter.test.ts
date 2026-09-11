import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EpisodeSchema, type QuizAssetResolution } from "@studio/shared";
import { persistVideoRenderArtifacts } from "../src/tasks/video/renderManifestWriter.js";
import type { RepositoryService } from "../src/repository.js";

describe("renderManifestWriter", () => {
  const roots: string[] = [];

  afterEach(async () => {
    await Promise.all(roots.splice(0).map((r) => rm(r, { recursive: true, force: true })));
  });

  async function createTestRoot(): Promise<string> {
    const root = await mkdtemp(path.join(os.tmpdir(), "manifest-writer-test-"));
    roots.push(root);
    return root;
  }

  it("writes V2-only manifest with passed preflight, engine snapshot, and transition instances", async () => {
    const root = await createTestRoot();
    const episodeId = "manifest-test-ep";
    const channelId = "manifest-test-ch";
    const outputPath = path.join(root, "quiz-video.mp4");
    await writeFile(outputPath, Buffer.from("dummy video content"));

    let writtenManifestJson: string | null = null;
    const repository = {
      writeRenderManifest: vi.fn().mockImplementation((_chId: string, _epId: string, content: string) => {
        writtenManifestJson = content;
        return Promise.resolve("channels/ch/episodes/ep/assets/render-manifest.json");
      }),
      writeVideoArtifact: vi.fn().mockResolvedValue("channels/ch/episodes/ep/assets/quiz-video.mp4"),
      saveVideoMetadata: vi.fn().mockResolvedValue({}),
    } as unknown as RepositoryService;

    const episode = EpisodeSchema.parse({
      episode_id: episodeId,
      channel_id: channelId,
      slug: episodeId,
      topic: { title: "Manifest Test", premise: "Premise", hook: "Hook" },
      stage: "VIDEO_READY",
      script_path: "script.md",
      scene_plan_path: "scenes.json",
      dialogue_script_path: "dialogue.md",
      video_prompts_path: "prompts.md",
      narration_asset_path: "narration.wav",
      narration_generated_at: "2026-08-31T00:00:00.000Z",
      narration_duration_seconds: 15,
      narration_segment_count: 1,
      measured_narration_words_per_second: 20,
      quiz_config: {
        question_count: 3,
        quiz_format: "multiple_choice",
        age_band: "7-9",
        visual_theme: "candy_arcade",
      },
      created_at: "2026-08-31T00:00:00.000Z",
      updated_at: "2026-08-31T00:00:00.000Z",
    });

    const assetResolution: QuizAssetResolution = {
      schema_version: 2,
      episode_id: episodeId,
      template_id: "candy_arcade",
      assets: [
        {
          asset_id: "ast_degraded",
          kind: "choice_illustration",
          prompt: "prompt",
          aspect_ratio: "16:9",
          style: "candy_arcade",
          palette_id: "lime",
          importance: "supporting",
          status: "ready",
          degraded: true,
          fallback_tier: 3,
          source: "fallback",
        },
      ],
    };

    const preflightAssessment = {
      schema_version: 2 as const,
      episode_id: episodeId,
      assessed_at: "2026-09-11T00:00:00.000Z",
      score: 95,
      rating: "production_ready" as const,
      categories: {
        semantic: 100,
        visual: 90,
        pacing: 95,
        audio: 100,
        variety: 90,
        render_integrity: 95,
      },
      issues: [],
    };

    const engineSnapshot = {
      generator_engine: "candy_arcade_v2" as const,
      hyperframes_version: "0.8.17",
      node_version: "v24.20.0",
      renderer_type: "hyperframes" as const,
      captured_at: "2026-09-11T00:00:00.000Z",
    };

    const transitionInstances = {
      "trans-1": {
        instanceId: "trans-1",
        transitionId: "bubble_splash",
        durationSeconds: 0.8,
        startFrame: 30,
        boundaryFrame: 42,
        availableEndFrameExclusive: 54,
        placement: "scene" as const,
        fps: { numerator: 30, denominator: 1 },
        width: 1920,
        height: 1080,
        fromColor: "#FF7A63",
        toColor: "#21C8CF",
        inkColor: "#102D5B",
        progressStyle: "linear",
      },
    };

    await persistVideoRenderArtifacts({
      repository,
      channelId,
      episodeId,
      episode,
      outputPath,
      html: `<html><audio src="./bgm/arcade_fun.mp3"></audio></html>`,
      sourceFingerprint: "fingerprint-123",
      duration: 15.25,
      renderAspectRatio: "16:9",
      renderCanvas: { width: 1920, height: 1080 },
      fps: 30,
      selectedBgmTrackId: "arcade_fun",
      selectedBgmFilename: "arcade_fun.mp3",
      assetResolution,
      preflightAssessment,
      checkStatus: "passed",
      probe: {
        probe: {
          format: { duration: "15.25" },
          streams: [
            { codec_type: "video", width: 1920, height: 1080, r_frame_rate: "30/1" },
            { codec_type: "audio", duration: "15.25" },
          ],
        },
        issues: [],
      },
      engineSnapshot,
      artifactSha256: "sha256-hash-value",
      transitionInstances,
    });

    expect(writtenManifestJson).not.toBeNull();
    interface RenderManifestOutput {
      engine: string;
      quiz_engine_version: number;
      schema_version: number;
      preflight: { status: string; score: number; blockers: number };
      degraded: boolean;
      fallback_tier: number;
      degraded_assets: string[];
      engine_snapshot: unknown;
      artifact_sha256: string;
      transition_instances: unknown[];
      aspect_ratio: string;
      resolution: { width: number; height: number };
      duration_seconds: number;
      question_count: number;
      format: string;
    }
    const manifest = JSON.parse(writtenManifestJson!) as RenderManifestOutput;

    // V2-only fields
    expect(manifest.engine).toBe("hyperframes");
    expect(manifest.quiz_engine_version).toBe(2);
    expect(manifest.schema_version).toBe(2);

    // Preflight must NOT be legacy_skipped
    expect(manifest.preflight).toEqual({
      status: "passed",
      score: 95,
      blockers: 0,
    });
    expect(manifest.preflight.status).not.toBe("legacy_skipped");

    // Degraded asset metadata preserved
    expect(manifest.degraded).toBe(true);
    expect(manifest.fallback_tier).toBe(3);
    expect(manifest.degraded_assets).toEqual(["ast_degraded"]);

    // Engine snapshot, hash, transitions preserved
    expect(manifest.engine_snapshot).toEqual(engineSnapshot);
    expect(manifest.artifact_sha256).toBe("sha256-hash-value");
    expect(manifest.transition_instances).toEqual(transitionInstances);

    // Canvas, duration, format preserved
    expect(manifest.aspect_ratio).toBe("16:9");
    expect(manifest.resolution).toEqual({ width: 1920, height: 1080 });
    expect(manifest.duration_seconds).toBe(15.25);
    expect(manifest.question_count).toBe(3);
    expect(manifest.format).toBe("multiple_choice");
  });
});
