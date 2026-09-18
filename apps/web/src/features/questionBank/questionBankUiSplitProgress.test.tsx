import { describe, expect, it, afterEach, beforeEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { LanguageProvider } from "../../i18n";
import { QuestionBankCompactSplitProgress } from "./components/progress/QuestionBankCompactSplitProgress";
import { QuestionBankTargetProgressBar } from "./components/QuestionBankTargetProgressBar";
import { getMilestoneProgress } from "./utils/questionBankMilestones";
import type { MatrixCoverageStats } from "@studio/shared";

function renderWithLanguage(ui: React.ReactElement, lang: string = "en") {
  window.localStorage.setItem("studio-language", lang);
  return render(<LanguageProvider>{ui}</LanguageProvider>);
}

const mockMatrixCoverage: MatrixCoverageStats = {
  total_combos: 20000,
  covered_combos: 320,
  total_variants: 850,
  coverage_percent: 1.6,
  by_domain: {},
  by_archetype: {},
};

describe("QuestionBankCompactSplitProgress (Stage 4 Container)", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    window.localStorage.clear();
  });

  it("renders container region, both tracks, and vertical split divider", () => {
    const progress = getMilestoneProgress(250);
    renderWithLanguage(
      <QuestionBankCompactSplitProgress currentTotal={250} milestoneProgress={progress} matrixCoverage={mockMatrixCoverage} />,
      "en",
    );

    // Container region
    const region = screen.getByRole("region", { name: "Question Bank Target Progress and Matrix Coverage" });
    expect(region).toBeDefined();

    // Vertical divider
    const divider = screen.getByRole("separator");
    expect(divider).toBeDefined();
    expect(divider.getAttribute("aria-orientation")).toBe("vertical");
    expect(divider.classList.contains("qb-split-divider")).toBe(true);

    // Left track: Milestone volume & tier badge
    expect(screen.getAllByText("Starter Seed").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("250")).toBeDefined();
    expect(screen.getByText("2,000")).toBeDefined();

    // Right track: Taxonomy matrix coverage
    expect(screen.getByText("Taxonomy Matrix Coverage")).toBeDefined();
    expect(screen.getByText("320")).toBeDefined();
    expect(screen.getByText("20,000")).toBeDefined();
    expect(screen.getByText("1.6%")).toBeDefined();
  });

  it("passes compact, isCollapsed, and custom className props cleanly", () => {
    const progress = getMilestoneProgress(500);
    const { container } = renderWithLanguage(
      <QuestionBankCompactSplitProgress
        currentTotal={500}
        milestoneProgress={progress}
        matrixCoverage={mockMatrixCoverage}
        compact={true}
        isCollapsed={true}
        className="custom-split-progress"
      />,
      "en",
    );

    const root = container.querySelector(".qb-compact-split-progress");
    expect(root?.classList.contains("is-compact")).toBe(true);
    expect(root?.classList.contains("is-collapsed")).toBe(true);
    expect(root?.classList.contains("custom-split-progress")).toBe(true);

    // Checkpoint markers and deficit footer should be hidden when collapsed
    expect(screen.queryByRole("list", { name: /milestone checkpoints/i })).toBeNull();
    expect(screen.queryByText("19,680 combos unfilled")).toBeNull();
  });

  it("relays onOpenAiAutoFill callback through matrix track shortcut button", () => {
    const handleAutoFill = vi.fn();
    const progress = getMilestoneProgress(500);
    renderWithLanguage(
      <QuestionBankCompactSplitProgress
        currentTotal={500}
        milestoneProgress={progress}
        matrixCoverage={mockMatrixCoverage}
        onOpenAiAutoFill={handleAutoFill}
      />,
      "en",
    );

    const autoFillBtn = screen.getByRole("button", { name: "Auto-Fill Deficit" });
    fireEvent.click(autoFillBtn);
    expect(handleAutoFill).toHaveBeenCalledTimes(1);
  });

  it("handles null matrixCoverage gracefully with skeleton placeholder", () => {
    const progress = getMilestoneProgress(250);
    renderWithLanguage(<QuestionBankCompactSplitProgress currentTotal={250} milestoneProgress={progress} matrixCoverage={null} />, "en");

    expect(screen.getByText("-- / -- Combos")).toBeDefined();
    expect(screen.getByText("--%")).toBeDefined();
  });

  it("preserves backward compatibility when used via QuestionBankTargetProgressBar wrapper", () => {
    const handleAutoFill = vi.fn();
    const progress = getMilestoneProgress(250);
    renderWithLanguage(
      <QuestionBankTargetProgressBar
        currentTotal={250}
        milestoneProgress={progress}
        matrixCoverage={mockMatrixCoverage}
        onOpenAiAutoFill={handleAutoFill}
      />,
      "en",
    );

    // Both tracks and divider are present through the wrapper
    expect(screen.getByRole("separator")).toBeDefined();
    expect(screen.getAllByText("Starter Seed").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Taxonomy Matrix Coverage")).toBeDefined();

    // Autofill works through wrapper
    const autoFillBtn = screen.getByRole("button", { name: "Auto-Fill Deficit" });
    fireEvent.click(autoFillBtn);
    expect(handleAutoFill).toHaveBeenCalledTimes(1);
  });
});
