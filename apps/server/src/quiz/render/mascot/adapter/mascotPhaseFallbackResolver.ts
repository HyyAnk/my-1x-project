import {
  adaptMascotV1ToV2,
  filterPreferredVariants,
  isMockFixtureIdentifier,
  resolveMascotStyle,
  type MascotActionType,
  type MascotMotionIntensity,
  type MascotMotionPreset,
  type MascotProfile,
  type MascotPublishedAnimationAsset,
  type MascotRenderBundleV2,
  type MascotStateMediaMode,
  type MascotStateVariant,
  type MascotStyle,
} from "@studio/shared";
import { buildBundleActionV2, variantRegistration } from "./mascotV2BundleBuilder.js";

/**
 * Checks whether the mascot has a dedicated, non-empty asset for the given action.
 */
export function hasDedicatedAction(mascot: MascotProfile, action: MascotActionType): boolean {
  if (mascot.render_bundle) {
    return Boolean(mascot.render_bundle.assets?.actions?.[action]?.image_url?.trim());
  }
  const legacyAction = mascot.actions?.[action];
  return Boolean(legacyAction?.sprite_url?.trim() || legacyAction?.preview_url?.trim());
}

export type ApplyPhaseActionFn = (
  action: MascotActionType,
  url: string,
  motionPreset: MascotMotionPreset,
  speed?: number,
  intensity?: MascotMotionIntensity,
  animation?: MascotPublishedAnimationAsset,
) => void;

function getValidAnchorOrMaster(style: MascotStyle, mascot: MascotProfile): string {
  const candidateAnchor = style.anchor_image_url?.trim();
  if (candidateAnchor && !isMockFixtureIdentifier(candidateAnchor)) return candidateAnchor;
  const candidateMaster = mascot.master_image_url?.trim();
  if (candidateMaster && !isMockFixtureIdentifier(candidateMaster)) return candidateMaster;
  return "";
}

/**
 * Applies fallback assets and presets for the intro phase.
 */
export function applyIntroPhaseFallback(
  mascot: MascotProfile,
  style: MascotStyle,
  celebrateVariants: MascotStateVariant[],
  thinkingVariants: MascotStateVariant[],
  apply: ApplyPhaseActionFn,
  mediaMode: MascotStateMediaMode = "static",
): void {
  if (!hasDedicatedAction(mascot, "wave")) {
    const fallbackVariant = celebrateVariants[0] ?? thinkingVariants[0];
    const isAnimationMode = mediaMode === "animation";
    const fallbackUrl = isAnimationMode
      ? (fallbackVariant?.animation?.transparent_video_url ?? fallbackVariant?.image_url ?? getValidAnchorOrMaster(style, mascot))
      : (fallbackVariant?.image_url ?? fallbackVariant?.transparent_image_url ?? getValidAnchorOrMaster(style, mascot));
    const animationAsset = isAnimationMode ? fallbackVariant?.animation : undefined;
    if (fallbackUrl) {
      apply(
        "wave",
        fallbackUrl,
        fallbackVariant?.motion_preset ?? "wave",
        fallbackVariant?.motion_speed ?? 1.0,
        fallbackVariant?.motion_intensity ?? "normal",
        animationAsset,
      );
    }
  }
}

/**
 * Applies fallback assets and presets for the outro phase.
 */
export function applyOutroPhaseFallback(
  mascot: MascotProfile,
  style: MascotStyle,
  celebrateVariants: MascotStateVariant[],
  thinkingVariants: MascotStateVariant[],
  apply: ApplyPhaseActionFn,
  mediaMode: MascotStateMediaMode = "static",
): void {
  if (!hasDedicatedAction(mascot, "outro")) {
    const fallbackVariant = (celebrateVariants.length > 1 ? celebrateVariants[1] : celebrateVariants[0]) ?? thinkingVariants[0];
    const isAnimationMode = mediaMode === "animation";
    const fallbackUrl = isAnimationMode
      ? (fallbackVariant?.animation?.transparent_video_url ?? fallbackVariant?.image_url ?? getValidAnchorOrMaster(style, mascot))
      : (fallbackVariant?.image_url ?? fallbackVariant?.transparent_image_url ?? getValidAnchorOrMaster(style, mascot));
    const animationAsset = isAnimationMode ? fallbackVariant?.animation : undefined;
    if (fallbackUrl) {
      apply(
        "outro",
        fallbackUrl,
        fallbackVariant?.motion_preset ?? "wave",
        fallbackVariant?.motion_speed ?? 1.0,
        fallbackVariant?.motion_intensity ?? "normal",
        animationAsset,
      );
    }
  }
}

