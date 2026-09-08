import { useState } from "react";
import { Check, Plus, Trash, X } from "@phosphor-icons/react";
import type { BankChoice, BankGameplayArchetypeId, BankQuestion, BankTaxonomy, QuizAgeBand, QuizQuestionFormat } from "@studio/shared";
import { useTranslation } from "../../../i18n";

export interface QuestionBankFormModalProps {
  initialQuestion?: BankQuestion | null;
  taxonomy: BankTaxonomy | null;
  onSave: (q: BankQuestion) => Promise<void>;
  onClose: () => void;
}

const ARCHETYPE_OPTIONS: Array<{ id: string; defaultLabel: string; icon: string }> = [
  { id: "verdict_true_false", defaultLabel: "True or False", icon: "⚖️" },
  { id: "speed_blitz", defaultLabel: "Speed Blitz", icon: "⚡" },
  { id: "deep_trivia", defaultLabel: "Deep Trivia", icon: "🧠" },
  { id: "versus_faceoff", defaultLabel: "1v1 Faceoff", icon: "⚔️" },
  { id: "visual_spotting", defaultLabel: "Visual Spotting", icon: "👁️" },
  { id: "visual_identification", defaultLabel: "Visual ID", icon: "🔍" },
  { id: "mystery_reveal", defaultLabel: "Mystery Reveal", icon: "🎭" },
  { id: "clue_deduction", defaultLabel: "Clue Deduction", icon: "🕵️" },
];

type ChoicesEditorProps = {
  choices: BankChoice[];
  onSetCorrect: (id: string) => void;
  onUpdateChoiceText: (id: string, text: string) => void;
  onRemoveChoice: (id: string) => void;
  onAddChoice: () => void;
  t: (path: string) => string;
};

function QuestionBankChoicesEditor({ choices, onSetCorrect, onUpdateChoiceText, onRemoveChoice, onAddChoice, t }: ChoicesEditorProps) {
  return (
    <div className="qb-choices-editor">
      {choices.map((c) => (
        <div key={c.id} className={`qb-choice-edit-row ${c.is_correct ? "is-correct" : ""}`}>
          <button
            type="button"
            className={`qb-choice-correct-btn ${c.is_correct ? "is-correct" : ""}`}
            onClick={() => onSetCorrect(c.id)}
            title={c.is_correct ? t("questionBank.form.correctAnswer") : t("questionBank.form.markAsCorrect")}
          >
            {c.is_correct ? <Check size={14} weight="bold" /> : c.id}
          </button>
          <input
            type="text"
            className="qb-input qb-choice-input"
            value={c.text}
            onChange={(e) => onUpdateChoiceText(c.id, e.target.value)}
            placeholder={`Option ${c.id}`}
          />
          {choices.length > 2 && (
            <button
              type="button"
              className="qb-choice-delete-btn"
              onClick={() => onRemoveChoice(c.id)}
              title={t("questionBank.form.removeOption")}
            >
              <Trash size={14} />
            </button>
          )}
        </div>
      ))}
      {choices.length < 5 && (
        <button type="button" className="qb-btn qb-btn-secondary qb-btn-sm" onClick={onAddChoice}>
          <Plus size={14} />
          <span>{t("questionBank.form.addChoice")}</span>
        </button>
      )}
    </div>
  );
}

function validateQuestionForm(
  questionText: string,
  explanation: string,
  choices: BankChoice[],
  t: (path: string) => string,
): string | null {
  if (!questionText.trim()) return t("questionBank.form.errorEnterQuestion");
  if (!explanation.trim()) return t("questionBank.form.errorEnterExplanation");
  if (!choices.some((c) => c.is_correct)) return t("questionBank.form.errorSelectCorrect");
  return null;
}

