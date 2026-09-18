import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import {
  computeAnimationContentFingerprint,
  MascotAnimationAssetV1Schema,
  REQUIRED_FPS,
  REQUIRED_FRAME_COUNT,
  type AnimationState,
  type MascotAnimationAssetV1,
} from "@studio/shared";
import { parseSpriteGenManifest } from "./spriteGen/spriteGenManifest.js";

export type AnimationImportErrorCode =
  "FILE_NOT_FOUND" | "QA_FAILED" | "STATE_MISMATCH" | "RECIPE_MISMATCH" | "FINGERPRINT_MISMATCH" | "INVALID_ASSET";

export class AnimationImportError extends Error {
  public readonly code: AnimationImportErrorCode;

  constructor(message: string, code: AnimationImportErrorCode) {
    super(message);
    this.name = "AnimationImportError";
    this.code = code;
  }
}

export interface ImportAnimationContext {
  mascotId: string;
  styleId: string;
  state: AnimationState;
  slotIndex: number;
  recipeId: string;
  sourceFingerprint: string;
  publicUrlPrefix?: string;
}

export async function importAnimationArtifacts(outputDir: string, context: ImportAnimationContext): Promise<MascotAnimationAssetV1> {
  const resolvedDir = path.resolve(outputDir);

  const manifestFile = path.join(resolvedDir, "manifest.json");
  const qaReportFile = path.join(resolvedDir, "qa_report.json");

  // Validate filesystem integrity
  await verifyFileExists(manifestFile, "manifest.json");
  await verifyFileExists(qaReportFile, "qa_report.json");

  // Parse and validate QA report
  const qaReportRaw = await fs.readFile(qaReportFile, "utf8");
  const qaReport = JSON.parse(qaReportRaw) as { passed?: boolean; ok?: boolean };
  const isQaPassed = qaReport.passed ?? qaReport.ok;
  if (!isQaPassed) {
    throw new AnimationImportError("Animation artifact QA report indicates failed QA checks", "QA_FAILED");
  }

  // Parse and validate manifest adhering strictly to declared frames
  const manifestRaw = await fs.readFile(manifestFile, "utf8");
  const parsedManifest = parseSpriteGenManifest(manifestRaw, resolvedDir, {
    state: context.state,
    recipeId: context.recipeId,
  });

  // Validate state and recipe alignment
  if (parsedManifest.manifest.state !== context.state) {
    throw new AnimationImportError(
      `Manifest state '${parsedManifest.manifest.state}' does not match expected state '${context.state}'`,
      "STATE_MISMATCH",
    );
  }

  if (parsedManifest.manifest.recipe_id !== context.recipeId) {
    throw new AnimationImportError(
      `Manifest recipe_id '${parsedManifest.manifest.recipe_id}' does not match expected recipe '${context.recipeId}'`,
      "RECIPE_MISMATCH",
    );
  }

  // Validate presence and checksum of atlas
  await verifyFileExists(parsedManifest.atlasAbsolutePath, "atlas image");
  const atlasBuffer = await fs.readFile(parsedManifest.atlasAbsolutePath);
  const atlasChecksum = crypto.createHash("sha256").update(atlasBuffer).digest("hex");

  // Verify content fingerprint integrity
  const computedFingerprint = computeAnimationContentFingerprint({
    recipeId: context.recipeId,
    atlasChecksumOrUrl: atlasChecksum,
    frames: parsedManifest.frames,
    registration: parsedManifest.registration,
    sourceFingerprint: context.sourceFingerprint,
  });

  if (
    parsedManifest.manifest.fingerprint &&
    parsedManifest.manifest.fingerprint !== "native_fingerprint" &&
    parsedManifest.manifest.fingerprint !== computedFingerprint
  ) {
    throw new AnimationImportError(
      `Content fingerprint mismatch: declared '${parsedManifest.manifest.fingerprint}', computed '${computedFingerprint}'`,
      "FINGERPRINT_MISMATCH",
    );
  }

  // Build URLs
  const baseUrl =
    context.publicUrlPrefix ??
    `/api/mascots/${context.mascotId}/styles/${context.styleId}/animations/${context.state}/${context.slotIndex}/artifacts`;
  const atlasUrl = `${baseUrl}/${path.basename(parsedManifest.atlasAbsolutePath)}`;
  const manifestUrl = `${baseUrl}/manifest.json`;
  const qaReportUrl = `${baseUrl}/qa_report.json`;

  const assetCandidate = {
    version: 1 as const,
    state: context.state,
    atlas_url: atlasUrl,
    manifest_url: manifestUrl,
    frame_count: REQUIRED_FRAME_COUNT,
    fps: REQUIRED_FPS,
    loop: parsedManifest.manifest.loop,
    loop_policy: parsedManifest.manifest.loop_policy,
    frames: parsedManifest.frames,
    registration: parsedManifest.registration,
    content_fingerprint: computedFingerprint,
    source_fingerprint: context.sourceFingerprint,
    qa_report_url: qaReportUrl,
    published_at: null,
    slot_index: context.slotIndex,
    recipe_id: context.recipeId,
  };

  const validation = MascotAnimationAssetV1Schema.safeParse(assetCandidate);
  if (!validation.success) {
    const errorDetails = validation.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join("; ");
    throw new AnimationImportError(`Final MascotAnimationAssetV1 failed schema validation: ${errorDetails}`, "INVALID_ASSET");
  }

  return validation.data;
}

async function verifyFileExists(filePath: string, label: string): Promise<void> {
  try {
    await fs.access(filePath);
  } catch {
    throw new AnimationImportError(`Required animation artifact missing (${label}): ${filePath}`, "FILE_NOT_FOUND");
  }
}
