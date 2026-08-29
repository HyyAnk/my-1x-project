import { adaptMascotV1ToV2, type ChannelMascotConfig, type MascotProfile } from "@studio/shared";
import { renderMascotHtmlFromBundle } from "./mascotHtmlRenderer.js";
import { resolveProductionMascotMarkers, type ProductionMascotRenderOptions } from "./productionMascotTimeline.js";

export type { ProductionMascotRenderOptions, ProductionMascotTimelineEvent } from "./productionMascotTimeline.js";

/** Production adapter for the canonical Mascot Render Contract V2 HTML layer. */
export function renderProductionMascotHtmlLayer(
  mascot: MascotProfile | null | undefined,
  config: ChannelMascotConfig | null | undefined,
  options: ProductionMascotRenderOptions,
): string {
  const bundle = adaptMascotV1ToV2(mascot, config);
  if (!bundle) return "";

  const clipStart = finiteNonNegative(options.clipStartSeconds);
  const clipDuration = Math.max(0.04, finiteNonNegative(options.clipDurationSeconds));
  const markers = resolveProductionMascotMarkers(options, clipStart, clipDuration);
  const states = markers.map((marker, index) => ({
    phase: marker.phase,
    // HyperFrames mounts this HTML as a nested composition at clipStart. CSS
    // animation delays therefore need clip-local time, while the resolver's
    // motion timestamp stays on the absolute composition clock below.
    atSeconds: Math.max(0, marker.atSeconds - clipStart),
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
