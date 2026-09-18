import { describe, expect, it, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { LanguageProvider } from "../../i18n";
import { QuestionBankMilestoneTrack } from "./components/progress/QuestionBankMilestoneTrack";
import { getMilestoneProgress } from "./utils/questionBankMilestones";

function renderWithLanguage(ui: React.ReactElement, lang: string = "en") {
  window.localStorage.setItem("studio-language", lang);
  return render(<LanguageProvider>{ui}</LanguageProvider>);
}

describe("QuestionBankMilestoneTrack", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    window.localStorage.clear();
  });

  it("renders active tier badge, counts, percentage, and countdown pill", () => {
    const progress = getMilestoneProgress(250);
    renderWithLanguage(<QuestionBankMilestoneTrack currentTotal={250} milestoneProgress={progress} />, "en");

    // Active tier badge
    expect(screen.getAllByText("Starter Seed").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Lvl 1")).toBeDefined();

    // Question counts
    expect(screen.getByText("250")).toBeDefined();
    expect(screen.getByText("2,000")).toBeDefined();
    expect(screen.getByText("questions")).toBeDefined();

    // Percentage
    expect(screen.getByText("12.5%")).toBeDefined();

    // Countdown pill
    expect(screen.getByText("1,750 questions to Foundation")).toBeDefined();
  });

  it("renders segmented rail with progressbar accessibility attributes", () => {
    const progress = getMilestoneProgress(250);
    renderWithLanguage(<QuestionBankMilestoneTrack currentTotal={250} milestoneProgress={progress} />, "en");

    const progressBar = screen.getByRole("progressbar");
    expect(progressBar).toBeDefined();
    expect(progressBar.getAttribute("aria-valuenow")).toBe("250");
    expect(progressBar.getAttribute("aria-valuemax")).toBe("2000");
    expect(progressBar.getAttribute("aria-valuetext")).toContain("250");
    expect(progressBar.getAttribute("aria-valuetext")).toContain("2,000");
  });

  it("renders checkpoint markers for all tiers with proper statuses", () => {
    const progress = getMilestoneProgress(6000); // Level 3: Explorer, Level 1 & 2 achieved
    renderWithLanguage(<QuestionBankMilestoneTrack currentTotal={6000} milestoneProgress={progress} />, "en");

    // Milestone targets
    expect(screen.getByText("2K")).toBeDefined();
    expect(screen.getByText("5K")).toBeDefined();
    expect(screen.getByText("10K")).toBeDefined();
    expect(screen.getByText("20K")).toBeDefined();
    expect(screen.getByText("50K")).toBeDefined();
    expect(screen.getByText("100K")).toBeDefined();

    // Active tier is Explorer
    expect(screen.getAllByText("Explorer").length).toBeGreaterThanOrEqual(1);
  });

  it("renders max tier reached status pill when current total exceeds top tier", () => {
    const maxProgress = getMilestoneProgress(120000);
    renderWithLanguage(<QuestionBankMilestoneTrack currentTotal={120000} milestoneProgress={maxProgress} />, "en");

    expect(screen.getByText("Max Tier Achieved")).toBeDefined();
    expect(screen.getByText("100%")).toBeDefined();
  });

  it("hides checkpoint markers when isCollapsed is true", () => {
    const progress = getMilestoneProgress(500);
    renderWithLanguage(<QuestionBankMilestoneTrack currentTotal={500} milestoneProgress={progress} isCollapsed={true} />, "en");

    expect(screen.queryByRole("list", { name: /milestone checkpoints/i })).toBeNull();
    expect(screen.getByRole("progressbar")).toBeDefined();
  });

  it("applies compact and custom className modifiers", () => {
    const progress = getMilestoneProgress(500);
    const { container } = renderWithLanguage(
      <QuestionBankMilestoneTrack currentTotal={500} milestoneProgress={progress} compact={true} className="custom-track-class" />,
      "en",
    );

    const trackRoot = container.querySelector(".qb-milestone-track");
    expect(trackRoot?.classList.contains("is-compact")).toBe(true);
    expect(trackRoot?.classList.contains("custom-track-class")).toBe(true);
  });
});
