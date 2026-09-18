import type { QuizVisualTemplate } from "./types.js";
import { candyArcadePalettes, resolvePalette } from "./candyArcade/palettes.js";
import { candyArcadeStyleBible, candyArcadeTokens } from "./candyArcade/tokens.js";
import { resolveMotion, resolveTransition } from "./candyArcade/motion.js";

export const candyArcadeTemplate: QuizVisualTemplate = {
  id: "candy_arcade",
  displayName: "Candy Arcade",
  tokens: candyArcadeTokens,
  styleBible: candyArcadeStyleBible,
  palettes: candyArcadePalettes,
  resolveScene(context) {
    const palette = resolvePalette(context.requestedPalette, context.questionIndex, context.previousPaletteId);
    return {
      palette,
      layoutId: context.resolvedLayoutId,
      motionId: resolveMotion(context.requestedMotion, context.questionIndex),
      transitionId: resolveTransition(context.requestedTransition),
    };
  },
};

export { candyArcadeTokens, candyArcadeStyleBible, roundedFont, headlineFont } from "./candyArcade/tokens.js";

export { candyArcadePalettes, resolvePalette } from "./candyArcade/palettes.js";

export { textTier, textLayout, type TextLayoutOptions } from "./candyArcade/typography.js";

export {
  resolveMotion,
  resolveTransition,
  motionCssClass,
  timelineProgress,
  quizTimerState,
  type QuizTimerState,
  type AmbientMotionKind,
  ambientPhaseSeconds,
  ambientPeriodSeconds,
  visualAnswerState,
} from "./candyArcade/motion.js";
