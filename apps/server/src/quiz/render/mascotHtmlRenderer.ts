import { MASCOT_CANVAS_SIZES, type MascotRenderAspectRatio, type MascotRenderBundleV2 } from "@studio/shared";
import {
  buildContainerClass,
  buildContainerStyle,
  finiteNonNegative,
  numberValue,
  renderState,
  type MascotHtmlState,
} from "./mascot/index.js";

export type { MascotHtmlState };

export type MascotHtmlRenderInput = {
  bundle: MascotRenderBundleV2;
  aspectRatio: MascotRenderAspectRatio;
  states: readonly MascotHtmlState[];
  phaseClass: string;
  sourceMapper?: (url: string) => string;
  extraClass?: string;
  preview?: boolean;
  clipStartSeconds?: number;
};

export function renderMascotHtmlFromBundle(input: MascotHtmlRenderInput): string {
  const sourceMapper = input.sourceMapper ?? ((url: string) => url);
  const clipStartSeconds = finiteNonNegative(input.clipStartSeconds ?? 0);
  const layers = input.states
    .map((state) => renderState(input.bundle, input.aspectRatio, state, sourceMapper, Boolean(input.preview), clipStartSeconds))
    .filter((layer): layer is string => Boolean(layer));
  if (layers.length === 0) return "";

  const canvas = MASCOT_CANVAS_SIZES[input.aspectRatio];
  const placement = input.bundle.config.placements[input.aspectRatio];
  const className = buildContainerClass(input.phaseClass, placement.anchor, input.preview, input.extraClass);
  const style = buildContainerStyle(placement);

  return `<div class="${className}" style="${style}" data-mascot-contract-version="2" data-mascot-aspect-ratio="${input.aspectRatio}" data-mascot-canvas="${canvas.width}x${canvas.height}" data-mascot-anchor="${placement.anchor}" data-mascot-scale="${numberValue(placement.scale)}" data-mascot-offset-x="${numberValue(placement.offset_x)}" data-mascot-offset-y="${numberValue(placement.offset_y)}" data-mascot-flip-x="${String(placement.flip_x)}" data-mascot-preview="${String(Boolean(input.preview))}" data-mascot-visible="true" data-layout-ignore aria-hidden="true">${layers.join("")}</div>`;
}
