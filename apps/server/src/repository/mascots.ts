import { mkdir, readFile, readdir, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  MascotProfileSchema,
  makeId,
  nowIso,
  synthesizeLegacyCoreStyle,
  type Channel,
  type ChannelMascotConfig,
  type CreateMascotStyleInput,
  type MascotActionType,
  type MascotProfile,
  type MascotSpriteAction,
  type MascotStateVariant,
  type MascotStyle,
  type UpdateMascotSlotInput,
  type UpdateMascotStyleInput,
} from "@studio/shared";
import { RepositoryError } from "./errors.js";
import { isValidImageBuffer } from "./helpers.js";
import { buildCalibratedMascotAction } from "./mascotActionCalibration.js";
import { buildPersistedMascotProfile } from "./mascotRenderPersistence.js";
import type { RepositoryRuntime } from "./runtime.js";

const mascotWriteLocks = new Map<string, Promise<void>>();

/**
 * Serializes read-modify-write cycles on a mascot profile. The lock is NOT
 * re-entrant: never call a locked repository helper from inside an operation.
 */
export async function withMascotWriteLock<T>(mascotId: string, operation: () => Promise<T>): Promise<T> {
  const previous = mascotWriteLocks.get(mascotId) ?? Promise.resolve();
  let release!: () => void;
  const current = new Promise<void>((resolve) => {
    release = resolve;
  });
  mascotWriteLocks.set(
    mascotId,
    previous.then(() => current),
  );
  await previous;
  try {
    return await operation();
  } finally {
    release();
    if (mascotWriteLocks.get(mascotId) === current) mascotWriteLocks.delete(mascotId);
  }
}

export function ensureMascotStyles(mascot: MascotProfile): MascotProfile {
  if (!mascot.styles || mascot.styles.length === 0) {
    const coreStyle = synthesizeLegacyCoreStyle(mascot);
    return {
      ...mascot,
      styles: [coreStyle],
      active_style_id: mascot.active_style_id || "core",
    };
  }
  if (!mascot.active_style_id) {
    return {
      ...mascot,
      active_style_id: mascot.styles.find((s) => s.is_default)?.id || mascot.styles[0]?.id || "core",
    };
  }
  return mascot;
}

export async function listMascots(this: RepositoryRuntime): Promise<MascotProfile[]> {
  await this.ensureBootstrap();
  const entries = await readdir(this.roots.mascots, { withFileTypes: true });
  const mascots: MascotProfile[] = [];
  const channels = await this.listChannels(true);

  for (const entry of entries.filter((item) => item.isDirectory())) {
    try {
      const metadataPath = path.join(this.roots.mascots, entry.name, "mascot.json");
      const raw = JSON.parse(await readFile(metadataPath, "utf8")) as unknown;
      const profile = MascotProfileSchema.parse(raw);
      const assignedChannels = channels.filter((ch) => ch.mascot_id === profile.id).map((ch) => ch.channel_id);
      mascots.push(ensureMascotStyles({ ...profile, assigned_channel_ids: assignedChannels }));
    } catch {
      // Ignore unparseable or incomplete mascot folders
    }
  }
  return mascots.sort((a, b) => (a.created_at || "").localeCompare(b.created_at || "") || (a.id || "").localeCompare(b.id || ""));
}

export async function getMascot(this: RepositoryRuntime, mascotId: string): Promise<MascotProfile> {
  await this.ensureBootstrap();
  const metadataPath = path.join(this.roots.mascots, mascotId, "mascot.json");
  if (!(await this.exists(metadataPath))) {
    throw new RepositoryError("Mascot not found", "MASCOT_NOT_FOUND");
  }
  const raw = JSON.parse(await readFile(metadataPath, "utf8")) as unknown;
  const profile = MascotProfileSchema.parse(raw);
  const channels = await this.listChannels(true);
  const assignedChannels = channels.filter((ch) => ch.mascot_id === profile.id).map((ch) => ch.channel_id);
  return ensureMascotStyles({ ...profile, assigned_channel_ids: assignedChannels });
}

export async function saveMascot(this: RepositoryRuntime, profile: Partial<MascotProfile> & { name: string }): Promise<MascotProfile> {
  await this.ensureBootstrap();
  const id = profile.id ?? makeId("mascot");
  const existing = profile.id ? await this.getMascot(profile.id).catch(() => null) : null;
  const timestamp = nowIso();
  const validated = buildPersistedMascotProfile(profile, existing, id, timestamp);
  const finalProfile = ensureMascotStyles(validated);

  const mascotDir = path.join(this.roots.mascots, id);
  await mkdir(path.join(mascotDir, "assets"), { recursive: true });
  await this.writeJsonAtomic(path.join(mascotDir, "mascot.json"), finalProfile);
  return finalProfile;
}

export async function deleteMascot(this: RepositoryRuntime, mascotId: string): Promise<void> {
  await this.ensureBootstrap();
  const mascotDir = path.join(this.roots.mascots, mascotId);
  await this.removeTree(mascotDir);

  const channels = await this.listChannels(true);
  for (const channel of channels) {
    if (channel.mascot_id === mascotId) {
      await this.updateChannel(channel.channel_id, { mascot_id: null });
    }
  }
}

