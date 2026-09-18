import { createZipArchive, parseZipArchive } from "../../zipHelper.js";
import { CreateStylePresetInputSchema, StylePresetSchema, type CreateStylePresetInput, type StylePreset } from "@studio/shared";
import { indexPackageEntries, STYLE_MODULE_PACKAGE_VERSION, type PackageManifest } from "./modulePackageExporter.js";

export function exportStylePresetPackage(preset: StylePreset): { zipBuffer: Buffer; filename: string } {
  const parsed = StylePresetSchema.parse(preset);
  const { id: _id, revision: _revision, created_at: _created, updated_at: _updated, ...config } = parsed;
  const files = [
    {
      filename: "package.json",
      data: Buffer.from(JSON.stringify({ packageVersion: STYLE_MODULE_PACKAGE_VERSION, kind: "preset" }, null, 2)),
    },
    { filename: "preset.json", data: Buffer.from(JSON.stringify(config, null, 2)) },
  ];
  return { zipBuffer: createZipArchive(files), filename: `style-preset_${parsed.id}.zip` };
}

export function importStylePresetPackage(zipBuffer: Buffer): CreateStylePresetInput {
  const entries = parseZipArchive(zipBuffer);
  const byName = indexPackageEntries(entries);
  const packageData = byName.get("package.json");
  const presetData = byName.get("preset.json");
  if (!packageData || !presetData) {
    throw new Error("Invalid style preset package: missing package.json or preset.json");
  }
  const metadata = JSON.parse(Buffer.from(packageData).toString("utf8")) as PackageManifest;
  if (metadata.packageVersion !== STYLE_MODULE_PACKAGE_VERSION || metadata.kind !== "preset") {
    throw new Error("Unsupported style preset package");
  }
  return CreateStylePresetInputSchema.parse(JSON.parse(Buffer.from(presetData).toString("utf8")));
}
