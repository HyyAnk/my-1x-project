import { useMemo } from "react";
import type { Channel, DirectorPlan, Episode, QuizV2 } from "@studio/shared";
import { CompositionPreviewFrame } from "../../../../components/composition-preview";
import { useTranslation } from "../../../../i18n";
import { useEpisodeStylePreview, type EpisodePreviewCandidate } from "../../hooks/useEpisodeStylePreview";
import { useElementWidth } from "../../hooks/useElementWidth";
import { useEpisodePreviewQuestion } from "../../hooks/useEpisodePreviewQuestion";
import { buildEpisodePreviewQuestions } from "../../utils/episodePreviewQuestions";
import { EpisodePreviewQuestionSelect } from "./EpisodePreviewQuestionSelect";
import { EpisodePreviewStatusPill, type EpisodePreviewStatus } from "./EpisodePreviewStatusPill";

const COMPOSITION_WIDTH = 1920;
const COMPOSITION_HEIGHT = 1080;

type EpisodeStylePreviewProps = {
  channel: Channel;
  episode: Episode | null;
  quiz: QuizV2 | null;
  directorPlan: DirectorPlan | null;
  candidate: EpisodePreviewCandidate | null;
  channelBrandName?: string;
};

export function EpisodeStylePreview({ channel, episode, quiz, directorPlan, candidate, channelBrandName }: EpisodeStylePreviewProps) {
  const { t } = useTranslation();
  const { ref, width } = useElementWidth<HTMLDivElement>();
  const questions = useMemo(() => buildEpisodePreviewQuestions(quiz, directorPlan, episode), [directorPlan, episode, quiz]);
  const questionSelection = useEpisodePreviewQuestion(questions);
  const { previewHtml, pendingPreviewHtml, loading, previewError, iframeKey, commitPendingPreview, retryPreview } = useEpisodeStylePreview({
    channel,
    episode,
    candidate,
    channelBrandName,
    previewQuestion: questionSelection.selectedQuestion,
  });

  const isPortrait = episode?.quiz_config?.render_aspect_ratio === "9:16";
  const compositionWidth = isPortrait ? 1080 : 1920;
  const compositionHeight = isPortrait ? 1920 : 1080;
  const scale = width > 0 ? width / compositionWidth : 0;
  const status = getPreviewStatus({ loading, pending: Boolean(pendingPreviewHtml), error: previewError, candidate });

  return (
    <aside className="episode-style-preview">
      <div className="episode-style-preview-header">
        <strong>{t("episodeCustomization.previewTitle")}</strong>
        <div className="episode-style-preview-actions">
          <EpisodePreviewQuestionSelect
            questions={questions}
            selectedQuestionId={questionSelection.selectedQuestionId}
            onSelectQuestion={questionSelection.selectQuestion}
          />
          <EpisodePreviewStatusPill status={status} onRetry={retryPreview} />
        </div>
      </div>
      <div
        ref={ref}
        className="episode-style-preview-canvas"
        style={{
          aspectRatio: isPortrait ? "9 / 16" : "16 / 9",
          maxWidth: isPortrait ? "260px" : "100%",
          margin: isPortrait ? "0 auto" : undefined,
        }}
      >
        {scale > 0 ? (
          <div
            className="episode-style-preview-frame"
            style={{ width: compositionWidth, height: compositionHeight, transform: `scale(${scale})` }}
          >
            <CompositionPreviewFrame
              width={compositionWidth}
              height={compositionHeight}
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
      {candidate ? (
        <p className="episode-style-preview-caption is-candidate">
          {t("episodeCustomization.previewingLabel", { label: candidate.label })}
        </p>
      ) : null}
    </aside>
  );
}

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
}): EpisodePreviewStatus {
  if (error) return "error";
  if (loading || pending) return "loading";
  return candidate ? "previewing" : "saved";
}
