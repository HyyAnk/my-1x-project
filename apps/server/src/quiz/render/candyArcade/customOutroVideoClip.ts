import { renderUploadedVideoElements } from "./uploadedVideoElements.js";

/**
 * Renders custom outro video clip.
 */
export function customOutroVideoClip(videoPath: string, start: number, durationSeconds: number, hasAudio: boolean = true): string {
  if (durationSeconds < 0.08) return "";
  const media = renderUploadedVideoElements({ placement: "outro", videoPath, durationSeconds, hasAudio });
  return `<section id="custom-outro" class="clip candy-scene custom-outro-scene" data-start="${start.toFixed(3)}" data-duration="${durationSeconds.toFixed(3)}" data-track-index="0">${media}</section>`;
}
