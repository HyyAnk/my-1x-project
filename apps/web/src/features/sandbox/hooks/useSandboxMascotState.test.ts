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
});
