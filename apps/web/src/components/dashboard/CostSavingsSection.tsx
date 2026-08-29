import { CurrencyDollar } from "@phosphor-icons/react";
import { useTranslation } from "../../i18n";

export type CostSavingsSectionProps = {
  voiceMetrics?: {
    rendered_characters: number;
    rendered_duration_seconds: number;
    rendered_segments_count: number;
    rendered_episodes_count: number;
  } | null;
};

export function CostSavingsSection({ voiceMetrics }: CostSavingsSectionProps) {
  const { t } = useTranslation();
  const elevenLabsRatePer1k = 0.1; // $0.10 per 1,000 characters
  const usdToVnd = 25500;

  const renderedChars = voiceMetrics?.rendered_characters || 0;
  const renderedSeconds = voiceMetrics?.rendered_duration_seconds || 0;

  const savedUsd = (renderedChars / 1000) * elevenLabsRatePer1k;
  const savedVnd = savedUsd * usdToVnd;

  return (
    <div className="dashboard-section">
      <div className="dashboard-section-header">
        <div className="dashboard-section-title">
          <CurrencyDollar size={18} weight="duotone" style={{ color: "var(--green)" }} />
          <h2>{t("dashboard.voiceSavingsTitle")}</h2>
        </div>
      </div>

      <div className="savings-card">
        <div className="savings-metrics-row">
          <div className="savings-submetric">
            <span className="submetric-label">{t("dashboard.estimatedSavings")}</span>
            <strong className="submetric-val" style={{ color: "var(--green)" }}>
              ${savedUsd.toFixed(2)} USD{" "}
              <span style={{ fontSize: "12px", color: "var(--muted)", fontWeight: 500 }}>
                ({Math.round(savedVnd).toLocaleString("vi-VN")} ₫)
              </span>
            </strong>
          </div>
          <div className="savings-submetric">
            <span className="submetric-label">{t("dashboard.renderedCharacters")}</span>
            <strong className="submetric-val">{renderedChars.toLocaleString("vi-VN")} chars</strong>
          </div>
          <div className="savings-submetric">
            <span className="submetric-label">{t("dashboard.audioProduced")}</span>
            <strong className="submetric-val">{renderedSeconds > 0 ? `${(renderedSeconds / 60).toFixed(1)} mins` : "0 mins"}</strong>
          </div>
        </div>
      </div>
    </div>
  );
}
