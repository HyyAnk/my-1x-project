import {
  MASCOT_RENDER_CONTRACT_VERSION,
  QuizImageStyleSchema,
  adaptMascotAssetsV1ToV2,
  adaptMascotConfigV1ToV2,
  adaptMascotV1ToV2,
  type MascotProfile,
  type QuizImageStyle,
} from "@studio/shared";
import type { RepositoryService } from "../../../repository.js";
import { parseZipArchive, type ZipEntry } from "../../zipHelper.js";
import { removeImageBackground } from "../../../utils/imageMatting.js";
import { parseRawMascotManifest } from "./packageManifestParser.js";
import { buildImportedActions, buildImportedRenderBundle, buildImportedStyles, remapAssetUrl } from "./packageImportBuilder.js";

export { remapAssetUrl, buildImportedStyles, buildImportedActions, buildImportedRenderBundle } from "./packageImportBuilder.js";

export async function resolveImportedAssets(
  repository: RepositoryService,
  mascotId: string,
  entries: ZipEntry[],
): Promise<Map<string, string>> {
  const assetEntries = entries.filter((e) => e.filename.startsWith("assets/") || e.filename.includes("/assets/"));
  const urlMap = new Map<string, string>();

  for (const asset of assetEntries) {
    const cleanFilename = asset.filename.split("/").pop() || "asset.png";
    const assetData = cleanFilename.includes("_raw_") ? asset.data : await removeImageBackground(asset.data);
    const newUrl = await repository.saveMascotAsset(mascotId, cleanFilename, assetData);
    urlMap.set(cleanFilename, newUrl);
  }

  return urlMap;
}

/**
 * Imports a mascot from a standard ZIP archive package.
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
    raw.visual_style && QuizImageStyleSchema.safeParse(raw.visual_style).success ? (raw.visual_style as QuizImageStyle) : "pixar_3d";

  const newMascot = await repository.saveMascot({
    name: `${name} (Imported)`,
    description: raw.description || "",
    visual_style: visualStyle,
    master_prompt: raw.master_prompt || "",
    color_theme: raw.color_theme || "#06b6d4",
  });

  const urlMap = await resolveImportedAssets(repository, newMascot.id, entries);

  const masterUrl = remapAssetUrl(raw.master_image_url, urlMap);
  const masterRawUrl = remapAssetUrl(raw.master_raw_image_url, urlMap);
  const importedActions = buildImportedActions(raw.actions, urlMap);
  const importedStyles = buildImportedStyles(raw.styles, urlMap);
  let importedRenderBundle = buildImportedRenderBundle(raw.render_bundle, urlMap, masterUrl, importedActions);

  // If render_bundle was not present in the package, adapt from imported profile data
  if (!importedRenderBundle) {
    const candidateProfile: MascotProfile = {
      ...newMascot,
      master_image_url: masterUrl,
      master_raw_image_url: masterRawUrl,
      actions: importedActions,
      styles: importedStyles.length > 0 ? importedStyles : newMascot.styles,
    };
    importedRenderBundle = adaptMascotV1ToV2(candidateProfile) ?? {
      config: adaptMascotConfigV1ToV2(),
      assets: adaptMascotAssetsV1ToV2(candidateProfile),
    };
  }

  return repository.saveMascot({
    ...newMascot,
    master_image_url: masterUrl,
    master_raw_image_url: masterRawUrl,
    actions: importedActions,
    styles: importedStyles.length > 0 ? importedStyles : undefined,
    active_style_id: raw.active_style_id,
    schema_version: MASCOT_RENDER_CONTRACT_VERSION,
    render_bundle: importedRenderBundle,
    updated_at: new Date().toISOString(),
  });
}
