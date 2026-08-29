import { Globe, PencilSimple, Users, Translate, Info } from "@phosphor-icons/react";
import { getCountryName, getCountryOption, getLanguageDisplay, type Channel } from "@studio/shared";
import { CountryFlag } from "../../../components/CountryFlag";
import { StatusBadge } from "../../../components/AppChrome";
import { useTranslation } from "../../../i18n";

type ChannelProfileCardProps = {
  channel: Channel;
  onOpenEditModal: () => void;
};

export function ChannelProfileCard({ channel, onOpenEditModal }: ChannelProfileCardProps) {
  const { t, language } = useTranslation();
  const countryCode = channel.country || channel.market || "GLOBAL";
  const countryOption = getCountryOption(countryCode);
  const countryDisplayName =
    language === "vi"
      ? countryOption?.nameVi || countryOption?.name || getCountryName(countryCode)
      : countryOption?.nameEn || countryOption?.name || getCountryName(countryCode);

  return (
    <div className="panel channel-identity-card">
      <div className="panel-heading">
        <div>
          <h2>{t("channelDetail.profileTitle")}</h2>
        </div>
        <div className="panel-actions">
          <button type="button" className="quiet-button compact" onClick={onOpenEditModal} title={t("channelDetail.editProfileBtn")}>
            <PencilSimple size={15} />
            <span>{t("channelDetail.editProfileBtn")}</span>
          </button>
        </div>
      </div>

      <div className="channel-identity-card-body">
        <div className="channel-profile-main">
          <div className="channel-profile-header-row">
            <h3 className="channel-profile-name">{channel.display_name}</h3>
            <StatusBadge status={channel.status} />
          </div>

          {channel.description ? <p className="channel-profile-desc">{channel.description}</p> : null}
        </div>

        <div className="channel-profile-grid">
          <div className="channel-profile-stat-box">
            <div className="stat-box-label">
              <Users size={14} />
              <span>{t("channelDetail.targetAudience")}</span>
            </div>
            <div className="stat-box-value">
              <strong>{channel.target_audience || t("channelDetail.noAudienceSet")}</strong>
            </div>
          </div>

          <div className="channel-profile-stat-box">
            <div className="stat-box-label">
              <Globe size={14} />
              <span>{t("channelDetail.country")}</span>
            </div>
            <div className="stat-box-value">
              <span className="country-display-pill">
                <CountryFlag code={countryCode} size={16} />
                {countryOption?.rank ? <span className="country-rank-mini">#{countryOption.rank}</span> : null}
                <strong>{countryDisplayName}</strong>
              </span>
            </div>
          </div>

          <div className="channel-profile-stat-box">
            <div className="stat-box-label">
              <Translate size={14} />
              <span>{t("channelDetail.language")}</span>
            </div>
            <div className="stat-box-value">
              <span className="lang-display-pill">
                <strong>{getLanguageDisplay(channel.language || "English")}</strong>
                <span className="auto-sync-tag">⚡</span>
              </span>
            </div>
          </div>

          <div className="channel-profile-stat-box">
            <div className="stat-box-label">
              <Info size={14} />
              <span>Engine</span>
            </div>
            <div className="stat-box-value">
              <strong>Quiz Engine</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
