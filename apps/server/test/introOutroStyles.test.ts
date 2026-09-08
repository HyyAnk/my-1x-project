import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { buildApp, type StudioApp } from "../src/app.js";
import { probeAndValidate1080pVideo } from "../src/repository/introOutroStyles.js";
import { RepositoryError } from "../src/repository.js";

const execFileAsync = promisify(execFile);

describe("Intro/Outro Styles & 1080p Validation Gate", () => {
  let app: StudioApp;
  let tempStorage: string;
  let valid1080pVideoPath: string;
  let invalid720pVideoPath: string;
  let testChannelId: string;

  beforeAll(async () => {
    let curr = process.cwd();
    while (curr !== path.dirname(curr)) {
      if (existsSync(path.join(curr, "pnpm-workspace.yaml"))) break;
      curr = path.dirname(curr);
    }
    app = await buildApp(curr);
    tempStorage = await mkdtemp(path.join(os.tmpdir(), "intro-outro-test-"));
    await app.repository.setStorageRoot(tempStorage);

    // Create a test channel
    const channel = await app.repository.createChannel({
      name: "Test Intro Channel",
      description: "Testing intro/outro styles",
      target_audience: "Everyone",
      language: "English",
      country: "US",
      market: "US",
      dna_mode: "ai",
    });
    testChannelId = channel.channel_id;

    // Generate dummy test videos with ffmpeg
    valid1080pVideoPath = path.join(tempStorage, "valid_1080p.mp4");
    invalid720pVideoPath = path.join(tempStorage, "invalid_720p.mp4");

    await execFileAsync("ffmpeg", [
      "-y",
      "-f", "lavfi", "-i", "color=c=blue:s=1920x1080:d=1.2",
      "-f", "lavfi", "-i", "anullsrc=r=44100:cl=stereo",
      "-t", "1.2",
      "-c:v", "libx264",
      "-pix_fmt", "yuv420p",
      "-c:a", "aac",
      valid1080pVideoPath,
    ]);

    await execFileAsync("ffmpeg", [
      "-y",
      "-f", "lavfi", "-i", "color=c=red:s=1280x720:d=1.0",
      "-t", "1.0",
      "-c:v", "libx264",
      "-pix_fmt", "yuv420p",
      invalid720pVideoPath,
    ]);
  }, 40_000);

  afterAll(async () => {
    await app.close();
    await rm(tempStorage, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
  });

  describe("probeAndValidate1080pVideo", () => {
    it("accepts an exact 1920x1080 video and detects duration and audio correctly", async () => {
      const probe = await probeAndValidate1080pVideo(valid1080pVideoPath);
      expect(probe.width).toBe(1920);
      expect(probe.height).toBe(1080);
      expect(probe.has_audio).toBe(true);
      expect(probe.duration_seconds).toBeGreaterThanOrEqual(1.0);
    });

    it("rejects non-1080p video with INVALID_RESOLUTION error code", async () => {
      await expect(probeAndValidate1080pVideo(invalid720pVideoPath)).rejects.toThrowError(
        expect.objectContaining({ code: "INVALID_RESOLUTION" }),
      );
    });
  });

  describe("Intro/Outro REST Endpoints", () => {
    let createdStyleId: string;

    it("POST /api/channels/:channelId/intro-outro-styles rejects upload if video is not 1080p", async () => {
      const res = await app.server.inject({
        method: "POST",
        url: `/api/channels/${testChannelId}/intro-outro-styles`,
        payload: {
          name: "Faulty Style",
          intro_data: invalid720pVideoPath,
          outro_data: valid1080pVideoPath,
        },
      });

      expect(res.statusCode).toBe(422);
      const json = JSON.parse(res.body);
      expect(json.error).toContain("Video must be exactly 1080p (1920x1080)");
    });

    it("POST /api/channels/:channelId/intro-outro-styles creates style with 1080p clips and auto-detected duration", async () => {
      const res = await app.server.inject({
        method: "POST",
        url: `/api/channels/${testChannelId}/intro-outro-styles`,
        payload: {
          name: "Hero 3D Style",
          intro_data: valid1080pVideoPath,
          outro_data: valid1080pVideoPath,
          transition_type: "stinger_swipe",
          transition_duration_seconds: 0.5,
        },
      });

      expect(res.statusCode).toBe(201);
      const json = JSON.parse(res.body);
      expect(json.style).toBeDefined();
      expect(json.style.name).toBe("Hero 3D Style");
      expect(json.style.intro.width).toBe(1920);
      expect(json.style.intro.height).toBe(1080);
      expect(json.style.intro.has_audio).toBe(true);
      expect(json.style.intro.duration_seconds).toBeGreaterThanOrEqual(1.0);
      createdStyleId = json.style.style_id;
    });

    it("GET /api/channels/:channelId/intro-outro-styles returns created styles", async () => {
      const res = await app.server.inject({
        method: "GET",
        url: `/api/channels/${testChannelId}/intro-outro-styles`,
      });

      expect(res.statusCode).toBe(200);
      const json = JSON.parse(res.body);
      expect(Array.isArray(json.styles)).toBe(true);
      expect(json.styles.some((s: { style_id: string }) => s.style_id === createdStyleId)).toBe(true);
    });

    it("GET /api/channels/:channelId/intro-outro-styles/:styleId/clips/intro streams clip", async () => {
      const res = await app.server.inject({
        method: "GET",
        url: `/api/channels/${testChannelId}/intro-outro-styles/${createdStyleId}/clips/intro`,
      });

      expect(res.statusCode).toBe(200);
      expect(res.headers["content-type"]).toBe("video/mp4");
      expect(Number(res.headers["content-length"])).toBeGreaterThan(0);
    });

    it("PUT /api/channels/:channelId/default-intro-outro-style updates default style", async () => {
      const res = await app.server.inject({
        method: "PUT",
        url: `/api/channels/${testChannelId}/default-intro-outro-style`,
        payload: { style_id: createdStyleId },
      });

      expect(res.statusCode).toBe(200);
      const json = JSON.parse(res.body);
      expect(json.channel.default_intro_outro_style_id).toBe(createdStyleId);
    });

    it("DELETE /api/channels/:channelId/intro-outro-styles/:styleId deletes style and clears default", async () => {
      const delRes = await app.server.inject({
        method: "DELETE",
        url: `/api/channels/${testChannelId}/intro-outro-styles/${createdStyleId}`,
      });
      expect(delRes.statusCode).toBe(200);

      const channel = await app.repository.getChannel(testChannelId);
      expect(channel.default_intro_outro_style_id).toBeNull();
    });

    it("persists intro_outro_style_id via updateEpisodeSettings", async () => {
      const candidates = Array.from({ length: 5 }, (_, index) => ({
        topic_id: `top_intro_test_${index}`,
        channel_id: testChannelId,
        content_kind: "episode" as const,
        title: `Intro topic ${index}`,
        premise: "Premise",
        why_it_fits: "Fits",
        hook: "Hook",
        estimated_potential: "High",
        generated_at: new Date().toISOString(),
        selected: false,
      }));
      await app.repository.saveTopicRun(testChannelId, candidates);
      const episode = await app.repository.confirmTopic(testChannelId, "top_intro_test_0");
      const updated = await app.repository.updateEpisodeSettings(
        testChannelId,
        episode.episode_id,
        { intro_outro_style_id: "test_custom_style" },
        2.5,
      );
      expect(updated.quiz_config.intro_outro_style_id).toBe("test_custom_style");
    });
  });
});
