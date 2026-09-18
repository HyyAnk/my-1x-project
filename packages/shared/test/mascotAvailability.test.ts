import { describe as nodeDescribe, it as nodeIt } from "node:test";
import assert from "node:assert/strict";
import {
  isMascotVariantAvailable,
  filterAvailableVariants,
  isMockFixtureIdentifier,
  resolveStateVariantWithFallback,
  type MascotVariantMediaCandidate,
} from "../src/index.js";

type TestCallback = () => void | Promise<void>;
const describe = (name: string, suite: TestCallback): void => {
  void nodeDescribe(name, suite);
};
const it = (name: string, testCase: TestCallback): void => {
  void nodeIt(name, testCase);
};

describe("Mascot Variant Media Availability & Fallback Contracts (Phase 2)", () => {
  describe("isMockFixtureIdentifier", () => {
    it("detects mock fixture keywords and synthetic placeholder patterns", () => {
      assert.equal(isMockFixtureIdentifier("/fixtures/character.png"), true);
      assert.equal(isMockFixtureIdentifier("https://cdn.example.com/test-fixture.webp"), true);
      assert.equal(isMockFixtureIdentifier("/assets/synthetic/slot1.png"), true);
      assert.equal(isMockFixtureIdentifier("/images/placeholder-avatar.png"), true);
      assert.equal(isMockFixtureIdentifier("/mock/dino.png"), true);
      assert.equal(isMockFixtureIdentifier("/assets/animations/thinking/atlas.png"), true);
      assert.equal(isMockFixtureIdentifier("rainbow_circles.png"), true);
    });

    it("returns false for legitimate production character media paths", () => {
      assert.equal(isMockFixtureIdentifier("/api/mascots/mascot_22cb190ece7b4475/assets/state_thinking_1787905166153.png"), false);
      assert.equal(
        isMockFixtureIdentifier("/api/mascots/mascot_22cb190ece7b4475/styles/core/animations/thinking/2/artifacts/video_transparent.webm"),
        false,
      );
      assert.equal(isMockFixtureIdentifier("https://cdn.example.com/characters/owl/render_front_512.png"), false);
      assert.equal(isMockFixtureIdentifier("/mascots/owl/variant_1.png"), false);
    });

    it("returns false for null, undefined, and empty strings", () => {
      assert.equal(isMockFixtureIdentifier(null), false);
      assert.equal(isMockFixtureIdentifier(undefined), false);
      assert.equal(isMockFixtureIdentifier(""), false);
      assert.equal(isMockFixtureIdentifier("   "), false);
    });
  });

  describe("isMascotVariantAvailable", () => {
    it("returns true for variant with WebM transparent video URL", () => {
      const variantWithWebM: MascotVariantMediaCandidate = {
        id: "slot_2",
        slot_index: 2,
        image_url: "",
        status: "ready",
        animation: {
          transparent_video_url: "/api/mascots/m1/styles/core/animations/thinking/2/artifacts/video_transparent.webm",
          manifest_url: "/api/mascots/m1/styles/core/animations/thinking/2/artifacts/manifest.json",
          frame_count: 192,
          fps: 24,
        },
      };

      assert.equal(isMascotVariantAvailable(variantWithWebM), true);
    });

    it("returns true for variant with valid 3D character image URL", () => {
      const variantWithImage: MascotVariantMediaCandidate = {
        id: "slot_1",
        slot_index: 1,
        image_url: "/api/mascots/mascot_22cb190ece7b4475/assets/state_thinking_1787905166153.png",
        status: "ready",
      };

      assert.equal(isMascotVariantAvailable(variantWithImage), true);
    });

    it("returns true for variant with transparent_image_url fallback when image_url is absent", () => {
      const variantWithTransparentImage: MascotVariantMediaCandidate = {
        id: "slot_trans",
        slot_index: 1,
        transparent_image_url: "/api/mascots/m1/assets/trans_character.png",
      };

      assert.equal(isMascotVariantAvailable(variantWithTransparentImage), true);
    });

    it("returns false for variant with mock fixture atlas URL without real media", () => {
      const mockAtlasVariant: MascotVariantMediaCandidate = {
        id: "slot_mock_atlas",
        slot_index: 3,
        image_url: "",
        animation: {
          atlas_url: "/assets/animations/core/thinking/slot_3/atlas.png",
          manifest_url: "/assets/animations/core/thinking/slot_3/manifest.json",
        },
      };

      assert.equal(isMascotVariantAvailable(mockAtlasVariant), false);
    });

    it("returns false for variant with fixture image URL and fixture atlas", () => {
      const fixtureImageVariant: MascotVariantMediaCandidate = {
        id: "slot_fixture",
        slot_index: 4,
        image_url: "/fixtures/mock_character.png",
        animation: {
          atlas_url: "/fixtures/atlas.png",
        },
      };

      assert.equal(isMascotVariantAvailable(fixtureImageVariant), false);
    });

    it("returns false for empty variant (empty strings, null, or undefined)", () => {
      assert.equal(isMascotVariantAvailable(null), false);
      assert.equal(isMascotVariantAvailable(undefined), false);
      assert.equal(isMascotVariantAvailable({}), false);

      const emptyVariant: MascotVariantMediaCandidate = {
        id: "slot_empty",
        slot_index: 5,
        image_url: "",
        animation: null,
      };
      assert.equal(isMascotVariantAvailable(emptyVariant), false);

      const whitespaceVariant: MascotVariantMediaCandidate = {
        id: "slot_whitespace",
        slot_index: 6,
        image_url: "   ",
        animation: {
          transparent_video_url: "   ",
        },
      };
      assert.equal(isMascotVariantAvailable(whitespaceVariant), false);
    });

    it("returns false for variant with failed, qa_failed, or empty status", () => {
      const failedVariant: MascotVariantMediaCandidate = {
        id: "slot_failed",
        slot_index: 7,
        image_url: "/api/mascots/m1/assets/character.png",
        status: "failed",
      };
      assert.equal(isMascotVariantAvailable(failedVariant), false);

      const qaFailedVariant: MascotVariantMediaCandidate = {
        id: "slot_qa_failed",
        slot_index: 8,
        image_url: "/api/mascots/m1/assets/character.png",
        status: "qa_failed",
      };
      assert.equal(isMascotVariantAvailable(qaFailedVariant), false);

      const emptyStatusVariant: MascotVariantMediaCandidate = {
        id: "slot_empty_status",
        slot_index: 9,
        image_url: "/api/mascots/m1/assets/character.png",
        status: "empty",
      };
      assert.equal(isMascotVariantAvailable(emptyStatusVariant), false);
    });
  });

  describe("filterAvailableVariants", () => {
    it("filters mixed list and retains only variants backed by real media", () => {
      const mixedVariants: MascotVariantMediaCandidate[] = [
        {
          id: "slot_1",
          slot_index: 1,
          image_url: "/api/mascots/dino/slot_1.png",
          status: "ready",
        },
        {
          id: "slot_2",
          slot_index: 2,
          image_url: "",
          animation: {
            transparent_video_url: "/api/mascots/dino/slot_2/video_transparent.webm",
          },
          status: "ready",
        },
        {
          id: "slot_3_mock",
          slot_index: 3,
          image_url: "",
          animation: {
            atlas_url: "/fixtures/atlas.png",
          },
        },
        {
          id: "slot_4_empty",
          slot_index: 4,
          image_url: "",
        },
        {
          id: "slot_5_placeholder",
          slot_index: 5,
          image_url: "/assets/placeholder_character.png",
        },
      ];

      const available = filterAvailableVariants(mixedVariants);
      assert.equal(available.length, 2);
      assert.equal(available[0].id, "slot_1");
      assert.equal(available[1].id, "slot_2");
    });

    it("handles empty arrays and null inputs safely", () => {
      assert.deepEqual(filterAvailableVariants([]), []);
      assert.deepEqual(filterAvailableVariants(null), []);
      assert.deepEqual(filterAvailableVariants(undefined), []);
    });
  });

  describe("Graceful Fallback & Omission Policy (resolveStateVariantWithFallback)", () => {
    it("resolves available variant when variants exist without using fallback", () => {
      const variants: MascotVariantMediaCandidate[] = [
        {
          id: "slot_video",
          slot_index: 2,
          image_url: "/fallback_image.png",
          animation: {
            transparent_video_url: "/artifacts/video_transparent.webm",
          },
        },
      ];

      const result = resolveStateVariantWithFallback(variants, "/anchor.png");
      assert.ok(result !== null);
      assert.equal(result.visible, true);
      assert.equal(result.isAnchorFallback, false);
      assert.equal(result.mediaType, "video");
      assert.equal(result.mediaUrl, "/artifacts/video_transparent.webm");
      assert.equal(result.variant?.id, "slot_video");
    });

    it("falls back to style anchor image when 0 available variants exist", () => {
      const emptyVariants: MascotVariantMediaCandidate[] = [
        {
          id: "slot_unready",
          slot_index: 1,
          image_url: "",
        },
      ];

      const result = resolveStateVariantWithFallback(emptyVariants, "/mascots/owl/anchor.png");
      assert.ok(result !== null);
      assert.equal(result.visible, true);
      assert.equal(result.isAnchorFallback, true);
      assert.equal(result.mediaType, "image");
      assert.equal(result.mediaUrl, "/mascots/owl/anchor.png");
      assert.equal(result.variant, null);
    });

    it("returns null / invisible when 0 available variants exist and anchor image is absent", () => {
      const resultNoAnchor = resolveStateVariantWithFallback([], null);
      assert.equal(resultNoAnchor, null);

      const resultEmptyAnchor = resolveStateVariantWithFallback([], "");
      assert.equal(resultEmptyAnchor, null);

      const resultWhitespaceAnchor = resolveStateVariantWithFallback([], "   ");
      assert.equal(resultWhitespaceAnchor, null);
    });

    it("returns null / invisible when anchor image is a mock fixture path", () => {
      const resultFixtureAnchor = resolveStateVariantWithFallback([], "/fixtures/anchor_mock.png");
      assert.equal(resultFixtureAnchor, null);

      const resultPlaceholderAnchor = resolveStateVariantWithFallback([], "/assets/placeholder_anchor.png");
      assert.equal(resultPlaceholderAnchor, null);
    });
  });
});
