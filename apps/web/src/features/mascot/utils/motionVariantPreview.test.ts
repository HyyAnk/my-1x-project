import { describe, expect, it } from "vitest";
import type { MascotProfile, MascotStyle } from "@studio/shared";
import {
  applyVariantPreviewOverrides,
  collectFilledVariants,
  getActionVariants,
  isVariantAction,
  resolveSelectedVariant,
} from "./motionVariantPreview";

const style: MascotStyle = {
  id: "style_hero",
  name: "Hero",
  keyword: "hero",
  is_default: true,
  states: {
    thinking: [
      { id: "t1", slot_index: 1, image_url: "https://example.com/t1.png", motion_preset: "sway" },
      { id: "t2", slot_index: 2, image_url: "", motion_preset: "pulse" },
      { id: "t3", slot_index: 3, image_url: "https://example.com/t3.png" },
    ],
    celebrate: [{ id: "c1", slot_index: 1, image_url: "https://example.com/c1.png", motion_preset: "jump" }],
  },
  created_at: "2026-09-05T00:00:00.000Z",
  updated_at: "2026-09-05T00:00:00.000Z",
};

const profile: MascotProfile = {
  id: "mascot_1",
  name: "Milo",
  description: "",
  visual_style: "pixar_3d",
  master_prompt: "",
  master_image_url: null,
  color_theme: "#06b6d4",
  actions: {
    thinking: {
      action: "thinking",
      sprite_url: "https://example.com/legacy_think.png",
      frames_count: 1,
      fps: 8,
      loop: true,
      frame_width: 512,
      frame_height: 512,
      offset_x: 0,
      offset_y: 0,
    },
  },
  assigned_channel_ids: [],
  created_at: "2026-09-05T00:00:00.000Z",
  updated_at: "2026-09-05T00:00:00.000Z",
};

describe("isVariantAction", () => {
  it("accepts only thinking and celebrate", () => {
    expect(isVariantAction("thinking")).toBe(true);
    expect(isVariantAction("celebrate")).toBe(true);
    expect(isVariantAction("idle")).toBe(false);
    expect(isVariantAction("outro")).toBe(false);
  });
});

describe("collectFilledVariants", () => {
  it("keeps only variants with an image url", () => {
    const filled = collectFilledVariants(style, "thinking");
    expect(filled.map((v) => v.id)).toEqual(["t1", "t3"]);
  });

  it("returns empty list without a style", () => {
    expect(collectFilledVariants(null, "celebrate")).toEqual([]);
  });
});

describe("getActionVariants", () => {
  it("returns empty list for non-variant actions", () => {
    expect(getActionVariants(style, "wave")).toEqual([]);
  });
});

describe("resolveSelectedVariant", () => {
  it("clamps the index into the filled range", () => {
    const filled = collectFilledVariants(style, "thinking");
    expect(resolveSelectedVariant(filled, 99)?.id).toBe("t3");
    expect(resolveSelectedVariant(filled, -5)?.id).toBe("t1");
    expect(resolveSelectedVariant([], 0)).toBeNull();
  });
});

describe("applyVariantPreviewOverrides", () => {
  it("overrides the previewed action with the selected variant", () => {
    const result = applyVariantPreviewOverrides(profile, style, "thinking", 0);
    expect(result.actions.thinking?.sprite_url).toBe("https://example.com/t1.png");
    expect(result.actions.thinking?.motion_preset).toBe("sway");
  });

  it("clamps out-of-range indexes to the last filled variant", () => {
    const result = applyVariantPreviewOverrides(profile, style, "thinking", 99);
    expect(result.actions.thinking?.sprite_url).toBe("https://example.com/t3.png");
    expect(result.actions.thinking?.motion_preset).toBe("breathe");
  });

  it("falls back the non-previewed variant action to its first filled variant", () => {
    const result = applyVariantPreviewOverrides(profile, style, "thinking", 0);
    expect(result.actions.celebrate?.sprite_url).toBe("https://example.com/c1.png");
  });

  it("keeps existing action motion fields over variant motion fields", () => {
    const withMotion: MascotProfile = {
      ...profile,
      actions: {
        ...profile.actions,
        thinking: { ...profile.actions.thinking!, motion_preset: "pulse" },
      },
    };
    const result = applyVariantPreviewOverrides(withMotion, style, "thinking", 0);
    expect(result.actions.thinking?.motion_preset).toBe("pulse");
  });

  it("returns the profile untouched when there is no style", () => {
    expect(applyVariantPreviewOverrides(profile, null, "thinking", 0)).toBe(profile);
  });

  it("leaves the original profile object unchanged", () => {
    applyVariantPreviewOverrides(profile, style, "celebrate", 0);
    expect(profile.actions.celebrate).toBeUndefined();
    expect(profile.actions.thinking?.sprite_url).toBe("https://example.com/legacy_think.png");
  });
});
