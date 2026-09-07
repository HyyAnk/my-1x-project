import {
  adaptMascotV1ToV2,
  type ChannelMascotConfig,
  type MascotProfile,
} from "@studio/shared";
import { renderMascotHtmlFromBundle } from "./mascotHtmlRenderer.js";
import {
  adaptMascotForPhase,
  adaptMascotForQuestion,
  hasDedicatedAction,
  resolveMascotQuestionStyle,
} from "./mascot/productionMascotStateAdapter.js";
import {
  resolveProductionMascotMarkers,
  type ProductionMascotRenderOptions as BaseProductionMascotRenderOptions,
  type ProductionMascotTimelineEvent,
} from "./productionMascotTimeline.js";

export type ProductionMascotRenderOptions = BaseProductionMascotRenderOptions & {
  styleId?: string | null;
};

export type { ProductionMascotTimelineEvent };

export {
  resolveMascotQuestionStyle,
  hasDedicatedAction,
  adaptMascotForQuestion,
  adaptMascotForPhase,
};

/** Production adapter for the canonical Mascot Render Contract V2 HTML layer. */
export function renderProductionMascotHtmlLayer(
  mascot: MascotProfile | null | undefined,
  config: ChannelMascotConfig | null | undefined,
  options: ProductionMascotRenderOptions,
): string {
  const effectiveMascot = adaptMascotForPhase(mascot, options.phase, options.styleId);
  const bundle = adaptMascotV1ToV2(effectiveMascot, config);
  if (!bundle) return "";

  const clipStart = finiteNonNegative(options.clipStartSeconds);
  const clipDuration = Math.max(0.04, finiteNonNegative(options.clipDurationSeconds));
  const markers = resolveProductionMascotMarkers(options, clipStart, clipDuration);
  const states = markers.map((marker, index) => ({
    phase: marker.phase,
    atSeconds: Math.max(0, marker.atSeconds),
    durationSeconds: Math.max(0.04, (markers[index + 1]?.atSeconds ?? clipStart + clipDuration) - marker.atSeconds),
    timelineTimeSeconds: marker.atSeconds,
    actionOverride: marker.actionOverride,
    revealOutcome: marker.revealOutcome,
    playing: true,
  }));

  return renderMascotHtmlFromBundle({
    bundle,
    aspectRatio: options.aspectRatio ?? "16:9",
    states,
    phaseClass: options.phase === "intro" ? "mascot-intro" : options.phase === "outro" ? "mascot-outro" : "mascot-stage",
    sourceMapper: options.sourceMapper,
    extraClass: options.extraClass,
  });
}

function finiteNonNegative(value: number): number {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}
