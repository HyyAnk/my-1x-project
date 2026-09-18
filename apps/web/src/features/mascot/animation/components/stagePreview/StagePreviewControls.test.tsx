import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { StagePreviewControls } from "./StagePreviewControls";

afterEach(() => {
  cleanup();
});

describe("StagePreviewControls", () => {
  it("renders aspect ratio switches and triggers callback on click", () => {
    const handleAspect = vi.fn();
    render(<StagePreviewControls aspectRatio="16:9" onAspectRatioChange={handleAspect} showGuides={true} />);

    const btn916 = screen.getByRole("button", { name: "9:16" });
    fireEvent.click(btn916);
    expect(handleAspect).toHaveBeenCalledWith("9:16");
  });

  it("toggles guides button state and triggers callback", () => {
    const handleGuides = vi.fn();
    render(<StagePreviewControls aspectRatio="16:9" showGuides={true} onToggleGuides={handleGuides} />);

    const guideBtn = screen.getByRole("button", { name: "Guides ON" });
    fireEvent.click(guideBtn);
    expect(handleGuides).toHaveBeenCalledWith(false);
  });

  it("renders playback play/pause control when onTogglePlay is provided", () => {
    const handlePlay = vi.fn();
    const { rerender } = render(<StagePreviewControls aspectRatio="16:9" showGuides={false} isPlaying={false} onTogglePlay={handlePlay} />);

    const playBtn = screen.getByLabelText("Play preview animation");
    fireEvent.click(playBtn);
    expect(handlePlay).toHaveBeenCalled();

    rerender(<StagePreviewControls aspectRatio="16:9" showGuides={false} isPlaying={true} onTogglePlay={handlePlay} />);
    expect(screen.getByLabelText("Pause preview animation")).toBeTruthy();
  });
});
