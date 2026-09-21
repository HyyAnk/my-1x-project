import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import type { MascotProfile, MascotStyleBatchJob } from "@studio/shared";
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

const mockMascot: MascotProfile = {
  id: "mascot-test-1",
  name: "Robo Fox",
  description: "A clever robo fox",
  visual_style: "pixar_3d",
  master_prompt: "fox with neon circuits",
  master_image_url: "https://example.com/master.png",
  color_theme: "#06b6d4",
  actions: {},
  styles: [
    {
      id: "core",
      name: "Core Style",
      built_in_preset_id: "preset_arcade_classic",
      keyword: "classic",
      is_default: true,
      anchor_image_url: "https://example.com/core.png",
      states: { thinking: [], celebrate: [] },
      created_at: "2026-09-01T00:00:00.000Z",
      updated_at: "2026-09-01T00:00:00.000Z",
    },
    {
      id: "style-cyber",
      name: "Cyber Neon",
      built_in_preset_id: "preset_cyber_neon",
      keyword: "neon armor",
      is_default: false,
      anchor_image_url: null,
      states: { thinking: [], celebrate: [] },
      created_at: "2026-09-01T00:00:00.000Z",
      updated_at: "2026-09-01T00:00:00.000Z",
    },
    {
      id: "style-stealth",
      name: "Stealth",
      built_in_preset_id: "preset_comic_boom",
      keyword: "shadow stealth",
      is_default: false,
      anchor_image_url: null,
      states: { thinking: [], celebrate: [] },
      created_at: "2026-09-01T00:00:00.000Z",
      updated_at: "2026-09-01T00:00:00.000Z",
    },
  ],
  active_style_id: "core",
  assigned_channel_ids: [],
  created_at: "2026-09-01T00:00:00.000Z",
  updated_at: "2026-09-01T00:00:00.000Z",
};

