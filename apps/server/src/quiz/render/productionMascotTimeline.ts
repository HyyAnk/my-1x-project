import {
  MascotActionTypeSchema,
  MascotStateSchema,
  resolveAnimationFrameAtTime,
  resolveMascotRenderSpec,
  type AtlasCssOffset,
  type MascotActionType,
  type MascotFrameRect,
  type MascotRenderActionOverride,
  type MascotRenderAspectRatio,
  type MascotRenderBundleV2,
  type MascotRenderPhase,
  type MascotRevealOutcome,
  type QuizTimelineEventType,
} from "@studio/shared";

export type ProductionMascotTimelineEvent = {
  type: QuizTimelineEventType;
  at_seconds: number;
  payload?: Record<string, unknown>;
};

export type ProductionMascotRenderOptions = {
  phase: "intro" | "question" | "outro";
  aspectRatio?: MascotRenderAspectRatio;
  clipStartSeconds: number;
  clipDurationSeconds: number;
  timelineEvents?: readonly ProductionMascotTimelineEvent[];
  revealOutcome?: MascotRevealOutcome;
  sourceMapper?: (url: string) => string;
  extraClass?: string;
};

export type MascotMarker = {
  atSeconds: number;
  phase: MascotRenderPhase;
  actionOverride?: MascotRenderActionOverride | null;
  revealOutcome?: MascotRevealOutcome | null;
};

export function resolveProductionMascotMarkers(
  options: ProductionMascotRenderOptions,
  clipStartSeconds: number,
  clipDurationSeconds: number,
): MascotMarker[] {
  if (options.phase !== "question") {
    return [{ atSeconds: clipStartSeconds, phase: options.phase, revealOutcome: null }];
  }

  const clipEndSeconds = clipStartSeconds + clipDurationSeconds;
  const events = [...(options.timelineEvents ?? [])]
    .map((event, index) => ({ event, index }))
    .filter(({ event }) => Number.isFinite(event.at_seconds))
    .sort((left, right) => left.event.at_seconds - right.event.at_seconds || left.index - right.index);
  const choicesAt = firstEventAt(events, "choices.enter", clipStartSeconds);
  const thinkingAt = firstEventAt(events, "countdown.start", clipStartSeconds);
  const revealAt = firstEventAt(events, "answer.reveal", Number.POSITIVE_INFINITY);
  const explanationAt = resolveExplanationAt(events);
  const revealOutcome = options.revealOutcome ?? "correct";
  const markers = new Map<number, MascotMarker>();

  addMarker(markers, { atSeconds: clipStartSeconds, phase: "question", revealOutcome: null }, clipStartSeconds, clipEndSeconds);
  addPhaseMarker(markers, choicesAt, "choices", clipStartSeconds, clipEndSeconds);
  addPhaseMarker(markers, thinkingAt, "thinking", clipStartSeconds, clipEndSeconds);
  addPhaseMarker(markers, revealAt, "reveal", clipStartSeconds, clipEndSeconds, revealOutcome);
  addPhaseMarker(markers, explanationAt, "explain", clipStartSeconds, clipEndSeconds, null, "point");

  for (const { event } of events) {
    if (event.type !== "mascot.state") continue;
    const actionOverride = parseActionOverride(event.payload?.state);
    if (!actionOverride) continue;
    const phase = phaseAt(event.at_seconds, choicesAt, thinkingAt, revealAt, explanationAt);
    if (phase === "explain" && event.payload?.phase === "explanation_start" && actionOverride === "celebrate") {
      continue;
    }
    addMarker(
      markers,
      {
        atSeconds: event.at_seconds,
        phase,
        actionOverride,
        revealOutcome: phase === "reveal" ? revealOutcome : null,
      },
      clipStartSeconds,
      clipEndSeconds,
    );
  }

  return [...markers.values()].sort((left, right) => left.atSeconds - right.atSeconds);
}

function firstEventAt(events: Array<{ event: ProductionMascotTimelineEvent; index: number }>, type: string, fallback: number): number {
  return events.find(({ event }) => event.type === type)?.event.at_seconds ?? fallback;
}

function resolveExplanationAt(events: Array<{ event: ProductionMascotTimelineEvent; index: number }>): number {
  const explicitState = events.find(({ event }) => event.type === "mascot.state" && event.payload?.phase === "explanation_start");
  if (explicitState) return explicitState.event.at_seconds;
  return firstEventAt(events, "fact.enter", Number.POSITIVE_INFINITY);
}

function phaseAt(atSeconds: number, choicesAt: number, thinkingAt: number, revealAt: number, explanationAt: number): MascotRenderPhase {
  if (atSeconds >= explanationAt) return "explain";
  if (atSeconds >= revealAt) return "reveal";
  if (atSeconds >= thinkingAt) return "thinking";
  if (atSeconds >= choicesAt) return "choices";
  return "question";
}

function addPhaseMarker(
  markers: Map<number, MascotMarker>,
  atSeconds: number,
  phase: MascotRenderPhase,
  clipStartSeconds: number,
  clipEndSeconds: number,
  revealOutcome: MascotRevealOutcome | null = null,
  actionOverride: MascotRenderActionOverride | null = null,
): void {
  if (!Number.isFinite(atSeconds)) return;
  addMarker(markers, { atSeconds, phase, revealOutcome, actionOverride }, clipStartSeconds, clipEndSeconds);
}

