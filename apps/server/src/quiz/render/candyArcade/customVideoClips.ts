// Stable entry point for existing renderers and extensions.
export { customIntroVideoClip } from "./customIntroVideoClip.js";
export { customOutroVideoClip } from "./customOutroVideoClip.js";
export {
  calculateIntroTransitionTiming,
  renderIntroTransitionOverlay,
  resolveTransitionDefinition,
  type IntroTransitionColors,
} from "./introVideoTransition.js";
