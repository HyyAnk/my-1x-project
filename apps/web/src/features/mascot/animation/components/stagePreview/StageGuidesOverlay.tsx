import React from "react";

export interface StageGuidesOverlayProps {
  showGuides?: boolean;
  aspectRatio?: "16:9" | "9:16";
}

export function StageGuidesOverlay({ showGuides = false, aspectRatio = "16:9" }: StageGuidesOverlayProps) {
  if (!showGuides) return null;

  const isPortrait = aspectRatio === "9:16";

  return (
    <div
      className="quiz-stage-guides"
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        zIndex: 10,
      }}
    >
      {/* Center Crosshair H */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: 0,
          right: 0,
          height: "1px",
          borderTop: "1px dashed rgba(6, 182, 212, 0.4)",
        }}
      />
      {/* Center Crosshair V */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: 0,
          bottom: 0,
          width: "1px",
          borderLeft: "1px dashed rgba(6, 182, 212, 0.4)",
        }}
      />
      {/* Safe Margins */}
      <div
        style={{
          position: "absolute",
          inset: isPortrait ? "32px 20px" : "24px 32px",
          border: "1px dashed rgba(6, 182, 212, 0.3)",
          borderRadius: "8px",
        }}
      />
      {/* Ground Baseline */}
      <div
        style={{
          position: "absolute",
          bottom: "24px",
          left: 0,
          right: 0,
          borderBottom: "2px dashed rgba(244, 63, 94, 0.6)",
        }}
      />
    </div>
  );
}
