import {
  resolveMascotStyle,
  type MascotActionAssetV2,
  type MascotActionType,
  type MascotMotionIntensity,
  type MascotMotionPreset,
  type MascotProfile,
  type MascotSpriteAction,
  type MascotStateVariant,
  type MascotStyle,
} from "@studio/shared";

const DEFAULT_ACTION_REGISTRATION = {
  source_width: 512,
  source_height: 512,
  content_bounds: { x: 0, y: 0, width: 512, height: 512 },
  pivot: { x: 256, y: 512 },
  offset_x: 0,
  offset_y: 0,
} as const;

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
 * Checks whether the mascot has a dedicated, non-empty asset for the given action.
 */
export function hasDedicatedAction(mascot: MascotProfile, action: MascotActionType): boolean {
  const legacyAction = mascot.actions?.[action];
  const bundleAction = mascot.render_bundle?.assets?.actions?.[action];
  return Boolean(legacyAction?.sprite_url?.trim() || legacyAction?.preview_url?.trim() || bundleAction?.image_url?.trim());
}

function buildLegacySpriteAction(
  action: MascotActionType,
  imageUrl: string,
  motionPreset: MascotMotionPreset,
  motionSpeed = 1.0,
  motionIntensity: MascotMotionIntensity = "normal",
  existing?: MascotSpriteAction | null,
): MascotSpriteAction {
  return {
    action,
    sprite_url: imageUrl,
    preview_url: imageUrl,
    frames_count: existing?.frames_count ?? 1,
    fps: existing?.fps ?? 8,
    loop: existing?.loop ?? true,
    frame_width: existing?.frame_width ?? 512,
    frame_height: existing?.frame_height ?? 512,
    offset_x: existing?.offset_x ?? 0,
    offset_y: existing?.offset_y ?? 0,
    motion_preset: motionPreset,
    motion_speed: motionSpeed,
    motion_intensity: motionIntensity,
  };
}

function buildBundleActionV2(
  action: MascotActionType,
  imageUrl: string,
  motionPreset: MascotMotionPreset,
  motionSpeed = 1.0,
  motionIntensity: MascotMotionIntensity = "normal",
  existing?: MascotActionAssetV2 | null,
): MascotActionAssetV2 {
  return {
    version: 2,
    action,
    image_url: imageUrl,
    motion: {
      preset: motionPreset,
      speed: motionSpeed,
      intensity: motionIntensity,
    },
    registration: existing?.registration ?? DEFAULT_ACTION_REGISTRATION,
  };
}

/**
 * Adapts a MascotProfile for a specific question clip by deterministically rotating
 * thinking and celebrate variants according to questionIndex.
 */
function resolveQuestionAction(
  type: "thinking" | "celebrate",
  variant: MascotStateVariant | null,
  anchorImageUrl: string | null | undefined,
  existing?: MascotSpriteAction | null,
): MascotSpriteAction | undefined {
  const defaultPreset: MascotMotionPreset = type === "thinking" ? "sway" : "jump";
  if (variant) {
    return buildLegacySpriteAction(
      type,
      variant.image_url,
      variant.motion_preset ?? existing?.motion_preset ?? defaultPreset,
      variant.motion_speed ?? existing?.motion_speed ?? 1.0,
      variant.motion_intensity ?? existing?.motion_intensity ?? "normal",
      existing,
    );
  }
  if (anchorImageUrl?.trim()) {
    return buildLegacySpriteAction(type, anchorImageUrl.trim(), defaultPreset, 1.0, "normal", existing);
  }
  return existing ?? undefined;
}

