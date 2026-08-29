import { CheckCircle, Eye, CircleNotch, WarningCircle } from "@phosphor-icons/react";
import type { Channel, Episode } from "@studio/shared";
import { CompositionPreviewFrame } from "../../../../components/composition-preview";
import { useTranslation } from "../../../../i18n";
import { useEpisodeStylePreview, type EpisodePreviewCandidate } from "../../hooks/useEpisodeStylePreview";
import { useElementWidth } from "../../hooks/useElementWidth";

const COMPOSITION_WIDTH = 1920;
const COMPOSITION_HEIGHT = 1080;

type EpisodeStylePreviewProps = {
  channel: Channel;
  episode: Episode | null;
  candidate: EpisodePreviewCandidate | null;
  channelBrandName?: string;
};

export function EpisodeStylePreview({ channel, episode, candidate, channelBrandName }: EpisodeStylePreviewProps) {
  const { t } = useTranslation();
  const { ref, width } = useElementWidth<HTMLDivElement>();
  const { previewHtml, pendingPreviewHtml, loading, previewError, iframeKey, commitPendingPreview, retryPreview } = useEpisodeStylePreview({
    channel,
    episode,
    candidate,
    channelBrandName,
  });

  const scale = width > 0 ? width / COMPOSITION_WIDTH : 0;
  const status = getPreviewStatus({ loading, pending: Boolean(pendingPreviewHtml), error: previewError, candidate });

  return (
    <aside className="episode-style-preview">
      <div className="episode-style-preview-header">
        <strong>{t("episodeCustomization.previewTitle")}</strong>
        <PreviewStatusPill status={status} onRetry={retryPreview} />
      </div>
      <div ref={ref} className="episode-style-preview-canvas">
        {scale > 0 ? (
          <div
            className="episode-style-preview-frame"
            style={{ width: COMPOSITION_WIDTH, height: COMPOSITION_HEIGHT, transform: `scale(${scale})` }}
          >
            <CompositionPreviewFrame
              width={COMPOSITION_WIDTH}
              height={COMPOSITION_HEIGHT}
              iframeKey={iframeKey}
              previewHtml={previewHtml}
              pendingPreviewHtml={pendingPreviewHtml}
              loading={loading}
              previewError={previewError}
              onPendingPreviewLoad={(frame, html) => void commitPendingPreview(frame, html)}
              onRetryPreview={retryPreview}
              title={t("episodeCustomization.previewTitle")}
              statusLabel={t("episodeCustomization.previewRendering")}
              errorLabel={t("episodeCustomization.previewError")}
              retryLabel={t("common.retry")}
            />
          </div>
        ) : null}
      </div>
      <p className={`episode-style-preview-caption ${candidate ? "is-candidate" : ""}`}>
        {candidate ? t("episodeCustomization.previewingLabel", { label: candidate.label }) : t("episodeCustomization.previewSavedLabel")}
      </p>
    </aside>
  );
}

type PreviewStatus = "loading" | "error" | "previewing" | "saved";

function getPreviewStatus({
  loading,
  pending,
  error,
  candidate,
}: {
  loading: boolean;
  pending: boolean;
  error: string | null;
  candidate: EpisodePreviewCandidate | null;
}): PreviewStatus {
  if (error) return "error";
  if (loading || pending) return "loading";
  return candidate ? "previewing" : "saved";
}

function PreviewStatusPill({ status, onRetry }: { status: PreviewStatus; onRetry: () => void }) {
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
