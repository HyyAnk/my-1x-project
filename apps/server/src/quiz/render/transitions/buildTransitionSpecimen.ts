import type { FrameRate, ResolvedTransitionInstance } from "@studio/shared";
import { buildCandyArcadeCompositionBundle } from "../candyArcadeComposition.js";
import {
  prepareTransitionSpecimen,
  type PreparedTransitionSpecimen,
  type PrepareTransitionSpecimenOptions,
} from "./prepareTransitionSpecimen.js";

export type BuiltTransitionSpecimen = {
  html: string;
  files: Record<string, string>;
  reviewWindow: {
    firstFrame: number;
    lastFrameInclusive: number;
    boundaryFrame: number;
  };
  resolvedInstance: ResolvedTransitionInstance;
  boundaryId: string;
  width: number;
  height: number;
  fps: FrameRate;
  totalDurationSeconds: number;
  totalDurationFrames: number;
  sampleRevision: string;
};

export function buildTransitionSpecimen(
  input: PreparedTransitionSpecimen | PrepareTransitionSpecimenOptions,
): BuiltTransitionSpecimen {
  const prepared = "compositionInput" in input ? input : prepareTransitionSpecimen(input);

  const bundle = buildCandyArcadeCompositionBundle(prepared.compositionInput);

  const resolvedInstance =
    bundle.transitionInstances?.[prepared.boundaryId] ?? prepared.resolvedInstance;

  const fpsVal = prepared.fps.numerator / prepared.fps.denominator;
  const totalDurationSeconds = prepared.compositionInput.timeline.duration_seconds;
  const totalDurationFrames = Math.round(totalDurationSeconds * fpsVal);

  const inspectionFrames = Math.round(0.75 * fpsVal);
  const reviewWindow = {
    firstFrame: Math.max(0, resolvedInstance.startFrame - inspectionFrames),
    lastFrameInclusive: Math.min(
      Math.max(0, totalDurationFrames - 1),
      resolvedInstance.endFrameExclusive - 1 + inspectionFrames,
    ),
    boundaryFrame: resolvedInstance.boundaryFrame,
  };

  return {
    html: bundle.html,
    files: bundle.files,
    reviewWindow,
    resolvedInstance,
    boundaryId: prepared.boundaryId,
    width: prepared.width,
    height: prepared.height,
    fps: prepared.fps,
    totalDurationSeconds,
    totalDurationFrames,
    sampleRevision: prepared.sampleRevision,
  };
}
