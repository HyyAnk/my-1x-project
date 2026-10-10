import { PORTRAIT_FRAME } from "./portraitFrameGeometry.js";

/** The mascot art is a 220 px contain box scaled from its bottom center, so the container shifts by half the growth. */
export const MASCOT_CONTAINER_PX = 220;

/**
 * Anchors the production mascot inside the portrait mascot slot for one scene selector and draws
 * a light ledge along the visible art's bottom edge (the state layer exposes the gap between the
 * scaled box and the opaque content), so a mascot cut at its canvas edge reads as standing behind
 * a glow strip instead of being clipped.
 *
 * The generic 9:16 rule uses `.candy-scene:not(.candy-intro):not(.candy-outro)`; the repeated
 * container class outranks it so the portrait frame owns the anchor.
 */
export function portraitMascotAnchorCss(sceneSelector: string): string {
  const { canvas, safeArea, mascot } = PORTRAIT_FRAME;
  const container = `${sceneSelector} .candy-mascot-container.mascot-v2-container.mascot-v2-container.mascot-v2-container`;
  const growth = (mascot.width - MASCOT_CONTAINER_PX) / 2;
  const bottom = canvas.height - (mascot.y + mascot.height);
  const right = canvas.width - (mascot.x + mascot.width) + growth;
  return `
${container} { bottom: ${bottom}px; }
${container}.anchor-bottom_right { right: ${right}px; }
${container}.anchor-bottom_left { left: ${safeArea.x + growth}px; }
${container} .mascot-reveal-fx { transform: translateY(calc(-1 * var(--mascot-content-bottom-gap, 0px))); }
${container} .mascot-v2-state::after { content: ""; position: absolute; left: 50%; bottom: calc(var(--mascot-content-bottom-gap, 0px) - 12px); width: calc(${MASCOT_CONTAINER_PX}px * var(--mascot-scale, 1) * 1.1); height: 40px; transform: translateX(-50%); border-radius: 999px; background: linear-gradient(180deg, rgba(255,255,255,0) 0%, rgba(255,255,255,.6) 40%, rgba(255,255,255,.98) 58%, rgba(255,255,255,.3) 100%); box-shadow: 0 0 34px 12px rgba(255,255,255,.4); filter: blur(1.5px); pointer-events: none; }
`;
}
