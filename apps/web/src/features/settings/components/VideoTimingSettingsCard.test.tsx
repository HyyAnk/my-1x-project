import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { VideoTimingSettingsCard, type VideoTimingSettingsCardProps } from "./VideoTimingSettingsCard";

afterEach(cleanup);

describe("VideoTimingSettingsCard", () => {
  const defaultProps: VideoTimingSettingsCardProps = {
    maxDuration: 8,
    estimatedWpm: 138,
    aspectRatio: "16:9",
    setAspectRatio: vi.fn(),
    maxConcurrentVideoTasks: 2,
    setMaxConcurrentVideoTasks: vi.fn(),
    renderWorkers: 4,
    setRenderWorkers: vi.fn(),
    renderQuality: "draft",
    setRenderQuality: vi.fn(),
    fps: 30,
    setFps: vi.fn(),
    mascotMediaMode: "static",
    setMascotMediaMode: vi.fn(),
    maxSceneDuration: 8,
    setMaxSceneDuration: vi.fn(),
    narrationWordsPerSecond: 2.3,
    setNarrationWordsPerSecond: vi.fn(),
    savingVideo: false,
    onSaveVideo: vi.fn(),
  };

  it("renders status line and select control for Mascot State Media Mode", () => {
    render(<VideoTimingSettingsCard {...defaultProps} />);

    expect(screen.getByText("Scene Duration & Speed")).toBeDefined();
    expect(screen.getByText("Static Variants (Style Stills)")).toBeDefined();

    const select = screen.getByLabelText(/Mascot State Media Mode/i) as HTMLSelectElement;
    expect(select.value).toBe("static");

    expect(screen.getByRole("option", { name: /Static Variants \(Style Stills · Focused & Crisp - Recommended\)/i })).toBeDefined();
    expect(screen.getByRole("option", { name: /Looping Animations \(WebM \/ Spritesheet\)/i })).toBeDefined();

    expect(
      screen.getByText(
        /Prioritizes high-resolution static emotion variants for Thinking and Celebrate states to keep viewers focused on quiz questions/i,
      ),
    ).toBeDefined();
  });

  it("displays animation status line when mascotMediaMode is animation", () => {
    render(<VideoTimingSettingsCard {...defaultProps} mascotMediaMode="animation" />);

    expect(screen.getAllByText("Looping Animations (WebM / Spritesheet)").length).toBeGreaterThanOrEqual(1);
    const select = screen.getByLabelText(/Mascot State Media Mode/i) as HTMLSelectElement;
    expect(select.value).toBe("animation");
  });

  it("triggers setMascotMediaMode when changing the select option", () => {
    const setMascotMediaMode = vi.fn();
    render(<VideoTimingSettingsCard {...defaultProps} setMascotMediaMode={setMascotMediaMode} />);

    const select = screen.getByLabelText(/Mascot State Media Mode/i);
    fireEvent.change(select, { target: { value: "animation" } });

    expect(setMascotMediaMode).toHaveBeenCalledWith("animation");
  });

  it("calls onSaveVideo when the form is submitted", () => {
    const onSaveVideo = vi.fn();
    render(<VideoTimingSettingsCard {...defaultProps} onSaveVideo={onSaveVideo} />);

    const submitBtn = screen.getByRole("button", { name: /Save Video Settings/i });
    fireEvent.click(submitBtn);

    expect(onSaveVideo).toHaveBeenCalled();
  });
});
