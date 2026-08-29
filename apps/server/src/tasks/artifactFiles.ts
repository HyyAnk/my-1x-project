import { readFile, stat } from "node:fs/promises";

export async function hasNonEmptyFile(filePath: string): Promise<boolean> {
  try { return (await stat(filePath)).size > 0; } catch { return false; }
}

export async function isValidPngFile(filePath: string): Promise<boolean> {
  try {
    const data = new Uint8Array(await readFile(filePath));
    if (data.length < 24 || !data.slice(0, 8).every((value, index) => value === [137, 80, 78, 71, 13, 10, 26, 10][index])) return false;
    const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
    return view.getUint32(16) > 0 && view.getUint32(20) > 0;
  } catch {
    return false;
  }
}
