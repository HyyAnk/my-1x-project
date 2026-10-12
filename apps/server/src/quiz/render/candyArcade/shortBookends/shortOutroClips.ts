import { customOutroVideoClip } from "../customOutroVideoClip.js";
import type { QuizShortBookendRenderMedia, QuizShortStageEvents } from "./quizShortBookendClips.js";

/**
 * The full uploaded outro with no narration, or undefined when the Short closes on the score CTA.
 * The last question's exit transition already covers the cut into it.
 */
export function buildQuizShortOutroClips(
  stages: QuizShortStageEvents,
  media: QuizShortBookendRenderMedia | undefined,
  duration: number,
): string[] | undefined {
  if (!stages.shortOutro || !media) return undefined;
  const start = stages.shortOutro.at_seconds;
  return [customOutroVideoClip(media.outroVideoPath, start, Math.max(0.04, duration - start), media.outroHasAudio)];
}
