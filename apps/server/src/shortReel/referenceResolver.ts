import path from "node:path";
import { ReelReferencesPayloadSchema, type ReelKey, type MascotProfile, type ReelReferencesPayload } from "@studio/shared";
import type { RepositoryService } from "../repository/service.js";
import { requireCompleteShortReelSource } from "../repository/shortReelSourcePolicy.js";

import { ReferenceError, validateImageBuffer } from "./packageImage.js";
import { readBoundedAsset, storePackageAsset } from "./packageAssets.js";
export { ReferenceError, validateImageBuffer } from "./packageImage.js";
export interface ReferenceResolveOptions {
  mascotAssetPath?: string;
  styleAssetPath?: string;
  mascotId?: string;
  styleId?: string;
}

function assertSafePath(targetPath: string): void {
  if (!targetPath || typeof targetPath !== "string") {
    throw new ReferenceError("INVALID_REFERENCE_PATH", "Reference path is empty.");
  }
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//i.test(targetPath) || /^data:/i.test(targetPath)) {
    throw new ReferenceError("INVALID_REFERENCE_PATH", "Remote URLs or URI protocol schemes are forbidden for security.");
  }
  const normalized = targetPath.replace(/\\/g, "/");
  if (normalized.includes("..")) {
    throw new ReferenceError("INVALID_REFERENCE_PATH", "Path traversal sequences are strictly forbidden.");
  }
}

async function loadMascotAssetBuffer(repository: RepositoryService, mascotId: string, assetUrlOrPath: string): Promise<Buffer> {
  assertSafePath(assetUrlOrPath);
  const match = /^\/api\/mascots\/([A-Za-z0-9_-]+)\/assets\/([^/\\?#%:]+)$/.exec(assetUrlOrPath);
  if (match && match[1] === mascotId) {
    const filename = match[2];
    const asset = await repository.getMascotAssetFile(mascotId, filename);
    return readBoundedAsset(repository, path.join(repository.roots.mascots, mascotId, "assets"), asset.absolutePath);
  }
  throw new ReferenceError(
    "INVALID_REFERENCE_PATH",
    "Select an asset belonging to the chosen mascot; arbitrary filesystem paths are not allowed.",
  );
}

/**
 * Resolves two actual reference images by role (mascot and style) from stored configurations.
 * Validates raster headers, single-frame status, saves immutable revisioned copies into the reel directory,
 * and returns ReelReferencesPayload.
 */
async function loadSelectedStyle(repository: RepositoryService, mascot: MascotProfile, options?: ReferenceResolveOptions): Promise<Buffer> {
  let styleRawBuffer: Buffer;
  if (options?.styleAssetPath) {
    assertSafePath(options.styleAssetPath);
    styleRawBuffer = await loadMascotAssetBuffer(repository, mascot.id, options.styleAssetPath);
  } else {
    const targetStyleId = options?.styleId || mascot.active_style_id;
    const style = targetStyleId ? mascot.styles?.find((s) => s.id === targetStyleId) : mascot.styles?.find((s) => s.is_default);
    if (style?.anchor_image_url) {
      styleRawBuffer = await loadMascotAssetBuffer(repository, mascot.id, style.anchor_image_url);
    } else {
      throw new ReferenceError("MISSING_REFERENCE", `No style reference image found for style "${targetStyleId || "default"}".`);
    }
  }

  return styleRawBuffer;
}

export async function resolveReelReferences(
  repository: RepositoryService,
  key: ReelKey,
  options?: ReferenceResolveOptions,
): Promise<ReelReferencesPayload> {
  const storageRoot = repository.storageRoot;
  options = options ? { ...options } : undefined;
  if (options?.mascotAssetPath) assertSafePath(options.mascotAssetPath);
  if (options?.styleAssetPath) assertSafePath(options.styleAssetPath);

  const reel = await repository.getShortReel(key);
  requireCompleteShortReelSource(reel.source);
  const channel = await repository.getChannel(key.channel_id);

  const mascotId = options?.mascotId || channel.mascot_id;
  if (!mascotId) {
    throw new ReferenceError("MISSING_REFERENCE", "Channel has no mascot assigned and no mascotId provided.");
  }
  if (!/^[A-Za-z0-9_-]+$/.test(mascotId)) throw new ReferenceError("INVALID_REFERENCE_PATH", "Invalid mascot ID.");

  const mascot = await repository.getMascot(mascotId).catch(() => null);
  if (!mascot) {
    throw new ReferenceError("MISSING_REFERENCE", `Assigned mascot "${mascotId}" was not found.`);
  }

  const selectedPaths = [options?.mascotAssetPath || mascot.master_image_url, options?.styleAssetPath];
  if (
    Object.values(mascot.actions ?? {}).some((action) => action && action.frames_count > 1 && selectedPaths.includes(action.sprite_url))
  ) {
    throw new ReferenceError("ANIMATION_ATLAS_REJECTED", "Select a single-frame asset instead of a known sprite atlas.");
  }
  // 1. Resolve Mascot Image
  let mascotRawBuffer: Buffer;
  if (options?.mascotAssetPath) {
    assertSafePath(options.mascotAssetPath);
    mascotRawBuffer = await loadMascotAssetBuffer(repository, mascotId, options.mascotAssetPath);
  } else if (mascot.master_image_url) {
    mascotRawBuffer = await loadMascotAssetBuffer(repository, mascotId, mascot.master_image_url);
  } else {
    // Check static actions
    const thinkingAction = mascot.actions?.thinking;
    if (thinkingAction) {
      if (thinkingAction.frames_count > 1) {
        throw new ReferenceError(
          "ANIMATION_ATLAS_REJECTED",
          "Mascot thinking action is an animation atlas (frames_count > 1). A single-frame reference is required.",
        );
      }
      const actionUrl = thinkingAction.preview_url || thinkingAction.sprite_url;
      if (actionUrl) {
        mascotRawBuffer = await loadMascotAssetBuffer(repository, mascotId, actionUrl);
      } else {
        throw new ReferenceError("MISSING_REFERENCE", "No master image or single-frame preview found for mascot.");
      }
    } else {
      throw new ReferenceError("MISSING_REFERENCE", "No master image or valid action reference found for mascot.");
    }
  }

  const styleRawBuffer = await loadSelectedStyle(repository, mascot, options);

  const validatedMascot = await validateImageBuffer(mascotRawBuffer, "mascot");
  const validatedStyle = await validateImageBuffer(styleRawBuffer, "style");
  if (repository.storageRoot !== storageRoot)
    throw new ReferenceError("INVALID_REFERENCE_PATH", "Storage changed while resolving references.");

  const mascotAsset = await storePackageAsset(repository, key, "mascot", validatedMascot.format, validatedMascot.buffer);
  const styleAsset = await storePackageAsset(repository, key, "style", validatedStyle.format, validatedStyle.buffer);
  return ReelReferencesPayloadSchema.parse({
    references: [
      {
        ...mascotAsset,
        asset_id: `mascot_${mascotId}_${mascotAsset.checksum}`,
        role: "mascot",
        mime_type: validatedMascot.mimeType,
        width: validatedMascot.width,
        height: validatedMascot.height,
      },
      {
        ...styleAsset,
        asset_id: `style_${mascotId}_${options?.styleId || mascot.active_style_id || "selected"}_${styleAsset.checksum}`,
        role: "style",
        mime_type: validatedStyle.mimeType,
        width: validatedStyle.width,
        height: validatedStyle.height,
      },
    ],
  });
}
