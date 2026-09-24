import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { z } from "zod";
import type { ThumbnailAspectRatio } from "@studio/shared";
import type { RepositoryService } from "../../repository.js";
import { writeJsonAtomic } from "../../utils/fs.js";

const CheckpointSchema = z.object({ version: z.literal(1), fingerprints: z.record(z.string()) });
export type ThumbnailReuseCheckpoint = z.infer<typeof CheckpointSchema>;

export interface ThumbnailFingerprintInput {
  version?: number;
  topic?: unknown;
  questions?: unknown;
  language?: unknown;
  style?: unknown;
  mascotId?: string | null;
  mascotAnchorFingerprint?: string | null;
  layout?: unknown;
  hook?: unknown;
  badge?: unknown;
  [key: string]: unknown;
}

export function thumbnailInputFingerprint(input: ThumbnailFingerprintInput | unknown): string {
  return createHash("sha256").update(JSON.stringify(input)).digest("hex");
}

export async function readThumbnailReuseCheckpoint(filePath: string): Promise<ThumbnailReuseCheckpoint> {
  try {
    return CheckpointSchema.parse(JSON.parse(await readFile(filePath, "utf8")));
  } catch {
    return { version: 1, fingerprints: {} };
  }
}

export const writeThumbnailReuseCheckpoint = writeJsonAtomic;

export async function isReusableThumbnail(
  repository: RepositoryService,
  assetPath: string | null | undefined,
  ratio: ThumbnailAspectRatio,
): Promise<boolean> {
  if (!assetPath) return false;
  try {
    const absolutePath = repository.resolveContextPath(assetPath);
    const relative = path.relative(repository.storageRoot, absolutePath);
    if (relative.startsWith("..") || path.isAbsolute(relative)) return false;
    // Decode, not just stat/header inspection: placeholders and truncated files
    // must never be accepted as successful paid generation.
    const { info } = await sharp(await readFile(absolutePath), { failOn: "warning" })
      .raw()
      .toBuffer({ resolveWithObject: true });
    // Providers can return 3:2/2:3 native images that the thumbnail surface crops
    // to 16:9/9:16. Do not pay to regenerate a healthy image for that difference.
    const orientationMatches = ratio === "16:9" ? info.width >= info.height : info.height >= info.width;
    return info.width >= 180 && info.height >= 180 && orientationMatches;
  } catch {
    return false;
  }
}
