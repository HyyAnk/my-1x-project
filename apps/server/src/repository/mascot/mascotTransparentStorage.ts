import { rm, stat, unlink } from "node:fs/promises";
import path from "node:path";
import { RepositoryError } from "../errors.js";
import type { RepositoryRuntime } from "../runtime.js";
import type { MascotCachePaths } from "./mascotTransparentCache.types.js";

export function getTransparentMascotCachePaths(mascotsRoot: string, mascotId: string, filename: string): MascotCachePaths {
  const transparentDir = path.join(mascotsRoot, mascotId, "assets", "transparent");
  return {
    transparentDir,
    cachedPath: path.join(transparentDir, filename),
    metaPath: path.join(transparentDir, `${filename}.meta.json`),
  };
}

export async function deleteCachedTransparentAssetFile(mascotsRoot: string, mascotId: string, filename: string): Promise<void> {
  const { cachedPath, metaPath } = getTransparentMascotCachePaths(mascotsRoot, mascotId, filename);
  await Promise.all([unlink(cachedPath).catch(() => {}), unlink(metaPath).catch(() => {})]);
}

export async function clearTransparentMascotCache(mascotsRoot: string, mascotId: string): Promise<void> {
  const transparentDir = path.join(mascotsRoot, mascotId, "assets", "transparent");
  await rm(transparentDir, { recursive: true, force: true }).catch(() => {});
}

export async function getTransparentMascotAssetFile(
  this: RepositoryRuntime,
  mascotId: string,
  filename: string,
): Promise<{ absolutePath: string; size: number; modified_at: string }> {
  const { cachedPath } = getTransparentMascotCachePaths(this.roots.mascots, mascotId, filename);
  try {
    await this.assertRealPathInside(this.roots.mascots, cachedPath);
    const metadata = await stat(cachedPath);
    return { absolutePath: cachedPath, size: metadata.size, modified_at: metadata.mtime.toISOString() };
  } catch {
    throw new RepositoryError("Cached transparent mascot asset not found", "TRANSPARENT_MASCOT_ASSET_NOT_FOUND");
  }
}

export async function deleteTransparentMascotAssetFile(this: RepositoryRuntime, mascotId: string, filename: string): Promise<void> {
  await deleteCachedTransparentAssetFile(this.roots.mascots, mascotId, filename);
}
