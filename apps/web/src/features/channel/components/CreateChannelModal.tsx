import React from "react";
import { CircleNotch, Info, Plus, Sparkle, X } from "@phosphor-icons/react";
import type { Task } from "@studio/shared";
import { AccessibleModal } from "../../../components/AccessibleModal";
import { useTranslation } from "../../../i18n";
import { CreateChannelFormFields } from "./create/CreateChannelFormFields";
import { CreateChannelLivePreview } from "./create/CreateChannelLivePreview";
import { useCreateChannelForm } from "../hooks/useCreateChannelForm";

const CREATE_CHANNEL_TITLE_ID = "create-channel-title";

export interface CreateChannelModalProps {
  onClose: () => void;
  onCreated: (channelId: string, message: string, task: Task | null) => Promise<void>;
  onError: (error: unknown) => void;
}

export function CreateChannelModal({ onClose, onCreated, onError }: CreateChannelModalProps) {
  const { t, language } = useTranslation();
  const {
    form,
    setForm,
    busy,
    handleCountrySelect,
    handleLanguageChange,
    handleAudienceSelect,
    submit,
  } = useCreateChannelForm({ onCreated, onError });

  return (
    <AccessibleModal titleId={CREATE_CHANNEL_TITLE_ID} onDismiss={onClose} dismissalAllowed={!busy}>
      <form className="modal channel-create-modal" onSubmit={(event) => void submit(event)}>
        <div className="channel-create-header">
          <div className="channel-create-header-info">
            <div className="channel-header-title-row">
              <div className="channel-header-icon-wrap">
                <Sparkle size={20} weight="fill" />
              </div>
              <h2 id={CREATE_CHANNEL_TITLE_ID}>{t("channels.createChannelTitle")}</h2>
              <span className="channel-engine-badge">Top 20 CPM YouTube</span>
            </div>
          </div>
          <button
            type="button"
            className="channel-create-close-btn"
            onClick={onClose}
            aria-label={t("common.close")}
            disabled={busy}
          >
            <X size={18} />
          </button>
        </div>

        <div className="channel-create-body channel-create-split-body">
          <div className="channel-create-form-col">
            <CreateChannelFormFields
              form={form}
              setForm={setForm}
              onCountrySelect={handleCountrySelect}
              onLanguageChange={handleLanguageChange}
              onAudienceSelect={handleAudienceSelect}
              disabled={busy}
            />
          </div>

          <div className="channel-create-preview-col">
            <CreateChannelLivePreview form={form} />
          </div>
        </div>

        <div className="channel-create-footer">
          <div className="channel-create-footer-hint">
            <Info size={15} className="footer-hint-icon" />
            <span>
              {language === "vi"
                ? "AI tự động phân tích hồ sơ và tạo DNA chuẩn kèm giọng đọc phù hợp thị trường."
                : "AI automatically analyzes profile and generates tailored brand DNA."}
            </span>
          </div>

          <div className="channel-create-footer-actions">
            <button type="button" className="quiet-button" onClick={onClose} disabled={busy}>
              {t("common.cancel")}
            </button>
            <button
              type="submit"
              className="primary-button channel-submit-btn"
              disabled={busy || !form.name.trim()}
            >
              {busy ? (
                <>
                  <CircleNotch size={16} className="spinner-icon spin" />
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
        </div>
      </form>
    </AccessibleModal>
  );
}
