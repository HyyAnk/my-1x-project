import { copyFile, mkdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { canonicalJsonStringify, sha256Hex, type FrameRate, type ResolvedTransitionInstance } from "@studio/shared";

export type TransitionPreviewArtifactManifest = Readonly<{
  artifactId: string;
  artifactSha256: string;
  inputFingerprint: string;
  catalogRevision: string;
  engineSnapshotHash: string;
  sourceKind: "sample" | "episode";
  currentness: "matches-request" | "legacy-unverified";
  width: number;
  height: number;
  fps: FrameRate;
  frameCount: number;
  timeBase: { numerator: number; denominator: number };
  frames: readonly { index: number; pts: number }[];
  reviewWindow: { firstFrame: number; lastFrameInclusive: number; boundaryFrame: number };
  instances: readonly ResolvedTransitionInstance[];
}>;

export type VerifiedPreviewArtifact = {
  artifactId: string;
  videoPath: string;
  manifest: TransitionPreviewArtifactManifest;
};

export type PublishedPreviewArtifact = {
  artifactId: string;
  videoPath: string;
  manifestPath: string;
  manifest: TransitionPreviewArtifactManifest;
};

export function getDefaultPreviewStoreDir(): string {
  return path.resolve(process.cwd(), "runtime", "transition-previews", "artifacts");
}

export async function computeFileSha256(filePath: string): Promise<string> {
  const buffer = await readFile(filePath);
  return createHash("sha256").update(buffer).digest("hex");
}

export async function verifyExistingArtifact(
  artifactDir: string,
  expectedSha256?: string,
): Promise<TransitionPreviewArtifactManifest | null> {
  try {
    const videoPath = path.join(artifactDir, "video.mp4");
    const manifestPath = path.join(artifactDir, "manifest.json");

    const [videoStat, manifestStat] = await Promise.all([
      stat(videoPath),
      stat(manifestPath),
    ]);

    if (videoStat.size === 0 || manifestStat.size === 0) {
      return null;
    }

    const manifestContent = await readFile(manifestPath, "utf-8");
    const manifest: TransitionPreviewArtifactManifest = JSON.parse(manifestContent);

    // Verify sha256
    const actualSha256 = await computeFileSha256(videoPath);
    if (actualSha256 !== manifest.artifactSha256) {
      return null;
    }

    if (expectedSha256 && actualSha256 !== expectedSha256) {
      return null;
    }

    return manifest;
  } catch {
    return null;
  }
}

export async function getPublishedPreviewArtifact(
  artifactId: string,
  storeDir: string = getDefaultPreviewStoreDir(),
): Promise<PublishedPreviewArtifact | null> {
  // Prevent path traversal
  const sanitizedId = path.basename(artifactId);
  const artifactDir = path.join(storeDir, sanitizedId);
  const manifest = await verifyExistingArtifact(artifactDir);
  if (!manifest) {
    return null;
  }
  return {
    artifactId: sanitizedId,
    videoPath: path.join(artifactDir, "video.mp4"),
    manifestPath: path.join(artifactDir, "manifest.json"),
    manifest,
  };
}

export async function publishPreviewArtifact(
  verified: VerifiedPreviewArtifact,
  storeDir: string = getDefaultPreviewStoreDir(),
): Promise<PublishedPreviewArtifact> {
  const sanitizedId = path.basename(verified.artifactId);
  const targetDir = path.join(storeDir, sanitizedId);
  await mkdir(storeDir, { recursive: true });

  // 1. Check if already published and verified
  const existingManifest = await verifyExistingArtifact(targetDir, verified.manifest.artifactSha256);
  if (existingManifest) {
    return {
      artifactId: sanitizedId,
      videoPath: path.join(targetDir, "video.mp4"),
      manifestPath: path.join(targetDir, "manifest.json"),
      manifest: existingManifest,
    };
  }

  // 2. Prepare staging directory
  const stagingDir = path.join(storeDir, `${sanitizedId}.staging.${Date.now()}.${Math.random().toString(36).slice(2)}`);
  await mkdir(stagingDir, { recursive: true });

  const stagedVideo = path.join(stagingDir, "video.mp4");
  const stagedManifest = path.join(stagingDir, "manifest.json");

  try {
    await copyFile(verified.videoPath, stagedVideo);
    const videoSha = await computeFileSha256(stagedVideo);
    if (videoSha !== verified.manifest.artifactSha256) {
      throw new Error(`Artifact hash verification failed: expected ${verified.manifest.artifactSha256}, got ${videoSha}`);
    }

    await writeFile(stagedManifest, canonicalJsonStringify(verified.manifest), "utf-8");

    // Atomic move/rename
    try {
      await rename(stagingDir, targetDir);
    } catch {
      // Fallback for Windows cross-volume or existing target
      await rm(targetDir, { recursive: true, force: true }).catch(() => {});
      await rename(stagingDir, targetDir);
    }

    return {
      artifactId: sanitizedId,
      videoPath: path.join(targetDir, "video.mp4"),
      manifestPath: path.join(targetDir, "manifest.json"),
      manifest: verified.manifest,
    };
  } catch (error) {
    await rm(stagingDir, { recursive: true, force: true }).catch(() => {});
    throw error;
  }
}
