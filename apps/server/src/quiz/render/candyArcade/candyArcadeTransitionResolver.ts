import { resolveTransitionInstance, type QuizTimelineEvent, type ResolvedTransitionInstance } from "@studio/shared";
import type { QuizTemplateScene } from "../../visual/types.js";
import { transitionClip } from "./candyArcadeClips.js";

export {
  resolveCandyArcadeIntroClip,
  type ResolveCandyArcadeIntroClipInput,
  type ResolveCandyArcadeIntroClipResult,
} from "./introClipResolver.js";
export { resolveCandyArcadeOutroClip, type ResolveCandyArcadeOutroClipInput } from "./outroClipResolver.js";

export type ResolveCandyArcadeSceneTransitionInput = {
  transition: QuizTimelineEvent;
  questionId: string;
  visual: QuizTemplateScene;
  nextPalette: QuizTemplateScene["palette"];
  fps: number;
  canvas: { width: number; height: number };
  customTransitionInstances?: Record<string, ResolvedTransitionInstance>;
};

export type ResolveCandyArcadeSceneTransitionResult = {
  boundaryId: string;
  instance: ResolvedTransitionInstance;
  clip: string;
};

export function resolveCandyArcadeSceneTransition(input: ResolveCandyArcadeSceneTransitionInput): ResolveCandyArcadeSceneTransitionResult {
  const { transition, questionId, visual, nextPalette, fps, canvas, customTransitionInstances } = input;
  const boundaryId = (transition.payload?.instance_id as string | undefined) ?? questionId;
  const startFrames = Math.round(transition.at_seconds * fps);
  const durationFrames = Math.round(transition.duration_seconds * fps);
  const endFramesExclusive = startFrames + Math.max(1, durationFrames);
  const boundaryFrame = Math.round((transition.at_seconds + transition.duration_seconds * 0.5) * fps);

  const resolvedInstance =
    customTransitionInstances?.[boundaryId] ??
    resolveTransitionInstance(
      {
        id: visual.transitionId,
        durationSeconds: transition.duration_seconds,
      },
      {
        instanceId: boundaryId,
        placement: "scene",
        fps: { numerator: fps, denominator: 1 },
        startFrame: startFrames,
        boundaryFrame: Math.min(endFramesExclusive - 1, Math.max(startFrames, boundaryFrame)),
        availableEndFrameExclusive: endFramesExclusive,
        width: canvas.width,
        height: canvas.height,
        fromColor: visual.palette.accent,
        toColor: nextPalette.backgroundPrimary,
        inkColor: visual.palette.text,
      },
    );

  const clip = transitionClip({
    start: transition.at_seconds,
    end: transition.at_seconds + transition.duration_seconds,
    visual,
    nextPalette,
    instanceId: boundaryId,
    instance: resolvedInstance,
  });

  return {
    boundaryId,
    instance: resolvedInstance,
    clip,
  };
}
