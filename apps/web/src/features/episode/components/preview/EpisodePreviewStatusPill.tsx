import { CheckCircle, CircleNotch, Eye, WarningCircle } from "@phosphor-icons/react";
import { useTranslation } from "../../../../i18n";

export type EpisodePreviewStatus = "loading" | "error" | "previewing" | "saved";

export function EpisodePreviewStatusPill({ status, onRetry }: { status: EpisodePreviewStatus; onRetry: () => void }) {
  const { t } = useTranslation();
  if (status === "error") {
    return (
      <button type="button" className="episode-style-preview-status is-error" onClick={onRetry}>
        <WarningCircle size={13} weight="fill" />
        <span>{t("common.retry")}</span>
      </button>
    );
  }

  const icon =
    status === "loading" ? (
      <CircleNotch className="spin" size={13} />
    ) : status === "previewing" ? (
      <Eye size={13} />
    ) : (
      <CheckCircle size={13} weight="fill" />
    );
  const label =
    status === "loading"
      ? t("episodeCustomization.previewRendering")
      : status === "previewing"
        ? t("episodeCustomization.previewStatusPreviewing")
        : t("episodeCustomization.previewStatusSaved");

  return (
    <span className={`episode-style-preview-status is-${status}`}>
      {icon}
      <span>{label}</span>
    </span>
  );
}
