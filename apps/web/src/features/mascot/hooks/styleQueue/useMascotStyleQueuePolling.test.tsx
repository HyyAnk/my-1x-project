import { act, renderHook } from "@testing-library/react";
import type { MascotProfile, MascotStyleBatchJob, StyleBatchStatusResponse } from "@studio/shared";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "../../../../api";
import { useMascotStyleQueue } from "./useMascotStyleQueue";

vi.mock("../../../../api", () => ({
  api: {
    queueStyleGeneration: vi.fn(),
    getStyleGenerationStatus: vi.fn(),
    cancelStyleGeneration: vi.fn(),
    mascot: vi.fn(),
  },
}));

const mascot: MascotProfile = {
  id: "mascot-polling",
  name: "Robo Fox",
  description: "A clever robo fox",
  visual_style: "pixar_3d",
  master_prompt: "fox with neon circuits",
  master_image_url: "/assets/master.png",
  color_theme: "#06b6d4",
  actions: {},
  styles: [
    {
      id: "style-cyber",
      name: "Cyber Neon Pulse",
      built_in_preset_id: "preset_cyber_neon",
      keyword: "neon armor",
      is_default: false,
      anchor_image_url: "/assets/cyber-old.png",
      states: { thinking: [], celebrate: [] },
      created_at: "2026-09-20T00:00:00.000Z",
      updated_at: "2026-09-20T00:00:00.000Z",
    },
  ],
  active_style_id: "style-cyber",
  assigned_channel_ids: [],
  created_at: "2026-09-20T00:00:00.000Z",
  updated_at: "2026-09-20T00:00:00.000Z",
};

const refreshedMascot: MascotProfile = {
  ...mascot,
  styles: (mascot.styles || []).map((style) => ({
    ...style,
    anchor_image_url: "/assets/cyber-new.png",
    style_revision: 2,
    updated_at: "2026-09-20T00:01:00.000Z",
  })),
  updated_at: "2026-09-20T00:01:00.000Z",
};

function createBatch(status: MascotStyleBatchJob["status"]): MascotStyleBatchJob {
  const isSettled = status === "completed";
  return {
    id: "batch-cyber-regenerate",
    mascot_id: mascot.id,
    status,
    total_styles: 1,
    completed_count: isSettled ? 1 : 0,
    failed_count: 0,
    active_style_ids: isSettled ? [] : ["style-cyber"],
    items: [
      {
        id: "job-cyber-regenerate",
        mascot_id: mascot.id,
        style_id: "style-cyber",
        style_name: "Cyber Neon Pulse",
        status: isSettled ? "completed" : "generating",
        prompt: "new neon suit",
        anchor_image_url: isSettled ? "/assets/cyber-new.png" : null,
        created_at: "2026-09-20T00:00:00.000Z",
        completed_at: isSettled ? "2026-09-20T00:01:00.000Z" : null,
      },
    ],
    created_at: "2026-09-20T00:00:00.000Z",
    updated_at: isSettled ? "2026-09-20T00:01:00.000Z" : "2026-09-20T00:00:01.000Z",
  };
}

const emptyStatus: StyleBatchStatusResponse = {
  active_batch: null,
  queued_style_ids: [],
  active_style_ids: [],
};

async function flushPromises(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

describe("useMascotStyleQueue polling lifecycle", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("keeps polling after queue state rerenders and refreshes a batch that moved to recent history", async () => {
    const activeBatch = createBatch("processing");
    const completedBatch = createBatch("completed");
    vi.mocked(api.queueStyleGeneration).mockResolvedValue(activeBatch);
    vi.mocked(api.getStyleGenerationStatus)
      .mockResolvedValueOnce(emptyStatus)
      .mockResolvedValueOnce({ active_batch: activeBatch, queued_style_ids: [], active_style_ids: ["style-cyber"] })
      .mockResolvedValueOnce({ ...emptyStatus, recent_batches: [completedBatch] });
    vi.mocked(api.mascot).mockResolvedValue({ mascot: refreshedMascot });

    const onMascotUpdated = vi.fn();
    const { result, unmount } = renderHook(() => useMascotStyleQueue({ mascot, onMascotUpdated, onNotice: vi.fn() }));

    await act(flushPromises);
    await act(async () => {
      await result.current.handleQueueStyle("style-cyber", "new neon suit");
      await flushPromises();
    });
    expect(api.getStyleGenerationStatus).toHaveBeenCalledTimes(2);

    await act(async () => {
      vi.advanceTimersByTime(1500);
      await flushPromises();
    });

    expect(api.getStyleGenerationStatus).toHaveBeenCalledTimes(3);
    expect(api.mascot).toHaveBeenCalledWith(mascot.id);
    expect(onMascotUpdated).toHaveBeenCalledWith(refreshedMascot);
    expect(result.current.queuedStyleIds).toEqual([]);
    expect(result.current.activeStyleIds).toEqual([]);
    unmount();
  });

  it("catches up immediately when the browser tab becomes visible", async () => {
    const activeBatch = createBatch("processing");
    const completedBatch = createBatch("completed");
    vi.mocked(api.queueStyleGeneration).mockResolvedValue(activeBatch);
    vi.mocked(api.getStyleGenerationStatus)
      .mockResolvedValueOnce(emptyStatus)
      .mockResolvedValueOnce({ active_batch: activeBatch, queued_style_ids: [], active_style_ids: ["style-cyber"] })
      .mockResolvedValueOnce({ ...emptyStatus, recent_batches: [completedBatch] });
    vi.mocked(api.mascot).mockResolvedValue({ mascot: refreshedMascot });

    const onMascotUpdated = vi.fn();
    const { result, unmount } = renderHook(() => useMascotStyleQueue({ mascot, onMascotUpdated, onNotice: vi.fn() }));

    await act(flushPromises);
    await act(async () => {
      await result.current.handleQueueStyle("style-cyber", "new neon suit");
      await flushPromises();
    });

    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"));
      await flushPromises();
    });

    expect(api.getStyleGenerationStatus).toHaveBeenCalledTimes(3);
    expect(onMascotUpdated).toHaveBeenCalledWith(refreshedMascot);
    unmount();
  });
});
