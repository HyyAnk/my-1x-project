import type React from "react";
import { describe, expect, it, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import type { MascotProfile } from "@studio/shared";
import { LanguageProvider } from "../../../i18n";
import { useMascotMotionStudio } from "./useMascotMotionStudio";
import { api } from "../../../api";

vi.mock("../../../api", () => ({
  api: {
    calibrateMascotAction: vi.fn(),
    updateMascot: vi.fn(),
    updateMascotSlot: vi.fn(),
  },
}));

const wrapper = ({ children }: { children: React.ReactNode }) => <LanguageProvider>{children}</LanguageProvider>;

const mockMascot: MascotProfile = {
  id: "mascot_123",
  name: "Milo Owl",
  description: "Test owl",
  visual_style: "pixar_3d",
  master_prompt: "cute owl",
  master_image_url: "https://example.com/master.png",
  color_theme: "#06b6d4",
  actions: {
    thinking: {
      action: "thinking",
      sprite_url: "https://example.com/thinking.png",
      frames_count: 1,
      fps: 6,
      loop: true,
      frame_width: 512,
      frame_height: 512,
      offset_x: 0,
      offset_y: 0,
      motion_preset: "breathe",
      motion_speed: 1.0,
      motion_intensity: "normal",
    },
    idle: {
      action: "idle",
      sprite_url: "https://example.com/idle.png",
      frames_count: 1,
      fps: 6,
      loop: true,
      frame_width: 512,
      frame_height: 512,
      offset_x: 0,
      offset_y: 0,
      motion_preset: "breathe",
      motion_speed: 1.0,
      motion_intensity: "normal",
    },
  },
  assigned_channel_ids: [],
  created_at: "2026-08-30T00:00:00.000Z",
  updated_at: "2026-08-30T00:00:00.000Z",
};

describe("useMascotMotionStudio", () => {
  it("safely resolves active preview action when handleSaveMotion receives click event object", async () => {
    const onNotice = vi.fn();
    const onRefreshChannels = vi.fn().mockResolvedValue(undefined);
    const onMascotsChanged = vi.fn().mockResolvedValue(undefined);
    const setBusyAction = vi.fn();
    const setGeneratorStep = vi.fn();
    let editingMascot: MascotProfile | null = { ...mockMascot };
    const setEditingMascot = vi.fn((m) => {
      editingMascot = m;
    });

    vi.mocked(api.calibrateMascotAction).mockResolvedValue({
      mascot: { ...mockMascot },
      action: {
        action: "thinking",
        sprite_url: "https://example.com/thinking.png",
        frames_count: 1,
        fps: 6,
        loop: true,
        frame_width: 512,
        frame_height: 512,
        offset_x: 0,
        offset_y: 0,
        motion_preset: "breathe",
        motion_speed: 1.0,
        motion_intensity: "normal",
      },
    });

    const { result } = renderHook(
      () =>
        useMascotMotionStudio({
          editingMascot,
          setEditingMascot,
          onNotice,
          onRefreshChannels,
          onMascotsChanged,
          setBusyAction,
          setGeneratorStep,
        }),
      { wrapper },
    );

    // Simulate onClick passing a MouseEvent / SyntheticEvent object
    const mockClickEvent = { type: "click", target: {}, preventDefault: () => {} } as unknown;

    await act(async () => {
      await result.current.handleSaveMotion(mockClickEvent);
    });

    // Ensure api.calibrateMascotAction was called with "thinking" (activePreviewAction) and NOT "[object Object]"
    expect(api.calibrateMascotAction).toHaveBeenCalledWith(
      "mascot_123",
      "thinking",
      expect.objectContaining({
        motion_preset: "breathe",
      }),
    );
  });

  it("handles explicit action target correctly", async () => {
    const onNotice = vi.fn();
    const onRefreshChannels = vi.fn().mockResolvedValue(undefined);
    const onMascotsChanged = vi.fn().mockResolvedValue(undefined);
    const setBusyAction = vi.fn();
    const setGeneratorStep = vi.fn();
    const setEditingMascot = vi.fn();

    vi.mocked(api.calibrateMascotAction).mockResolvedValue({
      mascot: { ...mockMascot },
      action: {
        action: "celebrate",
        sprite_url: "https://example.com/celebrate.png",
        frames_count: 1,
        fps: 10,
        loop: true,
        frame_width: 512,
        frame_height: 512,
        offset_x: 0,
        offset_y: 0,
        motion_preset: "jump",
        motion_speed: 1.0,
        motion_intensity: "normal",
      },
    });

    const { result } = renderHook(
      () =>
        useMascotMotionStudio({
          editingMascot: mockMascot,
          setEditingMascot,
          onNotice,
          onRefreshChannels,
          onMascotsChanged,
          setBusyAction,
          setGeneratorStep,
        }),
      { wrapper },
    );

    await act(async () => {
      await result.current.handleSaveMotion("celebrate");
    });

    expect(api.calibrateMascotAction).toHaveBeenCalledWith(
      "mascot_123",
      "celebrate",
      expect.objectContaining({
        motion_preset: "jump",
      }),
    );
  });

  it("seamlessly supports previewing thinking and celebrate poses from active style and testing/saving motion presets", async () => {
    const onNotice = vi.fn();
    const onRefreshChannels = vi.fn().mockResolvedValue(undefined);
    const onMascotsChanged = vi.fn().mockResolvedValue(undefined);
    const setBusyAction = vi.fn();
    const setGeneratorStep = vi.fn();
    const setEditingMascot = vi.fn();

    const mascotWithStyles: MascotProfile = {
      ...mockMascot,
      styles: [
        {
          id: "style_superhero",
          name: "Superhero Cape",
          keyword: "hero cape",
          is_default: true,
          states: {
            thinking: [
              {
                id: "slot_think_1",
                slot_index: 1,
                image_url: "https://example.com/hero_think_1.png",
                motion_preset: "pulse",
                motion_speed: 1.2,
                motion_intensity: "dynamic",
              },
            ],
            celebrate: [
              {
                id: "slot_celeb_1",
                slot_index: 1,
                image_url: "https://example.com/hero_celeb_1.png",
                motion_preset: "jump",
                motion_speed: 1.5,
                motion_intensity: "dynamic",
              },
            ],
          },
          created_at: "2026-08-30T00:00:00.000Z",
          updated_at: "2026-08-30T00:00:00.000Z",
        },
      ],
      active_style_id: "style_superhero",
    };

    vi.mocked(api.calibrateMascotAction).mockResolvedValue({
      mascot: { ...mascotWithStyles },
      action: {
        action: "thinking",
        sprite_url: "https://example.com/hero_think_1.png",
        frames_count: 1,
        fps: 8,
        loop: true,
        frame_width: 512,
        frame_height: 512,
        offset_x: 0,
        offset_y: 0,
        motion_preset: "sway",
        motion_speed: 1.2,
        motion_intensity: "dynamic",
      },
    });

    vi.mocked(api.updateMascotSlot).mockResolvedValue({
      mascot: { ...mascotWithStyles },
    });

    const { result } = renderHook(
      () =>
        useMascotMotionStudio({
          editingMascot: mascotWithStyles,
          setEditingMascot,
          onNotice,
          onRefreshChannels,
          onMascotsChanged,
          setBusyAction,
          setGeneratorStep,
        }),
      { wrapper },
    );

    // Switch preview action to thinking
    act(() => {
      result.current.setActivePreviewAction("thinking");
    });

    // Verify effectiveMascot has resolved thinking pose from active style
    expect(result.current.effectiveMascot?.actions.thinking?.sprite_url).toBe("https://example.com/hero_think_1.png");

    // Test motion preset change on canvas
    act(() => {
      result.current.handleChangeMotionPreset("thinking", "sway");
    });
    expect(result.current.actionMotions.thinking).toBe("sway");

    // Save motion
    await act(async () => {
      await result.current.handleSaveMotion("thinking");
    });

    // Verify updateMascotSlot was called with the new motion preset for the active style slot
    expect(api.updateMascotSlot).toHaveBeenCalledWith(
      "mascot_123",
      "style_superhero",
      expect.objectContaining({
        state: "thinking",
        slot_index: 1,
        motion_preset: "sway",
      }),
    );

    // Verify calibrateMascotAction was also called to keep action record synchronized
    expect(api.calibrateMascotAction).toHaveBeenCalledWith(
      "mascot_123",
      "thinking",
      expect.objectContaining({
        motion_preset: "sway",
      }),
    );
  });

  it("persists motion to the selected filled variant slot, not the raw slot list", async () => {
    const onNotice = vi.fn();
    const onRefreshChannels = vi.fn().mockResolvedValue(undefined);
    const onMascotsChanged = vi.fn().mockResolvedValue(undefined);
    const setBusyAction = vi.fn();
    const setGeneratorStep = vi.fn();
    const setEditingMascot = vi.fn();

    const mascotWithGaps: MascotProfile = {
      ...mockMascot,
      styles: [
        {
          id: "style_gaps",
          name: "Gappy",
          keyword: "",
          is_default: true,
          states: {
            thinking: [
              { id: "s1", slot_index: 1, image_url: "https://example.com/g1.png", motion_preset: "sway" },
              { id: "s2", slot_index: 2, image_url: "" },
              { id: "s3", slot_index: 3, image_url: "https://example.com/g3.png", motion_preset: "pulse" },
            ],
            celebrate: [],
          },
          created_at: "2026-08-30T00:00:00.000Z",
          updated_at: "2026-08-30T00:00:00.000Z",
        },
      ],
      active_style_id: "style_gaps",
    };

    vi.mocked(api.calibrateMascotAction).mockResolvedValue({
      mascot: { ...mascotWithGaps },
      action: {
        action: "thinking",
        sprite_url: "https://example.com/g3.png",
        frames_count: 1,
        fps: 8,
        loop: true,
        frame_width: 512,
        frame_height: 512,
        offset_x: 0,
        offset_y: 0,
        motion_preset: "pulse",
        motion_speed: 1.0,
        motion_intensity: "normal",
      },
    });
    vi.mocked(api.updateMascotSlot).mockResolvedValue({ mascot: { ...mascotWithGaps } });

    const { result } = renderHook(
      () =>
        useMascotMotionStudio({
          editingMascot: mascotWithGaps,
          setEditingMascot,
          onNotice,
          onRefreshChannels,
          onMascotsChanged,
          setBusyAction,
          setGeneratorStep,
        }),
      { wrapper },
    );

    act(() => {
      result.current.setActivePreviewAction("thinking");
    });

    // Select the second filled variant (slot_index 3)
    act(() => {
      result.current.setActiveVariantIndex(1);
    });
    expect(result.current.effectiveMascot?.actions.thinking?.sprite_url).toBe("https://example.com/g3.png");

    await act(async () => {
      await result.current.handleSaveMotion("thinking");
    });

    expect(api.updateMascotSlot).toHaveBeenCalledWith(
      "mascot_123",
      "style_gaps",
      expect.objectContaining({
        state: "thinking",
        slot_index: 3,
      }),
    );
  });

  it("previews the explicitly selected style through previewStyleId", () => {
    const onNotice = vi.fn();
    const onRefreshChannels = vi.fn().mockResolvedValue(undefined);
    const onMascotsChanged = vi.fn().mockResolvedValue(undefined);
    const setBusyAction = vi.fn();
    const setGeneratorStep = vi.fn();
    const setEditingMascot = vi.fn();

    const multiStyleMascot: MascotProfile = {
      ...mockMascot,
      styles: [
        {
          id: "style_a",
          name: "Style A",
          keyword: "",
          is_default: true,
          states: {
            thinking: [{ id: "a1", slot_index: 1, image_url: "https://example.com/a_think.png" }],
            celebrate: [],
          },
          created_at: "2026-08-30T00:00:00.000Z",
          updated_at: "2026-08-30T00:00:00.000Z",
        },
        {
          id: "style_b",
          name: "Style B",
          keyword: "",
          is_default: false,
          states: {
            thinking: [{ id: "b1", slot_index: 1, image_url: "https://example.com/b_think.png" }],
            celebrate: [],
          },
          created_at: "2026-08-30T00:00:00.000Z",
          updated_at: "2026-08-30T00:00:00.000Z",
        },
      ],
      active_style_id: "style_a",
    };

    const { result } = renderHook(
      () =>
        useMascotMotionStudio({
          editingMascot: multiStyleMascot,
          setEditingMascot,
          onNotice,
          onRefreshChannels,
          onMascotsChanged,
          setBusyAction,
          setGeneratorStep,
        }),
      { wrapper },
    );

    act(() => {
      result.current.setActivePreviewAction("thinking");
    });
    expect(result.current.effectiveMascot?.actions.thinking?.sprite_url).toBe("https://example.com/a_think.png");

    act(() => {
      result.current.setPreviewStyleId("style_b");
    });
    expect(result.current.effectiveMascot?.actions.thinking?.sprite_url).toBe("https://example.com/b_think.png");
  });
});
