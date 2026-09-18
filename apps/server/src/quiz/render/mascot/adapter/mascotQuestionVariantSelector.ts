import {
  adaptMascotV1ToV2,
  filterAvailableVariants,
  isMockFixtureIdentifier,
  resolveMascotStyle,
  selectQuestionMascotVariantResult,
  type MascotActionAssetV2,
  type MascotMotionPreset,
  type MascotProfile,
  type MascotRenderBundleV2,
  type MascotSpriteAction,
  type MascotStateVariant,
  type MascotStyle,
} from "@studio/shared";
import {
  findSnapshotEntry,
  recordMascotAnimationSnapshotEntry,
  type MascotAnimationRenderSnapshot,
} from "../../animationRenderSnapshot.js";
import { buildLegacySpriteAction } from "./mascotV1ActionBuilder.js";
import { buildBundleActionV2 } from "./mascotV2BundleBuilder.js";

/**
 * Resolves the active MascotStyle for a question or scene.
 * If styleId is "cycle" or "all", cycles through available styles based on questionIndex.
 */
export function resolveMascotQuestionStyle(mascot: MascotProfile, styleId?: string | null, questionIndex = 0): MascotStyle {
  if (mascot.styles && mascot.styles.length > 0) {
    if (styleId === "cycle" || styleId === "all") {
      return mascot.styles[questionIndex % mascot.styles.length];
    }
  }
  return resolveMascotStyle(mascot, styleId);
}

/**
 * Resolves a legacy V1 sprite action for a specific question state.
 * @deprecated Legacy V1 sprite action resolver. Retained for backward compatibility only. Use `resolveQuestionBundleAction` instead for canonical V2 render bundles.
 */
export function resolveQuestionAction(
  type: "thinking" | "celebrate",
  variant: MascotStateVariant | null,
  anchorImageUrl: string | null | undefined,
  existing?: MascotSpriteAction | null,
  isSecondaryStyle = false,
): MascotSpriteAction | undefined {
  const defaultPreset: MascotMotionPreset = type === "thinking" ? "sway" : "jump";
  if (variant) {
    const mediaUrl = variant.animation?.transparent_video_url || variant.image_url || variant.transparent_image_url;
    if (mediaUrl) {
      return buildLegacySpriteAction(
        type,
        mediaUrl,
        variant.motion_preset ?? existing?.motion_preset ?? defaultPreset,
        variant.motion_speed ?? existing?.motion_speed ?? 1.0,
        variant.motion_intensity ?? existing?.motion_intensity ?? "normal",
        existing,
      );
    }
  }
  const candidateAnchor = anchorImageUrl?.trim();
  if (candidateAnchor && !isMockFixtureIdentifier(candidateAnchor)) {
    return buildLegacySpriteAction(type, candidateAnchor, defaultPreset, 1.0, "normal", existing);
  }
  if (isSecondaryStyle) {
    return undefined;
  }
  if (existing?.sprite_url?.trim() || existing?.preview_url?.trim()) {
    return existing;
  }
  return undefined;
}

/**
 * Resolves a modern V2 bundle action for a specific question state.
 */
export function resolveQuestionBundleAction(
  type: "thinking" | "celebrate",
  variant: MascotStateVariant | null,
  anchorImageUrl: string | null | undefined,
  existing?: MascotActionAssetV2 | null,
  isSecondaryStyle = false,
): MascotActionAssetV2 | undefined {
  const defaultPreset: MascotMotionPreset = type === "thinking" ? "sway" : "jump";
  if (variant) {
    const mediaUrl = variant.animation?.transparent_video_url || variant.image_url || variant.transparent_image_url;
    if (mediaUrl) {
      return buildBundleActionV2(
        type,
        mediaUrl,
        variant.motion_preset ?? existing?.motion?.preset ?? defaultPreset,
        variant.motion_speed ?? existing?.motion?.speed ?? 1.0,
        variant.motion_intensity ?? existing?.motion?.intensity ?? "normal",
        existing,
        variant.animation,
      );
    }
  }
  const candidateAnchor = anchorImageUrl?.trim();
  if (candidateAnchor && !isMockFixtureIdentifier(candidateAnchor)) {
    return buildBundleActionV2(type, candidateAnchor, defaultPreset, 1.0, "normal", existing);
  }
  if (isSecondaryStyle) {
    return undefined;
  }
  if (existing?.image_url?.trim()) {
    return existing;
  }
  return undefined;
}

export interface MascotQuestionAdaptOptions {
  videoId?: string;
  questionId?: string;
  previousSlotIndex?: {
    thinking?: number;
    celebrate?: number;
  };
  snapshot?: MascotAnimationRenderSnapshot;
}

function tryResolveSnapshotVariant(
  options: MascotQuestionAdaptOptions | undefined,
  videoId: string,
  questionId: string,
  state: "thinking" | "celebrate",
  styleId: string,
  variants: MascotStateVariant[],
): MascotStateVariant | null {
  if (!options?.snapshot) return null;
  const existingEntry = findSnapshotEntry(options.snapshot, {
    videoId,
    questionId,
    state,
    styleId,
  });
  return existingEntry ? (variants.find((v) => v.slot_index === existingEntry.slot_index) ?? null) : null;
}

