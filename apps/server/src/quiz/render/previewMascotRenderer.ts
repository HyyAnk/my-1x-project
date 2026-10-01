import {
  resolveEffectiveMascotMediaMode,
  type ChannelMascotConfig,
  type MascotProfile,
  type MascotRenderActionOverride,
  type MascotRenderAspectRatio,
  type MascotRenderPhase,
  type MascotRevealOutcome,
  type MascotStateMediaMode,
} from "@studio/shared";
import { adaptMascotForPhase } from "./mascot/productionMascotStateAdapter.js";
import { renderMascotHtmlFromBundle } from "./mascotHtmlRenderer.js";
import {
  resolveEffectiveRenderBundle,
  sanitizeMascotRenderBundleForMediaMode,
  synchronizeBundleVisibility,
} from "./productionMascotRenderer.js";

export type PreviewMascotRenderOptions = {
  aspectRatio: MascotRenderAspectRatio;
  phase: MascotRenderPhase;
  timelineTimeSeconds: number;
  styleId?: string | null;
  revealOutcome?: MascotRevealOutcome | null;
  actionOverride?: MascotRenderActionOverride | null;
  playing: boolean;
  sourceMapper?: (url: string) => string;
  mediaMode?: MascotStateMediaMode;
};

export function renderPreviewMascotHtmlLayer(
  mascot: MascotProfile | null | undefined,
  config: ChannelMascotConfig | null | undefined,
  options: PreviewMascotRenderOptions,
): string {
  const effectiveMediaMode = resolveEffectiveMascotMediaMode(config, options.mediaMode);
  const phaseForAdapter = options.phase === "intro" || options.phase === "outro" ? options.phase : "question";
  const effectiveMascot = adaptMascotForPhase(mascot, phaseForAdapter, options.styleId, effectiveMediaMode);
  const bundle = resolveEffectiveRenderBundle(effectiveMascot, config);
  if (!bundle) return "";
  const mediaBundle = sanitizeMascotRenderBundleForMediaMode(bundle, effectiveMediaMode);
  synchronizeBundleVisibility(mediaBundle, effectiveMascot);
  return renderMascotHtmlFromBundle({
    bundle: mediaBundle,
    aspectRatio: options.aspectRatio,
    states: [
      {
        phase: options.phase,
        atSeconds: 0,
        durationSeconds: 10,
        timelineTimeSeconds: options.timelineTimeSeconds,
        revealOutcome: options.revealOutcome,
        actionOverride: options.actionOverride,
        playing: options.playing,
      },
    ],
    phaseClass: options.phase === "intro" ? "mascot-intro" : options.phase === "outro" ? "mascot-outro" : "mascot-stage",
    sourceMapper: options.sourceMapper,
    preview: true,
    mediaMode: effectiveMediaMode,
  });
}
