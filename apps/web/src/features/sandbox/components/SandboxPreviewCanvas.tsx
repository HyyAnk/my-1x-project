import type React from "react";
import type { ContrastReport } from "../hooks/useSandboxPreviewRenderer";
import { SandboxVerifiedPreview } from "./SandboxVerifiedPreview";
import { SandboxMonitorHeader } from "./preview/SandboxMonitorHeader";
import { SandboxGuidesOverlay } from "./preview/SandboxGuidesOverlay";
import { SandboxTimelineControls } from "./preview/SandboxTimelineControls";

export interface SandboxPreviewCanvasProps {
  containerRef: React.RefObject<HTMLDivElement | null>;
  contrastReport: ContrastReport | null;
  lastRenderTime: string;
  showSafeArea: boolean;
  setShowSafeArea: (updater: (prev: boolean) => boolean) => void;
  showShortsGuide: boolean;
  setShowShortsGuide: (updater: (prev: boolean) => boolean) => void;
  aspectRatio: "16:9" | "9:16";
  setAspectRatio: (ratio: "16:9" | "9:16") => void;
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
  aspectRatio,
  setAspectRatio,
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
  return (
    <div
      className="sandbox-preview-canvas"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        minHeight: 0,
        overflow: "hidden",
      }}
    >
      {/* 1. Stage Monitor Toolbar Header */}
      <SandboxMonitorHeader
        contrastReport={contrastReport}
        lastRenderTime={lastRenderTime}
        showSafeArea={showSafeArea}
        setShowSafeArea={setShowSafeArea}
        showShortsGuide={showShortsGuide}
        setShowShortsGuide={setShowShortsGuide}
        aspectRatio={aspectRatio}
        setAspectRatio={setAspectRatio}
        setIframeKey={setIframeKey}
        zoom={zoom}
        setZoom={setZoom}
      />

      {/* 2. Canvas Viewport (Theater Stage) */}
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
        {/* Canonical output frame wrapper */}
        <div
          style={{
            position: "relative",
            width: `${aspectRatio === "16:9" ? 1920 : 1080}px`,
            height: `${aspectRatio === "16:9" ? 1080 : 1920}px`,
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
            width={aspectRatio === "16:9" ? 1920 : 1080}
            height={aspectRatio === "16:9" ? 1080 : 1920}
          />

          <SandboxGuidesOverlay showSafeArea={showSafeArea} showShortsGuide={showShortsGuide} aspectRatio={aspectRatio} />
        </div>
      </div>

      {/* 3. Timeline & Phase Rehearsal Control Bar */}
      <SandboxTimelineControls
        phase={phase}
        useScrubber={useScrubber}
        timelineSeconds={timelineSeconds}
        handlePhaseChange={handlePhaseChange}
        isPlaying={isPlaying}
        setIsPlaying={setIsPlaying}
        setUseScrubber={setUseScrubber}
        handleScrubberChange={handleScrubberChange}
      />
    </div>
  );
}
