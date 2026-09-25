import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import Fastify from "fastify";
import { afterEach, expect, it } from "vitest";
import { ANIMATION_STATES, SLOTS_PER_STATE, type AnimationState, type MascotAnimationRevision } from "@studio/shared";
import { createAnimationStorageAdapter, createVideoProcessingRepository } from "../../src/quiz/mascot/videoAnimation/index.js";
import { registerMascotAnimationArtifactRoutes } from "../../src/routes/mascots/animation/mascotAnimationArtifactRoutes.js";

let root: string;
const server = Fastify();
afterEach(async () => {
  await server.close();
  if (root) await fs.rm(root, { recursive: true, force: true });
});

function revision(styleId: string, state: AnimationState, slot: number, attempt: number): MascotAnimationRevision {
  const base = `/api/mascots/m/styles/${styleId}/animations/${state}/${slot}/artifacts`;
  return {
    id: `rev_${attempt}`,
    attempt,
    created_at: "2026-09-24T00:00:00Z",
    version: 1,
    style_id: styleId,
    state,
    slot_index: slot,
    status: "ready",
    source_video_url: `/source-${attempt}.mp4`,
    transparent_video_url: `${base}/video_transparent.webm`,
    manifest_url: `${base}/manifest.json`,
    frame_urls: [`${base}/frame_001.png`],
    atlas_url: `${base}/atlas.png`,
    frame_count: 1,
    source_fps: 24,
    playback_fps: 24,
    duration_ms: 1000,
    loop_mode: "loop",
    canvas: { width: 640, height: 360 },
    content_bounds: { x: 0, y: 0, width: 640, height: 360 },
    pivot: { x: 320, y: 359 },
    registration: {
      source_width: 640,
      source_height: 360,
      offset_x: 0,
      offset_y: 0,
      content_bounds: { x: 0, y: 0, width: 640, height: 360 },
      pivot: { x: 320, y: 359 },
    },
    source_fingerprint: `source_${attempt}`,
    processing_fingerprint: `processing_${attempt}`,
  };
}

it("pins replacements and isolates every style, state and slot from old or failed artifacts", async () => {
  root = await fs.mkdtemp(path.join(os.tmpdir(), "replacement-artifacts-"));
  const storage = createAnimationStorageAdapter(root);
  const repo = createVideoProcessingRepository(storage);
  registerMascotAnimationArtifactRoutes(server, {
    outputBaseDir: path.join(root, "legacy"),
    storageAdapter: storage,
    videoProcessingRepo: repo,
  });
  const styles = [
    "core",
    "builtin_cyber_neon",
    "builtin_comic_boom",
    "builtin_build_zone",
    "builtin_cosmic_space",
    "builtin_pastel_dream",
    "builtin_treasure_quest",
  ];
  for (const style of styles)
    for (const state of ANIMATION_STATES)
      for (let slot = 1; slot <= SLOTS_PER_STATE; slot++) {
        const marker = `${style}:${state}:${slot}`;
        const slotDir = storage.getSlotDir("m", style, state, slot);
        await fs.mkdir(slotDir, { recursive: true });
        await fs.writeFile(path.join(slotDir, "video_transparent.webm"), "stale-legacy-video");
        for (const attempt of [1, 2, 3]) {
          const dir = storage.getAttemptDir("m", style, state, slot, attempt);
          await fs.mkdir(dir, { recursive: true });
          await fs.writeFile(path.join(dir, "video_transparent.webm"), `${marker}:attempt-${attempt}`);
        }
        await repo.saveActiveRevision("m", style, state, slot, 1, revision(style, state, slot, 1));
        const oldUrl = (await repo.getSlotProjection("m", style, state, slot)).active_revision!.transparent_video_url!;
        await repo.saveActiveRevision("m", style, state, slot, 2, revision(style, state, slot, 2));
        await repo.recordAttemptFailure("m", style, state, slot, 3, { code: "EXCESSIVE_DRIFT", message: "Rejected" }, true);
        const current = (await repo.getSlotProjection("m", style, state, slot)).active_revision!;
        expect(current.transparent_video_url).not.toBe(oldUrl);
        expect(current.manifest_url).toContain("?attempt=2");
        expect(current.frame_urls[0]).toContain("?attempt=2");
        expect((await server.inject(current.transparent_video_url!)).body).toBe(`${marker}:attempt-2`);
        expect((await server.inject(oldUrl)).body).toBe(`${marker}:attempt-1`);
        const alias = current.transparent_video_url!.split("?")[0];
        const response = await server.inject(alias);
        expect(response.body).toBe(`${marker}:attempt-2`);
        expect(response.headers["cache-control"]).toBe("no-store");
        const range = await server.inject({ url: current.transparent_video_url!, headers: { range: "bytes=0-3" } });
        expect(range.statusCode).toBe(206);
        expect(range.body).toBe(marker.slice(0, 4));
        expect(range.headers["cache-control"]).toBe("no-store");
        expect((await server.inject(`${alias}?attempt=99`)).statusCode).toBe(404);
        expect((await server.inject(`${alias}?attempt=-1`)).statusCode).toBe(400);
      }
}, 30000);
