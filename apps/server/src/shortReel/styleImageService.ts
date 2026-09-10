import { createHash } from "node:crypto";
import path from "node:path";
import { ReelReferencesPayloadSchema, type ReelKey, type ReelReferencesPayload, type ShortReelRecord } from "@studio/shared";
import type { PortraitImageClient } from "../providers/imageGeneration/imageGeneration.types.js";
import type { RepositoryService } from "../repository/service.js";
import { GenerationError } from "./generationErrors.js";
import { resolveMascotReference } from "./mascotReferenceService.js";
import { assetChecksum, readBoundedAsset, storePackageAsset } from "./packageAssets.js";
import { validateImageBuffer } from "./packageImage.js";
import { normalizeReelPortrait } from "./portraitImage.js";
import { STYLE_PROMPT_VERSION, buildReelStylePrompt } from "./stylePrompt.js";

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
 * Generates a 9:16 portrait style reference image conditioned on the mascot master reference
 * and accepted script, stores the generated asset in the reel references directory,
 * and returns the combined ReelReferencesPayload (mascot + style).
 *
 * Does NOT accept or mutate unit state on the record; unit acceptance is owned by the workflow.
 */
export async function generateReelStyleReferences(
  repository: RepositoryService,
  key: ReelKey,
  snapshot: ShortReelRecord,
  client: PortraitImageClient,
  operationId: string,
  signal?: AbortSignal,
): Promise<ReelReferencesPayload> {
  if (signal?.aborted) {
    throw new GenerationError("OPERATION_CANCELLED", "Style generation cancelled.");
  }

  if (!snapshot.visual_context) {
    throw new GenerationError("MISSING_REFERENCE", "Visual context is required to generate style references.");
  }

  if (!snapshot.script || snapshot.units.script.state !== "ready") {
    throw new GenerationError("STALE_DEPENDENCY", "Accepted script is required to generate style references.");
  }

  const prompt = buildReelStylePrompt(snapshot);

  assertSafePath(snapshot.visual_context.mascot_asset_path);
  const masterFilePath = path.resolve(repository.storageRoot, snapshot.visual_context.mascot_asset_path);
  const masterBuffer = await readBoundedAsset(repository, repository.storageRoot, masterFilePath);
  const validatedMaster = await validateImageBuffer(masterBuffer, "mascot");

  if (assetChecksum(masterBuffer) !== snapshot.visual_context.mascot_checksum) {
    throw new GenerationError("IMAGE_CORRUPTED", "Mascot master reference checksum mismatch.");
  }

  const scriptHash = createHash("sha256")
    .update(JSON.stringify(snapshot.units.script.last_accepted_payload?.script ?? snapshot.script))
    .digest("hex");
  const dependencyFingerprint = createHash("sha256")
    .update(`${scriptHash}:${snapshot.visual_context.fingerprint}:${STYLE_PROMPT_VERSION}`)
    .digest("hex");

  if (signal?.aborted) {
    throw new GenerationError("OPERATION_CANCELLED", "Style generation cancelled.");
  }

  const masterMimeType: "image/png" | "image/jpeg" | "image/webp" =
    validatedMaster.mimeType === "image/jpeg" || validatedMaster.mimeType === "image/webp" ? validatedMaster.mimeType : "image/png";

  let generatedResult;
  try {
    generatedResult = await client.generate({
      prompt,
      aspectRatio: "9:16",
      reference: {
        bytes: masterBuffer,
        mimeType: masterMimeType,
      },
      operationId,
      dependencyFingerprint,
      signal: signal ?? new AbortController().signal,
    });
  } catch (error) {
    if (signal?.aborted || (error instanceof Error && error.name === "AbortError")) {
      throw new GenerationError("OPERATION_CANCELLED", "Style generation cancelled.", { cause: error });
    }
    if (error instanceof GenerationError) {
      throw error;
    }
    throw new GenerationError("PROVIDER_ERROR", error instanceof Error ? error.message : "Provider error during style generation.", {
      cause: error,
    });
  }

  if (signal?.aborted) {
    throw new GenerationError("OPERATION_CANCELLED", "Style generation cancelled.");
  }

  const normalizedBuffer = await normalizeReelPortrait(generatedResult.bytes);

  // Check if mascot changed during generation
  const currentMascotContext = await resolveMascotReference(repository, key, signal);
  if (currentMascotContext.fingerprint !== snapshot.visual_context.fingerprint) {
    throw new GenerationError("STALE_DEPENDENCY", "Mascot reference changed during style generation.");
  }

  // Check if reel dependencies changed during generation
  const currentReel = await repository.getShortReel(key);
  if (
    !currentReel.visual_context ||
    currentReel.visual_context.fingerprint !== snapshot.visual_context.fingerprint ||
    !currentReel.script ||
    currentReel.units.script.state !== "ready"
  ) {
    throw new GenerationError("STALE_DEPENDENCY", "Reel dependencies changed during style generation.");
  }

  const storedStyleAsset = await storePackageAsset(repository, key, "style", "png", normalizedBuffer);

  const payload: ReelReferencesPayload = {
    references: [
      {
        asset_id: `mascot_${snapshot.visual_context.mascot_id}_${snapshot.visual_context.mascot_checksum}`,
        role: "mascot",
        path: snapshot.visual_context.mascot_asset_path,
        mime_type: validatedMaster.mimeType,
        width: validatedMaster.width,
        height: validatedMaster.height,
        checksum: snapshot.visual_context.mascot_checksum,
      },
      {
        asset_id: `style_${storedStyleAsset.checksum}`,
        role: "style",
        path: storedStyleAsset.path,
        mime_type: "image/png",
        width: 1080,
        height: 1920,
        checksum: storedStyleAsset.checksum,
      },
    ],
  };

  return ReelReferencesPayloadSchema.parse(payload);
}
