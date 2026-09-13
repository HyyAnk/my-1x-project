import { createHash } from "node:crypto";
import { copyFile, mkdir, readdir } from "node:fs/promises";
import path from "node:path";
import { hashRenderFile } from "./renderChunkStore.js";

const INPUT_DIRS = new Set(["compositions", "quiz-images", "mascot-assets", "fonts", "sfx", "bgm"]);
const INPUT_FILES = new Set(["index.html", "narration.wav", "soundtrack.wav", "intro.mp4", "outro.mp4"]);

async function inputFiles(root: string, relative = ""): Promise<string[]> {
  const files: string[] = [];
  for (const entry of await readdir(path.join(root, relative), { withFileTypes: true })) {
    if (entry.isSymbolicLink()) throw new Error("Render inputs must be localized regular files, not symlinks");
    if (!relative && !(entry.isDirectory() ? INPUT_DIRS.has(entry.name) : INPUT_FILES.has(entry.name))) continue;
    if (entry.name.endsWith(".identity.json")) continue;
    const child = path.join(relative, entry.name);
    if (entry.isDirectory()) files.push(...(await inputFiles(root, child)));
    else if (entry.isFile()) files.push(child);
  }
  return files.sort();
}

/** Hash actual media bytes, including soundtrack and intro/outro, not just paths. */
export async function fingerprintRenderInputs(root: string, configFingerprint: string): Promise<string> {
  const hash = createHash("sha256").update(configFingerprint);
  for (const file of await inputFiles(root))
    hash.update(JSON.stringify([file.replaceAll("\\", "/"), await hashRenderFile(path.join(root, file))]));
  return hash.digest("hex");
}

export async function snapshotRenderInputs(source: string, destination: string): Promise<void> {
  for (const file of await inputFiles(source)) {
    const target = path.join(destination, file);
    await mkdir(path.dirname(target), { recursive: true });
    await copyFile(path.join(source, file), target);
  }
}
