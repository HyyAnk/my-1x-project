import { describe, expect, it, vi, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import type { MascotSlotProjection } from "@studio/shared";
import { useSlotMutations } from "./useSlotMutations";
import { mascotAnimationApi, type UploadSlotVideoResponse, type RetrySlotAnimationResponse } from "../services/mascotAnimationApi";

afterEach(() => {
  vi.restoreAllMocks();
});

const mockProjection: MascotSlotProjection = {
  style_id: "core",
  state: "thinking",
  slot_index: 1,
  status: "queued",
  active_job_id: "job_new",
  source_video_url: null,
  updated_at: "2026-09-01T00:00:00.000Z",
};

describe("useSlotMutations", () => {
  it("rejects unsupported video format", async () => {
    const refreshSlots = vi.fn().mockResolvedValue(undefined);
    const setError = vi.fn();
    const onNotice = vi.fn();

    const { result } = renderHook(() =>
      useSlotMutations({
        mascotId: "m1",
        styleId: "core",
        refreshSlots,
        setError,
        onNotice,
      }),
    );

    const invalidFile = new File(["dummy content"], "video.avi", { type: "video/avi" });

    let response: UploadSlotVideoResponse | null = null;
    await act(async () => {
      response = await result.current.uploadVideo("thinking", 1, invalidFile);
    });

    expect(response).toBeNull();
    expect(setError).toHaveBeenCalledWith(expect.stringContaining("Unsupported video format"));
    expect(onNotice).toHaveBeenCalledWith(expect.objectContaining({ tone: "bad" }));
  });

  it("calls uploadVideo successfully and invokes callbacks", async () => {
    const refreshSlots = vi.fn().mockResolvedValue(undefined);
    const setError = vi.fn();
    const onNotice = vi.fn();

    vi.spyOn(mascotAnimationApi, "uploadSlotVideo").mockResolvedValue({
      ok: true,
      job_id: "job_new",
      attempt: 1,
      status: "queued",
      slot_projection: mockProjection,
      upload: {
        source_video_url: "https://example.com/video.mp4",
        source_video_fingerprint: "fp123",
        file_size_bytes: 1024,
        sha256: "sha123",
        metadata: {
          width: 512,
          height: 512,
          durationMs: 2000,
          fps: 30,
          codec: "h264",
          format: "mp4",
        },
      },
    });

    const { result } = renderHook(() =>
      useSlotMutations({
        mascotId: "m1",
        styleId: "core",
        refreshSlots,
        setError,
        onNotice,
      }),
    );

    const validFile = new File(["test data"], "anim.mp4", { type: "video/mp4" });

    let uploadRes: UploadSlotVideoResponse | null = null;
    await act(async () => {
      uploadRes = await result.current.uploadVideo("thinking", 1, validFile);
    });

    expect(uploadRes).not.toBeNull();
    const res = uploadRes as unknown as UploadSlotVideoResponse;
    expect(res.job_id).toBe("job_new");
    expect(refreshSlots).toHaveBeenCalled();
    expect(onNotice).toHaveBeenCalledWith(
      expect.objectContaining({
        tone: "neutral",
        message: expect.stringContaining("Uploaded video for thinking slot 1"),
      }),
    );
  });

  it("calls retrySlot successfully and invokes callbacks", async () => {
    const refreshSlots = vi.fn().mockResolvedValue(undefined);
    const setError = vi.fn();
    const onNotice = vi.fn();

    vi.spyOn(mascotAnimationApi, "retrySlotAnimation").mockResolvedValue({
      ok: true,
      job_id: "job_retry",
      attempt: 2,
      status: "queued",
      slot_projection: mockProjection,
    });

    const { result } = renderHook(() =>
      useSlotMutations({
        mascotId: "m1",
        styleId: "core",
        refreshSlots,
        setError,
        onNotice,
      }),
    );

    let retryRes: RetrySlotAnimationResponse | null = null;
    await act(async () => {
      retryRes = await result.current.retrySlot("celebrate", 3);
    });

    expect(retryRes).not.toBeNull();
    const res = retryRes as unknown as RetrySlotAnimationResponse;
    expect(res.attempt).toBe(2);
    expect(refreshSlots).toHaveBeenCalled();
    expect(onNotice).toHaveBeenCalledWith(
      expect.objectContaining({
        tone: "neutral",
        message: expect.stringContaining("Retrying processing for celebrate slot 3"),
      }),
    );
  });

  it("calls cancelJob successfully and invokes callbacks", async () => {
    const refreshSlots = vi.fn().mockResolvedValue(undefined);
    const setError = vi.fn();
    const onNotice = vi.fn();

    vi.spyOn(mascotAnimationApi, "cancelProcessingJob").mockResolvedValue({
      ok: true,
      job: {
        id: "job_cancel",
        mascot_id: "m1",
        style_id: "core",
        state: "thinking",
        slot_index: 1,
        status: "cancelled",
        progress: 0,
        source_video_url: "https://example.com/source.mp4",
        source_video_fingerprint: "fp123",
        attempt: 1,
        created_at: "2026-09-01T00:00:00.000Z",
        updated_at: "2026-09-01T00:00:00.000Z",
      },
    });

    const { result } = renderHook(() =>
      useSlotMutations({
        mascotId: "m1",
        styleId: "core",
        refreshSlots,
        setError,
        onNotice,
      }),
    );

    await act(async () => {
      await result.current.cancelJob("job_cancel");
    });

    expect(refreshSlots).toHaveBeenCalled();
    expect(onNotice).toHaveBeenCalledWith(
      expect.objectContaining({
        tone: "neutral",
        message: "Processing job cancelled.",
      }),
    );
  });
});
