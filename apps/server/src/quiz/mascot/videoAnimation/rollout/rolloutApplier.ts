import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import {
  ANIMATION_STATES,
  SLOTS_PER_STATE,
  type MascotPublishedAnimationAsset,
  type MascotProfile,
  type MascotStyle,
} from "@studio/shared";
import type { BuildPublishedAssetParams, PublishStyleVideoAnimationsResult, VideoRolloutServiceDeps } from "./rolloutTypes.js";
import { assertStylePublishEligibility, evaluateStyleVideoReadiness } from "./rolloutGuard.js";

const ARTIFACTS_TO_COPY = ["video_transparent.webm", "manifest.json", "preview.webp", "preview.png", "atlas.png"];

async function copySlotArtifacts(attemptDir: string, slotDir: string, publishedDir: string): Promise<void> {
  await fs.mkdir(slotDir, { recursive: true });
  await fs.mkdir(publishedDir, { recursive: true });

  for (const art of ARTIFACTS_TO_COPY) {
    const srcPath = path.join(attemptDir, art);
    try {
      const stat = await fs.stat(srcPath);
      if (stat.isFile()) {
        await fs.copyFile(srcPath, path.join(slotDir, art));
        await fs.copyFile(srcPath, path.join(publishedDir, art));
      }
    } catch {
      // Artifact may not exist in attempt
    }
  }
}

async function ensurePublishedPreviewWebp(attemptDir: string, slotDir: string, publishedDir: string): Promise<void> {
  const publishedWebpPath = path.join(publishedDir, "preview.webp");
  const hasWebp = await fs
    .stat(publishedWebpPath)
    .then(() => true)
    .catch(() => false);
  if (!hasWebp) {
    const previewPngPath = path.join(attemptDir, "preview.png");
    try {
      const pngBuf = await fs.readFile(previewPngPath);
      await sharp(pngBuf).webp().toFile(path.join(publishedDir, "preview.webp"));
      await sharp(pngBuf).webp().toFile(path.join(slotDir, "preview.webp"));
    } catch {
      // preview.png might not exist
    }
  }
}

function buildPublishedAsset(params: BuildPublishedAssetParams): MascotPublishedAnimationAsset {
  const { mascotId, styleId, state, slotIndex, now, revision, manifest } = params;

  const frameCount = revision.frame_count ?? manifest.frame_count ?? 12;
  const fps = revision.playback_fps ?? manifest.fps ?? 8;
  const durationMs = revision.duration_ms ?? manifest.duration_ms ?? Math.round((frameCount / fps) * 1000);
  const frameDurationMs = frameCount <= 36 && fps === 8 ? 125 : Math.round(1000 / fps);

  const transparentVideoUrl =
    revision.transparent_video_url ??
    (manifest.transparent_video_url
      ? `/api/mascots/${mascotId}/styles/${styleId}/animations/${state}/${slotIndex}/artifacts/video_transparent.webm`
      : undefined);
  const alphaCodec = revision.alpha_codec ?? manifest.alpha_codec ?? (transparentVideoUrl ? "vp9_alpha" : undefined);

  return {
    version: 1,
    state,
    atlas_url:
      revision.atlas_url ??
      (manifest.atlas ? `/api/mascots/${mascotId}/styles/${styleId}/animations/${state}/${slotIndex}/artifacts/atlas.png` : ""),
    manifest_url: revision.manifest_url,
    frame_count: frameCount,
    fps,
    duration_ms: durationMs,
    loop: state === "thinking",
    loop_policy: manifest.loop_policy,
    frames: (manifest.frames ?? []).map((f) => ({
      ...f,
      duration_ms: f.duration_ms ?? frameDurationMs,
    })),
    registration: manifest.registration,
    content_fingerprint: revision.processing_fingerprint,
    source_fingerprint: revision.source_fingerprint,
    slot_index: slotIndex,
    recipe_id: manifest.recipe_id,
    published_at: now,
    ...(transparentVideoUrl ? { transparent_video_url: transparentVideoUrl } : {}),
    ...(alphaCodec ? { alpha_codec: alphaCodec } : {}),
  };
}

export async function applyStyleRolloutPublish(
  deps: VideoRolloutServiceDeps,
  mascot: MascotProfile,
  styleId: string,
): Promise<PublishStyleVideoAnimationsResult> {
  const { videoProcessingRepository: repo, storageAdapter, packagingService } = deps;

  const style = (mascot.styles || []).find((s) => s.id === styleId);
  if (!style) {
    throw new Error(`Style ${styleId} not found in mascot ${mascot.id}`);
  }

  const projections = await repo.listSlotProjections(mascot.id, styleId);
  const readiness = evaluateStyleVideoReadiness(projections);
  assertStylePublishEligibility(readiness);

  const now = new Date().toISOString();
  const publishedThinking = [];
  const publishedCelebrate = [];

  for (const state of ANIMATION_STATES) {
    for (let slotIndex = 1; slotIndex <= SLOTS_PER_STATE; slotIndex += 1) {
      const proj = projections.find((p) => p.state === state && p.slot_index === slotIndex);
      const revision = await repo.getActiveRevision(mascot.id, styleId, state, slotIndex);
      if (!proj || !revision) {
        throw new Error(`Active revision not found for ${state} slot ${slotIndex}`);
      }

      const attemptDir = storageAdapter.getAttemptDir(mascot.id, styleId, state, slotIndex, revision.attempt);
      const manifestPath = path.join(attemptDir, "manifest.json");
      const manifest = await packagingService.loadAndValidateAttemptManifest(manifestPath);

      const slotDir = storageAdapter.getSlotDir(mascot.id, styleId, state, slotIndex);
      const publishedDir = storageAdapter.getPublishedArtifactsDir(mascot.id, styleId, state, slotIndex);

      await copySlotArtifacts(attemptDir, slotDir, publishedDir);
      await ensurePublishedPreviewWebp(attemptDir, slotDir, publishedDir);

      const asset = buildPublishedAsset({
        mascotId: mascot.id,
        styleId,
        state,
        slotIndex,
        now,
        revision,
        manifest,
      });

      const variant = {
        id: `${style.id}-${state}-${slotIndex}`,
        slot_index: slotIndex,
        image_url: revision.frame_urls?.[0] || "",
        status: "ready" as const,
        animation: asset,
      };

      if (state === "thinking") {
        publishedThinking.push(variant);
      } else {
        publishedCelebrate.push(variant);
      }
    }
  }

  const updatedStyle: MascotStyle = {
    ...style,
    updated_at: now,
    states: {
      thinking: publishedThinking,
      celebrate: publishedCelebrate,
    },
  };

  return {
    updatedStyle,
    publishedCount: publishedThinking.length + publishedCelebrate.length,
    publishedAt: now,
  };
}
