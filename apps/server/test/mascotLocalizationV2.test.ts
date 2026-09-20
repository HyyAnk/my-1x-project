import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { adaptMascotV1ToV2, type Channel, type ChannelMascotConfig, type MascotProfile } from "@studio/shared";
import { RepositoryService } from "../src/repository/service.js";
import { source } from "../src/quiz/render/candyArcade/candyArcadeAudio.js";
import { prepareLocalizedMascot } from "../src/tasks/video/mascotLocalization.js";
import { renderProductionMascotHtmlLayer } from "../src/quiz/render/productionMascotRenderer.js";
import { createAnimationStorageAdapter } from "../src/quiz/mascot/videoAnimation/adapters/animationStorageAdapter.js";

const TINY_PNG = new Uint8Array([
  137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 0, 1, 0, 0, 0, 1, 8, 6, 0, 0, 0, 31, 21, 196, 137, 0, 0, 0, 10, 73,
  68, 65, 84, 120, 156, 99, 0, 1, 0, 0, 5, 0, 1, 13, 10, 45, 180, 0, 0, 0, 0, 73, 69, 78, 68, 174, 66, 96, 130,
]);

const MOCK_REGISTRATION = {
  source_width: 512,
  source_height: 512,
  content_bounds: { x: 0, y: 0, width: 512, height: 512 },
  pivot: { x: 256, y: 512 },
  offset_x: 0,
  offset_y: 0,
};

describe("source() URL Resolution & Safe Guards", () => {
  it("preserves relative and already localized paths", () => {
    expect(source("./mascot-assets/hero.png")).toBe("./mascot-assets/hero.png");
    expect(source("../assets/sound.wav")).toBe("../assets/sound.wav");
    expect(source("/mascot-assets/hero.png")).toBe("./mascot-assets/hero.png");
    expect(source("mascot-assets/hero.png")).toBe("./mascot-assets/hero.png");
  });

  it("rewrites /api/mascots/... assets to ./mascot-assets/ and guards /api/ paths", () => {
    expect(source("/api/mascots/m1/assets/thinking_1.png")).toBe("./mascot-assets/thinking_1.png");
    expect(source("/api/mascots/char-42/assets/celebrate_slot2.png")).toBe("./mascot-assets/celebrate_slot2.png");
    expect(source("/api/v1/system/status")).toBe("/api/v1/system/status");
    expect(source("/api/v1/system/status")).not.toContain("file:///");
    expect(source("/api/mascots/unknown/action")).toBe("/api/mascots/unknown/action");
    expect(source("/api/mascots/unknown/action")).not.toContain("file:///");
  });

  it("rewrites animation artifact URLs to collision-safe ./mascot-assets/ paths", () => {
    // API animation artifact URLs
    expect(source("/api/mascots/m1/styles/cyber/animations/thinking/1/artifacts/video_transparent.webm")).toBe(
      "./mascot-assets/m1_cyber_thinking_s1_video_transparent.webm",
    );
    expect(source("/api/mascots/m1/styles/cyber/animations/celebrate/2/artifacts/atlas.png")).toBe(
      "./mascot-assets/m1_cyber_celebrate_s2_atlas.png",
    );
    expect(source("/api/mascots/owl/styles/default/animations/thinking/3/artifacts/manifest.json")).toBe(
      "./mascot-assets/owl_default_thinking_s3_manifest.json",
    );

    // Static animation artifact URLs
    expect(source("/mascot/assets/animations/m1/cyber/thinking/1/video_transparent.webm")).toBe(
      "./mascot-assets/m1_cyber_thinking_s1_video_transparent.webm",
    );
    expect(source("/mascot/assets/animations/char-2/neon/celebrate/2/atlas.png")).toBe(
      "./mascot-assets/char-2_neon_celebrate_s2_atlas.png",
    );

    // Full HTTP/HTTPS animation artifact URLs
    expect(source("http://localhost:3000/api/mascots/m1/styles/cyber/animations/thinking/1/artifacts/video_transparent.webm")).toBe(
      "./mascot-assets/m1_cyber_thinking_s1_video_transparent.webm",
    );
    expect(source("https://studio.local/mascot/assets/animations/m1/cyber/thinking/1/atlas.png")).toBe(
      "./mascot-assets/m1_cyber_thinking_s1_atlas.png",
    );
  });

  it("handles protocol URLs and empty values safely", () => {
    expect(source("")).toBe("");
    expect(source("https://example.com/asset.png")).toBe("https://example.com/asset.png");
    expect(source("data:image/png;base64,abc")).toBe("data:image/png;base64,abc");
  });

  it("never lets raw /api/mascots/... or /mascot/ paths escape to pathToFileURL", () => {
    expect(source("/api/mascots/char-1/custom")).not.toContain("file:///");
    expect(source("api/mascots/char-1/custom")).not.toContain("file:///");
    expect(source("/mascot/assets/animations/broken")).not.toContain("file:///");
  });
});