/** Animation mode may substitute the style anchor for a missing state; static mode never does. */
function resolveQuestionAnchor(style: MascotStyle, mediaMode: MascotStateMediaMode): string {
  const candidateAnchor = style.anchor_image_url?.trim();
  return mediaMode === "animation" && candidateAnchor && !isMockFixtureIdentifier(candidateAnchor) ? candidateAnchor : "";
}

function resolveVariantUrl(variant: MascotStateVariant | undefined, isAnimationMode: boolean, fallbackUrl: string): string {
  return isAnimationMode
    ? (variant?.animation?.transparent_video_url ?? variant?.image_url ?? fallbackUrl)
    : (variant?.image_url ?? variant?.transparent_image_url ?? fallbackUrl);
}

type QuestionStateFallback = {
  action: "thinking" | "celebrate";
  variant: MascotStateVariant | undefined;
  defaultMotionPreset: MascotMotionPreset;
};

function applyQuestionStateFallback(
  mascot: MascotProfile,
  validAnchor: string,
  fallback: QuestionStateFallback,
  apply: ApplyPhaseActionFn,
  mediaMode: MascotStateMediaMode,
): void {
  if (hasDedicatedAction(mascot, fallback.action)) return;
  const { variant } = fallback;
  const isAnimationMode = mediaMode === "animation";
  const fallbackUrl = resolveVariantUrl(variant, isAnimationMode, validAnchor);
  if (!fallbackUrl) return;
  apply(
    fallback.action,
    fallbackUrl,
    variant?.motion_preset ?? fallback.defaultMotionPreset,
    variant?.motion_speed ?? 1.0,
    variant?.motion_intensity ?? "normal",
    isAnimationMode ? variant?.animation : undefined,
  );
}

/** Secondary and core styles share the same thinking-then-celebrate fallback order. */
function applyQuestionStateFallbacks(
  mascot: MascotProfile,
  style: MascotStyle,
  celebrateVariants: MascotStateVariant[],
  thinkingVariants: MascotStateVariant[],
  apply: ApplyPhaseActionFn,
  mediaMode: MascotStateMediaMode = "static",
): void {
  const validAnchor = resolveQuestionAnchor(style, mediaMode);
  applyQuestionStateFallback(
    mascot,
    validAnchor,
    { action: "thinking", variant: thinkingVariants[0], defaultMotionPreset: "sway" },
    apply,
    mediaMode,
  );
  applyQuestionStateFallback(
    mascot,
    validAnchor,
    { action: "celebrate", variant: celebrateVariants[0], defaultMotionPreset: "jump" },
    apply,
    mediaMode,
  );
}

/**
 * Applies fallback assets and presets for the question phase.
 */
export function applyQuestionPhaseFallback(
  mascot: MascotProfile,
  style: MascotStyle,
  celebrateVariants: MascotStateVariant[],
  thinkingVariants: MascotStateVariant[],
  apply: ApplyPhaseActionFn,
  mediaMode: MascotStateMediaMode = "static",
): void {
  applyQuestionStateFallbacks(mascot, style, celebrateVariants, thinkingVariants, apply, mediaMode);
}

