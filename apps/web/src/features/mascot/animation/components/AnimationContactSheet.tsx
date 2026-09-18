import { useEffect, useRef } from "react";
import type { MascotPublishedAnimationAsset } from "@studio/shared";

export interface AnimationContactSheetProps {
  animation?: MascotPublishedAnimationAsset | null;
  activeFrameIndex: number;
  onSelectFrame: (frameIndex: number) => void;
}

export function AnimationContactSheet({ animation, activeFrameIndex, onSelectFrame }: AnimationContactSheetProps) {
  const frames = animation?.frames || [];
  const atlasUrl = animation?.atlas_url;
  const atlasImgRef = useRef<HTMLImageElement | null>(null);
  const canvasRefs = useRef<(HTMLCanvasElement | null)[]>([]);

  useEffect(() => {
    if (!atlasUrl) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = atlasUrl;
    img.onload = () => {
      atlasImgRef.current = img;
      frames.forEach((frame, idx) => {
        const canvas = canvasRefs.current[idx];
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, frame.x, frame.y, frame.width, frame.height, 0, 0, canvas.width, canvas.height);
      });
    };
  }, [atlasUrl, frames]);

  if (!animation || frames.length === 0) {
    return null;
  }

  return (
    <div role="region" aria-label="12-frame contact sheet" className="anim-contact-sheet-container">
      <div className="anim-contact-sheet-header">
        <span className="anim-section-title">Contact Sheet (12 Frames)</span>
        <span className="anim-contact-sheet-hint">Click frame to scrub</span>
      </div>

      <div className="anim-contact-sheet-grid">
        {frames.map((frame, index) => {
          const isActive = index === activeFrameIndex;
          return (
            <button
              key={`sheet_frame_${index}`}
              type="button"
              className={`anim-sheet-item ${isActive ? "is-active" : ""}`}
              onClick={() => onSelectFrame(index)}
              aria-label={`Jump to frame ${index + 1}`}
              aria-current={isActive ? "true" : undefined}
            >
              <canvas
                ref={(el) => {
                  canvasRefs.current[index] = el;
                }}
                width={80}
                height={80}
                className="anim-sheet-canvas"
              />
              <span className="anim-sheet-index">#{index + 1}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
