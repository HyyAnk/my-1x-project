import { useState } from "react";
import type { BankChoice, BankGameplayArchetypeId, BankQuestion, BankTaxonomy, QuizAgeBand, QuizQuestionFormat } from "@studio/shared";
import { useTranslation } from "../../../i18n";
import { appendNextChoice, buildBankQuestion, removeChoiceItem } from "../utils/questionBankFormBuilder";
import { validateQuestionForm } from "../utils/questionBankFormValidation";

export interface UseQuestionBankFormParams {
  initialQuestion?: BankQuestion | null;
  taxonomy?: BankTaxonomy | null;
  onSave: (q: BankQuestion) => Promise<void>;
  onClose?: () => void;
}

export interface QuestionBankFormState {
  isEditing: boolean;
  archetypeId: BankGameplayArchetypeId;
  domainId: string;
  subtopicId: string;
  questionText: string;
  format: QuizQuestionFormat;
  explanation: string;
  funFact: string;
  visualPrompt: string;
  difficulty: number;
  thinkingSeconds: number;
  ageBand: QuizAgeBand;
  choices: BankChoice[];
}

function normalizeArchetype(raw?: string): BankGameplayArchetypeId {
  if (raw === "verdict_fact_myth") return "verdict_true_false";
  return (raw as BankGameplayArchetypeId) || "speed_blitz";
}

function resolveInitialChoices(initial?: BankChoice[], arch?: BankGameplayArchetypeId): BankChoice[] {
  if (initial && initial.length > 0) return initial;
  if (arch === "mystery_reveal") {
    return [{ id: "A", text: "Reveal Answer", is_correct: true }];
  }
  return [
    { id: "A", text: "Option A", is_correct: true },
    { id: "B", text: "Option B", is_correct: false },
  ];
}

export function resolveInitialFormState(initialQuestion?: BankQuestion | null, taxonomy?: BankTaxonomy | null): QuestionBankFormState {
  const normalizedArch = normalizeArchetype(initialQuestion?.archetype_id);
  const format = (initialQuestion?.format as QuizQuestionFormat) || "multiple_choice";
  const ageBand = (initialQuestion?.age_band as QuizAgeBand) || "family";
  const fallbackDomain = taxonomy?.domains?.[0]?.id || "logic_puzzles";

  return {
    isEditing: Boolean(initialQuestion?.id),
    archetypeId: normalizedArch,
    domainId: initialQuestion?.domain_id || fallbackDomain,
    subtopicId: initialQuestion?.subtopic_id || "tricky_riddles",
    questionText: initialQuestion?.question || "",
    format,
    explanation: initialQuestion?.explanation || "",
    funFact: initialQuestion?.fun_fact || "",
    visualPrompt: initialQuestion?.visual_spec?.prompt || "",
    difficulty: initialQuestion?.difficulty ?? 2,
    thinkingSeconds: initialQuestion?.thinking_seconds ?? 4,
    ageBand,
    choices: resolveInitialChoices(initialQuestion?.choices, normalizedArch),
  };
}

export function useQuestionBankForm({ initialQuestion, taxonomy, onSave, onClose }: UseQuestionBankFormParams) {
  const { t } = useTranslation();
  const [initialState] = useState(() => resolveInitialFormState(initialQuestion, taxonomy));
  const isEditing = initialState.isEditing;

  const [archetypeId, setArchetypeId] = useState<BankGameplayArchetypeId>(initialState.archetypeId);
  const [domainId, setDomainId] = useState<string>(initialState.domainId);
  const [subtopicId, setSubtopicId] = useState<string>(initialState.subtopicId);
  const [questionText, setQuestionText] = useState<string>(initialState.questionText);
  const [explanation, setExplanation] = useState<string>(initialState.explanation);
  const [funFact, setFunFact] = useState<string>(initialState.funFact);
  const [visualPrompt, setVisualPrompt] = useState<string>(initialState.visualPrompt);
  const [choices, setChoices] = useState<BankChoice[]>(initialState.choices);

  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleArchetypeChange = (newArch: BankGameplayArchetypeId) => {
    setArchetypeId(newArch);
    if (newArch === "mystery_reveal") {
      const correctChoice = choices.find((c) => c.is_correct) || choices[0] || { id: "A", text: "Reveal Answer", is_correct: true };
      setChoices([{ id: "A", text: correctChoice.text || "Reveal Answer", is_correct: true }]);
    } else if (choices.length < 2) {
      setChoices([
        { id: "A", text: choices[0]?.text || "Option A", is_correct: true },
        { id: "B", text: "Option B", is_correct: false },
      ]);
    }
  };

  const handleSetCorrect = (id: string) => {
    setChoices((prev) => prev.map((c) => ({ ...c, is_correct: c.id === id })));
  };

  const handleUpdateChoiceText = (id: string, text: string) => {
    setChoices((prev) => prev.map((c) => (c.id === id ? { ...c, text } : c)));
  };

  const handleAddChoice = () => {
    setChoices((prev) => appendNextChoice(prev));
  };

  const handleRemoveChoice = (id: string) => {
    if (choices.length <= 2) {
      setError(t("questionBank.form.errorMinChoices"));
      return;
    }
    setChoices((prev) => removeChoiceItem(prev, id));
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }
    setError(null);

    const validationError = validateQuestionForm(questionText, explanation, choices, t, archetypeId);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    try {
      const q = buildBankQuestion({
        initialId: initialQuestion?.id,
        archetypeId,
        domainId,
        subtopicId,
        questionText,
        format: initialState.format,
        choices,
        explanation,
        funFact,
        visualPrompt,
        difficulty: initialState.difficulty,
        thinkingSeconds: initialState.thinkingSeconds,
        ageBand: initialState.ageBand,
      });
      await onSave(q);
      onClose?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save question");
      setSaving(false);
    }
  };

  return {
    // Form values
    isEditing,
    archetypeId,
    domainId,
    subtopicId,
    questionText,
    format: initialState.format,
    explanation,
    funFact,
    visualPrompt,
    difficulty: initialState.difficulty,
    thinkingSeconds: initialState.thinkingSeconds,
    ageBand: initialState.ageBand,
    choices,
    saving,
    error,
    // Setters
    setArchetypeId,
    setDomainId,
    setSubtopicId,
    setQuestionText,
    setExplanation,
    setFunFact,
    setVisualPrompt,
    setChoices,
    setSaving,
    setError,
    // Choice mutators
    handleAddChoice,
    handleSetCorrect,
    handleUpdateChoiceText,
    handleRemoveChoice,
    // Archetype handler
    handleArchetypeChange,
    // Form action
    handleSubmit,
    // Translator
    t,
  };
}
