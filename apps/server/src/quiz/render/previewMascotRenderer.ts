import {
  adaptMascotV1ToV2,
  type ChannelMascotConfig,
  type MascotProfile,
  type MascotRenderActionOverride,
  type MascotRenderAspectRatio,
  type MascotRenderPhase,
  type MascotRevealOutcome,
} from "@studio/shared";
import { renderMascotHtmlFromBundle } from "./mascotHtmlRenderer.js";

export type PreviewMascotRenderOptions = {
  aspectRatio: MascotRenderAspectRatio;
  phase: MascotRenderPhase;
  timelineTimeSeconds: number;
  revealOutcome?: MascotRevealOutcome | null;
  actionOverride?: MascotRenderActionOverride | null;
  playing: boolean;
  sourceMapper?: (url: string) => string;
};

export function renderPreviewMascotHtmlLayer(
  mascot: MascotProfile | null | undefined,
  config: ChannelMascotConfig | null | undefined,
  options: PreviewMascotRenderOptions,
): string {
  const bundle = adaptMascotV1ToV2(mascot, config);
  if (!bundle) return "";
  return renderMascotHtmlFromBundle({
    bundle,
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
  });
}
