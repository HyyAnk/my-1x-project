import { readFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import {
  MascotSlotProjectionSchema,
  MascotPublishedAnimationAssetSchema,
  type MascotProfile,
  type MascotStyle,
  type MascotAnimationRevision,
  type MascotPublishedAnimationAsset,
} from "@studio/shared";
import type { RepositoryRuntime } from "../runtime.js";
import { createAnimationStorageAdapter } from "../../quiz/mascot/videoAnimation/adapters/animationStorageAdapter.js";
import { getSlotFilePath } from "../../quiz/mascot/videoAnimation/projections/slotProjectionMapper.js";
import { pinRevisionArtifactUrls } from "../../quiz/mascot/videoAnimation/projections/revisionArtifactUrls.js";
import { loadAndValidateAttemptManifest } from "../../quiz/mascot/videoAnimation/packaging/manifestBuilder.js";

const ProjectionStoreSchema = z.record(MascotSlotProjectionSchema);

async function loadRevisionAsset(storageRoot: string, mascotId: string, revision: MascotAnimationRevision) {
  const pinned = pinRevisionArtifactUrls(revision);
  const storage = createAnimationStorageAdapter(storageRoot);
  const attemptDir = storage.getAttemptDir(mascotId, revision.style_id, revision.state, revision.slot_index, revision.attempt);
  const manifest = await loadAndValidateAttemptManifest(path.join(attemptDir, "manifest.json"));
  return MascotPublishedAnimationAssetSchema.parse({
    version: 1,
    state: revision.state,
    atlas_url: pinned.atlas_url,
    transparent_video_url: pinned.transparent_video_url,
    alpha_codec: pinned.alpha_codec,
    manifest_url: pinned.manifest_url,
    frame_count: revision.frame_count,
    fps: revision.playback_fps,
    duration_ms: revision.duration_ms,
    loop: revision.loop_mode === "loop",
    loop_policy: revision.loop_mode,
    frames: manifest.frames,
    registration: manifest.registration,
    video_registration: revision.registration,
    content_fingerprint: revision.processing_fingerprint,
    source_fingerprint: revision.source_fingerprint,
    slot_index: revision.slot_index,
    recipe_id: manifest.recipe_id,
  });
}

async function hydrateStyle(storageRoot: string, mascotId: string, style: MascotStyle): Promise<MascotStyle> {
  let raw: string;
  try {
    raw = await readFile(getSlotFilePath(storageRoot, mascotId, style.id), "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return style;
    throw error;
  }
  const projections = ProjectionStoreSchema.parse(JSON.parse(raw));
  const states = { thinking: [...style.states.thinking], celebrate: [...style.states.celebrate] };
  for (const projection of Object.values(projections)) {
    // A pending/failed replacement must not hide the last approved revision.
    const revision = projection.active_revision;
    if (!revision || revision.status !== "ready") continue;
    if (revision.style_id !== style.id || revision.state !== projection.state || revision.slot_index !== projection.slot_index) {
      throw new Error(`Animation revision identity mismatch: ${mascotId}/${style.id}/${projection.state}/${projection.slot_index}`);
    }
    let animation: MascotPublishedAnimationAsset;
    try {
      animation = await loadRevisionAsset(storageRoot, mascotId, revision);
    } catch {
      // Keep the source image fallback when a ready revision's artifact is
      // temporarily unavailable or corrupted.
      continue;
    }
    const variants = states[revision.state];
    const index = variants.findIndex((variant) => variant.slot_index === revision.slot_index);
    const variant = {
      ...(index >= 0 ? variants[index] : { id: `${style.id}-${revision.state}-${revision.slot_index}`, image_url: "" }),
      slot_index: revision.slot_index,
      status: "ready" as const,
      generation_revision: revision.attempt,
      animation,
    };
    if (index >= 0) variants[index] = variant;
    else variants.push(variant);
  }
  return { ...style, states };
}

/** Read-only render projection: source images remain unchanged in mascot.json. */
export async function loadMascotRenderProfile(
  repository: Pick<RepositoryRuntime, "getMascot" | "roots">,
  mascotId: string,
): Promise<MascotProfile> {
  const profile = await repository.getMascot(mascotId);
  const storageRoot = path.dirname(repository.roots.mascots);
  const styles = await Promise.all((profile.styles ?? []).map((style) => hydrateStyle(storageRoot, mascotId, style)));
  return { ...profile, styles };
}
