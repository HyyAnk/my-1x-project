import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import type { MascotAnimationRevision, MascotVideoProcessingJob } from "@studio/shared";
import { createAnimationStorageAdapter } from "../../src/quiz/mascot/videoAnimation/adapters/animationStorageAdapter.js";

export async function retentionFixture(root: string, legacy = false) {
  const storage = createAnimationStorageAdapter(root);
  const directory = storage.getAttemptDir("owl", "classic", "thinking", 1, 1);
  const slot = storage.getSlotDir("owl", "classic", "thinking", 1);
  const now = new Date().toISOString();
  const job: MascotVideoProcessingJob = {
    id: "job_owl",
    mascot_id: "owl",
    style_id: "classic",
    state: "thinking",
    slot_index: 1,
    attempt: 1,
    source_video_url: "/source",
    source_video_fingerprint: "source",
    status: "ready",
    progress: 100,
    created_at: now,
    updated_at: now,
  };
  const revision: MascotAnimationRevision = {
    id: "rev_1",
    attempt: 1,
    created_at: now,
    version: 1,
    style_id: "classic",
    state: "thinking",
    slot_index: 1,
    source_video_url: "/source",
    atlas_url: "/atlas.png",
    transparent_video_url: "/video_transparent.webm",
    manifest_url: "/manifest.json",
    frame_count: 1,
    source_fps: 8,
    playback_fps: 8,
    duration_ms: 125,
    loop_mode: "loop",
    canvas: { width: 8, height: 8 },
    content_bounds: { x: 0, y: 0, width: 8, height: 8 },
    pivot: { x: 4, y: 8 },
    registration: {
      source_width: 8,
      source_height: 8,
      content_bounds: { x: 0, y: 0, width: 8, height: 8 },
      pivot: { x: 4, y: 8 },
      offset_x: 0,
      offset_y: 0,
    },
    source_fingerprint: "source",
    processing_fingerprint: "processed",
    status: "ready",
    ...(legacy ? { frame_urls: ["/frame_001.png"] } : {}),
  };
  await mkdir(path.join(slot, "revisions"), { recursive: true });
  await writeFile(path.join(slot, "revisions", "rev_1.json"), JSON.stringify(revision));
  for (const kind of ["source", "matted"]) {
    await mkdir(path.join(directory, "frames", kind), { recursive: true });
    await writeFile(path.join(directory, "frames", kind, "frame_001.png"), "frame");
  }
  await writeFile(path.join(directory, "source.mp4"), "source");
  await writeFile(path.join(directory, "video_transparent.webm"), "video");
  await writeFile(path.join(directory, "attempt.json"), JSON.stringify({ ...job, job_id: job.id, processing_fingerprint: "processed" }));
  await writeFile(path.join(directory, "manifest.json"), JSON.stringify({ processing_fingerprint: "processed" }));
  const image = sharp({ create: { width: 8, height: 8, channels: 4, background: "transparent" } });
  await image.clone().png().toFile(path.join(directory, "atlas.png"));
  await image.clone().webp().toFile(path.join(directory, "preview.webp"));
  return { storage, directory, slot, job, revision };
}
