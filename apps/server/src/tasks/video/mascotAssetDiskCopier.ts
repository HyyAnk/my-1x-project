import { copyFile } from "node:fs/promises";
import path from "node:path";
import type { RepositoryService } from "../../repository.js";
import { getOrCreateTransparentMascotAsset } from "../../quiz/mascotAssetCache.js";
import {
  type AnimationAssetContext,
  buildLocalizedArtifactFilename,
  parseAnimationArtifactUrl,
  resolveAnimationPhysicalFile,
} from "./mascotAnimationResolver.js";

export type AssetLocalizer = (url?: string | null, context?: AnimationAssetContext) => Promise<string | undefined>;

export async function localizeStaticAsset(
  url: string,
  repository: RepositoryService,
  mascotId: string,
  renderMascotDir: string,
): Promise<string | null> {
  const match = url.match(/\/api\/mascots\/[^/]+\/assets\/([^/?#]+)/);
  if (!match || !match[1]) return null;
  const filename = decodeURIComponent(match[1]);
  try {
    const cachedAsset = await getOrCreateTransparentMascotAsset(repository, mascotId, filename);
    await copyFile(cachedAsset.absolutePath, path.join(renderMascotDir, filename));
    return `./mascot-assets/${filename}`;
  } catch {
    return null;
  }
}

export async function localizeAnimationArtifact(
  url: string,
  storageRoots: string | string[],
  mascotId: string,
  renderMascotDir: string,
  context?: AnimationAssetContext,
): Promise<string | null> {
  const artifact = parseAnimationArtifactUrl(url, { mascotId, ...context });
  if (!artifact) return null;
  try {
    const physicalPath = await resolveAnimationPhysicalFile(storageRoots, artifact);
    if (!physicalPath) return null;
    const localizedFilename = buildLocalizedArtifactFilename(artifact);
    await copyFile(physicalPath, path.join(renderMascotDir, localizedFilename));
    return `./mascot-assets/${localizedFilename}`;
  } catch {
    return null;
  }
}

export function resolveCandidateStorageRoots(repository: RepositoryService): string[] {
  const roots: (string | null | undefined)[] = [
    repository.roots?.mascots ? path.dirname(repository.roots.mascots) : null,
    repository.roots?.mascots,
    repository.roots?.runtime,
    path.join(repository.storageRoot, ".quiz-studio"),
    repository.storageRoot,
    repository.rootDirectory ? path.join(repository.rootDirectory, ".quiz-studio") : null,
    repository.rootDirectory,
  ];
  return roots.filter((r): r is string => Boolean(r));
}

export function isSafeLocalAssetUrl(url?: string | null): boolean {
  if (!url) return false;
  return url.startsWith("./") || url.startsWith("../") || url.startsWith("data:") || url.startsWith("mascot-assets/");
}

export function createMascotAssetLocalizer(repository: RepositoryService, mascotId: string, renderMascotDir: string): AssetLocalizer {
  const candidateRoots = resolveCandidateStorageRoots(repository);

  return async (url?: string | null, context?: AnimationAssetContext): Promise<string | undefined> => {
    if (!url) return undefined;
    if (url.startsWith("data:") || url.startsWith("./mascot-assets/")) return url;
    if (url.startsWith("/mascot-assets/")) return `.${url}`;

    const staticLocalized = await localizeStaticAsset(url, repository, mascotId, renderMascotDir);
    if (staticLocalized) return staticLocalized;

    const animLocalized = await localizeAnimationArtifact(url, candidateRoots, mascotId, renderMascotDir, context);
    if (animLocalized) return animLocalized;

    if (url.startsWith("./") || url.startsWith("../")) return url;
    return undefined;
  };
}
