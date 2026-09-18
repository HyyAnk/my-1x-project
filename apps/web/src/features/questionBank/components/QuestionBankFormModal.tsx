import { X } from "@phosphor-icons/react";
import type { BankQuestion, BankTaxonomy } from "@studio/shared";
import { QuestionBankChoicesEditor } from "./QuestionBankChoicesEditor";
import { QuestionBankMetaFields } from "./QuestionBankMetaFields";
import { useQuestionBankForm } from "../hooks/useQuestionBankForm";

export interface QuestionBankFormModalProps {
  initialQuestion?: BankQuestion | null;
  taxonomy: BankTaxonomy | null;
  onSave: (q: BankQuestion) => Promise<void>;
  onClose: () => void;
}

export function QuestionBankFormModal(props: QuestionBankFormModalProps) {
  const { initialQuestion, taxonomy, onClose } = props;
  const form = useQuestionBankForm(props);
  const { t } = form;

  return (
    <div className="qb-modal-backdrop" onClick={onClose}>
      <div className="qb-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="qb-modal-header">
          <h2 className="qb-modal-title">
            {form.isEditing ? t("questionBank.form.editTitle", { id: initialQuestion?.id || "" }) : t("questionBank.form.createTitle")}
          </h2>
          <button type="button" className="qb-modal-close" onClick={onClose} title={t("questionBank.form.cancelBtn")}>
            <X size={18} />
          </button>
        </div>

        <form className="qb-modal-body" onSubmit={form.handleSubmit}>
          {form.error && <div className="qb-modal-error">{form.error}</div>}

          <QuestionBankMetaFields
            taxonomy={taxonomy}
            archetypeId={form.archetypeId}
            onArchetypeChange={form.handleArchetypeChange}
            domainId={form.domainId}
            onDomainChange={form.setDomainId}
            subtopicId={form.subtopicId}
            onSubtopicChange={form.setSubtopicId}
            t={t}
          />

          <div className="qb-form-group">
            <label className="qb-label">{t("questionBank.form.questionTextLabel")}</label>
            <textarea
              className="qb-textarea"
              rows={3}
              value={form.questionText}
              onChange={(e) => form.setQuestionText(e.target.value)}
              placeholder={t("questionBank.form.questionTextPlaceholder")}
              required
            />
          </div>

          <QuestionBankChoicesEditor
            choices={form.choices}
            onAddChoice={form.handleAddChoice}
            onSetCorrect={form.handleSetCorrect}
            onUpdateChoiceText={form.handleUpdateChoiceText}
            onRemoveChoice={form.handleRemoveChoice}
            t={t}
            archetypeId={form.archetypeId}
          />

          <div className="qb-form-group">
            <label className="qb-label">{t("questionBank.form.explanationLabel")}</label>
            <textarea
              className="qb-textarea"
              rows={2}
              value={form.explanation}
              onChange={(e) => form.setExplanation(e.target.value)}
              placeholder={t("questionBank.form.explanationPlaceholder")}
              required
            />
          </div>

          <div className="qb-form-group">
            <label className="qb-label">{t("questionBank.form.funFactLabel")}</label>
            <input
              type="text"
              className="qb-input"
              value={form.funFact}
              onChange={(e) => form.setFunFact(e.target.value)}
              placeholder={t("questionBank.form.funFactPlaceholder")}
            />
          </div>

          <div className="qb-form-group">
            <label className="qb-label">{t("questionBank.form.visualPromptLabel")}</label>
            <input
              type="text"
              className="qb-input"
              value={form.visualPrompt}
              onChange={(e) => form.setVisualPrompt(e.target.value)}
              placeholder={t("questionBank.form.visualPromptPlaceholder")}
            />
          </div>

          <div className="qb-modal-footer">
            <button type="button" className="qb-btn qb-btn-ghost" onClick={onClose} disabled={form.saving}>
              {t("questionBank.form.cancelBtn")}
            </button>
            <button type="submit" className="qb-btn qb-btn-primary" disabled={form.saving}>
              {form.saving ? t("questionBank.form.savingBtn") : t("questionBank.form.saveBtn")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
