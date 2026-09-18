import fs from "node:fs/promises";
import path from "node:path";
import { type AnimationState } from "@studio/shared";
import { createAnimationStorageAdapter } from "../../quiz/mascot/videoAnimation/adapters/animationStorageAdapter.js";

export interface ParsedAnimationArtifact {
  mascotId: string;
  styleId: string;
  state: AnimationState;
  slotIndex: number;
  filename: string;
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

  const apiMatch = url.match(API_ANIMATION_URL_REGEX);
  if (apiMatch) {
    const slotIndex = parseInt(apiMatch[4], 10);
    return {
      mascotId: decodeURIComponent(apiMatch[1]),
      styleId: decodeURIComponent(apiMatch[2]),
      state: decodeURIComponent(apiMatch[3]) as AnimationState,
      slotIndex: Number.isFinite(slotIndex) ? slotIndex : 1,
      filename: decodeURIComponent(apiMatch[5]),
    };
  }

  const staticMatch = url.match(STATIC_ANIMATION_URL_REGEX);
  if (staticMatch) {
    const slotIndex = parseInt(staticMatch[4], 10);
    return {
      mascotId: decodeURIComponent(staticMatch[1]),
      styleId: decodeURIComponent(staticMatch[2]),
      state: decodeURIComponent(staticMatch[3]) as AnimationState,
      slotIndex: Number.isFinite(slotIndex) ? slotIndex : 1,
      filename: decodeURIComponent(staticMatch[5]),
    };
  }

  if (context?.mascotId && context?.styleId && context?.state) {
    const cleanUrl = url.split("?")[0].split("#")[0];
    const baseName = path.basename(cleanUrl);
    const ext = path.extname(baseName).toLowerCase();
    if (KNOWN_ANIMATION_EXTENSIONS.has(ext)) {
      const rawSlot = context.slotIndex ?? 1;
      const slotIndex = typeof rawSlot === "number" ? rawSlot : parseInt(String(rawSlot), 10);
      return {
        mascotId: context.mascotId,
        styleId: context.styleId,
        state: context.state as AnimationState,
        slotIndex: Number.isFinite(slotIndex) ? slotIndex : 1,
        filename: decodeURIComponent(baseName),
      };
    }
  }

  return null;
}

export function buildLocalizedArtifactFilename(artifact: ParsedAnimationArtifact): string {
  const prefix = `${artifact.mascotId}_${artifact.styleId}_${artifact.state}_s${artifact.slotIndex}_`;
  if (artifact.filename.startsWith(prefix)) {
    return artifact.filename;
  }
  return `${prefix}${artifact.filename}`;
}

async function collectAttemptCandidatePaths(slotDir: string, filename: string): Promise<string[]> {
  const candidates: string[] = [];
  const attemptsDir = path.join(slotDir, "attempts");
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
  const { mascotId, styleId, state, slotIndex, filename } = artifact;
  const candidatePaths: string[] = [];

  try {
    const adapter = createAnimationStorageAdapter(storageRoot);
    if (slotIndex >= 1 && slotIndex <= 10) {
      const slotDir = adapter.getSlotDir(mascotId, styleId, state, slotIndex);
      candidatePaths.push(path.join(slotDir, filename));

      const publishedDir = adapter.getPublishedArtifactsDir(mascotId, styleId, state, slotIndex);
      candidatePaths.push(path.join(publishedDir, filename));

      const attemptPaths = await collectAttemptCandidatePaths(slotDir, filename);
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
    candidatePaths.push(path.join(dir, filename));
    const attPaths = await collectAttemptCandidatePaths(dir, filename);
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
  const roots = Array.isArray(storageRootOrRoots) ? storageRootOrRoots : [storageRootOrRoots];
  for (const root of roots) {
    if (!root) continue;
    const found = await probeRootForArtifact(root, artifact);
    if (found) return found;
  }
  return null;
}
