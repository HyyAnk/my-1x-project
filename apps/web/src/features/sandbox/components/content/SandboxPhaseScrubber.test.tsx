import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "../../../../i18n/LanguageContext";
import { SandboxPhaseScrubber } from "./SandboxPhaseScrubber";

afterEach(() => {
  cleanup();
});

describe("SandboxPhaseScrubber", () => {
  it("renders phase buttons with settled keyframe titles and handles phase selection", () => {
    const setPhase = vi.fn();
    const setUseScrubber = vi.fn();

    render(
      <LanguageProvider>
        <SandboxPhaseScrubber phase="thinking" setPhase={setPhase} setUseScrubber={setUseScrubber} useScrubber={false} />
      </LanguageProvider>,
    );

    // Verify all phase buttons exist
    const questionBtn = screen.getByRole("button", { name: /question/i });
    const choicesBtn = screen.getByRole("button", { name: /choices/i });
    const thinkingBtn = screen.getByRole("button", { name: /thinking/i });
    const revealBtn = screen.getByRole("button", { name: /reveal/i });
    const explainBtn = screen.getByRole("button", { name: /explain/i });

    expect(questionBtn).toBeTruthy();
    expect(choicesBtn).toBeTruthy();
    expect(thinkingBtn).toBeTruthy();
    expect(revealBtn).toBeTruthy();
    expect(explainBtn).toBeTruthy();

    // Check settled keyframe timestamps in titles
    expect(questionBtn.title).toContain("0.6s");
    expect(choicesBtn.title).toContain("2.0s");
    expect(thinkingBtn.title).toContain("3.5s");
    expect(revealBtn.title).toContain("8.1s");
    expect(explainBtn.title).toContain("8.8s");

    // Click choices
    fireEvent.click(choicesBtn);
    expect(setPhase).toHaveBeenCalledWith("choices");
    expect(setUseScrubber).toHaveBeenCalledWith(false);

    // Click reveal triggers previewAnimation
    fireEvent.click(revealBtn);
    expect(setPhase).toHaveBeenCalledWith("reveal", { previewAnimation: true });
    expect(setUseScrubber).toHaveBeenCalledWith(false);
  });

  it("toggles scrubber mode when enable scrubber button is clicked", () => {
    const setPhase = vi.fn();
    const setUseScrubber = vi.fn();

    const { rerender } = render(
      <LanguageProvider>
        <SandboxPhaseScrubber phase="thinking" setPhase={setPhase} setUseScrubber={setUseScrubber} useScrubber={false} />
      </LanguageProvider>,
    );

    const toggleBtn = screen.getByTitle(/toggle timeline scrubber mode/i);
    expect(toggleBtn.textContent).toContain("Enable Scrubber");

    fireEvent.click(toggleBtn);
    expect(setUseScrubber).toHaveBeenCalledWith(true);

    rerender(
      <LanguageProvider>
        <SandboxPhaseScrubber phase="thinking" setPhase={setPhase} setUseScrubber={setUseScrubber} useScrubber={true} />
      </LanguageProvider>,
    );
    expect(toggleBtn.textContent).toContain("Scrubber Active");
  });
});
