import { listTransitionDefinitions } from "./catalog.js";

const BASE_TRANSITION_WRAPPERS_CSS = `
/* ==========================================================================
   Antigravity Video Studio — Shared Motion & Transition Engine
   ========================================================================== */

:root {
  --trans-dur: 0.8s;
  --trans-start: 0s;
  --trans-from-color: var(--from, #F59E0B);
  --trans-to-color: var(--to, #EF4444);
}

/* Base Transition Wrappers */
.intro-transition {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 100;
}

.candy-transition { position: absolute; z-index: var(--candy-layer-transition); inset: 0; overflow: hidden; background: transparent; pointer-events: none; }

/* Curtain Swipe (Legacy compatibility) */
.transition-swipe {
  overflow: hidden;
}

.swipe-curtain {
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, var(--trans-from-color, #1E293B), var(--trans-to-color, #0F172A));
  transform: translateX(-100%);
  animation: swipe-in var(--trans-dur, 0.8s) cubic-bezier(0.4, 0, 0.2, 1) var(--trans-start, 0s) forwards;
}

@keyframes swipe-in {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(0); }
}
`.trim();

/**
 * Aggregates all canonical definition styles with base transition wrappers.
 */
export function buildTransitionStylesCss(): string {
  const definitionStyles = listTransitionDefinitions()
    .map((def) => def.styles)
    .filter(Boolean)
    .join("\n\n");

  return `${BASE_TRANSITION_WRAPPERS_CSS}\n\n${definitionStyles}`.trim();
}

export const TRANSITION_STYLES_CSS = buildTransitionStylesCss();

/**
 * Returns the unified transition CSS string.
 */
export function getTransitionStylesCss(): string {
  return buildTransitionStylesCss();
}

/**
 * Injects the unified transition styles into document head if not already present.
 */
export function injectTransitionStyles(targetDocument?: Document): void {
  const doc = targetDocument ?? (typeof document !== "undefined" ? document : undefined);
  if (!doc?.head) return;
  const styleId = "studio-transition-motion-engine";
  if (doc.getElementById(styleId)) return;
  const style = doc.createElement("style");
  style.id = styleId;
  style.textContent = buildTransitionStylesCss();
  doc.head.appendChild(style);
}
