import path from "node:path";
import { readFile } from "node:fs/promises";
import sharp from "sharp";
import type { RepositoryService } from "../repository.js";
import { getTransparentMascotCachePaths } from "../repository/mascot/mascotTransparentStorage.js";
import type { PreviewResolvedIntroOutroContext, ResolvedReference } from "./contextResolver.js";

async function hasTransparency(filename: string): Promise<boolean> {
  const stats = await sharp(filename).stats();
  return !stats.isOpaque;
}

export async function existingTransparentImage(
  repository: Pick<RepositoryService, "getTransparentMascotAssetFile"> & { roots: Pick<RepositoryService["roots"], "mascots"> },
  context: Pick<PreviewResolvedIntroOutroContext, "mascotReference" | "logoReference"> & { mascot: { id: string } | null },
  kind: "mascot" | "logo",
): Promise<string | null> {
  const reference: ResolvedReference | null = kind === "mascot" ? context.mascotReference : context.logoReference;
  if (!reference) return null;
  if (await hasTransparency(reference.absolutePath)) return reference.absolutePath;
  if (kind !== "mascot" || !context.mascot) return null;
  const filename = path.basename(reference.absolutePath);
  const { metaPath } = getTransparentMascotCachePaths(repository.roots.mascots, context.mascot.id, filename);
  try {
    const metadata: unknown = JSON.parse(await readFile(metaPath, "utf8"));
    if (!metadata || typeof metadata !== "object" || !("source_hash" in metadata) || metadata.source_hash !== reference.sha256) return null;
    const cached = await repository.getTransparentMascotAssetFile(context.mascot.id, filename);
    return (await hasTransparency(cached.absolutePath)) ? cached.absolutePath : null;
  } catch (error) {
    if (
      error instanceof SyntaxError ||
      (error instanceof Error && "code" in error && ["ENOENT", "TRANSPARENT_MASCOT_ASSET_NOT_FOUND"].includes(String(error.code)))
    )
      return null;
    throw error;
  }
}
