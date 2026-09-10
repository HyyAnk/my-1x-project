import { Play, Star, Trash } from "@phosphor-icons/react";
import type { IntroOutroStyle } from "@studio/shared";
import { api } from "../../../../api";
import type { IntroOutroPreviewClip } from "./IntroOutroPreviewModal";

export interface IntroOutroStyleCardProps {
  style: IntroOutroStyle;
  channelId: string;
  isDefault: boolean;
  isDeleting: boolean;
  isSettingDefault: boolean;
  onPreviewClip: (clip: IntroOutroPreviewClip) => void;
  onSetDefault: (styleId: string | null) => void;
  onDelete: (styleId: string, name: string) => void;
}

export function IntroOutroStyleCard({
  style,
  channelId,
  isDefault,
  isDeleting,
  isSettingDefault,
  onPreviewClip,
  onSetDefault,
  onDelete,
}: IntroOutroStyleCardProps) {
  return (
    <div
      className="style-card"
      style={{
        border: isDefault ? "2px solid var(--accent)" : "1px solid var(--line)",
        borderRadius: "var(--radius)",
        overflow: "hidden",
        background: "var(--surface-strong)",
        display: "flex",
        flexDirection: "column",
        boxShadow: isDefault ? "0 0 16px var(--accent-glow)" : "var(--shadow-sm)",
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
          {isDefault && (
            <span
              style={{
                background: "var(--soft-accent)",
                color: "var(--accent)",
                border: "1px solid var(--accent)",
                fontSize: 11,
                fontWeight: 700,
                padding: "2px 8px",
                borderRadius: 999,
              }}
            >
              Default
            </span>
          )}
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
          <button
            type="button"
            className="quiet-button"
            style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 5, padding: "4px 8px" }}
            onClick={() => onSetDefault(isDefault ? null : style.style_id)}
            disabled={isSettingDefault}
          >
            <Star size={14} weight={isDefault ? "fill" : "regular"} color={isDefault ? "#ffd43b" : "inherit"} />
            <span>{isDefault ? "Unset Default" : "Set as Default"}</span>
          </button>

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
