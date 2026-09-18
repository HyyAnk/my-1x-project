import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { RepositoryService } from "../src/repository.js";
import {
  readScenes,
  saveScenes,
  listBundleImages,
  getBundleImagePath,
  getBundleImageFile,
  writeBundleImage,
  saveBundleImage,
  writeBundleImageFromFile,
  clearBundleImages,
  deleteBundleImage,
} from "../src/repository/scenes.js";
import {
  listBundleImages as directListBundleImages,
  getBundleImagePath as directGetBundleImagePath,
  getBundleImageFile as directGetBundleImageFile,
  writeBundleImage as directWriteBundleImage,
  saveBundleImage as directSaveBundleImage,
  writeBundleImageFromFile as directWriteBundleImageFromFile,
  clearBundleImages as directClearBundleImages,
  deleteBundleImage as directDeleteBundleImage,
} from "../src/repository/bundleImages.js";
import { sceneBindings } from "../src/repository/bindings/sceneBindings.js";
import type { Scene } from "@studio/shared";

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

async function setupTestRepository() {
  const root = await mkdtemp(path.join(os.tmpdir(), "scenes-test-"));
  roots.push(root);
  await mkdir(path.join(root, "templates"), { recursive: true });
  await writeFile(path.join(root, "templates", "example_channel_dna.md"), "# DNA\n", "utf8");
  await writeFile(path.join(root, "templates", "example_style_guide.md"), "# Style\n", "utf8");
  const repository = new RepositoryService(root);
  const channel = await repository.createChannel({
    name: "Scenes Test Channel",
    description: "Testing scenes and bundle images",
    target_audience: "Audience",
    language: "English",
    market: "US",
    dna_mode: "example",
  });
  const topics = Array.from({ length: 1 }, (_, index) => ({
    topic_id: `scene_topic_${index}`,
    channel_id: channel.channel_id,
    content_kind: "episode" as const,
    title: `Scene Topic ${index}`,
    premise: "Premise",
    why_it_fits: "Fits",
    hook: "Hook",
    estimated_potential: "High",
    generated_at: new Date().toISOString(),
    selected: false,
  }));
  await repository.saveTopicRun(channel.channel_id, topics);
  const episode = await repository.confirmTopic(channel.channel_id, topics[0].topic_id);
  return { repository, channel, episode, root };
}

function makeScene(episodeId: string, sceneNumber: number, dialogue: string): Scene {
  return {
    scene_id: `${episodeId}_scene_${sceneNumber}`,
    episode_id: episodeId,
    scene_number: sceneNumber,
    duration_seconds: 5,
    dialogue,
    visual_prompt: `Prompt for scene ${sceneNumber}`,
    sequence_id: "seq-1",
    sequence_title: "Sequence 1",
    continuity_bundle_id: "CB-01",
    transition_note: "",
    continuity_note: "",
    audio_asset_path: "audio/path.wav",
    audio_generated_at: "2026-09-17T00:00:00Z",
    audio_duration_seconds: 5,
    reference_asset_ids: [],
  };
}

describe("Scenes Repository & Bundle Images Modularization", () => {
  it("exports bundle image operations and aliases from both scenes.ts and bundleImages.ts", () => {
    expect(listBundleImages).toBe(directListBundleImages);
    expect(getBundleImagePath).toBe(directGetBundleImagePath);
    expect(getBundleImageFile).toBe(directGetBundleImageFile);
    expect(writeBundleImage).toBe(directWriteBundleImage);
    expect(saveBundleImage).toBe(directSaveBundleImage);
    expect(writeBundleImageFromFile).toBe(directWriteBundleImageFromFile);
    expect(clearBundleImages).toBe(directClearBundleImages);
    expect(deleteBundleImage).toBe(directDeleteBundleImage);
    expect(saveBundleImage).toBe(writeBundleImage);
    expect(deleteBundleImage).toBe(clearBundleImages);
  });

  it("verifies sceneBindings includes both scene operations and bundle image operations", () => {
    expect(sceneBindings.readScenes).toBe(readScenes);
    expect(sceneBindings.saveScenes).toBe(saveScenes);
    expect(sceneBindings.listBundleImages).toBe(directListBundleImages);
    expect(sceneBindings.writeBundleImage).toBe(directWriteBundleImage);
    expect(sceneBindings.saveBundleImage).toBe(directSaveBundleImage);
    expect(sceneBindings.clearBundleImages).toBe(directClearBundleImages);
    expect(sceneBindings.deleteBundleImage).toBe(directDeleteBundleImage);
  });

  it("handles bundle image write, get, list, and deletion through repository service", async () => {
    const { repository, channel, episode } = await setupTestRepository();
    const validPng = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

    // Save bundle image using writeBundleImage
    const assetPath = await repository.writeBundleImage(channel.channel_id, episode.episode_id, 1, validPng, 0, {
      model: "imagen-3",
      aspect_ratio: "16:9",
    });
    expect(assetPath).toContain("CB-01.png");

    // Retrieve bundle image path
    const pathInfo = await repository.getBundleImagePath(channel.channel_id, episode.episode_id, 1, 0);
    expect(pathInfo.bundle_id).toBe("CB-01");
    expect(pathInfo.filename).toBe("CB-01.png");

    // Retrieve bundle image file info
    const fileInfo = await repository.getBundleImageFile(channel.channel_id, episode.episode_id, "CB-01.png");
    expect(fileInfo.bundle_id).toBe("CB-01");
    expect(fileInfo.model).toBe("imagen-3");

    // List bundle images
    const images = await repository.listBundleImages(channel.channel_id, episode.episode_id);
    expect(images).toHaveLength(1);
    expect(images[0].bundle_id).toBe("CB-01");

    // Clear bundle images
    await repository.clearBundleImages(channel.channel_id, episode.episode_id, 1);
    const imagesAfterClear = await repository.listBundleImages(channel.channel_id, episode.episode_id);
    expect(imagesAfterClear).toHaveLength(0);
  });

  it("clears scene audio when dialogue changes on saveScenes", async () => {
    const { repository, channel, episode } = await setupTestRepository();
    const initialScenes = [makeScene(episode.episode_id, 1, "Initial dialogue")];
    await repository.saveScenes(channel.channel_id, episode.episode_id, initialScenes);

    const saved = await repository.readScenes(channel.channel_id, episode.episode_id);
    expect(saved[0].dialogue).toBe("Initial dialogue");
    expect(saved[0].audio_asset_path).toBe("audio/path.wav");

    // Update dialogue, should clear audio fields
    const updatedScenes = [makeScene(episode.episode_id, 1, "Modified dialogue")];
    await repository.saveScenes(channel.channel_id, episode.episode_id, updatedScenes);

    const afterUpdate = await repository.readScenes(channel.channel_id, episode.episode_id);
    expect(afterUpdate[0].dialogue).toBe("Modified dialogue");
    expect(afterUpdate[0].audio_asset_path).toBeNull();
    expect(afterUpdate[0].audio_generated_at).toBeNull();
    expect(afterUpdate[0].audio_duration_seconds).toBeNull();
  });
});
