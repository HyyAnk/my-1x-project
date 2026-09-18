import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MascotMotionStepContactSheet } from "./MascotMotionStepContactSheet";
import type { MascotPublishedAnimationAsset } from "@studio/shared";

afterEach(() => {
  cleanup();
});

const mockAsset: MascotPublishedAnimationAsset = {
  version: 1,
  state: "thinking",
  atlas_url: "https://example.com/atlas.png",
  manifest_url: "https://example.com/manifest.json",
  frame_count: 12,
  fps: 8,
  duration_ms: 1500,
  loop: true,
  loop_policy: "loop",
  frames: [],
  recipe_id: "core_thinking_1",
  registration: {
    source_width: 800,
    source_height: 450,
    content_bounds: { x: 50, y: 50, width: 700, height: 350 },
    pivot: { x: 400, y: 450 },
    offset_x: 0,
    offset_y: 0,
  },
  content_fingerprint: "proc_fp",
  source_fingerprint: "src_fp",
};

describe("MascotMotionStepContactSheet", () => {
  it("returns null when showContactSheet is false", () => {
    const { container } = render(
      <MascotMotionStepContactSheet showContactSheet={false} animation={mockAsset} activeFrameIndex={0} onSelectFrame={vi.fn()} />,
    );

    expect(container.firstChild).toBeNull();
  });

  it("returns null when animation is null", () => {
    const { container } = render(
      <MascotMotionStepContactSheet showContactSheet={true} animation={null} activeFrameIndex={0} onSelectFrame={vi.fn()} />,
    );

    expect(container.firstChild).toBeNull();
  });

  it("renders contact sheet wrap when active", () => {
    render(<MascotMotionStepContactSheet showContactSheet={true} animation={mockAsset} activeFrameIndex={2} onSelectFrame={vi.fn()} />);

    expect(screen.getByTestId("step4-contact-sheet-wrap")).toBeTruthy();
  });
});
