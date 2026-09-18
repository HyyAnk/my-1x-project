import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { Step4SlotDetails } from "./Step4SlotDetails";
import type { MascotSlotProjection } from "@studio/shared";

afterEach(() => {
  cleanup();
});

const readySlot: MascotSlotProjection = {
  style_id: "core",
  state: "thinking",
  slot_index: 1,
  status: "ready",
  active_revision: {
    id: "rev_1",
    attempt: 1,
    created_at: new Date().toISOString(),
    version: 1,
    style_id: "core",
    state: "thinking",
    slot_index: 1,
    source_video_url: "https://example.com/video.mp4",
    atlas_url: "https://example.com/atlas.png",
    manifest_url: "https://example.com/manifest.json",
    frame_urls: [],
    frame_count: 12,
    source_fps: 24,
    playback_fps: 8,
    duration_ms: 1500,
    loop_mode: "loop",
    canvas: { width: 1280, height: 720 },
    content_bounds: { x: 50, y: 50, width: 700, height: 350 },
    pivot: { x: 400, y: 450 },
    registration: {
      source_width: 800,
      source_height: 450,
      content_bounds: { x: 50, y: 50, width: 700, height: 350 },
      pivot: { x: 400, y: 450 },
      offset_x: 0,
      offset_y: 0,
    },
    source_fingerprint: "src_fp",
    processing_fingerprint: "fingerprint_1234567890abcdef",
    status: "ready",
  },
  updated_at: new Date().toISOString(),
};

const emptySlot: MascotSlotProjection = {
  style_id: "core",
  state: "thinking",
  slot_index: 2,
  status: "empty",
  updated_at: new Date().toISOString(),
};

describe("Step4SlotDetails", () => {
  it("renders sequence and registration metadata when slot is ready", () => {
    render(<Step4SlotDetails state="thinking" slotIndex={1} slot={readySlot} />);

    expect(screen.getByText("Slot #1 (Thinking)")).toBeTruthy();
    expect(screen.getByText("ready")).toBeTruthy();
    expect(screen.getByText("12 frames @ 8 FPS")).toBeTruthy();
    expect(screen.getByText("loop (1500ms)")).toBeTruthy();
    expect(screen.getByText("1280 × 720")).toBeTruthy();
    expect(screen.getByText("(400, 450)")).toBeTruthy();
  });

  it("renders pending notice and Go to Step 3 button when slot is not ready", () => {
    const onGoToStep3 = vi.fn();
    render(<Step4SlotDetails state="thinking" slotIndex={2} slot={emptySlot} onGoToStep3={onGoToStep3} />);

    expect(screen.getByText("Animation Not Yet Processed")).toBeTruthy();
    const goBtn = screen.getByRole("button", { name: /go to step 3/i });
    expect(goBtn).toBeTruthy();

    fireEvent.click(goBtn);
    expect(onGoToStep3).toHaveBeenCalledTimes(1);
  });
});
