import { useState } from "react";
import { CaretDown, CaretUp, DeviceMobile, Television, YoutubeLogo } from "@phosphor-icons/react";
import type { VideoDescription } from "@studio/shared";

interface DescriptionYouTubePreviewProps {
  description: VideoDescription | null;
  fullText: string;
}

export function DescriptionYouTubePreview({ description, fullText }: DescriptionYouTubePreviewProps) {
  const [viewportMode, setViewportMode] = useState<"desktop" | "mobile">("desktop");
  const [isFolded, setIsFolded] = useState(false);

  const content = fullText || description?.full_description_text || "";

  const renderRichYouTubeContent = (text: string) => {
    // Split by hashtags or timestamp patterns (e.g., #quiz, 00:15, 01:30)
    const regex = /(#[a-zA-Z0-9_\u00C0-\u024F\u1E00-\u1EFF]+|\b\d{1,2}:\d{2}(?::\d{2})?\b)/g;
    const parts = text.split(regex);

    return parts.map((part, idx) => {
      if (part.startsWith("#")) {
        return (
          <span key={idx} className="youtube-hashtag-highlight">
            {part}
          </span>
        );
      }
      if (/^\d{1,2}:\d{2}(?::\d{2})?$/.test(part)) {
        return (
          <span key={idx} className="youtube-timestamp-highlight" title="YouTube Chapter Timestamp">
            {part}
          </span>
        );
      }
      return part;
    });
  };

  return (
    <div className="youtube-preview-card">
      <div className="youtube-preview-header">
        <div className="youtube-preview-badge">
          <YoutubeLogo size={22} weight="fill" color="#ff0000" />
          <span>YouTube Description Simulator</span>
        </div>

        <div className="youtube-preview-controls">
          <button
            type="button"
            className={`youtube-viewport-btn ${viewportMode === "desktop" ? "active" : ""}`}
            onClick={() => setViewportMode("desktop")}
            title="Desktop Video Description View"
          >
            <Television size={14} />
            <span>Desktop</span>
          </button>
          <button
            type="button"
            className={`youtube-viewport-btn ${viewportMode === "mobile" ? "active" : ""}`}
            onClick={() => setViewportMode("mobile")}
            title="Mobile / Shorts Description View"
          >
            <DeviceMobile size={14} />
            <span>Mobile</span>
          </button>
        </div>
      </div>

      <div className={`youtube-preview-content mode-${viewportMode} ${isFolded ? "is-folded" : ""}`}>
        {content ? (
          <>
            {renderRichYouTubeContent(content)}
            {isFolded && <div className="youtube-fold-fade" />}
          </>
        ) : (
          <span style={{ color: "var(--muted)" }}>No description content generated yet.</span>
        )}
      </div>

      {content && (
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "8px" }}>
          <button
            type="button"
            className="youtube-fold-toggle"
            onClick={() => setIsFolded((prev) => !prev)}
            title="Simulate YouTube ...more folding mechanism"
          >
            {isFolded ? (
              <>
                <span>...Show more (Expand View)</span>
                <CaretDown size={14} weight="bold" />
              </>
            ) : (
              <>
                <span>Show less (Fold View)</span>
                <CaretUp size={14} weight="bold" />
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
