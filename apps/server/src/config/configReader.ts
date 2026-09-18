import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { AppConfigSchema, type AppConfig } from "@studio/shared";
import { studioRuntimePath } from "../runtimePaths.js";
import {
  DEFAULT_CONFIG,
  antigravitySettingsFilename,
  audioSettingsFilename,
  codexSettingsFilename,
  imageSettingsFilename,
} from "./defaults.js";

export async function readJsonFile(filePath: string): Promise<Record<string, unknown>> {
  try {
    const raw = JSON.parse(await readFile(filePath, "utf8")) as unknown;
    return raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

function asObject(val: unknown): Record<string, unknown> {
  return val && typeof val === "object" && !Array.isArray(val) ? (val as Record<string, unknown>) : {};
}

interface LocalSettingsOverrides {
  localCodex: Record<string, unknown>;
  localAgySettings: Record<string, unknown>;
  localAudioSettings: Record<string, unknown>;
  localImageSettings: Record<string, unknown>;
  localFallbackSettings: Record<string, unknown>;
}

async function loadLocalOverrides(rootDirectory: string): Promise<LocalSettingsOverrides> {
  const localCodexFile = await readJsonFile(studioRuntimePath(rootDirectory, codexSettingsFilename));
  const localAgyFile = await readJsonFile(studioRuntimePath(rootDirectory, antigravitySettingsFilename));
  const localAudioFile = await readJsonFile(studioRuntimePath(rootDirectory, audioSettingsFilename));
  const localImageFile = await readJsonFile(studioRuntimePath(rootDirectory, imageSettingsFilename));

  return {
    localCodex: asObject(localCodexFile.codex),
    localAgySettings: asObject(localAgyFile.antigravity),
    localAudioSettings: asObject(localAudioFile.audio_generation),
    localImageSettings: asObject(localImageFile.image_generation),
    localFallbackSettings: asObject(localImageFile.image_fallback),
  };
}

export async function loadConfig(rootDirectory: string): Promise<AppConfig> {
  const configPath = studioRuntimePath(rootDirectory, "config.json");
  const local = await loadLocalOverrides(rootDirectory);

  try {
    const raw = await readJsonFile(configPath);
    return AppConfigSchema.parse({
      ...DEFAULT_CONFIG,
      ...raw,
      mascot_stage: { ...DEFAULT_CONFIG.mascot_stage, ...asObject(raw.mascot_stage) },
      video_generation: { ...DEFAULT_CONFIG.video_generation, ...asObject(raw.video_generation) },
      codex: { ...DEFAULT_CONFIG.codex, ...asObject(raw.codex), api_key: "", ...local.localCodex },
      antigravity: { ...DEFAULT_CONFIG.antigravity, ...asObject(raw.antigravity), api_key: "", ...local.localAgySettings },
      audio_generation: { ...DEFAULT_CONFIG.audio_generation, ...asObject(raw.audio_generation), ...local.localAudioSettings },
      image_generation: { ...DEFAULT_CONFIG.image_generation, ...asObject(raw.image_generation), ...local.localImageSettings },
      image_fallback: { ...DEFAULT_CONFIG.image_fallback, ...asObject(raw.image_fallback), ...local.localFallbackSettings },
      question_history: { ...DEFAULT_CONFIG.question_history, ...asObject(raw.question_history) },
      knowledge_base: { ...DEFAULT_CONFIG.knowledge_base, ...asObject(raw.knowledge_base) },
    });
  } catch {
    await mkdir(path.dirname(configPath), { recursive: true });
    await writeFile(configPath, `${JSON.stringify(DEFAULT_CONFIG, null, 2)}\n`, "utf8");
    return AppConfigSchema.parse({
      ...DEFAULT_CONFIG,
      codex: { ...DEFAULT_CONFIG.codex, ...local.localCodex },
      antigravity: { ...DEFAULT_CONFIG.antigravity, ...local.localAgySettings },
      audio_generation: { ...DEFAULT_CONFIG.audio_generation, ...local.localAudioSettings },
      image_generation: { ...DEFAULT_CONFIG.image_generation, ...local.localImageSettings },
      image_fallback: { ...DEFAULT_CONFIG.image_fallback, ...local.localFallbackSettings },
    });
  }
}
