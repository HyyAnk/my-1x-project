import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { RECOMMENDED_MASCOT_PLACEMENT_PRESET } from "@studio/shared";
import { useSandboxMascotState } from "./useSandboxMascotState";
import { api } from "../../../api";

vi.mock("../../../api", () => ({
  api: {
    mascots: vi.fn(),
  },
}));

describe("useSandboxMascotState", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.mascots).mockResolvedValue({
      mascots: [
        {
          id: "mascot_1",
          name: "Star Pup",
          description: "Friendly dog",
          visual_style: "pixar_3d",
          master_prompt: "",
          master_image_url: null,
          color_theme: "#06b6d4",
          actions: {},
          assigned_channel_ids: [],
          created_at: "2026-01-01T00:00:00Z",
          updated_at: "2026-01-01T00:00:00Z",
        },
      ],
    });
  });

  it("initializes with RECOMMENDED_MASCOT_PLACEMENT_PRESET defaults matching channel assign", () => {
    const { result } = renderHook(() => useSandboxMascotState());

    expect(result.current.mascotId).toBe("none");
    expect(result.current.mascotEnabled).toBe(false);
    expect(result.current.mascotAction).toBe("thinking");
    expect(result.current.mascotPosition).toBe(RECOMMENDED_MASCOT_PLACEMENT_PRESET.position);
    expect(result.current.mascotScale).toBe(RECOMMENDED_MASCOT_PLACEMENT_PRESET.scale);
    expect(result.current.mascotOffsetX).toBe(RECOMMENDED_MASCOT_PLACEMENT_PRESET.offset_x);
    expect(result.current.mascotOffsetY).toBe(RECOMMENDED_MASCOT_PLACEMENT_PRESET.offset_y);
    expect(result.current.mascotFlipX).toBe(RECOMMENDED_MASCOT_PLACEMENT_PRESET.flip_x);
    expect(result.current.activeMascot).toBeNull();
  });

  it("fetches and auto-selects first mascot with mascotEnabled true when library has mascots", async () => {
    const { result } = renderHook(() => useSandboxMascotState());

    await waitFor(() => {
      expect(result.current.mascots).toHaveLength(1);
    });
    expect(result.current.mascots[0].name).toBe("Star Pup");
    expect(result.current.mascotId).toBe("mascot_1");
    expect(result.current.mascotEnabled).toBe(true);
    expect(result.current.activeMascot?.id).toBe("mascot_1");
  });

  it("keeps mascot disabled and mascotId none when mascot library is empty", async () => {
    vi.mocked(api.mascots).mockResolvedValueOnce({ mascots: [] });
    const { result } = renderHook(() => useSandboxMascotState());

    await waitFor(() => {
      expect(result.current.mascots).toHaveLength(0);
    });
    expect(result.current.mascotId).toBe("none");
    expect(result.current.mascotEnabled).toBe(false);
    expect(result.current.activeMascot).toBeNull();
  });

  it("resolves activeMascot when mascotId is selected or switched", async () => {
    const { result } = renderHook(() => useSandboxMascotState());

    await waitFor(() => {
      expect(result.current.mascots).toHaveLength(1);
    });

    act(() => {
      result.current.setMascotId("mascot_1");
      result.current.setMascotEnabled(true);
    });

    expect(result.current.activeMascot).not.toBeNull();
    expect(result.current.activeMascot?.id).toBe("mascot_1");
  });

  it("resets to default placement when resetToDefaultPlacement is called", () => {
    const { result } = renderHook(() => useSandboxMascotState());

    // Modify values away from default
    act(() => {
      result.current.setMascotPosition("bottom_right");
      result.current.setMascotScale(0.75);
      result.current.setMascotOffsetX(150);
      result.current.setMascotOffsetY(-40);
      result.current.setMascotFlipX(true);
    });

    expect(result.current.mascotPosition).toBe("bottom_right");
    expect(result.current.mascotScale).toBe(0.75);
    expect(result.current.mascotOffsetX).toBe(150);
    expect(result.current.mascotOffsetY).toBe(-40);
    expect(result.current.mascotFlipX).toBe(true);

    // Call reset
    act(() => {
      result.current.resetToDefaultPlacement();
    });

    expect(result.current.mascotPosition).toBe(RECOMMENDED_MASCOT_PLACEMENT_PRESET.position);
    expect(result.current.mascotScale).toBe(RECOMMENDED_MASCOT_PLACEMENT_PRESET.scale);
    expect(result.current.mascotOffsetX).toBe(RECOMMENDED_MASCOT_PLACEMENT_PRESET.offset_x);
    expect(result.current.mascotOffsetY).toBe(RECOMMENDED_MASCOT_PLACEMENT_PRESET.offset_y);
    expect(result.current.mascotFlipX).toBe(RECOMMENDED_MASCOT_PLACEMENT_PRESET.flip_x);
  });

  it("handles mascotStyleId updates, provides availableStyles, and forwards mascot_style_id", async () => {
    vi.mocked(api.mascots).mockResolvedValueOnce({
      mascots: [
        {
          id: "mascot_styles_test",
          name: "Styled Pup",
          description: "Mascot with styles",
          visual_style: "pixar_3d",
          master_prompt: "",
          master_image_url: null,
          color_theme: "#06b6d4",
          actions: {},
          styles: [
            {
              id: "style_casual",
              name: "Casual Wear",
              keyword: "hoodie",
              is_default: true,
              states: {
                thinking: [
                  { id: "v1", slot_index: 1, image_url: "/casual_think_1.png" },
                  { id: "v2", slot_index: 2, image_url: "/casual_think_2.png" },
                ],
                celebrate: [{ id: "c1", slot_index: 1, image_url: "/casual_celeb_1.png" }],
              },
              created_at: "2026-01-01T00:00:00Z",
              updated_at: "2026-01-01T00:00:00Z",
            },
            {
              id: "style_cyber",
              name: "Cyber Suit",
              keyword: "cyberpunk",
              is_default: false,
              states: {
                thinking: [{ id: "v3", slot_index: 1, image_url: "/cyber_think_1.png" }],
                celebrate: [],
              },
              created_at: "2026-01-01T00:00:00Z",
              updated_at: "2026-01-01T00:00:00Z",
            },
          ],
          active_style_id: "style_casual",
          assigned_channel_ids: [],
          created_at: "2026-01-01T00:00:00Z",
          updated_at: "2026-01-01T00:00:00Z",
        },
      ],
    });

    const { result } = renderHook(() => useSandboxMascotState());

    await waitFor(() => {
      expect(result.current.mascotId).toBe("mascot_styles_test");
    });

    // Auto-selects default/active style
    expect(result.current.mascotStyleId).toBe("style_casual");
    expect(result.current.mascot_style_id).toBe("style_casual");
    expect(result.current.availableStyles).toHaveLength(2);
    expect(result.current.activeStyle?.id).toBe("style_casual");
    expect(result.current.thinkingVariants).toHaveLength(2);
    expect(result.current.selectedVariantIndex).toBe(0);

    // Switch variant slot
    act(() => {
      result.current.setSelectedVariantIndex(1);
    });
    expect(result.current.selectedVariantIndex).toBe(1);

    // Switch style to style_cyber which has only 1 thinking variant
    act(() => {
      result.current.setMascotStyleId("style_cyber");
    });

    expect(result.current.mascotStyleId).toBe("style_cyber");
    expect(result.current.mascot_style_id).toBe("style_cyber");
    expect(result.current.activeStyle?.id).toBe("style_cyber");
    expect(result.current.thinkingVariants).toHaveLength(1);
    // Index was preserved because 0 < 1
    expect(result.current.selectedVariantIndex).toBe(0);

    // Switch action to celebrate, which has 0 variants in cyber
    act(() => {
      result.current.setMascotAction("celebrate");
    });
    expect(result.current.celebrateVariants).toHaveLength(0);
    expect(result.current.selectedVariantIndex).toBeNull();

    // Switch back to style_casual with celebrate
    act(() => {
      result.current.setMascotStyleId("style_casual");
    });
    expect(result.current.celebrateVariants).toHaveLength(1);
    expect(result.current.selectedVariantIndex).toBe(0);
  });
});
