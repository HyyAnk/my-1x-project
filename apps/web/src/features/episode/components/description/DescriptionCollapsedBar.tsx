import { Article, Check, CircleNotch, Copy, Info, LockSimple, Sparkle, Tag, Trophy } from "@phosphor-icons/react";
import { VIDEO_DESCRIPTION_MAX_CHARS, type VideoDescription } from "@studio/shared";

interface DescriptionCollapsedBarProps {
  description: VideoDescription | null;
  hasQuiz: boolean;
  canGenerate: boolean;
  generating: boolean;
  copied: boolean;
  charCount: number;
  isOverLimit: boolean;
  onCopy: () => void;
  onGenerate: () => void;
}

export function DescriptionCollapsedBar({
  description,
  hasQuiz,
  canGenerate,
  generating,
  copied,
  charCount,
  isOverLimit,
  onCopy,
  onGenerate,
}: DescriptionCollapsedBarProps) {
  const percentUsed = Math.min(100, Math.max(0, Math.round((charCount / VIDEO_DESCRIPTION_MAX_CHARS) * 100)));
  const meterStatusClass = isOverLimit
    ? "is-overflow"
    : charCount > 4200
      ? "is-warning"
      : "is-safe";

  return (
    <div className="video-description-header">
      <div className="video-description-title-group">
        <h2 className="video-description-title">
          <Article size={22} weight="duotone" color="var(--accent)" />
          <span>Video Description & SEO</span>
        </h2>

        <span className="video-description-badge">
          <Sparkle size={12} weight="fill" /> AI SEO Studio
        </span>

        <span
          className="info-tooltip-trigger"
          title="Extracts high-retention hook, chapter timestamps, scoring tiers, keywords, and hashtags optimized for YouTube SEO."
          style={{ display: "inline-flex", color: "var(--muted)", cursor: "help" }}
        >
          <Info size={15} />
        </span>

        {description?.topic_category && (
          <span className="video-description-badge badge-topic">
            <Trophy size={12} weight="bold" /> {description.topic_category}
          </span>
        )}

        {description?.hashtags && description.hashtags.length > 0 && (
          <span className="video-description-badge badge-tags">
            <Tag size={12} weight="bold" /> {description.hashtags.length} tags
          </span>
        )}
      </div>

      <div className="video-description-actions">
        {hasQuiz ? (
          <div
            className={`seo-char-meter ${meterStatusClass}`}
            title={`Character usage: ${charCount} / ${VIDEO_DESCRIPTION_MAX_CHARS} characters`}
          >
            <div className="seo-char-meter-bar-track">
              <div
                className="seo-char-meter-bar-fill"
                style={{ width: `${percentUsed}%` }}
              />
            </div>
            <span>
              {charCount.toLocaleString()} / {VIDEO_DESCRIPTION_MAX_CHARS.toLocaleString()} chars
            </span>
          </div>
        ) : (
          <div className="seo-char-meter" style={{ color: "var(--muted)", opacity: 0.8 }}>
            <LockSimple size={13} />
            <span>Awaiting Questions</span>
          </div>
        )}

        {description && (
          <button
            type="button"
            className={`btn-copy-hero ${copied ? "is-copied" : ""}`}
            onClick={onCopy}
            title="Copy full video description to clipboard"
          >
            {copied ? (
              <>
                <Check size={16} weight="bold" />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Copy size={16} weight="duotone" color="var(--accent)" />
                <span>Copy Description</span>
              </>
            )}
          </button>
        )}

        <button
          type="button"
          className="primary-button compact"
          disabled={!canGenerate}
          title={!hasQuiz ? "Generate quiz questions first before creating video description" : undefined}
          onClick={onGenerate}
          style={{ display: "inline-flex", alignItems: "center", gap: "6px", height: "34px", padding: "0 14px", borderRadius: "8px" }}
        >
          {generating ? <CircleNotch className="spin" size={15} /> : <Sparkle size={15} weight="fill" />}
          <span>{generating ? "Generating..." : description ? "Regenerate" : "Generate Description"}</span>
        </button>
      </div>
    </div>
  );
}
