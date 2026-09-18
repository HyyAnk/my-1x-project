import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { type AnimationState } from "@studio/shared";

export class AnimationStorageSecurityError extends Error {
  public readonly code: string;

  constructor(message: string, code = "UNSAFE_PATH") {
    super(message);
    this.name = "AnimationStorageSecurityError";
    this.code = code;
  }
}

export interface StoredFileResult {
  filePath: string;
  fileUrl: string;
  sha256: string;
  byteLength: number;
}

export interface AnimationStorageAdapter {
  storageRoot: string;
  validateSafePath: (candidatePath: string, allowedBaseDir?: string) => string;
  getAttemptDir: (mascotId: string, styleId: string, state: AnimationState, slotIndex: number, attemptId: string | number) => string;
  saveAttemptSourceVideo: (
    mascotId: string,
    styleId: string,
    state: AnimationState,
    slotIndex: number,
    attemptId: string | number,
    filename: string,
    buffer: Buffer,
  ) => Promise<StoredFileResult>;
  getAttemptSourceVideoPath: (
    mascotId: string,
    styleId: string,
    state: AnimationState,
    slotIndex: number,
    attemptId: string | number,
    filename?: string,
  ) => string;
  getAttemptFramesDir: (
    mascotId: string,
    styleId: string,
    state: AnimationState,
    slotIndex: number,
    attemptId: string | number,
    subDir?: string,
  ) => string;
  getSlotDir: (mascotId: string, styleId: string, state: AnimationState, slotIndex: number) => string;
  getSlotRevisionsDir: (mascotId: string, styleId: string, state: AnimationState, slotIndex: number) => string;
  getPublishedArtifactsDir: (mascotId: string, styleId: string, state: AnimationState, slotIndex: number) => string;
}

/**
 * Validates that an identifier contains only alphanumeric characters, dashes, and underscores.
 * Prevents directory traversal and injection.
 */
export function sanitizeIdentifier(name: string, fieldName = "identifier"): string {
  const trimmed = name.trim();
  if (!trimmed || !/^[a-zA-Z0-9_-]+$/.test(trimmed)) {
    throw new AnimationStorageSecurityError(
      `Invalid ${fieldName}: "${name}". Only alphanumeric, dash, and underscore are permitted.`,
      "UNSAFE_PATH",
    );
  }
  return trimmed;
}

/**
 * Ensures candidate path does not escape the allowed base directory.
 */
export function validateSafePath(candidatePath: string, allowedBaseDir: string): string {
  if (!candidatePath || typeof candidatePath !== "string") {
    throw new AnimationStorageSecurityError("Path must be a non-empty string", "UNSAFE_PATH");
  }

  // Reject null bytes or traversal characters
  if (candidatePath.includes("\0") || candidatePath.includes("..")) {
    throw new AnimationStorageSecurityError(`Path traversal sequence detected: ${candidatePath}`, "UNSAFE_PATH");
  }

  const resolvedBase = path.resolve(allowedBaseDir);
  const resolvedTarget = path.isAbsolute(candidatePath) ? path.resolve(candidatePath) : path.resolve(resolvedBase, candidatePath);

  const relative = path.relative(resolvedBase, resolvedTarget);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new AnimationStorageSecurityError(`Resolved path escapes allowed directory: ${candidatePath}`, "UNSAFE_PATH");
  }

  return resolvedTarget;
}

