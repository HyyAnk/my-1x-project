import { Check, Copy, Hash, Sparkle, Trophy, YoutubeLogo } from "@phosphor-icons/react";
import type { VideoDescription } from "@studio/shared";

interface DescriptionBlockEditorProps {
  description: VideoDescription | null;
  copiedBlock: string | null;
  onCopyBlock: (text: string, blockKey: string) => void;
}

export function DescriptionBlockEditor({
  description,
  copiedBlock,
  onCopyBlock,
}: DescriptionBlockEditorProps) {
  if (!description) return null;

  const scoringText = `🏆 SCORING TIERS:\n• ${description.scoring_cta.beginner}\n• ${description.scoring_cta.intermediate}\n• ${description.scoring_cta.expert}\n\n${description.scoring_cta.cta_text}`;
  const hashtagsText = description.hashtags.join(" ");

  return (
    <div className="description-bento-grid">
      {/* Block 1: Hook & Context (Above The Fold) */}
      <div className="description-bento-card">
        <div>
          <div className="bento-card-header">
            <span className="bento-card-title">
              <Sparkle size={16} weight="duotone" color="var(--accent)" />
              <span>Hook & SEO Context</span>
            </span>

            <button
              type="button"
              className={`bento-copy-pill ${copiedBlock === "Hook" ? "is-copied" : ""}`}
              onClick={() => onCopyBlock(`${description.hook_lines}\n\n${description.semantic_paragraph}`, "Hook")}
              title="Copy Hook and Intro text"
            >
              {copiedBlock === "Hook" ? (
                <>
                  <Check size={12} weight="bold" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy size={12} weight="duotone" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>

          <div className="bento-card-body">
            <p className="bento-hook-headline">
              {description.hook_lines}
            </p>
            <p className="bento-hook-body">
              {description.semantic_paragraph}
            </p>
          </div>
        </div>
      </div>

      {/* Block 2: Gamified Scoring Leaderboard */}
      <div className="description-bento-card">
        <div>
          <div className="bento-card-header">
            <span className="bento-card-title">
              <Trophy size={16} weight="duotone" color="var(--yellow)" />
              <span>Scoring Leaderboard</span>
            </span>

            <button
              type="button"
              className={`bento-copy-pill ${copiedBlock === "Scoring" ? "is-copied" : ""}`}
              onClick={() => onCopyBlock(scoringText, "Scoring")}
              title="Copy Scoring Leaderboard & CTA"
            >
              {copiedBlock === "Scoring" ? (
                <>
                  <Check size={12} weight="bold" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy size={12} weight="duotone" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>

          <div className="bento-card-body">
            <ul className="bento-tiers-list">
              <li>{description.scoring_cta.beginner}</li>
              <li>{description.scoring_cta.intermediate}</li>
              <li>{description.scoring_cta.expert}</li>
            </ul>
            <div className="bento-cta-text">{description.scoring_cta.cta_text}</div>
          </div>
        </div>
      </div>

      {/* Block 3: Hashtags & Playlist Taxonomy */}
      <div className="description-bento-card">
        <div>
          <div className="bento-card-header">
            <span className="bento-card-title">
              <Hash size={16} weight="bold" color="var(--cyan)" />
              <span>Hashtags & Playlist</span>
            </span>

            <button
              type="button"
              className={`bento-copy-pill ${copiedBlock === "Hashtags" ? "is-copied" : ""}`}
              onClick={() => onCopyBlock(hashtagsText, "Hashtags")}
              title="Copy all hashtags"
            >
              {copiedBlock === "Hashtags" ? (
                <>
                  <Check size={12} weight="bold" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy size={12} weight="duotone" />
                  <span>Copy All</span>
                </>
              )}
            </button>
          </div>

          <div className="bento-card-body">
            <div className="bento-tags-cloud">
              {description.hashtags.map((tag) => {
                const isTagCopied = copiedBlock === tag;
                return (
                  <button
                    key={tag}
                    type="button"
                    className={`bento-tag-pill ${isTagCopied ? "is-copied" : ""}`}
                    onClick={() => onCopyBlock(tag, tag)}
                    title={`Click to copy "${tag}"`}
                  >
                    {isTagCopied ? (
                      <>
                        <Check size={11} weight="bold" />
                        <span>{tag}</span>
                      </>
                    ) : (
                      <span>{tag}</span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="bento-playlist-meta">
              <YoutubeLogo size={15} color="#ff0000" weight="fill" />
              <span>Suggested Playlist:</span>
              <strong style={{ color: "var(--ink)" }}>{description.suggested_playlist_category}</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