export async function saveMascotAsset(this: RepositoryRuntime, mascotId: string, filename: string, content: Uint8Array): Promise<string> {
  await this.ensureBootstrap();
  const mascotDir = path.join(this.roots.mascots, mascotId);
  const assetDir = path.join(mascotDir, "assets");
  await mkdir(assetDir, { recursive: true });
  const targetFile = path.join(assetDir, filename);
  await this.writeBinaryAtomic(targetFile, content);
  return `/api/mascots/${mascotId}/assets/${filename}`;
}

export async function getMascotAssetFile(
  this: RepositoryRuntime,
  mascotId: string,
  filename: string,
): Promise<{ absolutePath: string; size: number; modified_at: string }> {
  const mascotDir = path.join(this.roots.mascots, mascotId);
  const absolutePath = path.join(mascotDir, "assets", filename);
  try {
    await this.assertRealPathInside(this.roots.mascots, absolutePath);
    const metadata = await stat(absolutePath);
    return { absolutePath, size: metadata.size, modified_at: metadata.mtime.toISOString() };
  } catch {
    throw new RepositoryError("Mascot asset not found", "MASCOT_ASSET_NOT_FOUND");
  }
}

export async function calibrateMascotAction(
  this: RepositoryRuntime,
  mascotId: string,
  action: MascotActionType,
  calibration: Partial<MascotSpriteAction>,
): Promise<MascotProfile> {
  return withMascotWriteLock(mascotId, async () => {
    const mascot = await this.getMascot(mascotId);
    const currentAction = mascot.actions[action];
    const updatedAction = buildCalibratedMascotAction(action, currentAction, calibration);

    const updatedMascot: MascotProfile = {
      ...mascot,
      actions: {
        ...mascot.actions,
        [action]: updatedAction,
      },
      updated_at: new Date().toISOString(),
    };

    return this.saveMascot(updatedMascot);
  });
}

export async function listMascotAssets(this: RepositoryRuntime, mascotId: string): Promise<string[]> {
  const mascotDir = path.join(this.roots.mascots, mascotId, "assets");
  try {
    const entries = await readdir(mascotDir, { withFileTypes: true });
    return entries.filter((e) => e.isFile()).map((e) => e.name);
  } catch {
    return [];
  }
}

export async function deleteMascotAssetFile(this: RepositoryRuntime, mascotId: string, filename: string): Promise<void> {
  const mascotDir = path.join(this.roots.mascots, mascotId);
  const absolutePath = path.join(mascotDir, "assets", filename);
  try {
    await this.assertRealPathInside(this.roots.mascots, absolutePath);
    await unlink(absolutePath);
  } catch {
    // Ignore if already deleted
  }
}

export async function assignMascotToChannel(
  this: RepositoryRuntime,
  channelId: string,
  mascotId: string | null,
  config?: Partial<ChannelMascotConfig>,
): Promise<Channel> {
  const channel = await this.getChannel(channelId);
  const updatedConfig = config
    ? {
        ...channel.mascot_config,
        ...config,
        ...(config.placements || channel.mascot_config?.placements
          ? {
              placements: {
                ...channel.mascot_config?.placements,
                ...config.placements,
              },
            }
          : {}),
      }
    : channel.mascot_config;
  return this.updateChannel(channelId, { mascot_id: mascotId, mascot_config: updatedConfig });
}