export function createAnimationStorageAdapter(storageRoot: string): AnimationStorageAdapter {
  const normalizedRoot = path.resolve(storageRoot);

  function getSlotDir(mascotId: string, styleId: string, state: AnimationState, slotIndex: number): string {
    const safeMascotId = sanitizeIdentifier(mascotId, "mascotId");
    const safeStyleId = sanitizeIdentifier(styleId, "styleId");
    const safeState = sanitizeIdentifier(state, "state");
    const safeSlot = Math.floor(Number(slotIndex));
    if (safeSlot < 1 || safeSlot > 10) {
      throw new AnimationStorageSecurityError(`slotIndex must be between 1 and 10, got: ${slotIndex}`, "UNSAFE_PATH");
    }

    const slotRelative = path.join("mascots", safeMascotId, "animations", safeStyleId, safeState, `slot_${safeSlot}`);

    return validateSafePath(slotRelative, normalizedRoot);
  }

  function getSlotRevisionsDir(mascotId: string, styleId: string, state: AnimationState, slotIndex: number): string {
    const slotDir = getSlotDir(mascotId, styleId, state, slotIndex);
    return path.join(slotDir, "revisions");
  }

  function getPublishedArtifactsDir(mascotId: string, styleId: string, state: AnimationState, slotIndex: number): string {
    const safeMascotId = sanitizeIdentifier(mascotId, "mascotId");
    const safeStyleId = sanitizeIdentifier(styleId, "styleId");
    const safeState = sanitizeIdentifier(state, "state");
    const safeSlot = Math.floor(Number(slotIndex));
    if (safeSlot < 1 || safeSlot > 10) {
      throw new AnimationStorageSecurityError(`slotIndex must be between 1 and 10, got: ${slotIndex}`, "UNSAFE_PATH");
    }

    const publishedRelative = path.join("mascots", safeMascotId, "published_animations", safeStyleId, safeState, `slot_${safeSlot}`);

    return validateSafePath(publishedRelative, normalizedRoot);
  }

  function getAttemptDir(mascotId: string, styleId: string, state: AnimationState, slotIndex: number, attemptId: string | number): string {
    const slotDir = getSlotDir(mascotId, styleId, state, slotIndex);
    const safeAttemptId = sanitizeIdentifier(String(attemptId), "attemptId");
    const attemptRelative = path.join(slotDir, "attempts", `att_${safeAttemptId}`);

    return validateSafePath(attemptRelative, normalizedRoot);
  }

  function getAttemptSourceVideoPath(
    mascotId: string,
    styleId: string,
    state: AnimationState,
    slotIndex: number,
    attemptId: string | number,
    filename = "source.mp4",
  ): string {
    const attemptDir = getAttemptDir(mascotId, styleId, state, slotIndex, attemptId);
    const safeFilename = path.basename(filename);
    if (!/^[a-zA-Z0-9_.-]+$/.test(safeFilename)) {
      throw new AnimationStorageSecurityError(`Unsafe filename: ${filename}`, "UNSAFE_PATH");
    }
    return path.join(attemptDir, safeFilename);
  }

  async function saveAttemptSourceVideo(
    mascotId: string,
    styleId: string,
    state: AnimationState,
    slotIndex: number,
    attemptId: string | number,
    filename: string,
    buffer: Buffer,
  ): Promise<StoredFileResult> {
    const attemptDir = getAttemptDir(mascotId, styleId, state, slotIndex, attemptId);
    await fs.mkdir(attemptDir, { recursive: true });

    const safeFilename = path.basename(filename);
    if (!/^[a-zA-Z0-9_.-]+$/.test(safeFilename)) {
      throw new AnimationStorageSecurityError(`Unsafe filename: ${filename}`, "UNSAFE_PATH");
    }

    const filePath = path.join(attemptDir, safeFilename);
    await fs.writeFile(filePath, buffer);

    const canonicalSourcePath = path.join(attemptDir, "source.mp4");
    if (filePath !== canonicalSourcePath) {
      await fs.copyFile(filePath, canonicalSourcePath);
    }

    const sha256 = crypto.createHash("sha256").update(buffer).digest("hex");
    const safeMascotId = sanitizeIdentifier(mascotId, "mascotId");
    const safeStyleId = sanitizeIdentifier(styleId, "styleId");
    const safeState = sanitizeIdentifier(state, "state");
    const safeSlot = Math.floor(Number(slotIndex));
    const safeAttemptId = sanitizeIdentifier(String(attemptId), "attemptId");

    const fileUrl = `/api/mascots/${safeMascotId}/styles/${safeStyleId}/slots/${safeState}/${safeSlot}/attempts/${safeAttemptId}/source`;

    return {
      filePath,
      fileUrl,
      sha256,
      byteLength: buffer.length,
    };
  }

  function getAttemptFramesDir(
    mascotId: string,
    styleId: string,
    state: AnimationState,
    slotIndex: number,
    attemptId: string | number,
    subDir = "source",
  ): string {
    const attemptDir = getAttemptDir(mascotId, styleId, state, slotIndex, attemptId);
    const safeSubDir = sanitizeIdentifier(subDir, "subDir");
    return path.join(attemptDir, "frames", safeSubDir);
  }

  return {
    storageRoot: normalizedRoot,
    validateSafePath: (p, base) => validateSafePath(p, base ?? normalizedRoot),
    getSlotDir,
    getSlotRevisionsDir,
    getPublishedArtifactsDir,
    getAttemptDir,
    saveAttemptSourceVideo,
    getAttemptSourceVideoPath,
    getAttemptFramesDir,
  };
}
