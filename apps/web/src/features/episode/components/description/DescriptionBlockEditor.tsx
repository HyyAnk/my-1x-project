import { Check, Copy, Hash, Sparkle, Trophy } from "@phosphor-icons/react";
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

  const scoringText = `🏆 SCORING TIERS:\n• ${description.scoring_cta.beginner}\n• ${description.scoring_cta.intermediate}\n• ${description.scoring_cta.expert}\n${description.scoring_cta.cta_text}`;
  const hashtagsText = description.hashtags.join(" ");

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "12px" }}>
      {/* Block 1: Hook & Context */}
      <div
        style={{
          background: "rgba(0, 0, 0, 0.3)",
          borderRadius: "8px",
          padding: "14px",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
        }}
      >
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: "5px", fontWeight: 600, fontSize: "12.5px" }}>
              <Sparkle size={14} color="var(--accent-light, #a5b4fc)" /> Hook & SEO Context
            </span>
            <button
              type="button"
              className="quiet-button compact"
              onClick={() => onCopyBlock(`${description.hook_lines}\n\n${description.semantic_paragraph}`, "Hook")}
              style={{ fontSize: "11px", padding: "2px 6px" }}
            >
              {copiedBlock === "Hook" ? <Check size={13} color="var(--green, #22c55e)" /> : <Copy size={13} />}
              <span>{copiedBlock === "Hook" ? "Copied" : "Copy"}</span>
            </button>
          </div>
          <p style={{ margin: "0 0 6px", fontSize: "13px", fontWeight: 600, color: "var(--text, #f8fafc)", whiteSpace: "pre-wrap" }}>
            {description.hook_lines}
          </p>
          <p style={{ margin: 0, fontSize: "12.5px", color: "var(--text-muted, #94a3b8)", lineHeight: "1.5" }}>
            {description.semantic_paragraph}
          </p>
        </div>
      </div>

      {/* Block 2: Scoring Tiers */}
      <div
        style={{
          background: "rgba(0, 0, 0, 0.3)",
          borderRadius: "8px",
          padding: "14px",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
        }}
      >
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: "5px", fontWeight: 600, fontSize: "12.5px" }}>
              <Trophy size={14} color="var(--yellow, #eab308)" /> Scoring Leaderboard
            </span>
            <button
              type="button"
              className="quiet-button compact"
              onClick={() => onCopyBlock(scoringText, "Scoring")}
              style={{ fontSize: "11px", padding: "2px 6px" }}
            >
              {copiedBlock === "Scoring" ? <Check size={13} color="var(--green, #22c55e)" /> : <Copy size={13} />}
              <span>{copiedBlock === "Scoring" ? "Copied" : "Copy"}</span>
            </button>
          </div>
          <ul style={{ margin: "0 0 8px", paddingLeft: "16px", fontSize: "12.5px", color: "var(--text, #f1f5f9)", lineHeight: "1.6" }}>
            <li>{description.scoring_cta.beginner}</li>
            <li>{description.scoring_cta.intermediate}</li>
            <li>{description.scoring_cta.expert}</li>
          </ul>
          <small style={{ color: "var(--accent-light, #a5b4fc)", fontSize: "11.5px" }}>{description.scoring_cta.cta_text}</small>
        </div>
      </div>

      {/* Block 3: Hashtags & Playlist */}
      <div
        style={{
          background: "rgba(0, 0, 0, 0.3)",
          borderRadius: "8px",
          padding: "14px",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
        }}
      >
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: "5px", fontWeight: 600, fontSize: "12.5px" }}>
              <Hash size={14} color="var(--cyan, #06b6d4)" /> Hashtags & Playlist
            </span>
            <button
              type="button"
              className="quiet-button compact"
              onClick={() => onCopyBlock(hashtagsText, "Hashtags")}
              style={{ fontSize: "11px", padding: "2px 6px" }}
            >
              {copiedBlock === "Hashtags" ? <Check size={13} color="var(--green, #22c55e)" /> : <Copy size={13} />}
              <span>{copiedBlock === "Hashtags" ? "Copied" : "Copy"}</span>
            </button>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "10px" }}>
            {description.hashtags.map((tag) => (
              <span
                key={tag}
                style={{
                  fontSize: "12px",
                  padding: "2px 8px",
                  borderRadius: "4px",
                  backgroundColor: "rgba(6, 182, 212, 0.15)",
                  color: "var(--cyan, #38bdf8)",
                }}
              >
                {tag}
              </span>
            ))}
          </div>
          <div style={{ fontSize: "12px", color: "var(--text-muted, #94a3b8)" }}>
            📺 Suggested Playlist: <strong style={{ color: "var(--text, #f8fafc)" }}>{description.suggested_playlist_category}</strong>
          </div>
        </div>
      </div>
    </div>
  );
}
