import { createHash, randomUUID } from "node:crypto";
import { copyFile, link, lstat, mkdir, open, readFile, unlink } from "node:fs/promises";
import path from "node:path";
import type { VariantExportMode } from "@studio/shared";
import { resolveMediaMimeType } from "../../../utils/mediaMime.js";
import { assertSafeExportDirectory } from "./exportFolders.js";
import { VariantExportError, type ExportItem, type ExportRepository } from "./variantExport.types.js";

function sourceFilename(mascotId: string, sourceUrl: string): string {
  const prefix = `/api/mascots/${encodeURIComponent(mascotId)}/assets/`;
  if (!sourceUrl.startsWith(prefix)) throw new VariantExportError("Source is not a local mascot image. Re-upload this variant and retry.");
  const filename = decodeURIComponent(sourceUrl.slice(prefix.length).split("?")[0]);
  if (!filename || filename === "." || filename === ".." || /[\\/:\0]/.test(filename)) {
    throw new VariantExportError("Source image path is invalid. Re-upload this variant and retry.");
  }
  return filename;
}

async function prepareDirectory(root: string, directories: string[]): Promise<string> {
  await assertSafeExportDirectory(root, root);
  let current = root;
  for (const directory of directories) {
    current = path.join(current, directory);
    await mkdir(current).catch((error: NodeJS.ErrnoException) => {
      if (error.code !== "EEXIST") throw error;
    });
    await assertSafeExportDirectory(root, current);
  }
  return current;
}

async function publishFile(temporary: string, target: string, bytes: Buffer): Promise<void> {
  try {
    await link(temporary, target);
    return;
  } catch (error) {
    if (!["EPERM", "ENOTSUP", "EOPNOTSUPP", "EXDEV", "ENOSYS"].includes((error as NodeJS.ErrnoException).code || "")) throw error;
  }
  // FAT/exFAT and some network shares do not support hard links. Exclusive
  // creation still prevents overwrites; remove only our new file on failure.
  const handle = await open(target, "wx");
  try {
    await handle.writeFile(bytes);
    await handle.sync();
  } catch (error) {
    await handle.close();
    await unlink(target);
    throw error;
  }
  await handle.close();
}

async function publishWithoutOverwrite(
  temporary: string,
  directory: string,
  stem: string,
  extension: string,
): Promise<"copied" | "skipped"> {
  const bytes = await readFile(temporary);
  const hash = createHash("sha256").update(bytes).digest("hex");
  for (let index = 0; index < 100; index++) {
    const suffix = index === 0 ? "" : `_${hash.slice(0, 10)}${index > 1 ? `_${index}` : ""}`;
    const target = path.join(directory, `${stem}${suffix}.${extension}`);
    try {
      await publishFile(temporary, target, bytes);
      return "copied";
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
      const metadata = await lstat(target);
      if (metadata.isSymbolicLink() || !metadata.isFile()) continue;
      if (metadata.size === bytes.length && bytes.equals(await readFile(target))) return "skipped";
    }
  }
  throw new VariantExportError("Too many conflicting filenames. Choose another destination.");
}

export async function exportVariantFile(
  repository: ExportRepository,
  mascotId: string,
  mode: VariantExportMode,
  root: string,
  item: ExportItem,
) {
  const filename = sourceFilename(mascotId, item.sourceUrl);
  const source =
    mode === "transparent"
      ? await repository.getOrCreateTransparentMascotAsset(mascotId, filename)
      : await repository.getMascotAssetFile(mascotId, filename);
  const mime = mode === "transparent" ? "image/png" : await resolveMediaMimeType(source.absolutePath, filename);
  const extension = ({ "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" } as Record<string, string>)[mime];
  if (!extension) throw new VariantExportError("Unsupported source image format. Use PNG, JPEG, or WebP.");
  const directory = await prepareDirectory(root, item.directories);
  const temporary = path.join(directory, `.export-${randomUUID()}.tmp`);
  try {
    await copyFile(source.absolutePath, temporary);
    return await publishWithoutOverwrite(temporary, directory, item.stem, extension);
  } finally {
    await unlink(temporary).catch((error: NodeJS.ErrnoException) => {
      if (error.code !== "ENOENT") throw error;
    });
  }
}
