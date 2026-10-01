import { useEffect, useRef, useState } from "react";
import type { MascotRenderAspectRatio } from "@studio/shared";

/** Scale the whole logical stage, including placement offsets, to its viewport. */
export function useStagePreviewViewport(aspectRatio: MascotRenderAspectRatio) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [viewportWidth, setViewportWidth] = useState<number | null>(null);
  const width = aspectRatio === "9:16" ? 1080 : 1920;
  const height = aspectRatio === "9:16" ? 1920 : 1080;

  useEffect(() => {
    const element = viewportRef.current;
    if (!element || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry.contentRect.width > 0) setViewportWidth(entry.contentRect.width);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return { viewportRef, width, height, scale: (viewportWidth ?? width) / width };
}
