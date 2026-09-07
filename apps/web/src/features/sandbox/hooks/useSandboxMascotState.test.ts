import React from "react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, renderHook, act, waitFor, cleanup } from "@testing-library/react";
import { RECOMMENDED_MASCOT_PLACEMENT_PRESET, type MascotActionType, type MascotStyle } from "@studio/shared";
import { LanguageProvider } from "../../../i18n";
import { MascotActionSelector } from "../components/MascotActionSelector";
import { useSandboxMascotState } from "./useSandboxMascotState";
import { api } from "../../../api";

vi.mock("../../../api", () => ({
  api: {
    mascots: vi.fn(),
  },
}));

afterEach(() => {
  cleanup();
});

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

  it("guards mascotAction to core states ('thinking' | 'celebrate') and normalizes non-variant actions to 'thinking'", () => {
    const { result } = renderHook(() => useSandboxMascotState());

    // Default is thinking
    expect(result.current.mascotAction).toBe("thinking");

    // Switch to celebrate
    act(() => {
      result.current.setMascotAction("celebrate");
    });
    expect(result.current.mascotAction).toBe("celebrate");

    // Switch back to thinking
    act(() => {
      result.current.setMascotAction("thinking");
    });
    expect(result.current.mascotAction).toBe("thinking");

    // Switch to celebrate again
    act(() => {
      result.current.setMascotAction("celebrate");
    });
    expect(result.current.mascotAction).toBe("celebrate");

    // Non-variant / legacy actions normalize to thinking
    act(() => {
      result.current.setMascotAction("point" as MascotActionType);
    });
    expect(result.current.mascotAction).toBe("thinking");

    act(() => {
      result.current.setMascotAction("celebrate");
    });
    expect(result.current.mascotAction).toBe("celebrate");

    act(() => {
      result.current.setMascotAction("idle" as MascotActionType);
    });
    expect(result.current.mascotAction).toBe("thinking");

    act(() => {
      result.current.setMascotAction("celebrate");
    });
    expect(result.current.mascotAction).toBe("celebrate");

    act(() => {
      result.current.setMascotAction("wave" as MascotActionType);
    });
    expect(result.current.mascotAction).toBe("thinking");

    act(() => {
      result.current.setMascotAction("celebrate");
    });
    expect(result.current.mascotAction).toBe("celebrate");

    act(() => {
      result.current.setMascotAction("oops" as MascotActionType);
    });
    expect(result.current.mascotAction).toBe("thinking");
  });

  it("tracks and adjusts selectedVariantIndex when switching between thinking and celebrate", async () => {
    vi.mocked(api.mascots).mockResolvedValueOnce({
      mascots: [
        {
          id: "mascot_variants_test",
          name: "Variant Pup",
          description: "Mascot for testing variants",
          visual_style: "pixar_3d",
          master_prompt: "",
          master_image_url: null,
          color_theme: "#06b6d4",
          actions: {},
          styles: [
            {
              id: "style_multi",
              name: "Multi-variant style",
              keyword: "multi",
              is_default: true,
              states: {
                thinking: [
                  { id: "t1", slot_index: 1, image_url: "/think_1.png" },
                  { id: "t2", slot_index: 2, image_url: "/think_2.png" },
                  { id: "t3", slot_index: 3, image_url: "/think_3.png" },
                ],
                celebrate: [
                  { id: "c1", slot_index: 1, image_url: "/celeb_1.png" },
                  { id: "c2", slot_index: 2, image_url: "/celeb_2.png" },
                ],
              },
              created_at: "2026-01-01T00:00:00Z",
              updated_at: "2026-01-01T00:00:00Z",
            },
          ],
          active_style_id: "style_multi",
          assigned_channel_ids: [],
          created_at: "2026-01-01T00:00:00Z",
          updated_at: "2026-01-01T00:00:00Z",
        },
      ],
    });

    const { result } = renderHook(() => useSandboxMascotState());

    await waitFor(() => {
      expect(result.current.mascotId).toBe("mascot_variants_test");
    });

    // Default action is thinking, initial variant index is 0
    expect(result.current.mascotAction).toBe("thinking");
    expect(result.current.thinkingVariants).toHaveLength(3);
    expect(result.current.selectedVariantIndex).toBe(0);

    // Select slot index 2 in thinking (3rd variant)
    act(() => {
      result.current.setSelectedVariantIndex(2);
    });
    expect(result.current.selectedVariantIndex).toBe(2);

    // Switch to celebrate (celebrate has 2 variants: indices 0 and 1)
    // Index 2 is >= celebrateVariants.length (2), so it resets to 0
    act(() => {
      result.current.setMascotAction("celebrate");
    });
    expect(result.current.mascotAction).toBe("celebrate");
    expect(result.current.celebrateVariants).toHaveLength(2);
    expect(result.current.selectedVariantIndex).toBe(0);

    // Select index 1 in celebrate
    act(() => {
      result.current.setSelectedVariantIndex(1);
    });
    expect(result.current.selectedVariantIndex).toBe(1);

    // Switch back to thinking (thinking has 3 variants, index 1 is valid, so it is preserved)
    act(() => {
      result.current.setMascotAction("thinking");
    });
    expect(result.current.mascotAction).toBe("thinking");
    expect(result.current.selectedVariantIndex).toBe(1);
  });

  it("falls back to activeStyle.anchor_image_url for thinking and celebrate variants when states are empty", async () => {
    vi.mocked(api.mascots).mockResolvedValueOnce({
      mascots: [
        {
          id: "mascot_anchor_fallback",
          name: "Anchor Pup",
          description: "Mascot with anchor image only",
          visual_style: "pixar_3d",
          master_prompt: "",
          master_image_url: null,
          color_theme: "#06b6d4",
          actions: {},
          styles: [
            {
              id: "style_concept_locked",
              name: "Concept Suit",
              keyword: "concept",
              anchor_image_url: "https://example.com/concept-anchor.png",
              is_default: true,
              states: {
                thinking: [],
                celebrate: [],
              },
              created_at: "2026-01-01T00:00:00Z",
              updated_at: "2026-01-01T00:00:00Z",
            },
          ],
          active_style_id: "style_concept_locked",
          assigned_channel_ids: [],
          created_at: "2026-01-01T00:00:00Z",
          updated_at: "2026-01-01T00:00:00Z",
        },
      ],
    });

    const { result } = renderHook(() => useSandboxMascotState());

    await waitFor(() => {
      expect(result.current.mascotId).toBe("mascot_anchor_fallback");
    });

    expect(result.current.mascotStyleId).toBe("style_concept_locked");
    expect(result.current.activeStyle?.anchor_image_url).toBe("https://example.com/concept-anchor.png");

    // Thinking variants fall back to synthetic single variant using anchor_image_url with sway preset
    expect(result.current.thinkingVariants).toHaveLength(1);
    expect(result.current.thinkingVariants[0]).toEqual({
      id: "style_concept_locked_anchor_thinking",
      slot_index: 1,
      image_url: "https://example.com/concept-anchor.png",
      motion_preset: "sway",
      motion_speed: 1.0,
      motion_intensity: "normal",
    });
    expect(result.current.selectedVariantIndex).toBe(0);

    // Celebrate variants fall back to synthetic single variant using anchor_image_url with jump preset
    expect(result.current.celebrateVariants).toHaveLength(1);
    expect(result.current.celebrateVariants[0]).toEqual({
      id: "style_concept_locked_anchor_celebrate",
      slot_index: 1,
      image_url: "https://example.com/concept-anchor.png",
      motion_preset: "jump",
      motion_speed: 1.0,
      motion_intensity: "normal",
    });

    // Switching action to celebrate maintains selection index 0
    act(() => {
      result.current.setMascotAction("celebrate");
    });
    expect(result.current.mascotAction).toBe("celebrate");
    expect(result.current.selectedVariantIndex).toBe(0);
  });
});

