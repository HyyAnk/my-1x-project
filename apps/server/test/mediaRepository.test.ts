import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { RepositoryService } from "../src/repository.js";
import { RepositoryError } from "../src/repository/errors.js";
import * as mediaFacade from "../src/repository/media.js";
import * as audioMedia from "../src/repository/media/audioMedia.js";
import * as videoMedia from "../src/repository/media/videoMedia.js";

const roots: string[] = [];

async function fixture(): Promise<{ repository: RepositoryService; channelId: string; episodeId: string }> {
  const root = await mkdtemp(path.join(os.tmpdir(), "media-repository-"));
  roots.push(root);
  await mkdir(path.join(root, "templates"), { recursive: true });
  await writeFile(path.join(root, "templates", "example_channel_dna.md"), "# Channel DNA\n", "utf8");
  await writeFile(path.join(root, "templates", "quiz_channel_dna.md"), "# Quiz Channel DNA\n", "utf8");
  await writeFile(path.join(root, "templates", "example_style_guide.md"), "# Style Guide\n", "utf8");
  const repository = new RepositoryService(root);
  const channel = await repository.createChannel({
    name: "Media Test Channel",
    description: "Testing media operations",
    target_audience: "All",
    language: "English",
    market: "Global",
    dna_mode: "example",
  });
  const topics = [
    {
      topic_id: "topic-1",
      channel_id: channel.channel_id,
      content_kind: "episode" as const,
      title: "Media Test Topic",
      premise: "Testing media repository operations",
      why_it_fits: "Fits tests",
      hook: "Test hook",
      estimated_potential: "High",
      generated_at: new Date().toISOString(),
      selected: false,
    },
  ];
  await repository.saveTopicRun(channel.channel_id, topics);
  const episode = await repository.confirmTopic(channel.channel_id, topics[0].topic_id);
  return { repository, channelId: channel.channel_id, episodeId: episode.episode_id };
}

afterEach(async () => {
  await Promise.all(
    roots.splice(0).map(async (root) => {
      try {
        await rm(root, { recursive: true, force: true });
      } catch {
        // Ignore cleanup failures
      }
    }),
  );
});

