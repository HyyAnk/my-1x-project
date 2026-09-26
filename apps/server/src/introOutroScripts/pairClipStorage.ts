import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { RepositoryService } from "../repository.js";

const execFileAsync = promisify(execFile);

export async function storePairClip(
  repository: RepositoryService,
  channelId: string,
  styleId: string,
  kind: "intro" | "outro",
  source: Buffer | string,
  filename: string,
  mute: boolean,
) {
  if (!mute) return repository.processAndStoreStyleClip(channelId, styleId, kind, source, filename);
  const temporary = await mkdtemp(path.join(os.tmpdir(), "studio-pair-mute-"));
  try {
    const inputPath = typeof source === "string" ? source : path.join(temporary, "input.mp4");
    if (typeof source !== "string") await writeFile(inputPath, source);
    const outputPath = path.join(temporary, "muted.mp4");
    await execFileAsync("ffmpeg", ["-y", "-i", inputPath, "-map", "0:v:0", "-c:v", "copy", "-an", "-movflags", "+faststart", outputPath], {
      windowsHide: true,
      timeout: 120000,
    });
    return await repository.processAndStoreStyleClip(channelId, styleId, kind, outputPath, filename);
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
}
