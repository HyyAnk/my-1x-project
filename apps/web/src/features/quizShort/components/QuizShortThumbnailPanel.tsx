import { ArrowsClockwise, ImageSquare } from "@phosphor-icons/react";
import { QUIZ_SHORT_COVER_HOOK_MAX_CHARS, type QuizShortCoverManifest } from "@studio/shared";
import type { useQuizShortThumbnail } from "../hooks/useQuizShortThumbnail";

export type QuizShortThumbnailPanelProps = {
  thumbnail: ReturnType<typeof useQuizShortThumbnail>;
  title: string;
  /** Question texts of the quiz, in order; the cover hook is written from one of them. */
  questions: string[];
};

function formatGeneratedAt(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("en-US");
}

function shorten(text: string, max = 60): string {
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

function CoverSummary({ manifest }: { manifest: QuizShortCoverManifest }) {
  const source = manifest.hook_source === "custom" ? "your text" : manifest.hook_source === "llm" ? "planner" : "question";
  return (
    <dl className="quiz-short-cover-summary" data-testid="quiz-short-cover-summary">
      <dt>Hook</dt>
      <dd>
        {manifest.hook_text} <span className="quiz-short-cover-source">({source})</span>
      </dd>
      <dt>Badge</dt>
      <dd>{manifest.badge_text}</dd>
      <dt>Persona</dt>
      <dd>{manifest.archetype_name}</dd>
      <dt>Generated</dt>
      <dd>{formatGeneratedAt(manifest.generated_at)}</dd>
    </dl>
  );
}

function HookControls({ thumbnail, questions }: Pick<QuizShortThumbnailPanelProps, "thumbnail" | "questions">) {
  return (
    <>
      <label className="quiz-short-cover-field">
        <span>Hook question</span>
        <select
          value={Math.min(thumbnail.questionIndex, Math.max(0, questions.length - 1))}
          disabled={thumbnail.generating || questions.length === 0}
          onChange={(event) => thumbnail.setQuestionIndex(Number(event.target.value))}
          data-testid="quiz-short-cover-question"
        >
          {questions.length === 0 ? <option value={0}>Question 1</option> : null}
          {questions.map((question, index) => (
            <option key={index} value={index}>
              {`Q${index + 1}: ${shorten(question)}`}
            </option>
          ))}
        </select>
      </label>
      <label className="quiz-short-cover-field">
        <span>Custom hook (optional)</span>
        <input
          type="text"
          value={thumbnail.hookText}
          maxLength={QUIZ_SHORT_COVER_HOOK_MAX_CHARS * 2}
          placeholder="Leave empty to let the planner write a fresh hook"
          disabled={thumbnail.generating}
          onChange={(event) => thumbnail.setHookText(event.target.value)}
          data-testid="quiz-short-cover-hook"
        />
      </label>
    </>
  );
}

/**
 * One 9:16 cover planned from a hook question. Every generation writes a new cover plan: the
 * planner proposes a fresh hook banner that avoids earlier ones, unless a custom hook is given.
 */
export function QuizShortThumbnailPanel({ thumbnail, title, questions }: QuizShortThumbnailPanelProps) {
  const actionLabel = thumbnail.generating ? "Generating cover..." : thumbnail.hasThumbnail ? "New cover" : "Generate cover";
  return (
    <section className="quiz-short-thumbnail-panel" aria-label="Cover thumbnail" data-testid="quiz-short-thumbnail-panel">
      <div className="quiz-short-thumbnail-stage">
        {thumbnail.imageUrl ? (
          <img src={thumbnail.imageUrl} alt={`Cover thumbnail for ${title}`} className="quiz-short-thumbnail-image" />
        ) : (
          <div className="quiz-short-thumbnail-placeholder" data-testid="quiz-short-thumbnail-placeholder">
            <ImageSquare size={32} weight="duotone" />
            <span>{thumbnail.loading ? "Loading cover..." : "No cover yet. Generate a 9:16 cover from a hook question."}</span>
          </div>
        )}
      </div>
      <div className="quiz-short-cover-controls">
        <span className="control-field-label">Cover</span>
        {thumbnail.manifest ? <CoverSummary manifest={thumbnail.manifest} /> : null}
        <HookControls thumbnail={thumbnail} questions={questions} />
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
