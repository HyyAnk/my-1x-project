import { useCallback, useEffect, useRef, useState } from "react";

export type SandboxAspectRatio = "16:9" | "9:16";

export const SANDBOX_CANVAS_DIMENSIONS: Record<SandboxAspectRatio, { width: number; height: number }> = {
  "16:9": { width: 1920, height: 1080 },
  "9:16": { width: 1080, height: 1920 },
};

export const SANDBOX_SAFE_ZONES = {
  "16:9": {
    actionSafe: { top: 54, bottom: 54, left: 96, right: 96 },
    titleSafe: { top: 108, bottom: 108, left: 192, right: 192 },
  },
  "9:16": {
    platformSafe: { top: 180, bottom: 440, left: 36, right: 140 },
  },
} as const;

export function useSandboxViewportState(initialAspectRatio: SandboxAspectRatio = "16:9") {
  const [aspectRatio, setAspectRatio] = useState<SandboxAspectRatio>(initialAspectRatio);
  const [showSafeArea, setShowSafeArea] = useState(false);
  const [showShortsGuide, setShowShortsGuide] = useState(false);
  const [zoom, setZoom] = useState<"fit" | "50" | "75" | "100">("fit");
  const [scaleFactor, setScaleFactor] = useState(0.5);
  const containerRef = useRef<HTMLDivElement>(null);

  const updateScale = useCallback(() => {
    const fixedScale = zoom === "50" ? 0.5 : zoom === "75" ? 0.75 : zoom === "100" ? 1 : null;
    if (fixedScale !== null) {
      setScaleFactor(fixedScale);
      return;
    }

    if (!containerRef.current) return;
    const { width: targetWidth, height: targetHeight } = SANDBOX_CANVAS_DIMENSIONS[aspectRatio];
    const containerWidth = containerRef.current.clientWidth - 32;
    const containerHeight = containerRef.current.clientHeight - 32;
    const calculatedScale = Math.min(containerWidth / targetWidth, containerHeight / targetHeight, 1);
    setScaleFactor(Math.max(0.1, calculatedScale));
  }, [aspectRatio, zoom]);

  useEffect(() => {
    updateScale();
    if (!containerRef.current) return;
    const resizeObserver = new ResizeObserver(updateScale);
    resizeObserver.observe(containerRef.current);
    window.addEventListener("resize", updateScale);
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateScale);
    };
  }, [updateScale]);

  return {
    showSafeArea,
    setShowSafeArea,
    showShortsGuide,
    setShowShortsGuide,
    zoom,
    setZoom,
    scaleFactor,
    aspectRatio,
    setAspectRatio,
    containerRef,
  };
}

export type SandboxViewportState = ReturnType<typeof useSandboxViewportState>;
