import { describe as nodeDescribe, it as nodeIt } from "node:test";
import assert from "node:assert/strict";
import { filterPreferredVariants, resolveStateVariantWithFallback, type MascotVariantMediaCandidate } from "../src/index.js";

type TestCallback = () => void | Promise<void>;
const describe = (name: string, suite: TestCallback): void => {
  void nodeDescribe(name, suite);
};
const it = (name: string, testCase: TestCallback): void => {
  void nodeIt(name, testCase);
};

describe("Variant Availability and Media Mode Filtering (Phase 2)", () => {
  const mixedVariants: MascotVariantMediaCandidate[] = [
    {
      id: "slot_1_static_only",
      slot_index: 1,
      image_url: "https://example.com/mascot/static_1.png",
      status: "ready",
    },
    {
      id: "slot_2_video_only",
      slot_index: 2,
      status: "ready",
      animation: {
        transparent_video_url: "https://example.com/mascot/video_2.webm",
        fps: 24,
        frame_count: 96,
      },
    },
    {
      id: "slot_3_both_image_and_video",
      slot_index: 3,
      image_url: "https://example.com/mascot/static_3.png",
      status: "ready",
      animation: {
        transparent_video_url: "https://example.com/mascot/video_3.webm",
        fps: 24,
        frame_count: 96,
      },
    },
    {
      id: "slot_4_atlas_only",
      slot_index: 4,
      status: "ready",
      animation: {
        atlas_url: "https://example.com/mascot/atlas_4.png",
        fps: 8,
        frame_count: 12,
      },
    },
  ];

  describe("filterPreferredVariants", () => {
    it("defaults to static mode and prioritizes image variants", () => {
      const preferred = filterPreferredVariants(mixedVariants);
      // Slots 1 and 3 have image_url
      assert.equal(preferred.length, 2);
      assert.deepEqual(
        preferred.map((v) => v.id),
        ["slot_1_static_only", "slot_3_both_image_and_video"],
      );
    });

    it("explicit static mode prioritizes image variants", () => {
      const preferred = filterPreferredVariants(mixedVariants, "static");
      assert.equal(preferred.length, 2);
      assert.deepEqual(
        preferred.map((v) => v.id),
        ["slot_1_static_only", "slot_3_both_image_and_video"],
      );
    });

    it("static mode excludes animation-only variants when no images exist", () => {
      const animationOnlyVariants: MascotVariantMediaCandidate[] = [
        {
          id: "slot_2_video_only",
          slot_index: 2,
          status: "ready",
          animation: {
            transparent_video_url: "https://example.com/mascot/video_2.webm",
          },
        },
        {
          id: "slot_4_atlas_only",
          slot_index: 4,
          status: "ready",
          animation: {
            atlas_url: "https://example.com/mascot/atlas_4.png",
          },
        },
      ];

      const preferred = filterPreferredVariants(animationOnlyVariants, "static");
      assert.equal(preferred.length, 0);
    });

    it("animation mode prioritizes animation variants", () => {
      const preferred = filterPreferredVariants(mixedVariants, "animation");
      // Slots 2, 3, and 4 have animation
      assert.equal(preferred.length, 3);
      assert.deepEqual(
        preferred.map((v) => v.id),
        ["slot_2_video_only", "slot_3_both_image_and_video", "slot_4_atlas_only"],
      );
    });

    it("animation mode gracefully falls back to still image variants when no animations exist", () => {
      const imageOnlyVariants: MascotVariantMediaCandidate[] = [
        {
          id: "slot_1_static",
          slot_index: 1,
          image_url: "https://example.com/mascot/static_1.png",
          status: "ready",
        },
      ];

      const preferred = filterPreferredVariants(imageOnlyVariants, "animation");
      assert.equal(preferred.length, 1);
      assert.equal(preferred[0].id, "slot_1_static");
    });

    it("rejects mock fixtures in both modes", () => {
      const mockVariants: MascotVariantMediaCandidate[] = [
        {
          id: "slot_mock_atlas",
          slot_index: 1,
          status: "ready",
          animation: {
            atlas_url: "/synthetic/mock_atlas.png",
          },
        },
        {
          id: "slot_mock_image",
          slot_index: 2,
          image_url: "/placeholder/mock.png",
          status: "ready",
        },
      ];

      assert.equal(filterPreferredVariants(mockVariants, "static").length, 0);
      assert.equal(filterPreferredVariants(mockVariants, "animation").length, 0);
    });
  });

  describe("resolveStateVariantWithFallback", () => {
    it("resolves static image in static mode when variant has both image and video", () => {
      const dualMediaVariant: MascotVariantMediaCandidate[] = [
        {
          id: "slot_dual",
          slot_index: 1,
          image_url: "https://example.com/mascot/still.png",
          status: "ready",
          animation: {
            transparent_video_url: "https://example.com/mascot/anim.webm",
          },
        },
      ];

      const result = resolveStateVariantWithFallback(dualMediaVariant, null, undefined, "static");
      assert.ok(result !== null);
      assert.equal(result.visible, true);
      assert.equal(result.mediaType, "image");
      assert.equal(result.mediaUrl, "https://example.com/mascot/still.png");
      assert.equal(result.isAnchorFallback, false);
    });

    it("uses the style anchor instead of animation-only media in static mode", () => {
      const animationOnlyVariants: MascotVariantMediaCandidate[] = [
        {
          id: "slot_animation_only",
          slot_index: 1,
          status: "ready",
          animation: { transparent_video_url: "https://example.com/mascot/anim.webm" },
        },
      ];

      const result = resolveStateVariantWithFallback(animationOnlyVariants, "https://example.com/mascot/anchor.png", undefined, "static");
      assert.ok(result !== null);
      assert.equal(result.mediaType, "image");
      assert.equal(result.mediaUrl, "https://example.com/mascot/anchor.png");
      assert.equal(result.isAnchorFallback, true);
    });

    it("resolves video in animation mode when variant has both image and video", () => {
      const dualMediaVariant: MascotVariantMediaCandidate[] = [
        {
          id: "slot_dual",
          slot_index: 1,
          image_url: "https://example.com/mascot/still.png",
          status: "ready",
          animation: {
            transparent_video_url: "https://example.com/mascot/anim.webm",
          },
        },
      ];

      const result = resolveStateVariantWithFallback(dualMediaVariant, null, undefined, "animation");
      assert.ok(result !== null);
      assert.equal(result.visible, true);
      assert.equal(result.mediaType, "video");
      assert.equal(result.mediaUrl, "https://example.com/mascot/anim.webm");
      assert.equal(result.isAnchorFallback, false);
    });

    it("falls back to anchor image when no variants are available", () => {
      const result = resolveStateVariantWithFallback([], "https://example.com/anchor.png", undefined, "static");
      assert.ok(result !== null);
      assert.equal(result.visible, true);
      assert.equal(result.mediaType, "image");
      assert.equal(result.mediaUrl, "https://example.com/anchor.png");
      assert.equal(result.isAnchorFallback, true);
    });

    it("returns null when no variants and no valid anchor exist", () => {
      const result = resolveStateVariantWithFallback([], null, undefined, "static");
      assert.equal(result, null);
    });
  });
});