function pruneSecondaryPhaseActions(
  renderBundle: MascotRenderBundleV2 | null | undefined,
  style: MascotStyle,
  celebrateVariants: MascotStateVariant[],
  thinkingVariants: MascotStateVariant[],
  mediaMode: MascotStateMediaMode,
): void {
  if (!renderBundle) return;
  const isSecondaryStyle = !style.is_default && style.id !== "core";
  if (!isSecondaryStyle && mediaMode !== "static") return;

  const candidateAnchor = style.anchor_image_url?.trim();
  const hasValidAnchor = mediaMode === "animation" && Boolean(candidateAnchor && !isMockFixtureIdentifier(candidateAnchor));

  if (celebrateVariants.length === 0 && !hasValidAnchor) {
    delete renderBundle.assets.actions.celebrate;
    renderBundle.config.visibility.phase_rules.reveal.visible = false;
    renderBundle.config.visibility.phase_rules.explain.visible = false;
  }
  if (thinkingVariants.length === 0 && !hasValidAnchor) {
    delete renderBundle.assets.actions.thinking;
    renderBundle.config.visibility.phase_rules.thinking.visible = false;
    renderBundle.config.visibility.phase_rules.choices.visible = false;
    renderBundle.config.visibility.phase_rules.question.visible = false;
  }
}

/**
 * Graceful fallback for intro, outro, and question clips:
 * - If the mascot lacks a dedicated wave action, intro clip uses the active style's celebrate[0] (or thinking[0] or style anchor or master concept).
 * - If the mascot lacks a dedicated outro action, outro clip uses the active style's celebrate[1] (or celebrate[0] or style anchor or master concept).
 * - Question clips use the active style's first variant or, in animation mode, its style anchor when a state action is missing.
 *   Static mode omits a missing state and does not use the style anchor as a question-state substitute.
 * Modernized to directly register actions into MascotRenderBundleV2 without legacy sprite action synthesis.
 */
export function adaptMascotForPhase(
  mascot: MascotProfile | null | undefined,
  phase: "intro" | "question" | "outro",
  styleId?: string | null,
  mediaMode: MascotStateMediaMode = "static",
): MascotProfile | null | undefined {
  if (!mascot) return mascot;

  const style = resolveMascotStyle(mascot, styleId ?? mascot.active_style_id);
  const celebrateVariants = filterPreferredVariants(style.states?.celebrate, mediaMode);
  const thinkingVariants = filterPreferredVariants(style.states?.thinking, mediaMode);

  const hasDedicated =
    hasDedicatedAction(mascot, "thinking") || hasDedicatedAction(mascot, "celebrate") || hasDedicatedAction(mascot, "idle");

  if (phase === "question" && mediaMode === "static" && !hasDedicated && celebrateVariants.length === 0 && thinkingVariants.length === 0) {
    return null;
  }

  let adaptedRenderBundle = mascot.render_bundle ?? adaptMascotV1ToV2(mascot);
  const variants = [...celebrateVariants, ...thinkingVariants];

  const applyPhaseAction: ApplyPhaseActionFn = (action, url, motionPreset, speed = 1.0, intensity = "normal", animation) => {
    if (adaptedRenderBundle) {
      // A url that came from a measured style variant carries that variant's pixel bounds.
      const sourceVariant = variants.find((variant) => variant.image_url === url || variant.transparent_image_url === url);
      adaptedRenderBundle = {
        ...adaptedRenderBundle,
        assets: {
          ...adaptedRenderBundle.assets,
          actions: {
            ...adaptedRenderBundle.assets.actions,
            [action]: buildBundleActionV2(
              action,
              url,
              motionPreset,
              speed,
              intensity,
              undefined,
              animation,
              sourceVariant ? variantRegistration(sourceVariant) : undefined,
            ),
          },
        },
      };
    }
  };

  if (phase === "intro") {
    applyIntroPhaseFallback(mascot, style, celebrateVariants, thinkingVariants, applyPhaseAction, mediaMode);
  } else if (phase === "outro") {
    applyOutroPhaseFallback(mascot, style, celebrateVariants, thinkingVariants, applyPhaseAction, mediaMode);
  } else if (phase === "question") {
    applyQuestionPhaseFallback(mascot, style, celebrateVariants, thinkingVariants, applyPhaseAction, mediaMode);
    pruneSecondaryPhaseActions(adaptedRenderBundle, style, celebrateVariants, thinkingVariants, mediaMode);
  }

  return {
    ...mascot,
    active_style_id: style.id,
    actions: mascot.actions,
    render_bundle: adaptedRenderBundle ?? undefined,
  };
}
