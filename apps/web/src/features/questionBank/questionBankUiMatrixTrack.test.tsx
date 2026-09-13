import { describe, expect, it, afterEach, beforeEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { LanguageProvider } from "../../i18n";
import { QuestionBankMatrixCoverageTrack } from "./components/progress/QuestionBankMatrixCoverageTrack";
import type { MatrixCoverageStats } from "@studio/shared";

function renderWithLanguage(ui: React.ReactElement, lang: string = "en") {
  window.localStorage.setItem("studio-language", lang);
  return render(<LanguageProvider>{ui}</LanguageProvider>);
}

const mockPartialCoverage: MatrixCoverageStats = {
  total_combos: 20000,
  covered_combos: 320,
  total_variants: 850,
  coverage_percent: 1.6,
  by_domain: {},
  by_archetype: {},
};

const mockCompleteCoverage: MatrixCoverageStats = {
  total_combos: 20000,
  covered_combos: 20000,
  total_variants: 25000,
  coverage_percent: 100,
  by_domain: {},
  by_archetype: {},
};

describe("QuestionBankMatrixCoverageTrack", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    window.localStorage.clear();
  });

  it("renders matrix track title, counts, and percentage badge", () => {
    renderWithLanguage(
      <QuestionBankMatrixCoverageTrack matrixCoverage={mockPartialCoverage} />,
      "en",
    );

    expect(screen.getByText("Taxonomy Matrix Coverage")).toBeDefined();
    expect(screen.getByText("320")).toBeDefined();
    expect(screen.getByText("20,000")).toBeDefined();
    expect(screen.getByText("Combos")).toBeDefined();
    expect(screen.getByText("1.6%")).toBeDefined();
  });

  it("renders deficit count with warning pill when combos are unfilled", () => {
    renderWithLanguage(
      <QuestionBankMatrixCoverageTrack matrixCoverage={mockPartialCoverage} />,
      "en",
    );

    // 20,000 - 320 = 19,680 unfilled combos
    expect(screen.getByText("19,680 combos unfilled")).toBeDefined();
  });

  it("renders auto-fill button and triggers callback on click", () => {
    const handleAutoFill = vi.fn();
    renderWithLanguage(
      <QuestionBankMatrixCoverageTrack
        matrixCoverage={mockPartialCoverage}
        onOpenAiAutoFill={handleAutoFill}
      />,
      "en",
    );

    const autoFillBtn = screen.getByRole("button", { name: "Auto-Fill Deficit" });
    expect(autoFillBtn).toBeDefined();

    fireEvent.click(autoFillBtn);
    expect(handleAutoFill).toHaveBeenCalledTimes(1);
  });

  it("renders full matrix coverage status when all combos are covered", () => {
    const handleAutoFill = vi.fn();
    renderWithLanguage(
      <QuestionBankMatrixCoverageTrack
        matrixCoverage={mockCompleteCoverage}
        onOpenAiAutoFill={handleAutoFill}
      />,
      "en",
    );

    expect(screen.getByText("Full Matrix Coverage")).toBeDefined();
    expect(screen.getByText("100%")).toBeDefined();
    // Auto-fill button should not be displayed when deficit is 0
    expect(screen.queryByRole("button", { name: "Auto-Fill Deficit" })).toBeNull();
  });

  it("renders accessible progressbar attributes", () => {
    renderWithLanguage(
      <QuestionBankMatrixCoverageTrack matrixCoverage={mockPartialCoverage} />,
      "en",
    );

    const progressBar = screen.getByRole("progressbar");
    expect(progressBar).toBeDefined();
    expect(progressBar.getAttribute("aria-valuenow")).toBe("320");
    expect(progressBar.getAttribute("aria-valuemax")).toBe("20000");
    expect(progressBar.getAttribute("aria-valuetext")).toContain("320");
    expect(progressBar.getAttribute("aria-valuetext")).toContain("20,000");
    expect(progressBar.getAttribute("aria-valuetext")).toContain("1.6%");
  });

  it("renders graceful fallback when matrix coverage is null or undefined", () => {
    renderWithLanguage(
      <QuestionBankMatrixCoverageTrack matrixCoverage={null} />,
      "en",
    );

    expect(screen.getByText("Taxonomy Matrix Coverage")).toBeDefined();
    expect(screen.getByText("-- / -- Combos")).toBeDefined();
    expect(screen.getByText("--%")).toBeDefined();

    const progressBar = screen.getByRole("progressbar");
    expect(progressBar.getAttribute("aria-valuenow")).toBe("0");
  });

  it("hides deficit footer when isCollapsed is true", () => {
    renderWithLanguage(
      <QuestionBankMatrixCoverageTrack
        matrixCoverage={mockPartialCoverage}
        isCollapsed={true}
      />,
      "en",
    );

    expect(screen.queryByText("19,680 combos unfilled")).toBeNull();
    expect(screen.getByRole("progressbar")).toBeDefined();
  });

  it("applies compact and custom className modifiers", () => {
    const { container } = renderWithLanguage(
      <QuestionBankMatrixCoverageTrack
        matrixCoverage={mockPartialCoverage}
        compact={true}
        className="custom-matrix-class"
      />,
      "en",
    );

    const trackRoot = container.querySelector(".qb-matrix-track");
    expect(trackRoot?.classList.contains("is-compact")).toBe(true);
    expect(trackRoot?.classList.contains("custom-matrix-class")).toBe(true);
  });
});
