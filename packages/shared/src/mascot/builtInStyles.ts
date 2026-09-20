import {
  BUILT_IN_PRESETS,
  DEFAULT_BUILT_IN_PRESET_ID,
  findBuiltInPresetById,
  resolveBuiltInPresetCategoryId,
  type BuiltInPresetResolutionInput,
  type VisualPresetItem,
} from "../presets.js";
import type { MascotStyleSelection } from "../schemas/channel.js";
import { synthesizeLegacyCoreStyle, type MascotProfile, type MascotStateVariant, type MascotStyle } from "../schemas/mascot.js";

const STYLE_SLOT_COUNT = 10;

export type MascotStyleResolutionConfig = BuiltInPresetResolutionInput & {
  mascot_style_selection?: MascotStyleSelection;
  mascot_style_id?: string | null;
};

export function getBuiltInMascotStyleId(presetId: string): string {
  if (presetId === DEFAULT_BUILT_IN_PRESET_ID) return "core";
  const suffix = presetId
    .replace(/^preset_/, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();
  return `builtin_${suffix || "style"}`;
}

function emptySlot(slotIndex: number): MascotStateVariant {
  return { id: `slot_${slotIndex}`, slot_index: slotIndex, image_url: "" };
}

function reconcileSlots(slots: MascotStateVariant[] | undefined): MascotStateVariant[] {
  const byIndex = new Map<number, MascotStateVariant>();
  for (const slot of slots ?? []) {
    if (slot.slot_index >= 1 && slot.slot_index <= STYLE_SLOT_COUNT && !byIndex.has(slot.slot_index)) {
      byIndex.set(slot.slot_index, slot);
    }
  }
  return Array.from({ length: STYLE_SLOT_COUNT }, (_, index) => byIndex.get(index + 1) ?? emptySlot(index + 1));
}

function buildManagedStyle(profile: MascotProfile, preset: VisualPresetItem, existing?: MascotStyle): MascotStyle {
  const isDefault = preset.id === DEFAULT_BUILT_IN_PRESET_ID;
  const source = existing ?? (isDefault ? synthesizeLegacyCoreStyle(profile) : undefined);
  const timestamp = profile.created_at || new Date().toISOString();
  return {
    ...(source ?? {
      id: getBuiltInMascotStyleId(preset.id),
      name: preset.name,
      keyword: "",
      anchor_image_url: null,
      raw_anchor_image_url: null,
      states: { thinking: [], celebrate: [] },
      created_at: timestamp,
      updated_at: timestamp,
    }),
    id: isDefault ? "core" : (source?.id ?? getBuiltInMascotStyleId(preset.id)),
    name: source?.name?.trim() || preset.name,
    built_in_preset_id: preset.id,
    style_revision: source?.style_revision ?? 1,
    is_default: isDefault,
    states: {
      thinking: reconcileSlots(source?.states?.thinking),
      celebrate: reconcileSlots(source?.states?.celebrate),
    },
  };
}

function normalizedName(value: string): string {
  return value.trim().toLocaleLowerCase("en-US");
}

function findLegacyPresetMatch(styles: MascotStyle[], preset: VisualPresetItem, assignedIds: Set<string>): MascotStyle | undefined {
  const deterministicId = getBuiltInMascotStyleId(preset.id);
  const idMatch = styles.find((style) => style.id === deterministicId && !assignedIds.has(style.id));
  if (idMatch) return idMatch;

  const nameMatches = styles.filter(
    (style) =>
      !assignedIds.has(style.id) &&
      !style.built_in_preset_id &&
      style.id !== "core" &&
      normalizedName(style.name) === normalizedName(preset.name),
  );
  return nameMatches.length === 1 ? nameMatches[0] : undefined;
}

export function reconcileMascotBuiltInStyles(
  profile: MascotProfile,
  presets: readonly VisualPresetItem[] = BUILT_IN_PRESETS,
): MascotProfile {
  if (presets.length === 0) return profile;

  const sourceStyles = [...(profile.styles ?? [])];
  const assignedIds = new Set<string>();
  const managedStyles = presets.map((preset) => {
    const isDefault = preset.id === DEFAULT_BUILT_IN_PRESET_ID;
    const existing = isDefault
      ? sourceStyles.find((style) => style.id === "core")
      : (sourceStyles.find((style) => style.built_in_preset_id === preset.id && !assignedIds.has(style.id)) ??
        findLegacyPresetMatch(sourceStyles, preset, assignedIds));
    const managed = buildManagedStyle(profile, preset, existing);
    if (existing) assignedIds.add(existing.id);
    assignedIds.add(managed.id);
    return managed;
  });

  const managedPresetIds = new Set(presets.map((preset) => preset.id));
  const legacyStyles = sourceStyles
    .filter((style) => !assignedIds.has(style.id))
    .map((style) => ({
      ...style,
      ...(style.built_in_preset_id && managedPresetIds.has(style.built_in_preset_id) ? { built_in_preset_id: undefined } : {}),
      is_default: false,
    }));
  const styles = [...managedStyles, ...legacyStyles];
  const activeStyleId = styles.some((style) => style.id === profile.active_style_id) ? profile.active_style_id : "core";

  return { ...profile, styles, active_style_id: activeStyleId };
}

export function findMascotStyleByBuiltInPreset(profile: MascotProfile, presetId: string): MascotStyle | undefined {
  const style = profile.styles?.find((candidate) => candidate.built_in_preset_id === presetId);
  if (style) return style;
  return presetId === DEFAULT_BUILT_IN_PRESET_ID ? profile.styles?.find((candidate) => candidate.id === "core") : undefined;
}

export function isUncustomizedBuiltInMascotStyle(style: MascotStyle): boolean {
  const preset = findBuiltInPresetById(style.built_in_preset_id);
  if (!preset || preset.id === DEFAULT_BUILT_IN_PRESET_ID) return false;
  const slots = [...(style.states?.thinking ?? []), ...(style.states?.celebrate ?? [])];
  return (
    normalizedName(style.name) === normalizedName(preset.name) &&
    !style.keyword.trim() &&
    !style.anchor_image_url &&
    !style.raw_anchor_image_url &&
    slots.every((slot) => !slot.image_url?.trim() && !slot.animation) &&
    (style.style_revision ?? 1) <= 1
  );
}

function selectionFromLegacy(styleId: string): MascotStyleSelection {
  if (styleId === "cycle" || styleId === "all") return { mode: "cycle" };
  return { mode: "specific_style", style_id: styleId === "default" ? "core" : styleId };
}

export function resolveMascotStyleIdForQuizConfig(
  profile: MascotProfile | null | undefined,
  config: MascotStyleResolutionConfig,
): string | undefined {
  if (!profile) return undefined;
  const reconciled = reconcileMascotBuiltInStyles(profile);
  const selection = config.mascot_style_id
    ? selectionFromLegacy(config.mascot_style_id)
    : (config.mascot_style_selection ?? { mode: "style_builtin" });

  if (selection.mode === "cycle") return "cycle";
  if (selection.mode === "specific_style" && reconciled.styles?.some((style) => style.id === selection.style_id)) {
    return selection.style_id;
  }

  const presetId = resolveBuiltInPresetCategoryId(config);
  return findMascotStyleByBuiltInPreset(reconciled, presetId)?.id ?? "core";
}
