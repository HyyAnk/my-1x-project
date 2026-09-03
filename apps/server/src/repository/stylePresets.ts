import { randomUUID } from "node:crypto";
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import {
  CreateStylePresetInputSchema,
  StylePresetSchema,
  UpdateStylePresetInputSchema,
  type CreateStylePresetInput,
  type StylePreset,
  type UpdateStylePresetInput,
} from "@studio/shared";
import { RepositoryError } from "./errors.js";
import type { RepositoryRuntime } from "./runtime.js";

const FILE_NAME = "style-presets.json";
const writeLocks = new WeakMap<object, Promise<void>>();

function filePath(repository: RepositoryRuntime): string {
  return repository.resolvePath("runtime", FILE_NAME);
}

async function readPresets(repository: RepositoryRuntime): Promise<StylePreset[]> {
  try {
    const raw = await readFile(filePath(repository), "utf8");
    const parsed = JSON.parse(raw) as unknown;
    return StylePresetSchema.array().parse(parsed);
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") return [];
    if (error instanceof SyntaxError) throw new RepositoryError("Style preset storage is invalid", "INVALID_STYLE_PRESET_STORAGE");
    throw error;
  }
}

async function withWriteLock<T>(repository: RepositoryRuntime, operation: () => Promise<T>): Promise<T> {
  const previous = writeLocks.get(repository) ?? Promise.resolve();
  let release!: () => void;
  const current = new Promise<void>((resolve) => {
    release = resolve;
  });
  writeLocks.set(
    repository,
    previous.then(() => current),
  );
  await previous;
  try {
    return await operation();
  } finally {
    release();
    if (writeLocks.get(repository) === current) writeLocks.delete(repository);
  }
}

async function writePresets(repository: RepositoryRuntime, presets: StylePreset[]): Promise<void> {
  await mkdir(path.dirname(filePath(repository)), { recursive: true });
  await repository.writeJsonAtomic(filePath(repository), presets);
}

export async function listStylePresets(this: RepositoryRuntime): Promise<StylePreset[]> {
  return (await readPresets(this)).sort((a, b) => b.updated_at.localeCompare(a.updated_at));
}

export async function createStylePreset(this: RepositoryRuntime, input: CreateStylePresetInput): Promise<StylePreset> {
  const parsed = CreateStylePresetInputSchema.parse(input);
  return withWriteLock(this, async () => {
    const now = new Date().toISOString();
    const preset = StylePresetSchema.parse({
      ...parsed,
      id: `preset_${randomUUID()}`,
      revision: 1,
      created_at: now,
      updated_at: now,
    });
    const presets = await readPresets(this);
    await writePresets(this, [preset, ...presets]);
    return preset;
  });
}

export async function updateStylePreset(this: RepositoryRuntime, presetId: string, input: UpdateStylePresetInput): Promise<StylePreset> {
  const parsed = UpdateStylePresetInputSchema.parse(input);
  return withWriteLock(this, async () => {
    const presets = await readPresets(this);
    const index = presets.findIndex((preset) => preset.id === presetId);
    if (index < 0) throw new RepositoryError(`Style preset not found: ${presetId}`, "STYLE_PRESET_NOT_FOUND");
    const current = presets[index];
    const updated = StylePresetSchema.parse({
      ...current,
      ...parsed,
      id: current.id,
      revision: current.revision + 1,
      updated_at: new Date().toISOString(),
    });
    presets[index] = updated;
    await writePresets(this, presets);
    return updated;
  });
}

export async function deleteStylePreset(this: RepositoryRuntime, presetId: string): Promise<void> {
  return withWriteLock(this, async () => {
    const presets = await readPresets(this);
    const next = presets.filter((preset) => preset.id !== presetId);
    if (next.length === presets.length) throw new RepositoryError(`Style preset not found: ${presetId}`, "STYLE_PRESET_NOT_FOUND");
    await writePresets(this, next);
  });
}
