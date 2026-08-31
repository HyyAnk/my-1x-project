import { useState } from "react";
import { CircleNotch, Plus, Translate, X } from "@phosphor-icons/react";
import { TARGET_COUNTRY_OPTIONS, type Task } from "@studio/shared";
import { api } from "../../../api";
import type { ChannelGroupId } from "../../../components/ChannelList";
import { useTranslation } from "../../../i18n";
import { CountrySelectDropdown } from "./CountrySelectDropdown";

type CreateChannelForm = {
  name: string;
  description: string;
  target_audience: string;
  language: string;
  country: string;
  market: string;
  group_id: ChannelGroupId;
  dna_mode: "example" | "ai" | "upload";
  dna_content: string;
};

export function CreateChannelModal({
  initialGroupId = "quiz",
  onClose,
  onCreated,
  onError,
}: {
  initialGroupId?: ChannelGroupId;
  onClose: () => void;
  onCreated: (channelId: string, message: string, task: Task | null) => Promise<void>;
  onError: (error: unknown) => void;
}) {
  const { t } = useTranslation();
  const defaultCountry = TARGET_COUNTRY_OPTIONS[0] || {
    code: "AU",
    defaultLanguage: "English",
  };

  const [form, setForm] = useState<CreateChannelForm>({
    name: "",
    description: "",
    target_audience: "Children and families",
    language: defaultCountry.defaultLanguage,
    country: defaultCountry.code,
    market: defaultCountry.code,
    group_id: initialGroupId,
    dna_mode: "ai",
    dna_content: "",
  });

  const [busy, setBusy] = useState(false);

  const handleCountrySelect = (code: string, defaultLanguage: string) => {
    setForm((current) => ({
      ...current,
      country: code,
      market: code,
      language: defaultLanguage,
    }));
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      const result = await api.createChannel({
        ...form,
        dna_mode: "ai",
      });
      const message = t("channels.channelCreatedNotice") || "Channel created and DNA generation queued";
      await onCreated(result.channel.channel_id, message, result.task);
    } catch (error) {
      onError(error);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-backdrop" role="presentation">
      <form className="modal channel-create-modal" onSubmit={(event) => void submit(event)}>
        {/* Header */}
        <div className="channel-create-header">
          <div className="channel-create-header-info">
            <h2>{t("channels.createChannelTitle")}</h2>
          </div>
          <button type="button" className="channel-create-close-btn" onClick={onClose} aria-label={t("common.close")}>
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <div className="channel-create-body">
          {/* Channel Name */}
          <div className="channel-create-field">
            <label htmlFor="channel-name-input">{t("channels.channelNameLabel")}</label>
            <input
              id="channel-name-input"
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder={t("channels.channelNamePlaceholder")}
              autoFocus
            />
          </div>

          {/* Group & Track Type */}
          <div className="channel-create-field">
            <label>{t("channels.channelTypeLabel")}</label>
            <div className="channel-type-toggle-grid">
              <button
                type="button"
                className={`channel-type-option ${form.group_id === "quiz" ? "active" : ""}`}
                onClick={() => setForm({ ...form, group_id: "quiz" })}
              >
                <span className="type-title">{t("channels.channelTypeQuizTitle")}</span>
                <span className="type-badge">{t("channels.channelTypeQuizBadge")}</span>
              </button>
              <button
                type="button"
                className={`channel-type-option ${form.group_id === "history" ? "active" : ""}`}
                onClick={() => setForm({ ...form, group_id: "history" })}
              >
                <span className="type-title">{t("channels.channelTypeHistoryTitle")}</span>
                <span className="type-badge">{t("channels.channelTypeHistoryBadge")}</span>
              </button>
            </div>
          </div>

          {/* Country Selection & Language Grid */}
          <div className="channel-create-row-2">
            <CountrySelectDropdown selectedCountry={form.country} onSelectCountry={handleCountrySelect} />

            {/* Target Language */}
            <div className="channel-create-field">
              <label htmlFor="channel-language-input">{t("channels.languageFieldLabel")}</label>
              <div className="input-with-icon">
                <Translate size={16} className="input-prefix-icon" />
                <input
                  id="channel-language-input"
                  type="text"
                  required
                  value={form.language}
                  onChange={(e) => setForm({ ...form, language: e.target.value })}
                  placeholder={t("channels.languageFieldPlaceholder")}
                />
              </div>
            </div>
          </div>

          {/* Target Audience */}
          <div className="channel-create-field">
            <label htmlFor="channel-audience-input">{t("channels.targetAudienceLabel")}</label>
            <input
              id="channel-audience-input"
              type="text"
              value={form.target_audience}
              onChange={(e) => setForm({ ...form, target_audience: e.target.value })}
              placeholder={t("channels.targetAudiencePlaceholder")}
            />
          </div>

          {/* Description */}
          <div className="channel-create-field">
            <label htmlFor="channel-description-input">{t("channels.descriptionLabel")}</label>
            <textarea
              id="channel-description-input"
              rows={2}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder={t("channels.descriptionPlaceholder")}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="channel-create-footer">
          <button type="button" className="quiet-button" onClick={onClose} disabled={busy}>
            {t("common.cancel")}
          </button>
          <button type="submit" className="primary-button" disabled={busy || !form.name.trim()}>
            {busy ? (
              <>
                <CircleNotch size={16} className="spinner-icon" />
                <span>{t("channels.creatingButton")}</span>
              </>
            ) : (
              <>
                <Plus size={16} weight="bold" />
                <span>{t("channels.createAndGenerateDnaButton")}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
