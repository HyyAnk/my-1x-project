import { readFile } from "node:fs/promises";
import {
  MASCOT_RENDER_CONTRACT_VERSION,
  adaptMascotAssetsV1ToV2,
  adaptMascotConfigV1ToV2,
  adaptMascotV1ToV2,
  type MascotProfile,
} from "@studio/shared";
import type { RepositoryService } from "../../../repository.js";
import { createZipArchive, type ZipEntry } from "../../zipHelper.js";

/**
 * Packages full mascot manifest and all sprite assets into a standard ZIP archive.
 */
export async function exportMascotPackage(
  repository: RepositoryService,
  mascotId: string,
): Promise<{ zipBuffer: Buffer; filename: string }> {
  const mascot = await repository.getMascot(mascotId);
  const assetFilenames = await repository.listMascotAssets(mascotId);
  const files: ZipEntry[] = [];

  const effectiveBundle = mascot.render_bundle ??
    adaptMascotV1ToV2(mascot) ?? {
      config: adaptMascotConfigV1ToV2(),
      assets: adaptMascotAssetsV1ToV2(mascot),
    };

  const exportPayload: MascotProfile = {
    ...mascot,
    schema_version: mascot.schema_version ?? MASCOT_RENDER_CONTRACT_VERSION,
    render_bundle: effectiveBundle,
  };

  const manifestJson = JSON.stringify(exportPayload, null, 2);
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