function addMarker(markers: Map<number, MascotMarker>, marker: MascotMarker, clipStartSeconds: number, clipEndSeconds: number): void {
  if (marker.atSeconds < clipStartSeconds - 0.001 || marker.atSeconds >= clipEndSeconds - 0.001) return;
  const key = Number(marker.atSeconds.toFixed(3));
  const previous = markers.get(key);
  markers.set(key, {
    atSeconds: key,
    phase: marker.phase,
    revealOutcome: marker.revealOutcome ?? previous?.revealOutcome ?? null,
    actionOverride: marker.actionOverride ?? previous?.actionOverride ?? null,
  });
}

function parseActionOverride(value: unknown): MascotRenderActionOverride | null {
  const action = MascotActionTypeSchema.safeParse(value);
  if (action.success) return action.data;
  const state = MascotStateSchema.safeParse(value);
  return state.success ? state.data : null;
}

export type ProductionTimelineResolvedFrame = {
  timeSeconds: number;
  marker: MascotMarker;
  phase: MascotRenderPhase;
  action: MascotActionType;
  animationFrameIndex?: number;
  animationFrame?: MascotFrameRect;
  atlasOffsets?: AtlasCssOffset;
  isClamped?: boolean;
  seekTimeSeconds?: number;
  transparentVideoUrl?: string;
};

/**
 * Deterministically resolves the mascot timeline frame state at an exact timestamp.
 * Adheres strictly to HyperFrames constraints (seekable from time alone, zero clocks).
 */
export function resolveProductionMascotTimelineAtTime(
  options: ProductionMascotRenderOptions,
  bundle: MascotRenderBundleV2,
  timeSeconds: number,
): ProductionTimelineResolvedFrame | null {
  const clipStart = Number.isFinite(options.clipStartSeconds) ? Math.max(0, options.clipStartSeconds) : 0;
  const clipDuration = Math.max(0.04, Number.isFinite(options.clipDurationSeconds) ? Math.max(0, options.clipDurationSeconds) : 0);
  const targetTime = Number.isFinite(timeSeconds) ? Math.max(0, timeSeconds) : 0;

  const markers = resolveProductionMascotMarkers(options, clipStart, clipDuration);
  if (markers.length === 0) return null;

  let activeMarker = markers[0];
  for (let i = 0; i < markers.length; i++) {
    if (markers[i].atSeconds <= targetTime) {
      activeMarker = markers[i];
    } else {
      break;
    }
  }

  const spec = resolveMascotRenderSpec(bundle, {
    aspect_ratio: options.aspectRatio ?? "16:9",
    phase: activeMarker.phase,
    reveal_outcome: activeMarker.revealOutcome ?? null,
    action_override: activeMarker.actionOverride ?? null,
    timeline_time_seconds: targetTime,
    playing: true,
  });
  if (!spec) return null;

  if (activeMarker.phase === "reveal" && !bundle.assets.actions.celebrate?.image_url?.trim()) {
    return null;
  }
  if (activeMarker.phase === "thinking" && !bundle.assets.actions.thinking?.image_url?.trim()) {
    return null;
  }

  const result: ProductionTimelineResolvedFrame = {
    timeSeconds: targetTime,
    marker: activeMarker,
    phase: activeMarker.phase,
    action: spec.asset.action,
  };

  if (spec.asset.animation) {
    const elapsedSeconds = Math.max(0, targetTime - activeMarker.atSeconds);
    const resolved = resolveAnimationFrameAtTime(spec.asset.animation, elapsedSeconds);
    result.animationFrameIndex = resolved.frameIndex;
    result.animationFrame = resolved.frame;
    result.atlasOffsets = resolved.atlasOffsets;
    result.isClamped = resolved.isClamped;

    if (spec.asset.animation.transparent_video_url) {
      result.transparentVideoUrl = spec.asset.animation.transparent_video_url;
      const isOneShot =
        spec.asset.animation.loop_policy === "one_shot_rest" || (!spec.asset.animation.loop && spec.asset.animation.loop_policy !== "loop");
      const cycle = spec.asset.animation.duration_ms
        ? spec.asset.animation.duration_ms / 1000
        : spec.asset.animation.frame_count / spec.asset.animation.fps;
      const rawSeek = isOneShot ? Math.min(elapsedSeconds, cycle) : elapsedSeconds % cycle;
      result.seekTimeSeconds = Number(rawSeek.toFixed(3));
    }
  }

  return result;
}

/**
 * Resolves a sequence of deterministic mascot frames across the duration of a video clip.
 */
export function resolveProductionTimelineFrames(
  options: ProductionMascotRenderOptions,
  bundle: MascotRenderBundleV2,
  fps = 8,
): ProductionTimelineResolvedFrame[] {
  const clipStart = Number.isFinite(options.clipStartSeconds) ? Math.max(0, options.clipStartSeconds) : 0;
  const clipDuration = Math.max(0.04, Number.isFinite(options.clipDurationSeconds) ? Math.max(0, options.clipDurationSeconds) : 0);
  const totalFrames = Math.ceil(clipDuration * fps);
  const frames: ProductionTimelineResolvedFrame[] = [];

  for (let i = 0; i < totalFrames; i++) {
    const time = clipStart + i / fps;
    const resolved = resolveProductionMascotTimelineAtTime(options, bundle, time);
    if (resolved) {
      frames.push(resolved);
    }
  }

  return frames;
}