describe("MascotActionSelector", () => {
  const mockStyle: MascotStyle = {
    id: "style_test",
    name: "Hero Suit",
    keyword: "hero",
    is_default: true,
    states: {
      thinking: [
        { id: "t1", slot_index: 1, image_url: "/think_1.png" },
        { id: "t2", slot_index: 2, image_url: "/think_2.png" },
      ],
      celebrate: [
        { id: "c1", slot_index: 1, image_url: "/celeb_1.png" },
      ],
    },
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  };

  it("renders only core Thinking and Celebrate buttons and removes legacy action buttons", () => {
    const setMascotAction = vi.fn();
    render(
      React.createElement(
        LanguageProvider,
        null,
        React.createElement(MascotActionSelector, {
          mascotAction: "thinking",
          setMascotAction,
          activeStyle: mockStyle,
          selectedVariantIndex: 0,
        })
      )
    );

    // Core actions are present
    expect(screen.getByRole("button", { name: /thinking/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /celebrate/i })).toBeTruthy();

    // Obsolete legacy action buttons are not rendered
    expect(screen.queryByRole("button", { name: /point/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /oops/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /idle/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /wave/i })).toBeNull();
  });

  it("triggers setMascotAction when clicking Celebrate", () => {
    const setMascotAction = vi.fn();
    render(
      React.createElement(
        LanguageProvider,
        null,
        React.createElement(MascotActionSelector, {
          mascotAction: "thinking",
          setMascotAction,
          activeStyle: mockStyle,
          selectedVariantIndex: 0,
        })
      )
    );

    fireEvent.click(screen.getByRole("button", { name: /celebrate/i }));
    expect(setMascotAction).toHaveBeenCalledWith("celebrate");
  });

  it("renders state variants grid with thumbnail previews, active selection badge, and slot index", () => {
    const setSelectedVariantIndex = vi.fn();
    render(
      React.createElement(
        LanguageProvider,
        null,
        React.createElement(MascotActionSelector, {
          mascotAction: "thinking",
          setMascotAction: vi.fn(),
          activeStyle: mockStyle,
          selectedVariantIndex: 0,
          setSelectedVariantIndex,
        })
      )
    );

    // Displays slots
    expect(screen.getByText("Slot 1")).toBeTruthy();
    expect(screen.getByText("Slot 2")).toBeTruthy();

    // Active selection badge
    expect(screen.getByLabelText("Active slot selection")).toBeTruthy();

    // Clicking slot 2 calls setSelectedVariantIndex with index 1
    fireEvent.click(screen.getByRole("button", { name: /Slot 2/i }));
    expect(setSelectedVariantIndex).toHaveBeenCalledWith(1);
  });

  describe("16:9 widescreen mascot position standardization", () => {
    it("locks mascot position to bottom_left and guards against bottom_right in 16:9 widescreen", () => {
      const { result } = renderHook(() => useSandboxMascotState("16:9"));

      expect(result.current.mascotPosition).toBe("bottom_left");

      act(() => {
        result.current.setMascotPosition("bottom_right");
      });

      expect(result.current.mascotPosition).toBe("bottom_left");
    });

    it("normalizes mascot position to bottom_left when switching from 9:16 to 16:9", () => {
      let currentRatio: "16:9" | "9:16" = "9:16";
      const { result, rerender } = renderHook(() => useSandboxMascotState(currentRatio));

      act(() => {
        result.current.setMascotPosition("bottom_right");
      });
      expect(result.current.mascotPosition).toBe("bottom_right");

      currentRatio = "16:9";
      rerender();

      expect(result.current.mascotPosition).toBe("bottom_left");
    });

    it("allows bottom_right placement when in 9:16 portrait mode", () => {
      const { result } = renderHook(() => useSandboxMascotState("9:16"));

      act(() => {
        result.current.setMascotPosition("bottom_right");
      });

      expect(result.current.mascotPosition).toBe("bottom_right");
    });
  });
});
