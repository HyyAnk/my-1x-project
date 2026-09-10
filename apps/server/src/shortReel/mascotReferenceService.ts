import { createHash } from "node:crypto";
import path from "node:path";
import type { ReelKey, ReelVisualContext } from "@studio/shared";
import type { RepositoryService } from "../repository/service.js";
import { readBoundedAsset, storePackageAsset } from "./packageAssets.js";
import { validateImageBuffer } from "./packageImage.js";
import { GenerationError } from "./generationErrors.js";

const DEFAULT_ART_DIRECTION = "Pixar-style cinematic 3D animation";

function assertSafePath(targetPath: string): void {
  if (!targetPath || typeof targetPath !== "string") {
    throw new GenerationError("INVALID_REFERENCE_PATH", "Reference path is empty.");
  }
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//i.test(targetPath) || /^data:/i.test(targetPath)) {
    throw new GenerationError("INVALID_REFERENCE_PATH", "Remote URLs or URI protocol schemes are forbidden.");
  }
  const normalized = targetPath.replace(/\\/g, "/");
  if (normalized.includes("..")) {
    throw new GenerationError("INVALID_REFERENCE_PATH", "Path traversal sequences are strictly forbidden.");
  }
}

/**
 * Resolves the channel's assigned mascot master image, validates single-frame raster integrity,
 * copies an immutable snapshot into the reel's references storage, and returns a ReelVisualContext.
 * Guarantees zero mutation of global mascot profiles or global styles.
 */
export async function resolveMascotReference(
  repository: RepositoryService,
  key: ReelKey,
  signal?: AbortSignal,
): Promise<ReelVisualContext> {
  if (signal?.aborted) {
    throw new GenerationError("OPERATION_CANCELLED", "Visual reference resolution cancelled.");
  }

  const initialStorageRoot = repository.storageRoot;
  const channel = await repository.getChannel(key.channel_id);

  if (!channel.mascot_id) {
    throw new GenerationError(
      "MISSING_REFERENCE",
      "Channel has no mascot assigned. Please assign a mascot in Mascot Design or Channel Settings.",
    );
  }

  const mascotId = channel.mascot_id;
  if (!/^[A-Za-z0-9_-]+$/.test(mascotId)) {
    throw new GenerationError("INVALID_REFERENCE_PATH", `Invalid mascot ID format: ${mascotId}`);
  }

  const mascot = await repository.getMascot(mascotId).catch(() => null);
  if (!mascot) {
    throw new GenerationError("MISSING_REFERENCE", `Assigned mascot "${mascotId}" was not found. Please verify channel mascot assignment.`);
  }

  if (!mascot.master_image_url || !mascot.master_image_url.trim()) {
    throw new GenerationError(
      "MISSING_REFERENCE",
      `Mascot "${mascot.name}" has no master image. Please upload or generate a master image in Mascot Design.`,
    );
  }

  const masterUrl = mascot.master_image_url.trim();
  assertSafePath(masterUrl);

  // Reject known multi-frame sprite atlases
  if (Object.values(mascot.actions ?? {}).some((action) => action && action.frames_count > 1 && action.sprite_url === masterUrl)) {
    throw new GenerationError(
      "ANIMATION_ATLAS_REJECTED",
      "Mascot master image points to a multi-frame sprite atlas. A single-frame image is required.",
    );
  }

  const match = /^\/api\/mascots\/([A-Za-z0-9_-]+)\/assets\/([^/\\?#%:]+)$/.exec(masterUrl);
  if (!match || match[1] !== mascot.id) {
    throw new GenerationError("INVALID_REFERENCE_PATH", "Mascot master image path does not belong to the assigned mascot.");
  }

  const filename = match[2];
  const asset = await repository.getMascotAssetFile(mascot.id, filename);
  const masterBuffer = await readBoundedAsset(repository, path.join(repository.roots.mascots, mascot.id, "assets"), asset.absolutePath);

  if (signal?.aborted) {
    throw new GenerationError("OPERATION_CANCELLED", "Visual reference resolution cancelled.");
  }

  const validatedMaster = await validateImageBuffer(masterBuffer, "mascot");

  if (repository.storageRoot !== initialStorageRoot) {
    throw new GenerationError("INVALID_REFERENCE_PATH", "Storage root changed while resolving references.");
  }

  const storedAsset = await storePackageAsset(repository, key, "mascot", validatedMaster.format, validatedMaster.buffer);

  const activeStyle = mascot.active_style_id
    ? mascot.styles?.find((s) => s.id === mascot.active_style_id)
    : mascot.styles?.find((s) => s.is_default);

  const artDirection = (activeStyle?.keyword?.trim() || DEFAULT_ART_DIRECTION).trim();

  const fingerprint = createHash("sha256").update(`${mascot.id}:${storedAsset.checksum}:${artDirection}`).digest("hex");

  return {
    mascot_id: mascot.id,
    mascot_name: mascot.name,
    mascot_asset_path: storedAsset.path,
    mascot_checksum: storedAsset.checksum,
    art_direction: artDirection,
    style_preset_id: mascot.active_style_id ?? null,
    fingerprint,
  };
}
