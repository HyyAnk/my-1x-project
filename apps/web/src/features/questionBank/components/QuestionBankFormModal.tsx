import { useState } from "react";
import { Check, Plus, Trash, X } from "@phosphor-icons/react";
import type { BankChoice, BankGameplayArchetypeId, BankQuestion, BankTaxonomy } from "@studio/shared";
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

export function QuestionBankFormModal({ initialQuestion, taxonomy, onSave, onClose }: QuestionBankFormModalProps) {
  const { t } = useTranslation();
  const isEditing = Boolean(initialQuestion?.id);

  const rawArch = initialQuestion?.archetype_id;
  const normalizedArch: BankGameplayArchetypeId =
    rawArch === "verdict_fact_myth" ? "verdict_true_false" : rawArch || "speed_blitz";
  const [archetypeId, setArchetypeId] = useState<BankGameplayArchetypeId>(normalizedArch);
  const [domainId, setDomainId] = useState(initialQuestion?.domain_id || "logic_puzzles");
  const [subtopicId, setSubtopicId] = useState(initialQuestion?.subtopic_id || "tricky_riddles");
  const [questionText, setQuestionText] = useState(initialQuestion?.question || "");
  const [format, setFormat] = useState(initialQuestion?.format || "multiple_choice");
  const [explanation, setExplanation] = useState(initialQuestion?.explanation || "");
  const [funFact, setFunFact] = useState(initialQuestion?.fun_fact || "");
  const [visualPrompt, setVisualPrompt] = useState(initialQuestion?.visual_spec?.prompt || "");
  const [difficulty, setDifficulty] = useState(initialQuestion?.difficulty ?? 2);
  const [thinkingSeconds, setThinkingSeconds] = useState(initialQuestion?.thinking_seconds ?? 4);
  const [ageBand, setAgeBand] = useState(initialQuestion?.age_band || "family");

  const [choices, setChoices] = useState<BankChoice[]>(
    initialQuestion?.choices || [
      { id: "A", text: "Option A", is_correct: true },
      { id: "B", text: "Option B", is_correct: false },
    ],
  );

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
    const nextLetters = ["A", "B", "C", "D", "E"];
    const usedIds = new Set(choices.map((c) => c.id));
    const nextId = nextLetters.find((l) => !usedIds.has(l)) || `OPT-${choices.length + 1}`;
    setChoices([...choices, { id: nextId, text: `Option ${nextId}`, is_correct: false }]);
  };

  const handleRemoveChoice = (id: string) => {
    if (choices.length <= 2) {
      setError(t("questionBank.form.errorMinChoices"));
      return;
    }
    const filtered = choices.filter((c) => c.id !== id);
    if (!filtered.some((c) => c.is_correct) && filtered.length > 0) {
      filtered[0].is_correct = true;
    }
    setChoices(filtered);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!questionText.trim()) {
      setError(t("questionBank.form.errorEnterQuestion"));
      return;
    }
    if (!explanation.trim()) {
      setError(t("questionBank.form.errorEnterExplanation"));
      return;
    }
    const correct = choices.find((c) => c.is_correct);
    if (!correct) {
      setError(t("questionBank.form.errorSelectCorrect"));
      return;
    }

    setSaving(true);
    try {
      const q: BankQuestion = {
        id: initialQuestion?.id || `Q-${Date.now()}`,
        archetype_id: archetypeId,
        domain_id: domainId,
        subtopic_id: subtopicId,
        question: questionText.trim(),
        format: format as any,
        choices,
        correct_choice_id: correct.id,
        explanation: explanation.trim(),
        fun_fact: funFact.trim(),
        visual_spec: {
          intent: visualPrompt.trim() ? "question_illustration" : "none",
          prompt: visualPrompt.trim() || undefined,
          aspect_ratio: "16:9",
        },
        difficulty,
        thinking_seconds: thinkingSeconds,
        age_band: ageBand as any,
        tags: [domainId, subtopicId],
        status: "approved",
      };

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
                    {a.icon} {t(`questionBank.archetypes.${a.id}` as any) || a.defaultLabel}
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

          {/* Choices Editor */}
          <div className="qb-form-group">
            <div className="qb-choices-header">
              <label className="qb-label">{t("questionBank.form.choicesLabel")}</label>
              {choices.length < 5 && (
                <button type="button" className="qb-btn-text" onClick={handleAddChoice}>
                  <Plus size={14} />
                  <span>{t("questionBank.form.addChoiceBtn")}</span>
                </button>
              )}
            </div>

            <div className="qb-choices-list">
              {choices.map((c) => (
                <div key={c.id} className={`qb-choice-edit-row ${c.is_correct ? "is-correct-choice" : ""}`}>
                  <button
                    type="button"
                    className={`qb-choice-btn-mark ${c.is_correct ? "is-active" : ""}`}
                    onClick={() => handleSetCorrect(c.id)}
                    title={t("questionBank.form.setCorrectTooltip")}
                  >
                    {c.id} {c.is_correct && <Check size={12} weight="bold" />}
                  </button>
                  <input
                    type="text"
                    className="qb-input"
                    value={c.text}
                    onChange={(e) => handleUpdateChoiceText(c.id, e.target.value)}
                    placeholder={`${t("questionBank.form.choicePlaceholder")} ${c.id}`}
                    required
                  />
                  {choices.length > 2 && (
                    <button type="button" className="qb-icon-btn qb-icon-btn-danger" onClick={() => handleRemoveChoice(c.id)} title="X">
                      <Trash size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

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
