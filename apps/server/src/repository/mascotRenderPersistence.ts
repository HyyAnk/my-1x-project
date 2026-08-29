import {
  MascotProfileSchema,
  MascotSpriteActionSchema,
  adaptMascotAssetsV1ToV2,
  adaptMascotConfigV1ToV2,
  type MascotActionType,
  type MascotProfile,
} from "@studio/shared";

type PersistedRenderBundle = NonNullable<MascotProfile["render_bundle"]>;
type PersistedActionAssets = PersistedRenderBundle["assets"]["actions"];
export type MascotSaveInput = Partial<MascotProfile> & { name: string };

export function buildPersistedMascotProfile(
  input: MascotSaveInput,
  existing: MascotProfile | null,
  id: string,
  timestamp: string,
): MascotProfile {
  const snapshot = buildLegacySnapshot(input, existing, id, timestamp);
  const persistV2 = shouldPersistV2(input, existing);
  return MascotProfileSchema.parse({
    ...snapshot,
    schema_version: persistV2 ? 2 : firstPresent(input.schema_version, existing?.schema_version, undefined),
    render_bundle: resolveRenderBundle(input, existing, snapshot, persistV2),
  });
}

function buildLegacySnapshot(input: MascotSaveInput, existing: MascotProfile | null, id: string, timestamp: string): MascotProfile {
  return {
    id,
    name: input.name,
    description: firstPresent(input.description, existing?.description, ""),
    visual_style: firstPresent(input.visual_style, existing?.visual_style, "pixar_3d"),
    master_prompt: firstPresent(input.master_prompt, existing?.master_prompt, ""),
    master_image_url: firstPresent(input.master_image_url, existing?.master_image_url, null),
    color_theme: firstPresent(input.color_theme, existing?.color_theme, "#06b6d4"),
    actions: firstPresent(input.actions, existing?.actions, {}),
    assigned_channel_ids: firstPresent(input.assigned_channel_ids, existing?.assigned_channel_ids, []),
    created_at: firstPresent(existing?.created_at, undefined, timestamp),
    updated_at: timestamp,
  };
}

function shouldPersistV2(input: MascotSaveInput, existing: MascotProfile | null): boolean {
  const hasBundle = [input.render_bundle, existing?.render_bundle].some(Boolean);
  const hasV2Version = [input.schema_version, existing?.schema_version].includes(2);
  return hasBundle || hasV2Version;
}

function resolveRenderBundle(
  input: MascotSaveInput,
  existing: MascotProfile | null,
  snapshot: MascotProfile,
  persistV2: boolean,
): PersistedRenderBundle | undefined {
  if (!persistV2) return undefined;
  if (input.render_bundle) return input.render_bundle;
  if (!existing?.render_bundle) {
    return { config: adaptMascotConfigV1ToV2(), assets: adaptMascotAssetsV1ToV2(snapshot) };
  }
  return mergePersistedMascotRenderBundle(
    existing.render_bundle,
    existing.actions,
    snapshot,
    input.actions !== undefined,
    input.master_image_url !== undefined,
  );
}

function firstPresent<T>(incoming: T | null | undefined, existing: T | null | undefined, fallback: T): T {
  return incoming ?? existing ?? fallback;
}

/**
 * Carries forward V2 calibration while accepting legacy-shaped profile saves
 * from existing clients. Changed legacy metadata is adapted into a fresh V2
 * asset; unchanged metadata keeps the calibrated registration and motion.
 */
export function mergePersistedMascotRenderBundle(
  existingBundle: PersistedRenderBundle,
  previousActions: MascotProfile["actions"],
  nextProfile: MascotProfile,
  actionsProvided: boolean,
  masterImageProvided: boolean,
): PersistedRenderBundle {
  const generatedAssets = adaptMascotAssetsV1ToV2(nextProfile);
  return {
    config: existingBundle.config,
    assets: {
      actions: actionsProvided
        ? mergeActionAssets(existingBundle.assets.actions, generatedAssets.actions, previousActions, nextProfile.actions)
        : existingBundle.assets.actions,
      master: masterImageProvided
        ? mergeMasterAsset(existingBundle.assets.master, generatedAssets.master, nextProfile.master_image_url)
        : existingBundle.assets.master,
    },
  };
}

function mergeActionAssets(
  existingActions: PersistedActionAssets,
  generatedActions: PersistedActionAssets,
  previousActions: MascotProfile["actions"],
  nextActions: MascotProfile["actions"],
): PersistedActionAssets {
  return Object.fromEntries(
    Object.entries(nextActions).flatMap(([action, nextAction]) => {
      if (!nextAction) return [];
      const generatedAsset = generatedActions[action as keyof typeof generatedActions];
      if (!generatedAsset) return [];
      const existingAsset = existingActions[action as keyof typeof existingActions];
      const previousAction = previousActions[action as keyof typeof previousActions];
      return [[action, existingAsset && areLegacyActionsEqual(previousAction, nextAction) ? existingAsset : generatedAsset]];
    }),
  );
}

function areLegacyActionsEqual(
  previous: MascotProfile["actions"][MascotActionType],
  next: MascotProfile["actions"][MascotActionType],
): boolean {
  if (!previous || !next) return previous === next;
  const previousParsed = MascotSpriteActionSchema.parse(previous);
  const nextParsed = MascotSpriteActionSchema.parse(next);
  return [
    "action",
    "sprite_url",
    "frames_count",
    "fps",
    "loop",
    "frame_width",
    "frame_height",
    "offset_x",
    "offset_y",
    "motion_preset",
    "motion_speed",
    "motion_intensity",
  ].every((key) => previousParsed[key as keyof typeof previousParsed] === nextParsed[key as keyof typeof nextParsed]);
}

function mergeMasterAsset(
  existingMaster: PersistedRenderBundle["assets"]["master"],
  generatedMaster: PersistedRenderBundle["assets"]["master"],
  masterImageUrl: string | null,
): PersistedRenderBundle["assets"]["master"] {
  if (existingMaster && masterImageUrl && existingMaster.image_url === masterImageUrl) return existingMaster;
  return generatedMaster;
}
