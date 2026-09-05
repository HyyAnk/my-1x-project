import { CurrencyDollar, ImageSquare, Info } from "@phosphor-icons/react";
import type { UsageLedger } from "@studio/shared";
import { useTranslation } from "../../i18n";

export type CostSavingsSectionProps = {
  voiceMetrics?: {
    rendered_characters: number;
    rendered_duration_seconds: number;
    rendered_segments_count: number;
    rendered_episodes_count: number;
  } | null;
  usageLedger?: UsageLedger | null;
};

export function CostSavingsSection({ voiceMetrics, usageLedger }: CostSavingsSectionProps) {
  const { t } = useTranslation();
  const elevenLabsRatePer1k = 0.1; // $0.10 per 1,000 characters
  const numberLocale = "en-US";

  // Voice metrics
  const renderedChars = voiceMetrics?.rendered_characters ?? usageLedger?.voice?.rendered_characters ?? 0;
  const renderedSeconds = voiceMetrics?.rendered_duration_seconds ?? usageLedger?.voice?.rendered_duration_seconds ?? 0;
  const savedUsd = (renderedChars / 1000) * elevenLabsRatePer1k;

  // Image metrics
  const totalImages = usageLedger?.image?.total_images_generated ?? 0;
  const imageSpendUsd = usageLedger?.image?.estimated_cost_usd ?? totalImages * 0.02;

  const providers = Object.keys(usageLedger?.image?.by_provider ?? {});
  const topProvider = providers.length
    ? providers.sort((a, b) => (usageLedger?.image?.by_provider[b] ?? 0) - (usageLedger?.image?.by_provider[a] ?? 0))[0]
    : "GPT-Image-2";

  return (
    <div className="dashboard-section economics-section">
      <div className="dashboard-section-header">
        <div className="dashboard-section-title" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <h2>{t("dashboard.economicsTitle")}</h2>
          <span
            title={t("dashboard.ledgerSavedTooltip")}
            style={{ display: "inline-flex", alignItems: "center", cursor: "help", color: "var(--muted)" }}
          >
            <Info size={15} weight="bold" />
          </span>
        </div>
      </div>

      <div className="economics-dual-grid">
        {/* Card 1: Voice Cost Savings */}
        <div className="savings-card economics-card voice-card">
          <div className="economics-card-header">
            <div className="economics-card-title">
              <CurrencyDollar size={18} weight="duotone" style={{ color: "var(--green)" }} />
              <h3>{t("dashboard.voiceSavingsCardTitle")}</h3>
            </div>
            <span className="economics-card-badge positive">ROI+</span>
          </div>

          <div className="savings-metrics-row">
            <div className="savings-submetric">
              <span className="submetric-label">{t("dashboard.estimatedSavings")}</span>
              <strong className="submetric-val" style={{ color: "var(--green)" }}>
                +${savedUsd.toFixed(2)} USD
              </strong>
            </div>
            <div className="savings-submetric">
              <span className="submetric-label">{t("dashboard.renderedCharacters")}</span>
              <strong className="submetric-val">
                {renderedChars.toLocaleString(numberLocale)} {t("dashboard.unitChars")}
              </strong>
            </div>
            <div className="savings-submetric">
              <span className="submetric-label">{t("dashboard.audioProduced")}</span>
              <strong className="submetric-val">
                {renderedSeconds > 0
                  ? `${(renderedSeconds / 60).toFixed(1)} ${t("dashboard.unitMins")}`
                  : `0 ${t("dashboard.unitMins")}`}
              </strong>
            </div>
          </div>
        </div>

        {/* Card 2: AI Image Generation Spend */}
        <div className="savings-card economics-card image-card">
          <div className="economics-card-header">
            <div className="economics-card-title">
              <ImageSquare size={18} weight="duotone" style={{ color: "var(--blue, #3b82f6)" }} />
              <h3>{t("dashboard.imageSpendCardTitle")}</h3>
            </div>
            <span
              title={t("dashboard.imageSpendTooltip")}
              style={{ display: "inline-flex", alignItems: "center", cursor: "help", color: "var(--muted)" }}
            >
              <Info size={14} weight="bold" />
            </span>
          </div>

          <div className="savings-metrics-row">
            <div className="savings-submetric">
              <span className="submetric-label">{t("dashboard.totalImageSpend")}</span>
              <strong className="submetric-val" style={{ color: "var(--blue, #3b82f6)" }}>
                ${imageSpendUsd.toFixed(2)} USD
              </strong>
            </div>
            <div className="savings-submetric">
              <span className="submetric-label">{t("dashboard.aiImagesProduced")}</span>
              <strong className="submetric-val">
                {totalImages.toLocaleString(numberLocale)}{" "}
                {totalImages === 1 ? t("dashboard.unitImagesSingular") : t("dashboard.unitImages")}
              </strong>
            </div>
            <div className="savings-submetric">
              <span className="submetric-label">{t("dashboard.primaryProvider")}</span>
              <strong className="submetric-val" style={{ textTransform: "capitalize" }}>
                {topProvider}
              </strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
