import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { access, copyFile, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import {
  QUIZ_SHORT_BOOKEND_HEIGHT,
  QUIZ_SHORT_BOOKEND_WIDTH,
  type QuizShortBookendClipMeta,
  type QuizShortBookendKind,
} from "@studio/shared";
import { extractVideoThumbnail, probeAndValidateVideoFrame, type Video1080pProbeResult } from "../utils/videoMediaProbe.js";

const execFileAsync = promisify(execFile);

export const PORTRAIT_BOOKEND_FRAME = {
  width: QUIZ_SHORT_BOOKEND_WIDTH,
  height: QUIZ_SHORT_BOOKEND_HEIGHT,
  label: "portrait 1080x1920",
} as const;

export function probePortraitBookend(filePath: string): Promise<Video1080pProbeResult> {
  return probeAndValidateVideoFrame(filePath, PORTRAIT_BOOKEND_FRAME);
}

export async function hashFileSha256(filePath: string): Promise<string> {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(filePath)) hash.update(chunk as Buffer);
  return hash.digest("hex");
}

async function stripAudio(inputPath: string, outputPath: string): Promise<void> {
  await execFileAsync("ffmpeg", ["-y", "-i", inputPath, "-map", "0:v:0", "-c:v", "copy", "-an", "-movflags", "+faststart", outputPath], {
    windowsHide: true,
    timeout: 120_000,
  });
}

async function hasFile(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

export type StoreBookendClipInput = {
  pairDirectory: string;
  kind: QuizShortBookendKind;
  source: Buffer;
  /** Removes the audio track from the stored file; the intro is always muted. */
  muteAudio: boolean;
};

/**
 * Validates a portrait clip, optionally strips its audio, and stores `<kind>.mp4` plus a
 * thumbnail in the pair folder. Nothing is left behind when validation fails.
 */
export async function storeBookendClip(input: StoreBookendClipInput): Promise<QuizShortBookendClipMeta> {
  await mkdir(input.pairDirectory, { recursive: true });
  const temporary = await mkdtemp(path.join(os.tmpdir(), "studio-short-bookend-"));
  const targetVideoPath = path.join(input.pairDirectory, `${input.kind}.mp4`);
  const thumbFilename = `${input.kind}_thumb.jpg`;
  const targetThumbPath = path.join(input.pairDirectory, thumbFilename);
  try {
    const uploadedPath = path.join(temporary, "upload.mp4");
    await writeFile(uploadedPath, input.source);
    await probePortraitBookend(uploadedPath);
    const processedPath = input.muteAudio ? path.join(temporary, "muted.mp4") : uploadedPath;
    if (input.muteAudio) await stripAudio(uploadedPath, processedPath);
    const probe = await probePortraitBookend(processedPath);
    await copyFile(processedPath, targetVideoPath);
    await extractVideoThumbnail(targetVideoPath, targetThumbPath, Math.min(probe.duration_seconds, 4));
    return {
      filename: `${input.kind}.mp4`,
      duration_seconds: probe.duration_seconds,
      width: QUIZ_SHORT_BOOKEND_WIDTH,
      height: QUIZ_SHORT_BOOKEND_HEIGHT,
      fps: probe.fps,
      has_audio: probe.has_audio,
      thumbnail_filename: (await hasFile(targetThumbPath)) ? thumbFilename : undefined,
      sha256: await hashFileSha256(targetVideoPath),
    };
  } catch (error) {
    await rm(targetVideoPath, { force: true });
    await rm(targetThumbPath, { force: true });
    throw error;
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
}
