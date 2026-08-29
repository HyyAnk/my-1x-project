import type React from "react";
import { CircleNotch, WarningCircle } from "@phosphor-icons/react";
import { CHANNEL_BRAND_NAME_MAX_LENGTH } from "@studio/shared";
import { useTranslation } from "../../../../i18n";

export type ChannelBrandNameControlProps = {
  value: string;
  onChange: (value: string) => void;
  onSave: () => void;
  onRevert: () => void;
  onRetry: () => void;
  saving?: boolean;
  error?: string | null;
  disabled?: boolean;
};

export function ChannelBrandNameControl({
  value,
  onChange,
  onSave,
  onRevert,
  onRetry,
  saving = false,
  error = null,
  disabled = false,
}: ChannelBrandNameControlProps) {
  const { t } = useTranslation();

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      onSave();
    } else if (e.key === "Escape") {
      e.preventDefault();
      onRevert();
    }
  };

  const handleBlur = () => {
    onSave();
  };

  return (
    <div className={`customization-brand-name-control ${error ? "has-error" : ""} ${saving ? "is-saving" : ""}`}>
      <label className="brand-name-label" htmlFor="channel-brand-name-input">
        {t("episodeCustomization.channelNameLabel")}
      </label>
      <div className="brand-name-input-wrapper">
        <input
          id="channel-brand-name-input"
          type="text"
          className="brand-name-input"
          value={value}
          maxLength={CHANNEL_BRAND_NAME_MAX_LENGTH}
          placeholder={t("episodeCustomization.channelNamePlaceholder")}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          disabled={disabled || saving}
          autoComplete="off"
          spellCheck={false}
        />
        {saving ? (
          <span className="brand-name-status is-saving" title={t("episodeCustomization.channelNameSaving")}>
            <CircleNotch className="spin" size={14} />
          </span>
        ) : null}
      </div>
      {error ? (
        <div className="brand-name-error-row">
          <span className="brand-name-error-text">
            <WarningCircle size={13} weight="fill" />
            <span>{error}</span>
          </span>
          <button type="button" className="brand-name-retry-btn" onClick={onRetry} disabled={disabled || saving}>
            {t("common.retry")}
          </button>
        </div>
      ) : null}
    </div>
  );
}
