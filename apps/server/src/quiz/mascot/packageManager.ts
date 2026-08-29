import { readFile } from "node:fs/promises";
import type { MascotProfile, MascotSpriteAction, MascotActionType, QuizImageStyle } from "@studio/shared";
import type { RepositoryService } from "../../repository.js";
import { createZipArchive, parseZipArchive } from "../zipHelper.js";
import { removeImageBackground } from "../../utils/imageMatting.js";

/**
 * Packages full mascot manifest and all sprite assets into a standard ZIP archive
 */
export async function exportMascotPackage(
  repository: RepositoryService,
  mascotId: string,
): Promise<{ zipBuffer: Buffer; filename: string }> {
  const mascot = await repository.getMascot(mascotId);
  const assetFilenames = await repository.listMascotAssets(mascotId);
  const files: { filename: string; data: Uint8Array }[] = [];

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

  const raw = JSON.parse(Buffer.from(manifestEntry.data).toString("utf8")) as Record<string, unknown>;
  const name = (raw.name as string) || "Imported Mascot";
  const newMascot = await repository.saveMascot({
    name: `${name} (Imported)`,
    description: (raw.description as string) || "",
    visual_style: (raw.visual_style as QuizImageStyle) || "pixar_3d",
    master_prompt: (raw.master_prompt as string) || "",
    color_theme: (raw.color_theme as string) || "#06b6d4",
  });

  const assetEntries = entries.filter((e) => e.filename.startsWith("assets/") || e.filename.includes("/assets/"));
  const urlMap = new Map<string, string>();

  for (const asset of assetEntries) {
    const cleanFilename = asset.filename.split("/").pop() || "asset.png";
    const transparentData = await removeImageBackground(asset.data);
    const newUrl = await repository.saveMascotAsset(newMascot.id, cleanFilename, transparentData);
    urlMap.set(cleanFilename, newUrl);
  }

  let masterUrl: string | null = null;
  if (typeof raw.master_image_url === "string") {
    const oldFile = raw.master_image_url.split("/").pop();
    if (oldFile && urlMap.has(oldFile)) {
      masterUrl = urlMap.get(oldFile)!;
    }
  }

  const importedActions: Record<string, MascotSpriteAction | null> = {};
  if (raw.actions && typeof raw.actions === "object") {
    for (const [actionKey, act] of Object.entries(raw.actions as Record<string, any>)) {
      if (act && typeof act === "object" && typeof act.sprite_url === "string") {
        const oldSpriteFile = act.sprite_url.split("/").pop();
        const newSpriteUrl = oldSpriteFile && urlMap.has(oldSpriteFile) ? urlMap.get(oldSpriteFile)! : "";
        importedActions[actionKey] = {
          ...act,
          action: actionKey as MascotActionType,
          sprite_url: newSpriteUrl,
          preview_url: newSpriteUrl,
          offset_x: act.offset_x || 0,
          offset_y: act.offset_y || 0,
        };
      }
    }
  }

  return repository.saveMascot({
    ...newMascot,
    master_image_url: masterUrl,
    actions: importedActions,
    updated_at: new Date().toISOString(),
  });
}
