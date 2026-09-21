import { useId } from "react";
import { MASCOT_STYLE_CONCEPT_PROMPT_MAX_LENGTH } from "@studio/shared";
import { useTranslation } from "../../../i18n";

export interface MascotStyleConceptPromptProps {
  styleName: string;
  value: string;
  disabled: boolean;
  error?: string;
  onChange: (value: string) => void;
}

export function MascotStyleConceptPrompt({ styleName, value, disabled, error, onChange }: MascotStyleConceptPromptProps) {
  const { t } = useTranslation();
  const inputId = useId();
  const errorId = `${inputId}-error`;

  return (
    <div className="style-anchor-prompt">
      <div className="style-anchor-prompt-header">
        <label className="style-anchor-prompt-label" htmlFor={inputId}>
          {t("mascots.styleConceptPromptLabel")}
        </label>
        <span className="style-anchor-prompt-count" aria-hidden="true">
          {value.length}/{MASCOT_STYLE_CONCEPT_PROMPT_MAX_LENGTH}
        </span>
      </div>
      <textarea
        id={inputId}
        className="style-anchor-prompt-input"
        rows={3}
        maxLength={MASCOT_STYLE_CONCEPT_PROMPT_MAX_LENGTH}
        value={value}
        disabled={disabled}
        required
        aria-required="true"
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        aria-label={t("mascots.styleConceptPromptAria", { name: styleName })}
        placeholder={t("mascots.styleConceptPromptPlaceholder")}
        onChange={(event) => onChange(event.target.value)}
      />
      {error ? (
        <span id={errorId} className="style-anchor-prompt-error" role="alert">
          {error}
        </span>
      ) : null}
    </div>
  );
}
