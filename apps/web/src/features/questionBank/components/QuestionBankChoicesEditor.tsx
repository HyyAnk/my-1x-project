import { Check, Plus, Trash } from "@phosphor-icons/react";
import type { BankChoice } from "@studio/shared";
import type { QuestionBankTranslator } from "../utils/questionBankFormValidation";

export interface QuestionBankChoicesEditorProps {
  choices: BankChoice[];
  onSetCorrect: (id: string) => void;
  onUpdateChoiceText: (id: string, text: string) => void;
  onRemoveChoice: (id: string) => void;
  onAddChoice: () => void;
  t: QuestionBankTranslator;
  archetypeId?: string;
}

/** Editable list of the multiple-choice options or single reveal answer for mystery archetype. */
export function QuestionBankChoicesEditor({
  choices,
  onSetCorrect,
  onUpdateChoiceText,
  onRemoveChoice,
  onAddChoice,
  t,
  archetypeId,
}: QuestionBankChoicesEditorProps) {
  const isMystery = archetypeId === "mystery_reveal" || archetypeId === "mystery";

  if (isMystery) {
    const singleChoice = choices[0] || { id: "A", text: "", is_correct: true };
    return (
      <div className="qb-choices-editor">
        <label className="qb-label" style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase" }}>
          {t("questionBank.form.revealAnswerLabel") || "Reveal Answer"}
        </label>
        <div className="qb-choice-edit-row is-correct" style={{ marginTop: "4px" }}>
          <button type="button" className="qb-choice-correct-btn is-correct" title={t("questionBank.form.correctAnswer")}>
            <Check size={14} weight="bold" />
          </button>
          <input
            type="text"
            className="qb-input qb-choice-input"
            value={singleChoice.text}
            onChange={(e) => onUpdateChoiceText(singleChoice.id, e.target.value)}
            placeholder={t("questionBank.form.revealAnswerPlaceholder") || "Enter reveal answer (e.g. Pikachu)..."}
          />
        </div>
      </div>
    );
  }

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
