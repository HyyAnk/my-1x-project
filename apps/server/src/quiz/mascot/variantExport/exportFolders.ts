import { randomUUID } from "node:crypto";
import { access, lstat, open, readdir, realpath, stat, unlink } from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";
import type { ExportFolderListing } from "@studio/shared";
import { VariantExportError } from "./variantExport.types.js";

export function isInside(root: string, target: string): boolean {
  const relative = path.relative(root, target);
  return relative === "" || (!relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative));
}

export async function resolveExportFolder(input: string): Promise<string> {
  if (!path.isAbsolute(input) || input.includes("\0")) throw new VariantExportError("Choose an absolute folder path on the server.");
  try {
    const resolved = await realpath(input);
    if (!(await stat(resolved)).isDirectory()) throw new Error("Not a directory");
    return resolved;
  } catch {
    throw new VariantExportError("Folder is unavailable. Check the path and server permissions.");
  }
}

export async function validateExportFolder(input: string, protectedRoot: string): Promise<string> {
  const resolved = await resolveExportFolder(input);
  const protectedPath = await realpath(protectedRoot).catch(() => path.resolve(protectedRoot));
  if (isInside(protectedPath, resolved)) throw new VariantExportError("Choose a folder outside the mascot source library.");
  const probe = path.join(resolved, `.mascot-export-${randomUUID()}.tmp`);
  try {
    await access(resolved, constants.W_OK);
    const handle = await open(probe, "wx");
    await handle.close();
    await unlink(probe);
  } catch {
    throw new VariantExportError("Cannot write to this folder. Choose another folder or check server permissions.");
  }
  return resolved;
}

export async function listExportFolders(input: string): Promise<ExportFolderListing> {
  const resolved = await resolveExportFolder(input);
  try {
    const entries = await readdir(resolved, { withFileTypes: true });
    const roots =
      process.platform === "win32"
        ? (
            await Promise.all(
              Array.from({ length: 26 }, async (_, index) => {
                const drive = `${String.fromCharCode(65 + index)}:\\`;
                return await access(drive).then(
                  () => drive,
                  () => null,
                );
              }),
            )
          ).filter((drive): drive is string => drive !== null)
        : [path.parse(resolved).root];
    return {
      path: resolved,
      parent: path.dirname(resolved) === resolved ? null : path.dirname(resolved),
      roots,
      folders: entries
        .filter((entry) => entry.isDirectory() && !entry.isSymbolicLink())
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((entry) => ({ name: entry.name, path: path.join(resolved, entry.name) })),
    };
  } catch {
    throw new VariantExportError("Cannot browse this folder. Check server permissions or enter another path.");
  }
}

export async function assertSafeExportDirectory(root: string, target: string): Promise<void> {
  const metadata = await lstat(target);
  if (metadata.isSymbolicLink() || !metadata.isDirectory() || !isInside(root, await realpath(target))) {
    throw new VariantExportError("Output folder is unsafe. Choose another destination.");
  }
}
