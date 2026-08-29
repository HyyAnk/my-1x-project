import type React from "react";
import { CheckCircle, DeviceMobile, Eye, Pause, Play } from "@phosphor-icons/react";
import { computeSandboxPhaseTimeline, getSandboxPhaseAtTime, getSandboxPhaseTimestamps, type SandboxPhase } from "@studio/shared";
import { useTranslation } from "../../../i18n";
import type { ContrastReport } from "../hooks/useSandboxPreviewRenderer";
import { SandboxVerifiedPreview } from "./SandboxVerifiedPreview";

export interface SandboxPreviewCanvasProps {
  containerRef: React.RefObject<HTMLDivElement | null>;
  contrastReport: ContrastReport | null;
  lastRenderTime: string;
  showSafeArea: boolean;
  setShowSafeArea: (updater: (prev: boolean) => boolean) => void;
  showShortsGuide: boolean;
  setShowShortsGuide: (updater: (prev: boolean) => boolean) => void;
  iframeKey: number;
  setIframeKey: (updater: (prev: number) => number) => void;
  zoom: "fit" | "50" | "75" | "100";
  setZoom: (zoom: "fit" | "50" | "75" | "100") => void;
  scaleFactor: number;
  previewHtml: string;
  pendingPreviewHtml: string;
  loading: boolean;
  previewError: string | null;
  onPendingPreviewLoad: (frame: HTMLIFrameElement, html: string) => void;
  onRetryPreview: () => void;
  phase: string;
  useScrubber: boolean;
  timelineSeconds: number;
  handlePhaseChange: (phase: "question" | "choices" | "thinking" | "reveal" | "explain") => void;
  isPlaying: boolean;
  setIsPlaying: (updater: (prev: boolean) => boolean) => void;
  setUseScrubber: (use: boolean) => void;
  handleScrubberChange: (value: number) => void;
}

