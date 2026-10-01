import { useState } from "react";
import { Info } from "@phosphor-icons/react";
import type { MascotPublishedAnimationAsset } from "@studio/shared";

export interface FramerateBadgeProps {
  animation?: MascotPublishedAnimationAsset | null;
}

function getSyncLabel(fps: number): string {
  if (fps >= 60) return "1:1 Sync";
  if (fps === 30) return "1:2 Sync";
  if (fps === 24) return "Native";
  return `${Math.round(1000 / fps)}ms/f`;
}

export function FramerateBadge({ animation }: FramerateBadgeProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const fps = animation?.fps ?? (animation?.transparent_video_url ? 24 : 12);
  const syncLabel = getSyncLabel(fps);

  return (
    <div
      style={{
        position: "absolute",
        top: "12px",
        right: "12px",
        background: "rgba(15, 23, 42, 0.8)",
        backdropFilter: "blur(6px)",
        padding: "4px 10px",
        borderRadius: "6px",
        fontSize: "11px",
        fontWeight: 700,
        color: "var(--accent, #38bdf8)",
        fontFamily: "monospace",
        border: "1px solid rgba(255,255,255,0.1)",
        display: "flex",
        alignItems: "center",
        gap: "6px",
      }}
      aria-label={`Framerate: ${fps} FPS (${syncLabel})`}
    >
      <span>
        {animation?.transparent_video_url ? "WebM Alpha • " : ""}
        {fps} FPS ({syncLabel})
      </span>
      <button
        type="button"
        style={{
          background: "transparent",
          border: "none",
          padding: 0,
          margin: 0,
          display: "inline-flex",
          alignItems: "center",
          color: "rgba(255, 255, 255, 0.7)",
          cursor: "pointer",
        }}
        onClick={() => setShowTooltip((prev) => !prev)}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        aria-label="Framerate synchronization details"
        title="Quiz video renders at 60 FPS. 30 and 60 FPS provide integer frame synchronization. 24 FPS is natively preserved."
      >
        <Info size={13} weight="bold" />
      </button>
      {showTooltip ? (
        <div
          role="tooltip"
          style={{
            position: "absolute",
            top: "100%",
            right: 0,
            marginTop: "6px",
            background: "#0f172a",
            color: "#f8fafc",
            padding: "6px 10px",
            borderRadius: "6px",
            fontSize: "11px",
            fontWeight: 400,
            fontFamily: "sans-serif",
            whiteSpace: "normal",
            width: "220px",
            border: "1px solid rgba(255,255,255,0.15)",
            boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
            zIndex: 10,
            pointerEvents: "none",
          }}
        >
          Quiz timeline renders at 60 FPS. 30 or 60 FPS achieves integer frame synchronization. 24 FPS is natively preserved.
        </div>
      ) : null}
    </div>
  );
}
