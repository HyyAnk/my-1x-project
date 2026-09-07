import {
  resolveMascotStyle,
  type MascotActionAssetV2,
  type MascotActionType,
  type MascotMotionIntensity,
  type MascotMotionPreset,
  type MascotProfile,
  type MascotSpriteAction,
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
export function resolveMascotQuestionStyle(
  mascot: MascotProfile,
  styleId?: string | null,
  questionIndex = 0,
): MascotStyle {
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
  return Boolean(
    legacyAction?.sprite_url?.trim() ||
      legacyAction?.preview_url?.trim() ||
      bundleAction?.image_url?.trim(),
  );
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

  const existingThinking = mascot.actions?.thinking;
  const existingCelebrate = mascot.actions?.celebrate;
  const newActions = { ...mascot.actions };

  if (thinkingVariant) {
    newActions.thinking = buildLegacySpriteAction(
      "thinking",
      thinkingVariant.image_url,
      thinkingVariant.motion_preset ?? existingThinking?.motion_preset ?? "sway",
      thinkingVariant.motion_speed ?? existingThinking?.motion_speed ?? 1.0,
      thinkingVariant.motion_intensity ?? existingThinking?.motion_intensity ?? "normal",
      existingThinking,
    );
  } else if (style.anchor_image_url?.trim()) {
    newActions.thinking = buildLegacySpriteAction(
      "thinking",
      style.anchor_image_url.trim(),
      "sway",
      1.0,
      "normal",
      existingThinking,
    );
  }

  if (celebrateVariant) {
    newActions.celebrate = buildLegacySpriteAction(
      "celebrate",
      celebrateVariant.image_url,
      celebrateVariant.motion_preset ?? existingCelebrate?.motion_preset ?? "jump",
      celebrateVariant.motion_speed ?? existingCelebrate?.motion_speed ?? 1.0,
      celebrateVariant.motion_intensity ?? existingCelebrate?.motion_intensity ?? "normal",
      existingCelebrate,
    );
  } else if (style.anchor_image_url?.trim()) {
    newActions.celebrate = buildLegacySpriteAction(
      "celebrate",
      style.anchor_image_url.trim(),
      "jump",
      1.0,
      "normal",
      existingCelebrate,
    );
  }

  let adaptedRenderBundle = mascot.render_bundle;
  if (mascot.render_bundle) {
    const actionsCopy = { ...(mascot.render_bundle.assets?.actions ?? {}) };
    if (thinkingVariant) {
      actionsCopy.thinking = buildBundleActionV2(
        "thinking",
        thinkingVariant.image_url,
        thinkingVariant.motion_preset ?? actionsCopy.thinking?.motion?.preset ?? "sway",
        thinkingVariant.motion_speed ?? actionsCopy.thinking?.motion?.speed ?? 1.0,
        thinkingVariant.motion_intensity ?? actionsCopy.thinking?.motion?.intensity ?? "normal",
        actionsCopy.thinking,
      );
    } else if (style.anchor_image_url?.trim()) {
      actionsCopy.thinking = buildBundleActionV2(
        "thinking",
        style.anchor_image_url.trim(),
        "sway",
        1.0,
        "normal",
        actionsCopy.thinking,
      );
    }

    if (celebrateVariant) {
      actionsCopy.celebrate = buildBundleActionV2(
        "celebrate",
        celebrateVariant.image_url,
        celebrateVariant.motion_preset ?? actionsCopy.celebrate?.motion?.preset ?? "jump",
        celebrateVariant.motion_speed ?? actionsCopy.celebrate?.motion?.speed ?? 1.0,
        celebrateVariant.motion_intensity ?? actionsCopy.celebrate?.motion?.intensity ?? "normal",
        actionsCopy.celebrate,
      );
    } else if (style.anchor_image_url?.trim()) {
      actionsCopy.celebrate = buildBundleActionV2(
        "celebrate",
        style.anchor_image_url.trim(),
        "jump",
        1.0,
        "normal",
        actionsCopy.celebrate,
      );
    }

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

  const applyPhaseAction = (
    action: MascotActionType,
    url: string,
    motionPreset: MascotMotionPreset,
    speed = 1.0,
    intensity: MascotMotionIntensity = "normal",
  ) => {
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
    if (!hasDedicatedAction(mascot, "wave")) {
      const fallbackVariant = celebrateVariants[0] ?? thinkingVariants[0];
      const fallbackUrl = fallbackVariant?.image_url ?? style.anchor_image_url?.trim() ?? mascot.master_image_url?.trim() ?? "";
      if (fallbackUrl) {
        applyPhaseAction(
          "wave",
          fallbackUrl,
          fallbackVariant?.motion_preset ?? "wave",
          fallbackVariant?.motion_speed ?? 1.0,
          fallbackVariant?.motion_intensity ?? "normal",
        );
      }
    }
  } else if (phase === "outro") {
    if (!hasDedicatedAction(mascot, "outro")) {
      const fallbackVariant = (celebrateVariants.length > 1 ? celebrateVariants[1] : celebrateVariants[0]) ?? thinkingVariants[0];
      const fallbackUrl = fallbackVariant?.image_url ?? style.anchor_image_url?.trim() ?? mascot.master_image_url?.trim() ?? "";
      if (fallbackUrl) {
        applyPhaseAction(
          "outro",
          fallbackUrl,
          fallbackVariant?.motion_preset ?? "wave",
          fallbackVariant?.motion_speed ?? 1.0,
          fallbackVariant?.motion_intensity ?? "normal",
        );
      }
    }
  } else if (phase === "question") {
    if (!hasDedicatedAction(mascot, "thinking")) {
      const fallbackVariant = thinkingVariants[0];
      const fallbackUrl = fallbackVariant?.image_url ?? style.anchor_image_url?.trim() ?? "";
      if (fallbackUrl) {
        applyPhaseAction(
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
        applyPhaseAction(
          "celebrate",
          fallbackUrl,
          fallbackVariant?.motion_preset ?? "jump",
          fallbackVariant?.motion_speed ?? 1.0,
          fallbackVariant?.motion_intensity ?? "normal",
        );
      }
    }
  }

  return {
    ...mascot,
    active_style_id: style.id,
    actions: newActions,
    render_bundle: adaptedRenderBundle,
  };
}
