import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  AudioSettingsInputSchema,
  CodexSettingsInputSchema,
  ImageSettingsInputSchema,
  MascotStageSettingsInputSchema,
  VideoSettingsInputSchema,
  AntigravitySettingsInputSchema,
  EngineSettingsInputSchema,
  SaveHistorySettingsInputSchema,
  type AppConfig,
  type AudioSettingsInput,
  type CodexSettingsInput,
  type ImageSettingsInput,
  type MascotStageSettingsInput,
  type VideoSettingsInput,
  type AntigravitySettingsInput,
  type EngineSettingsInput,
  type SaveHistorySettingsInput,
} from "@studio/shared";
import { studioRuntimePath } from "../runtimePaths.js";
import {
  antigravitySettingsFilename,
  audioSettingsFilename,
  codexSettingsFilename,
  imageSettingsFilename,
  storageSettingsFilename,
  type StorageSettings,
} from "./defaults.js";
import { loadConfig, readJsonFile } from "./configReader.js";

function withoutRemovedSessionCleanupSettings(settings: Record<string, unknown>): Record<string, unknown> {
  const {
    auto_delete_threads: _removedAutoDeleteThreads,
    failed_thread_retention_days: _removedRetentionDays,
    ...retainedSettings
  } = settings;
  return retainedSettings;
}

export async function saveHistorySettings(rootDirectory: string, input: SaveHistorySettingsInput): Promise<AppConfig> {
  const parsed = SaveHistorySettingsInputSchema.parse(input);
  const current = await loadConfig(rootDirectory);
  const next = { ...current.question_history, ...parsed };
  const configPath = studioRuntimePath(rootDirectory, "config.json");
  await mkdir(path.dirname(configPath), { recursive: true });
  const raw = await readJsonFile(configPath);
  await writeFile(configPath, `${JSON.stringify({ ...raw, question_history: next }, null, 2)}\n`, "utf8");
  return loadConfig(rootDirectory);
}

export async function saveCodexSettings(rootDirectory: string, input: CodexSettingsInput): Promise<AppConfig> {
  const parsed = CodexSettingsInputSchema.parse(input);
  const settingsDirectory = studioRuntimePath(rootDirectory);
  const localPath = path.join(settingsDirectory, codexSettingsFilename);
  const currentLocal = await readJsonFile(localPath);
  const currentCodex = currentLocal.codex && typeof currentLocal.codex === "object" ? (currentLocal.codex as Record<string, unknown>) : {};
  const nextCodex = withoutRemovedSessionCleanupSettings(currentCodex);
  for (const key of ["transport", "model", "api_base_url", "api_key", "app_server_endpoint", "command"] as const) {
    const value = parsed[key];
    if (value !== undefined) nextCodex[key] = value;
  }
  await mkdir(settingsDirectory, { recursive: true });
  await writeFile(localPath, `${JSON.stringify({ codex: nextCodex }, null, 2)}\n`, "utf8");
  return loadConfig(rootDirectory);
}

export async function saveAntigravitySettings(rootDirectory: string, input: AntigravitySettingsInput): Promise<AppConfig> {
  const parsed = AntigravitySettingsInputSchema.parse(input);
  const settingsDirectory = studioRuntimePath(rootDirectory);
  const localPath = path.join(settingsDirectory, antigravitySettingsFilename);
  const currentLocal = await readJsonFile(localPath);
  const currentAgy =
    currentLocal.antigravity && typeof currentLocal.antigravity === "object" ? (currentLocal.antigravity as Record<string, unknown>) : {};
  const nextAgy = withoutRemovedSessionCleanupSettings(currentAgy);
  for (const key of ["model", "api_base_url", "api_key", "command"] as const) {
    const value = parsed[key];
    if (value !== undefined) nextAgy[key] = value;
  }
  await mkdir(settingsDirectory, { recursive: true });
  await writeFile(localPath, `${JSON.stringify({ antigravity: nextAgy }, null, 2)}\n`, "utf8");
  return loadConfig(rootDirectory);
}

export async function saveEngineSettings(rootDirectory: string, input: EngineSettingsInput): Promise<AppConfig> {
  const parsed = EngineSettingsInputSchema.parse(input);
  const configPath = studioRuntimePath(rootDirectory, "config.json");
  await mkdir(path.dirname(configPath), { recursive: true });
  const raw = await readJsonFile(configPath);
  raw.active_engine = parsed.active_engine;
  await writeFile(configPath, `${JSON.stringify(raw, null, 2)}\n`, "utf8");

  if (parsed.model) {
    if (parsed.active_engine === "antigravity") {
      await saveAntigravitySettings(rootDirectory, { model: parsed.model });
    } else {
      await saveCodexSettings(rootDirectory, { model: parsed.model });
    }
  }

  return loadConfig(rootDirectory);
}

