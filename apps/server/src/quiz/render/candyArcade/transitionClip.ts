import { getTransitionDefinition, type ResolvedTransitionInstance } from "@studio/shared";
import { renderResolvedTransitionClip } from "../transitions/renderTransitionClip.js";
import type { QuizTemplateScene } from "../../visual/types.js";

export type TransitionClipInput = {
  start: number;
  end: number;
  visual: QuizTemplateScene;
  nextPalette: QuizTemplateScene["palette"];
  instanceId?: string;
  instance?: ResolvedTransitionInstance;
};

export function transitionClip(input: TransitionClipInput): string {
  if (input.end - input.start < 0.04) return "";
  if (input.instance) {
    return renderResolvedTransitionClip(input.instance, {
      visual: input.visual,
      nextPalette: input.nextPalette,
    });
  }
  try {
    const def = getTransitionDefinition(input.visual.transitionId);
    if (def.id === "cut") return "";
    const body = def.renderMarkup({
      instanceId: input.instanceId ?? `trans-${Math.round(input.start * 1000)}`,
      placement: "scene",
      fps: { numerator: 30, denominator: 1 },
      startFrame: Math.round(input.start * 30),
      boundaryFrame: Math.round(((input.start + input.end) / 2) * 30),
      availableEndFrameExclusive: Math.round(input.end * 30),
      width: 1920,
      height: 1080,
      fromColor: input.visual.palette.accent,
      toColor: input.nextPalette.backgroundPrimary,
      inkColor: input.visual.palette.text,
    });
    const instanceAttr = input.instanceId ? ` data-transition-instance="${input.instanceId}"` : "";
    return `<section id="candy-transition-${Math.round(input.start * 1000)}" class="clip candy-transition transition-${input.visual.transitionId}"${instanceAttr} data-layout-ignore data-layout-allow-occlusion data-layout-allow-overflow style="--from:${input.visual.palette.accent};--to:${input.nextPalette.backgroundPrimary};--ink:${input.visual.palette.text};--clip-start:${input.start.toFixed(3)}s;--trans-dur:${(input.end - input.start).toFixed(3)}s;--trans-start:0s" data-start="${input.start.toFixed(3)}" data-duration="${(input.end - input.start).toFixed(3)}" data-track-index="1">${body}</section>`;
  } catch {
    const isBrush = input.visual.transitionId === "lightning_brush" || input.visual.transitionId === "brush_wave";
    const mark =
      input.visual.transitionId === "lightning_brush" ? `<div class="transition-mark" data-layout-ignore aria-hidden="true">✦</div>` : "";
    const body = isBrush
      ? `<div class="brush brush-one" data-layout-allow-occlusion data-layout-allow-overflow></div><div class="brush brush-two" data-layout-allow-occlusion data-layout-allow-overflow></div>${mark}`
      : `<div class="splash-bed" data-layout-allow-occlusion data-layout-allow-overflow></div><i class="splash-bubble splash-bubble-a" data-layout-allow-occlusion data-layout-allow-overflow></i><i class="splash-bubble splash-bubble-b" data-layout-allow-occlusion data-layout-allow-overflow></i><i class="splash-bubble splash-bubble-c" data-layout-allow-occlusion data-layout-allow-overflow></i><i class="splash-bubble splash-bubble-d" data-layout-allow-occlusion data-layout-allow-overflow></i><i class="splash-bubble splash-bubble-e" data-layout-allow-occlusion data-layout-allow-overflow></i><i class="splash-bubble splash-bubble-f" data-layout-allow-occlusion data-layout-allow-overflow></i><div class="splash-brand" data-layout-ignore aria-hidden="true">✦</div><div class="splash-particles" data-layout-ignore aria-hidden="true"><i>✦</i><i>•</i><i>✦</i><i>•</i></div><div class="splash-release" data-layout-allow-occlusion data-layout-allow-overflow></div>`;
    const instanceAttr = input.instanceId ? ` data-transition-instance="${input.instanceId}"` : "";
    return `<section id="candy-transition-${Math.round(input.start * 1000)}" class="clip candy-transition transition-${input.visual.transitionId}"${instanceAttr} data-layout-ignore data-layout-allow-occlusion data-layout-allow-overflow style="--from:${input.visual.palette.accent};--to:${input.nextPalette.backgroundPrimary};--ink:${input.visual.palette.text};--clip-start:${input.start.toFixed(3)}s;--trans-dur:${(input.end - input.start).toFixed(3)}s;--trans-start:0s" data-start="${input.start.toFixed(3)}" data-duration="${(input.end - input.start).toFixed(3)}" data-track-index="1">${body}</section>`;
  }
}
