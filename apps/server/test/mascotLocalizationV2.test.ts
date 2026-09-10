import { mkdtemp, rm, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Channel, ChannelMascotConfig, MascotProfile } from "@studio/shared";
import { RepositoryService } from "../src/repository/service.js";
import { source } from "../src/quiz/render/candyArcade/candyArcadeAudio.js";
import { prepareLocalizedMascot } from "../src/tasks/video/mascotLocalization.js";
import { renderProductionMascotHtmlLayer } from "../src/quiz/render/productionMascotRenderer.js";

const TINY_PNG = new Uint8Array([
  137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 0, 1, 0, 0, 0, 1, 8, 6, 0, 0, 0, 31, 21, 196, 137, 0, 0, 0, 10, 73,
  68, 65, 84, 120, 156, 99, 0, 1, 0, 0, 5, 0, 1, 13, 10, 45, 180, 0, 0, 0, 0, 73, 69, 78, 68, 174, 66, 96, 130,
]);

describe("source() URL Resolution & Safe Guards", () => {
  it("preserves relative and already localized paths", () => {
    expect(source("./mascot-assets/hero.png")).toBe("./mascot-assets/hero.png");
    expect(source("../assets/sound.wav")).toBe("../assets/sound.wav");
    expect(source("/mascot-assets/hero.png")).toBe("./mascot-assets/hero.png");
  });

  it("rewrites /api/mascots/... assets to ./mascot-assets/ and guards /api/ paths", () => {
    expect(source("/api/mascots/m1/assets/thinking_1.png")).toBe("./mascot-assets/thinking_1.png");
    expect(source("/api/mascots/char-42/assets/celebrate_slot2.png")).toBe("./mascot-assets/celebrate_slot2.png");
    expect(source("/api/v1/system/status")).toBe("/api/v1/system/status");
    expect(source("/api/v1/system/status")).not.toContain("file:///");
  });

  it("handles protocol URLs and empty values safely", () => {
    expect(source("")).toBe("");
    expect(source("https://example.com/asset.png")).toBe("https://example.com/asset.png");
    expect(source("data:image/png;base64,abc")).toBe("data:image/png;base64,abc");
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
            thinking: [
              { id: "think_slot1", slot_index: 1, image_url: `/api/mascots/${mascot.id}/assets/think_1.png` },
            ],
            celebrate: [
              { id: "celeb_slot1", slot_index: 1, image_url: `/api/mascots/${mascot.id}/assets/celeb_1.png` },
            ],
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
    expect(localized?.styles?.[0]?.anchor_image_url).toBe("./mascot-assets/anchor.png");
    expect(localized?.styles?.[0]?.states.thinking[0]?.image_url).toBe("./mascot-assets/think_1.png");
    expect(localized?.styles?.[0]?.states.celebrate[0]?.image_url).toBe("./mascot-assets/celeb_1.png");

    const thinkStat = await stat(path.join(renderRoot, "mascot-assets", "think_1.png"));
    expect(thinkStat.isFile()).toBe(true);

    const celebStat = await stat(path.join(renderRoot, "mascot-assets", "celeb_1.png"));
    expect(celebStat.isFile()).toBe(true);
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
