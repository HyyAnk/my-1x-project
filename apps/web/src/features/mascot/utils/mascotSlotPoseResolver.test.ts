import { describe, expect, it } from "vitest";
import type { MascotStateVariant, MascotStyle } from "@studio/shared";
import { resolveSlotsForState, resolveSlotsToGenerate } from "./mascotSlotPoseResolver";

function createVariant(slotIndex: number, imageUrl: string, promptModifier?: string): MascotStateVariant {
  return {
    id: `slot_${slotIndex}`,
    slot_index: slotIndex,
    image_url: imageUrl,
    prompt_modifier: promptModifier,
    motion_preset: "breathe",
    motion_speed: 1.0,
    motion_intensity: "normal",
    created_at: "2026-01-01T00:00:00.000Z",
  };
}

describe("mascotSlotPoseResolver", () => {
  describe("resolveSlotsForState", () => {
    it("returns empty array when all 10 slots are filled with valid images", () => {
      const filledVariants: MascotStateVariant[] = Array.from({ length: 10 }, (_, i) =>
        createVariant(i + 1, `https://example.com/img${i + 1}.png`, `Custom prompt ${i + 1}`),
      );

      const result = resolveSlotsForState(filledVariants, "thinking");
      expect(result).toHaveLength(0);
    });

    it("identifies empty slots and assigns poses to slots without existing prompt modifiers", () => {
      const partialVariants: MascotStateVariant[] = [
        createVariant(1, "https://example.com/img1.png", "Holding magnifying glass"),
        createVariant(2, "", "Pre-assigned scratching head"),
      ];

      const result = resolveSlotsForState(partialVariants, "thinking");
      // Slots 2..10 are empty
      expect(result).toHaveLength(9);

      const slot2 = result.find((s) => s.slotIndex === 2);
      expect(slot2).toBeDefined();
      expect(slot2?.promptModifier).toBe("Pre-assigned scratching head");

      const slot3 = result.find((s) => s.slotIndex === 3);
      expect(slot3).toBeDefined();
      expect(typeof slot3?.promptModifier).toBe("string");
      expect(slot3?.promptModifier?.length).toBeGreaterThan(0);
    });
  });

  describe("resolveSlotsToGenerate", () => {
    it("processes only the selected state filter when stateFilter is thinking or celebrate", () => {
      const mockStyle: MascotStyle = {
        id: "core",
        name: "Core Style",
        keyword: "",
        anchor_image_url: null,
        raw_anchor_image_url: null,
        is_default: true,
        states: {
          thinking: [createVariant(1, "https://example.com/t1.png")],
          celebrate: [],
        },
        created_at: "2026-01-01T00:00:00.000Z",
        updated_at: "2026-01-01T00:00:00.000Z",
      };

      const thinkingOnly = resolveSlotsToGenerate(mockStyle, "thinking");
      expect(thinkingOnly.every((s) => s.state === "thinking")).toBe(true);
      expect(thinkingOnly).toHaveLength(9);

      const celebrateOnly = resolveSlotsToGenerate(mockStyle, "celebrate");
      expect(celebrateOnly.every((s) => s.state === "celebrate")).toBe(true);
      expect(celebrateOnly).toHaveLength(10);
    });

    it("processes all states when stateFilter is all", () => {
      const mockStyle: MascotStyle = {
        id: "core",
        name: "Core Style",
        keyword: "",
        anchor_image_url: null,
        raw_anchor_image_url: null,
        is_default: true,
        states: {
          thinking: Array.from({ length: 10 }, (_, i) => createVariant(i + 1, `https://example.com/t${i + 1}.png`)),
          celebrate: [createVariant(1, "https://example.com/c1.png")],
        },
        created_at: "2026-01-01T00:00:00.000Z",
        updated_at: "2026-01-01T00:00:00.000Z",
      };

      const result = resolveSlotsToGenerate(mockStyle, "all");
      expect(result).toHaveLength(9); // 0 thinking empty, 9 celebrate empty
      expect(result.every((s) => s.state === "celebrate")).toBe(true);
    });
  });
});
