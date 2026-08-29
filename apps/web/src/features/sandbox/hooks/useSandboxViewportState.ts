import { useCallback, useEffect, useRef, useState } from "react";

export function useSandboxViewportState() {
  const [showSafeArea, setShowSafeArea] = useState(false);
  const [showShortsGuide, setShowShortsGuide] = useState(false);
  const [zoom, setZoom] = useState<"fit" | "50" | "75" | "100">("fit");
  const [scaleFactor, setScaleFactor] = useState(0.5);
  const containerRef = useRef<HTMLDivElement>(null);

  const updateScale = useCallback(() => {
    if (!containerRef.current) return;
    const fixedScale = zoom === "50" ? 0.5 : zoom === "75" ? 0.75 : zoom === "100" ? 1 : null;
    if (fixedScale !== null) {
      setScaleFactor(fixedScale);
      return;
    }

    const containerWidth = containerRef.current.clientWidth - 32;
    const containerHeight = containerRef.current.clientHeight - 32;
    const calculatedScale = Math.min(containerWidth / 1920, containerHeight / 1080, 1);
    setScaleFactor(Math.max(0.2, calculatedScale));
  }, [zoom]);

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
    containerRef,
  };
}

export type SandboxViewportState = ReturnType<typeof useSandboxViewportState>;
