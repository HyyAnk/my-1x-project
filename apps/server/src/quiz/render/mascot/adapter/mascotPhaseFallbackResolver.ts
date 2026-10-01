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
import { buildBundleActionV2 } from "./mascotV2BundleBuilder.js";

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

function applySecondaryQuestionFallback(
  mascot: MascotProfile,
  style: MascotStyle,
  celebrateVariants: MascotStateVariant[],
  thinkingVariants: MascotStateVariant[],
  apply: ApplyPhaseActionFn,
  mediaMode: MascotStateMediaMode = "static",
): void {
  const candidateAnchor = style.anchor_image_url?.trim();
  const validAnchor = mediaMode === "animation" && candidateAnchor && !isMockFixtureIdentifier(candidateAnchor) ? candidateAnchor : "";
  const isAnimationMode = mediaMode === "animation";

  const thinkingFallback = thinkingVariants[0];
  const thinkingUrl = isAnimationMode
    ? (thinkingFallback?.animation?.transparent_video_url ?? thinkingFallback?.image_url ?? validAnchor)
    : (thinkingFallback?.image_url ?? thinkingFallback?.transparent_image_url ?? validAnchor);
  if (thinkingUrl && !hasDedicatedAction(mascot, "thinking")) {
    apply(
      "thinking",
      thinkingUrl,
      thinkingFallback?.motion_preset ?? "sway",
      thinkingFallback?.motion_speed ?? 1.0,
      thinkingFallback?.motion_intensity ?? "normal",
      isAnimationMode ? thinkingFallback?.animation : undefined,
    );
  }

  const celebrateFallback = celebrateVariants[0];
  const celebrateUrl = isAnimationMode
    ? (celebrateFallback?.animation?.transparent_video_url ?? celebrateFallback?.image_url ?? validAnchor)
    : (celebrateFallback?.image_url ?? celebrateFallback?.transparent_image_url ?? validAnchor);
  if (celebrateUrl && !hasDedicatedAction(mascot, "celebrate")) {
    apply(
      "celebrate",
      celebrateUrl,
      celebrateFallback?.motion_preset ?? "jump",
      celebrateFallback?.motion_speed ?? 1.0,
      celebrateFallback?.motion_intensity ?? "normal",
      isAnimationMode ? celebrateFallback?.animation : undefined,
    );
  }
}

function applyCoreThinkingFallback(
  mascot: MascotProfile,
  validAnchor: string,
  thinkingVariants: MascotStateVariant[],
  apply: ApplyPhaseActionFn,
  mediaMode: MascotStateMediaMode = "static",
): void {
  if (hasDedicatedAction(mascot, "thinking")) return;
  const fallbackVariant = thinkingVariants[0];
  const isAnimationMode = mediaMode === "animation";
  const fallbackUrl = isAnimationMode
    ? (fallbackVariant?.animation?.transparent_video_url ?? fallbackVariant?.image_url ?? validAnchor)
    : (fallbackVariant?.image_url ?? fallbackVariant?.transparent_image_url ?? validAnchor);
  if (!fallbackUrl) return;
  apply(
    "thinking",
    fallbackUrl,
    fallbackVariant?.motion_preset ?? "sway",
    fallbackVariant?.motion_speed ?? 1.0,
    fallbackVariant?.motion_intensity ?? "normal",
    isAnimationMode ? fallbackVariant?.animation : undefined,
  );
}

function applyCoreCelebrateFallback(
  mascot: MascotProfile,
  validAnchor: string,
  celebrateVariants: MascotStateVariant[],
  apply: ApplyPhaseActionFn,
  mediaMode: MascotStateMediaMode = "static",
): void {
  if (hasDedicatedAction(mascot, "celebrate")) return;
  const fallbackVariant = celebrateVariants[0];
  const isAnimationMode = mediaMode === "animation";
  const fallbackUrl = isAnimationMode
    ? (fallbackVariant?.animation?.transparent_video_url ?? fallbackVariant?.image_url ?? validAnchor)
    : (fallbackVariant?.image_url ?? fallbackVariant?.transparent_image_url ?? validAnchor);
  if (!fallbackUrl) return;
  apply(
    "celebrate",
    fallbackUrl,
    fallbackVariant?.motion_preset ?? "jump",
    fallbackVariant?.motion_speed ?? 1.0,
    fallbackVariant?.motion_intensity ?? "normal",
    isAnimationMode ? fallbackVariant?.animation : undefined,
  );
}

function applyCoreQuestionFallback(
  mascot: MascotProfile,
  style: MascotStyle,
  celebrateVariants: MascotStateVariant[],
  thinkingVariants: MascotStateVariant[],
  apply: ApplyPhaseActionFn,
  mediaMode: MascotStateMediaMode = "static",
): void {
  const candidateAnchor = style.anchor_image_url?.trim();
  const validAnchor = mediaMode === "animation" && candidateAnchor && !isMockFixtureIdentifier(candidateAnchor) ? candidateAnchor : "";

  applyCoreThinkingFallback(mascot, validAnchor, thinkingVariants, apply, mediaMode);
  applyCoreCelebrateFallback(mascot, validAnchor, celebrateVariants, apply, mediaMode);
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
  const isSecondaryStyle = !style.is_default && style.id !== "core";
  if (isSecondaryStyle) {
    applySecondaryQuestionFallback(mascot, style, celebrateVariants, thinkingVariants, apply, mediaMode);
    return;
  }
  applyCoreQuestionFallback(mascot, style, celebrateVariants, thinkingVariants, apply, mediaMode);
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

  if (phase === "question" && mediaMode === "static" && celebrateVariants.length === 0 && thinkingVariants.length === 0) {
    return null;
  }

  let adaptedRenderBundle = mascot.render_bundle ?? adaptMascotV1ToV2(mascot);

  const applyPhaseAction: ApplyPhaseActionFn = (action, url, motionPreset, speed = 1.0, intensity = "normal", animation) => {
    if (adaptedRenderBundle) {
      adaptedRenderBundle = {
        ...adaptedRenderBundle,
        assets: {
          ...adaptedRenderBundle.assets,
          actions: {
            ...adaptedRenderBundle.assets.actions,
            [action]: buildBundleActionV2(action, url, motionPreset, speed, intensity, undefined, animation),
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
