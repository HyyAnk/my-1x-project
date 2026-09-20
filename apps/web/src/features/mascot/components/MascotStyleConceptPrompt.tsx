import { useId } from "react";
import { useTranslation } from "../../../i18n";

const STYLE_CONCEPT_PROMPT_MAX_LENGTH = 1000;

export interface MascotStyleConceptPromptProps {
  styleName: string;
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
}

export function MascotStyleConceptPrompt({ styleName, value, disabled, onChange }: MascotStyleConceptPromptProps) {
  const { t } = useTranslation();
  const inputId = useId();

  return (
    <div className="style-anchor-prompt">
      <div className="style-anchor-prompt-header">
        <label className="style-anchor-prompt-label" htmlFor={inputId}>
          {t("mascots.styleConceptPromptLabel")}
        </label>
        <span className="style-anchor-prompt-count" aria-hidden="true">
          {value.length}/{STYLE_CONCEPT_PROMPT_MAX_LENGTH}
        </span>
      </div>
      <textarea
        id={inputId}
        className="style-anchor-prompt-input"
        rows={3}
        maxLength={STYLE_CONCEPT_PROMPT_MAX_LENGTH}
        value={value}
        disabled={disabled}
        aria-label={t("mascots.styleConceptPromptAria", { name: styleName })}
        placeholder={t("mascots.styleConceptPromptPlaceholder")}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}
