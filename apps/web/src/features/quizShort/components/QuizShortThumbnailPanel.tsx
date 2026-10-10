import { ArrowsClockwise, ImageSquare } from "@phosphor-icons/react";
import type { QuizShortCoverManifest } from "@studio/shared";
import type { useQuizShortThumbnail } from "../hooks/useQuizShortThumbnail";

export type QuizShortThumbnailPanelProps = {
  thumbnail: ReturnType<typeof useQuizShortThumbnail>;
  title: string;
};

function formatGeneratedAt(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("en-US");
}

function CoverSummary({ manifest }: { manifest: QuizShortCoverManifest }) {
  return (
    <dl className="quiz-short-cover-summary" data-testid="quiz-short-cover-summary">
      <dt>Hook</dt>
      <dd>{manifest.hook_text}</dd>
      <dt>Badge</dt>
      <dd>{manifest.badge_text}</dd>
      <dt>Persona</dt>
      <dd>{manifest.archetype_name}</dd>
      <dt>Generated</dt>
      <dd>{formatGeneratedAt(manifest.generated_at)}</dd>
    </dl>
  );
}

/**
 * One 9:16 cover planned from the hook question. Quiz Shorts have no layout, badge or ratio
 * pickers: the cover manifest is its own artifact, so this panel does not reuse the Episode deck.
 */
export function QuizShortThumbnailPanel({ thumbnail, title }: QuizShortThumbnailPanelProps) {
  const actionLabel = thumbnail.generating ? "Generating cover..." : thumbnail.hasThumbnail ? "New cover" : "Generate cover";
  return (
    <section className="quiz-short-thumbnail-panel" aria-label="Cover thumbnail" data-testid="quiz-short-thumbnail-panel">
      <div className="quiz-short-thumbnail-stage">
        {thumbnail.imageUrl ? (
          <img src={thumbnail.imageUrl} alt={`Cover thumbnail for ${title}`} className="quiz-short-thumbnail-image" />
        ) : (
          <div className="quiz-short-thumbnail-placeholder" data-testid="quiz-short-thumbnail-placeholder">
            <ImageSquare size={32} weight="duotone" />
            <span>{thumbnail.loading ? "Loading cover..." : "No cover yet. Generate a 9:16 cover from question one."}</span>
          </div>
        )}
      </div>
      <div className="quiz-short-cover-controls">
        <span className="control-field-label">Cover</span>
        {thumbnail.manifest ? (
          <CoverSummary manifest={thumbnail.manifest} />
        ) : (
          <p className="quiz-short-cover-hint">The cover uses the first question as its hook and shows the question count badge.</p>
        )}
        <button
          type="button"
          className="quiz-short-cover-generate"
          onClick={() => void thumbnail.generate()}
          disabled={thumbnail.generating}
          data-testid="quiz-short-cover-generate"
        >
          <ArrowsClockwise size={14} aria-hidden="true" />
          {actionLabel}
        </button>
      </div>
    </section>
  );
}
