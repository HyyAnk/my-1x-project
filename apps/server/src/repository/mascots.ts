import { mkdir, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import {
  MascotProfileSchema,
  makeId,
  nowIso,
  type Channel,
  type ChannelMascotConfig,
  type MascotActionType,
  type MascotProfile,
  type MascotSpriteAction,
} from "@studio/shared";
import { RepositoryError } from "./errors.js";
import { buildCalibratedMascotAction } from "./mascotActionCalibration.js";
import { buildPersistedMascotProfile } from "./mascotRenderPersistence.js";
import type { RepositoryRuntime } from "./runtime.js";
import { withMascotWriteLock } from "./mascot/mascotLock.js";
import { ensureMascotStyles } from "./mascot/mascotStyles.js";

// Re-export lock, asset, and style modules for 100% backward compatibility
export { withMascotWriteLock } from "./mascot/mascotLock.js";
export {
  saveMascotAsset,
  getMascotAssetFile,
  listMascotAssets,
  deleteMascotAssetFile,
} from "./mascot/mascotAssets.js";
export {
  ensureMascotStyles,
  createMascotStyle,
  updateMascotStyle,
  saveMascotStyleConcept,
  deleteMascotStyle,
  updateMascotSlot,
  setActiveMascotStyle,
  type UpdateMascotStylePayload,
} from "./mascot/mascotStyles.js";

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
