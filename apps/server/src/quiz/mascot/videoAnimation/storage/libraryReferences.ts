import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { assertContainedPath } from "./safeFrameFiles.js";
import { hashFile } from "./archiveFiles.js";

const MEDIA = new Set([".png", ".jpg", ".jpeg", ".webp", ".wav", ".mp3", ".mp4", ".webm", ".ogg", ".aac", ".flac"]);
export interface LibraryDocument {
  file: string;
  hash: string;
  text: string;
  value?: unknown;
}

const IGNORED_DIRECTORY_NAMES = new Set(["node_modules", ".git", ".venv", "venv", ".turbo", ".next", "dist", "build"]);

/** Maintenance journals are not live references. Everything else is inspected conservatively. */
export async function readLibraryDocuments(library: string): Promise<LibraryDocument[]> {
  const result: LibraryDocument[] = [];
  async function visit(directory: string): Promise<void> {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const file = path.join(directory, entry.name);
      if (file === path.join(library, ".quiz-studio", "maintenance")) continue;
      if (entry.isSymbolicLink()) throw new Error(`Linked library entry: ${file}`);
      if (entry.isDirectory()) {
        if (IGNORED_DIRECTORY_NAMES.has(entry.name)) continue;
        await visit(file);
        continue;
      }
      if (!entry.isFile()) throw new Error(`Unknown library entry: ${file}`);
      const extension = path.extname(file).toLowerCase();
      if (MEDIA.has(extension) || extension === ".lock" || extension === ".lock-journal") continue;
      await assertContainedPath(library, file);
      const buffer = await readFile(file);
      const text = buffer.toString("utf8").replace(/^\uFEFF/, "");
      result.push({
        file,
        hash: await hashFile(file),
        text: extension === ".db" ? text + buffer.toString("utf16le") : text,
        ...(extension === ".json" ? { value: JSON.parse(text) as unknown } : {}),
      });
    }
  }
  await visit(library);
  return result;
}

export function referencedMediaNames(documents: LibraryDocument[]): Set<string> {
  const names = new Set<string>();
  for (const document of documents) {
    const text = document.value === undefined ? document.text : JSON.stringify(document.value);
    for (const match of text.matchAll(/(?<![a-zA-Z0-9_.-])[a-zA-Z0-9_.-]{1,255}\.(?:png|webp|wav|mp4|webm|jpg|jpeg|mp3)\b/gi))
      names.add(match[0].toLowerCase());
  }
  return names;
}
