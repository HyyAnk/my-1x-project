import { describe, expect, it, vi, afterEach, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import type { BankQuestionWithCooldown } from "@studio/shared";
import { LanguageProvider } from "../../i18n";
import { QuestionBankLivePreview } from "./components/QuestionBankLivePreview";
import {
  PreviewEmptyState,
  QuestionBankArcadeTab,
  QuestionBankDetailsTab,
  PreviewStickyHeader,
  PreviewTabsBar,
} from "./components/preview";

function renderWithLanguage(ui: React.ReactElement, lang: string = "en") {
  window.localStorage.setItem("studio-language", lang);
  return render(<LanguageProvider>{ui}</LanguageProvider>);
}

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

const mockQuestion: BankQuestionWithCooldown = {
  id: "SPB-LOG-001",
  archetype_id: "speed_blitz",
  domain_id: "logic_puzzles",
  subtopic_id: "tricky_riddles",
  question: "How many ends does a stick have if broken in half?",
  format: "multiple_choice",
  choices: [
    { id: "A", text: "2 ends" },
    { id: "B", text: "4 ends" },
  ],
  correct_choice_id: "A",
  explanation: "Breaking a stick creates two smaller sticks, each with 2 ends.",
  fun_fact: "A stick with 1 end does not exist!",
  thinking_seconds: 5,
  difficulty: 3,
  age_band: "family",
  tags: ["riddles", "quick-thinking"],
  visual_spec: {
    intent: "question_illustration",
    prompt: "A wooden stick broken into two halves",
    aspect_ratio: "16:9",
  },
  channel_cooldown: {
    is_cooldown: true,
    days_remaining: 3,
    content_type: "short_reel",
    episode_title: "Episode 1",
  },
  status: "approved",
};

describe("QuestionBank Preview Sub-components", () => {
  it("renders PreviewEmptyState when no question is selected", () => {
    renderWithLanguage(<QuestionBankLivePreview question={null} />, "en");
    expect(screen.getByText("No Question Selected")).toBeDefined();
  });

  it("renders standalone PreviewEmptyState component", () => {
    renderWithLanguage(<PreviewEmptyState />, "en");
    expect(screen.getByText("No Question Selected")).toBeDefined();
  });

  it("renders PreviewStickyHeader and toggles showAnswer", () => {
    const onToggle = vi.fn();
    const onBuild = vi.fn();

    const { rerender } = renderWithLanguage(
      <PreviewStickyHeader question={mockQuestion} showAnswer={false} onToggleAnswer={onToggle} onQuickBuildVideo={onBuild} />,
      "en",
    );

    const toggleBtn = screen.getByText("Show Answer");
    fireEvent.click(toggleBtn);
    expect(onToggle).toHaveBeenCalledTimes(1);

    const buildBtn = screen.getByRole("button", { name: /Create Video Shorts Now/i });
    fireEvent.click(buildBtn);
    expect(onBuild).toHaveBeenCalledWith(mockQuestion);

    rerender(
      <LanguageProvider>
        <PreviewStickyHeader question={mockQuestion} showAnswer={true} onToggleAnswer={onToggle} onQuickBuildVideo={onBuild} />
      </LanguageProvider>,
    );
    expect(screen.getByText("Hide Answer")).toBeDefined();
  });

  it("renders PreviewTabsBar and responds to tab switches", () => {
    const onSwitchTab = vi.fn();
    renderWithLanguage(<PreviewTabsBar activeTab="arcade" onSwitchTab={onSwitchTab} />, "en");

    const detailsTabBtn = screen.getByRole("tab", { name: /Details/i });
    fireEvent.click(detailsTabBtn);
    expect(onSwitchTab).toHaveBeenCalledWith("details");
  });

  it("renders QuestionBankArcadeTab with choices and visual prompt hint", () => {
    renderWithLanguage(<QuestionBankArcadeTab question={mockQuestion} showAnswer={true} />, "en");

    expect(screen.getByText("How many ends does a stick have if broken in half?")).toBeDefined();
    expect(screen.getByText("2 ends")).toBeDefined();
    expect(screen.getByText("4 ends")).toBeDefined();
    expect(screen.getByText("✓ CORRECT")).toBeDefined();
    expect(screen.getByText(/A wooden stick broken into two halves/i)).toBeDefined();
    expect(screen.getByText("Breaking a stick creates two smaller sticks, each with 2 ends.")).toBeDefined();
  });

  it("renders QuestionBankDetailsTab with all metadata fields, tags, cooldown, and technical view", () => {
    renderWithLanguage(<QuestionBankDetailsTab question={mockQuestion} />, "en");

    expect(screen.getByText("speed_blitz")).toBeDefined();
    expect(screen.getByText("logic puzzles")).toBeDefined();
    expect(screen.getByText("tricky riddles")).toBeDefined();
    expect(screen.getByText("5s")).toBeDefined();
    expect(screen.getByText("⭐ 3/5")).toBeDefined();
    expect(screen.getByText("riddles, quick-thinking")).toBeDefined();
    expect(screen.getByText("Short (3d)")).toBeDefined();
    expect(screen.getByText("Technical Inspect View")).toBeDefined();
    expect(screen.getByText("A stick with 1 end does not exist!")).toBeDefined();
  });

  it("allows switching between Arcade and Details tabs in QuestionBankLivePreview", () => {
    renderWithLanguage(<QuestionBankLivePreview question={mockQuestion} />, "en");

    // Initially in arcade tab
    expect(screen.getByText("How many ends does a stick have if broken in half?")).toBeDefined();

    // Switch to details tab
    const detailsTabBtn = screen.getByRole("tab", { name: /Details/i });
    fireEvent.click(detailsTabBtn);

    // Now details metadata should be visible
    expect(screen.getByText("Technical Inspect View")).toBeDefined();
    expect(screen.getByText("riddles, quick-thinking")).toBeDefined();

    // Switch back to arcade tab
    const arcadeTabBtn = screen.getByRole("tab", { name: /arcade/i });
    fireEvent.click(arcadeTabBtn);
    expect(screen.getByText("How many ends does a stick have if broken in half?")).toBeDefined();
  });
});
