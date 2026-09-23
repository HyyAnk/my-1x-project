import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { MascotStateVariant } from "@studio/shared";
import { downloadVariantsAsZip, resolveVariantDownloadTarget } from "./mascotSlotDownloadHelpers";

describe("mascotSlotDownloadHelpers", () => {
  const sampleVariant: MascotStateVariant = {
    id: "v1",
    slot_index: 2,
    image_url: "/assets/mascot/slot2.png",
    raw_image_url: "/assets/raw/slot2.png",
    transparent_image_url: "/assets/transparent/slot2.png",
  };

  it("resolves original download target with raw_image_url fallback", () => {
    const target = resolveVariantDownloadTarget(sampleVariant, "thinking", "original");
    expect(target).toEqual({
      slotIndex: 2,
      url: "/assets/raw/slot2.png",
      filename: "thinking_slot_2_original.png",
    });
  });

  it("resolves transparent download target with path replacement when missing", () => {
    const variantNoTransparent: MascotStateVariant = {
      id: "v2",
      slot_index: 5,
      image_url: "/assets/mascot/slot5.png",
    };
    const target = resolveVariantDownloadTarget(variantNoTransparent, "celebrate", "transparent");
    expect(target).toEqual({
      slotIndex: 5,
      url: "/assets/transparent/mascot/slot5.png",
      filename: "celebrate_slot_5_transparent.png",
    });
  });

  it("returns null if variant has no image_url", () => {
    const emptyVariant: MascotStateVariant = {
      id: "v3",
      slot_index: 3,
      image_url: "",
    };
    expect(resolveVariantDownloadTarget(emptyVariant, "thinking", "original")).toBeNull();
  });

  describe("downloadVariantsAsZip", () => {
    beforeEach(() => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockImplementation(async (url: string) => {
          if (url.includes("fail")) {
            return { ok: false, status: 404 };
          }
          return {
            ok: true,
            arrayBuffer: async () => new Uint8Array([1, 2, 3, 4]).buffer,
          };
        }),
      );
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("downloads and packages valid variants into zip", async () => {
      const variants: MascotStateVariant[] = [
        sampleVariant,
        {
          id: "v4",
          slot_index: 4,
          image_url: "/assets/mascot/slot4.png",
        },
      ];

      const result = await downloadVariantsAsZip(variants, "thinking", "original", {
        mascotName: "Sparky",
      });

      expect(result.total).toBe(2);
      expect(result.downloaded).toBe(2);
      expect(result.failed).toBe(0);
    });

    it("skips failed downloads gracefully", async () => {
      const variants: MascotStateVariant[] = [
        sampleVariant,
        {
          id: "v_fail",
          slot_index: 9,
          image_url: "/assets/fail/slot9.png",
          raw_image_url: "/assets/fail/slot9.png",
        },
      ];

      const result = await downloadVariantsAsZip(variants, "celebrate", "original");

      expect(result.total).toBe(2);
      expect(result.downloaded).toBe(1);
      expect(result.failed).toBe(1);
    });
  });
});
