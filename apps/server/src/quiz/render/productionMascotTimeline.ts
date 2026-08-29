import {
  MascotActionTypeSchema,
  MascotStateSchema,
  type MascotRenderActionOverride,
  type MascotRenderAspectRatio,
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
  addPhaseMarker(markers, explanationAt, "explain", clipStartSeconds, clipEndSeconds);

  for (const { event } of events) {
    if (event.type !== "mascot.state") continue;
    const actionOverride = parseActionOverride(event.payload?.state);
    if (!actionOverride) continue;
    const phase = phaseAt(event.at_seconds, choicesAt, thinkingAt, revealAt, explanationAt);
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
): void {
  if (!Number.isFinite(atSeconds)) return;
  addMarker(markers, { atSeconds, phase, revealOutcome }, clipStartSeconds, clipEndSeconds);
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
