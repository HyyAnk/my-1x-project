import {
  invalidTiming,
  TransitionContextSchema,
  unknownTransition,
  unsupportedPlacement,
} from "./transition.schemas.js";
import type {
  ResolvedTransitionInstance,
  TransitionContext,
  TransitionImplementation,
  TransitionSelection,
} from "./transition.types.js";
import { fitTransitionWindow, framesToSeconds, quantizeSecondsToFrames } from "./transitionTiming.js";

type ImplementationGetter = (id: string) => TransitionImplementation | undefined;

let customImplementationGetter: ImplementationGetter | null = null;

export function setTransitionImplementationGetter(getter: ImplementationGetter | null): void {
  customImplementationGetter = getter;
}

const FALLBACK_CORE_IMPLEMENTATIONS: Record<string, Omit<TransitionImplementation, "renderMarkup" | "styles">> = {
  cut: {
    id: "cut",
    implementationRevision: "1.0.0",
    name: "Direct Cut",
    placements: ["intro", "scene"],
    defaultDurationSeconds: 0,
    minDurationSeconds: 0,
    maxDurationSeconds: 0,
    cssClass: "transition-cut",
    handoff: { kind: "cut" },
  },
  stinger_swipe: {
    id: "stinger_swipe",
    implementationRevision: "1.0.0",
    name: "Stinger Swipe",
    placements: ["intro"],
    defaultDurationSeconds: 0.5,
    minDurationSeconds: 0.2,
    maxDurationSeconds: 1.5,
    cssClass: "transition-stinger",
    handoff: { kind: "cover", progress: 0.5 },
  },
  crossfade: {
    id: "crossfade",
    implementationRevision: "1.0.0",
    name: "Fade to Black",
    placements: ["intro"],
    defaultDurationSeconds: 0.5,
    minDurationSeconds: 0.2,
    maxDurationSeconds: 1.5,
    cssClass: "transition-crossfade",
    handoff: { kind: "fade-black", progress: 1.0 },
  },
  bubble_splash: {
    id: "bubble_splash",
    implementationRevision: "1.0.0",
    name: "Bubble Splash",
    placements: ["scene"],
    defaultDurationSeconds: 0.86,
    minDurationSeconds: 0.2,
    maxDurationSeconds: 1.5,
    cssClass: "transition-bubble_splash",
    handoff: { kind: "cover", progress: 0.5 },
  },
  brush_wave: {
    id: "brush_wave",
    implementationRevision: "1.0.0",
    name: "Brush Wave",
    placements: ["scene"],
    defaultDurationSeconds: 0.8,
    minDurationSeconds: 0.2,
    maxDurationSeconds: 1.5,
    cssClass: "transition-brush_wave",
    handoff: { kind: "cover", progress: 0.5 },
  },
  lightning_brush: {
    id: "lightning_brush",
    implementationRevision: "1.0.0",
    name: "Lightning Brush",
    placements: ["scene"],
    defaultDurationSeconds: 0.8,
    minDurationSeconds: 0.2,
    maxDurationSeconds: 1.5,
    cssClass: "transition-lightning_brush",
    handoff: { kind: "cover", progress: 0.5 },
  },
};

function getImplementation(id: string): TransitionImplementation | Omit<TransitionImplementation, "renderMarkup" | "styles"> {
  if (customImplementationGetter) {
    const custom = customImplementationGetter(id);
    if (custom) return custom;
  }
  const fallback = FALLBACK_CORE_IMPLEMENTATIONS[id];
  if (!fallback) {
    throw unknownTransition(id);
  }
  return fallback;
}

export function resolveTransitionInstance(
  selection: TransitionSelection,
  context: TransitionContext,
): ResolvedTransitionInstance {
  TransitionContextSchema.parse(context);

  if (!selection.id || typeof selection.id !== "string") {
    throw unknownTransition(String(selection.id));
  }

  const def = getImplementation(selection.id);

  if (!def.placements.includes(context.placement)) {
    throw unsupportedPlacement(selection.id, context.placement);
  }

  if (def.handoff.kind === "cut") {
    return {
      instanceId: context.instanceId,
      id: def.id,
      implementationRevision: def.implementationRevision,
      placement: context.placement,
      startFrame: context.boundaryFrame,
      boundaryFrame: context.boundaryFrame,
      endFrameExclusive: context.boundaryFrame,
      durationFrames: 0,
      effectiveDurationSeconds: 0,
      fps: context.fps,
      timingAdjustment: "none",
    };
  }

  const rawDuration = selection.durationSeconds ?? def.defaultDurationSeconds;
  if (!Number.isFinite(rawDuration) || rawDuration <= 0) {
    throw invalidTiming(`Invalid duration ${rawDuration} for transition ${def.id}`);
  }

  const clampedDuration = Math.min(def.maxDurationSeconds, Math.max(def.minDurationSeconds, rawDuration));
  const requestedFrames = quantizeSecondsToFrames(clampedDuration, context.fps);

  const handoffProgress = def.handoff.progress;
  const fitted = fitTransitionWindow({
    requestedFrames: Math.max(1, requestedFrames),
    boundaryFrame: context.boundaryFrame,
    startFrame: context.startFrame,
    availableEndFrameExclusive: context.availableEndFrameExclusive,
    handoffProgress,
  });

  const effectiveDurationSeconds = framesToSeconds(fitted.durationFrames, context.fps);

  let timingAdjustment = fitted.timingAdjustment;
  if (timingAdjustment === "none" && effectiveDurationSeconds !== rawDuration) {
    timingAdjustment = "frame-rounded";
  }

  return {
    instanceId: context.instanceId,
    id: def.id,
    implementationRevision: def.implementationRevision,
    placement: context.placement,
    startFrame: fitted.startFrame,
    boundaryFrame: context.boundaryFrame,
    endFrameExclusive: fitted.endFrameExclusive,
    durationFrames: fitted.durationFrames,
    effectiveDurationSeconds,
    fps: context.fps,
    timingAdjustment,
  };
}
