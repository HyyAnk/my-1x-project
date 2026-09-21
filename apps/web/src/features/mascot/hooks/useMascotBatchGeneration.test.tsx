import { renderHook, act, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MascotProfile, MascotSlotBatchJob, MascotStyle } from "@studio/shared";
import { useMascotBatchGeneration } from "./useMascotBatchGeneration";
import { clearBatchSessionAcknowledgements } from "../utils/mascotSessionStorage";
import { api } from "../../../api";

const mockMascot: MascotProfile = {
  id: "mascot-hook-test",
  name: "Hook Mascot",
  description: "Test description",
  visual_style: "pixar_3d",
  master_prompt: "Cute character",
  master_image_url: "https://example.com/master.png",
  color_theme: "#10b981",
  actions: {},
  assigned_channel_ids: [],
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
  styles: [
    {
      id: "core",
      name: "Core Style",
      keyword: "",
      anchor_image_url: null,
      raw_anchor_image_url: null,
      is_default: true,
      states: {
        thinking: [
          {
            id: "slot_1",
            slot_index: 1,
            image_url: "https://example.com/single.png",
          },
        ],
        celebrate: [],
      },
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
    },
  ],
};

const mockStyle: MascotStyle = mockMascot.styles![0]!;

describe("useMascotBatchGeneration hook", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    clearBatchSessionAcknowledgements();
  });

  it("initializes with idle state when no server batch is active", async () => {
    vi.spyOn(api, "getSlotGenerationStatus").mockResolvedValue({
      active_batch: null,
      queued_slot_keys: [],
      active_slot_keys: [],
    });

    const onMascotUpdated = vi.fn();
    const onNotice = vi.fn();

    const { result } = renderHook(() =>
      useMascotBatchGeneration({
        mascot: mockMascot,
        activeStyleId: "core",
        activeStyle: mockStyle,
        onMascotUpdated,
        onNotice,
      }),
    );

    expect(result.current.busySlotKey).toBeNull();
    expect(result.current.queuedSlotKeys).toEqual([]);
    expect(result.current.batchProgress).toBeNull();
  });

  it("restores active batch state on mount (F5 state recovery)", async () => {
    const activeBatch: MascotSlotBatchJob = {
      id: "batch_f5_test",
      mascot_id: "mascot-hook-test",
      style_id: "core",
      status: "processing",
      total_slots: 9,
      completed_count: 3,
      failed_count: 0,
      active_slot_keys: ["thinking_4", "thinking_5"],
      items: [
        {
          id: "job_t2",
          mascot_id: "mascot-hook-test",
          style_id: "core",
          state: "thinking",
          slot_index: 2,
          status: "completed",
          prompt_used: "pondering deeply",
          created_at: "2026-01-01T00:00:00Z",
        },
        {
          id: "job_t3",
          mascot_id: "mascot-hook-test",
          style_id: "core",
          state: "thinking",
          slot_index: 3,
          status: "completed",
          prompt_used: "scratching chin",
          created_at: "2026-01-01T00:00:00Z",
        },
        {
          id: "job_t4",
          mascot_id: "mascot-hook-test",
          style_id: "core",
          state: "thinking",
          slot_index: 4,
          status: "generating",
          created_at: "2026-01-01T00:00:00Z",
        },
        {
          id: "job_t5",
          mascot_id: "mascot-hook-test",
          style_id: "core",
          state: "thinking",
          slot_index: 5,
          status: "generating",
          created_at: "2026-01-01T00:00:00Z",
        },
        {
          id: "job_t6",
          mascot_id: "mascot-hook-test",
          style_id: "core",
          state: "thinking",
          slot_index: 6,
          status: "queued",
          created_at: "2026-01-01T00:00:00Z",
        },
      ],
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    };

    vi.spyOn(api, "getSlotGenerationStatus").mockResolvedValue({
      active_batch: activeBatch,
      queued_slot_keys: ["thinking_6"],
      active_slot_keys: ["thinking_4", "thinking_5"],
    });

    const onMascotUpdated = vi.fn();
    const onNotice = vi.fn();

    const { result } = renderHook(() =>
      useMascotBatchGeneration({
        mascot: mockMascot,
        activeStyleId: "core",
        activeStyle: mockStyle,
        onMascotUpdated,
        onNotice,
      }),
    );

    await waitFor(() => {
      expect(result.current.batchProgress).not.toBeNull();
    });

    expect(result.current.batchProgress?.total).toBe(9);
    expect(result.current.batchProgress?.completed).toBe(3);
    expect(result.current.batchProgress?.activeSlotKeys).toEqual(["thinking_4", "thinking_5"]);
    expect(result.current.batchProgress?.targetState).toBe("thinking");
    expect(result.current.busySlotKey).toBe("batch");
    expect(result.current.queuedSlotKeys).toContain("thinking_6");
    expect(onNotice).toHaveBeenCalledWith(
      expect.objectContaining({
        tone: "neutral",
        message: expect.stringContaining("Reconnected to background generation: 3/9 slots completed (2 active streams)"),
      }),
    );
  });

  it("finds an active batch owned by a non-selected style after reload", async () => {
    const cyberStyle: MascotStyle = {
      ...mockStyle,
      id: "style-cyber",
      name: "Cyber Neon Pulse",
      is_default: false,
    };
    const mascotWithTwoStyles: MascotProfile = {
      ...mockMascot,
      styles: [mockStyle, cyberStyle],
    };
    const activeBatch: MascotSlotBatchJob = {
      id: "batch-cyber-recovery",
      mascot_id: mockMascot.id,
      style_id: cyberStyle.id,
      status: "processing",
      total_slots: 4,
      completed_count: 1,
      failed_count: 0,
      active_slot_keys: ["celebrate_2"],
      items: [
        {
          id: "job-cyber-2",
          mascot_id: mockMascot.id,
          style_id: cyberStyle.id,
          state: "celebrate",
          slot_index: 2,
          status: "generating",
          created_at: "2026-09-20T00:00:00.000Z",
        },
      ],
      created_at: "2026-09-20T00:00:00.000Z",
      updated_at: "2026-09-20T00:00:01.000Z",
    };

    vi.spyOn(api, "getSlotGenerationStatus").mockImplementation(async (_mascotId, styleId) =>
      styleId === cyberStyle.id
        ? {
            active_batch: activeBatch,
            queued_slot_keys: ["celebrate_3"],
            active_slot_keys: ["celebrate_2"],
          }
        : { active_batch: null, queued_slot_keys: [], active_slot_keys: [] },
    );
    vi.spyOn(api, "mascot").mockResolvedValue({ mascot: mascotWithTwoStyles });
    const onActiveStyleRecovered = vi.fn();

    const { result } = renderHook(() =>
      useMascotBatchGeneration({
        mascot: mascotWithTwoStyles,
        activeStyleId: "core",
        activeStyle: mockStyle,
        onMascotUpdated: vi.fn(),
        onNotice: vi.fn(),
        onActiveStyleRecovered,
      }),
    );

    await waitFor(() => expect(result.current.batchProgress?.styleId).toBe(cyberStyle.id));
    expect(result.current.batchProgress?.batchId).toBe(activeBatch.id);
    expect(result.current.batchProgress?.styleName).toBe(cyberStyle.name);
    expect(onActiveStyleRecovered).toHaveBeenCalledWith(cyberStyle.id);
    expect(api.getSlotGenerationStatus).toHaveBeenCalledWith(mockMascot.id, "core");
    expect(api.getSlotGenerationStatus).toHaveBeenCalledWith(mockMascot.id, cyberStyle.id);
  });

  it("polls until completion, updates mascot in real-time, and clears state", async () => {
    let pollCount = 0;
    const initialBatch: MascotSlotBatchJob = {
      id: "batch_poll_test",
      mascot_id: "mascot-hook-test",
      style_id: "core",
      status: "processing",
      total_slots: 2,
      completed_count: 0,
      failed_count: 0,
      active_slot_keys: ["celebrate_1", "celebrate_2"],
      items: [
        {
          id: "job_c1",
          mascot_id: "mascot-hook-test",
          style_id: "core",
          state: "celebrate",
          slot_index: 1,
          status: "generating",
          created_at: "2026-01-01T00:00:00Z",
        },
        {
          id: "job_c2",
          mascot_id: "mascot-hook-test",
          style_id: "core",
          state: "celebrate",
          slot_index: 2,
          status: "generating",
          created_at: "2026-01-01T00:00:00Z",
        },
      ],
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    };

    vi.spyOn(api, "queueSlotGeneration").mockResolvedValue(initialBatch);

    vi.spyOn(api, "getSlotGenerationStatus").mockImplementation(async () => {
      pollCount++;
      if (pollCount === 1) {
        // Initial hook mount: idle
        return { active_batch: null, queued_slot_keys: [], active_slot_keys: [] };
      }
      if (pollCount === 2) {
        // Poll 1: 1 completed slot
        return {
          active_batch: {
            ...initialBatch,
            completed_count: 1,
            active_slot_keys: ["celebrate_2"],
          },
          queued_slot_keys: [],
          active_slot_keys: ["celebrate_2"],
        };
      }
      // Poll 2: completed batch
      return {
        active_batch: {
          ...initialBatch,
          status: "completed",
          completed_count: 2,
          active_slot_keys: [],
        },
        queued_slot_keys: [],
        active_slot_keys: [],
      };
    });

    const updatedMascot: MascotProfile = {
      ...mockMascot,
      updated_at: "2026-01-01T00:00:01.000Z",
    };
    vi.spyOn(api, "mascot").mockResolvedValue({ mascot: updatedMascot });

    const onMascotUpdated = vi.fn();
    const onNotice = vi.fn();

    const { result } = renderHook(() =>
      useMascotBatchGeneration({
        mascot: mockMascot,
        activeStyleId: "core",
        activeStyle: mockStyle,
        onMascotUpdated,
        onNotice,
      }),
    );

    await act(async () => {
      await result.current.handleBatchGenerateStyle("celebrate");
    });

    expect(api.queueSlotGeneration).toHaveBeenCalledWith(
      "mascot-hook-test",
      "core",
      expect.objectContaining({
        style_id: "core",
        mode: "batch_empty",
      }),
    );

    await waitFor(
      () => {
        expect(onMascotUpdated).toHaveBeenCalledWith(updatedMascot);
        expect(result.current.busySlotKey).toBeNull();
        expect(result.current.batchProgress).toBeNull();
        expect(onNotice).toHaveBeenCalledWith(
          expect.objectContaining({
            tone: "good",
            message: expect.stringContaining("2/2 slots generated"),
          }),
        );
      },
      { timeout: 3000 },
    );
  });

  it("stops and cancels batch generation early", async () => {
    const activeBatch: MascotSlotBatchJob = {
      id: "batch_stop_test",
      mascot_id: "mascot-hook-test",
      style_id: "core",
      status: "processing",
      total_slots: 5,
      completed_count: 1,
      failed_count: 0,
      active_slot_keys: ["thinking_2"],
      items: [
        {
          id: "job_t2",
          mascot_id: "mascot-hook-test",
          style_id: "core",
          state: "thinking",
          slot_index: 2,
          status: "generating",
          created_at: "2026-01-01T00:00:00Z",
        },
      ],
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    };

    let isCancelled = false;
    vi.spyOn(api, "getSlotGenerationStatus").mockImplementation(async () => {
      if (isCancelled) {
        return {
          active_batch: {
            ...activeBatch,
            status: "cancelled",
          },
          queued_slot_keys: [],
          active_slot_keys: [],
        };
      }
      return {
        active_batch: activeBatch,
        queued_slot_keys: ["thinking_3"],
        active_slot_keys: ["thinking_2"],
      };
    });

    vi.spyOn(api, "cancelSlotGeneration").mockImplementation(async () => {
      isCancelled = true;
      return {
        ok: true,
        batch: {
          ...activeBatch,
          status: "cancelled",
        },
      };
    });

    const onMascotUpdated = vi.fn();
    const onNotice = vi.fn();

    const { result } = renderHook(() =>
      useMascotBatchGeneration({
        mascot: mockMascot,
        activeStyleId: "core",
        activeStyle: mockStyle,
        onMascotUpdated,
        onNotice,
      }),
    );

    await waitFor(() => {
      expect(result.current.batchProgress).not.toBeNull();
    });

    act(() => {
      result.current.handleStopBatchGeneration();
    });

    await waitFor(() => {
      expect(api.cancelSlotGeneration).toHaveBeenCalledWith("mascot-hook-test", "core");
    });

    await waitFor(() => {
      expect(result.current.batchProgress).toBeNull();
    });

    expect(result.current.busySlotKey).toBeNull();
    expect(onNotice).toHaveBeenCalledWith(
      expect.objectContaining({
        tone: "good",
        message: expect.stringContaining("stopped"),
      }),
    );
  });

  it("enqueues a single slot generation with mode single", async () => {
    const singleBatch: MascotSlotBatchJob = {
      id: "batch_single_1",
      mascot_id: "mascot-hook-test",
      style_id: "core",
      status: "completed",
      total_slots: 1,
      completed_count: 1,
      failed_count: 0,
      active_slot_keys: [],
      items: [
        {
          id: "job_single",
          mascot_id: "mascot-hook-test",
          style_id: "core",
          state: "thinking",
          slot_index: 2,
          status: "completed",
          prompt_used: "reading book",
          created_at: "2026-01-01T00:00:00Z",
        },
      ],
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    };

    vi.spyOn(api, "queueSlotGeneration").mockResolvedValue(singleBatch);
    vi.spyOn(api, "getSlotGenerationStatus").mockResolvedValue({
      active_batch: singleBatch,
      queued_slot_keys: [],
      active_slot_keys: [],
    });
    vi.spyOn(api, "mascot").mockResolvedValue({ mascot: mockMascot });

    const onMascotUpdated = vi.fn();
    const onNotice = vi.fn();

    const { result } = renderHook(() =>
      useMascotBatchGeneration({
        mascot: mockMascot,
        activeStyleId: "core",
        activeStyle: mockStyle,
        onMascotUpdated,
        onNotice,
      }),
    );

    await act(async () => {
      await result.current.handleGenerateSlot("thinking", 2, "reading book");
    });

    expect(api.queueSlotGeneration).toHaveBeenCalledWith("mascot-hook-test", "core", {
      style_id: "core",
      mode: "single",
      slots: [
        {
          state: "thinking",
          slot_index: 2,
          prompt_modifier: "reading book",
        },
      ],
    });

    await waitFor(
      () => {
        expect(result.current.busySlotKey).toBeNull();
        expect(onNotice).toHaveBeenCalledWith(
          expect.objectContaining({
            tone: "good",
            message: expect.stringContaining('Slot 2 (thinking) generated: "reading book"'),
          }),
        );
      },
      { timeout: 3000 },
    );
  });

  it("serializes rapid single-slot requests so later slots append to the same server batch", async () => {
    const createQueuedBatch = (slotIndices: number[]): MascotSlotBatchJob => ({
      id: "batch_serialized",
      mascot_id: "mascot-hook-test",
      style_id: "core",
      status: "queued",
      total_slots: slotIndices.length,
      completed_count: 0,
      failed_count: 0,
      active_slot_keys: [],
      items: slotIndices.map((slotIndex) => ({
        id: `job_${slotIndex}`,
        mascot_id: "mascot-hook-test",
        style_id: "core",
        state: "thinking",
        slot_index: slotIndex,
        status: "queued",
        created_at: "2026-01-01T00:00:00Z",
      })),
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    });
    const firstBatch = createQueuedBatch([2]);
    const appendedBatch = createQueuedBatch([2, 3]);
    let activeBatch: MascotSlotBatchJob | null = null;
    let releaseFirstRequest = () => undefined;
    const firstRequest = new Promise<MascotSlotBatchJob>((resolve) => {
      releaseFirstRequest = () => {
        activeBatch = firstBatch;
        resolve(firstBatch);
      };
    });

    const queueSpy = vi
      .spyOn(api, "queueSlotGeneration")
      .mockImplementationOnce(() => firstRequest)
      .mockImplementationOnce(async () => {
        activeBatch = appendedBatch;
        return appendedBatch;
      });
    vi.spyOn(api, "getSlotGenerationStatus").mockImplementation(async () => ({
      active_batch: activeBatch,
      queued_slot_keys: activeBatch?.items.map((item) => `${item.state}_${item.slot_index}`) ?? [],
      active_slot_keys: [],
    }));

    const { result, unmount } = renderHook(() =>
      useMascotBatchGeneration({
        mascot: mockMascot,
        activeStyleId: "core",
        activeStyle: mockStyle,
        onMascotUpdated: vi.fn(),
        onNotice: vi.fn(),
      }),
    );

    let firstSubmission: Promise<void>;
    let secondSubmission: Promise<void>;
    act(() => {
      firstSubmission = result.current.handleGenerateSlot("thinking", 2);
      secondSubmission = result.current.handleGenerateSlot("thinking", 3);
    });

    await waitFor(() => expect(queueSpy).toHaveBeenCalledTimes(1));
    releaseFirstRequest();
    await waitFor(() => expect(queueSpy).toHaveBeenCalledTimes(2));
    await act(async () => Promise.all([firstSubmission!, secondSubmission!]));

    expect(queueSpy.mock.calls[0]?.[2].slots).toEqual([{ state: "thinking", slot_index: 2, prompt_modifier: undefined }]);
    expect(queueSpy.mock.calls[1]?.[2].slots).toEqual([{ state: "thinking", slot_index: 3, prompt_modifier: undefined }]);
    expect(result.current.queuedSlotKeys).toEqual(expect.arrayContaining(["thinking_2", "thinking_3"]));
    unmount();
  });

  it("queues selected empty slots in one batch request", async () => {
    const selectedBatch: MascotSlotBatchJob = {
      id: "batch_generate_selected",
      mascot_id: "mascot-hook-test",
      style_id: "core",
      status: "queued",
      total_slots: 2,
      completed_count: 0,
      failed_count: 0,
      active_slot_keys: [],
      items: [2, 4].map((slotIndex) => ({
        id: `job_selected_${slotIndex}`,
        mascot_id: "mascot-hook-test",
        style_id: "core",
        state: "thinking" as const,
        slot_index: slotIndex,
        status: "queued" as const,
        created_at: "2026-01-01T00:00:00Z",
      })),
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    };
    vi.spyOn(api, "queueSlotGeneration").mockResolvedValue(selectedBatch);
    vi.spyOn(api, "getSlotGenerationStatus").mockResolvedValue({
      active_batch: selectedBatch,
      queued_slot_keys: ["thinking_2", "thinking_4"],
      active_slot_keys: [],
    });

    const { result, unmount } = renderHook(() =>
      useMascotBatchGeneration({
        mascot: mockMascot,
        activeStyleId: "core",
        activeStyle: mockStyle,
        onMascotUpdated: vi.fn(),
        onNotice: vi.fn(),
      }),
    );

    let accepted = false;
    await act(async () => {
      accepted = await result.current.handleGenerateSelectedSlots([
        { state: "thinking", slotIndex: 2 },
        { state: "thinking", slotIndex: 4 },
      ]);
    });

    expect(accepted).toBe(true);
    expect(api.queueSlotGeneration).toHaveBeenCalledWith("mascot-hook-test", "core", {
      style_id: "core",
      mode: "batch_empty",
      slots: [
        { state: "thinking", slot_index: 2, prompt_modifier: undefined },
        { state: "thinking", slot_index: 4, prompt_modifier: undefined },
      ],
    });
    expect(result.current.batchProgress?.mode).toBe("generate_selected");
    unmount();
  });

  it("enqueues multi-select slots with mode regenerate_selected", async () => {
    const multiBatch: MascotSlotBatchJob = {
      id: "batch_multi_1",
      mascot_id: "mascot-hook-test",
      style_id: "core",
      status: "completed",
      total_slots: 2,
      completed_count: 2,
      failed_count: 0,
      active_slot_keys: [],
      items: [
        {
          id: "job_m1",
          mascot_id: "mascot-hook-test",
          style_id: "core",
          state: "celebrate",
          slot_index: 1,
          status: "completed",
          prompt_used: "jumping high",
          created_at: "2026-01-01T00:00:00Z",
        },
        {
          id: "job_m2",
          mascot_id: "mascot-hook-test",
          style_id: "core",
          state: "celebrate",
          slot_index: 2,
          status: "completed",
          prompt_used: "trophy wave",
          created_at: "2026-01-01T00:00:00Z",
        },
      ],
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    };

    vi.spyOn(api, "queueSlotGeneration").mockResolvedValue(multiBatch);
    vi.spyOn(api, "getSlotGenerationStatus").mockResolvedValue({
      active_batch: multiBatch,
      queued_slot_keys: [],
      active_slot_keys: [],
    });
    vi.spyOn(api, "mascot").mockResolvedValue({ mascot: mockMascot });

    const onMascotUpdated = vi.fn();
    const onNotice = vi.fn();

    const { result } = renderHook(() =>
      useMascotBatchGeneration({
        mascot: mockMascot,
        activeStyleId: "core",
        activeStyle: mockStyle,
        onMascotUpdated,
        onNotice,
      }),
    );

    await act(async () => {
      await result.current.handleRegenerateSelectedSlots([
        { state: "celebrate", slotIndex: 1, promptModifier: "jumping high" },
        { state: "celebrate", slotIndex: 2, promptModifier: "trophy wave" },
      ]);
    });

    expect(api.queueSlotGeneration).toHaveBeenCalledWith("mascot-hook-test", "core", {
      style_id: "core",
      mode: "regenerate_selected",
      slots: [
        { state: "celebrate", slot_index: 1, prompt_modifier: "jumping high" },
        { state: "celebrate", slot_index: 2, prompt_modifier: "trophy wave" },
      ],
    });

    await waitFor(
      () => {
        expect(result.current.busySlotKey).toBeNull();
        expect(result.current.batchProgress).toBeNull();
        expect(onNotice).toHaveBeenCalledWith(
          expect.objectContaining({
            tone: "good",
            message: expect.stringContaining("2/2 slots generated"),
          }),
        );
      },
      { timeout: 3000 },
    );
  });

  it("shows catch-up completion notification and updates mascot when mounting with recently completed batch", async () => {
    const recentCompletedBatch: MascotSlotBatchJob = {
      id: "batch_recent_away_1",
      mascot_id: "mascot-hook-test",
      style_id: "core",
      status: "completed",
      total_slots: 8,
      completed_count: 8,
      failed_count: 0,
      active_slot_keys: [],
      items: [],
      created_at: new Date(Date.now() - 60000).toISOString(),
      updated_at: new Date(Date.now() - 30000).toISOString(),
    };

    vi.spyOn(api, "getSlotGenerationStatus").mockResolvedValue({
      active_batch: null,
      queued_slot_keys: [],
      active_slot_keys: [],
      recent_batches: [recentCompletedBatch],
    });

    const refreshedMascot: MascotProfile = {
      ...mockMascot,
      updated_at: "2026-01-01T00:00:10.000Z",
    };
    vi.spyOn(api, "mascot").mockResolvedValue({ mascot: refreshedMascot });

    const onMascotUpdated = vi.fn();
    const onNotice = vi.fn();

    renderHook(() =>
      useMascotBatchGeneration({
        mascot: mockMascot,
        activeStyleId: "core",
        activeStyle: mockStyle,
        onMascotUpdated,
        onNotice,
      }),
    );

    await waitFor(() => {
      expect(onNotice).toHaveBeenCalledWith(
        expect.objectContaining({
          tone: "good",
          message: "Background generation completed while you were away: 8/8 poses generated successfully.",
        }),
      );
    });

    expect(api.mascot).toHaveBeenCalledWith("mascot-hook-test");
    expect(onMascotUpdated).toHaveBeenCalledWith(refreshedMascot);
  });

  it("does not show catch-up notice if batch was already acknowledged in session", async () => {
    const recentCompletedBatch: MascotSlotBatchJob = {
      id: "batch_already_acked",
      mascot_id: "mascot-hook-test",
      style_id: "core",
      status: "completed",
      total_slots: 5,
      completed_count: 5,
      failed_count: 0,
      active_slot_keys: [],
      items: [],
      created_at: new Date(Date.now() - 60000).toISOString(),
      updated_at: new Date(Date.now() - 30000).toISOString(),
    };

    const { acknowledgeBatchInSession } = await import("../utils/mascotSessionStorage");
    acknowledgeBatchInSession("batch_already_acked");

    vi.spyOn(api, "getSlotGenerationStatus").mockResolvedValue({
      active_batch: null,
      queued_slot_keys: [],
      active_slot_keys: [],
      recent_batches: [recentCompletedBatch],
    });

    const onMascotUpdated = vi.fn();
    const onNotice = vi.fn();

    renderHook(() =>
      useMascotBatchGeneration({
        mascot: mockMascot,
        activeStyleId: "core",
        activeStyle: mockStyle,
        onMascotUpdated,
        onNotice,
      }),
    );

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(onNotice).not.toHaveBeenCalled();
  });

  it("does not show catch-up notice if completed batch is older than max catch-up age", async () => {
    const oldCompletedBatch: MascotSlotBatchJob = {
      id: "batch_old_1",
      mascot_id: "mascot-hook-test",
      style_id: "core",
      status: "completed",
      total_slots: 5,
      completed_count: 5,
      failed_count: 0,
      active_slot_keys: [],
      items: [],
      created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
    };

    vi.spyOn(api, "getSlotGenerationStatus").mockResolvedValue({
      active_batch: null,
      queued_slot_keys: [],
      active_slot_keys: [],
      recent_batches: [oldCompletedBatch],
    });

    const onMascotUpdated = vi.fn();
    const onNotice = vi.fn();

    renderHook(() =>
      useMascotBatchGeneration({
        mascot: mockMascot,
        activeStyleId: "core",
        activeStyle: mockStyle,
        onMascotUpdated,
        onNotice,
      }),
    );

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(onNotice).not.toHaveBeenCalled();
  });
});
