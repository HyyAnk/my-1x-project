import { useEffect, useRef } from "react";
import type { MascotPublishedAnimationAsset, resolveAnimationFrameAtTime } from "@studio/shared";

export interface UseCanvasAtlasDrawerOptions {
  animation?: MascotPublishedAnimationAsset | null;
  resolvedFrame: ReturnType<typeof resolveAnimationFrameAtTime> | null;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
}

export function useCanvasAtlasDrawer({
  animation,
  resolvedFrame,
  canvasRef,
}: UseCanvasAtlasDrawerOptions) {
  const atlasImageRef = useRef<HTMLImageElement | null>(null);

  // Preload atlas image
  useEffect(() => {
    if (!animation?.atlas_url) {
      atlasImageRef.current = null;
      return;
    }
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = animation.atlas_url;
    img.onload = () => {
      atlasImageRef.current = img;
      drawCanvas();
    };
  }, [animation?.atlas_url]);

  const drawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const img = atlasImageRef.current;
    const frameRect = resolvedFrame?.frame;

    if (img && frameRect) {
      ctx.drawImage(
        img,
        frameRect.x,
        frameRect.y,
        frameRect.width,
        frameRect.height,
        0,
        0,
        canvas.width,
        canvas.height,
      );
    }
  };

  useEffect(() => {
    drawCanvas();
  }, [resolvedFrame]);
}
