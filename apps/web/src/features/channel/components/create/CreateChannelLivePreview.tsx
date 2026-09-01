import React from "react";
import { Check, Sparkle, TelevisionSimple, Users } from "@phosphor-icons/react";
import { getCountryName, getCountryOption } from "@studio/shared";
import { CountryFlag } from "../../../../components/CountryFlag";
import { useTranslation } from "../../../../i18n";
import type { CreateChannelFormData } from "./types";

export interface CreateChannelLivePreviewProps {
  form: CreateChannelFormData;
}

function getAvatarGradient(name: string): string {
  if (!name.trim()) return "linear-gradient(135deg, #06b6d4, #0891b2)";
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const gradients = [
    "linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)",
    "linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)",
    "linear-gradient(135deg, #10b981 0%, #06b6d4 100%)",
    "linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)",
    "linear-gradient(135deg, #6366f1 0%, #a855f7 100%)",
  ];
  return gradients[Math.abs(hash) % gradients.length];
}

export function CreateChannelLivePreview({ form }: CreateChannelLivePreviewProps) {
  const { language } = useTranslation();
  const countryOpt = getCountryOption(form.country);
  const countryName = getCountryName(form.country);
  const displayName = form.name.trim() || (language === "vi" ? "Tên Kênh Mới" : "New Channel");
  const initial = form.name.trim() ? form.name.trim().charAt(0).toUpperCase() : null;
  const avatarBg = getAvatarGradient(form.name);

  return (
    <div className="channel-live-preview-panel">
      <div className="channel-preview-header">
        <span className="preview-label-badge">
          <Sparkle size={13} weight="fill" />
          <span>{language === "vi" ? "Xem trước Nhận diện" : "Live Preview"}</span>
        </span>
        {countryOpt?.rank ? (
          <span className="preview-cpm-rank-badge">
            Top #{countryOpt.rank} CPM
          </span>
        ) : null}
      </div>

      <div className="channel-preview-card">
        <div className="channel-preview-card-top">
          <div className="channel-preview-avatar" style={{ background: avatarBg }}>
            {initial ? (
              <span className="preview-avatar-letter">{initial}</span>
            ) : (
              <TelevisionSimple size={24} weight="duotone" className="preview-avatar-icon" />
            )}
          </div>

          <div className="channel-preview-info">
            <h4 className="channel-preview-title" title={displayName}>
              {displayName}
            </h4>
            <div className="channel-preview-meta-chips">
              <span className="channel-preview-chip">
                <CountryFlag code={form.country || "AU"} size={14} />
                <span>{countryName || form.country || "AU"}</span>
              </span>
              <span className="channel-preview-chip lang">
                {form.language || countryOpt?.defaultLanguage || "English"}
              </span>
            </div>
          </div>
        </div>

        {form.target_audience ? (
          <div className="channel-preview-audience-row">
            <Users size={14} className="preview-audience-icon" />
            <span className="preview-audience-text">{form.target_audience}</span>
          </div>
        ) : null}

        {form.description ? (
          <div className="channel-preview-desc-row">
            <p className="preview-desc-text">{form.description}</p>
          </div>
        ) : null}

        <div className="channel-preview-footer">
          <div className="channel-preview-status-pill">
            <span className="status-indicator-dot" />
            <span>
              {language === "vi"
                ? "AI Blueprint & Giọng đọc: Sẵn sàng"
                : "AI Blueprint & Voice: Ready"}
            </span>
          </div>
        </div>
      </div>

      <div className="channel-preview-checklist">
        <div className="checklist-item">
          <div className="checklist-check">
            <Check size={11} weight="bold" />
          </div>
          <span>{language === "vi" ? "Tự động sinh DNA thương hiệu với AI" : "Auto-generate Brand DNA with AI"}</span>
        </div>
        <div className="checklist-item">
          <div className="checklist-check">
            <Check size={11} weight="bold" />
          </div>
          <span>{language === "vi" ? "Đồng bộ ngôn ngữ & giọng đọc bản địa" : "Localized language & native voice"}</span>
        </div>
        <div className="checklist-item">
          <div className="checklist-check">
            <Check size={11} weight="bold" />
          </div>
          <span>{language === "vi" ? "Sẵn sàng sản xuất video YouTube Quiz" : "Ready for YouTube Quiz production"}</span>
        </div>
      </div>
    </div>
  );
}
