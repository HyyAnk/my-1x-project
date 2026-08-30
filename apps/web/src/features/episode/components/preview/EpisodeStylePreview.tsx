import { useMemo } from "react";
import type { Channel, DirectorPlan, Episode, QuizV2 } from "@studio/shared";
import { CompositionPreviewFrame } from "../../../../components/composition-preview";
import { useTranslation } from "../../../../i18n";
import { useEpisodeStylePreview, type EpisodePreviewCandidate } from "../../hooks/useEpisodeStylePreview";
import { useElementWidth } from "../../hooks/useElementWidth";
import { useEpisodePreviewQuestion } from "../../hooks/useEpisodePreviewQuestion";
import { buildEpisodePreviewQuestions } from "../../utils/episodePreviewQuestions";
import { getQuizLayoutUiDefinition } from "../../../quizLayouts/quizLayoutUiCatalog";
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

  const scale = width > 0 ? width / COMPOSITION_WIDTH : 0;
  const status = getPreviewStatus({ loading, pending: Boolean(pendingPreviewHtml), error: previewError, candidate });
  const savedCaption = getSavedPreviewCaption(questionSelection.selectedQuestion, t);

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
        {candidate ? t("episodeCustomization.previewingLabel", { label: candidate.label }) : savedCaption}
      </p>
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

function getSavedPreviewCaption(
  question: ReturnType<typeof useEpisodePreviewQuestion>["selectedQuestion"],
  t: (path: string, params?: Record<string, string | number>) => string,
): string {
  if (!question) return t("episodeCustomization.previewSavedLabel");
  const layout = getQuizLayoutUiDefinition(question.layoutId);
  if (question.layoutSource === "topic_template") {
    return t("episodeCustomization.previewTopicTemplateLabel", { layout: t(layout.labelKey) });
  }
  const key =
    question.layoutSource === "inferred"
      ? "episodeCustomization.previewInferredQuestionLabel"
      : "episodeCustomization.previewQuestionLabelValue";
  return t(key, { number: question.number, layout: t(layout.labelKey) });
}
