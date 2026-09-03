import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { api } from "../../../api";
import { useStylePresets } from "./useStylePresets";

vi.mock("../../../api", () => ({
  api: {
    stylePresets: vi.fn(),
    createStylePreset: vi.fn(),
    updateStylePreset: vi.fn(),
    deleteStylePreset: vi.fn(),
  },
}));

const preset = {
  id: "p1",
  name: "One",
  description: "",
  icon: "",
  theme: "candy_arcade",
  palette_id: "aqua",
  thinking_bar_style: "energy_laser",
  question_box_style: "glass_morphism",
  answer_card_style: "glass_neon",
  counter_style: "neon_badge",
  background_style: "aurora_glow",
  revision: 1,
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
};

describe("useStylePresets", () => {
  it("refreshes and synchronizes create mutation", async () => {
    vi.mocked(api.stylePresets)
      .mockResolvedValueOnce({ presets: [] })
      .mockResolvedValueOnce({ presets: [preset] });
    vi.mocked(api.createStylePreset).mockResolvedValue({ preset });
    const { result } = renderHook(() => useStylePresets());
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      await result.current.create({ ...preset, name: "One" });
    });
    expect(result.current.presets).toHaveLength(1);
  });

  it("keeps existing data when a mutation fails", async () => {
    vi.mocked(api.stylePresets).mockResolvedValue({ presets: [preset] });
    vi.mocked(api.deleteStylePreset).mockRejectedValue(new Error("offline"));
    const { result } = renderHook(() => useStylePresets());
    await waitFor(() => expect(result.current.presets).toHaveLength(1));
    await act(async () => {
      await expect(result.current.remove("p1")).rejects.toThrow("offline");
    });
    expect(result.current.presets).toHaveLength(1);
    expect(result.current.error).toBe("offline");
  });
});