describe("prepareLocalizedMascot V2 Multi-Slot Localization", () => {
  let tempDir: string;
  let repository: RepositoryService;

  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(os.tmpdir(), "mascot-loc-v2-test-"));
    repository = new RepositoryService(tempDir);
    await repository.ensureBootstrap();
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true }).catch(() => {});
  });

  it("deeply localizes master image, actions, styles, and state variants to ./mascot-assets/", async () => {
    const mascot = await repository.saveMascot({ name: "Multi Slot Mascot" });
    await repository.saveMascotAsset(mascot.id, "master.png", TINY_PNG);
    await repository.saveMascotAsset(mascot.id, "idle.png", TINY_PNG);
    await repository.saveMascotAsset(mascot.id, "anchor.png", TINY_PNG);
    await repository.saveMascotAsset(mascot.id, "think_1.png", TINY_PNG);
    await repository.saveMascotAsset(mascot.id, "celeb_1.png", TINY_PNG);

    const fullMascot: Partial<MascotProfile> & { name: string } = {
      ...mascot,
      master_image_url: `/api/mascots/${mascot.id}/assets/master.png`,
      actions: {
        idle: {
          action: "idle",
          sprite_url: `/api/mascots/${mascot.id}/assets/idle.png`,
          preview_url: `/api/mascots/${mascot.id}/assets/idle.png`,
        },
      },
      styles: [
        {
          id: "cyber",
          name: "Cyber",
          keyword: "cyberpunk",
          anchor_image_url: `/api/mascots/${mascot.id}/assets/anchor.png`,
          is_default: true,
          states: {
            thinking: [{ id: "think_slot1", slot_index: 1, image_url: `/api/mascots/${mascot.id}/assets/think_1.png` }],
            celebrate: [{ id: "celeb_slot1", slot_index: 1, image_url: `/api/mascots/${mascot.id}/assets/celeb_1.png` }],
          },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ],
    };
    await repository.saveMascot(fullMascot);

    const channel: Channel = {
      channel_id: "ch_v2",
      channel_name: "Channel V2",
      slug: "channel-v2",
      language: "en",
      visual_theme: "minimal",
      target_duration_seconds: 60,
      mascot_id: mascot.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const renderRoot = path.join(tempDir, "render_test");
    const localized = await prepareLocalizedMascot(channel, repository, renderRoot);

    expect(localized).not.toBeNull();
    expect(localized?.master_image_url).toBe("./mascot-assets/master.png");
    expect(localized?.actions.idle?.sprite_url).toBe("./mascot-assets/idle.png");
    const cyberStyle = localized?.styles?.find((style) => style.id === "cyber");
    expect(cyberStyle?.anchor_image_url).toBe("./mascot-assets/anchor.png");
    expect(cyberStyle?.states.thinking[0]?.image_url).toBe("./mascot-assets/think_1.png");
    expect(cyberStyle?.states.celebrate[0]?.image_url).toBe("./mascot-assets/celeb_1.png");

    const thinkStat = await stat(path.join(renderRoot, "mascot-assets", "think_1.png"));
    expect(thinkStat.isFile()).toBe(true);

    const celebStat = await stat(path.join(renderRoot, "mascot-assets", "celeb_1.png"));
    expect(celebStat.isFile()).toBe(true);
  });

  it("copies animation WebM, atlas, and manifest files to mascot-assets/ and rewrites variant.animation URLs", async () => {
    const mascot = await repository.saveMascot({ name: "Animated Mascot" });
    const storageAdapter = createAnimationStorageAdapter(repository.storageRoot);
    const slotDir = storageAdapter.getSlotDir(mascot.id, "cyber", "thinking", 1);
    await mkdir(slotDir, { recursive: true });

    const mockWebm = Buffer.from("RIFF....WEBM-MOCK-DATA");
    const mockAtlas = Buffer.from(TINY_PNG);
    const mockManifest = JSON.stringify({ version: 1, state: "thinking", slot_index: 1 });

    await writeFile(path.join(slotDir, "video_transparent.webm"), mockWebm);
    await writeFile(path.join(slotDir, "atlas.png"), mockAtlas);
    await writeFile(path.join(slotDir, "manifest.json"), mockManifest);

    const fullMascot: Partial<MascotProfile> & { name: string } = {
      ...mascot,
      styles: [
        {
          id: "cyber",
          name: "Cyber",
          keyword: "cyberpunk",
          is_default: true,
          states: {
            thinking: [
              {
                id: "think_slot1",
                slot_index: 1,
                image_url: `/api/mascots/${mascot.id}/assets/think_1.png`,
                animation: {
                  version: 1,
                  state: "thinking",
                  slot_index: 1,
                  frame_count: 12,
                  fps: 12,
                  duration_ms: 1000,
                  loop: true,
                  transparent_video_url: `/api/mascots/${mascot.id}/styles/cyber/animations/thinking/1/artifacts/video_transparent.webm`,
                  atlas_url: `/api/mascots/${mascot.id}/styles/cyber/animations/thinking/1/artifacts/atlas.png`,
                  manifest_url: `/api/mascots/${mascot.id}/styles/cyber/animations/thinking/1/artifacts/manifest.json`,
                  registration: MOCK_REGISTRATION,
                  content_fingerprint: "fp123",
                  source_fingerprint: "sfp123",
                },
              },
            ],
            celebrate: [],
          },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ],
    };
    await repository.saveMascot(fullMascot);

    const channel: Channel = {
      channel_id: "ch_anim",
      channel_name: "Channel Anim",
      slug: "channel-anim",
      language: "en",
      visual_theme: "minimal",
      target_duration_seconds: 60,
      mascot_id: mascot.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const renderRoot = path.join(tempDir, "render_anim_test");
    const localized = await prepareLocalizedMascot(channel, repository, renderRoot);

    expect(localized).not.toBeNull();
    const anim = localized?.styles?.find((style) => style.id === "cyber")?.states.thinking[0]?.animation;
    expect(anim).toBeDefined();
    expect(anim?.transparent_video_url).toBe(`./mascot-assets/${mascot.id}_cyber_thinking_s1_video_transparent.webm`);
    expect(anim?.atlas_url).toBe(`./mascot-assets/${mascot.id}_cyber_thinking_s1_atlas.png`);
    expect(anim?.manifest_url).toBe(`./mascot-assets/${mascot.id}_cyber_thinking_s1_manifest.json`);

    const webmOnDisk = await readFile(path.join(renderRoot, "mascot-assets", `${mascot.id}_cyber_thinking_s1_video_transparent.webm`));
    expect(webmOnDisk).toEqual(mockWebm);

    const atlasOnDisk = await readFile(path.join(renderRoot, "mascot-assets", `${mascot.id}_cyber_thinking_s1_atlas.png`));
    expect(atlasOnDisk).toEqual(mockAtlas);

    const manifestOnDisk = await readFile(path.join(renderRoot, "mascot-assets", `${mascot.id}_cyber_thinking_s1_manifest.json`), "utf-8");
    expect(manifestOnDisk).toBe(mockManifest);
  });

  it("resolves animation artifacts from attempts and published directories", async () => {
    const mascot = await repository.saveMascot({ name: "Attempts Mascot" });
    const storageAdapter = createAnimationStorageAdapter(repository.storageRoot);

    // Slot 1: placed in attempts/att_2
    const slot1Dir = storageAdapter.getSlotDir(mascot.id, "cyber", "celebrate", 1);
    const attempt2Dir = path.join(slot1Dir, "attempts", "att_2");
    await mkdir(attempt2Dir, { recursive: true });
    const attemptWebm = Buffer.from("attempt-2-webm");
    await writeFile(path.join(attempt2Dir, "video_transparent.webm"), attemptWebm);

    // Slot 2: placed in published_animations directory
    const publishedDir = storageAdapter.getPublishedArtifactsDir(mascot.id, "cyber", "celebrate", 2);
    await mkdir(publishedDir, { recursive: true });
    const publishedWebm = Buffer.from("published-webm");
    await writeFile(path.join(publishedDir, "video_transparent.webm"), publishedWebm);

    const fullMascot: Partial<MascotProfile> & { name: string } = {
      ...mascot,
      styles: [
        {
          id: "cyber",
          name: "Cyber",
          keyword: "cyberpunk",
          is_default: true,
          states: {
            thinking: [],
            celebrate: [
              {
                id: "celeb_slot1",
                slot_index: 1,
                image_url: "",
                animation: {
                  version: 1,
                  state: "celebrate",
                  slot_index: 1,
                  frame_count: 8,
                  fps: 8,
                  loop: true,
                  transparent_video_url: `/api/mascots/${mascot.id}/styles/cyber/animations/celebrate/1/artifacts/video_transparent.webm`,
                  manifest_url: `/api/mascots/${mascot.id}/styles/cyber/animations/celebrate/1/artifacts/manifest.json`,
                  registration: MOCK_REGISTRATION,
                  content_fingerprint: "fp1",
                  source_fingerprint: "sfp1",
                },
              },
              {
                id: "celeb_slot2",
                slot_index: 2,
                image_url: "",
                animation: {
                  version: 1,
                  state: "celebrate",
                  slot_index: 2,
                  frame_count: 8,
                  fps: 8,
                  loop: true,
                  transparent_video_url: `/mascot/assets/animations/${mascot.id}/cyber/celebrate/2/video_transparent.webm`,
                  manifest_url: `/mascot/assets/animations/${mascot.id}/cyber/celebrate/2/manifest.json`,
                  registration: MOCK_REGISTRATION,
                  content_fingerprint: "fp2",
                  source_fingerprint: "sfp2",
                },
              },
            ],
          },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ],
    };
    await repository.saveMascot(fullMascot);

    const channel: Channel = {
      channel_id: "ch_attempts",
      channel_name: "Channel Attempts",
      slug: "channel-attempts",
      language: "en",
      visual_theme: "minimal",
      target_duration_seconds: 60,
      mascot_id: mascot.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const renderRoot = path.join(tempDir, "render_attempts_test");
    const localized = await prepareLocalizedMascot(channel, repository, renderRoot);

    const cyberStyle = localized?.styles?.find((style) => style.id === "cyber");
    const celeb1 = cyberStyle?.states.celebrate[0]?.animation;
    expect(celeb1?.transparent_video_url).toBe(`./mascot-assets/${mascot.id}_cyber_celebrate_s1_video_transparent.webm`);
    const disk1 = await readFile(path.join(renderRoot, "mascot-assets", `${mascot.id}_cyber_celebrate_s1_video_transparent.webm`));
    expect(disk1).toEqual(attemptWebm);

    const celeb2 = cyberStyle?.states.celebrate[1]?.animation;
    expect(celeb2?.transparent_video_url).toBe(`./mascot-assets/${mascot.id}_cyber_celebrate_s2_video_transparent.webm`);
    const disk2 = await readFile(path.join(renderRoot, "mascot-assets", `${mascot.id}_cyber_celebrate_s2_video_transparent.webm`));
    expect(disk2).toEqual(publishedWebm);
  });

  it("localizes animation assets inside render_bundle", async () => {
    const mascot = await repository.saveMascot({ name: "Bundle Mascot" });
    const storageAdapter = createAnimationStorageAdapter(repository.storageRoot);
    const slotDir = storageAdapter.getSlotDir(mascot.id, "core", "thinking", 1);
    await mkdir(slotDir, { recursive: true });
    await writeFile(path.join(slotDir, "video_transparent.webm"), Buffer.from("bundle-webm"));

    const baseBundle = adaptMascotV1ToV2(
      {
        ...mascot,
        actions: {
          thinking: {
            action: "thinking",
            sprite_url: "/api/mascots/m/assets/think.png",
          },
        },
      },
      { enabled: true },
    )!;

    const fullMascot: Partial<MascotProfile> & { name: string } = {
      ...mascot,
      schema_version: 2,
      render_bundle: {
        ...baseBundle,
        assets: {
          ...baseBundle.assets,
          actions: {
            ...baseBundle.assets.actions,
            thinking: {
              version: 2,
              action: "thinking",
              image_url: "/mascot-assets/action.png",
              registration: MOCK_REGISTRATION,
              motion: { preset: "sway", speed: 1.0, intensity: "normal" },
              animation: {
                version: 1,
                state: "thinking",
                slot_index: 1,
                frame_count: 10,
                fps: 10,
                loop: true,
                transparent_video_url: `/api/mascots/${mascot.id}/styles/core/animations/thinking/1/artifacts/video_transparent.webm`,
                manifest_url: `/api/mascots/${mascot.id}/styles/core/animations/thinking/1/artifacts/manifest.json`,
                registration: MOCK_REGISTRATION,
                content_fingerprint: "fp-bundle",
                source_fingerprint: "sfp-bundle",
              },
            },
          },
        },
      },
    };
    await repository.saveMascot(fullMascot);

    const channel: Channel = {
      channel_id: "ch_bundle",
      channel_name: "Channel Bundle",
      slug: "channel-bundle",
      language: "en",
      visual_theme: "minimal",
      target_duration_seconds: 60,
      mascot_id: mascot.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const renderRoot = path.join(tempDir, "render_bundle_test");
    const localized = await prepareLocalizedMascot(channel, repository, renderRoot);

    const bundleAction = localized?.render_bundle?.assets.actions?.thinking;
    expect(bundleAction?.animation?.transparent_video_url).toBe(`./mascot-assets/${mascot.id}_core_thinking_s1_video_transparent.webm`);
  });

  it("handles missing animation artifacts gracefully without throwing", async () => {
    const mascot = await repository.saveMascot({ name: "Missing Artifact Mascot" });
    const missingUrl = `/api/mascots/${mascot.id}/styles/cyber/animations/thinking/1/artifacts/nonexistent.webm`;

    const fullMascot: Partial<MascotProfile> & { name: string } = {
      ...mascot,
      styles: [
        {
          id: "cyber",
          name: "Cyber",
          keyword: "cyberpunk",
          is_default: true,
          states: {
            thinking: [
              {
                id: "think_missing",
                slot_index: 1,
                image_url: "",
                animation: {
                  version: 1,
                  state: "thinking",
                  slot_index: 1,
                  frame_count: 10,
                  fps: 10,
                  loop: true,
                  transparent_video_url: missingUrl,
                  manifest_url: `/api/mascots/${mascot.id}/styles/cyber/animations/thinking/1/artifacts/manifest.json`,
                  registration: MOCK_REGISTRATION,
                  content_fingerprint: "fp-missing",
                  source_fingerprint: "sfp-missing",
                },
              },
            ],
            celebrate: [],
          },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ],
    };
    await repository.saveMascot(fullMascot);

    const channel: Channel = {
      channel_id: "ch_missing",
      channel_name: "Channel Missing",
      slug: "channel-missing",
      language: "en",
      visual_theme: "minimal",
      target_duration_seconds: 60,
      mascot_id: mascot.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const renderRoot = path.join(tempDir, "render_missing_test");
    const localized = await prepareLocalizedMascot(channel, repository, renderRoot);

    expect(localized).not.toBeNull();
    const cyberStyle = localized?.styles?.find((style) => style.id === "cyber");
    expect(cyberStyle?.states.thinking[0]?.animation?.transparent_video_url).toBe(missingUrl);
  });

  it("resolves relative animation filenames when context is available", async () => {
    const mascot = await repository.saveMascot({ name: "Relative Filename Mascot" });
    const storageAdapter = createAnimationStorageAdapter(repository.storageRoot);
    const slotDir = storageAdapter.getSlotDir(mascot.id, "cyber", "thinking", 1);
    await mkdir(slotDir, { recursive: true });
    await writeFile(path.join(slotDir, "video_transparent.webm"), Buffer.from("relative-webm"));

    const fullMascot: Partial<MascotProfile> & { name: string } = {
      ...mascot,
      styles: [
        {
          id: "cyber",
          name: "Cyber",
          keyword: "cyberpunk",
          is_default: true,
          states: {
            thinking: [
              {
                id: "think_rel",
                slot_index: 1,
                image_url: "",
                animation: {
                  version: 1,
                  state: "thinking",
                  slot_index: 1,
                  frame_count: 10,
                  fps: 10,
                  loop: true,
                  transparent_video_url: "video_transparent.webm",
                  manifest_url: `/api/mascots/${mascot.id}/styles/cyber/animations/thinking/1/artifacts/manifest.json`,
                  registration: MOCK_REGISTRATION,
                  content_fingerprint: "fp-rel",
                  source_fingerprint: "sfp-rel",
                },
              },
            ],
            celebrate: [],
          },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ],
    };
    await repository.saveMascot(fullMascot);

    const channel: Channel = {
      channel_id: "ch_rel",
      channel_name: "Channel Rel",
      slug: "channel-rel",
      language: "en",
      visual_theme: "minimal",
      target_duration_seconds: 60,
      mascot_id: mascot.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const renderRoot = path.join(tempDir, "render_rel_test");
    const localized = await prepareLocalizedMascot(channel, repository, renderRoot);

    expect(localized).not.toBeNull();
    const cyberStyle = localized?.styles?.find((style) => style.id === "cyber");
    expect(cyberStyle?.states.thinking[0]?.animation?.transparent_video_url).toBe(
      `./mascot-assets/${mascot.id}_cyber_thinking_s1_video_transparent.webm`,
    );
    const fileContent = await readFile(path.join(renderRoot, "mascot-assets", `${mascot.id}_cyber_thinking_s1_video_transparent.webm`));
    expect(fileContent.toString()).toBe("relative-webm");
  });
});

describe("renderProductionMascotHtmlLayer Integration with source()", () => {
  it("renders question phase with ./mascot-assets/ and avoids file:///D:/api/", () => {
    const mascot: MascotProfile = {
      id: "m_render",
      name: "Render Mascot",
      description: "",
      visual_style: "pixar_3d",
      master_prompt: "",
      master_image_url: "./mascot-assets/master.png",
      color_theme: "#06b6d4",
      actions: {},
      styles: [
        {
          id: "core",
          name: "Core Style",
          keyword: "",
          anchor_image_url: "./mascot-assets/anchor.png",
          is_default: true,
          states: {
            thinking: [{ id: "t1", slot_index: 1, image_url: "./mascot-assets/think_1.png" }],
            celebrate: [{ id: "c1", slot_index: 1, image_url: "./mascot-assets/celeb_1.png" }],
          },
          created_at: "2026-01-01T00:00:00Z",
          updated_at: "2026-01-01T00:00:00Z",
        },
      ],
      assigned_channel_ids: [],
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    };

    const config: ChannelMascotConfig = {
      enabled: true,
      position: "bottom_left",
      scale: 1.0,
      offset_x: 0,
      offset_y: 0,
      flip_x: false,
      show_in_intro: false,
      show_in_outro: false,
      show_in_question: true,
    };

    const html = renderProductionMascotHtmlLayer(mascot, config, {
      phase: "question",
      clipStartSeconds: 0,
      clipDurationSeconds: 10,
      aspectRatio: "16:9",
      sourceMapper: source,
    });

    expect(html).toContain("./mascot-assets/");
    expect(html).not.toMatch(/file:\/\/\/[A-Za-z]:\/api\//);
  });

  it("safeguards unlocalized /api/mascots/ URLs through sourceMapper", () => {
    const unlocalizedMascot: MascotProfile = {
      id: "m_unloc",
      name: "Unlocalized Mascot",
      description: "",
      visual_style: "pixar_3d",
      master_prompt: "",
      master_image_url: "/api/mascots/m_unloc/assets/master.png",
      color_theme: "#06b6d4",
      actions: {},
      styles: [
        {
          id: "core",
          name: "Core Style",
          keyword: "",
          anchor_image_url: "/api/mascots/m_unloc/assets/anchor.png",
          is_default: true,
          states: {
            thinking: [{ id: "t1", slot_index: 1, image_url: "/api/mascots/m_unloc/assets/think_1.png" }],
            celebrate: [{ id: "c1", slot_index: 1, image_url: "/api/mascots/m_unloc/assets/celeb_1.png" }],
          },
          created_at: "2026-01-01T00:00:00Z",
          updated_at: "2026-01-01T00:00:00Z",
        },
      ],
      assigned_channel_ids: [],
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    };

    const html = renderProductionMascotHtmlLayer(unlocalizedMascot, null, {
      phase: "question",
      clipStartSeconds: 0,
      clipDurationSeconds: 10,
      aspectRatio: "16:9",
      sourceMapper: source,
    });

    expect(html).toContain("./mascot-assets/think_1.png");
    expect(html).not.toMatch(/file:\/\/\/[A-Za-z]:\/api\//);
  });
});
