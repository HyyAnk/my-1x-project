import { describe, expect, it } from "vitest";
import {
  ThumbnailAspectRatioSchema,
  ThumbnailGenerationRequestSchema,
  ThumbnailLayoutTypeSchema,
  ThumbnailManifestSchema,
  THUMBNAIL_DIMENSION_SPECS,
  THUMBNAIL_LAYOUT_CATALOG,
  type ThumbnailLayoutType,
} from "@studio/shared";

describe("Thumbnail Shared Schemas & Contracts (Step 1)", () => {
  it("validates all 6 ThumbnailLayoutTypes", () => {
    const validLayouts: ThumbnailLayoutType[] = [
      "mega_grid",
      "split_vs",
      "mystery_silhouette",
      "odd_one_out",
      "difficulty_tier",
      "true_false",
    ];

    for (const layout of validLayouts) {
      expect(ThumbnailLayoutTypeSchema.parse(layout)).toBe(layout);
      expect(THUMBNAIL_LAYOUT_CATALOG[layout]).toBeDefined();
      expect(THUMBNAIL_LAYOUT_CATALOG[layout].id).toBe(layout);
      expect(THUMBNAIL_LAYOUT_CATALOG[layout].mascotPersona).toBeDefined();
    }
  });

  it("validates Aspect Ratios (16:9 and 9:16) with safe zones", () => {
    expect(ThumbnailAspectRatioSchema.parse("16:9")).toBe("16:9");
    expect(ThumbnailAspectRatioSchema.parse("9:16")).toBe("9:16");

    const spec169 = THUMBNAIL_DIMENSION_SPECS["16:9"];
    expect(spec169.width).toBe(1280);
    expect(spec169.height).toBe(720);
    expect(spec169.safeZone.bottomRatio).toBeGreaterThan(0.1); // Avoids YouTube time badge

    const spec916 = THUMBNAIL_DIMENSION_SPECS["9:16"];
    expect(spec916.width).toBe(1080);
    expect(spec916.height).toBe(1920);
    expect(spec916.safeZone.bottomRatio).toBeGreaterThan(0.2); // Avoids Shorts UI
  });

  it("validates ThumbnailGenerationRequest schema defaults", () => {
    const request = ThumbnailGenerationRequestSchema.parse({
      episode_id: "ep_12345",
    });
    expect(request.episode_id).toBe("ep_12345");
    expect(request.aspect_ratio).toBe("auto");
  });


  it("validates ThumbnailManifest schema", () => {
    const manifest = ThumbnailManifestSchema.parse({
      episode_id: "ep_12345",
      channel_id: "ch_999",
      layout: "split_vs",
      hook_text: "WHICH WOULD YOU CHOOSE?",
      mascot_persona: "Referee / Confused Judge",
      asset_path_16_9: "/assets/thumb_16_9.jpg",
      asset_path_9_16: "/assets/thumb_9_16.jpg",
      prompt_16_9: "Prompt 16:9...",
      prompt_9_16: "Prompt 9:16...",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    expect(manifest.layout).toBe("split_vs");
    expect(manifest.asset_path_16_9).toBe("/assets/thumb_16_9.jpg");
  });
});
