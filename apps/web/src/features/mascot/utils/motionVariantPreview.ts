import type {
  MascotActionAssetV2,
  MascotActionType,
  MascotAssetRegistration,
  MascotMotionConfig,
  MascotProfile,
  MascotRenderBundleV2,
  MascotStateVariant,
  MascotStyle,
} from "@studio/shared";

export type MascotVariantState = "thinking" | "celebrate";

export function isVariantAction(action: MascotActionType): action is MascotVariantState {
  return action === "thinking" || action === "celebrate";
}

export function collectFilledVariants(style: MascotStyle | null | undefined, state: MascotVariantState): MascotStateVariant[] {
  if (!style) return [];
  return (style.states?.[state] || []).filter((variant) => Boolean(variant.image_url?.trim()));
}

export function resolveSelectedVariant(variants: MascotStateVariant[], variantIndex: number): MascotStateVariant | null {
  if (variants.length === 0) return null;
  return variants[Math.min(Math.max(variantIndex, 0), variants.length - 1)];
}

export function getActionVariants(style: MascotStyle | null | undefined, action: MascotActionType): MascotStateVariant[] {
  if (!isVariantAction(action)) return [];
  return collectFilledVariants(style, action);
}

function overrideVariantAction(actions: MascotProfile["actions"], action: MascotVariantState, variant: MascotStateVariant): void {
  const existing = actions[action];
  actions[action] = {
    action,
    sprite_url: variant.image_url,
    preview_url: variant.image_url,
    frames_count: existing?.frames_count ?? 1,
    fps: existing?.fps ?? 8,
    loop: existing?.loop ?? true,
    frame_width: existing?.frame_width ?? 512,
    frame_height: existing?.frame_height ?? 512,
    offset_x: existing?.offset_x ?? 0,
    offset_y: existing?.offset_y ?? 0,
    motion_preset: existing?.motion_preset ?? variant.motion_preset ?? (action === "thinking" ? "breathe" : "jump"),
    motion_speed: existing?.motion_speed ?? variant.motion_speed ?? 1.0,
    motion_intensity: existing?.motion_intensity ?? variant.motion_intensity ?? "normal",
  };
}

function overrideVariantBundleAction(
  bundle: MascotRenderBundleV2 | undefined,
  action: MascotVariantState,
  variant: MascotStateVariant,
): MascotRenderBundleV2 | undefined {
  if (!bundle) return bundle;
  const existing = bundle.assets?.actions?.[action];
  const registration: MascotAssetRegistration = existing?.registration ?? {
    source_width: 512,
    source_height: 512,
    content_bounds: { x: 0, y: 0, width: 512, height: 512 },
    pivot: { x: 256, y: 512 },
    offset_x: 0,
    offset_y: 0,
  };
  const motion: MascotMotionConfig = {
    preset: existing?.motion?.preset ?? variant.motion_preset ?? (action === "thinking" ? "breathe" : "jump"),
    speed: existing?.motion?.speed ?? variant.motion_speed ?? 1.0,
    intensity: existing?.motion?.intensity ?? variant.motion_intensity ?? "normal",
  };
  const updatedAsset: MascotActionAssetV2 = {
    version: 2,
    action,
    image_url: variant.image_url,
    registration,
    motion,
  };
  return {
    ...bundle,
    assets: {
      ...bundle.assets,
      actions: {
        ...bundle.assets.actions,
        [action]: updatedAsset,
      },
    },
  };
}

/**
 * Overrides the thinking/celebrate actions of a profile with the style's filled
 * variants. The previewed action uses the selected variant; the other variant
 * action falls back to its first filled variant.
 */
export function applyVariantPreviewOverrides(
  profile: MascotProfile,
  style: MascotStyle | null,
  action: MascotActionType,
  variantIndex: number,
): MascotProfile {
  if (!style) return profile;

  const actions = { ...profile.actions };
  let renderBundle = profile.render_bundle ? { ...profile.render_bundle } : undefined;

  const thinkingVariants = collectFilledVariants(style, "thinking");
  const selectedThinking = resolveSelectedVariant(thinkingVariants, action === "thinking" ? variantIndex : 0);
  if (selectedThinking) {
    overrideVariantAction(actions, "thinking", selectedThinking);
    if (renderBundle) {
      renderBundle = overrideVariantBundleAction(renderBundle, "thinking", selectedThinking);
    }
  }

  const celebrateVariants = collectFilledVariants(style, "celebrate");
  const selectedCelebrate = resolveSelectedVariant(celebrateVariants, action === "celebrate" ? variantIndex : 0);
  if (selectedCelebrate) {
    overrideVariantAction(actions, "celebrate", selectedCelebrate);
    if (renderBundle) {
      renderBundle = overrideVariantBundleAction(renderBundle, "celebrate", selectedCelebrate);
    }
  }

  return {
    ...profile,
    actions,
    ...(renderBundle ? { render_bundle: renderBundle } : {}),
  };
}
