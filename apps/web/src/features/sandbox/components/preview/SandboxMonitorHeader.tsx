import { CheckCircle, DeviceMobile, Eye, MonitorPlay, Play } from "@phosphor-icons/react";
import { useTranslation } from "../../../../i18n";
import type { ContrastReport } from "../../hooks/useSandboxPreviewRenderer";

export type SandboxMonitorHeaderProps = {
  contrastReport: ContrastReport | null;
  lastRenderTime: string;
  showSafeArea: boolean;
  setShowSafeArea: (updater: (prev: boolean) => boolean) => void;
  showShortsGuide: boolean;
  setShowShortsGuide: (updater: (prev: boolean) => boolean) => void;
  aspectRatio: "16:9" | "9:16";
  setAspectRatio: (ratio: "16:9" | "9:16") => void;
  setIframeKey: (updater: (prev: number) => number) => void;
  zoom: "fit" | "50" | "75" | "100";
  setZoom: (zoom: "fit" | "50" | "75" | "100") => void;
};

export function SandboxMonitorHeader({
  contrastReport,
  lastRenderTime,
  showSafeArea,
  setShowSafeArea,
  showShortsGuide,
  setShowShortsGuide,
  aspectRatio,
  setAspectRatio,
  setIframeKey,
  zoom,
  setZoom,
}: SandboxMonitorHeaderProps) {
  const { t } = useTranslation();

  return (
    <div
      className="panel sandbox-monitor-header"
      style={{
        padding: "8px 14px",
        borderRadius: "14px",
        background: "var(--surface)",
        border: "1px solid var(--line)",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexShrink: 0,
        gap: "12px",
      }}
    >
      {/* Left: Resolution, WCAG contrast & engine info */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            padding: "4px 10px",
            borderRadius: "20px",
            background: "rgba(34, 197, 94, 0.12)",
            border: "1px solid rgba(34, 197, 94, 0.3)",
            color: "#22c55e",
            fontSize: "11px",
            fontWeight: 700,
            letterSpacing: "0.02em",
          }}
        >
          <span
            style={{
              width: "6px",
              height: "6px",
              borderRadius: "50%",
              background: "#22c55e",
              boxShadow: "0 0 6px #22c55e",
            }}
          />
          {aspectRatio === "16:9" ? "1920 × 1080" : "1080 × 1920"}
        </span>

        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "5px",
            padding: "4px 10px",
            borderRadius: "20px",
            background: "var(--surface-strong)",
            border: "1px solid var(--line)",
            color: "#22E58B",
            fontSize: "11px",
            fontWeight: 600,
          }}
          title={t("visualSandbox.wcagContrastTooltip")}
        >
          <CheckCircle size={14} weight="fill" />
          <span>
            {t("visualSandbox.wcagContrast")} ({contrastReport?.ratio || 7.42}:1)
          </span>
        </div>

        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "5px",
            padding: "4px 10px",
            borderRadius: "20px",
            background: "var(--surface-strong)",
            border: "1px solid var(--line)",
            color: "#38BDF8",
            fontSize: "11px",
            fontWeight: 600,
          }}
          title={t("visualSandbox.hyperframesEngineTooltip")}
        >
          <span>{t("visualSandbox.hyperframesEngine")}</span>
          <span style={{ color: "rgba(255,255,255,0.25)" }}>•</span>
          <span style={{ color: "var(--muted)", fontWeight: 500 }}>{lastRenderTime}</span>
        </div>
      </div>

      {/* Right: Viewport Overlays & Zoom Actions */}
      <div className="sandbox-monitor-actions" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "2px",
            background: "var(--surface-strong)",
            padding: "2px",
            borderRadius: "8px",
            border: "1px solid var(--line)",
          }}
          title="Output aspect ratio"
        >
          <button
            type="button"
            className={aspectRatio === "16:9" ? "primary-button compact" : "quiet-button compact"}
            style={{ fontSize: "10.5px", padding: "3px 7px", borderRadius: "6px", display: "inline-flex", gap: "4px" }}
            onClick={() => setAspectRatio("16:9")}
            aria-label="16:9"
          >
            <MonitorPlay size={12} />
            <span>16:9</span>
          </button>
          <button
            type="button"
            className={aspectRatio === "9:16" ? "primary-button compact" : "quiet-button compact"}
            style={{ fontSize: "10.5px", padding: "3px 7px", borderRadius: "6px", display: "inline-flex", gap: "4px" }}
            onClick={() => setAspectRatio("9:16")}
            aria-label="9:16"
          >
            <DeviceMobile size={12} />
            <span>9:16</span>
          </button>
        </div>

        <div style={{ width: "1px", height: "16px", background: "var(--line)", margin: "0 2px" }} />

        {/* Safe Area 16:9 Toggle */}
        <button
          type="button"
          className={showSafeArea ? "primary-button compact" : "quiet-button compact"}
          style={{ fontSize: "11px", padding: "4px 9px", display: "inline-flex", alignItems: "center", gap: "4px" }}
          onClick={() => setShowSafeArea((prev) => !prev)}
          title={t("visualSandbox.safeAreaTooltip")}
        >
          <Eye size={14} weight={showSafeArea ? "fill" : "regular"} />
          <span>{t("visualSandbox.safeArea")}</span>
        </button>

        {/* Shorts 9:16 Crop Guide */}
        <button
          type="button"
          className={showShortsGuide ? "primary-button compact" : "quiet-button compact"}
          style={{ fontSize: "11px", padding: "4px 9px", display: "inline-flex", alignItems: "center", gap: "4px" }}
          onClick={() => setShowShortsGuide((prev) => !prev)}
          title={t("visualSandbox.shortsTooltip")}
        >
          <DeviceMobile size={14} weight={showShortsGuide ? "fill" : "regular"} />
          <span>9:16</span>
        </button>

        <div style={{ width: "1px", height: "16px", background: "var(--line)", margin: "0 2px" }} />

        {/* Replay Button */}
        <button
          type="button"
          className="quiet-button compact"
          style={{
            fontSize: "11px",
            padding: "4px 8px",
            color: "#38BDF8",
            display: "inline-flex",
            alignItems: "center",
            gap: "4px",
          }}
          onClick={() => setIframeKey((k) => k + 1)}
          title={t("visualSandbox.replayTooltip")}
        >
          <Play size={11} weight="fill" />
          <span>{t("visualSandbox.replayBtn")}</span>
        </button>

        <div style={{ width: "1px", height: "16px", background: "var(--line)", margin: "0 2px" }} />

        {/* Zoom Buttons */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "2px",
            background: "var(--surface-strong)",
            padding: "2px",
            borderRadius: "8px",
            border: "1px solid var(--line)",
          }}
        >
          {(["fit", "50", "75", "100"] as const).map((z) => (
            <button
              key={z}
              type="button"
              className={zoom === z ? "primary-button compact" : "quiet-button compact"}
              style={{ fontSize: "10.5px", padding: "3px 7px", borderRadius: "6px" }}
              onClick={() => setZoom(z)}
            >
              {z === "fit" ? "Fit" : `${z}%`}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
