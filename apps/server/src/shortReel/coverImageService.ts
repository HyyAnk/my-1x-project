import { createHash } from "node:crypto";
import path from "node:path";
import { ReelCoverPayloadSchema, type ReelCoverPayload, type ReelKey, type ShortReelRecord } from "@studio/shared";
import type { PortraitImageClient } from "../providers/imageGeneration/imageGeneration.types.js";
import type { RepositoryService } from "../repository/service.js";
import { COVER_PROMPT_VERSION, buildReelCoverPrompt } from "./coverPrompt.js";
import { GenerationError } from "./generationErrors.js";
import { assetChecksum, readBoundedAsset, storePackageAsset } from "./packageAssets.js";
import { validateImageBuffer } from "./packageImage.js";
import { normalizeReelPortrait } from "./portraitImage.js";

function assertSafePath(targetPath: string): void {
  if (!targetPath || typeof targetPath !== "string") {
    throw new GenerationError("INVALID_REFERENCE_PATH", "Reference asset path is empty.");
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
 * Generates a 1080x1920 portrait cover image conditioned on the accepted style reference,
 * normalized to exact 1080x1920 PNG, and stored directly in the reel's assets directory.
 *
 * Never invokes Episode lookup or bundle writer.
 */
function validateCoverPrerequisites(snapshot: ShortReelRecord) {
  if (!snapshot.visual_context) {
    throw new GenerationError("MISSING_REFERENCE", "Visual context is required to generate cover.");
  }
  if (!snapshot.script || snapshot.units.script.state !== "ready") {
    throw new GenerationError("STALE_DEPENDENCY", "Accepted script is required to generate cover.");
  }
  const referencesPayload = snapshot.units.references.last_accepted_payload;
  if (!referencesPayload || snapshot.units.references.state !== "ready") {
    throw new GenerationError("STALE_DEPENDENCY", "Accepted references are required to generate cover.");
  }
  const styleRef = referencesPayload.references.find((ref) => ref.role === "style");
  if (!styleRef) {
    throw new GenerationError("STALE_DEPENDENCY", "Accepted style reference is required to generate cover.");
  }
  return { styleRef, referencesPayload };
}

async function loadAndValidateStyleBuffer(repository: RepositoryService, stylePath: string, expectedChecksum: string) {
  assertSafePath(stylePath);
  const styleFilePath = path.resolve(repository.storageRoot, stylePath);
  const styleBuffer = await readBoundedAsset(repository, repository.storageRoot, styleFilePath);

  if (assetChecksum(styleBuffer) !== expectedChecksum) {
    throw new GenerationError("IMAGE_CORRUPTED", "Style reference checksum mismatch.");
  }

  const validatedStyle = await validateImageBuffer(styleBuffer, "style");
  const styleMimeType: "image/png" | "image/jpeg" | "image/webp" =
    validatedStyle.mimeType === "image/jpeg" || validatedStyle.mimeType === "image/webp" ? validatedStyle.mimeType : "image/png";

  return { styleBuffer, styleMimeType };
}

async function verifyCoverDependenciesUnchanged(repository: RepositoryService, key: ReelKey, styleChecksum: string) {
  const currentReel = await repository.getShortReel(key);
  if (!currentReel.script || currentReel.units.script.state !== "ready") {
    throw new GenerationError("STALE_DEPENDENCY", "Script changed during cover generation.");
  }
  if (!currentReel.units.references.last_accepted_payload || currentReel.units.references.state !== "ready") {
    throw new GenerationError("STALE_DEPENDENCY", "References invalidated during cover generation.");
  }
  const currentStyle = currentReel.units.references.last_accepted_payload.references.find((ref) => ref.role === "style");
  if (!currentStyle || currentStyle.checksum !== styleChecksum) {
    throw new GenerationError("STALE_DEPENDENCY", "Style reference changed during cover generation.");
  }
}

/**
 * Generates the 9:16 portrait cover image conditioned on the accepted style reference.
 * Returns the cover payload with 1080x1920 dimensions and stored asset details.
 * Does not mutate or accept unit state on the record directly; acceptance is workflow-owned.
 */
export async function generateReelCoverPayload(
  repository: RepositoryService,
  key: ReelKey,
  snapshot: ShortReelRecord,
  client: PortraitImageClient,
  operationId: string,
  signal?: AbortSignal,
): Promise<ReelCoverPayload> {
  if (signal?.aborted) {
    throw new GenerationError("OPERATION_CANCELLED", "Cover generation cancelled.");
  }

  const { styleRef, referencesPayload } = validateCoverPrerequisites(snapshot);
  const { styleBuffer, styleMimeType } = await loadAndValidateStyleBuffer(repository, styleRef.path, styleRef.checksum);

  const prompt = buildReelCoverPrompt(snapshot);
  const scriptHash = createHash("sha256")
    .update(JSON.stringify(snapshot.units.script.last_accepted_payload?.script ?? snapshot.script))
    .digest("hex");
  const refsHash = createHash("sha256")
    .update(
      referencesPayload.references
        .map((r) => `${r.role}:${r.checksum}`)
        .sort()
        .join("|"),
    )
    .digest("hex");
  const dependencyFingerprint = createHash("sha256").update(`${scriptHash}:${refsHash}:${COVER_PROMPT_VERSION}`).digest("hex");

  if (signal?.aborted) {
    throw new GenerationError("OPERATION_CANCELLED", "Cover generation cancelled.");
  }

  let generatedResult;
  try {
    generatedResult = await client.generate({
      prompt,
      aspectRatio: "9:16",
      reference: {
        bytes: styleBuffer,
        mimeType: styleMimeType,
      },
      operationId,
      dependencyFingerprint,
      signal: signal ?? new AbortController().signal,
    });
  } catch (error) {
    if (signal?.aborted || (error instanceof Error && error.name === "AbortError")) {
      throw new GenerationError("OPERATION_CANCELLED", "Cover generation cancelled.", { cause: error });
    }
    if (error instanceof GenerationError) {
      throw error;
    }
    throw new GenerationError("PROVIDER_ERROR", error instanceof Error ? error.message : "Provider error during cover generation.", {
      cause: error,
    });
  }

  if (signal?.aborted) {
    throw new GenerationError("OPERATION_CANCELLED", "Cover generation cancelled.");
  }

  const normalizedBuffer = await normalizeReelPortrait(generatedResult.bytes);
  await verifyCoverDependenciesUnchanged(repository, key, styleRef.checksum);
  const storedAsset = await storePackageAsset(repository, key, "cover", "png", normalizedBuffer);

  const payload: ReelCoverPayload = {
    asset_id: `cover_${storedAsset.checksum}`,
    path: storedAsset.path,
    mime_type: "image/png",
    width: 1080,
    height: 1920,
    checksum: storedAsset.checksum,
  };

  return ReelCoverPayloadSchema.parse(payload);
}
