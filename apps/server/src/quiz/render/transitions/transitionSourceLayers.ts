import type { ResolvedTransitionInstance } from "@studio/shared";

export type SourceLayerSelectors = {
  outgoingSelector: string;
  incomingSelector: string;
};

/**
 * Generates CSS rules to cleanly hand off source visibility between inner wrappers
 * at the exact boundary frame of a resolved transition instance.
 * Does NOT alter or take ownership of HyperFrames clip-level display.
 */
export function applyTransitionSourceHandoff(
  instance: ResolvedTransitionInstance,
  sourceLayers: SourceLayerSelectors,
): string {
  const fps = instance.fps.numerator / instance.fps.denominator;
  const boundarySeconds = instance.boundaryFrame / fps;

  return `
/* Transition source handoff for ${instance.instanceId} */
${sourceLayers.outgoingSelector} {
  /* Visible until boundary time ${boundarySeconds.toFixed(3)}s */
  --transition-boundary: ${boundarySeconds.toFixed(3)}s;
}
${sourceLayers.incomingSelector} {
  /* Visible from boundary time ${boundarySeconds.toFixed(3)}s */
  --transition-boundary: ${boundarySeconds.toFixed(3)}s;
}
`.trim();
}