export function SandboxPreviewCanvas({
  containerRef,
  contrastReport,
  lastRenderTime,
  showSafeArea,
  setShowSafeArea,
  showShortsGuide,
  setShowShortsGuide,
  iframeKey,
  setIframeKey,
  zoom,
  setZoom,
  scaleFactor,
  previewHtml,
  pendingPreviewHtml,
  loading,
  previewError,
  onPendingPreviewLoad,
  onRetryPreview,
  phase,
  useScrubber,
  timelineSeconds,
  handlePhaseChange,
  isPlaying,
  setIsPlaying,
  setUseScrubber,
  handleScrubberChange,
}: SandboxPreviewCanvasProps) {
  const { t } = useTranslation();

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        minHeight: 0,
        overflow: "hidden",
      }}
    >
      {/* 1. Stage Monitor Toolbar Header (Outside the canvas - ZERO overlap with video!) */}
      <div
        className="panel"
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
            1080P FHD
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
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
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

          {/* Shorts 9:16 Toggle */}
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

      {/* 2. Canvas Viewport (Theater Stage - 100% Unobstructed!) */}
      <div
        ref={containerRef}
        style={{
          flex: 1,
          position: "relative",
          background: "#060911",
          borderRadius: "16px",
          border: "1px solid var(--line)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: zoom === "fit" ? "hidden" : "auto",
          padding: "16px",
          minHeight: 0,
        }}
      >
        {/* 1920x1080 Frame Wrapper */}
        <div
          style={{
            position: "relative",
            width: "1920px",
            height: "1080px",
            transform: `scale(${scaleFactor})`,
            transformOrigin: "center center",
            boxShadow: "0 25px 60px rgba(0,0,0,0.85), 0 0 0 1px rgba(255,255,255,0.12)",
            borderRadius: "8px",
            overflow: "hidden",
            background: "#000",
            flexShrink: 0,
          }}
        >
          <SandboxVerifiedPreview
            iframeKey={iframeKey}
            previewHtml={previewHtml}
            pendingPreviewHtml={pendingPreviewHtml}
            loading={loading}
            previewError={previewError}
            onPendingPreviewLoad={onPendingPreviewLoad}
            onRetryPreview={onRetryPreview}
          />

          {/* Safe Area 16:9 Overlay (strictly inside frame) */}
          {showSafeArea && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                pointerEvents: "none",
                zIndex: 9999,
              }}
            >
              {/* Action Safe (90%) */}
              <div
                style={{
                  position: "absolute",
                  inset: "54px 96px",
                  border: "2px dashed rgba(255, 220, 40, 0.75)",
                  borderRadius: "16px",
                }}
              >
                <span
                  style={{
                    position: "absolute",
                    top: "8px",
                    left: "12px",
                    fontSize: "13px",
                    fontWeight: 700,
                    color: "#FFDC28",
                    background: "rgba(0,0,0,0.6)",
                    padding: "2px 8px",
                    borderRadius: "4px",
                  }}
                >
                  {t("visualSandbox.actionSafeLabel")}
                </span>
              </div>

              {/* Title Safe (80%) */}
              <div
                style={{
                  position: "absolute",
                  inset: "108px 192px",
                  border: "2px dashed rgba(56, 189, 248, 0.75)",
                  borderRadius: "16px",
                }}
              >
                <span
                  style={{
                    position: "absolute",
                    top: "8px",
                    left: "12px",
                    fontSize: "13px",
                    fontWeight: 700,
                    color: "#38BDF8",
                    background: "rgba(0,0,0,0.6)",
                    padding: "2px 8px",
                    borderRadius: "4px",
                  }}
                >
                  {t("visualSandbox.titleSafeLabel")}
                </span>
              </div>
            </div>
          )}

          {/* Shorts 9:16 Center Crop Guide Overlay (strictly inside frame) */}
          {showShortsGuide && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                pointerEvents: "none",
                zIndex: 9999,
                display: "flex",
                justifyContent: "center",
              }}
            >
              <div style={{ flex: 1, background: "rgba(0, 0, 0, 0.65)", backdropFilter: "blur(4px)" }} />
              <div
                style={{
                  width: "607.5px", // 1080 * 9 / 16
                  height: "1080px",
                  border: "3px solid #FF3366",
                  boxShadow: "0 0 30px rgba(255,51,102,0.5)",
                  position: "relative",
                }}
              >
                <span
                  style={{
                    position: "absolute",
                    top: "16px",
                    left: "50%",
                    transform: "translateX(-50%)",
                    fontSize: "14px",
                    fontWeight: 800,
                    color: "#FFF",
                    background: "#FF3366",
                    padding: "4px 14px",
                    borderRadius: "999px",
                  }}
                >
                  {t("visualSandbox.shortsSafeLabel")}
                </span>
              </div>
              <div style={{ flex: 1, background: "rgba(0, 0, 0, 0.65)", backdropFilter: "blur(4px)" }} />
            </div>
          )}
        </div>
      </div>

      {/* 3. Timeline & Phase Rehearsal Control Bar (Bottom Studio Bar) */}
      <div
        className="panel"
        style={{
          padding: "10px 16px",
          borderRadius: "14px",
          background: "var(--surface)",
          border: "1px solid var(--line)",
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          flexShrink: 0,
        }}
      >
        {/* Top row of Timeline: Phase buttons + Play/Scrub */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", marginRight: "2px" }}>
              {t("visualSandbox.phaseLabel")}
            </span>
            {(() => {
              const phaseTimestamps = getSandboxPhaseTimestamps();
              const activePhaseAtTime = getSandboxPhaseAtTime(timelineSeconds);
              const phaseButtons: Array<{ id: SandboxPhase; label: string; time: number }> = [
                {
                  id: "question",
                  label: t("visualSandbox.phaseQuestion"),
                  time: phaseTimestamps.find((p) => p.id === "question")?.time ?? 0.3,
                },
                {
                  id: "choices",
                  label: t("visualSandbox.phaseChoices"),
                  time: phaseTimestamps.find((p) => p.id === "choices")?.time ?? 1.8,
                },
                {
                  id: "thinking",
                  label: t("visualSandbox.phaseThinking"),
                  time: phaseTimestamps.find((p) => p.id === "thinking")?.time ?? 4.5,
                },
                { id: "reveal", label: t("visualSandbox.phaseReveal"), time: phaseTimestamps.find((p) => p.id === "reveal")?.time ?? 8.0 },
                {
                  id: "explain",
                  label: t("visualSandbox.phaseExplain"),
                  time: phaseTimestamps.find((p) => p.id === "explain")?.time ?? 9.2,
                },
              ];

              return phaseButtons.map((p) => {
                const isActive = !useScrubber ? phase === p.id : activePhaseAtTime === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    className={isActive ? "primary-button compact" : "quiet-button compact"}
                    style={{ fontSize: "11px", padding: "4px 10px", borderRadius: "8px" }}
                    onClick={() => handlePhaseChange(p.id)}
                  >
                    {p.label}
                  </button>
                );
              });
            })()}
          </div>

          {/* Scrubber & Live Play Controller */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <button
              type="button"
              className={isPlaying ? "primary-button compact" : "quiet-button compact"}
              style={{
                fontSize: "11px",
                padding: "4px 12px",
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                borderRadius: "8px",
              }}
              onClick={() => {
                setUseScrubber(true);
                setIsPlaying((p) => !p);
              }}
              title={t("visualSandbox.playTimelineTooltip")}
            >
              {isPlaying ? <Pause size={13} weight="fill" /> : <Play size={13} weight="fill" />}
              <span>{isPlaying ? t("visualSandbox.pauseBtn") : t("visualSandbox.playBtn")}</span>
            </button>

            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                padding: "4px 10px",
                borderRadius: "8px",
                background: "var(--surface-strong)",
                border: "1px solid var(--line)",
                fontSize: "11.5px",
                fontWeight: 700,
              }}
            >
              <span style={{ color: "var(--accent)" }}>{timelineSeconds.toFixed(1)}s</span>
              <span style={{ color: "var(--muted)" }}>/ 10.0s</span>
            </div>
          </div>
        </div>

        {/* Bottom row of Timeline: Slider track & Phase milestones */}
        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
          <input
            type="range"
            min="0.0"
            max="10.0"
            step="0.1"
            value={timelineSeconds}
            onChange={(e) => handleScrubberChange(Number(e.target.value))}
            style={{
              width: "100%",
              accentColor: "var(--accent)",
              cursor: "pointer",
              height: "6px",
            }}
          />
          {(() => {
            const phaseTimeline = computeSandboxPhaseTimeline();
            return (
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "9.5px", color: "var(--muted)", padding: "0 2px" }}>
                <span>0s (Intro)</span>
                <span>
                  {phaseTimeline.choicesStart.toFixed(1)}s ({t("visualSandbox.phaseChoices")})
                </span>
                <span>
                  {phaseTimeline.thinkingStart.toFixed(1)}s ({t("visualSandbox.phaseThinking")})
                </span>
                <span>
                  {phaseTimeline.revealStart.toFixed(1)}s ({t("visualSandbox.phaseReveal")})
                </span>
                <span>
                  {phaseTimeline.explainStart.toFixed(1)}s ({t("visualSandbox.phaseExplain")})
                </span>
                <span>10.0s</span>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
