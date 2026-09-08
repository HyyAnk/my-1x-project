import { CheckCircle, Globe, Sparkle } from "@phosphor-icons/react";
import type { ShortReelSourceSnapshot } from "@studio/shared";

export interface ShortReelSourceCardProps {
  source: ShortReelSourceSnapshot;
}

function formatLabel(id: string): string {
  return id.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function ShortReelSourceCard({ source }: ShortReelSourceCardProps) {
  const isTranslated = source.translation_provenance === "verified_translation";
  const archetypeDisplay = source.archetype_id === "versus_faceoff" ? "Versus Face-off" : "Deep Trivia";
  const domainId = "original_question" in source && source.original_question ? source.original_question.domain_id : undefined;
  const subtopicId = "original_question" in source && source.original_question ? source.original_question.subtopic_id : undefined;

  return (
    <section className="short-reel-card short-reel-source-card" aria-label="Question Bank Source">
      <div className="short-reel-card-header">
        <div className="short-reel-card-title-group">
          <h3 className="short-reel-card-title">Question Bank Source</h3>
          <div className="short-reel-meta-tags">
            <span className="short-reel-tag short-reel-tag-archetype" title={`Archetype: ${archetypeDisplay}`}>
              <Sparkle size={12} weight="fill" />
              {archetypeDisplay}
            </span>
            <span
              className={`short-reel-tag ${isTranslated ? "short-reel-tag-translated" : "short-reel-tag-native"}`}
              title={isTranslated ? "Verified English translation from question bank" : "Native English question bank record"}
            >
              <Globe size={12} />
              {isTranslated ? "Translated English" : "Native English"}
            </span>
          </div>
        </div>
        {domainId && subtopicId ? (
          <div className="short-reel-taxonomy">
            <span className="short-reel-taxonomy-domain">{formatLabel(domainId)}</span>
            <span className="short-reel-taxonomy-separator">/</span>
            <span className="short-reel-taxonomy-subtopic">{formatLabel(subtopicId)}</span>
          </div>
        ) : null}
      </div>

      <p className="short-reel-source-question" data-testid="short-reel-source-question">
        {source.question_text}
      </p>

      <div className="short-reel-choices-list" role="list" aria-label="Question choices">
        {source.choices.map((choice) => (
          <div
            key={choice.id}
            role="listitem"
            className={`short-reel-choice-item ${choice.is_correct ? "short-reel-choice-correct" : ""}`}
            data-testid={`choice-${choice.id}`}
          >
            <span className="short-reel-choice-key">{choice.id}.</span>
            <span className="short-reel-choice-text">{choice.text}</span>
            {choice.is_correct ? (
              <span className="short-reel-correct-badge" aria-label="Correct answer">
                <CheckCircle size={14} weight="fill" />
                <span>Correct Answer</span>
              </span>
            ) : null}
          </div>
        ))}
      </div>

      {source.explanation ? (
        <div className="short-reel-explanation-box">
          <span className="short-reel-explanation-label">Explanation:</span>
          <p className="short-reel-explanation-text">{source.explanation}</p>
        </div>
      ) : null}
    </section>
  );
}
