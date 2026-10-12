import { resolveTransitionInstance, type ResolvedTransitionInstance } from "@studio/shared";
import { calculateIntroTransitionTiming, type IntroTransitionColors } from "./introVideoTransition.js";

export const INTRO_BOUNDARY_ID = "intro";

export type IntroBoundaryTransitionInput = {
  /** Where the intro hands over to the first scene, in seconds from the intro start. */
  boundarySeconds: number;
  transitionType: string;
  transitionDurationSeconds?: number;
  transitionInstances?: Record<string, ResolvedTransitionInstance>;
  fps: number;
  canvas: { width: number; height: number };
  palette?: { accent?: string; backgroundPrimary?: string; text?: string };
};

export type IntroBoundaryTransition = {
  colors: Required<IntroTransitionColors>;
  instance?: ResolvedTransitionInstance;
};

/** Colors and the cataloged transition instance for the cut from an uploaded intro into the first scene. */
export function resolveIntroBoundaryTransition(input: IntroBoundaryTransitionInput): IntroBoundaryTransition {
  const colors = {
    fromColor: input.palette?.accent ?? "#F59E0B",
    toColor: input.palette?.backgroundPrimary ?? "#EF4444",
    inkColor: input.palette?.text ?? "#FFFFFF",
  };
  if (input.transitionType === "cut") return { colors };
  const timing = calculateIntroTransitionTiming(input.boundarySeconds, input.transitionType, input.transitionDurationSeconds);
  const boundaryFrame = Math.round(input.boundarySeconds * input.fps);
  try {
    const instance =
      input.transitionInstances?.[INTRO_BOUNDARY_ID] ??
      resolveTransitionInstance(
        { id: input.transitionType, durationSeconds: timing.transitionDuration },
        {
          instanceId: INTRO_BOUNDARY_ID,
          placement: "intro",
          fps: { numerator: input.fps, denominator: 1 },
          startFrame: Math.round(timing.transitionStart * input.fps),
          boundaryFrame,
          availableEndFrameExclusive: boundaryFrame + Math.max(1, Math.round(timing.transitionDuration * input.fps)),
          width: input.canvas.width,
          height: input.canvas.height,
          ...colors,
        },
      );
    return { colors, instance };
  } catch {
    // Uncataloged or legacy intro transition type: the overlay still renders from its CSS class.
    return { colors };
  }
}
