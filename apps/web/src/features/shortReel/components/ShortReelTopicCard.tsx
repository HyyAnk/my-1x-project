import type { ShortReelTopicSnapshot } from "@studio/shared";

export interface ShortReelTopicCardProps {
  topic: ShortReelTopicSnapshot;
}

/** Topic concept card summarizing the premise and hook behind the reel. */
export function ShortReelTopicCard({ topic }: ShortReelTopicCardProps) {
  const isKeywordOrigin = topic.origin === "keyword";

  return (
    <section className="short-reel-card short-reel-topic-card" aria-label="Topic Concept">
      <div className="short-reel-card-header">
        <div className="short-reel-card-title-group">
          <h3 className="short-reel-card-title">Topic Concept</h3>
          <span className={`short-reel-tag ${isKeywordOrigin ? "short-reel-tag-origin-keyword" : "short-reel-tag-origin-discovery"}`}>
            Origin: {topic.origin}
          </span>
        </div>
      </div>

      <div className="short-reel-field">
        <span className="short-reel-field-label">Premise</span>
        <p className="short-reel-field-value">{topic.premise}</p>
      </div>

      <div className="short-reel-field">
        <span className="short-reel-field-label">Hook</span>
        <p className="short-reel-field-value">{topic.hook}</p>
      </div>
    </section>
  );
}
