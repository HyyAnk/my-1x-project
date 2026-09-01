import { useRef, useState } from "react";
import { CircleNotch, FloppyDisk, Translate, X } from "@phosphor-icons/react";
import type { Channel } from "@studio/shared";
import { api } from "../../../api";
import { AccessibleModal } from "../../../components/AccessibleModal";
import { useTranslation } from "../../../i18n";
import type { Notice } from "../../../components/types";
import { CountrySelectDropdown } from "./CountrySelectDropdown";

const EDIT_CHANNEL_TITLE_ID = "edit-channel-title";

type EditChannelModalProps = {
  channel: Channel;
  onClose: () => void;
  onSaved: () => Promise<void>;
  onNotice: (notice: NonNullable<Notice>) => void;
};

export function EditChannelModal({ channel, onClose, onSaved, onNotice }: EditChannelModalProps) {
  const { t } = useTranslation();

  const [form, setForm] = useState({
    display_name: channel.display_name,
    description: channel.description,
    target_audience: channel.target_audience,
    country: channel.country,
    market: channel.market,
    language: channel.language,
  });

  const [busy, setBusy] = useState(false);
  const submittingRef = useRef(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.display_name.trim() || submittingRef.current) return;
    submittingRef.current = true;
    setBusy(true);
    try {
      await api.updateChannel(channel.channel_id, {
        display_name: form.display_name.trim(),
        description: form.description.trim(),
        target_audience: form.target_audience.trim(),
        country: form.country,
        market: form.market.trim(),
        language: form.language.trim(),
      });
      onNotice({ tone: "good", message: t("channelDetail.channelUpdatedNotice") });
      await onSaved();
      onClose();
    } catch (error) {
      onNotice({ tone: "bad", message: error instanceof Error ? error.message : "Failed to update channel" });
    } finally {
      submittingRef.current = false;
      setBusy(false);
    }
  };

  return (
    <AccessibleModal titleId={EDIT_CHANNEL_TITLE_ID} onDismiss={onClose} dismissalAllowed={!busy}>
      <form className="modal channel-create-modal" onSubmit={(event) => void submit(event)}>
        <div className="channel-create-header">
          <div className="channel-create-header-info">
            <h2 id={EDIT_CHANNEL_TITLE_ID}>{t("channelDetail.editProfileModalTitle")}</h2>
          </div>
          <button type="button" className="channel-create-close-btn" onClick={onClose} aria-label={t("common.close")} disabled={busy}>
            <X size={18} />
          </button>
        </div>

        <div className="channel-create-body">
          <div className="channel-create-field">
            <label htmlFor="edit-channel-name-input" className="channel-create-label">
              <span>{t("channelDetail.channelName")}</span>
              <span className="required-star">*</span>
            </label>
            <input
              id="edit-channel-name-input"
              required
              autoFocus
              className="channel-create-input"
              value={form.display_name}
              onChange={(event) => setForm((current) => ({ ...current, display_name: event.target.value }))}
            />
          </div>

          <div className="channel-create-field">
            <label htmlFor="edit-channel-desc-input" className="channel-create-label">
              <span>{t("channelDetail.description")}</span>
            </label>
            <textarea
              id="edit-channel-desc-input"
              rows={2}
              className="channel-create-textarea"
              value={form.description}
              onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
              placeholder={t("channels.descriptionPlaceholder")}
            />
          </div>

          <div className="channel-create-field">
            <label htmlFor="edit-channel-audience-input" className="channel-create-label">
              <span>{t("channelDetail.targetAudience")}</span>
            </label>
            <input
              id="edit-channel-audience-input"
              className="channel-create-input"
              value={form.target_audience}
              onChange={(event) => setForm((current) => ({ ...current, target_audience: event.target.value }))}
              placeholder={t("channels.targetAudiencePlaceholder")}
            />
          </div>

          <div className="channel-create-row-2">
            <CountrySelectDropdown
              selectedCountry={form.country}
              onSelectCountry={(country) => setForm((current) => ({ ...current, country }))}
            />

            <div className="channel-create-field">
              <label htmlFor="edit-channel-language-input">{t("channelDetail.language")}</label>
              <div className="input-with-icon">
                <Translate size={16} className="input-prefix-icon" />
                <input
                  id="edit-channel-language-input"
                  value={form.language}
                  onChange={(event) => setForm((current) => ({ ...current, language: event.target.value }))}
                  placeholder={t("channels.languageFieldPlaceholder")}
                />
              </div>
            </div>
          </div>

          <div className="channel-create-field">
            <label htmlFor="edit-channel-market-input">{t("channels.marketFieldLabel")}</label>
            <input
              id="edit-channel-market-input"
              value={form.market}
              onChange={(event) => setForm((current) => ({ ...current, market: event.target.value }))}
              placeholder={t("channels.marketFieldPlaceholder")}
            />
          </div>
        </div>

        <div className="channel-create-actions">
          <button type="button" className="quiet-button channel-cancel-btn" onClick={onClose} disabled={busy}>
            {t("common.cancel")}
          </button>
          <button type="submit" className="primary-button channel-submit-btn" disabled={busy || !form.display_name.trim()}>
            {busy ? <CircleNotch className="spin" size={16} /> : <FloppyDisk size={16} weight="bold" />}
            <span>{busy ? t("channelDetail.savingChannel") : t("channelDetail.saveChanges")}</span>
          </button>
        </div>
      </form>
    </AccessibleModal>
  );
}