function resolveQuestionBundleAction(
  type: "thinking" | "celebrate",
  variant: MascotStateVariant | null,
  anchorImageUrl: string | null | undefined,
  existing?: MascotActionAssetV2 | null,
): MascotActionAssetV2 | undefined {
  const defaultPreset: MascotMotionPreset = type === "thinking" ? "sway" : "jump";
  if (variant) {
    return buildBundleActionV2(
      type,
      variant.image_url,
      variant.motion_preset ?? existing?.motion?.preset ?? defaultPreset,
      variant.motion_speed ?? existing?.motion?.speed ?? 1.0,
      variant.motion_intensity ?? existing?.motion?.intensity ?? "normal",
      existing,
    );
  }
  if (anchorImageUrl?.trim()) {
    return buildBundleActionV2(type, anchorImageUrl.trim(), defaultPreset, 1.0, "normal", existing);
  }
  return existing ?? undefined;
}

/**
 * Adapts a MascotProfile for a specific question clip by deterministically rotating
 * thinking and celebrate variants according to questionIndex.
 */
export function adaptMascotForQuestion(
  mascot: MascotProfile | null | undefined,
  styleId?: string | null,
  questionIndex = 0,
): MascotProfile | null | undefined {
  if (!mascot) return mascot;

  const style = resolveMascotQuestionStyle(mascot, styleId, questionIndex);
  const thinkingVariants = (style.states?.thinking ?? []).filter((v) => Boolean(v.image_url?.trim()));
  const celebrateVariants = (style.states?.celebrate ?? []).filter((v) => Boolean(v.image_url?.trim()));

  const thinkingVariant = thinkingVariants.length > 0 ? thinkingVariants[questionIndex % thinkingVariants.length] : null;
  const celebrateVariant = celebrateVariants.length > 0 ? celebrateVariants[questionIndex % celebrateVariants.length] : null;

  const newActions = { ...mascot.actions };
  const thinkingAction = resolveQuestionAction("thinking", thinkingVariant, style.anchor_image_url, mascot.actions?.thinking);
  if (thinkingAction) newActions.thinking = thinkingAction;

  const celebrateAction = resolveQuestionAction("celebrate", celebrateVariant, style.anchor_image_url, mascot.actions?.celebrate);
  if (celebrateAction) newActions.celebrate = celebrateAction;

  let adaptedRenderBundle = mascot.render_bundle;
  if (mascot.render_bundle) {
    const actionsCopy = { ...(mascot.render_bundle.assets?.actions ?? {}) };
    const bundleThinking = resolveQuestionBundleAction("thinking", thinkingVariant, style.anchor_image_url, actionsCopy.thinking);
    if (bundleThinking) actionsCopy.thinking = bundleThinking;

    const bundleCelebrate = resolveQuestionBundleAction("celebrate", celebrateVariant, style.anchor_image_url, actionsCopy.celebrate);
    if (bundleCelebrate) actionsCopy.celebrate = bundleCelebrate;

    adaptedRenderBundle = {
      ...mascot.render_bundle,
      assets: {
        ...mascot.render_bundle.assets,
        actions: actionsCopy,
      },
    };
  }

  return {
    ...mascot,
    active_style_id: style.id,
    actions: newActions,
    render_bundle: adaptedRenderBundle,
  };
}

type ApplyPhaseActionFn = (
  action: MascotActionType,
  url: string,
  motionPreset: MascotMotionPreset,
  speed?: number,
  intensity?: MascotMotionIntensity,
) => void;

function applyIntroPhaseFallback(
  mascot: MascotProfile,
  style: MascotStyle,
  celebrateVariants: MascotStateVariant[],
  thinkingVariants: MascotStateVariant[],
  apply: ApplyPhaseActionFn,
): void {
  if (!hasDedicatedAction(mascot, "wave")) {
    const fallbackVariant = celebrateVariants[0] ?? thinkingVariants[0];
    const fallbackUrl = fallbackVariant?.image_url ?? style.anchor_image_url?.trim() ?? mascot.master_image_url?.trim() ?? "";
    if (fallbackUrl) {
      apply(
        "wave",
        fallbackUrl,
        fallbackVariant?.motion_preset ?? "wave",
        fallbackVariant?.motion_speed ?? 1.0,
        fallbackVariant?.motion_intensity ?? "normal",
      );
    }
  }
}

