/**
 * Production Mascot State Adapter Facade
 * Backward-compatible entrypoint delegating to modular adapter components.
 */

export {
  /** @deprecated Legacy V1 sprite action builder. Use buildBundleActionV2 instead. */
  buildLegacySpriteAction,
} from "./adapter/mascotV1ActionBuilder.js";

export { DEFAULT_ACTION_REGISTRATION, buildBundleActionV2 } from "./adapter/mascotV2BundleBuilder.js";

export {
  resolveMascotQuestionStyle,
  /** @deprecated Legacy V1 sprite action resolver. Use resolveQuestionBundleAction instead. */
  resolveQuestionAction,
  resolveQuestionBundleAction,
  selectVariantForQuestionState,
  adaptMascotForQuestion,
  type MascotQuestionAdaptOptions,
} from "./adapter/mascotQuestionVariantSelector.js";

export {
  hasDedicatedAction,
  applyIntroPhaseFallback,
  applyOutroPhaseFallback,
  applyQuestionPhaseFallback,
  adaptMascotForPhase,
  type ApplyPhaseActionFn,
} from "./adapter/mascotPhaseFallbackResolver.js";
