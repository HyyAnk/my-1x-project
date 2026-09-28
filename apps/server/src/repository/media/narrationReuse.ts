import { readdir, lstat, readFile } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";

/** Decimal encoding keeps the existing public filename contract while removing timestamp collisions. */
export function narrationContentFilename(content: Uint8Array): string {
  const hash = createHash("sha256").update(content).digest("hex");
  return `quiz-narration-${BigInt(`0x${hash}`).toString(10)}.wav`;
}

/** Reuse exact generated audio bytes within one episode; never replace a production master. */
export async function findIdenticalNarration(directory: string, content: Uint8Array): Promise<string | null> {
  const buffer = Buffer.from(content);
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (!entry.isFile() || !/^quiz-narration-\d+\.wav$/.test(entry.name)) continue;
    const file = path.join(directory, entry.name);
    const stat = await lstat(file);
    if (stat.isSymbolicLink() || stat.size !== buffer.length) continue;
    if ((await readFile(file)).equals(buffer)) return entry.name;
  }
  return null;
}
