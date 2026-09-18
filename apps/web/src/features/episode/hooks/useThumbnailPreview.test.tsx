import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, render, screen, fireEvent } from "@testing-library/react";
import type { Channel, Episode, ThumbnailManifest, Task } from "@studio/shared";
import { episodeApi } from "../../../api/episodeApi";
import { useThumbnailPreview } from "./useThumbnailPreview";
import { ThumbnailPreviewCard } from "../components/ThumbnailPreviewCard";

const sampleManifest: ThumbnailManifest = {
  episode_id: "ep-202",
  channel_id: "ch-101",
  layout: "mega_grid",
  hook_text: "Top 10 Ancient Wonders",
  badge_text: "99% FAIL!",
  mascot_persona: "",
  active_16_9_id: "var-1",
  active_9_16_id: "var-2",
  asset_path_16_9: "/thumbnails/ep-1_16_9.png",
  asset_path_9_16: "/thumbnails/ep-1_9_16.png",
  prompt_16_9: null,
  prompt_9_16: null,
  created_at: "2026-09-01T00:00:00Z",
  updated_at: "2026-09-01T00:00:00Z",
  history: [
    {
      id: "var-1",
      aspect_ratio: "16:9",
      file_path: "/thumbnails/ep-1_16_9.png",
      layout: "mega_grid",
      hook_text: "Top 10 Ancient Wonders",
      badge_text: "99% FAIL!",
      is_active: true,
      created_at: "2026-09-01T00:00:00Z",
    },
    {
      id: "var-3",
      aspect_ratio: "16:9",
      file_path: "/thumbnails/ep-1_16_9_v2.png",
      layout: "split_vs",
      hook_text: "Which Ancient Wonder?",
      badge_text: "CAN YOU PASS?",
      is_active: false,
      created_at: "2026-09-01T01:00:00Z",
    },
    {
      id: "var-2",
      aspect_ratio: "9:16",
      file_path: "/thumbnails/ep-1_9_16.png",
      layout: "odd_one_out",
      hook_text: "Find the Fake Wonder",
      badge_text: "GENIUS ONLY",
      is_active: true,
      created_at: "2026-09-01T00:00:00Z",
    },
  ],
};

const sampleChannel = {
  channel_id: "ch-101",
  display_name: "History Secrets",
} as Channel;

const sampleEpisode = {
  episode_id: "ep-202",
  channel_id: "ch-101",
  slug: "ancient-wonders",
  updated_at: "2026-09-01T00:00:00Z",
  thumbnail_asset_path_16_9: "/thumbnails/ep-1_16_9.png",
  thumbnail_asset_path_9_16: "/thumbnails/ep-1_9_16.png",
  quiz_config: {
    thumbnail_aspect_ratio: "16:9",
  },
} as Episode;