describe("Media Repository Operations", () => {
  it("verifies the media facade re-exports all expected functions", () => {
    const expectedFunctions = [
      "saveSceneAudio",
      "getSceneAudioFile",
      "writeSceneAudio",
      "writeNarrationAudio",
      "writeQuizVoiceSegmentAudio",
      "writeQuizNarrationAudio",
      "getQuizVoiceSegmentAudioFile",
      "getEpisodeAudioFile",
      "saveNarrationMetadata",
      "writeVideoArtifact",
      "getEpisodeVideoFile",
      "writeRenderManifest",
      "saveVideoMetadata",
    ];

    for (const fnName of expectedFunctions) {
      expect(typeof (mediaFacade as Record<string, unknown>)[fnName]).toBe("function");
    }

    expect(mediaFacade.saveSceneAudio).toBe(audioMedia.saveSceneAudio);
    expect(mediaFacade.writeVideoArtifact).toBe(videoMedia.writeVideoArtifact);
  });

  describe("Audio Operations", () => {
    it("writes, gets, and saves scene audio", async () => {
      const { repository, channelId, episodeId } = await fixture();

      await repository.saveScenes(channelId, episodeId, [
        {
          scene_id: "scene-1",
          episode_id: episodeId,
          scene_number: 1,
          duration_seconds: 5,
          dialogue: "Welcome to the show",
          visual_prompt: "Opening shot",
        },
      ]);

      const audioBuffer = new Uint8Array([0, 1, 2, 3, 4]);
      const relativePath = await repository.writeSceneAudio(channelId, episodeId, 1, audioBuffer);
      expect(relativePath).toContain("scene-01.wav");

      const fileInfo = await repository.getSceneAudioFile(channelId, episodeId, "scene-01.wav");
      expect(fileInfo.size).toBe(5);
      expect(fileInfo.path).toBe(relativePath);

      await repository.saveSceneAudio(channelId, episodeId, 1, relativePath, 5.2);
      const updatedScenes = await repository.readScenes(channelId, episodeId);
      expect(updatedScenes[0].audio_asset_path).toBe(relativePath);
      expect(updatedScenes[0].audio_duration_seconds).toBe(5.2);

      // Validate scene audio filename format check
      await expect(repository.getSceneAudioFile(channelId, episodeId, "invalid-name.mp3")).rejects.toThrow(RepositoryError);

      // Non-existent scene audio throws AUDIO_NOT_FOUND
      await expect(repository.getSceneAudioFile(channelId, episodeId, "scene-99.wav")).rejects.toThrow(RepositoryError);
    });

    it("writes narration audio and updates narration metadata", async () => {
      const { repository, channelId, episodeId } = await fixture();

      const audioBuffer = new Uint8Array([10, 20, 30]);
      const narrationPath = await repository.writeNarrationAudio(channelId, episodeId, audioBuffer);
      expect(narrationPath).toContain("narration.wav");

      const segmentedPath = await repository.writeNarrationAudio(channelId, episodeId, audioBuffer, 2);
      expect(segmentedPath).toContain("narration-02.wav");

      const updatedEpisode = await repository.saveNarrationMetadata(channelId, episodeId, narrationPath, 60, 5, 150);
      expect(updatedEpisode.narration_asset_path).toBe(narrationPath);
      expect(updatedEpisode.narration_duration_seconds).toBe(60);
      expect(updatedEpisode.narration_segment_count).toBe(5);
      expect(updatedEpisode.stage).toBe("NARRATION_READY");

      // Verify common audio lookup getEpisodeAudioFile
      const audioFile = await repository.getEpisodeAudioFile(channelId, episodeId, "narration.wav");
      expect(audioFile.size).toBe(3);
    });

    it("handles quiz voice segments and narration audio", async () => {
      const { repository, channelId, episodeId } = await fixture();

      const segmentData = new Uint8Array([1, 2, 3, 4]);
      const segmentPath = await repository.writeQuizVoiceSegmentAudio(channelId, episodeId, 1, segmentData, "v1");
      expect(segmentPath).toContain("quiz-voice/segment-001-v1.wav");

      const fileInfo = await repository.getQuizVoiceSegmentAudioFile(channelId, episodeId, 1, "v1");
      expect(fileInfo.size).toBe(4);
      expect(fileInfo.path).toBe(segmentPath);

      // Invalid segment numbers
      await expect(repository.writeQuizVoiceSegmentAudio(channelId, episodeId, 0, segmentData)).rejects.toThrow(RepositoryError);
      await expect(repository.getQuizVoiceSegmentAudioFile(channelId, episodeId, 1000)).rejects.toThrow(RepositoryError);

      // Invalid version string
      await expect(repository.writeQuizVoiceSegmentAudio(channelId, episodeId, 1, segmentData, "INVALID_VERSION!")).rejects.toThrow(
        RepositoryError,
      );

      // Quiz narration audio
      const narrationBuffer = new Uint8Array([5, 6, 7]);
      const quizNarrationPath = await repository.writeQuizNarrationAudio(channelId, episodeId, narrationBuffer);
      expect(quizNarrationPath).toContain("quiz-narration-");
    });
  });

  describe("Video Operations", () => {
    it("writes video artifacts, render manifests, and saves video metadata", async () => {
      const { repository, channelId, episodeId } = await fixture();

      const videoData = new Uint8Array([100, 101, 102]);
      const videoPath = await repository.writeVideoArtifact(channelId, episodeId, videoData, "output.mp4");
      expect(videoPath).toContain("output.mp4");

      const videoFileInfo = await repository.getEpisodeVideoFile(channelId, episodeId, "output.mp4");
      expect(videoFileInfo.size).toBe(3);

      // Render manifest
      const manifestPath = await repository.writeRenderManifest(channelId, episodeId, JSON.stringify({ fps: 30 }));
      expect(manifestPath).toContain("render-manifest.json");

      // Save video metadata
      const updatedEpisode = await repository.saveVideoMetadata(channelId, episodeId, videoPath, 120, manifestPath);
      expect(updatedEpisode.stage).toBe("VIDEO_READY");
      expect(updatedEpisode.video_asset_path).toBe(videoPath);
      expect(updatedEpisode.video_duration_seconds).toBe(120);
      expect(updatedEpisode.render_manifest_path).toBe(manifestPath);

      // Invalid video filename
      await expect(repository.writeVideoArtifact(channelId, episodeId, videoData, "invalid-file.avi")).rejects.toThrow(RepositoryError);
      await expect(repository.getEpisodeVideoFile(channelId, episodeId, "invalid-file.avi")).rejects.toThrow(RepositoryError);

      // Non-existent video file
      await expect(repository.getEpisodeVideoFile(channelId, episodeId, "missing.mp4")).rejects.toThrow(RepositoryError);
    });
  });
});