export async function createMascotStyle(
  this: RepositoryRuntime,
  mascotId: string,
  input: CreateMascotStyleInput,
): Promise<{ mascot: MascotProfile; style: MascotStyle }> {
  return withMascotWriteLock(mascotId, async () => {
    const mascot = await this.getMascot(mascotId);
    const now = nowIso();
    let styleId = `style_${Date.now()}`;
    const existingIds = new Set((mascot.styles || []).map((s) => s.id));
    if (existingIds.has(styleId)) {
      styleId = `style_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    }

    const style: MascotStyle = {
      id: styleId,
      name: input.name,
      keyword: input.keyword || "",
      is_default: false,
      states: {
        thinking: Array.from({ length: 10 }, (_, i) => ({
          id: `slot_${i + 1}`,
          slot_index: i + 1,
          image_url: "",
        })),
        celebrate: Array.from({ length: 10 }, (_, i) => ({
          id: `slot_${i + 1}`,
          slot_index: i + 1,
          image_url: "",
        })),
      },
      created_at: now,
      updated_at: now,
    };

    const updatedMascot: MascotProfile = {
      ...mascot,
      styles: [...(mascot.styles || []), style],
      updated_at: now,
    };

    const saved = await this.saveMascot(updatedMascot);
    return { mascot: saved, style };
  });
}

export async function updateMascotStyle(
  this: RepositoryRuntime,
  mascotId: string,
  styleId: string,
  input: UpdateMascotStyleInput,
): Promise<MascotProfile> {
  return withMascotWriteLock(mascotId, async () => {
    const mascot = await this.getMascot(mascotId);
    const styles = mascot.styles || [];
    const styleIndex = styles.findIndex((s) => s.id === styleId);
    if (styleIndex === -1) {
      throw new RepositoryError(`Style ${styleId} not found`, "STYLE_NOT_FOUND");
    }

    const existingStyle = styles[styleIndex]!;
    const now = nowIso();
    const updatedStyle: MascotStyle = {
      ...existingStyle,
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.keyword !== undefined ? { keyword: input.keyword } : {}),
      updated_at: now,
    };

    const updatedStyles = [...styles];
    updatedStyles[styleIndex] = updatedStyle;

    const updatedMascot: MascotProfile = {
      ...mascot,
      styles: updatedStyles,
      updated_at: now,
    };

    return this.saveMascot(updatedMascot);
  });
}

export async function deleteMascotStyle(
  this: RepositoryRuntime,
  mascotId: string,
  styleId: string,
): Promise<MascotProfile> {
  return withMascotWriteLock(mascotId, async () => {
    const mascot = await this.getMascot(mascotId);
    const styles = mascot.styles || [];
    const style = styles.find((s) => s.id === styleId);
    if (!style) {
      throw new RepositoryError(`Style ${styleId} not found`, "STYLE_NOT_FOUND");
    }

    if (style.id === "core" || style.is_default === true) {
      throw new RepositoryError("Cannot delete the default Core Style", "CANNOT_DELETE_DEFAULT_STYLE");
    }

    const updatedStyles = styles.filter((s) => s.id !== styleId);
    const now = nowIso();
    const updatedMascot: MascotProfile = {
      ...mascot,
      styles: updatedStyles,
      active_style_id: mascot.active_style_id === styleId ? "core" : mascot.active_style_id,
      updated_at: now,
    };

    return this.saveMascot(updatedMascot);
  });
}

export async function updateMascotSlot(
  this: RepositoryRuntime,
  mascotId: string,
  input: UpdateMascotSlotInput,
): Promise<MascotProfile> {
  return withMascotWriteLock(mascotId, async () => {
    const mascot = await this.getMascot(mascotId);
    const styles = mascot.styles || [];
    const styleIndex = styles.findIndex((s) => s.id === input.style_id);
    if (styleIndex === -1) {
      throw new RepositoryError(`Style ${input.style_id} not found`, "STYLE_NOT_FOUND");
    }

    const existingStyle = styles[styleIndex]!;
    const stateSlots = [...(existingStyle.states[input.state] || [])];
    const slotIndex = stateSlots.findIndex((s) => s.slot_index === input.slot_index);

    let updatedSlot: MascotStateVariant;
    if (slotIndex >= 0) {
      const current = stateSlots[slotIndex]!;
      updatedSlot = {
        ...current,
        ...(input.image_url !== undefined ? { image_url: input.image_url } : {}),
        ...(input.prompt_modifier !== undefined ? { prompt_modifier: input.prompt_modifier } : {}),
        ...(input.motion_preset !== undefined ? { motion_preset: input.motion_preset } : {}),
        ...(input.motion_speed !== undefined ? { motion_speed: input.motion_speed } : {}),
        ...(input.motion_intensity !== undefined ? { motion_intensity: input.motion_intensity } : {}),
      };
      stateSlots[slotIndex] = updatedSlot;
    } else {
      updatedSlot = {
        id: `slot_${input.slot_index}`,
        slot_index: input.slot_index,
        image_url: input.image_url || "",
        ...(input.prompt_modifier !== undefined ? { prompt_modifier: input.prompt_modifier } : {}),
        ...(input.motion_preset !== undefined ? { motion_preset: input.motion_preset } : {}),
        ...(input.motion_speed !== undefined ? { motion_speed: input.motion_speed } : {}),
        ...(input.motion_intensity !== undefined ? { motion_intensity: input.motion_intensity } : {}),
      };
      stateSlots.push(updatedSlot);
      stateSlots.sort((a, b) => a.slot_index - b.slot_index);
    }

    const now = nowIso();
    const updatedStyle: MascotStyle = {
      ...existingStyle,
      states: {
        ...existingStyle.states,
        [input.state]: stateSlots,
      },
      updated_at: now,
    };

    const updatedStyles = [...styles];
    updatedStyles[styleIndex] = updatedStyle;

    const updatedMascot: MascotProfile = {
      ...mascot,
      styles: updatedStyles,
      updated_at: now,
    };

    return this.saveMascot(updatedMascot);
  });
}

export async function setActiveMascotStyle(
  this: RepositoryRuntime,
  mascotId: string,
  styleId: string,
): Promise<MascotProfile> {
  return withMascotWriteLock(mascotId, async () => {
    const mascot = await this.getMascot(mascotId);
    const styles = mascot.styles || [];
    const style = styles.find((s) => s.id === styleId);
    if (!style) {
      throw new RepositoryError(`Style ${styleId} not found`, "STYLE_NOT_FOUND");
    }

    const now = nowIso();
    const updatedMascot: MascotProfile = {
      ...mascot,
      active_style_id: styleId,
      updated_at: now,
    };

    return this.saveMascot(updatedMascot);
  });
}
