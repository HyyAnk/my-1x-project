import React from "react";
import { Sparkle, Translate } from "@phosphor-icons/react";
import { useTranslation } from "../../../../i18n";
import { CountrySelectDropdown } from "../CountrySelectDropdown";
import { CreateChannelAudienceChips } from "./CreateChannelAudienceChips";
import type { CreateChannelFormData } from "./types";

export interface CreateChannelFormFieldsProps {
  form: CreateChannelFormData;
  setForm: React.Dispatch<React.SetStateAction<CreateChannelFormData>>;
  onCountrySelect: (code: string) => void;
  onLanguageChange: (val: string) => void;
  onAudienceSelect: (val: string) => void;
  disabled?: boolean;
}

export function CreateChannelFormFields({
  form,
  setForm,
  onCountrySelect,
  onLanguageChange,
  onAudienceSelect,
  disabled = false,
}: CreateChannelFormFieldsProps) {
  const { t } = useTranslation();

  return (
    <div className="channel-form-fields-container">
      {/* 1. Channel Name */}
      <div className="channel-form-section">
        <div className="channel-create-field">
          <div className="field-label-row">
            <div className="field-label-left">
              <label htmlFor="channel-name-input" className="channel-field-label">
                {t("channels.channelNameLabel")}
              </label>
              <span className="required-star" aria-hidden="true">*</span>
            </div>
            <span className="field-counter">{form.name.length}/120</span>
          </div>
          <input
            id="channel-name-input"
            type="text"
            required
            maxLength={120}
            className="channel-create-input name-input"
            value={form.name}
            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
            placeholder={t("channels.channelNamePlaceholder")}
            autoFocus
            disabled={disabled}
          />
        </div>
      </div>

      {/* 2. Target Country & Auto-Synced Language */}
      <div className="channel-form-section">
        <div className="channel-create-row-2">
          <CountrySelectDropdown
            selectedCountry={form.country}
            onSelectCountry={onCountrySelect}
          />

          <div className="channel-create-field">
            <div className="field-label-row">
              <label htmlFor="channel-language-input" className="channel-field-label">
                {t("channels.languageFieldLabel")}
              </label>
              <span className="synced-badge">
                <Sparkle size={11} weight="fill" />
                {t("channels.autoLanguageBadge") || "Tự động"}
              </span>
            </div>
            <div className="input-with-icon">
              <Translate size={16} className="input-prefix-icon" />
              <input
                id="channel-language-input"
                type="text"
                required
                className="channel-create-input synced-input"
                value={form.language}
                onChange={(e) => onLanguageChange(e.target.value)}
                placeholder={t("channels.languageFieldPlaceholder")}
                disabled={disabled}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 3. Target Audience & Niche */}
      <div className="channel-form-section">
        <div className="channel-create-field">
          <label htmlFor="channel-audience-input" className="channel-field-label">
            {t("channels.targetAudienceLabel")}
          </label>
          <input
            id="channel-audience-input"
            type="text"
            maxLength={240}
            className="channel-create-input"
            value={form.target_audience}
            onChange={(e) => setForm((prev) => ({ ...prev, target_audience: e.target.value }))}
            placeholder={t("channels.targetAudiencePlaceholder")}
            disabled={disabled}
          />
          <CreateChannelAudienceChips
            selectedAudience={form.target_audience}
            onSelectAudience={onAudienceSelect}
            disabled={disabled}
          />
        </div>
      </div>

      {/* 4. Channel Description */}
      <div className="channel-form-section">
        <div className="channel-create-field">
          <label htmlFor="channel-description-input" className="channel-field-label">
            {t("channels.descriptionLabel")}
          </label>
          <textarea
            id="channel-description-input"
            rows={3}
            maxLength={1000}
            className="channel-create-textarea"
            value={form.description}
            onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
            placeholder={t("channels.descriptionPlaceholder")}
            disabled={disabled}
          />
        </div>
      </div>
    </div>
  );
}