describe("useThumbnailPreview hook", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(async () => {
    vi.clearAllTimers();
    vi.useRealTimers();
    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });
  });

  it("initializes with 16:9 ratio and fetches manifest", async () => {
    vi.spyOn(episodeApi, "getThumbnail").mockResolvedValue({ manifest: sampleManifest });

    const { result } = renderHook(() =>
      useThumbnailPreview({
        channel: sampleChannel,
        episode: sampleEpisode,
        episodeId: "ep-202",
      }),
    );

    expect(result.current.activeRatio).toBe("16:9");
    expect(result.current.selectedLayout).toBe("auto");
    expect(result.current.selectedBadge).toBe("auto");

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.manifest).toEqual(sampleManifest);
    expect(result.current.customHook).toBe("Top 10 Ancient Wonders");
    expect(result.current.historyList).toHaveLength(2);
    expect(result.current.hasImage).toBe(true);
    expect(result.current.hasAnyThumbnail).toBe(true);
  });

  it("initializes with 9:16 ratio when configured in episode quiz_config", async () => {
    vi.spyOn(episodeApi, "getThumbnail").mockResolvedValue({ manifest: null });

    const shortEpisode = {
      ...sampleEpisode,
      quiz_config: { thumbnail_aspect_ratio: "9:16" },
    } as Episode;

    const { result } = renderHook(() =>
      useThumbnailPreview({
        channel: sampleChannel,
        episode: shortEpisode,
        episodeId: "ep-202",
      }),
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.activeRatio).toBe("9:16");
  });

  it("updates active ratio when episode quiz_config prop changes", async () => {
    vi.spyOn(episodeApi, "getThumbnail").mockResolvedValue({ manifest: null });

    let currentConfig = "16:9";
    const { result, rerender } = renderHook(
      (props) =>
        useThumbnailPreview({
          channel: sampleChannel,
          episode: { ...sampleEpisode, quiz_config: { thumbnail_aspect_ratio: props.ratio } } as Episode,
          episodeId: "ep-202",
        }),
      { initialProps: { ratio: currentConfig } },
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.activeRatio).toBe("16:9");

    currentConfig = "9:16";
    rerender({ ratio: currentConfig });

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.activeRatio).toBe("9:16");
  });

  it("handles carousel index navigation between variants", async () => {
    vi.spyOn(episodeApi, "getThumbnail").mockResolvedValue({ manifest: sampleManifest });

    const { result } = renderHook(() =>
      useThumbnailPreview({
        channel: sampleChannel,
        episode: sampleEpisode,
        episodeId: "ep-202",
      }),
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.carouselIndex).toBe(0);

    act(() => {
      result.current.handleNextVariant();
    });
    expect(result.current.carouselIndex).toBe(1);

    act(() => {
      result.current.handleNextVariant();
    });
    expect(result.current.carouselIndex).toBe(1);

    act(() => {
      result.current.handlePrevVariant();
    });
    expect(result.current.carouselIndex).toBe(0);

    act(() => {
      result.current.handlePrevVariant();
    });
    expect(result.current.carouselIndex).toBe(0);
  });

  it("generates thumbnail and calls onNotice and onUpdated", async () => {
    vi.spyOn(episodeApi, "getThumbnail").mockResolvedValue({ manifest: sampleManifest });
    vi.spyOn(episodeApi, "generateThumbnail").mockResolvedValue({
      ok: true,
      manifest: { ...sampleManifest, hook_text: "Brand New Hook" },
    });

    const onNotice = vi.fn();
    const onUpdated = vi.fn().mockResolvedValue(undefined);

    const { result } = renderHook(() =>
      useThumbnailPreview({
        channel: sampleChannel,
        episode: sampleEpisode,
        episodeId: "ep-202",
        onNotice,
        onUpdated,
      }),
    );

    await act(async () => {
      await Promise.resolve();
    });

    await act(async () => {
      await result.current.handleGenerateThumbnail();
    });

    expect(episodeApi.generateThumbnail).toHaveBeenCalledWith(
      "ch-101",
      "ep-202",
      expect.objectContaining({
        aspect_ratio: "16:9",
      }),
    );
    expect(onUpdated).toHaveBeenCalled();
    expect(onNotice).toHaveBeenCalledWith({
      tone: "good",
      message: "Thumbnail (16:9) synthesized successfully matching video mode!",
    });
  });

  it("handles generate thumbnail failure cleanly", async () => {
    vi.spyOn(episodeApi, "getThumbnail").mockResolvedValue({ manifest: null });
    vi.spyOn(episodeApi, "generateThumbnail").mockRejectedValue(new Error("AI generation timeout"));

    const onNotice = vi.fn();

    const { result } = renderHook(() =>
      useThumbnailPreview({
        channel: sampleChannel,
        episode: sampleEpisode,
        episodeId: "ep-202",
        onNotice,
      }),
    );

    await act(async () => {
      await result.current.handleGenerateThumbnail();
    });

    expect(onNotice).toHaveBeenCalledWith({
      tone: "bad",
      message: "Failed to generate thumbnail: AI generation timeout",
    });
    expect(result.current.generating).toBe(false);
  });

  it("resets controls to defaults via handleResetDefaults", () => {
    vi.spyOn(episodeApi, "getThumbnail").mockResolvedValue({ manifest: null });
    const onNotice = vi.fn();

    const { result } = renderHook(() =>
      useThumbnailPreview({
        channel: sampleChannel,
        episode: sampleEpisode,
        episodeId: "ep-202",
        onNotice,
      }),
    );

    act(() => {
      result.current.setSelectedLayout("split_vs");
      result.current.setSelectedBadge("genius_only");
      result.current.setCustomHook("Custom Hook");
    });

    expect(result.current.selectedLayout).toBe("split_vs");
    expect(result.current.selectedBadge).toBe("genius_only");
    expect(result.current.customHook).toBe("Custom Hook");

    act(() => {
      result.current.handleResetDefaults();
    });

    expect(result.current.selectedLayout).toBe("auto");
    expect(result.current.selectedBadge).toBe("auto");
    expect(result.current.customHook).toBe("");
    expect(onNotice).toHaveBeenCalledWith({
      tone: "good",
      message: "Reset thumbnail controls to automatic script intelligence!",
    });
  });

  it("activates thumbnail version via handleSetActive", async () => {
    vi.spyOn(episodeApi, "getThumbnail").mockResolvedValue({ manifest: sampleManifest });
    vi.spyOn(episodeApi, "setActiveThumbnail").mockResolvedValue({
      ok: true,
      manifest: sampleManifest,
    });

    const onNotice = vi.fn();
    const onUpdated = vi.fn();

    const { result } = renderHook(() =>
      useThumbnailPreview({
        channel: sampleChannel,
        episode: sampleEpisode,
        episodeId: "ep-202",
        onNotice,
        onUpdated,
      }),
    );

    await act(async () => {
      await result.current.handleSetActive("var-3");
    });

    expect(episodeApi.setActiveThumbnail).toHaveBeenCalledWith("ch-101", "ep-202", "var-3");
    expect(onUpdated).toHaveBeenCalled();
    expect(onNotice).toHaveBeenCalledWith({
      tone: "good",
      message: "Version activated as main thumbnail for 16:9!",
    });
  });

  it("deletes thumbnail version via handleDeleteVariant", async () => {
    vi.spyOn(episodeApi, "getThumbnail").mockResolvedValue({ manifest: sampleManifest });
    vi.spyOn(episodeApi, "deleteThumbnailVariant").mockResolvedValue({
      ok: true,
      manifest: sampleManifest,
    });

    const onNotice = vi.fn();
    const onUpdated = vi.fn();

    const { result } = renderHook(() =>
      useThumbnailPreview({
        channel: sampleChannel,
        episode: sampleEpisode,
        episodeId: "ep-202",
        onNotice,
        onUpdated,
      }),
    );

    await act(async () => {
      await result.current.handleDeleteVariant("var-3");
    });

    expect(episodeApi.deleteThumbnailVariant).toHaveBeenCalledWith("ch-101", "ep-202", "var-3");
    expect(onUpdated).toHaveBeenCalled();
    expect(onNotice).toHaveBeenCalledWith({
      tone: "good",
      message: "Thumbnail version deleted.",
    });
  });

  it("auto-polls when activeEpisodeTask is RUNNING", () => {
    vi.useFakeTimers();
    const getThumbnailSpy = vi.spyOn(episodeApi, "getThumbnail").mockResolvedValue({ manifest: sampleManifest });

    const activeTask = {
      task_id: "t-1",
      status: "RUNNING",
    } as Task;

    const { unmount } = renderHook(() =>
      useThumbnailPreview({
        channel: sampleChannel,
        episode: sampleEpisode,
        episodeId: "ep-202",
        activeEpisodeTask: activeTask,
      }),
    );

    expect(getThumbnailSpy).toHaveBeenCalledTimes(1);

    act(() => {
      vi.advanceTimersByTime(2500);
    });
    expect(getThumbnailSpy).toHaveBeenCalledTimes(2);

    act(() => {
      vi.advanceTimersByTime(2500);
    });
    expect(getThumbnailSpy).toHaveBeenCalledTimes(3);

    act(() => {
      unmount();
    });
    vi.clearAllTimers();
    vi.useRealTimers();
  });
});

describe("ThumbnailPreviewCard component", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders studio header, segmented buttons and switches active aspect ratio", () => {
    vi.spyOn(episodeApi, "getThumbnail").mockResolvedValue({ manifest: sampleManifest });

    render(<ThumbnailPreviewCard channel={sampleChannel} episode={sampleEpisode} episodeId="ep-202" />);

    expect(screen.getByText("YouTube Thumbnail Studio")).toBeDefined();
    expect(screen.getByText("Dual-Ratio AI")).toBeDefined();

    const button169 = screen.getByRole("tab", { name: /16:9 Video/i });
    const button916 = screen.getByRole("tab", { name: /9:16 Shorts Cover/i });

    expect(button169).toBeDefined();
    expect(button916).toBeDefined();
    expect(button169.getAttribute("aria-selected")).toBe("true");
    expect(button916.getAttribute("aria-selected")).toBe("false");

    fireEvent.click(button916);
    expect(button916.getAttribute("aria-selected")).toBe("true");
    expect(button169.getAttribute("aria-selected")).toBe("false");
  });
});
