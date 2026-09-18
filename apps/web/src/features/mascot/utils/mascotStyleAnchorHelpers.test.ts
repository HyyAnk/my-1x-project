import { describe, expect, it } from "vitest";
import type { MascotProfile, MascotStyle } from "@studio/shared";
import {
  isCoreStyle,
  resolveAnchorImageUrl,
  resolveRawImageUrl,
  parseKeywordsList,
  countFilledPoses,
  sanitizeIdentifier,
} from "./mascotStyleAnchorHelpers";

describe("mascotStyleAnchorHelpers", () => {
  const mockMascot: MascotProfile = {
    id: "mascot_1",
    name: "Quill Pirate!",
    description: "A brave parrot",
    visual_style: "pixar_3d",
    master_prompt: "parrot with hat",
    master_image_url: "/media/master_concept_1.png",
    master_raw_image_url: "/media/master_concept_raw_1.png",
    color_theme: "#06b6d4",
    actions: {},
    styles: [],
    assigned_channel_ids: [],
    created_at: "2026-09-01T00:00:00.000Z",
    updated_at: "2026-09-01T00:00:00.000Z",
  };

  const coreStyle: MascotStyle = {
    id: "core",
    name: "Core Style",
    keyword: "ignored keywords",
    is_default: true,
    anchor_image_url: null,
    raw_anchor_image_url: null,
    states: {
      thinking: [{ id: "think_1", slot_index: 1, image_url: "/img/think1.png" }],
      celebrate: [
        { id: "celeb_1", slot_index: 1, image_url: "/img/celeb1.png" },
        { id: "celeb_2", slot_index: 2, image_url: "" },
      ],
    },
    created_at: "2026-09-01T00:00:00.000Z",
    updated_at: "2026-09-01T00:00:00.000Z",
  };

  const customStyle: MascotStyle = {
    id: "cyberpunk",
    name: "Cyberpunk V2",
    keyword: "neon, visor; metallic wings\ngolden beak",
    is_default: false,
    anchor_image_url: "/media/style_cyberpunk_anchor_123.png",
    raw_anchor_image_url: "/media/style_cyberpunk_anchor_raw_123.png",
    states: {
      thinking: [{ id: "think_1", slot_index: 1, image_url: "/img/think1.png" }],
      celebrate: [],
    },
    created_at: "2026-09-01T00:00:00.000Z",
    updated_at: "2026-09-01T00:00:00.000Z",
  };

  describe("isCoreStyle", () => {
    it("returns true for id='core' or is_default=true", () => {
      expect(isCoreStyle(coreStyle)).toBe(true);
      expect(isCoreStyle({ ...customStyle, is_default: true })).toBe(true);
    });

    it("returns false for custom non-default styles", () => {
      expect(isCoreStyle(customStyle)).toBe(false);
    });
  });

  describe("resolveAnchorImageUrl", () => {
    it("resolves master image for core style when anchor is empty", () => {
      expect(resolveAnchorImageUrl(coreStyle, mockMascot)).toBe("/media/master_concept_1.png");
    });

    it("resolves anchor image for custom style", () => {
      expect(resolveAnchorImageUrl(customStyle, mockMascot)).toBe("/media/style_cyberpunk_anchor_123.png");
    });
  });

  describe("resolveRawImageUrl", () => {
    it("resolves master raw image for core style", () => {
      expect(resolveRawImageUrl(coreStyle, mockMascot)).toBe("/media/master_concept_raw_1.png");
    });

    it("derives master raw url for core style when raw URL is missing but master url follows convention", () => {
      const mascotWithoutRaw = { ...mockMascot, master_raw_image_url: null };
      expect(resolveRawImageUrl(coreStyle, mascotWithoutRaw)).toBe("/media/master_concept_raw_1.png");
    });

    it("resolves explicit raw anchor image for custom style", () => {
      expect(resolveRawImageUrl(customStyle, mockMascot)).toBe("/media/style_cyberpunk_anchor_raw_123.png");
    });

    it("derives custom raw anchor image when explicit raw is missing but anchor contains _anchor_", () => {
      const customWithoutRaw = { ...customStyle, raw_anchor_image_url: null };
      expect(resolveRawImageUrl(customWithoutRaw, mockMascot)).toBe("/media/style_cyberpunk_anchor_raw_123.png");
    });
  });

  describe("parseKeywordsList", () => {
    it("returns empty array for core styles regardless of keyword content", () => {
      expect(parseKeywordsList("tag1, tag2", true)).toEqual([]);
    });

    it("parses comma, semicolon, newline delimited keywords for custom styles", () => {
      expect(parseKeywordsList("neon, visor; metallic wings\ngolden beak", false)).toEqual([
        "neon",
        "visor",
        "metallic wings",
        "golden beak",
      ]);
    });

    it("handles empty or null keywords safely", () => {
      expect(parseKeywordsList(null, false)).toEqual([]);
      expect(parseKeywordsList("", false)).toEqual([]);
    });
  });

  describe("countFilledPoses", () => {
    it("counts valid poses with non-empty image_url", () => {
      expect(countFilledPoses(coreStyle.states)).toBe(2);
      expect(countFilledPoses(customStyle.states)).toBe(1);
    });

    it("returns 0 if states is undefined or empty", () => {
      expect(countFilledPoses(undefined)).toBe(0);
      expect(countFilledPoses({ thinking: [], celebrate: [] })).toBe(0);
    });
  });

  describe("sanitizeIdentifier", () => {
    it("converts strings to lowercase alphanumeric and underscores", () => {
      expect(sanitizeIdentifier("Quill Pirate!")).toBe("quill_pirate_");
      expect(sanitizeIdentifier("Cyberpunk V2")).toBe("cyberpunk_v2");
    });

    it("uses fallback when input is empty or null", () => {
      expect(sanitizeIdentifier(null, "mascot")).toBe("mascot");
      expect(sanitizeIdentifier("", "default")).toBe("default");
    });
  });
});
