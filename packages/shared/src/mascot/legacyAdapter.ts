import { MASCOT_ACTION_META, type MascotActionType } from "../enums.js";
import { ChannelMascotConfigSchema, type ChannelMascotConfig, type MascotProfile, type MascotSpriteAction } from "../schemas.js";
import {
  DEFAULT_MASCOT_PHASE_RULES,
  DEFAULT_MASCOT_REVEAL_OUTCOME_ACTIONS,
  MASCOT_DEFAULT_ACTION_MOTIONS,
  MASCOT_DEFAULT_MOTION_SPEED,
  MASCOT_MOTION_SPEED_MAX,
  MASCOT_MOTION_SPEED_MIN,
  MASCOT_OFFSET_MAX,
  MASCOT_OFFSET_MIN,
  MASCOT_RENDER_ASPECT_RATIOS,
  MASCOT_RENDER_PHASES,
  MASCOT_SCALE_MAX,
  MASCOT_SCALE_MIN,
} from "./renderConstants.js";
import type {
  MascotActionAssetV2,
  MascotAssetRegistration,
  MascotLegacyAnimationV1,
  MascotMasterAssetV2,
  MascotPhaseRuleV2,
  MascotPlacementV2,
  MascotRenderAssetCatalogV2,
  MascotRenderBundleV2,
  MascotRenderConfigV2,
  MascotRenderPhase,
} from "./renderTypes.js";
import { MascotRenderBundleV2Schema } from "./renderSchema.js";

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

function cloneRenderConfig(config: MascotRenderConfigV2): MascotRenderConfigV2 {
  return {
    version: 2,
    placements: Object.fromEntries(
      MASCOT_RENDER_ASPECT_RATIOS.map((aspect) => [aspect, { ...config.placements[aspect] }]),
    ) as MascotRenderConfigV2["placements"],
    visibility: {
      enabled: config.visibility.enabled,
      phase_rules: Object.fromEntries(
        MASCOT_RENDER_PHASES.map((phase) => [phase, { ...config.visibility.phase_rules[phase] }]),
      ) as MascotRenderConfigV2["visibility"]["phase_rules"],
      reveal_outcome_actions: { ...config.visibility.reveal_outcome_actions },
    },
  };
}

function cloneRenderAssets(assets: MascotRenderAssetCatalogV2): MascotRenderAssetCatalogV2 {
  return {
    actions: Object.fromEntries(
      (Object.keys(assets.actions) as MascotActionType[]).map((action) => {
        const asset = assets.actions[action];
        return [
          action,
          asset
            ? {
                ...asset,
                registration: {
                  ...asset.registration,
                  content_bounds: { ...asset.registration.content_bounds },
                  pivot: { ...asset.registration.pivot },
                },
                motion: { ...asset.motion },
                legacy_animation: asset.legacy_animation ? { ...asset.legacy_animation } : undefined,
              }
            : asset,
        ];
      }),
    ),
    master: assets.master
      ? {
          ...assets.master,
          registration: {
            ...assets.master.registration,
            content_bounds: { ...assets.master.registration.content_bounds },
            pivot: { ...assets.master.registration.pivot },
          },
        }
      : null,
  };
}

export function adaptMascotConfigV1ToV2(config?: LegacyMascotConfigInput): MascotRenderConfigV2 {
  const legacy = ChannelMascotConfigSchema.parse(config ?? {});
  const placement: MascotPlacementV2 = {
    anchor: legacy.position,
    scale: clampFinite(legacy.scale, 1, MASCOT_SCALE_MIN, MASCOT_SCALE_MAX),
    offset_x: clampFinite(legacy.offset_x, 0, MASCOT_OFFSET_MIN, MASCOT_OFFSET_MAX),
    offset_y: clampFinite(legacy.offset_y, 0, MASCOT_OFFSET_MIN, MASCOT_OFFSET_MAX),
    flip_x: legacy.flip_x,
  };
  const phase_rules = Object.fromEntries(MASCOT_RENDER_PHASES.map((phase) => [phase, phaseRuleWithVisibility(phase, legacy)])) as Record<
    MascotRenderPhase,
    MascotPhaseRuleV2
  >;

  return {
    version: 2,
    placements: Object.fromEntries(
      MASCOT_RENDER_ASPECT_RATIOS.map((aspect) => [aspect, { ...placement }]),
    ) as MascotRenderConfigV2["placements"],
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

function phaseRuleWithVisibility(phase: MascotRenderPhase, config: ChannelMascotConfig): MascotPhaseRuleV2 {
  const visibility = phase === "intro" ? config.show_in_intro : phase === "outro" ? config.show_in_outro : config.show_in_question;
  return { ...DEFAULT_MASCOT_PHASE_RULES[phase], visible: visibility };
}

function adaptActionAsset(action: MascotActionType, legacy: MascotSpriteAction): MascotActionAssetV2 {
  const frameWidth = normalizeDimension(legacy.frame_width, 512);
  const frameHeight = normalizeDimension(legacy.frame_height, 512);
  const frames = normalizeFrameCount(legacy.frames_count, frameWidth);
  const registration: MascotAssetRegistration = {
    source_width: frameWidth * frames,
    source_height: frameHeight,
    content_bounds: { x: 0, y: 0, width: frameWidth, height: frameHeight },
    pivot: { x: frameWidth / 2, y: frameHeight },
    offset_x: clampFinite(legacy.offset_x, 0, MASCOT_OFFSET_MIN, MASCOT_OFFSET_MAX),
    offset_y: clampFinite(legacy.offset_y, 0, MASCOT_OFFSET_MIN, MASCOT_OFFSET_MAX),
  };
  const asset: MascotActionAssetV2 = {
    version: 2,
    action,
    image_url: legacy.sprite_url,
    registration,
    motion: {
      preset: legacy.motion_preset ?? MASCOT_DEFAULT_ACTION_MOTIONS[action],
      speed: clampFinite(legacy.motion_speed, MASCOT_DEFAULT_MOTION_SPEED, MASCOT_MOTION_SPEED_MIN, MASCOT_MOTION_SPEED_MAX),
      intensity: legacy.motion_intensity ?? "normal",
    },
  };
  if (frames > 1) {
    asset.legacy_animation = {
      frames_count: frames,
      fps: clampFinite(legacy.fps, 8, 0.1, 120),
      loop: legacy.loop,
      frame_width: frameWidth,
      frame_height: frameHeight,
    } satisfies MascotLegacyAnimationV1;
  }
  return asset;
}

function adaptMasterAsset(imageUrl: string): MascotMasterAssetV2 {
  return {
    version: 2,
    image_url: imageUrl,
    registration: {
      source_width: 512,
      source_height: 512,
      content_bounds: { x: 0, y: 0, width: 512, height: 512 },
      pivot: { x: 256, y: 512 },
      offset_x: 0,
      offset_y: 0,
    },
  };
}

function normalizeDimension(value: number | undefined, fallback: number): number {
  return Math.round(clampFinite(value, fallback, 1, 8192));
}

function normalizeFrameCount(value: number | undefined, frameWidth: number): number {
  const requested = Math.round(clampFinite(value, 1, 1, 32));
  return Math.max(1, Math.min(requested, Math.floor(8192 / frameWidth)));
}

function clampFinite(value: number | undefined, fallback: number, min: number, max: number): number {
  const candidate = typeof value === "number" && Number.isFinite(value) ? value : fallback;
  return Math.min(max, Math.max(min, candidate));
}
