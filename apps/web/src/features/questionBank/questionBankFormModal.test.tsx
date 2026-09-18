import { describe, expect, it, vi, afterEach, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor, renderHook, act } from "@testing-library/react";
import type { BankQuestion, BankTaxonomy } from "@studio/shared";
import { LanguageProvider } from "../../i18n";
import { QuestionBankFormModal } from "./components/QuestionBankFormModal";
import { useQuestionBankForm, resolveInitialFormState } from "./hooks/useQuestionBankForm";

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
    {
      id: "nature_animals",
      title: "Nature & Animals",
      description: "Wildlife and ecosystems",
      icon: "Leaf",
      subtopics: [{ id: "mammals", title: "Mammals", description: "Warm-blooded animals" }],
    },
  ],
};

const mockInitialQuestion: BankQuestion = {
  id: "SPB-LOG-100",
  archetype_id: "speed_blitz",
  domain_id: "logic_puzzles",
  subtopic_id: "tricky_riddles",
  question: "What has keys but no locks?",
  format: "multiple_choice",
  choices: [
    { id: "A", text: "A piano", is_correct: true },
    { id: "B", text: "A door", is_correct: false },
  ],
  correct_choice_id: "A",
  explanation: "A piano has musical keys.",
  fun_fact: "Pianos have 88 keys.",
  visual_spec: { intent: "question_illustration", aspect_ratio: "16:9", prompt: "A wooden grand piano" },
  age_band: "family",
  difficulty: 2,
  thinking_seconds: 4,
  tags: ["riddle"],
  status: "draft",
};

