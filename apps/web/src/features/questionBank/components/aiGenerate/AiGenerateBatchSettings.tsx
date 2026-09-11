import { useEffect, useState } from "react";
import { ShieldCheck } from "@phosphor-icons/react";
import { useTranslation } from "../../../../i18n";

export const BATCH_SIZE_OPTIONS = [20, 40, 60, 100, 200, 500, 1000, 5000];

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
  const [inputValue, setInputValue] = useState<string>(String(targetCount));

  useEffect(() => {
    setInputValue(String(targetCount));
  }, [targetCount]);

  const handlePresetClick = (size: number) => {
    setInputValue(String(size));
    onChangeTargetCount(size);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setInputValue(raw);
    const parsed = parseInt(raw, 10);
    if (!Number.isNaN(parsed) && parsed > 0) {
      const clamped = Math.min(50000, parsed);
      onChangeTargetCount(clamped);
    }
  };

  const handleInputBlur = () => {
    const parsed = parseInt(inputValue, 10);
    if (Number.isNaN(parsed) || parsed < 1) {
      const fallback = Math.max(1, targetCount || 20);
      setInputValue(String(fallback));
      onChangeTargetCount(fallback);
    } else {
      const clamped = Math.min(50000, Math.max(1, parsed));
      setInputValue(String(clamped));
      onChangeTargetCount(clamped);
    }
  };

  const totalChunks = Math.ceil(Math.max(1, targetCount) / 20);

  return (
    <>
      <div className="qb-form-group">
        <label className="qb-label" htmlFor="qb-batch-custom-count-input">
          {t("questionBank.aiModal.targetCountLabel")}
        </label>
        <div className="qb-volume-chips">
          {BATCH_SIZE_OPTIONS.map((size) => (
            <button
              key={size}
              type="button"
              className={`qb-volume-chip ${targetCount === size ? "is-selected" : ""}`}
              onClick={() => handlePresetClick(size)}
              disabled={disabled}
            >
              {size} Questions ({Math.ceil(size / 20)} {Math.ceil(size / 20) === 1 ? "chunk" : "chunks"})
            </button>
          ))}
        </div>

        <div className="qb-custom-count-row">
          <label className="qb-custom-count-label" htmlFor="qb-batch-custom-count-input">
            {t("questionBank.aiModal.customCountLabel")}
          </label>
          <div className="qb-custom-count-control">
            <input
              id="qb-batch-custom-count-input"
              type="number"
              min={1}
              max={50000}
              step={1}
              className="qb-input qb-custom-count-input"
              value={inputValue}
              onChange={handleInputChange}
              onBlur={handleInputBlur}
              placeholder={t("questionBank.aiModal.customCountPlaceholder")}
              disabled={disabled}
            />
            <span className="qb-custom-count-hint">
              {t("questionBank.aiModal.customCountChunks", {
                chunks: totalChunks,
                chunkWord: totalChunks === 1 ? "chunk" : "chunks",
              })}
            </span>
          </div>
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
