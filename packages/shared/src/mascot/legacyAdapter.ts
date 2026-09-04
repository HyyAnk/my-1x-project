import { MASCOT_ACTION_META, type MascotActionType } from "../enums.js";
import { ChannelMascotConfigSchema, resolveChannelMascotPlacement, type ChannelMascotConfig, type MascotProfile } from "../schemas.js";
import {
  DEFAULT_MASCOT_REVEAL_OUTCOME_ACTIONS,
  MASCOT_OFFSET_MAX,
  MASCOT_OFFSET_MIN,
  MASCOT_RENDER_ASPECT_RATIOS,
  MASCOT_RENDER_PHASES,
  MASCOT_SCALE_MAX,
  MASCOT_SCALE_MIN,
} from "./renderConstants.js";
import type {
  MascotPhaseRuleV2,
  MascotPlacementV2,
  MascotRenderAssetCatalogV2,
  MascotRenderBundleV2,
  MascotRenderConfigV2,
  MascotRenderPhase,
} from "./renderTypes.js";
import { MascotRenderBundleV2Schema } from "./renderSchema.js";
import {
  adaptActionAsset,
  adaptMasterAsset,
  clampFinite,
  cloneRenderAssets,
  cloneRenderConfig,
  phaseRuleWithVisibility,
} from "./legacyCloners.js";

export type LegacyMascotConfigInput = Partial<ChannelMascotConfig> | ChannelMascotConfig | null | undefined;
export type LegacyMascotPhase = MascotRenderPhase | "explanation";

export function normalizeMascotRenderPhase(phase: LegacyMascotPhase): MascotRenderPhase {
  return phase === "explanation" ? "explain" : phase;
}

/**
 * Converts the persisted V1 profile and channel settings into a V2 render
 * bundle without writing or mutating any persisted data.
 */
export function adaptMascotV1ToV2(mascot: MascotProfile | null | undefined, config?: LegacyMascotConfigInput): MascotRenderBundleV2 | null {
  if (!mascot) return null;
  const persistedBundle = mascot.render_bundle ? MascotRenderBundleV2Schema.safeParse(mascot.render_bundle) : null;
  if (persistedBundle?.success) {
    return {
      config: config === undefined ? cloneRenderConfig(persistedBundle.data.config) : adaptMascotConfigV1ToV2(config),
      assets: cloneRenderAssets(persistedBundle.data.assets),
    };
  }
  return {
    config: adaptMascotConfigV1ToV2(config),
    assets: adaptMascotAssetsV1ToV2(mascot),
  };
}

export function adaptMascotConfigV1ToV2(config?: LegacyMascotConfigInput): MascotRenderConfigV2 {
  const legacy = ChannelMascotConfigSchema.parse(config ?? {});
  const placements = Object.fromEntries(
    MASCOT_RENDER_ASPECT_RATIOS.map((aspect) => {
      const p = resolveChannelMascotPlacement(legacy, aspect);
      const placement: MascotPlacementV2 = {
        anchor: p.position,
        scale: clampFinite(p.scale, 1, MASCOT_SCALE_MIN, MASCOT_SCALE_MAX),
        offset_x: clampFinite(p.offset_x, 0, MASCOT_OFFSET_MIN, MASCOT_OFFSET_MAX),
        offset_y: clampFinite(p.offset_y, 0, MASCOT_OFFSET_MIN, MASCOT_OFFSET_MAX),
        flip_x: p.flip_x,
      };
      return [aspect, placement];
    }),
  ) as MascotRenderConfigV2["placements"];

  const phase_rules = Object.fromEntries(MASCOT_RENDER_PHASES.map((phase) => [phase, phaseRuleWithVisibility(phase, legacy)])) as Record<
    MascotRenderPhase,
    MascotPhaseRuleV2
  >;

  return {
    version: 2,
    placements,
    visibility: {
      enabled: legacy.enabled,
      phase_rules,
      reveal_outcome_actions: { ...DEFAULT_MASCOT_REVEAL_OUTCOME_ACTIONS },
    },
  };
}

export function adaptMascotAssetsV1ToV2(mascot: MascotProfile): MascotRenderAssetCatalogV2 {
  const actions: MascotRenderAssetCatalogV2["actions"] = {};
  for (const action of Object.keys(MASCOT_ACTION_META) as MascotActionType[]) {
    const legacyAction = mascot.actions[action];
    if (legacyAction?.sprite_url?.trim()) actions[action] = adaptActionAsset(action, legacyAction);
  }
  return {
    actions,
    master: mascot.master_image_url?.trim() ? adaptMasterAsset(mascot.master_image_url) : null,
  };
}
