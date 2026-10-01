import { escAttr } from "./candyArcadeSvg.js";

export type UploadedVideoPlacement = "intro" | "outro";

export function renderUploadedVideoElements(input: {
  placement: UploadedVideoPlacement;
  videoPath: string;
  durationSeconds: number;
  hasAudio: boolean;
}): string {
  const name = `custom-${input.placement}`;
  const source = escAttr(input.videoPath);
  const duration = input.durationSeconds.toFixed(3);
  const audio = input.hasAudio
    ? `<audio id="${name}-audio" src="${source}" data-start="0" data-duration="${duration}" data-volume="1"></audio>`
    : "";
  return `<video id="${name}-video-track" class="${name}-video" src="${source}" data-start="0" data-duration="${duration}" data-has-audio="false" muted playsinline></video>${audio}`;
}
