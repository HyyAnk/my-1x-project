import { describe, expect, it, vi, afterEach, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import type { BankIndex, BankQuestion, BankQuestionWithCooldown, BankTaxonomy, Channel } from "@studio/shared";
import { LanguageProvider } from "../../i18n";
import { QuestionBankHeaderStats } from "./components/QuestionBankHeaderStats";
import { QuestionBankToolbar } from "./components/QuestionBankToolbar";
import { QuestionBankTable } from "./components/QuestionBankTable";
import { QuestionBankLivePreview } from "./components/QuestionBankLivePreview";
import { QuestionBankAiGenerateModal } from "./components/QuestionBankAiGenerateModal";
import { QuestionBankTargetProgressBar } from "./components/QuestionBankTargetProgressBar";
import { getMilestoneProgress } from "./utils/questionBankMilestones";
import { buildBankQuestion } from "./utils/questionBankFormBuilder";
import type { QuestionBankFilters } from "./types/questionBankUi.types";

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

const mockStats: BankIndex = {
  schema_version: 2,
  target_total: 20000,
  current_total: 250,
  by_archetype: {
    speed_blitz: 100,
    verdict_fact_myth: 150,
  },
  by_domain: {
    logic_puzzles: 100,
    nature_animals: 150,
  },
  updated_at: "2026-09-04T12:00:00Z",
};

const mockTaxonomy: BankTaxonomy = {
  schema_version: 2,
  updated_at: "2026-09-04T12:00:00Z",
  domains: [
    {
      id: "logic_puzzles",
      title: "Logic Puzzles",
      description: "Mind-bending logic riddles",
      icon: "Brain",
      subtopics: [{ id: "tricky_riddles", title: "Tricky Riddles", description: "Classic trick questions" }],
    },
  ],
};

const mockQuestion: BankQuestionWithCooldown = {
  id: "SPB-LOG-001",
  archetype_id: "speed_blitz",
  domain_id: "logic_puzzles",
  subtopic_id: "tricky_riddles",
  question: "How many ends does a stick have if broken in half?",
  format: "multiple_choice",
  choices: [
    { id: "A", text: "1 end", is_correct: false },
    { id: "B", text: "2 ends", is_correct: true },
  ],
  correct_choice_id: "B",
  explanation: "Breaking a stick results in two sticks, each having 2 ends!",
  fun_fact: "This is a classic brain teaser.",
  visual_spec: { intent: "none", aspect_ratio: "16:9" },
  age_band: "family",
  difficulty: 2,
  thinking_seconds: 4,
  tags: ["riddle"],
  status: "approved",
  channel_cooldown: {
    is_cooldown: false,
    days_remaining: 0,
  },
};

describe("Question Bank Studio UI Components", () => {
  it("builds new manual questions with explicit English metadata", () => {
    const question = buildBankQuestion({
      archetypeId: "speed_blitz",
      domainId: "logic_puzzles",
      subtopicId: "tricky_riddles",
      questionText: "Which answer is correct?",
      format: "multiple_choice",
      choices: [
        { id: "A", text: "Correct", is_correct: true },
        { id: "B", text: "Wrong", is_correct: false },
        { id: "C", text: "Also wrong", is_correct: false },
      ],
      explanation: "The first answer is correct.",
      funFact: "Facts make quizzes memorable.",
      visualPrompt: "",
      difficulty: 2,
      thinkingSeconds: 4,
      ageBand: "family",
    });

    expect(question.language).toBe("en");
    expect(question.translations).toBeUndefined();
  });

  it("QuestionBankHeaderStats renders current count, progress bar, and buttons in English", () => {
    const onRecalculate = vi.fn();
    const onOpenAiModal = vi.fn();

    renderWithLanguage(
      <QuestionBankHeaderStats stats={mockStats} recalculating={false} onRecalculate={onRecalculate} onOpenAiModal={onOpenAiModal} />,
      "en",
    );

    expect(screen.getByText("Question Bank Studio")).toBeDefined();
    expect(screen.getAllByText(/Starter Seed/).length).toBeGreaterThan(0);
    expect(screen.getByText(/250/)).toBeDefined();
    expect(screen.getAllByText(/2,000/).length).toBeGreaterThan(0);
    expect(screen.getByText("12.5%")).toBeDefined();
    expect(screen.getByText("20K")).toBeDefined();

    const recalcBtn = screen.getByTitle("Scan storage and synchronize index");
    fireEvent.click(recalcBtn);
    expect(onRecalculate).toHaveBeenCalledTimes(1);

    const aiBtn = screen.getByText("AI Batch Generate");
    fireEvent.click(aiBtn);
    expect(onOpenAiModal).toHaveBeenCalledTimes(1);
  });

  it("QuestionBankToolbar renders filters and triggers callbacks in English", () => {
    const onUpdateFilter = vi.fn();
    const onResetFilters = vi.fn();
    const onOpenCreateModal = vi.fn();

    const filters: QuestionBankFilters = {
      channelId: "ch_test",
      archetypeId: "",
      domainId: "",
      subtopicId: "",
      status: "",
      cooldownFilter: "all",
      languageFilter: "",
      translationFilter: "all",
      search: "",
      page: 1,
      pageSize: 20,
    };

    renderWithLanguage(
      <QuestionBankToolbar
        taxonomy={mockTaxonomy}
        filters={filters}
        totalQuestions={25}
        onUpdateFilter={onUpdateFilter}
        onResetFilters={onResetFilters}
        onOpenCreateModal={onOpenCreateModal}
      />,
      "en",
    );

    expect(screen.getByPlaceholderText(/Search by question prompt/)).toBeDefined();
    expect(screen.getByText(/25 questions found/)).toBeDefined();
    expect(screen.getByLabelText("Domain:")).toBeDefined();

    const searchInput = screen.getByPlaceholderText(/Search by question prompt/);
    fireEvent.change(searchInput, { target: { value: "space" } });
    expect(onUpdateFilter).toHaveBeenCalledWith("search", "space");

    const domainSelect = screen.getByLabelText("Domain:");
    fireEvent.change(domainSelect, { target: { value: "logic_puzzles" } });
    expect(onUpdateFilter).toHaveBeenCalledWith("domainId", "logic_puzzles");

    const addBtn = screen.getByText("Add Question");
    fireEvent.click(addBtn);
    expect(onOpenCreateModal).toHaveBeenCalledTimes(1);

    const resetBtn = screen.getByTitle("Reset all filters");
    fireEvent.click(resetBtn);
    expect(onResetFilters).toHaveBeenCalledTimes(1);
  });

  it("QuestionBankTable renders question list, cooldown badges and selects item in English", () => {
    const onSelectQuestion = vi.fn();
    const onEditQuestion = vi.fn();
    const onDeleteQuestion = vi.fn();
    const onPageChange = vi.fn();

    renderWithLanguage(
      <QuestionBankTable
        questions={[mockQuestion]}
        total={1}
        loading={false}
        page={1}
        pageSize={20}
        selectedId={null}
        hasChannelSelected={true}
        onSelectQuestion={onSelectQuestion}
        onEditQuestion={onEditQuestion}
        onDeleteQuestion={onDeleteQuestion}
        onPageChange={onPageChange}
      />,
      "en",
    );

    expect(screen.getByText("SPB-LOG-001")).toBeDefined();
    expect(screen.getByText("How many ends does a stick have if broken in half?")).toBeDefined();
    expect(screen.getByText("Ready")).toBeDefined();
    expect(screen.getByText("EN")).toBeDefined();

    // Select row
    const row = screen.getByText("SPB-LOG-001").closest("tr");
    if (row) fireEvent.click(row);
    expect(onSelectQuestion).toHaveBeenCalledWith(mockQuestion);

    // Edit button
    const editBtn = screen.getByTitle("Edit question content");
    fireEvent.click(editBtn);
    expect(onEditQuestion).toHaveBeenCalledWith(mockQuestion);
  });

  it("QuestionBankLivePreview renders simulated layout and reveals answer in English", () => {
    const onQuickBuildVideo = vi.fn();

    renderWithLanguage(<QuestionBankLivePreview question={mockQuestion} onQuickBuildVideo={onQuickBuildVideo} />, "en");

    expect(screen.getByText("speed_blitz")).toBeDefined();
    expect(screen.getByText("How many ends does a stick have if broken in half?")).toBeDefined();

    // Toggle reveal answer
    const revealBtn = screen.getByText("Show Answer");
    fireEvent.click(revealBtn);
    expect(screen.getByText("✓ CORRECT")).toBeDefined();

    // Quick build button
    const quickBuildBtn = screen.getByText("🎬 Create Video Shorts Now (1-Click Build)");
    fireEvent.click(quickBuildBtn);
    expect(onQuickBuildVideo).toHaveBeenCalledWith(mockQuestion);
  });

  it("QuestionBankLivePreview always renders the English source", () => {
    const onQuickBuildVideo = vi.fn();

    const englishQuestion: BankQuestionWithCooldown = {
      ...mockQuestion,
      language: "en",
      question: "Which planet is known as the Red Planet?",
      choices: [
        { id: "A", text: "Mars", is_correct: true },
        { id: "B", text: "Venus", is_correct: false },
      ],
      translations: {
        es: {
          language: "es",
          question: "¿Qué planeta se conoce como el Planeta Rojo?",
          choices: [
            { id: "A", text: "Marte" },
            { id: "B", text: "Venus" },
          ],
          explanation: "Marte tiene un color rojizo por el óxido de hierro.",
          fun_fact: "Alberga el Olympus Mons.",
          translated_at: "2026-09-04T12:00:00Z",
          verified: true,
        },
      },
    };

    renderWithLanguage(<QuestionBankLivePreview question={englishQuestion} onQuickBuildVideo={onQuickBuildVideo} />, "en");

    // Initial view is original English
    expect(screen.getByText("Which planet is known as the Red Planet?")).toBeDefined();
    expect(screen.getByText("Mars")).toBeDefined();

    expect(screen.queryByText("¿Qué planeta se conoce como el Planeta Rojo?")).toBeNull();
    expect(screen.queryByText("Retranslate with AI to refresh wording")).toBeNull();
  });

  it("renders components in English even when legacy language is set to 'vi'", () => {
    const onRecalculate = vi.fn();
    const onOpenAiModal = vi.fn();
    const onUpdateFilter = vi.fn();
    const onResetFilters = vi.fn();
    const onOpenCreateModal = vi.fn();

    const filters: QuestionBankFilters = {
      channelId: "ch_test",
      archetypeId: "",
      domainId: "",
      subtopicId: "",
      status: "",
      cooldownFilter: "all",
      languageFilter: "",
      translationFilter: "all",
      search: "",
      page: 1,
      pageSize: 20,
    };

    renderWithLanguage(
      <div>
        <QuestionBankHeaderStats stats={mockStats} recalculating={false} onRecalculate={onRecalculate} onOpenAiModal={onOpenAiModal} />
        <QuestionBankToolbar
          channels={[{ channel_id: "ch_test", display_name: "Channel Test", slug: "test" } as unknown as Channel]}
          taxonomy={mockTaxonomy}
          filters={filters}
          onUpdateFilter={onUpdateFilter}
          onResetFilters={onResetFilters}
          onOpenCreateModal={onOpenCreateModal}
        />
      </div>,
      "en",
    );

    // Header stats in English
    expect(screen.getByText("Question Bank Studio")).toBeDefined();
    expect(screen.getAllByText(/Starter Seed/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/2,000/).length).toBeGreaterThan(0);
    expect(screen.getByText("12.5%")).toBeDefined();
    expect(screen.getByText("AI Batch Generate")).toBeDefined();
    expect(screen.getByTitle("Scan storage and synchronize index")).toBeDefined();

    // Toolbar in English
    expect(screen.getByPlaceholderText(/Search by question prompt/)).toBeDefined();
    expect(screen.getByLabelText("Domain:")).toBeDefined();
    expect(screen.getByText("Add Question")).toBeDefined();
  });

  it("QuestionBankHeaderStats renders matrix coverage stats and progress bar", () => {
    const onRecalculate = vi.fn();
    const onOpenAiModal = vi.fn();

    const mockMatrixCoverage = {
      total_combos: 20000,
      covered_combos: 320,
      total_variants: 320,
      coverage_percent: 1.6,
      by_archetype: {},
      by_domain: {},
    };

    renderWithLanguage(
      <QuestionBankHeaderStats
        stats={mockStats}
        matrixCoverage={mockMatrixCoverage}
        recalculating={false}
        onRecalculate={onRecalculate}
        onOpenAiModal={onOpenAiModal}
      />,
      "en",
    );

    expect(screen.getByText(/320 \/ 20,000 Combos/)).toBeDefined();
    expect(screen.getByTitle(/19,680 combos unfilled/i)).toBeDefined();
  });

  it("QuestionBankAiGenerateModal supports Auto Coverage and Manual Diversity modes", () => {
    const onGenerate = vi.fn().mockResolvedValue({
      success: true,
      mode: "auto",
      requestedCount: 40,
      generatedCount: 40,
      approvedCount: 38,
      rejectedCount: 2,
      qaSummary: { duplicateRejections: 1, schemaRejections: 0, qualityRejections: 1 },
      savedQuestions: [],
      rejectedQuestions: [
        {
          question: { question: "Disqualified question" },
          issues: [{ type: "duplicate", message: "Semantic duplicate of existing question" }],
        },
      ],
      matrixCoverage: {
        total_combos: 20000,
        covered_combos: 358,
        total_variants: 358,
        coverage_percent: 1.8,
        by_archetype: {},
        by_domain: {},
      },
    });
    const onClose = vi.fn();

    renderWithLanguage(
      <QuestionBankAiGenerateModal
        taxonomy={mockTaxonomy}
        matrixCoverage={{
          total_combos: 20000,
          covered_combos: 320,
          total_variants: 320,
          coverage_percent: 1.6,
          by_archetype: {},
          by_domain: {},
        }}
        generating={false}
        onGenerate={onGenerate}
        onClose={onClose}
      />,
      "en",
    );

    // 1. Initial view is Auto Coverage Mode
    expect(screen.getByText("Generate Question Batch with AI (With Auto-QA)")).toBeDefined();
    expect(screen.getByText("Auto Coverage Mode")).toBeDefined();
    expect(screen.getByText("Manual Diversity Mode")).toBeDefined();
    expect(screen.getByText(/Auto-Fill Matrix \(20 questions\)/)).toBeDefined();

    // 2. Verify all volume chips including 200 and 500 presets
    expect(screen.getByText(/200 Questions \(10 chunks\)/)).toBeDefined();
    expect(screen.getByText(/500 Questions \(25 chunks\)/)).toBeDefined();

    const chip40 = screen.getByText(/40 Questions/);
    fireEvent.click(chip40);
    expect(screen.getByText(/Auto-Fill Matrix \(40 questions\)/)).toBeDefined();

    // 3. Switch to Manual Diversity Mode
    const manualTab = screen.getByText("Manual Diversity Mode");
    fireEvent.click(manualTab);
    expect(screen.getByText("Target Archetype:")).toBeDefined();
    expect(screen.getByText("Domain:")).toBeDefined();
    expect(screen.getByText(/Least-Variant-First Active/)).toBeDefined();
    expect(screen.getByText(/Generate Filtered Batch \(40 questions\)/)).toBeDefined();

    // 4. Switch back to Auto Coverage Mode and submit
    const autoTab = screen.getByText("Auto Coverage Mode");
    fireEvent.click(autoTab);

    const submitBtn = screen.getByText(/Auto-Fill Matrix \(40 questions\)/);
    fireEvent.click(submitBtn);

    expect(onGenerate).toHaveBeenCalledWith({
      mode: "auto",
      count: 40,
      target_count: 40,
      difficulty: 2,
      persist: true,
    });
  });

  it("QuestionBankAiGenerateModal tolerates historical payloads containing copyrightRejections at input boundary", async () => {
    const historicalPayload = {
      success: true,
      mode: "auto" as const,
      requestedCount: 20,
      generatedCount: 20,
      approvedCount: 19,
      rejectedCount: 1,
      qaSummary: {
        copyrightRejections: 1, // tolerated historical field
        duplicateRejections: 0,
        schemaRejections: 0,
        qualityRejections: 0,
      },
      savedQuestions: [],
      rejectedQuestions: [
        {
          question: {
            id: "Q-HIST-1",
            archetype_id: "speed_blitz",
            domain_id: "nature_animals",
            subtopic_id: "mammals",
            language: "en",
            format: "multiple_choice",
            question: "Sample question?",
            choices: [],
            correct_choice_id: "A",
            explanation: "Exp",
            status: "draft",
          } as unknown as BankQuestion,
          issues: [{ type: "quality", message: "Legacy rejection note" }],
        },
      ],
    };

    const onGenerate = vi.fn().mockResolvedValue(historicalPayload);
    const onClose = vi.fn();

    renderWithLanguage(
      <QuestionBankAiGenerateModal
        taxonomy={mockTaxonomy}
        matrixCoverage={null}
        generating={false}
        onGenerate={onGenerate}
        onClose={onClose}
      />,
      "en",
    );

    const submitBtn = screen.getByText(/Auto-Fill Matrix \(20 questions\)/);
    fireEvent.click(submitBtn);

    await vi.waitFor(() => {
      expect(screen.getByText("Question batch generation complete!")).toBeDefined();
      expect(screen.getByText(/Legacy rejection note/)).toBeDefined();
    });
  });

  it("QuestionBankAiGenerateModal disables submission and renders spinner during pending generation", () => {
    const onGenerate = vi.fn();
    const onClose = vi.fn();

    renderWithLanguage(
      <QuestionBankAiGenerateModal
        taxonomy={mockTaxonomy}
        matrixCoverage={null}
        generating={true}
        onGenerate={onGenerate}
        onClose={onClose}
      />,
      "en",
    );

    const submitBtn = screen.getByRole("button", { name: /generating/i });
    expect(submitBtn.hasAttribute("disabled")).toBe(true);
    fireEvent.click(submitBtn);
    expect(onGenerate).not.toHaveBeenCalled();
  });

  it("QuestionBankAiGenerateModal preserves form input on failure and allows retry", async () => {
    let callCount = 0;
    const onGenerate = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.reject(new Error("Network timeout during generation"));
      }
      return Promise.resolve({
        success: true,
        mode: "auto",
        requestedCount: 40,
        generatedCount: 40,
        approvedCount: 40,
        rejectedCount: 0,
        qaSummary: { duplicateRejections: 0, schemaRejections: 0, qualityRejections: 0 },
        savedQuestions: [],
        rejectedQuestions: [],
      });
    });
    const onClose = vi.fn();

    renderWithLanguage(
      <QuestionBankAiGenerateModal
        taxonomy={mockTaxonomy}
        matrixCoverage={null}
        generating={false}
        onGenerate={onGenerate}
        onClose={onClose}
      />,
      "en",
    );

    // Select 40 questions
    const chip40 = screen.getByText(/40 Questions/);
    fireEvent.click(chip40);

    // First submit fails
    const submitBtn = screen.getByText(/Auto-Fill Matrix \(40 questions\)/);
    fireEvent.click(submitBtn);

    await vi.waitFor(() => {
      expect(screen.getByText("Network timeout during generation")).toBeDefined();
    });

    // Form retains targetCount 40
    expect(screen.getByText(/Auto-Fill Matrix \(40 questions\)/)).toBeDefined();

    // Retry submit succeeds
    fireEvent.click(screen.getByText(/Auto-Fill Matrix \(40 questions\)/));
    await vi.waitFor(() => {
      expect(screen.getByText("Question batch generation complete!")).toBeDefined();
    });
    expect(callCount).toBe(2);
  });

  it("QuestionBankAiGenerateModal auto-closes immediately when generation starts as a background job", async () => {
    const onGenerate = vi.fn().mockResolvedValue({
      success: true,
      job: {
        jobId: "job-test-123",
        status: "running",
        mode: "auto",
        targetCount: 20,
        startedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        progress: {
          totalRequested: 20,
          completedCount: 0,
          currentChunk: 1,
          totalChunks: 1,
          chunkSize: 20,
          approvedInChunk: 0,
          rejectedInChunk: 0,
          approvedTotal: 0,
          rejectedTotal: 0,
        },
      },
    });
    const onClose = vi.fn();

    renderWithLanguage(
      <QuestionBankAiGenerateModal
        taxonomy={mockTaxonomy}
        matrixCoverage={null}
        generating={false}
        onGenerate={onGenerate}
        onClose={onClose}
      />,
      "en",
    );

    const submitBtn = screen.getByText(/Auto-Fill Matrix \(20 questions\)/);
    fireEvent.click(submitBtn);

    expect(onGenerate).toHaveBeenCalled();
    await vi.waitFor(() => {
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  it("QuestionBankTargetProgressBar renders segmented rail, milestone nodes, and active tier metrics", () => {
    const progress = getMilestoneProgress(250);
    renderWithLanguage(<QuestionBankTargetProgressBar currentTotal={250} milestoneProgress={progress} />, "en");

    const progressBar = screen.getByRole("progressbar");
    expect(progressBar).toBeDefined();
    expect(progressBar.getAttribute("aria-valuenow")).toBe("250");
    expect(progressBar.getAttribute("aria-valuemax")).toBe("2000");

    expect(screen.getAllByText("Starter Seed").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("1,750 questions to Foundation")).toBeDefined();
    expect(screen.getByText("12.5%")).toBeDefined();

    // Verify milestone checkpoints
    expect(screen.getByText("2K")).toBeDefined();
    expect(screen.getByText("5K")).toBeDefined();
    expect(screen.getByText("10K")).toBeDefined();
    expect(screen.getByText("20K")).toBeDefined();
    expect(screen.getByText("50K")).toBeDefined();
    expect(screen.getByText("100K")).toBeDefined();
  });

  it("QuestionBankTargetProgressBar displays max tier achieved state cleanly", () => {
    const maxProgress = getMilestoneProgress(120000);
    renderWithLanguage(<QuestionBankTargetProgressBar currentTotal={120000} milestoneProgress={maxProgress} />, "en");

    expect(screen.getByText("Max Tier Achieved")).toBeDefined();
    expect(screen.getByText("100%")).toBeDefined();
  });
});
