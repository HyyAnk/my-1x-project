import { createHash } from "node:crypto";
import { createReadStream, constants } from "node:fs";
import { copyFile, lstat, open, readFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { assertContainedPath } from "./safeFrameFiles.js";

export const ArchiveManifestSchema = z.object({
  version: z.literal(1),
  root: z.string(),
  attempt: z
    .string()
    .regex(/^mascots\/[a-zA-Z0-9_-]+\/animations\/[a-zA-Z0-9_-]+\/(thinking|celebrate)\/slot_(?:[1-9]|10)\/attempts\/att_\d+$/),
  createdAt: z.string(),
  files: z.array(
    z.object({
      name: z.string().regex(/^frame_\d{3,6}\.png$/),
      size: z.number().int().nonnegative(),
      sha256: z.string().regex(/^[a-f0-9]{64}$/),
    }),
  ),
});
export type ArchiveManifest = z.infer<typeof ArchiveManifestSchema>;

export async function hashFile(file: string): Promise<string> {
  const hash = createHash("sha256");
  for await (const bytes of createReadStream(file)) hash.update(bytes as Buffer);
  return hash.digest("hex");
}

export async function writeDurableJson(file: string, value: unknown): Promise<void> {
  const handle = await open(file, "wx");
  try {
    await handle.writeFile(JSON.stringify(value, null, 2));
    await handle.sync();
  } finally {
    await handle.close();
  }
}

export async function copyVerified(source: string, destination: string, expectedHash: string): Promise<void> {
  await copyFile(source, destination, constants.COPYFILE_EXCL);
  const handle = await open(destination, "r+");
  try {
    await handle.sync();
  } finally {
    await handle.close();
  }
  if ((await hashFile(destination)) !== expectedHash) throw new Error(`Archive verification failed: ${destination}`);
}

export async function loadArchive(root: string, archive: string): Promise<ArchiveManifest> {
  const file = path.join(archive, "manifest.json");
  await assertContainedPath(archive, file);
  const manifest = ArchiveManifestSchema.parse(JSON.parse(await readFile(file, "utf8")));
  if (path.resolve(manifest.root) !== path.resolve(root)) throw new Error("Archive belongs to another storage root");
  if (new Set(manifest.files.map((entry) => entry.name)).size !== manifest.files.length) throw new Error("Duplicate archive entries");
  return manifest;
}

export async function fileExists(file: string): Promise<boolean> {
  try {
    await lstat(file);
    return true;
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") return false;
    throw error;
  }
}