/**
 * Deterministically selects a state variant for a question using render snapshot or pseudo-random selection.
 */
export function selectVariantForQuestionState(
  state: "thinking" | "celebrate",
  variants: MascotStateVariant[],
  styleId: string,
  questionIndex: number,
  options?: MascotQuestionAdaptOptions,
): MascotStateVariant | null {
  if (variants.length === 0) return null;

  const videoId = options?.videoId || "preview_video";
  const questionId = options?.questionId || `q_${questionIndex}`;

  const cached = tryResolveSnapshotVariant(options, videoId, questionId, state, styleId, variants);
  if (cached) return cached;

  const prevSlot = state === "thinking" ? options?.previousSlotIndex?.thinking : options?.previousSlotIndex?.celebrate;

  const selection = selectQuestionMascotVariantResult({
    videoId,
    questionId,
    state,
    styleId,
    variants,
    previousSlotIndex: prevSlot,
  });

  if (!selection) return null;

  if (options?.snapshot) {
    recordMascotAnimationSnapshotEntry(options.snapshot, {
      videoId,
      questionId,
      state,
      styleId,
      slot_index: selection.slot_index,
      revision: selection.revision,
      seed: selection.seed,
      candidate_index: selection.candidate_index,
      fingerprint: selection.variant.animation?.content_fingerprint,
      atlas_url: selection.variant.animation?.atlas_url,
      transparent_video_url: selection.variant.animation?.transparent_video_url,
      alpha_codec: selection.variant.animation?.alpha_codec,
    });
  }

  return selection.variant;
}

function adaptRenderBundleForQuestion(
  bundle: MascotRenderBundleV2,
  style: MascotStyle,
  thinkingVariant: MascotStateVariant | null,
  celebrateVariant: MascotStateVariant | null,
  isSecondaryStyle: boolean,
): MascotRenderBundleV2 {
  const actionsCopy = { ...(bundle.assets?.actions ?? {}) };
  const bundleThinking = resolveQuestionBundleAction(
    "thinking",
    thinkingVariant,
    style.anchor_image_url,
    actionsCopy.thinking,
    isSecondaryStyle,
  );
  if (bundleThinking) {
    actionsCopy.thinking = bundleThinking;
  } else {
    delete actionsCopy.thinking;
  }

  const bundleCelebrate = resolveQuestionBundleAction(
    "celebrate",
    celebrateVariant,
    style.anchor_image_url,
    actionsCopy.celebrate,
    isSecondaryStyle,
  );
  if (bundleCelebrate) {
    actionsCopy.celebrate = bundleCelebrate;
  } else {
    delete actionsCopy.celebrate;
  }

  const phaseRules = { ...bundle.config.visibility.phase_rules };
  if (!bundleThinking) {
    phaseRules.thinking = { ...phaseRules.thinking, visible: false };
    phaseRules.choices = { ...phaseRules.choices, visible: false };
  }
  if (!bundleCelebrate) {
    phaseRules.reveal = { ...phaseRules.reveal, visible: false };
    phaseRules.explain = { ...phaseRules.explain, visible: false };
  }

  return {
    ...bundle,
    config: {
      ...bundle.config,
      visibility: {
        ...bundle.config.visibility,
        phase_rules: phaseRules,
      },
    },
    assets: {
      ...bundle.assets,
      actions: actionsCopy,
    },
  };
}

/**
 * Adapts a MascotProfile for a specific question clip by deterministically selecting
 * thinking and celebrate variants according to questionId, videoId, and styleId.
 * Modernized to directly adapt MascotRenderBundleV2 without legacy sprite action mutation.
 */
export function adaptMascotForQuestion(
  mascot: MascotProfile | null | undefined,
  styleId?: string | null,
  questionIndex = 0,
  options?: MascotQuestionAdaptOptions,
): MascotProfile | null | undefined {
  if (!mascot) return mascot;

  const style = resolveMascotQuestionStyle(mascot, styleId, questionIndex);
  const thinkingVariants = filterAvailableVariants(style.states?.thinking);
  const celebrateVariants = filterAvailableVariants(style.states?.celebrate);

  const thinkingVariant = selectVariantForQuestionState("thinking", thinkingVariants, style.id, questionIndex, options);
  const celebrateVariant = selectVariantForQuestionState("celebrate", celebrateVariants, style.id, questionIndex, options);

  const isSecondaryStyle = !style.is_default && style.id !== "core";

  const baseBundle = mascot.render_bundle ?? adaptMascotV1ToV2(mascot);
  const adaptedRenderBundle = baseBundle
    ? adaptRenderBundleForQuestion(baseBundle, style, thinkingVariant, celebrateVariant, isSecondaryStyle)
    : undefined;

  const actionsCopy = mascot.actions ? { ...mascot.actions } : undefined;
  if (isSecondaryStyle && actionsCopy) {
    if (!thinkingVariant && !style.anchor_image_url) delete actionsCopy.thinking;
    if (!celebrateVariant && !style.anchor_image_url) delete actionsCopy.celebrate;
  }

  return {
    ...mascot,
    active_style_id: style.id,
    ...(actionsCopy ? { actions: actionsCopy } : {}),
    render_bundle: adaptedRenderBundle,
  };
}
