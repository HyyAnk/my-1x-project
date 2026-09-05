import { ShieldCheck } from "@phosphor-icons/react";
import { useTranslation } from "../../../../i18n";

export const BATCH_SIZE_OPTIONS = [20, 40, 60, 100, 200, 500];

export interface AiGenerateBatchSettingsProps {
  targetCount: number;
  difficulty: number;
  onChangeTargetCount: (count: number) => void;
  onChangeDifficulty: (difficulty: number) => void;
  disabled?: boolean;
}

export function AiGenerateBatchSettings({
  targetCount,
  difficulty,
  onChangeTargetCount,
  onChangeDifficulty,
  disabled = false,
}: AiGenerateBatchSettingsProps) {
  const { t } = useTranslation();

  return (
    <>
      <div className="qb-form-group">
        <label className="qb-label">{t("questionBank.aiModal.targetCountLabel")}</label>
        <div className="qb-volume-chips">
          {BATCH_SIZE_OPTIONS.map((size) => (
            <button
              key={size}
              type="button"
              className={`qb-volume-chip ${targetCount === size ? "is-selected" : ""}`}
              onClick={() => onChangeTargetCount(size)}
              disabled={disabled}
            >
              {size} Questions ({Math.ceil(size / 20)} {Math.ceil(size / 20) === 1 ? "chunk" : "chunks"})
            </button>
          ))}
        </div>
      </div>

      <div className="qb-form-group">
        <label className="qb-label">{t("questionBank.aiModal.difficultyVal", { difficulty })}</label>
        <input
          type="range"
          min={1}
          max={5}
          className="qb-range"
          value={difficulty}
          onChange={(e) => onChangeDifficulty(Number(e.target.value))}
          disabled={disabled}
        />
      </div>

      <div className="qb-qa-assurance-box">
        <ShieldCheck size={18} weight="fill" />
        <span>
          <strong>{t("questionBank.aiModal.qaAssuranceTitle")}</strong> {t("questionBank.aiModal.qaAssuranceDesc")}
        </span>
      </div>
    </>
  );
}
