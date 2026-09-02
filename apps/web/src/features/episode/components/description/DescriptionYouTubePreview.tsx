import { YoutubeLogo } from "@phosphor-icons/react";
import type { VideoDescription } from "@studio/shared";

interface DescriptionYouTubePreviewProps {
  description: VideoDescription | null;
  fullText: string;
}

export function DescriptionYouTubePreview({ description, fullText }: DescriptionYouTubePreviewProps) {
  const content = fullText || description?.full_description_text || "";

  const renderHashtagsFormatted = (text: string) => {
    const parts = text.split(/(#[a-zA-Z0-9_\u00C0-\u024F\u1E00-\u1EFF]+)/g);
    return parts.map((part, idx) => {
      if (part.startsWith("#")) {
        return (
          <span key={idx} style={{ color: "var(--accent-light, #38bdf8)", fontWeight: 500 }}>
            {part}
          </span>
        );
      }
      return part;
    });
  };

  return (
    <div
      style={{
        background: "rgba(15, 23, 42, 0.6)",
        borderRadius: "10px",
        padding: "16px",
        border: "1px solid rgba(255, 255, 255, 0.1)",
        boxShadow: "inset 0 1px 2px rgba(0, 0, 0, 0.3)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "12px", color: "var(--text-muted, #94a3b8)", fontSize: "12px" }}>
        <YoutubeLogo size={18} color="#ef4444" weight="fill" />
        <span style={{ fontWeight: 600, color: "var(--text, #f8fafc)" }}>YouTube Description Preview</span>
        <span>• (Full View)</span>
      </div>

      <div
        style={{
          background: "rgba(0, 0, 0, 0.4)",
          borderRadius: "8px",
          padding: "14px 16px",
          fontSize: "13.5px",
          lineHeight: "1.65",
          color: "var(--text, #f1f5f9)",
          fontFamily: "system-ui, -apple-system, sans-serif",
          whiteSpace: "pre-wrap",
          maxHeight: "450px",
          overflowY: "auto",
        }}
      >
        {content ? (
          renderHashtagsFormatted(content)
        ) : (
          <span style={{ color: "var(--text-muted, #64748b)" }}>No description content generated yet</span>
        )}
      </div>
    </div>
  );
}
