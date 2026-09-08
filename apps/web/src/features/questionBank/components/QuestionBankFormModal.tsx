import { useState } from "react";
import { X } from "@phosphor-icons/react";
import type { BankChoice, BankGameplayArchetypeId, BankQuestion, BankTaxonomy, QuizAgeBand, QuizQuestionFormat } from "@studio/shared";
import { useTranslation } from "../../../i18n";
import { QuestionBankChoicesEditor } from "./QuestionBankChoicesEditor";
import { QuestionBankMetaFields } from "./QuestionBankMetaFields";
import { appendNextChoice, buildBankQuestion, removeChoiceItem } from "../utils/questionBankFormBuilder";
import { validateQuestionForm } from "../utils/questionBankFormValidation";

export interface QuestionBankFormModalProps {
  initialQuestion?: BankQuestion | null;
  taxonomy: BankTaxonomy | null;
  onSave: (q: BankQuestion) => Promise<void>;
  onClose: () => void;
}

interface QuestionBankFormState {
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

function resolveInitialFormState(initialQuestion?: BankQuestion | null): QuestionBankFormState {
  const rawArch = initialQuestion?.archetype_id;
  const normalizedArch: BankGameplayArchetypeId = rawArch === "verdict_fact_myth" ? "verdict_true_false" : rawArch || "speed_blitz";
  const format: QuizQuestionFormat = (initialQuestion?.format as QuizQuestionFormat) || "multiple_choice";
  const ageBand: QuizAgeBand = (initialQuestion?.age_band as QuizAgeBand) || "family";
  return {
    isEditing: Boolean(initialQuestion?.id),
    archetypeId: normalizedArch,
    domainId: initialQuestion?.domain_id || "logic_puzzles",
    subtopicId: initialQuestion?.subtopic_id || "tricky_riddles",
    questionText: initialQuestion?.question || "",
    format,
    explanation: initialQuestion?.explanation || "",
    funFact: initialQuestion?.fun_fact || "",
    visualPrompt: initialQuestion?.visual_spec?.prompt || "",
    difficulty: initialQuestion?.difficulty ?? 2,
    thinkingSeconds: initialQuestion?.thinking_seconds ?? 4,
    ageBand,
    choices: initialQuestion?.choices || [
      { id: "A", text: "Option A", is_correct: true },
      { id: "B", text: "Option B", is_correct: false },
    ],
  };
}

export function QuestionBankFormModal({ initialQuestion, taxonomy, onSave, onClose }: QuestionBankFormModalProps) {
  const { t } = useTranslation();
  const [initialState] = useState(() => resolveInitialFormState(initialQuestion));
  const isEditing = initialState.isEditing;

  const [archetypeId, setArchetypeId] = useState(initialState.archetypeId);
  const [domainId, setDomainId] = useState(initialState.domainId);
  const [subtopicId, setSubtopicId] = useState(initialState.subtopicId);
  const [questionText, setQuestionText] = useState(initialState.questionText);
  const [explanation, setExplanation] = useState(initialState.explanation);
  const [funFact, setFunFact] = useState(initialState.funFact);
  const [visualPrompt, setVisualPrompt] = useState(initialState.visualPrompt);
  const [choices, setChoices] = useState<BankChoice[]>(initialState.choices);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const validationError = validateQuestionForm(questionText, explanation, choices, t);
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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save question");
      setSaving(false);
    }
  };

  return (
    <div className="qb-modal-backdrop" onClick={onClose}>
      <div className="qb-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="qb-modal-header">
          <h2 className="qb-modal-title">
            {isEditing ? t("questionBank.form.editTitle", { id: initialQuestion?.id || "" }) : t("questionBank.form.createTitle")}
          </h2>
          <button type="button" className="qb-modal-close" onClick={onClose} title={t("questionBank.form.cancelBtn")}>
            <X size={18} />
          </button>
        </div>

        <form className="qb-modal-body" onSubmit={handleSubmit}>
          {error && <div className="qb-modal-error">{error}</div>}

          <QuestionBankMetaFields
            taxonomy={taxonomy}
            archetypeId={archetypeId}
            onArchetypeChange={setArchetypeId}
            domainId={domainId}
            onDomainChange={setDomainId}
            subtopicId={subtopicId}
            onSubtopicChange={setSubtopicId}
            t={t}
          />

          <div className="qb-form-group">
            <label className="qb-label">{t("questionBank.form.questionTextLabel")}</label>
            <textarea
              className="qb-textarea"
              rows={3}
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              placeholder={t("questionBank.form.questionTextPlaceholder")}
              required
            />
          </div>

          <QuestionBankChoicesEditor
            choices={choices}
            onAddChoice={handleAddChoice}
            onSetCorrect={handleSetCorrect}
            onUpdateChoiceText={handleUpdateChoiceText}
            onRemoveChoice={handleRemoveChoice}
            t={t}
          />

          <div className="qb-form-group">
            <label className="qb-label">{t("questionBank.form.explanationLabel")}</label>
            <textarea
              className="qb-textarea"
              rows={2}
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              placeholder={t("questionBank.form.explanationPlaceholder")}
              required
            />
          </div>

          <div className="qb-form-group">
            <label className="qb-label">{t("questionBank.form.funFactLabel")}</label>
            <input
              type="text"
              className="qb-input"
              value={funFact}
              onChange={(e) => setFunFact(e.target.value)}
              placeholder={t("questionBank.form.funFactPlaceholder")}
            />
          </div>

          <div className="qb-form-group">
            <label className="qb-label">{t("questionBank.form.visualPromptLabel")}</label>
            <input
              type="text"
              className="qb-input"
              value={visualPrompt}
              onChange={(e) => setVisualPrompt(e.target.value)}
              placeholder={t("questionBank.form.visualPromptPlaceholder")}
            />
          </div>

          <div className="qb-modal-footer">
            <button type="button" className="qb-btn qb-btn-ghost" onClick={onClose} disabled={saving}>
              {t("questionBank.form.cancelBtn")}
            </button>
            <button type="submit" className="qb-btn qb-btn-primary" disabled={saving}>
              {saving ? t("questionBank.form.savingBtn") : t("questionBank.form.saveBtn")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