function buildBankQuestion(params: {
  initialId?: string;
  archetypeId: BankGameplayArchetypeId;
  domainId: string;
  subtopicId: string;
  questionText: string;
  format: QuizQuestionFormat;
  choices: BankChoice[];
  explanation: string;
  funFact: string;
  visualPrompt: string;
  difficulty: number;
  thinkingSeconds: number;
  ageBand: QuizAgeBand;
}): BankQuestion {
  const correct = params.choices.find((c) => c.is_correct);
  return {
    id: params.initialId || `Q-${Date.now()}`,
    archetype_id: params.archetypeId,
    domain_id: params.domainId,
    subtopic_id: params.subtopicId,
    question: params.questionText.trim(),
    format: params.format,
    choices: params.choices,
    correct_choice_id: correct ? correct.id : "",
    explanation: params.explanation.trim(),
    fun_fact: params.funFact.trim(),
    visual_spec: {
      intent: params.visualPrompt.trim() ? "question_illustration" : "none",
      prompt: params.visualPrompt.trim() || undefined,
      aspect_ratio: "16:9",
    },
    difficulty: params.difficulty,
    thinking_seconds: params.thinkingSeconds,
    age_band: params.ageBand,
    tags: [params.domainId, params.subtopicId],
    status: "approved",
  };
}

function resolveInitialFormState(initialQuestion?: BankQuestion | null) {
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

function appendNextChoice(currentChoices: BankChoice[]): BankChoice[] {
  const nextLetters = ["A", "B", "C", "D", "E"];
  const usedIds = new Set(currentChoices.map((c) => c.id));
  const nextId = nextLetters.find((l) => !usedIds.has(l)) || `OPT-${currentChoices.length + 1}`;
  return [...currentChoices, { id: nextId, text: `Option ${nextId}`, is_correct: false }];
}

function removeChoiceItem(currentChoices: BankChoice[], id: string): BankChoice[] {
  const filtered = currentChoices.filter((c) => c.id !== id);
  if (!filtered.some((c) => c.is_correct) && filtered.length > 0) {
    filtered[0].is_correct = true;
  }
  return filtered;
}

export function QuestionBankFormModal({ initialQuestion, taxonomy, onSave, onClose }: QuestionBankFormModalProps) {
  const { t } = useTranslation();
  const isEditing = Boolean(initialQuestion?.id);
  const [initialState] = useState(() => resolveInitialFormState(initialQuestion));

  const [archetypeId, setArchetypeId] = useState<BankGameplayArchetypeId>(initialState.archetypeId);
  const [domainId, setDomainId] = useState(initialState.domainId);
  const [subtopicId, setSubtopicId] = useState(initialState.subtopicId);
  const [questionText, setQuestionText] = useState(initialState.questionText);
  const format = initialState.format;
  const [explanation, setExplanation] = useState(initialState.explanation);
  const [funFact, setFunFact] = useState(initialState.funFact);
  const [visualPrompt, setVisualPrompt] = useState(initialState.visualPrompt);
  const difficulty = initialState.difficulty;
  const thinkingSeconds = initialState.thinkingSeconds;
  const ageBand = initialState.ageBand;
  const [choices, setChoices] = useState<BankChoice[]>(initialState.choices);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSetCorrect = (id: string) => {
    setChoices((prev) =>
      prev.map((c) => ({
        ...c,
        is_correct: c.id === id,
      })),
    );
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
        format,
        choices,
        explanation,
        funFact,
        visualPrompt,
        difficulty,
        thinkingSeconds,
        ageBand,
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

          <div className="qb-form-grid">
            <div className="qb-form-group">
              <label className="qb-label">{t("questionBank.form.archetypeLabel")}</label>
              <select className="qb-select" value={archetypeId} onChange={(e) => setArchetypeId(e.target.value as BankGameplayArchetypeId)}>
                {ARCHETYPE_OPTIONS.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.icon} {t(`questionBank.archetypes.${a.id}`) || a.defaultLabel}
                  </option>
                ))}
              </select>
            </div>

            <div className="qb-form-group">
              <label className="qb-label">{t("questionBank.form.domainLabel")}</label>
              <select className="qb-select" value={domainId} onChange={(e) => setDomainId(e.target.value)}>
                {(taxonomy?.domains || []).map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="qb-form-group">
            <label className="qb-label">{t("questionBank.form.subtopicLabel")}</label>
            <input
              type="text"
              className="qb-input"
              value={subtopicId}
              onChange={(e) => setSubtopicId(e.target.value)}
              placeholder="e.g. ocean_giants, tricky_riddles..."
              required
            />
          </div>

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
