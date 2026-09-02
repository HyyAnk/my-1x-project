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
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", gap: "12px", flexWrap: "wrap" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
        <Article size={20} weight="duotone" />
        <h2 style={{ margin: 0, fontSize: "15px" }}>Video Description & SEO</h2>
        <span
          className="info-tooltip-trigger"
          title="Automatically extracts primary keywords, quiz questions, score tiers, and hashtags optimized for YouTube SEO."
        >
          <Info size={15} />
        </span>

        {description?.topic_category && (
          <span className="badge-tag" style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "11px", padding: "2px 8px" }}>
            <Trophy size={12} /> {description.topic_category}
          </span>
        )}

        {description?.hashtags && description.hashtags.length > 0 && (
          <span className="badge-tag" style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "11px", padding: "2px 8px" }}>
            <Tag size={12} /> {description.hashtags.length} tags
          </span>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        {hasQuiz ? (
          <span
            className={`tab-badge ${isOverLimit ? "badge-warning" : "badge-neutral"}`}
            style={{
              padding: "3px 8px",
              borderRadius: "4px",
              fontSize: "11.5px",
              fontWeight: 600,
              backgroundColor: isOverLimit ? "rgba(239, 68, 68, 0.2)" : "rgba(255, 255, 255, 0.08)",
              color: isOverLimit ? "var(--red, #ef4444)" : "var(--text-muted, #94a3b8)",
            }}
          >
            {charCount} / {VIDEO_DESCRIPTION_MAX_CHARS} chars
          </span>
        ) : (
          <span
            className="tab-badge badge-neutral"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              padding: "3px 8px",
              borderRadius: "4px",
              fontSize: "11.5px",
              fontWeight: 500,
              backgroundColor: "rgba(255, 255, 255, 0.05)",
              color: "var(--text-muted, #64748b)",
            }}
          >
            <LockSimple size={12} /> Awaiting Questions
          </span>
        )}

        {description && (
          <button
            type="button"
            className="secondary-button compact"
            onClick={onCopy}
            title="Copy full description to clipboard"
            style={{ display: "inline-flex", alignItems: "center", gap: "5px", padding: "4px 10px", fontSize: "12px" }}
          >
            {copied ? <Check size={14} weight="bold" color="var(--green, #22c55e)" /> : <Copy size={14} />}
            <span>{copied ? "Copied!" : "Copy Description"}</span>
          </button>
        )}

        <button
          type="button"
          className="primary-button compact"
          disabled={!canGenerate}
          title={!hasQuiz ? "Generate quiz questions first before creating video description" : undefined}
          onClick={onGenerate}
          style={{ display: "inline-flex", alignItems: "center", gap: "5px", padding: "4px 10px", fontSize: "12px" }}
        >
          {generating ? <CircleNotch className="spin" size={14} /> : <Sparkle size={14} weight="fill" />}
          <span>{generating ? "Generating..." : description ? "Regenerate" : "Generate Description"}</span>
        </button>
      </div>
    </div>
  );
}
