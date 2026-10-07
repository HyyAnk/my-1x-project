import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import type { AppConfig } from "@studio/shared";
import { api } from "../../../api";
import { buildVideoPayload, useVideoSettingsState } from "./useVideoSettingsState";

vi.mock("../../../api", () => ({
  api: {
    saveVideoSettings: vi.fn(),
  },
}));

describe("useVideoSettingsState", () => {
  const onVideoSaved = vi.fn();
  const onNotice = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const baseConfig: AppConfig = {
    active_engine: "codex",
    video_generation: {
      provider: "hyperframes",
      model: "",
      hyperframes_command: "npx hyperframes",
      render_quality: "standard",
      fps: 30,
      max_scene_duration_seconds: 10,
      default_scene_duration_seconds: 6,
      narration_words_per_second: 2.5,
      aspect_ratio: "16:9",
      max_concurrent_tasks: 2,
      fast_render_mode: false,
      mascot_media_mode: "animation",
    },
    image_generation: {
      enabled: true,
      images_per_bundle: 1,
      provider: "gpti2",
      base_url: "",
      model: "gpt-image-2.5-flare",
      api_key: "",
      quality: "low",
      max_concurrent_tasks: 3,
    },
    codex: {
      command: "codex-core",
      model: "default",
      temperature: 0.7,
      max_tokens: 4096,
      cwd: "",
    },
  } as unknown as AppConfig;

  it("initializes with default static mascotMediaMode when appConfig is null", () => {
    const { result } = renderHook(() =>
      useVideoSettingsState({
        appConfig: null,
        onVideoSaved,
        onNotice,
      }),
    );

    expect(result.current.mascotMediaMode).toBe("static");
    expect(result.current.maxSceneDuration).toBe(8);
  });

  it("initializes with appConfig mascot_media_mode when provided", () => {
    const { result } = renderHook(() =>
      useVideoSettingsState({
        appConfig: baseConfig,
        onVideoSaved,
        onNotice,
      }),
    );

    expect(result.current.mascotMediaMode).toBe("animation");
    expect(result.current.maxSceneDuration).toBe(10);
  });

  it("updates mascotMediaMode state via setMascotMediaMode", () => {
    const { result } = renderHook(() =>
      useVideoSettingsState({
        appConfig: null,
        onVideoSaved,
        onNotice,
      }),
    );

    act(() => {
      result.current.setMascotMediaMode("animation");
    });
    expect(result.current.mascotMediaMode).toBe("animation");

    act(() => {
      result.current.setMascotMediaMode("static");
    });
    expect(result.current.mascotMediaMode).toBe("static");
  });

  it("buildVideoPayload constructs payload with mascot_media_mode", () => {
    const payload = buildVideoPayload({
      maxSceneDuration: 12,
      narrationWordsPerSecond: 2.1,
      maxConcurrentVideoTasks: 3,
      renderWorkers: 4,
      renderQuality: "high",
      fps: 60,
      mascotMediaMode: "static",
    });

    expect(payload).toEqual({
      max_scene_duration_seconds: 12,
      narration_words_per_second: 2.1,
      aspect_ratio: "16:9",
      max_concurrent_tasks: 3,
      render_workers: 4,
      render_quality: "high",
      fps: 60,
      mascot_media_mode: "static",
    });
  });

  it("saves video settings including mascot_media_mode via saveVideo", async () => {
    const mockSaveVideoSettings = vi.mocked(api.saveVideoSettings).mockResolvedValue({
      video_generation: {
        ...baseConfig.video_generation,
        mascot_media_mode: "static",
      },
    });

    const { result } = renderHook(() =>
      useVideoSettingsState({
        appConfig: baseConfig,
        onVideoSaved,
        onNotice,
      }),
    );

    act(() => {
      result.current.setMascotMediaMode("static");
    });

    const fakeEvent = { preventDefault: vi.fn() } as unknown as React.FormEvent;
    await act(async () => {
      await result.current.saveVideo(fakeEvent);
    });

    expect(mockSaveVideoSettings).toHaveBeenCalledWith(
      expect.objectContaining({
        mascot_media_mode: "static",
      }),
    );
    expect(onVideoSaved).toHaveBeenCalled();
    expect(onNotice).toHaveBeenCalledWith({
      tone: "good",
      message: "Video settings saved locally",
    });
  });
});
