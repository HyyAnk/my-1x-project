import { readFile } from "node:fs/promises";
import {
  MascotActionTypeSchema,
  QuizImageStyleSchema,
  type MascotProfile,
  type MascotSpriteAction,
  type MascotActionType,
  type QuizImageStyle,
} from "@studio/shared";
import type { RepositoryService } from "../../repository.js";
import { createZipArchive, parseZipArchive, type ZipEntry } from "../zipHelper.js";
import { removeImageBackground } from "../../utils/imageMatting.js";

export interface RawMascotActionEntry {
  action?: string;
  sprite_url?: string;
  preview_url?: string;
  frames_count?: number;
  fps?: number;
  loop?: boolean;
  frame_width?: number;
  frame_height?: number;
  offset_x?: number;
  offset_y?: number;
  motion_preset?: "breathe" | "sway" | "jump" | "shake" | "wave" | "point" | "pulse" | "float" | "none";
  motion_speed?: number;
  motion_intensity?: "subtle" | "normal" | "dynamic";
}

export interface RawMascotPackageManifest {
  id?: string;
  name?: string;
  description?: string;
  visual_style?: string;
  master_prompt?: string;
  color_theme?: string;
  master_image_url?: string | null;
  actions?: Record<string, RawMascotActionEntry | null | undefined>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseRawMascotActionEntry(value: unknown): RawMascotActionEntry | null {
  if (!isRecord(value)) return null;
  const entry: RawMascotActionEntry = {};
  if (typeof value.action === "string") entry.action = value.action;
  if (typeof value.sprite_url === "string") entry.sprite_url = value.sprite_url;
  if (typeof value.preview_url === "string") entry.preview_url = value.preview_url;
  if (typeof value.frames_count === "number") entry.frames_count = value.frames_count;
  if (typeof value.fps === "number") entry.fps = value.fps;
  if (typeof value.loop === "boolean") entry.loop = value.loop;
  if (typeof value.frame_width === "number") entry.frame_width = value.frame_width;
  if (typeof value.frame_height === "number") entry.frame_height = value.frame_height;
  if (typeof value.offset_x === "number") entry.offset_x = value.offset_x;
  if (typeof value.offset_y === "number") entry.offset_y = value.offset_y;
  if (
    typeof value.motion_preset === "string" &&
    ["breathe", "sway", "jump", "shake", "wave", "point", "pulse", "float", "none"].includes(value.motion_preset)
  ) {
    entry.motion_preset = value.motion_preset as RawMascotActionEntry["motion_preset"];
  }
  if (typeof value.motion_speed === "number") entry.motion_speed = value.motion_speed;
  if (
    typeof value.motion_intensity === "string" &&
    ["subtle", "normal", "dynamic"].includes(value.motion_intensity)
  ) {
    entry.motion_intensity = value.motion_intensity as RawMascotActionEntry["motion_intensity"];
  }
  return entry;
}

function parseRawMascotManifest(data: unknown): RawMascotPackageManifest {
  if (!isRecord(data)) {
    throw new Error("Invalid Mascot ZIP package: mascot.json manifest root must be an object");
  }

  const actions: Record<string, RawMascotActionEntry | null | undefined> = {};
  if (isRecord(data.actions)) {
    for (const [key, val] of Object.entries(data.actions)) {
      if (val === null || val === undefined) {
        actions[key] = val;
      } else {
        const parsedEntry = parseRawMascotActionEntry(val);
        if (parsedEntry) {
          actions[key] = parsedEntry;
        }
      }
    }
  }

  return {
    name: typeof data.name === "string" ? data.name : undefined,
    description: typeof data.description === "string" ? data.description : undefined,
    visual_style: typeof data.visual_style === "string" ? data.visual_style : undefined,
    master_prompt: typeof data.master_prompt === "string" ? data.master_prompt : undefined,
    color_theme: typeof data.color_theme === "string" ? data.color_theme : undefined,
    master_image_url: typeof data.master_image_url === "string" ? data.master_image_url : null,
    actions,
  };
}

async function resolveImportedAssets(
  repository: RepositoryService,
  mascotId: string,
  entries: ZipEntry[],
): Promise<Map<string, string>> {
  const assetEntries = entries.filter((e) => e.filename.startsWith("assets/") || e.filename.includes("/assets/"));
  const urlMap = new Map<string, string>();

  for (const asset of assetEntries) {
    const cleanFilename = asset.filename.split("/").pop() || "asset.png";
    const transparentData = await removeImageBackground(asset.data);
    const newUrl = await repository.saveMascotAsset(mascotId, cleanFilename, transparentData);
    urlMap.set(cleanFilename, newUrl);
  }

  return urlMap;
}

function buildImportedActions(
  rawActions: Record<string, RawMascotActionEntry | null | undefined> | undefined,
  urlMap: Map<string, string>,
): Record<string, MascotSpriteAction | null> {
  const importedActions: Record<string, MascotSpriteAction | null> = {};
  if (!rawActions) return importedActions;

  for (const [actionKey, act] of Object.entries(rawActions)) {
    if (act && typeof act.sprite_url === "string") {
      const oldSpriteFile = act.sprite_url.split("/").pop();
      const newSpriteUrl = oldSpriteFile && urlMap.has(oldSpriteFile) ? urlMap.get(oldSpriteFile)! : "";
      const actionType: MascotActionType =
        MascotActionTypeSchema.safeParse(actionKey).success ? (actionKey as MascotActionType) : "idle";

      importedActions[actionKey] = {
        action: actionType,
        sprite_url: newSpriteUrl,
        preview_url: newSpriteUrl,
        frames_count: typeof act.frames_count === "number" ? act.frames_count : 1,
        fps: typeof act.fps === "number" ? act.fps : 8,
        loop: typeof act.loop === "boolean" ? act.loop : true,
        frame_width: typeof act.frame_width === "number" ? act.frame_width : 512,
        frame_height: typeof act.frame_height === "number" ? act.frame_height : 512,
        offset_x: typeof act.offset_x === "number" ? act.offset_x : 0,
        offset_y: typeof act.offset_y === "number" ? act.offset_y : 0,
        motion_preset: act.motion_preset,
        motion_speed: typeof act.motion_speed === "number" ? act.motion_speed : undefined,
        motion_intensity: act.motion_intensity,
      };
    }
  }

  return importedActions;
}

/**
 * Packages full mascot manifest and all sprite assets into a standard ZIP archive
 */
export async function exportMascotPackage(
  repository: RepositoryService,
  mascotId: string,
): Promise<{ zipBuffer: Buffer; filename: string }> {
  const mascot = await repository.getMascot(mascotId);
  const assetFilenames = await repository.listMascotAssets(mascotId);
  const files: ZipEntry[] = [];

  const manifestJson = JSON.stringify(mascot, null, 2);
  files.push({ filename: "mascot.json", data: Buffer.from(manifestJson, "utf8") });

  for (const filename of assetFilenames) {
    try {
      const fileInfo = await repository.getMascotAssetFile(mascotId, filename);
      const content = await readFile(fileInfo.absolutePath);
      files.push({ filename: `assets/${filename}`, data: content });
    } catch {
      // Ignore missing or unreadable asset
    }
  }

  const safeName = mascot.name.toLowerCase().replace(/[^a-z0-9_-]/g, "_");
  const zipBuffer = createZipArchive(files);
  return { zipBuffer, filename: `mascot_${safeName}_${mascot.id}.zip` };
}

/**
 * Imports a mascot from a standard ZIP archive package
 */
export async function importMascotPackage(repository: RepositoryService, zipBuffer: Buffer): Promise<MascotProfile> {
  const entries = parseZipArchive(zipBuffer);
  const manifestEntry = entries.find((e) => e.filename === "mascot.json" || e.filename.endsWith("/mascot.json"));
  if (!manifestEntry) {
    throw new Error("Invalid Mascot ZIP package: missing mascot.json manifest");
  }

  const rawJson: unknown = JSON.parse(Buffer.from(manifestEntry.data).toString("utf8"));
  const raw = parseRawMascotManifest(rawJson);
  const name = raw.name || "Imported Mascot";
  const visualStyle: QuizImageStyle =
    raw.visual_style && QuizImageStyleSchema.safeParse(raw.visual_style).success
      ? (raw.visual_style as QuizImageStyle)
      : "pixar_3d";

  const newMascot = await repository.saveMascot({
    name: `${name} (Imported)`,
    description: raw.description || "",
    visual_style: visualStyle,
    master_prompt: raw.master_prompt || "",
    color_theme: raw.color_theme || "#06b6d4",
  });

  const urlMap = await resolveImportedAssets(repository, newMascot.id, entries);

  let masterUrl: string | null = null;
  if (typeof raw.master_image_url === "string") {
    const oldFile = raw.master_image_url.split("/").pop();
    if (oldFile && urlMap.has(oldFile)) {
      masterUrl = urlMap.get(oldFile)!;
    }
  }

  const importedActions = buildImportedActions(raw.actions, urlMap);

  return repository.saveMascot({
    ...newMascot,
    master_image_url: masterUrl,
    actions: importedActions,
    updated_at: new Date().toISOString(),
  });
}
