import { lstat, readFile } from "node:fs/promises";
import path from "node:path";
import { MascotAnimationRevisionSchema, MascotAttemptMetadataSchema } from "@studio/shared";
import { assertContainedPath, inventoryFrames } from "./safeFrameFiles.js";
import type { AttemptRetentionPlan } from "./retention.types.js";
import { fileExists } from "./archiveFiles.js";

export async function planAttemptRetention(root: string, attemptDirectory: string): Promise<AttemptRetentionPlan> {
  await assertContainedPath(root, attemptDirectory);
  const relative = path.relative(path.resolve(root), path.resolve(attemptDirectory)).split(path.sep);
  if (relative.length !== 8 || relative[0] !== "mascots" || relative[2] !== "animations" || relative[6] !== "attempts") {
    throw new Error("Not a mascot animation attempt directory");
  }
  const metadata = MascotAttemptMetadataSchema.parse(await readJson(root, path.join(attemptDirectory, "attempt.json")));
  if (metadata.status !== "ready" || metadata.progress !== 100) throw new Error("Attempt is not complete");
  if (
    relative[1] !== metadata.mascot_id ||
    relative[3] !== metadata.style_id ||
    relative[4] !== metadata.state ||
    relative[5] !== `slot_${metadata.slot_index}` ||
    relative[7] !== `att_${metadata.attempt}`
  )
    throw new Error("Attempt identity mismatch");
  const slot = path.dirname(path.dirname(attemptDirectory));
  const revision = MascotAnimationRevisionSchema.parse(await readJson(root, path.join(slot, "revisions", `rev_${metadata.attempt}.json`)));
  if (
    revision.status !== "ready" ||
    revision.attempt !== metadata.attempt ||
    revision.processing_fingerprint !== metadata.processing_fingerprint ||
    revision.style_id !== metadata.style_id ||
    revision.state !== metadata.state ||
    revision.slot_index !== metadata.slot_index ||
    revision.source_fingerprint !== metadata.source_video_fingerprint
  ) {
    throw new Error("Revision does not match completed attempt");
  }
  const manifest = await readJson(root, path.join(attemptDirectory, "manifest.json"));
  if (
    !manifest ||
    typeof manifest !== "object" ||
    !("processing_fingerprint" in manifest) ||
    manifest.processing_fingerprint !== metadata.processing_fingerprint
  )
    throw new Error("Manifest fingerprint mismatch");
  if (!revision.transparent_video_url) throw new Error("No durable video in revision");
  const imageArtifacts = ["preview.webp", ...(revision.atlas_url ? ["atlas.png"] : [])];
  for (const filename of ["source.mp4", "video_transparent.webm", ...imageArtifacts]) {
    const file = path.join(attemptDirectory, filename);
    await assertContainedPath(root, file);
    const stat = await lstat(file);
    if (!stat.isFile() || stat.size === 0) throw new Error(`Missing durable artifact: ${filename}`);
  }
  const mattedProtected = await hasProtectedFrames(attemptDirectory, revision.frame_urls);
  return {
    attemptDirectory,
    source: await inventoryFrames(root, path.join(attemptDirectory, "frames", "source")),
    matted: await inventoryFrames(root, path.join(attemptDirectory, "frames", "matted")),
    mattedProtected,
    imageArtifacts,
    reason: mattedProtected ? "Legacy frame URLs retained; source frames require an idle-job check before cleanup" : "Compact revision",
  };
}

async function readJson(root: string, file: string): Promise<unknown> {
  await assertContainedPath(root, file);
  return JSON.parse(await readFile(file, "utf8"));
}

async function hasProtectedFrames(attempt: string, frameUrls?: string[]): Promise<boolean> {
  return Boolean(frameUrls?.length) || (await fileExists(path.join(attempt, "retained-frames.json")));
}
