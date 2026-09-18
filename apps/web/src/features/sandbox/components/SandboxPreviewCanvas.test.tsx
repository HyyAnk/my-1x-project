import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import React from "react";
import { LanguageProvider } from "../../../i18n/LanguageContext";
import { SandboxPreviewCanvas } from "./SandboxPreviewCanvas";

afterEach(() => {
  cleanup();
});

describe("SandboxPreviewCanvas (Stage 8 Dimensions & Viewport Parity)", () => {
  const defaultProps = {
    containerRef: React.createRef<HTMLDivElement>(),
    contrastReport: null,
    lastRenderTime: "12:00:00",
    showSafeArea: false,
    setShowSafeArea: vi.fn(),
    showShortsGuide: false,
    setShowShortsGuide: vi.fn(),
    iframeKey: 1,
    setIframeKey: vi.fn(),
    zoom: "fit" as const,
    setZoom: vi.fn(),
    scaleFactor: 0.5,
    previewHtml: "<html><body>Preview</body></html>",
    pendingPreviewHtml: "",
    loading: false,
    previewError: null,
    onPendingPreviewLoad: vi.fn(),
    onRetryPreview: vi.fn(),
    phase: "question",
    useScrubber: false,
    timelineSeconds: 0,
    handlePhaseChange: vi.fn(),
    isPlaying: false,
    setIsPlaying: vi.fn(),
    setUseScrubber: vi.fn(),
    handleScrubberChange: vi.fn(),
  };

  it("renders 1920x1080 canvas frame in 16:9 landscape mode", () => {
    render(
      <LanguageProvider>
        <SandboxPreviewCanvas {...defaultProps} aspectRatio="16:9" />
      </LanguageProvider>,
    );

    const viewportWrapper = screen.getByTestId("sandbox-viewport-wrapper");
    expect(viewportWrapper.style.width).toBe("1920px");
    expect(viewportWrapper.style.height).toBe("1080px");
    expect(screen.getByText("1920 × 1080")).toBeTruthy();
  });
});
