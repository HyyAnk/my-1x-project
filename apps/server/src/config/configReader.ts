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

export async function loadConfig(rootDirectory: string): Promise<AppConfig> {
  const configPath = studioRuntimePath(rootDirectory, "config.json");
  const localConfigPath = studioRuntimePath(rootDirectory, codexSettingsFilename);
  const localAgyConfigPath = studioRuntimePath(rootDirectory, antigravitySettingsFilename);
  try {
    const raw = await readJsonFile(configPath);
    const local = await readJsonFile(localConfigPath);
    const localAgy = await readJsonFile(localAgyConfigPath);
    const localAudio = await readJsonFile(studioRuntimePath(rootDirectory, audioSettingsFilename));
    const localImage = await readJsonFile(studioRuntimePath(rootDirectory, imageSettingsFilename));
    const trackedCodex = raw.codex && typeof raw.codex === "object" ? (raw.codex as Record<string, unknown>) : {};
    const localCodex = local.codex && typeof local.codex === "object" ? (local.codex as Record<string, unknown>) : {};
    const trackedAgy = raw.antigravity && typeof raw.antigravity === "object" ? (raw.antigravity as Record<string, unknown>) : {};
    const localAgySettings =
      localAgy.antigravity && typeof localAgy.antigravity === "object" ? (localAgy.antigravity as Record<string, unknown>) : {};
    const trackedAudio =
      raw.audio_generation && typeof raw.audio_generation === "object" ? (raw.audio_generation as Record<string, unknown>) : {};
    const localAudioSettings =
      localAudio.audio_generation && typeof localAudio.audio_generation === "object"
        ? (localAudio.audio_generation as Record<string, unknown>)
        : {};
    const trackedImages =
      raw.image_generation && typeof raw.image_generation === "object" ? (raw.image_generation as Record<string, unknown>) : {};
    const localImageSettings =
      localImage.image_generation && typeof localImage.image_generation === "object"
        ? (localImage.image_generation as Record<string, unknown>)
        : {};
    const trackedHistory =
      raw.question_history && typeof raw.question_history === "object" ? (raw.question_history as Record<string, unknown>) : {};
    return AppConfigSchema.parse({
      ...DEFAULT_CONFIG,
      ...raw,
      mascot_stage: { ...DEFAULT_CONFIG.mascot_stage, ...(raw.mascot_stage as object | undefined) },
      video_generation: { ...DEFAULT_CONFIG.video_generation, ...(raw.video_generation as object | undefined) },
      codex: { ...DEFAULT_CONFIG.codex, ...trackedCodex, api_key: "", ...localCodex },
      antigravity: { ...DEFAULT_CONFIG.antigravity, ...trackedAgy, api_key: "", ...localAgySettings },
      audio_generation: { ...DEFAULT_CONFIG.audio_generation, ...trackedAudio, ...localAudioSettings },
      image_generation: { ...DEFAULT_CONFIG.image_generation, ...trackedImages, ...localImageSettings },
      question_history: { ...DEFAULT_CONFIG.question_history, ...trackedHistory },
    });
  } catch {
    await mkdir(path.dirname(configPath), { recursive: true });
    await writeFile(configPath, `${JSON.stringify(DEFAULT_CONFIG, null, 2)}\n`, "utf8");
    const local = await readJsonFile(localConfigPath);
    const localCodex = local.codex && typeof local.codex === "object" ? (local.codex as Record<string, unknown>) : {};
    const localAgy = await readJsonFile(localAgyConfigPath);
    const localAgySettings =
      localAgy.antigravity && typeof localAgy.antigravity === "object" ? (localAgy.antigravity as Record<string, unknown>) : {};
    const localAudio = await readJsonFile(studioRuntimePath(rootDirectory, audioSettingsFilename));
    const localAudioSettings =
      localAudio.audio_generation && typeof localAudio.audio_generation === "object"
        ? (localAudio.audio_generation as Record<string, unknown>)
        : {};
    const localImage = await readJsonFile(studioRuntimePath(rootDirectory, imageSettingsFilename));
    const localImageSettings =
      localImage.image_generation && typeof localImage.image_generation === "object"
        ? (localImage.image_generation as Record<string, unknown>)
        : {};
    return AppConfigSchema.parse({
      ...DEFAULT_CONFIG,
      codex: { ...DEFAULT_CONFIG.codex, ...localCodex },
      antigravity: { ...DEFAULT_CONFIG.antigravity, ...localAgySettings },
      audio_generation: { ...DEFAULT_CONFIG.audio_generation, ...localAudioSettings },
      image_generation: { ...DEFAULT_CONFIG.image_generation, ...localImageSettings },
    });
  }
}