describe("useQuestionBankForm hook", () => {
  it("resolves default state when initialQuestion is null", () => {
    const state = resolveInitialFormState(null, mockTaxonomy);
    expect(state.isEditing).toBe(false);
    expect(state.archetypeId).toBe("speed_blitz");
    expect(state.domainId).toBe("logic_puzzles");
    expect(state.choices).toHaveLength(2);
  });

  it("normalizes legacy archetype verdict_fact_myth to verdict_true_false", () => {
    const state = resolveInitialFormState({
      ...mockInitialQuestion,
      archetype_id: "verdict_fact_myth" as any,
    });
    expect(state.archetypeId).toBe("verdict_true_false");
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => <LanguageProvider>{children}</LanguageProvider>;

  it("manages choice mutators: add, update, set correct, remove", () => {
    const onSave = vi.fn();
    const { result } = renderHook(
      () =>
        useQuestionBankForm({
          initialQuestion: mockInitialQuestion,
          taxonomy: mockTaxonomy,
          onSave,
        }),
      { wrapper },
    );

    // Add choice
    act(() => {
      result.current.handleAddChoice();
    });
    expect(result.current.choices).toHaveLength(3);
    expect(result.current.choices[2].id).toBe("C");

    // Update choice text
    act(() => {
      result.current.handleUpdateChoiceText("C", "A keyboard");
    });
    expect(result.current.choices[2].text).toBe("A keyboard");

    // Set correct
    act(() => {
      result.current.handleSetCorrect("C");
    });
    expect(result.current.choices[0].is_correct).toBe(false);
    expect(result.current.choices[2].is_correct).toBe(true);

    // Remove choice
    act(() => {
      result.current.handleRemoveChoice("C");
    });
    expect(result.current.choices).toHaveLength(2);

    // Attempt remove with 2 choices triggers minimum choices error
    act(() => {
      result.current.handleRemoveChoice("B");
    });
    expect(result.current.choices).toHaveLength(2);
    expect(result.current.error).toBe("Question must have at least 2 choices.");
  });

  it("handles archetype transitions for mystery_reveal", () => {
    const onSave = vi.fn();
    const { result } = renderHook(
      () =>
        useQuestionBankForm({
          initialQuestion: mockInitialQuestion,
          taxonomy: mockTaxonomy,
          onSave,
        }),
      { wrapper },
    );

    act(() => {
      result.current.handleArchetypeChange("mystery_reveal");
    });
    expect(result.current.archetypeId).toBe("mystery_reveal");
    expect(result.current.choices).toHaveLength(1);
    expect(result.current.choices[0].text).toBe("A piano");

    act(() => {
      result.current.handleArchetypeChange("speed_blitz");
    });
    expect(result.current.choices).toHaveLength(2);
  });

  it("validates empty question and sets error on handleSubmit", async () => {
    const onSave = vi.fn();
    const { result } = renderHook(
      () =>
        useQuestionBankForm({
          initialQuestion: { ...mockInitialQuestion, question: "" },
          taxonomy: mockTaxonomy,
          onSave,
        }),
      { wrapper },
    );

    await act(async () => {
      await result.current.handleSubmit();
    });
    expect(onSave).not.toHaveBeenCalled();
    expect(result.current.error).toBe("Please enter question content.");
  });
});

describe("QuestionBankFormModal component", () => {
  it("renders create form with default values and closes on cancel", () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();

    renderWithLanguage(<QuestionBankFormModal taxonomy={mockTaxonomy} onSave={onSave} onClose={onClose} />);

    expect(screen.getByText("Add New Question to Bank")).toBeDefined();
    const cancelBtn = screen.getByText("Cancel");
    fireEvent.click(cancelBtn);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("renders edit form pre-populated with initial question data", () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();

    renderWithLanguage(
      <QuestionBankFormModal initialQuestion={mockInitialQuestion} taxonomy={mockTaxonomy} onSave={onSave} onClose={onClose} />,
    );

    expect(screen.getByText("Edit Question [SPB-LOG-100]")).toBeDefined();
    expect(screen.getByDisplayValue("What has keys but no locks?")).toBeDefined();
    expect(screen.getByDisplayValue("A piano has musical keys.")).toBeDefined();
    expect(screen.getByDisplayValue("Pianos have 88 keys.")).toBeDefined();
    expect(screen.getByDisplayValue("A wooden grand piano")).toBeDefined();
  });

  it("submits valid question and triggers onSave and onClose", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();

    renderWithLanguage(
      <QuestionBankFormModal initialQuestion={mockInitialQuestion} taxonomy={mockTaxonomy} onSave={onSave} onClose={onClose} />,
    );

    const submitBtn = screen.getByText("Save Question");
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledTimes(1);
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    const savedArg = onSave.mock.calls[0][0];
    expect(savedArg.id).toBe("SPB-LOG-100");
    expect(savedArg.question).toBe("What has keys but no locks?");
    expect(savedArg.choices).toHaveLength(2);
  });

  it("displays error when onSave throws an exception", async () => {
    const onSave = vi.fn().mockRejectedValue(new Error("Network write error"));
    const onClose = vi.fn();

    renderWithLanguage(
      <QuestionBankFormModal initialQuestion={mockInitialQuestion} taxonomy={mockTaxonomy} onSave={onSave} onClose={onClose} />,
    );

    const submitBtn = screen.getByText("Save Question");
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText("Network write error")).toBeDefined();
    });
    expect(onClose).not.toHaveBeenCalled();
  });

  it("closes modal when clicking close button or backdrop", () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();

    renderWithLanguage(<QuestionBankFormModal taxonomy={mockTaxonomy} onSave={onSave} onClose={onClose} />);

    const closeBtn = screen.getByTitle("Cancel");
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalledTimes(1);

    // Clicking card does not close (stopPropagation)
    const card = screen.getByText("Add New Question to Bank").closest(".qb-modal-card");
    if (card) fireEvent.click(card);
    expect(onClose).toHaveBeenCalledTimes(1);

    // Clicking backdrop closes modal
    const backdrop = screen.getByText("Add New Question to Bank").closest(".qb-modal-backdrop");
    if (backdrop) fireEvent.click(backdrop);
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