describe("useMascotStyleQueue", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.getStyleGenerationStatus).mockResolvedValue({
      active_batch: null,
      queued_style_ids: [],
      active_style_ids: [],
    });
  });

  it("initializes with null queue progress and idle state", () => {
    const onMascotUpdated = vi.fn();
    const onNotice = vi.fn();

    const { result } = renderHook(() =>
      useMascotStyleQueue({
        mascot: mockMascot,
        onMascotUpdated,
        onNotice,
      }),
    );

    expect(result.current.activeBatch).toBeNull();
    expect(result.current.queuedStyleIds).toEqual([]);
    expect(result.current.activeStyleIds).toEqual([]);
    expect(result.current.styleQueueProgress).toBeNull();
  });

  it("queues a style and starts polling", async () => {
    const onMascotUpdated = vi.fn();
    const onNotice = vi.fn();

    const mockBatch: MascotStyleBatchJob = {
      id: "batch-1",
      mascot_id: mockMascot.id,
      status: "processing",
      total_styles: 1,
      completed_count: 0,
      failed_count: 0,
      active_style_ids: ["style-cyber"],
      items: [
        {
          id: "job-1",
          mascot_id: mockMascot.id,
          style_id: "style-cyber",
          style_name: "Cyber Neon",
          status: "generating",
          created_at: "2026-09-18T10:00:00.000Z",
        },
      ],
      created_at: "2026-09-18T10:00:00.000Z",
      updated_at: "2026-09-18T10:00:00.000Z",
    };

    vi.mocked(api.queueStyleGeneration).mockResolvedValue(mockBatch);
    vi.mocked(api.getStyleGenerationStatus).mockResolvedValue({
      active_batch: mockBatch,
      queued_style_ids: [],
      active_style_ids: ["style-cyber"],
    });

    const { result } = renderHook(() =>
      useMascotStyleQueue({
        mascot: mockMascot,
        onMascotUpdated,
        onNotice,
      }),
    );

    await act(async () => {
      await result.current.handleQueueStyle("style-cyber", "manual cyber prompt");
    });

    expect(api.queueStyleGeneration).toHaveBeenCalledWith(mockMascot.id, {
      styles: [{ style_id: "style-cyber", style_name: "Cyber Neon", prompt: "manual cyber prompt" }],
      mode: "single",
    });

    expect(result.current.activeBatch).toEqual(mockBatch);
    expect(result.current.styleQueueProgress).not.toBeNull();
    expect(result.current.styleQueueProgress?.total).toBe(1);
  });

  it("recovers in-flight batch on mount", async () => {
    const onMascotUpdated = vi.fn();
    const onNotice = vi.fn();

    const activeBatch: MascotStyleBatchJob = {
      id: "batch-recover",
      mascot_id: mockMascot.id,
      status: "processing",
      total_styles: 2,
      completed_count: 1,
      failed_count: 0,
      active_style_ids: ["style-stealth"],
      items: [
        {
          id: "job-1",
          mascot_id: mockMascot.id,
          style_id: "style-cyber",
          style_name: "Cyber Neon",
          status: "completed",
          created_at: "2026-09-18T10:00:00.000Z",
        },
        {
          id: "job-2",
          mascot_id: mockMascot.id,
          style_id: "style-stealth",
          style_name: "Stealth",
          status: "generating",
          created_at: "2026-09-18T10:00:00.000Z",
        },
      ],
      created_at: "2026-09-18T10:00:00.000Z",
      updated_at: "2026-09-18T10:01:00.000Z",
    };

    vi.mocked(api.getStyleGenerationStatus).mockResolvedValue({
      active_batch: activeBatch,
      queued_style_ids: [],
      active_style_ids: ["style-stealth"],
    });

    vi.mocked(api.mascot).mockResolvedValue({ mascot: mockMascot });

    const { result } = renderHook(() =>
      useMascotStyleQueue({
        mascot: mockMascot,
        onMascotUpdated,
        onNotice,
      }),
    );

    // Wait for recovery effect
    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.activeBatch).toEqual(activeBatch);
    expect(result.current.styleQueueProgress?.total).toBe(2);
    expect(result.current.styleQueueProgress?.completed).toBe(1);
    expect(onNotice).toHaveBeenCalledWith(
      expect.objectContaining({
        tone: "neutral",
        message: expect.stringContaining("Reconnected to background style generation"),
      }),
    );
  });

  it("recovers after the first Strict Mode effect is cleaned up before its request resolves", async () => {
    const activeBatch: MascotStyleBatchJob = {
      id: "batch-strict-recover",
      mascot_id: mockMascot.id,
      status: "processing",
      total_styles: 1,
      completed_count: 0,
      failed_count: 0,
      active_style_ids: ["style-cyber"],
      items: [
        {
          id: "job-strict-recover",
          mascot_id: mockMascot.id,
          style_id: "style-cyber",
          style_name: "Cyber Neon",
          status: "generating",
          created_at: "2026-09-18T10:00:00.000Z",
        },
      ],
      created_at: "2026-09-18T10:00:00.000Z",
      updated_at: "2026-09-18T10:00:00.000Z",
    };
    let resolveFirstRequest: (value: { active_batch: null; queued_style_ids: string[]; active_style_ids: string[] }) => void = () =>
      undefined;

    vi.mocked(api.getStyleGenerationStatus)
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveFirstRequest = resolve;
          }),
      )
      .mockResolvedValue({
        active_batch: activeBatch,
        queued_style_ids: [],
        active_style_ids: ["style-cyber"],
      });
    vi.mocked(api.mascot).mockResolvedValue({ mascot: mockMascot });

    const { result, unmount } = renderHook(
      () =>
        useMascotStyleQueue({
          mascot: mockMascot,
          onMascotUpdated: vi.fn(),
          onNotice: vi.fn(),
        }),
      { reactStrictMode: true },
    );

    await waitFor(() => expect(result.current.activeBatch?.id).toBe(activeBatch.id));
    expect(vi.mocked(api.getStyleGenerationStatus).mock.calls.length).toBeGreaterThanOrEqual(2);

    resolveFirstRequest({ active_batch: null, queued_style_ids: [], active_style_ids: [] });
    await act(async () => Promise.resolve());
    expect(result.current.activeBatch?.id).toBe(activeBatch.id);
    unmount();
  });

  it("stops queue when handleStopStyleQueue is called", async () => {
    const onMascotUpdated = vi.fn();
    const onNotice = vi.fn();

    vi.mocked(api.cancelStyleGeneration).mockResolvedValue({
      ok: true,
      batch: null,
    });

    const { result } = renderHook(() =>
      useMascotStyleQueue({
        mascot: mockMascot,
        onMascotUpdated,
        onNotice,
      }),
    );

    await act(async () => {
      await result.current.handleStopStyleQueue();
    });

    expect(api.cancelStyleGeneration).toHaveBeenCalledWith(mockMascot.id);
  });
});
