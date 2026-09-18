import {
  adaptMascotV1ToV2,
  filterAvailableVariants,
  isMockFixtureIdentifier,
  resolveMascotStyle,
  type MascotActionType,
  type MascotMotionIntensity,
  type MascotMotionPreset,
  type MascotProfile,
  type MascotPublishedAnimationAsset,
  type MascotRenderBundleV2,
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
): void {
  if (!hasDedicatedAction(mascot, "wave")) {
    const fallbackVariant = celebrateVariants[0] ?? thinkingVariants[0];
    const fallbackUrl =
      fallbackVariant?.animation?.transparent_video_url ?? fallbackVariant?.image_url ?? getValidAnchorOrMaster(style, mascot);
    if (fallbackUrl) {
      apply(
        "wave",
        fallbackUrl,
        fallbackVariant?.motion_preset ?? "wave",
        fallbackVariant?.motion_speed ?? 1.0,
        fallbackVariant?.motion_intensity ?? "normal",
        fallbackVariant?.animation,
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
): void {
  if (!hasDedicatedAction(mascot, "outro")) {
    const fallbackVariant = (celebrateVariants.length > 1 ? celebrateVariants[1] : celebrateVariants[0]) ?? thinkingVariants[0];
    const fallbackUrl =
      fallbackVariant?.animation?.transparent_video_url ?? fallbackVariant?.image_url ?? getValidAnchorOrMaster(style, mascot);
    if (fallbackUrl) {
      apply(
        "outro",
        fallbackUrl,
        fallbackVariant?.motion_preset ?? "wave",
        fallbackVariant?.motion_speed ?? 1.0,
        fallbackVariant?.motion_intensity ?? "normal",
        fallbackVariant?.animation,
      );
    }
  }
}

function applySecondaryQuestionFallback(
  style: MascotStyle,
  celebrateVariants: MascotStateVariant[],
  thinkingVariants: MascotStateVariant[],
  apply: ApplyPhaseActionFn,
): void {
  const candidateAnchor = style.anchor_image_url?.trim();
  const validAnchor = candidateAnchor && !isMockFixtureIdentifier(candidateAnchor) ? candidateAnchor : "";

  const thinkingFallback = thinkingVariants[0];
  const thinkingUrl = thinkingFallback?.animation?.transparent_video_url ?? thinkingFallback?.image_url ?? validAnchor;
  if (thinkingUrl) {
    apply(
      "thinking",
      thinkingUrl,
      thinkingFallback?.motion_preset ?? "sway",
      thinkingFallback?.motion_speed ?? 1.0,
      thinkingFallback?.motion_intensity ?? "normal",
      thinkingFallback?.animation,
    );
  }

  const celebrateFallback = celebrateVariants[0];
  const celebrateUrl = celebrateFallback?.animation?.transparent_video_url ?? celebrateFallback?.image_url ?? validAnchor;
  if (celebrateUrl) {
    apply(
      "celebrate",
      celebrateUrl,
      celebrateFallback?.motion_preset ?? "jump",
      celebrateFallback?.motion_speed ?? 1.0,
      celebrateFallback?.motion_intensity ?? "normal",
      celebrateFallback?.animation,
    );
  }
}

function applyCoreThinkingFallback(
  mascot: MascotProfile,
  validAnchor: string,
  thinkingVariants: MascotStateVariant[],
  apply: ApplyPhaseActionFn,
): void {
  if (hasDedicatedAction(mascot, "thinking")) return;
  const fallbackVariant = thinkingVariants[0];
  const fallbackUrl = fallbackVariant?.animation?.transparent_video_url ?? fallbackVariant?.image_url ?? validAnchor;
  if (!fallbackUrl) return;
  apply(
    "thinking",
    fallbackUrl,
    fallbackVariant?.motion_preset ?? "sway",
    fallbackVariant?.motion_speed ?? 1.0,
    fallbackVariant?.motion_intensity ?? "normal",
    fallbackVariant?.animation,
  );
}

function applyCoreCelebrateFallback(
  mascot: MascotProfile,
  validAnchor: string,
  celebrateVariants: MascotStateVariant[],
  apply: ApplyPhaseActionFn,
): void {
  if (hasDedicatedAction(mascot, "celebrate")) return;
  const fallbackVariant = celebrateVariants[0];
  const fallbackUrl = fallbackVariant?.animation?.transparent_video_url ?? fallbackVariant?.image_url ?? validAnchor;
  if (!fallbackUrl) return;
  apply(
    "celebrate",
    fallbackUrl,
    fallbackVariant?.motion_preset ?? "jump",
    fallbackVariant?.motion_speed ?? 1.0,
    fallbackVariant?.motion_intensity ?? "normal",
    fallbackVariant?.animation,
  );
}

function applyCoreQuestionFallback(
  mascot: MascotProfile,
  style: MascotStyle,
  celebrateVariants: MascotStateVariant[],
  thinkingVariants: MascotStateVariant[],
  apply: ApplyPhaseActionFn,
): void {
  const candidateAnchor = style.anchor_image_url?.trim();
  const validAnchor = candidateAnchor && !isMockFixtureIdentifier(candidateAnchor) ? candidateAnchor : "";

  applyCoreThinkingFallback(mascot, validAnchor, thinkingVariants, apply);
  applyCoreCelebrateFallback(mascot, validAnchor, celebrateVariants, apply);
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
): void {
  const isSecondaryStyle = !style.is_default && style.id !== "core";
  if (isSecondaryStyle) {
    applySecondaryQuestionFallback(style, celebrateVariants, thinkingVariants, apply);
    return;
  }
  applyCoreQuestionFallback(mascot, style, celebrateVariants, thinkingVariants, apply);
}

function pruneSecondaryPhaseActions(
  renderBundle: MascotRenderBundleV2 | null | undefined,
  style: MascotStyle,
  celebrateVariants: MascotStateVariant[],
  thinkingVariants: MascotStateVariant[],
): void {
  const isSecondaryStyle = !style.is_default && style.id !== "core";
  if (!isSecondaryStyle || !renderBundle) return;

  const candidateAnchor = style.anchor_image_url?.trim();
  const hasValidAnchor = Boolean(candidateAnchor && !isMockFixtureIdentifier(candidateAnchor));

  if (celebrateVariants.length === 0 && !hasValidAnchor) {
    delete renderBundle.assets.actions.celebrate;
    renderBundle.config.visibility.phase_rules.reveal.visible = false;
    renderBundle.config.visibility.phase_rules.explain.visible = false;
  }
  if (thinkingVariants.length === 0 && !hasValidAnchor) {
    delete renderBundle.assets.actions.thinking;
    renderBundle.config.visibility.phase_rules.thinking.visible = false;
    renderBundle.config.visibility.phase_rules.choices.visible = false;
    if (celebrateVariants.length === 0 && !hasValidAnchor) {
      renderBundle.config.visibility.phase_rules.question.visible = false;
    }
  }
}

/**
 * Graceful Fallback for Intro, Outro, and Question clips:
 * - If the mascot lacks a dedicated wave action, intro clip uses the active style's celebrate[0] (or thinking[0] or style anchor or master concept).
 * - If the mascot lacks a dedicated outro action, outro clip uses the active style's celebrate[1] (or celebrate[0] or style anchor or master concept).
 * - If the mascot lacks thinking or celebrate in a question clip, falls back to active style's first variant or style anchor.
 * Modernized to directly register actions into MascotRenderBundleV2 without legacy sprite action synthesis.
 */
export function adaptMascotForPhase(
  mascot: MascotProfile | null | undefined,
  phase: "intro" | "question" | "outro",
  styleId?: string | null,
): MascotProfile | null | undefined {
  if (!mascot) return mascot;

  const style = resolveMascotStyle(mascot, styleId ?? mascot.active_style_id);
  const celebrateVariants = filterAvailableVariants(style.states?.celebrate);
  const thinkingVariants = filterAvailableVariants(style.states?.thinking);

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
    applyIntroPhaseFallback(mascot, style, celebrateVariants, thinkingVariants, applyPhaseAction);
  } else if (phase === "outro") {
    applyOutroPhaseFallback(mascot, style, celebrateVariants, thinkingVariants, applyPhaseAction);
  } else if (phase === "question") {
    applyQuestionPhaseFallback(mascot, style, celebrateVariants, thinkingVariants, applyPhaseAction);
    pruneSecondaryPhaseActions(adaptedRenderBundle, style, celebrateVariants, thinkingVariants);
  }

  return {
    ...mascot,
    active_style_id: style.id,
    actions: mascot.actions,
    render_bundle: adaptedRenderBundle ?? undefined,
  };
}
