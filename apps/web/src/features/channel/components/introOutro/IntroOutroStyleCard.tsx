import { Play, Trash } from "@phosphor-icons/react";
import type { IntroOutroStyle } from "@studio/shared";
import { api } from "../../../../api";
import type { IntroOutroPreviewClip } from "./IntroOutroPreviewModal";
import { IntroOutroCategoryAssignment } from "./IntroOutroCategoryAssignment";

export interface IntroOutroStyleCardProps {
  style: IntroOutroStyle;
  channelId: string;
  isDeleting: boolean;
  isAssigning?: boolean;
  onPreviewClip: (clip: IntroOutroPreviewClip) => void;
  onDelete: (styleId: string, name: string) => void;
  onAssignCategory?: (styleId: string, stylePresetId: string) => void;
}

export function IntroOutroStyleCard({
  style,
  channelId,
  isDeleting,
  isAssigning = false,
  onPreviewClip,
  onDelete,
  onAssignCategory,
}: IntroOutroStyleCardProps) {
  return (
    <div
      className="style-card"
      style={{
        border: "1px solid var(--line)",
        borderRadius: "var(--radius)",
        overflow: "hidden",
        background: "var(--surface-strong)",
        display: "flex",
        flexDirection: "column",
        boxShadow: "var(--shadow-sm)",
        transition: "all 0.2s ease",
      }}
    >
      {/* Thumbnails preview strip */}
      <div style={{ display: "flex", height: 124, background: "#000", position: "relative" }}>
        {/* Intro half */}
        <div
          style={{
            flex: 1,
            position: "relative",
            borderRight: "1px solid var(--line)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            backgroundImage: style.intro.thumbnail_filename
              ? `url(${api.getIntroOutroThumbUrl(channelId, style.style_id, "intro")})`
              : undefined,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
          onClick={() =>
            onPreviewClip({
              styleId: style.style_id,
              kind: "intro",
              title: `${style.name} · Intro Clip`,
            })
          }
          role="button"
          tabIndex={0}
          aria-label={`Preview intro for ${style.name}`}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onPreviewClip({
                styleId: style.style_id,
                kind: "intro",
                title: `${style.name} · Intro Clip`,
              });
            }
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(0, 0, 0, 0.38)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "background 0.15s ease",
            }}
          >
            <Play size={24} weight="fill" color="#ffffff" />
          </div>
          <span
            style={{
              position: "absolute",
              bottom: 6,
              left: 6,
              background: "rgba(0, 0, 0, 0.75)",
              fontSize: 11,
              fontWeight: 600,
              padding: "2px 6px",
              borderRadius: 4,
              color: "#ffffff",
            }}
          >
            Intro {style.intro.duration_seconds.toFixed(1)}s
          </span>
        </div>

        {/* Outro half */}
        <div
          style={{
            flex: 1,
            position: "relative",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            backgroundImage: style.outro.thumbnail_filename
              ? `url(${api.getIntroOutroThumbUrl(channelId, style.style_id, "outro")})`
              : undefined,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
          onClick={() =>
            onPreviewClip({
              styleId: style.style_id,
              kind: "outro",
              title: `${style.name} · Outro Clip`,
            })
          }
          role="button"
          tabIndex={0}
          aria-label={`Preview outro for ${style.name}`}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onPreviewClip({
                styleId: style.style_id,
                kind: "outro",
                title: `${style.name} · Outro Clip`,
              });
            }
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(0, 0, 0, 0.38)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "background 0.15s ease",
            }}
          >
            <Play size={24} weight="fill" color="#ffffff" />
          </div>
          <span
            style={{
              position: "absolute",
              bottom: 6,
              left: 6,
              background: "rgba(0, 0, 0, 0.75)",
              fontSize: 11,
              fontWeight: 600,
              padding: "2px 6px",
              borderRadius: 4,
              color: "#ffffff",
            }}
          >
            Outro {style.outro.duration_seconds.toFixed(1)}s
          </span>
        </div>
      </div>

      {/* Card Info */}
      <div style={{ padding: "14px 16px", flex: 1, display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: "var(--ink)" }}>{style.name}</h3>
        </div>

        <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
          <span
            style={{
              fontSize: 11,
              background: "var(--surface-hover)",
              padding: "2px 8px",
              borderRadius: 4,
              color: "var(--ink-secondary)",
              border: "1px solid var(--line)",
            }}
          >
            Transition: {style.transition_type}
          </span>
          <span
            style={{
              fontSize: 11,
              background: "var(--surface-hover)",
              padding: "2px 8px",
              borderRadius: 4,
              color: "var(--ink-secondary)",
              border: "1px solid var(--line)",
            }}
          >
            {style.intro.has_audio ? "🔊 Audio" : "🔇 No Audio"}
          </span>
        </div>

        {/* Card Actions */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: "auto",
            paddingTop: 14,
            borderTop: "1px solid var(--line)",
          }}
        >
          {onAssignCategory ? (
            <IntroOutroCategoryAssignment
              styleName={style.name}
              disabled={isAssigning}
              onAssign={(stylePresetId) => onAssignCategory(style.style_id, stylePresetId)}
            />
          ) : (
            <span />
          )}

          <button
            type="button"
            className="icon-button danger"
            title="Delete Style"
            onClick={() => {
              if (confirm(`Delete style "${style.name}"?`)) {
                onDelete(style.style_id, style.name);
              }
            }}
            disabled={isDeleting}
            aria-label={`Delete style ${style.name}`}
          >
            <Trash size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