export async function saveAudioSettings(rootDirectory: string, input: AudioSettingsInput): Promise<AppConfig> {
  const parsed = AudioSettingsInputSchema.parse(input);
  const settingsDirectory = studioRuntimePath(rootDirectory);
  const localPath = path.join(settingsDirectory, audioSettingsFilename);
  const currentLocal = await readJsonFile(localPath);
  const currentAudio =
    currentLocal.audio_generation && typeof currentLocal.audio_generation === "object"
      ? (currentLocal.audio_generation as Record<string, unknown>)
      : {};
  const nextAudio = { ...currentAudio } as Record<string, unknown>;
  for (const key of [
    "provider",
    "service_url",
    "exaggeration",
    "cfg_weight",
    "max_concurrent_tasks",
    "merge_gap_ms",
    "match_target_duration",
  ] as const) {
    const value = parsed[key];
    if (value !== undefined) nextAudio[key] = value;
  }
  await mkdir(settingsDirectory, { recursive: true });
  await writeFile(localPath, `${JSON.stringify({ audio_generation: nextAudio }, null, 2)}\n`, "utf8");
  return loadConfig(rootDirectory);
}

export async function saveVideoSettings(rootDirectory: string, input: VideoSettingsInput): Promise<AppConfig> {
  const parsed = VideoSettingsInputSchema.parse(input);
  const current = await loadConfig(rootDirectory);
  const next = { ...current.video_generation, ...parsed };
  const configPath = studioRuntimePath(rootDirectory, "config.json");
  await mkdir(path.dirname(configPath), { recursive: true });
  const raw = await readJsonFile(configPath);
  await writeFile(configPath, `${JSON.stringify({ ...raw, video_generation: next }, null, 2)}\n`, "utf8");
  return loadConfig(rootDirectory);
}

export async function saveMascotStageSettings(rootDirectory: string, input: MascotStageSettingsInput): Promise<AppConfig> {
  const parsed = MascotStageSettingsInputSchema.parse(input);
  const configPath = studioRuntimePath(rootDirectory, "config.json");
  await mkdir(path.dirname(configPath), { recursive: true });
  const raw = await readJsonFile(configPath);
  await writeFile(configPath, `${JSON.stringify({ ...raw, mascot_stage: parsed }, null, 2)}\n`, "utf8");
  return loadConfig(rootDirectory);
}

export async function saveImageSettings(rootDirectory: string, input: ImageSettingsInput): Promise<AppConfig> {
  const parsed = ImageSettingsInputSchema.parse(input);
  const settingsDirectory = studioRuntimePath(rootDirectory);
  const localPath = path.join(settingsDirectory, imageSettingsFilename);
  const currentLocal = await readJsonFile(localPath);
  const currentImage =
    currentLocal.image_generation && typeof currentLocal.image_generation === "object"
      ? (currentLocal.image_generation as Record<string, unknown>)
      : {};
  const nextImage = { ...currentImage } as Record<string, unknown>;
  for (const key of [
    "enabled",
    "images_per_bundle",
    "provider",
    "base_url",
    "model",
    "api_key",
    "quality",
    "max_concurrent_tasks",
  ] as const) {
    const value = parsed[key];
    if (value !== undefined) nextImage[key] = value;
  }
  await mkdir(settingsDirectory, { recursive: true });
  await writeFile(localPath, `${JSON.stringify({ image_generation: nextImage }, null, 2)}\n`, "utf8");
  return loadConfig(rootDirectory);
}

export async function loadStorageRoot(rootDirectory: string): Promise<string | null> {
  try {
    const settingsPath = studioRuntimePath(rootDirectory, storageSettingsFilename);
    const raw = JSON.parse(await readFile(settingsPath, "utf8")) as Partial<StorageSettings>;
    return typeof raw.storage_path === "string" && raw.storage_path.trim() ? path.resolve(rootDirectory, raw.storage_path) : null;
  } catch {
    return null;
  }
}

export async function saveStorageRoot(rootDirectory: string, storageRoot: string): Promise<void> {
  const settingsDirectory = studioRuntimePath(rootDirectory);
  await mkdir(settingsDirectory, { recursive: true });
  await writeFile(
    path.join(settingsDirectory, storageSettingsFilename),
    `${JSON.stringify({ storage_path: path.resolve(storageRoot) }, null, 2)}\n`,
    "utf8",
  );
}
