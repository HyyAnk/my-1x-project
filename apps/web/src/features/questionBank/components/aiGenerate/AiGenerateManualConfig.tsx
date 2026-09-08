import { ShieldCheck } from "@phosphor-icons/react";
import { useTranslation } from "../../../../i18n";
import type { BankGameplayArchetypeId, BankTaxonomy } from "../../types/questionBankUi.types";

export const ARCHETYPE_OPTIONS: Array<{ id: BankGameplayArchetypeId; label: string; icon: string }> = [
  { id: "verdict_true_false", label: "True or False", icon: "⚖️" },
  { id: "speed_blitz", label: "Speed Blitz", icon: "⚡" },
  { id: "deep_trivia", label: "Deep Trivia", icon: "🧠" },
  { id: "versus_faceoff", label: "1v1 Faceoff", icon: "⚔️" },
  { id: "visual_spotting", label: "Visual Spotting", icon: "👁️" },
  { id: "visual_identification", label: "Visual ID", icon: "🔍" },
  { id: "mystery_reveal", label: "Mystery Reveal", icon: "🎭" },
  { id: "clue_deduction", label: "Clue Deduction", icon: "🕵️" },
];

export interface AiGenerateManualConfigProps {
  taxonomy: BankTaxonomy | null;
  domainId: string;
  subtopicId: string;
  archetypeId: BankGameplayArchetypeId | "";
  onDomainChange: (newDomainId: string) => void;
  onSubtopicChange: (newSubId: string) => void;
  onArchetypeChange: (newArchetypeId: BankGameplayArchetypeId | "") => void;
  disabled?: boolean;
}

export function AiGenerateManualConfig({
  taxonomy,
  domainId,
  subtopicId,
  archetypeId,
  onDomainChange,
  onSubtopicChange,
  onArchetypeChange,
  disabled = false,
}: AiGenerateManualConfigProps) {
  const { t } = useTranslation();
  const activeDomain = taxonomy?.domains.find((d) => d.id === domainId);

  return (
    <>
      <p className="qb-modal-intro">{t("questionBank.aiModal.modeManualDesc")}</p>

      <div className="qb-form-grid">
        <div className="qb-form-group">
          <label className="qb-label">{t("questionBank.aiModal.domainLabel")}</label>
          <select className="qb-select" value={domainId} onChange={(e) => onDomainChange(e.target.value)} disabled={disabled}>
            <option value="">{t("questionBank.filters.allDomains")}</option>
            {(taxonomy?.domains || []).map((d) => (
              <option key={d.id} value={d.id}>
                {d.title}
              </option>
            ))}
          </select>
        </div>

        <div className="qb-form-group">
          <label className="qb-label">{t("questionBank.aiModal.subtopicIdLabel")}</label>
          <select
            className="qb-select"
            value={subtopicId}
            onChange={(e) => onSubtopicChange(e.target.value)}
            disabled={disabled || !domainId}
          >
            <option value="">{t("questionBank.aiModal.allSubtopicsOption")}</option>
            {(activeDomain?.subtopics || []).map((s) => (
              <option key={s.id} value={s.id}>
                {s.title} ({s.id})
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="qb-form-group">
        <label className="qb-label">{t("questionBank.aiModal.archetypeLabel")}</label>
        <select
          className="qb-select"
          value={archetypeId}
          onChange={(e) => onArchetypeChange(e.target.value as BankGameplayArchetypeId | "")}
          disabled={disabled}
        >
          <option value="">{t("questionBank.aiModal.allArchetypesOption")}</option>
          {ARCHETYPE_OPTIONS.map((a) => (
            <option key={a.id} value={a.id}>
              {a.icon} {t(`questionBank.archetypes.${a.id}`) || a.label}
            </option>
          ))}
        </select>
      </div>

      <div className="qb-qa-assurance-box" style={{ background: "rgba(59, 130, 246, 0.08)", borderColor: "rgba(59, 130, 246, 0.25)" }}>
        <ShieldCheck size={18} weight="fill" />
        <span>{t("questionBank.aiModal.leastVariantNotice")}</span>
      </div>
    </>
  );
}
