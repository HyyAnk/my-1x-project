import fs from "node:fs/promises";
import path from "node:path";
import { type AnimationState } from "@studio/shared";
import { createAnimationStorageAdapter } from "../../quiz/mascot/videoAnimation/adapters/animationStorageAdapter.js";
import { isSafeArtifactIdentity, parseAttemptPin } from "./animationArtifactIdentity.js";

export interface ParsedAnimationArtifact {
  mascotId: string;
  styleId: string;
  state: AnimationState;
  slotIndex: number;
  filename: string;
  attempt?: number;
}

export interface AnimationAssetContext {
  mascotId?: string;
  styleId?: string;
  state?: string;
  slotIndex?: number | string;
}

const API_ANIMATION_URL_REGEX = /(?:^|\/)api\/mascots\/([^/]+)\/styles\/([^/]+)\/animations\/([^/]+)\/([^/]+)\/artifacts\/([^/?#]+)/;

const STATIC_ANIMATION_URL_REGEX = /(?:^|\/)mascot\/assets\/animations\/([^/]+)\/([^/]+)\/([^/]+)\/([^/]+)\/([^/?#]+)/;

const KNOWN_ANIMATION_EXTENSIONS = new Set([".webm", ".png", ".json", ".mp4", ".webp"]);

export function parseAnimationArtifactUrl(url: string, context?: AnimationAssetContext): ParsedAnimationArtifact | null {
  if (!url || typeof url !== "string") return null;
  const attempt = parseAttemptPin(url);
  if (attempt === null) return null;
  try {
    const artifact = parseArtifactPath(url, context);
    if (!artifact) return null;
    if (attempt !== undefined) artifact.attempt = attempt;
    return isSafeArtifactIdentity(artifact) ? artifact : null;
  } catch (error) {
    if (error instanceof URIError) return null;
    throw error;
  }
}

function parseArtifactPath(url: string, context?: AnimationAssetContext): ParsedAnimationArtifact | null {
  const apiMatch = url.match(API_ANIMATION_URL_REGEX);
  if (apiMatch) {
    const slotIndex = Number(apiMatch[4]);
    return {
      mascotId: decodeURIComponent(apiMatch[1]),
      styleId: decodeURIComponent(apiMatch[2]),
      state: decodeURIComponent(apiMatch[3]) as AnimationState,
      slotIndex,
      filename: decodeURIComponent(apiMatch[5]),
    };
  }

  const staticMatch = url.match(STATIC_ANIMATION_URL_REGEX);
  if (staticMatch) {
    const slotIndex = Number(staticMatch[4]);
    return {
      mascotId: decodeURIComponent(staticMatch[1]),
      styleId: decodeURIComponent(staticMatch[2]),
      state: decodeURIComponent(staticMatch[3]) as AnimationState,
      slotIndex,
      filename: decodeURIComponent(staticMatch[5]),
    };
  }

  if (context?.mascotId && context?.styleId && context?.state) {
    const cleanUrl = url.split("?")[0].split("#")[0];
    const baseName = path.basename(cleanUrl);
    const ext = path.extname(baseName).toLowerCase();
    if (KNOWN_ANIMATION_EXTENSIONS.has(ext)) {
      const rawSlot = context.slotIndex ?? 1;
      const slotIndex = Number(rawSlot);
      return {
        mascotId: context.mascotId,
        styleId: context.styleId,
        state: context.state as AnimationState,
        slotIndex,
        filename: decodeURIComponent(baseName),
      };
    }
  }

  return null;
}

export function buildLocalizedArtifactFilename(artifact: ParsedAnimationArtifact): string {
  const pin = artifact.attempt === undefined ? "" : `att_${artifact.attempt}_`;
  const prefix = `${artifact.mascotId}_${artifact.styleId}_${artifact.state}_s${artifact.slotIndex}_${pin}`;
  if (artifact.filename.startsWith(prefix)) {
    return artifact.filename;
  }
  return `${prefix}${artifact.filename}`;
}

async function collectAttemptCandidatePaths(slotDir: string, filename: string, attempt?: number): Promise<string[]> {
  const candidates: string[] = [];
  const attemptsDir = path.join(slotDir, "attempts");
  if (attempt !== undefined) {
    for (const name of [`att_${attempt}`, `attempt_${attempt}`]) {
      const directory = path.join(attemptsDir, name);
      candidates.push(
        path.join(directory, filename),
        path.join(directory, "frames", "matted", filename),
        path.join(directory, "frames", "extracted", filename),
      );
    }
    return candidates;
  }
  try {
    const entries = await fs.readdir(attemptsDir, { withFileTypes: true });
    const attemptDirs = entries
      .filter((entry) => entry.isDirectory() && /^(att_|attempt_)/.test(entry.name))
      .map((entry) => entry.name)
      .sort((a, b) => {
        const numA = parseInt(a.replace(/^(att_|attempt_)/, ""), 10) || 0;
        const numB = parseInt(b.replace(/^(att_|attempt_)/, ""), 10) || 0;
        return numB - numA;
      });

    for (const att of attemptDirs) {
      const attDir = path.join(attemptsDir, att);
      candidates.push(path.join(attDir, filename));
      candidates.push(path.join(attDir, "frames", "matted", filename));
      candidates.push(path.join(attDir, "frames", "extracted", filename));
    }
  } catch {
    // Directory may not exist
  }
  return candidates;
}

async function probeRootForArtifact(storageRoot: string, artifact: ParsedAnimationArtifact): Promise<string | null> {
  const { mascotId, styleId, state, slotIndex, filename, attempt } = artifact;
  const candidatePaths: string[] = [];

  try {
    const adapter = createAnimationStorageAdapter(storageRoot);
    if (slotIndex >= 1 && slotIndex <= 10) {
      const slotDir = adapter.getSlotDir(mascotId, styleId, state, slotIndex);
      if (attempt === undefined) candidatePaths.push(path.join(slotDir, filename));

      const publishedDir = adapter.getPublishedArtifactsDir(mascotId, styleId, state, slotIndex);
      if (attempt === undefined) candidatePaths.push(path.join(publishedDir, filename));

      const attemptPaths = await collectAttemptCandidatePaths(slotDir, filename, attempt);
      candidatePaths.push(...attemptPaths);
    }
  } catch {
    // Continue with direct fallback paths
  }

  const directSlotDirs = [
    path.join(storageRoot, "mascots", mascotId, "animations", styleId, state, `slot_${slotIndex}`),
    path.join(storageRoot, mascotId, "animations", styleId, state, `slot_${slotIndex}`),
    path.join(storageRoot, "mascots", mascotId, "animations", styleId, state, String(slotIndex)),
    path.join(storageRoot, mascotId, "animations", styleId, state, String(slotIndex)),
  ];

  for (const dir of directSlotDirs) {
    if (attempt === undefined) candidatePaths.push(path.join(dir, filename));
    const attPaths = await collectAttemptCandidatePaths(dir, filename, attempt);
    candidatePaths.push(...attPaths);
  }

  for (const candidate of candidatePaths) {
    try {
      const stat = await fs.stat(candidate);
      if (stat.isFile()) return candidate;
    } catch {
      // Continue search
    }
  }

  return null;
}

export async function resolveAnimationPhysicalFile(
  storageRootOrRoots: string | string[],
  artifact: ParsedAnimationArtifact,
): Promise<string | null> {
  if (!isSafeArtifactIdentity(artifact)) return null;
  const roots = Array.isArray(storageRootOrRoots) ? storageRootOrRoots : [storageRootOrRoots];
  for (const root of roots) {
    if (!root) continue;
    const found = await probeRootForArtifact(root, artifact);
    if (found) return found;
  }
  return null;
}
