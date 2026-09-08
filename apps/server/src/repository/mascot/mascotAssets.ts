import { mkdir, readdir, stat, unlink } from "node:fs/promises";
import path from "node:path";
import { RepositoryError } from "../errors.js";
import type { RepositoryRuntime } from "../runtime.js";

export async function saveMascotAsset(this: RepositoryRuntime, mascotId: string, filename: string, content: Uint8Array): Promise<string> {
  await this.ensureBootstrap();
  const mascotDir = path.join(this.roots.mascots, mascotId);
  const assetDir = path.join(mascotDir, "assets");
  await mkdir(assetDir, { recursive: true });
  const targetFile = path.join(assetDir, filename);
  await this.writeBinaryAtomic(targetFile, content);
  return `/api/mascots/${mascotId}/assets/${filename}`;
}

export async function getMascotAssetFile(
  this: RepositoryRuntime,
  mascotId: string,
  filename: string,
): Promise<{ absolutePath: string; size: number; modified_at: string }> {
  const mascotDir = path.join(this.roots.mascots, mascotId);
  const absolutePath = path.join(mascotDir, "assets", filename);
  try {
    await this.assertRealPathInside(this.roots.mascots, absolutePath);
    const metadata = await stat(absolutePath);
    return { absolutePath, size: metadata.size, modified_at: metadata.mtime.toISOString() };
  } catch {
    throw new RepositoryError("Mascot asset not found", "MASCOT_ASSET_NOT_FOUND");
  }
}

export async function listMascotAssets(this: RepositoryRuntime, mascotId: string): Promise<string[]> {
  const mascotDir = path.join(this.roots.mascots, mascotId, "assets");
  try {
    const entries = await readdir(mascotDir, { withFileTypes: true });
    return entries.filter((e) => e.isFile()).map((e) => e.name);
  } catch {
    return [];
  }
}

export async function deleteMascotAssetFile(this: RepositoryRuntime, mascotId: string, filename: string): Promise<void> {
  const mascotDir = path.join(this.roots.mascots, mascotId);
  const absolutePath = path.join(mascotDir, "assets", filename);
  try {
    await this.assertRealPathInside(this.roots.mascots, absolutePath);
    await unlink(absolutePath);
  } catch {
    // Ignore if already deleted
  }
}
