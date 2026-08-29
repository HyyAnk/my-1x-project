import {
  MASCOT_ACTION_FALLBACK_CHAINS,
  MASCOT_DEFAULT_ACTION_MOTIONS,
  MASCOT_DEFAULT_MOTION_SPEED,
  MASCOT_STATE_TO_ACTION,
  MASCOT_RENDER_CONTRACT_VERSION,
  MASCOT_CANVAS_SIZES,
} from "./renderConstants.js";
import type { MascotActionType } from "../enums.js";
import { MascotRenderBundleV2Schema, MascotRenderContextSchema } from "./renderSchema.js";
import type {
  MascotActionAssetV2,
  MascotRenderAssetCatalogV2,
  MascotRenderActionOverride,
  MascotRenderBundleV2,
  MascotRenderContext,
  MascotRenderSpecV2,
} from "./renderTypes.js";

/**
 * Resolves the single deterministic mascot input consumed by a renderer.
 * The function is side-effect free and returns null when policy or assets
 * make the mascot unavailable for the requested timeline context.
 */
export function resolveMascotRenderSpec(bundle: MascotRenderBundleV2, context: MascotRenderContext): MascotRenderSpecV2 | null {
  const normalizedBundle = MascotRenderBundleV2Schema.parse(bundle);
  const normalizedContext = MascotRenderContextSchema.parse({
    ...context,
    reveal_outcome: context.reveal_outcome ?? null,
  });
  const phaseRule = normalizedBundle.config.visibility.phase_rules[normalizedContext.phase];
  if (!normalizedBundle.config.visibility.enabled || !phaseRule.visible) return null;

  const requestedAction = normalizedContext.action_override
    ? resolveActionOverride(normalizedContext.action_override)
    : normalizedContext.phase === "reveal" && normalizedContext.reveal_outcome
      ? normalizedBundle.config.visibility.reveal_outcome_actions[normalizedContext.reveal_outcome]
      : phaseRule.action;
  const asset = resolveMascotAction(normalizedBundle.assets, requestedAction);
  if (!asset) return null;

  return {
    version: MASCOT_RENDER_CONTRACT_VERSION,
    canvas: { ...MASCOT_CANVAS_SIZES[normalizedContext.aspect_ratio] },
    phase: normalizedContext.phase,
    reveal_outcome: normalizedContext.reveal_outcome,
    visible: true,
    placement: { ...normalizedBundle.config.placements[normalizedContext.aspect_ratio] },
    asset,
    motion: { ...asset.motion },
    timeline_time_seconds: normalizedContext.timeline_time_seconds,
    playing: normalizedContext.playing,
  };
}

function resolveActionOverride(action: MascotRenderActionOverride): MascotActionType {
  return MASCOT_STATE_TO_ACTION[action as keyof typeof MASCOT_STATE_TO_ACTION] ?? (action as MascotActionType);
}

/**
 * Selects an action asset using the shared fallback chain. Metadata always
 * comes from the selected fallback asset rather than the requested action.
 */
export function resolveMascotAction(assets: MascotRenderAssetCatalogV2, requestedAction: MascotActionType): MascotActionAssetV2 | null {
  const candidates = MASCOT_ACTION_FALLBACK_CHAINS[requestedAction] ?? [requestedAction];
  for (const candidate of candidates) {
    const asset = assets.actions[candidate];
    if (asset?.image_url.trim()) return { ...asset, registration: { ...asset.registration }, motion: { ...asset.motion } };
  }

  if (!assets.master?.image_url.trim()) return null;
  return {
    version: MASCOT_RENDER_CONTRACT_VERSION,
    action: requestedAction,
    image_url: assets.master.image_url,
    registration: {
      ...assets.master.registration,
      content_bounds: { ...assets.master.registration.content_bounds },
      pivot: { ...assets.master.registration.pivot },
    },
    motion: {
      preset: MASCOT_DEFAULT_ACTION_MOTIONS[requestedAction],
      speed: MASCOT_DEFAULT_MOTION_SPEED,
      intensity: "normal",
    },
  };
}
