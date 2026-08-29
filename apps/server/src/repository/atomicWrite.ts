import { writeBinaryAtomic as writeBinary, writeJsonAtomic as writeJson, writeTextAtomic as writeText } from "../utils/fs.js";

export async function writeJsonAtomic(target: string, value: unknown): Promise<void> {
  await writeJson(target, value);
}

export async function writeTextAtomic(target: string, content: string): Promise<void> {
  await writeText(target, content);
}

export async function writeBinaryAtomic(target: string, content: Uint8Array): Promise<void> {
  await writeBinary(target, content);
}
