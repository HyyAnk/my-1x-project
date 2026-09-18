import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "../../../../i18n/LanguageContext";
import { SandboxTimelineControls } from "./SandboxTimelineControls";

afterEach(() => {
  cleanup();
});

describe("SandboxTimelineControls", () => {
  const defaultProps = {
    phase: "thinking",
    useScrubber: false,
    timelineSeconds: 3.5,
    handlePhaseChange: vi.fn(),
    isPlaying: false,
    setIsPlaying: vi.fn(),
    handleTogglePlay: vi.fn(),
    setUseScrubber: vi.fn(),
    handleScrubberChange: vi.fn(),
    isMuted: false,
    onToggleMute: vi.fn(),
    totalDuration: 10.27,
  };

  it("renders phase buttons and highlights active phase button", () => {
    render(
      <LanguageProvider>
        <SandboxTimelineControls {...defaultProps} />
      </LanguageProvider>,
    );

    const buttons = screen.getAllByRole("button");
    expect(buttons.length).toBeGreaterThanOrEqual(5);

    // Click on choices phase button
    const choicesBtn = screen.getByRole("button", { name: /choices/i });
    fireEvent.click(choicesBtn);
    expect(defaultProps.handlePhaseChange).toHaveBeenCalledWith("choices");
  });

  it("handles play/pause button click via handleTogglePlay", () => {
    const handleTogglePlay = vi.fn();
    const setUseScrubber = vi.fn();
    render(
      <LanguageProvider>
        <SandboxTimelineControls {...defaultProps} handleTogglePlay={handleTogglePlay} setUseScrubber={setUseScrubber} />
      </LanguageProvider>,
    );

    const playBtn = screen.getByRole("button", { name: /play rehearsal/i });
    fireEvent.click(playBtn);

    expect(setUseScrubber).toHaveBeenCalledWith(true);
    expect(handleTogglePlay).toHaveBeenCalled();
  });

  it("handles mute toggle button click", () => {
    const onToggleMute = vi.fn();
    render(
      <LanguageProvider>
        <SandboxTimelineControls {...defaultProps} onToggleMute={onToggleMute} isMuted={false} />
      </LanguageProvider>,
    );

    const muteBtn = screen.getByTitle(/mute rehearsal sfx/i);
    fireEvent.click(muteBtn);
    expect(onToggleMute).toHaveBeenCalled();
  });

  it("renders timecode indicator with current seconds and total duration", () => {
    render(
      <LanguageProvider>
        <SandboxTimelineControls {...defaultProps} timelineSeconds={3.5} totalDuration={10.3} />
      </LanguageProvider>,
    );
    expect(screen.getByText("3.5s / 10.3s")).toBeDefined();
  });

  it("renders range scrubber with datalist markers and handles change", () => {
    const handleScrubberChange = vi.fn();
    const { container } = render(
      <LanguageProvider>
        <SandboxTimelineControls {...defaultProps} handleScrubberChange={handleScrubberChange} />
      </LanguageProvider>,
    );

    const slider = container.querySelector('input[type="range"]') as HTMLInputElement;
    expect(slider).toBeTruthy();
    expect(slider.value).toBe("3.5");

    fireEvent.change(slider, { target: { value: "6.2" } });
    expect(handleScrubberChange).toHaveBeenCalledWith(6.2);

    // Verify datalist with settled markers
    const datalist = container.querySelector("#sandbox-timeline-phase-markers");
    expect(datalist).toBeTruthy();
    const options = datalist?.querySelectorAll("option");
    expect(options?.length).toBe(5);
  });

  it("allows jumping to settled keyframes by clicking timestamp badges beneath scrubber", () => {
    const handleScrubberChange = vi.fn();
    render(
      <LanguageProvider>
        <SandboxTimelineControls {...defaultProps} handleScrubberChange={handleScrubberChange} />
      </LanguageProvider>,
    );

    const revealBadge = screen.getByText(/reveal \(8\.1s\)/i);
    fireEvent.click(revealBadge);
    expect(handleScrubberChange).toHaveBeenCalledWith(8.1);

    const choicesBadge = screen.getByText(/choices \(2\.0s\)/i);
    fireEvent.click(choicesBadge);
    expect(handleScrubberChange).toHaveBeenCalledWith(2.0);
  });
});
