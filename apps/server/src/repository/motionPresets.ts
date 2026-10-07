import { randomUUID } from "node:crypto";
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import {
  ChannelMotionPresetSchema,
  type ChannelMotionPreset,
  type SaveChannelMotionPresetRequest,
} from "@studio/shared";
import { RepositoryError } from "./errors.js";
import type { RepositoryRuntime } from "./runtime.js";

const FILE_NAME = "motion_presets.json";
const writeLocks = new Map<string, Promise<void>>();

function channelMotionPresetPath(repository: RepositoryRuntime, channelId: string): string {
  return repository.resolvePath("channels", channelId, FILE_NAME);
}

async function withChannelLock<T>(channelId: string, operation: () => Promise<T>): Promise<T> {
  const previous = writeLocks.get(channelId) ?? Promise.resolve();
  let release!: () => void;
  const current = new Promise<void>((resolve) => {
    release = resolve;
  });
  writeLocks.set(
    channelId,
    previous.then(() => current),
  );
  await previous;
  try {
    return await operation();
  } finally {
    release();
    if (writeLocks.get(channelId) === current) writeLocks.delete(channelId);
  }
}

export async function listChannelMotionPresets(
  repository: RepositoryRuntime,
  channelId: string,
): Promise<ChannelMotionPreset[]> {
  const filePath = channelMotionPresetPath(repository, channelId);
  try {
    const raw = await readFile(filePath, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    return ChannelMotionPresetSchema.array().parse(parsed);
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return [];
    }
    if (error instanceof SyntaxError) {
      throw new RepositoryError("Channel motion preset storage is corrupt", "INVALID_MOTION_PRESET_STORAGE");
    }
    throw error;
  }
}

export async function saveChannelMotionPreset(
  repository: RepositoryRuntime,
  channelId: string,
  input: SaveChannelMotionPresetRequest,
): Promise<ChannelMotionPreset> {
  return withChannelLock(channelId, async () => {
    const presets = await listChannelMotionPresets(repository, channelId);
    const now = new Date().toISOString();
    const existingIndex = input.id ? presets.findIndex((p) => p.id === input.id) : -1;

    let targetPreset: ChannelMotionPreset;
    if (existingIndex >= 0 && presets[existingIndex]) {
      targetPreset = {
        ...presets[existingIndex],
        name: input.name,
        placement: input.placement,
        templateId: input.templateId,
        options: input.options,
        updatedAt: now,
      };
      presets[existingIndex] = targetPreset;
    } else {
      targetPreset = {
        id: input.id || `preset_${randomUUID().slice(0, 8)}`,
        channelId,
        name: input.name,
        placement: input.placement,
        templateId: input.templateId,
        options: input.options,
        createdAt: now,
        updatedAt: now,
      };
      presets.push(targetPreset);
    }

    const filePath = channelMotionPresetPath(repository, channelId);
    await mkdir(path.dirname(filePath), { recursive: true });
    await repository.writeJsonAtomic(filePath, presets);

    return targetPreset;
  });
}

export async function deleteChannelMotionPreset(
  repository: RepositoryRuntime,
  channelId: string,
  presetId: string,
): Promise<boolean> {
  return withChannelLock(channelId, async () => {
    const presets = await listChannelMotionPresets(repository, channelId);
    const filtered = presets.filter((p) => p.id !== presetId);
    if (filtered.length === presets.length) {
      return false;
    }

    const filePath = channelMotionPresetPath(repository, channelId);
    await mkdir(path.dirname(filePath), { recursive: true });
    await repository.writeJsonAtomic(filePath, filtered);
    return true;
  });
}
