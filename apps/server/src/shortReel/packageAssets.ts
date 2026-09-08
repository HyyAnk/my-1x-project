import { createHash, randomUUID } from "node:crypto";
import { lstat, mkdir, open, unlink } from "node:fs/promises";
import path from "node:path";
import type { ReelKey } from "@studio/shared";
import type { RepositoryService } from "../repository/service.js";
import { resolveShortReelFile, runInCanonicalShortReelQueue } from "../repository/shortReelStorage.js";
import { ReferenceError, validateImageBuffer } from "./packageImage.js";

export const assetChecksum = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");

export async function readBoundedAsset(repository: RepositoryService, root: string, file: string): Promise<Buffer> {
  await repository.assertRealPathInside(repository.storageRoot, root);
  await repository.assertRealPathInside(root, file);
  const info = await lstat(file);
  if (!info.isFile() || info.isSymbolicLink() || info.size > 20 * 1024 * 1024)
    throw new ReferenceError("FILE_TOO_LARGE", "Asset is not a bounded regular file.");
  const handle = await open(file, "r");
  try {
    const metadata = await handle.stat();
    if (!metadata.isFile() || metadata.size > 20 * 1024 * 1024) throw new ReferenceError("FILE_TOO_LARGE", "Asset exceeds the byte limit.");
    const bytes = Buffer.alloc(metadata.size + 1);
    let count = 0;
    while (count < bytes.length) {
      const result = await handle.read(bytes, count, bytes.length - count, count);
      if (!result.bytesRead) break;
      count += result.bytesRead;
    }
    if (count !== metadata.size) throw new ReferenceError("CORRUPT_IMAGE", "Asset changed while reading.");
    await repository.assertRealPathInside(root, file);
    return bytes.subarray(0, count);
  } finally {
    await handle.close();
  }
}

export async function reelAssetRoot(repository: RepositoryService, key: ReelKey): Promise<string> {
  const channel = await repository.getChannel(key.channel_id);
  return path.dirname(resolveShortReelFile(repository.roots, channel.slug, key.reel_id));
}

/** New files only: an unaccepted or stale attempt cannot overwrite accepted bytes. */
export async function storePackageAsset(
  repository: RepositoryService,
  key: ReelKey,
  role: "mascot" | "style" | "cover",
  format: string,
  bytes: Buffer,
) {
  repository.acquireWriterAdmission();
  const storageRoot = repository.storageRoot;
  return runInCanonicalShortReelQueue(
    storageRoot,
    `${key.channel_id}:${key.reel_id}:assets`,
    async () => {
      const root = await reelAssetRoot(repository, key);
      await repository.assertRealPathInside(storageRoot, root);
      const directory = path.join(root, role === "cover" ? "assets" : "references");
      try {
        await lstat(directory);
      } catch (error) {
        if (!(error instanceof Error) || !("code" in error) || error.code !== "ENOENT") throw error;
        await mkdir(directory);
      }
      await repository.assertRealPathInside(root, directory);
      if ((await lstat(directory)).isSymbolicLink())
        throw new ReferenceError("INVALID_REFERENCE_PATH", "Linked asset directories are not allowed.");
      const checksum = assetChecksum(bytes);
      const ext = format === "jpeg" ? "jpg" : format;
      const filename = `${role}-${checksum}-${randomUUID()}.${ext}`;
      const target = path.join(directory, filename);
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
      return { path: path.relative(storageRoot, target).replaceAll("\\", "/"), checksum, asset_id: `${role}_${checksum}` };
    },
    repository.serviceId,
  );
}

export async function readVerifiedAsset(
  repository: RepositoryService,
  root: string,
  asset: { path: string; checksum: string; width: number; height: number; mime_type: string },
  role: "mascot" | "style" | "cover",
) {
  if (path.isAbsolute(asset.path) || asset.path.includes("..") || /[:\0]/.test(asset.path))
    throw new ReferenceError("INVALID_REFERENCE_PATH", "Unsafe asset path.");
  const file = path.resolve(repository.storageRoot, asset.path);
  const bytes = await readBoundedAsset(repository, root, file);
  const info = await validateImageBuffer(bytes, role === "style" ? "style" : "mascot");
  if (
    assetChecksum(bytes) !== asset.checksum ||
    info.width !== asset.width ||
    info.height !== asset.height ||
    info.mimeType !== asset.mime_type
  )
    throw new ReferenceError("CORRUPT_IMAGE", "Asset bytes no longer match the accepted metadata.");
  return bytes;
}
