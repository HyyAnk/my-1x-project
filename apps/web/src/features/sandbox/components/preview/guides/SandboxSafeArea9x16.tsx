import type React from "react";

interface ExcludedZoneProps {
  testId: string;
  style: React.CSSProperties;
  label: string;
  vertical?: boolean;
}

function PlatformExcludedZone({ testId, style, label, vertical = false }: ExcludedZoneProps) {
  return (
    <div
      data-testid={testId}
      style={{
        position: "absolute",
        background: "rgba(239, 68, 68, 0.18)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        ...style,
      }}
    >
      <span
        style={{
          fontSize: vertical ? "11px" : "12px",
          fontWeight: 700,
          color: "#FCA5A5",
          background: "rgba(0,0,0,0.65)",
          padding: vertical ? "3px 8px" : "3px 10px",
          borderRadius: "4px",
          writingMode: vertical ? "vertical-rl" : undefined,
          textOrientation: vertical ? "mixed" : undefined,
        }}
      >
        {label}
      </span>
    </div>
  );
}

export function SandboxSafeArea9x16() {
  return (
    <div
      data-testid="sandbox-guides-overlay-9-16"
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        zIndex: 9999,
      }}
    >
      <PlatformExcludedZone
        testId="safe-zone-platform-top"
        style={{ top: 0, left: 0, right: 0, height: "180px", borderBottom: "2px dashed rgba(239, 68, 68, 0.7)" }}
        label="Top Safe Zone (180px - Platform Header)"
      />

      <PlatformExcludedZone
        testId="safe-zone-platform-bottom"
        style={{ bottom: 0, left: 0, right: 0, height: "440px", borderTop: "2px dashed rgba(239, 68, 68, 0.7)" }}
        label="Bottom Safe Zone (440px - Captions & Audio)"
      />

      <PlatformExcludedZone
        testId="safe-zone-platform-right"
        style={{ top: "180px", bottom: "440px", right: 0, width: "140px", borderLeft: "2px dashed rgba(239, 68, 68, 0.7)" }}
        label="Action Rail (140px)"
        vertical
      />

      {/* Platform Active Content Safe Zone */}
      <div
        data-testid="safe-zone-platform-active"
        style={{
          position: "absolute",
          top: "180px",
          bottom: "440px",
          left: "36px",
          right: "140px",
          border: "3px solid #22C55E",
          borderRadius: "16px",
          boxShadow: "0 0 20px rgba(34, 197, 94, 0.35)",
        }}
      >
        <span
          style={{
            position: "absolute",
            top: "10px",
            left: "12px",
            fontSize: "13px",
            fontWeight: 800,
            color: "#22C55E",
            background: "rgba(0,0,0,0.7)",
            padding: "4px 10px",
            borderRadius: "6px",
          }}
        >
          Platform Safe Zone (Shorts / Reels / TikTok)
        </span>
      </div>
    </div>
  );
}
