import {
  MASCOT_RENDER_CONTRACT_VERSION,
  MascotProfileSchema,
  MascotSpriteActionSchema,
  adaptMascotAssetsV1ToV2,
  adaptMascotConfigV1ToV2,
  synthesizeLegacyCoreStyle,
  type MascotActionType,
  type MascotProfile,
} from "@studio/shared";

type PersistedRenderBundle = NonNullable<MascotProfile["render_bundle"]>;
export type MascotSaveInput = Partial<MascotProfile> & { name: string };

/**
 * Builds a validated, persisted mascot profile where render_bundle and styles
 * serve as the primary source of truth.
 */
export function buildPersistedMascotProfile(
  input: MascotSaveInput,
  existing: MascotProfile | null,
  id: string,
  timestamp: string,
): MascotProfile {
  const snapshot = buildLegacySnapshot(input, existing, id, timestamp);
  return MascotProfileSchema.parse({
    ...snapshot,
    schema_version: MASCOT_RENDER_CONTRACT_VERSION,
    render_bundle: resolveRenderBundle(input, existing, snapshot),
  });
}

function buildLegacySnapshot(input: MascotSaveInput, existing: MascotProfile | null, id: string, timestamp: string): MascotProfile {
  const snapshot: MascotProfile = {
    id,
    name: input.name,
    description: firstPresent(input.description, existing?.description, ""),
    visual_style: firstPresent(input.visual_style, existing?.visual_style, "pixar_3d"),
    master_prompt: firstPresent(input.master_prompt, existing?.master_prompt, ""),
    master_image_url: firstPresent(input.master_image_url, existing?.master_image_url, null),
    color_theme: firstPresent(input.color_theme, existing?.color_theme, "#06b6d4"),
    actions: firstPresent(input.actions, existing?.actions, {}),
    styles: firstPresent(input.styles, existing?.styles, []),
    active_style_id: firstPresent(input.active_style_id, existing?.active_style_id, undefined),
    assigned_channel_ids: firstPresent(input.assigned_channel_ids, existing?.assigned_channel_ids, []),
    created_at: firstPresent(existing?.created_at, undefined, timestamp),
    updated_at: timestamp,
  };

  if (!snapshot.styles || snapshot.styles.length === 0) {
    snapshot.styles = [synthesizeLegacyCoreStyle(snapshot)];
    snapshot.active_style_id = snapshot.active_style_id || "core";
  } else if (!snapshot.active_style_id) {
    snapshot.active_style_id = snapshot.styles.find((s) => s.is_default)?.id || snapshot.styles[0]?.id || "core";
  }

  return snapshot;
}

/**
 * @deprecated All mascot profiles now persist V2 render bundles by default.
 */
export function shouldPersistV2(_input?: MascotSaveInput, _existing?: MascotProfile | null): boolean {
  return true;
}

function resolveRenderBundle(input: MascotSaveInput, existing: MascotProfile | null, snapshot: MascotProfile): PersistedRenderBundle {
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
 * Merges persisted V2 render bundle while preserving calibrated registration and motion.
 * render_bundle is the primary source of truth; legacy actions do not overwrite calibrated action assets.
 */
export function mergePersistedMascotRenderBundle(
  existingBundle: PersistedRenderBundle,
  _previousActions: MascotProfile["actions"],
  nextProfile: MascotProfile,
  actionsProvided: boolean,
  masterImageProvided: boolean,
): PersistedRenderBundle {
  const generatedAssets = adaptMascotAssetsV1ToV2(nextProfile);
  return {
    config: existingBundle.config,
    assets: {
      actions: actionsProvided ? { ...generatedAssets.actions, ...existingBundle.assets.actions } : existingBundle.assets.actions,
      master: masterImageProvided
        ? mergeMasterAsset(existingBundle.assets.master, generatedAssets.master, nextProfile.master_image_url ?? null)
        : existingBundle.assets.master,
    },
  };
}

/**
 * @deprecated Dual-write comparison between legacy actions and render bundle is retired.
 * Retained for backwards compatibility.
 */
export function areLegacyActionsEqual(
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

/**
 * @deprecated Dual-write legacy action generation from render_bundle is retired.
 * render_bundle and styles are the primary source of truth.
 */
export function generateLegacyActionsFromBundle(_bundle: PersistedRenderBundle): MascotProfile["actions"] {
  return {};
}

function mergeMasterAsset(
  existingMaster: PersistedRenderBundle["assets"]["master"],
  generatedMaster: PersistedRenderBundle["assets"]["master"],
  masterImageUrl: string | null,
): PersistedRenderBundle["assets"]["master"] {
  if (existingMaster && masterImageUrl && existingMaster.image_url === masterImageUrl) return existingMaster;
  return generatedMaster;
}
