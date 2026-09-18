import { copyFile, mkdir, readdir, stat } from "node:fs/promises";
import path from "node:path";
import type { ThumbnailManifest } from "@studio/shared";

export interface PackageThumbnailsOptions {
  assetsDirectory: string;
  exportThumbnailsDirectory: string;
  thumbnailManifest?: ThumbnailManifest | null;
}

export interface PackagedThumbnailsResult {
  primaryThumbnail: string | null;
  availableThumbnails: string[];
}

const SUPPORTED_IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp"]);

export async function packageExportThumbnails(options: PackageThumbnailsOptions): Promise<PackagedThumbnailsResult> {
  const { assetsDirectory, exportThumbnailsDirectory, thumbnailManifest } = options;
  await mkdir(exportThumbnailsDirectory, { recursive: true });

  const availableThumbnails: string[] = [];
  let primaryCopied = false;

  const defaultDest = path.join(exportThumbnailsDirectory, "thumbnail_default.jpg");
  const active169Path = path.join(assetsDirectory, "thumbnail_16_9.jpg");

  let activeSourcePath: string | null = null;
  try {
    const fileStat = await stat(active169Path);
    if (fileStat.isFile()) {
      activeSourcePath = active169Path;
    }
  } catch {
    // active 16:9 file may not exist yet
  }

  if (!activeSourcePath && thumbnailManifest?.active_16_9_id) {
    const activeItem = thumbnailManifest.history?.find((h) => h.id === thumbnailManifest.active_16_9_id);
    if (activeItem?.file_path) {
      const candidatePath = path.isAbsolute(activeItem.file_path)
        ? activeItem.file_path
        : path.resolve(assetsDirectory, "..", activeItem.file_path);
      try {
        const itemStat = await stat(candidatePath);
        if (itemStat.isFile()) activeSourcePath = candidatePath;
      } catch {
        // ignore missing item
      }
    }
  }

  if (activeSourcePath) {
    await copyFile(activeSourcePath, defaultDest);
    primaryCopied = true;
    availableThumbnails.push("thumbnails/thumbnail_default.jpg");
  }

  const sourceThumbnailsDir = path.join(assetsDirectory, "thumbnails");
  try {
    const entries = await readdir(sourceThumbnailsDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isFile()) continue;
      const ext = path.extname(entry.name).toLowerCase();
      if (!SUPPORTED_IMAGE_EXTENSIONS.has(ext)) continue;

      const src = path.join(sourceThumbnailsDir, entry.name);
      const dest = path.join(exportThumbnailsDirectory, entry.name);

      await copyFile(src, dest);
      const relPath = `thumbnails/${entry.name}`;
      if (!availableThumbnails.includes(relPath)) {
        availableThumbnails.push(relPath);
      }

      if (!primaryCopied) {
        await copyFile(src, defaultDest);
        primaryCopied = true;
        availableThumbnails.unshift("thumbnails/thumbnail_default.jpg");
      }
    }
  } catch {
    // source thumbnails directory might not exist yet
  }

  return {
    primaryThumbnail: primaryCopied ? "thumbnails/thumbnail_default.jpg" : null,
    availableThumbnails,
  };
}
