import type { BankGameplayArchetypeId, BankTaxonomy } from "@studio/shared";
import type { QuestionBankTranslator } from "../utils/questionBankFormValidation";

export interface QuestionBankMetaFieldsProps {
  taxonomy: BankTaxonomy | null;
  archetypeId: BankGameplayArchetypeId;
  onArchetypeChange: (id: BankGameplayArchetypeId) => void;
  domainId: string;
  onDomainChange: (id: string) => void;
  subtopicId: string;
  onSubtopicChange: (id: string) => void;
  t: QuestionBankTranslator;
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

/** Classification block of the question form: archetype, domain, and subtopic. */
export function QuestionBankMetaFields({
  taxonomy,
  archetypeId,
  onArchetypeChange,
  domainId,
  onDomainChange,
  subtopicId,
  onSubtopicChange,
  t,
}: QuestionBankMetaFieldsProps) {
  return (
    <>
      <div className="qb-form-grid">
        <div className="qb-form-group">
          <label className="qb-label">{t("questionBank.form.archetypeLabel")}</label>
          <select className="qb-select" value={archetypeId} onChange={(e) => onArchetypeChange(e.target.value as BankGameplayArchetypeId)}>
            {ARCHETYPE_OPTIONS.map((a) => (
              <option key={a.id} value={a.id}>
                {a.icon} {t(`questionBank.archetypes.${a.id}`) || a.defaultLabel}
              </option>
            ))}
          </select>
        </div>

        <div className="qb-form-group">
          <label className="qb-label">{t("questionBank.form.domainLabel")}</label>
          <select className="qb-select" value={domainId} onChange={(e) => onDomainChange(e.target.value)}>
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
          onChange={(e) => onSubtopicChange(e.target.value)}
          placeholder="e.g. ocean_giants, tricky_riddles..."
          required
        />
      </div>
    </>
  );
}