function applyOutroPhaseFallback(
  mascot: MascotProfile,
  style: MascotStyle,
  celebrateVariants: MascotStateVariant[],
  thinkingVariants: MascotStateVariant[],
  apply: ApplyPhaseActionFn,
): void {
  if (!hasDedicatedAction(mascot, "outro")) {
    const fallbackVariant = (celebrateVariants.length > 1 ? celebrateVariants[1] : celebrateVariants[0]) ?? thinkingVariants[0];
    const fallbackUrl = fallbackVariant?.image_url ?? style.anchor_image_url?.trim() ?? mascot.master_image_url?.trim() ?? "";
    if (fallbackUrl) {
      apply(
        "outro",
        fallbackUrl,
        fallbackVariant?.motion_preset ?? "wave",
        fallbackVariant?.motion_speed ?? 1.0,
        fallbackVariant?.motion_intensity ?? "normal",
      );
    }
  }
}

function applyQuestionPhaseFallback(
  mascot: MascotProfile,
  style: MascotStyle,
  celebrateVariants: MascotStateVariant[],
  thinkingVariants: MascotStateVariant[],
  apply: ApplyPhaseActionFn,
): void {
  if (!hasDedicatedAction(mascot, "thinking")) {
    const fallbackVariant = thinkingVariants[0];
    const fallbackUrl = fallbackVariant?.image_url ?? style.anchor_image_url?.trim() ?? "";
    if (fallbackUrl) {
      apply(
        "thinking",
        fallbackUrl,
        fallbackVariant?.motion_preset ?? "sway",
        fallbackVariant?.motion_speed ?? 1.0,
        fallbackVariant?.motion_intensity ?? "normal",
      );
    }
  }
  if (!hasDedicatedAction(mascot, "celebrate")) {
    const fallbackVariant = celebrateVariants[0];
    const fallbackUrl = fallbackVariant?.image_url ?? style.anchor_image_url?.trim() ?? "";
    if (fallbackUrl) {
      apply(
        "celebrate",
        fallbackUrl,
        fallbackVariant?.motion_preset ?? "jump",
        fallbackVariant?.motion_speed ?? 1.0,
        fallbackVariant?.motion_intensity ?? "normal",
      );
    }
  }
}

/**
 * Graceful Fallback for Intro, Outro, and Question clips:
 * - If the mascot lacks a dedicated wave action, intro clip uses the active style's celebrate[0] (or thinking[0] or style anchor or master concept).
 * - If the mascot lacks a dedicated outro action, outro clip uses the active style's celebrate[1] (or celebrate[0] or style anchor or master concept).
 * - If the mascot lacks thinking or celebrate in a question clip, falls back to active style's first variant or style anchor.
 */
export function adaptMascotForPhase(
  mascot: MascotProfile | null | undefined,
  phase: "intro" | "question" | "outro",
  styleId?: string | null,
): MascotProfile | null | undefined {
  if (!mascot) return mascot;

  const style = resolveMascotStyle(mascot, styleId ?? mascot.active_style_id);
  const celebrateVariants = (style.states?.celebrate ?? []).filter((v) => Boolean(v.image_url?.trim()));
  const thinkingVariants = (style.states?.thinking ?? []).filter((v) => Boolean(v.image_url?.trim()));

  const newActions = { ...mascot.actions };
  let adaptedRenderBundle = mascot.render_bundle;

  const applyPhaseAction: ApplyPhaseActionFn = (action, url, motionPreset, speed = 1.0, intensity = "normal") => {
    newActions[action] = buildLegacySpriteAction(action, url, motionPreset, speed, intensity);
    if (adaptedRenderBundle) {
      adaptedRenderBundle = {
        ...adaptedRenderBundle,
        assets: {
          ...adaptedRenderBundle.assets,
          actions: {
            ...adaptedRenderBundle.assets.actions,
            [action]: buildBundleActionV2(action, url, motionPreset, speed, intensity),
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
  }

  return {
    ...mascot,
    active_style_id: style.id,
    actions: newActions,
    render_bundle: adaptedRenderBundle,
  };
}
