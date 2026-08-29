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
      await result.current.handleSaveMotion(mockClickEvent as any);
    });

    // Ensure api.calibrateMascotAction was called with "idle" (activePreviewAction) and NOT "[object Object]"
    expect(api.calibrateMascotAction).toHaveBeenCalledWith(
      "mascot_123",
      "idle",
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
});
