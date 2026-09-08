import { Compass, Funnel } from "@phosphor-icons/react";
import { useTranslation } from "../../../../i18n";

export interface AiGenerateModeSelectorProps {
  mode: "auto" | "manual";
  onChangeMode: (mode: "auto" | "manual") => void;
  disabled?: boolean;
}

export function AiGenerateModeSelector({ mode, onChangeMode, disabled = false }: AiGenerateModeSelectorProps) {
  const { t } = useTranslation();

  return (
    <div className="qb-mode-tabs" role="tablist">
      <button
        type="button"
        role="tab"
        aria-selected={mode === "auto"}
        className={`qb-mode-tab-btn ${mode === "auto" ? "is-active" : ""}`}
        onClick={() => onChangeMode("auto")}
        disabled={disabled}
      >
        <Compass size={16} weight="bold" />
        <span>{t("questionBank.aiModal.modeAuto")}</span>
        <span className="qb-badge-auto">{t("questionBank.aiModal.modeAutoTag")}</span>
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={mode === "manual"}
        className={`qb-mode-tab-btn ${mode === "manual" ? "is-active" : ""}`}
        onClick={() => onChangeMode("manual")}
        disabled={disabled}
      >
        <Funnel size={16} weight="bold" />
        <span>{t("questionBank.aiModal.modeManual")}</span>
      </button>
    </div>
  );
}
