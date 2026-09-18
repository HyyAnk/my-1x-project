import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { AnimationProcessingSlotCard } from "./AnimationProcessingSlotCard";
import type { MascotSlotProjection, MascotVideoProcessingJob } from "@studio/shared";

afterEach(() => {
  cleanup();
});

describe("AnimationProcessingSlotCard", () => {
  const baseProps = {
    mascotId: "owl-mascot",
    styleId: "core",
    state: "thinking" as const,
    slotIndex: 1,
    projection: null,
    activeJob: null,
    sourceImageUrl: "https://example.com/pose-1.png",
    isBusy: false,
    onUploadVideo: vi.fn(),
    onRetry: vi.fn(),
    onReplaceVideo: vi.fn(),
    onCancelJob: vi.fn(),
  };

  it("renders empty slot card with upload button and source image reference", () => {
    render(<AnimationProcessingSlotCard {...baseProps} />);

    expect(screen.getByText("Slot 1")).toBeTruthy();
    expect(screen.getByText("Empty")).toBeTruthy();
    expect(screen.getByText("Select Video")).toBeTruthy();

    const fileInput = screen.getByTestId("file-input-thinking-1");
    expect(fileInput).toBeTruthy();
  });

  it("handles file selection and triggers onUploadVideo", () => {
    const onUploadVideo = vi.fn();
    render(<AnimationProcessingSlotCard {...baseProps} onUploadVideo={onUploadVideo} />);

    const fileInput = screen.getByTestId("file-input-thinking-1") as HTMLInputElement;
    const testFile = new File(["dummy video data"], "pose_01.mp4", { type: "video/mp4" });

    fireEvent.change(fileInput, { target: { files: [testFile] } });
    expect(onUploadVideo).toHaveBeenCalledWith(testFile);
  });

  it("renders processing state with live progress, status message, and cancel control", () => {
    const onCancelJob = vi.fn();
    const projection: MascotSlotProjection = {
      style_id: "core",
      state: "thinking",
      slot_index: 1,
      status: "processing",
      active_attempt: 1,
      active_job_id: "job_123",
      active_revision_id: null,
      error_code: null,
      error_message: null,
      updated_at: new Date().toISOString(),
    };

    const activeJob: MascotVideoProcessingJob = {
      id: "job_123",
      mascot_id: "owl-mascot",
      style_id: "core",
      state: "thinking",
      slot_index: 1,
      attempt: 1,
      source_video_url: "/source.mp4",
      source_video_fingerprint: "fp",
      status: "processing",
      progress: 65,
      error_code: null,
      error_message: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    render(<AnimationProcessingSlotCard {...baseProps} projection={projection} activeJob={activeJob} onCancelJob={onCancelJob} />);

    expect(screen.getByText("Processing")).toBeTruthy();
    expect(screen.getByText("65%")).toBeTruthy();
    expect(screen.getByText("Aligning registration...")).toBeTruthy();

    const cancelBtn = screen.getByTitle("Cancel processing");
    fireEvent.click(cancelBtn);
    expect(onCancelJob).toHaveBeenCalledWith("job_123");
  });

  it("renders ready state with keyframe preview and replace button", () => {
    const onReplaceVideo = vi.fn();
    const projection: MascotSlotProjection = {
      style_id: "core",
      state: "thinking",
      slot_index: 1,
      status: "ready",
      active_attempt: 2,
      active_job_id: "job_ready",
      active_revision_id: "rev_2",
      error_code: null,
      error_message: null,
      updated_at: new Date().toISOString(),
    };

    render(<AnimationProcessingSlotCard {...baseProps} projection={projection} onReplaceVideo={onReplaceVideo} />);

    expect(screen.getByText("Ready")).toBeTruthy();
    expect(screen.getByText("Attempt #2")).toBeTruthy();
    expect(screen.getByText("Replace Video")).toBeTruthy();

    const replaceInput = screen.getByTestId("replace-input-thinking-1") as HTMLInputElement;
    const replacementFile = new File(["new video"], "new_pose.mp4", { type: "video/mp4" });

    fireEvent.change(replaceInput, { target: { files: [replacementFile] } });
    expect(onReplaceVideo).toHaveBeenCalledWith(replacementFile);
  });

  it("renders failure state with error code, message, and retry button", () => {
    const onRetry = vi.fn();
    const projection: MascotSlotProjection = {
      style_id: "core",
      state: "thinking",
      slot_index: 1,
      status: "failed",
      active_attempt: 1,
      active_job_id: "job_failed",
      active_revision_id: null,
      error_code: "ALPHA_HOLE_DETECTED",
      error_message: "Severe alpha holes detected in frames 3-5",
      updated_at: new Date().toISOString(),
    };

    render(<AnimationProcessingSlotCard {...baseProps} projection={projection} onRetry={onRetry} />);

    expect(screen.getByText("Failed")).toBeTruthy();
    expect(screen.getByText("ALPHA_HOLE_DETECTED")).toBeTruthy();
    expect(screen.getByText("Severe alpha holes detected in frames 3-5")).toBeTruthy();

    const retryBtn = screen.getByRole("button", { name: /retry/i });
    fireEvent.click(retryBtn);
    expect(onRetry).toHaveBeenCalledTimes(1);

    expect(screen.getByRole("button", { name: /upload new/i })).toBeTruthy();
  });

  it("displays dynamic duration and FPS tag on ready card with active_revision", () => {
    const projection: MascotSlotProjection = {
      style_id: "core",
      state: "thinking",
      slot_index: 1,
      status: "ready",
      active_attempt: 1,
      active_revision: {
        id: "rev_1",
        style_id: "core",
        state: "thinking",
        slot_index: 1,
        attempt: 1,
        version: 1,
        status: "ready",
        frame_count: 96,
        playback_fps: 24,
        duration_ms: 4000,
        loop_mode: "loop",
        created_at: new Date().toISOString(),
        transparent_video_url: "/api/mascots/owl/styles/core/animations/thinking/1/artifacts/video_transparent.webm",
        alpha_codec: "vp9_alpha",
      } as any,
      updated_at: new Date().toISOString(),
    };

    render(<AnimationProcessingSlotCard {...baseProps} projection={projection} />);

    expect(screen.getByText("4.0s • 24 FPS")).toBeTruthy();
    const videoEl = screen.getByTestId("anim-video-thinking-1") as HTMLVideoElement;
    expect(videoEl).toBeDefined();
    expect(videoEl.tagName.toLowerCase()).toBe("video");
    expect(videoEl.getAttribute("src")).toBe("/api/mascots/owl/styles/core/animations/thinking/1/artifacts/video_transparent.webm");
    expect(videoEl.hasAttribute("autoplay")).toBe(true);
    expect(videoEl.hasAttribute("loop")).toBe(true);
    expect(videoEl.muted).toBe(true);
    expect(videoEl.hasAttribute("playsinline")).toBe(true);
  });

  it("displays empty hint with 4-10s support when slot is empty and without source image", () => {
    render(<AnimationProcessingSlotCard {...baseProps} sourceImageUrl={null} />);

    expect(screen.getByText("16:9 • 4–10s • MP4/MOV/WebM")).toBeTruthy();
  });

  it("renders queued state with In Queue badge, waiting message, and cancel control", () => {
    const onCancelJob = vi.fn();
    const projection: MascotSlotProjection = {
      style_id: "core",
      state: "thinking",
      slot_index: 3,
      status: "queued",
      active_attempt: 1,
      active_job_id: "job_queued_3",
      active_revision_id: null,
      error_code: null,
      error_message: null,
      updated_at: new Date().toISOString(),
    };

    render(<AnimationProcessingSlotCard {...baseProps} slotIndex={3} projection={projection} onCancelJob={onCancelJob} />);

    expect(screen.getByText("In Queue")).toBeTruthy();
    expect(screen.getByText("In Queue (Waiting for slot...)")).toBeTruthy();
    expect(screen.getByText("Queued")).toBeTruthy();

    const cancelBtn = screen.getByTitle("Cancel waiting job");
    fireEvent.click(cancelBtn);
    expect(onCancelJob).toHaveBeenCalledWith("job_queued_3");
  });
});
