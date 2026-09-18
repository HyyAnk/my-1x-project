import { describe, expect, it } from "vitest";
import type { MascotStyle } from "@studio/shared";
import { computeDisplayValue, createFallbackCoreStyle, getStyleReadinessLabel, resolveStyleThumbnail } from "./mascotDropdownHelpers";

describe("mascotDropdownHelpers", () => {
  const sampleStyles: MascotStyle[] = [
    {
      id: "core",
      name: "Core Style",
      keyword: "",
      is_default: true,
      states: { thinking: [], celebrate: [] },
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
    },
    {
      id: "style-a",
      name: "Style Alpha",
      keyword: "alpha",
      is_default: false,
      states: { thinking: [], celebrate: [] },
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
    },
    {
      id: "style-b",
      name: "Style Beta",
      keyword: "beta",
      is_default: true,
      states: { thinking: [], celebrate: [] },
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
    },
  ];

  describe("computeDisplayValue", () => {
    it("returns 'No Mascot' when hasNoMascot is true", () => {
      expect(computeDisplayValue(true, false, null, sampleStyles)).toBe("No Mascot");
    });

    it("returns 'Disabled' when isMascotDisabled is true", () => {
      expect(computeDisplayValue(false, true, null, sampleStyles)).toBe("Disabled");
    });

    it("returns 'Cycle All Styles' for cycle and all", () => {
      expect(computeDisplayValue(false, false, "cycle", sampleStyles)).toBe("Cycle All Styles");
      expect(computeDisplayValue(false, false, "all", sampleStyles)).toBe("Cycle All Styles");
    });

    it("returns matched style name or name with default suffix", () => {
      expect(computeDisplayValue(false, false, "style-a", sampleStyles)).toBe("Style Alpha");
      expect(computeDisplayValue(false, false, "style-b", sampleStyles)).toBe("Style Beta (Default)");
    });

    it("returns currentStyleId if no style matches the custom id", () => {
      expect(computeDisplayValue(false, false, "unknown-style", sampleStyles)).toBe("unknown-style");
    });

    it("returns default non-core style when currentStyleId is not provided", () => {
      const nonCoreDefaultStyles: MascotStyle[] = [{ ...sampleStyles[0], is_default: false }, sampleStyles[1], sampleStyles[2]];
      expect(computeDisplayValue(false, false, null, nonCoreDefaultStyles)).toBe("Style Beta (Default)");
    });

    it("returns 'Core Style (Default)' when no non-core default exists", () => {
      const onlyCoreDefault = [sampleStyles[0], sampleStyles[1]];
      expect(computeDisplayValue(false, false, null, onlyCoreDefault)).toBe("Core Style (Default)");
    });
  });

  describe("getStyleReadinessLabel", () => {
    it("returns null when style is null", () => {
      expect(getStyleReadinessLabel(null)).toBeNull();
    });

    it("returns pose count when fully expressive", () => {
      const fullyExpressiveStyle: MascotStyle = {
        id: "full",
        name: "Full",
        keyword: "",
        is_default: false,
        anchor_image_url: "https://example.com/anchor.png",
        states: {
          thinking: Array.from({ length: 10 }, (_, i) => ({
            id: `t_${i}`,
            slot_index: i + 1,
            image_url: `https://example.com/think_${i}.png`,
          })),
          celebrate: Array.from({ length: 10 }, (_, i) => ({
            id: `c_${i}`,
            slot_index: i + 1,
            image_url: `https://example.com/celeb_${i}.png`,
          })),
        },
        created_at: "",
        updated_at: "",
      };

      expect(getStyleReadinessLabel(fullyExpressiveStyle)).toBe("20 Poses");
    });

    it("returns pose count or 'Concept Locked' for concept locked styles", () => {
      const conceptLockedNoPoses: MascotStyle = {
        id: "concept",
        name: "Concept",
        keyword: "",
        is_default: false,
        anchor_image_url: "https://example.com/anchor.png",
        states: { thinking: [], celebrate: [] },
        created_at: "",
        updated_at: "",
      };
      expect(getStyleReadinessLabel(conceptLockedNoPoses)).toBe("Concept Locked");

      const conceptLockedWithPose: MascotStyle = {
        id: "concept-pose",
        name: "Concept Pose",
        keyword: "",
        is_default: false,
        anchor_image_url: "https://example.com/anchor.png",
        states: {
          thinking: [{ id: "t1", slot_index: 1, image_url: "https://example.com/t.png" }],
          celebrate: [],
        },
        created_at: "",
        updated_at: "",
      };
      expect(getStyleReadinessLabel(conceptLockedWithPose)).toBe("1 Poses");
    });
  });

  describe("resolveStyleThumbnail", () => {
    it("returns trimmed anchor image url if available", () => {
      const styleWithAnchor: MascotStyle = {
        id: "s1",
        name: "S1",
        keyword: "",
        is_default: false,
        anchor_image_url: "  https://example.com/thumb.png  ",
        states: { thinking: [], celebrate: [] },
        created_at: "",
        updated_at: "",
      };
      expect(resolveStyleThumbnail(styleWithAnchor, false, true)).toBe("https://example.com/thumb.png");
    });

    it("returns masterImageUrl if isCore and hasMascotId", () => {
      expect(resolveStyleThumbnail(null, true, true, "  https://example.com/master.png  ")).toBe("https://example.com/master.png");
    });

    it("returns null if no anchor and not core with master", () => {
      expect(resolveStyleThumbnail(null, false, true, "https://example.com/master.png")).toBeNull();
      expect(resolveStyleThumbnail(null, true, false, "https://example.com/master.png")).toBeNull();
    });
  });

  describe("createFallbackCoreStyle", () => {
    it("creates fallback core style object with proper fields", () => {
      const result = createFallbackCoreStyle("https://example.com/master.png", "2026-01-01", "2026-01-02");
      expect(result).toEqual({
        id: "core",
        name: "Core Style",
        keyword: "",
        anchor_image_url: "https://example.com/master.png",
        is_default: true,
        states: { thinking: [], celebrate: [] },
        created_at: "2026-01-01",
        updated_at: "2026-01-02",
      });
    });
  });
});
