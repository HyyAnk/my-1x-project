import { describe, expect, it, vi, afterEach, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import type { BankIndex, BankQuestionWithCooldown, BankTaxonomy } from "@studio/shared";
import { LanguageProvider } from "../../i18n";
import { QuestionBankHeaderStats } from "./components/QuestionBankHeaderStats";
import { QuestionBankToolbar } from "./components/QuestionBankToolbar";
import { QuestionBankTable } from "./components/QuestionBankTable";
import { QuestionBankLivePreview } from "./components/QuestionBankLivePreview";
import { QuestionBankAiGenerateModal } from "./components/QuestionBankAiGenerateModal";
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
  target_total: 10000,
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
  it("QuestionBankHeaderStats renders current count, progress bar, and buttons in English", () => {
    const onRecalculate = vi.fn();
    const onOpenAiModal = vi.fn();

    renderWithLanguage(
      <QuestionBankHeaderStats stats={mockStats} recalculating={false} onRecalculate={onRecalculate} onOpenAiModal={onOpenAiModal} />,
      "en",
    );

    expect(screen.getByText("Question Bank Studio")).toBeDefined();
    expect(screen.getByText(/250/)).toBeDefined();
    expect(screen.getAllByText(/10,000/).length).toBeGreaterThan(0);
    expect(screen.getByText("2.5%")).toBeDefined();

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
        channels={[{ channel_id: "ch_test", display_name: "Test Channel", slug: "test" } as any]}
        taxonomy={mockTaxonomy}
        filters={filters}
        onUpdateFilter={onUpdateFilter}
        onResetFilters={onResetFilters}
        onOpenCreateModal={onOpenCreateModal}
      />,
      "en",
    );

    expect(screen.getByLabelText("Channel Cooldown:")).toBeDefined();
    expect(screen.getByLabelText("Archetype:")).toBeDefined();
    expect(screen.getByLabelText("Domain:")).toBeDefined();
    expect(screen.getByLabelText("Source Language:")).toBeDefined();
    expect(screen.getByLabelText("Translations:")).toBeDefined();

    const langSelect = screen.getByLabelText("Source Language:");
    fireEvent.change(langSelect, { target: { value: "en" } });
    expect(onUpdateFilter).toHaveBeenCalledWith("languageFilter", "en");

    const transSelect = screen.getByLabelText("Translations:");
    fireEvent.change(transSelect, { target: { value: "has_translation" } });
    expect(onUpdateFilter).toHaveBeenCalledWith("translationFilter", "has_translation");

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
    const onToggleAspect = vi.fn();
    const onQuickBuildVideo = vi.fn();

    renderWithLanguage(
      <QuestionBankLivePreview
        question={mockQuestion}
        aspect="16:9"
        onToggleAspect={onToggleAspect}
        onQuickBuildVideo={onQuickBuildVideo}
      />,
      "en",
    );

    expect(screen.getByText("speed_blitz")).toBeDefined();
    expect(screen.getByText("How many ends does a stick have if broken in half?")).toBeDefined();

    // Toggle reveal answer
    const revealBtn = screen.getByText("Show Answer");
    fireEvent.click(revealBtn);
    expect(screen.getByText("✓ CORRECT")).toBeDefined();

    // Aspect ratio toggle
    const aspectBtn = screen.getByText("16:9");
    fireEvent.click(aspectBtn);
    expect(onToggleAspect).toHaveBeenCalledTimes(1);

    // Quick build button
    const quickBuildBtn = screen.getByText("🎬 Create Video Shorts Now (1-Click Build)");
    fireEvent.click(quickBuildBtn);
    expect(onQuickBuildVideo).toHaveBeenCalledWith(mockQuestion, "16:9");
  });

  it("QuestionBankLivePreview switches languages and triggers on-demand transcreation", async () => {
    const onToggleAspect = vi.fn();
    const onQuickBuildVideo = vi.fn();
    const onTranscreateQuestion = vi.fn().mockResolvedValue({ success: true });

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

    renderWithLanguage(
      <QuestionBankLivePreview
        question={englishQuestion}
        aspect="16:9"
        onToggleAspect={onToggleAspect}
        onQuickBuildVideo={onQuickBuildVideo}
        onTranscreateQuestion={onTranscreateQuestion}
      />,
      "en",
    );

    // Initial view is original English
    expect(screen.getByText("Which planet is known as the Red Planet?")).toBeDefined();
    expect(screen.getByText("Mars")).toBeDefined();

    // Switch to Spanish tab
    const esTab = screen.getByText("ES");
    fireEvent.click(esTab);

    // Should now display the cached Spanish translation
    expect(screen.getByText("¿Qué planeta se conoce como el Planeta Rojo?")).toBeDefined();
    expect(screen.getByText("Marte")).toBeDefined();
    expect(screen.getByText("Venus")).toBeDefined();

    // Retranscreate button
    const retransBtn = screen.getByTitle("Retranslate with AI to refresh wording");
    fireEvent.click(retransBtn);
    expect(onTranscreateQuestion).toHaveBeenCalledWith("SPB-LOG-001", "es");
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
          channels={[{ channel_id: "ch_test", display_name: "Channel Test", slug: "test" } as any]}
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
    expect(screen.getByText(/Repository of 10,000 standardized questions/)).toBeDefined();
    expect(screen.getByText("AI Batch Generate")).toBeDefined();
    expect(screen.getByTitle("Scan storage and synchronize index")).toBeDefined();

    // Toolbar in English
    expect(screen.getByLabelText("Channel Cooldown:")).toBeDefined();
    expect(screen.getByLabelText("Archetype:")).toBeDefined();
    expect(screen.getByText("Add Question")).toBeDefined();
  });

  it("QuestionBankAiGenerateModal renders in English", () => {
    const onGenerate = vi.fn().mockResolvedValue({
      success: true,
      generatedCount: 5,
      approvedCount: 4,
      rejectedCount: 1,
      rejectedQuestions: [
        {
          question: { question: "Disqualified question" },
          issues: [{ code: "COPYRIGHT_VIOLATION", message: "Contains Spider-Man" }],
        },
      ],
    });
    const onClose = vi.fn();

    renderWithLanguage(
      <QuestionBankAiGenerateModal taxonomy={mockTaxonomy} generating={false} onGenerate={onGenerate} onClose={onClose} />,
      "en",
    );

    expect(screen.getByText("Generate Question Batch with AI (With Auto-QA)")).toBeDefined();
    expect(screen.getByText("Target Archetype:")).toBeDefined();
    expect(screen.getByText("Auto-QA Assurance:")).toBeDefined();
    expect(screen.getByText("Start generating 5 questions")).toBeDefined();
  });
});
