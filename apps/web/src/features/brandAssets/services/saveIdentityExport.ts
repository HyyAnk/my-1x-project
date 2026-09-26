import type { BrandIdentityExport } from "@studio/shared";
import type { IdentityDirectory, IdentityProgress } from "./identityExport.types";

function decode(base64: string): Uint8Array<ArrayBuffer> {
  return Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
}

export function downloadIdentityZip(bundle: BrandIdentityExport): void {
  const file = bundle.files[0];
  const url = URL.createObjectURL(new Blob([decode(file.base64)], { type: "application/zip" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = file.filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export async function saveIdentityDirectory(
  parent: IdentityDirectory,
  bundle: BrandIdentityExport,
  signal: AbortSignal,
  onProgress: (progress: IdentityProgress) => void,
): Promise<string> {
  signal.throwIfAborted();
  const folder = `${bundle.folder}-${crypto.randomUUID()}`;
  const directory = await parent.getDirectoryHandle(folder, { create: true });
  let completed = 0;
  try {
    for (const file of bundle.files) {
      signal.throwIfAborted();
      onProgress({ message: `Saving ${completed + 1} of ${bundle.files.length}`, completed, total: bundle.files.length });
      const handle = await directory.getFileHandle(file.filename, { create: true });
      const writer = await handle.createWritable();
      try {
        await writer.write(decode(file.base64));
        signal.throwIfAborted();
        await writer.close();
      } catch (error) {
        await writer.abort().catch(() => undefined);
        throw error;
      }
      completed++;
    }
  } catch {
    throw new Error(
      `Saved ${completed} of ${bundle.files.length} files in ${folder}. Check folder permissions and retry; existing exports will be kept.`,
    );
  }
  return folder;
}
