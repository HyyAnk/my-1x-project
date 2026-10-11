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

const STATIC_ASSET_URL = /\/api\/mascots\/[^/]+\/assets\/([^/?#]+)/;

export type AssetLocalizer = (url?: string | null, context?: AnimationAssetContext) => Promise<string | undefined>;

export async function localizeStaticAsset(
  url: string,
  repository: RepositoryService,
  mascotId: string,
  renderMascotDir: string,
): Promise<string | null> {
  const match = url.match(STATIC_ASSET_URL);
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

/** Static assets copy to a context-free filename; animation artifacts are named by their slot context. */
function localizationKey(url: string, context?: AnimationAssetContext): string {
  if (STATIC_ASSET_URL.test(url)) return url;
  return [url, context?.mascotId, context?.styleId, context?.state, context?.slotIndex].join("|");
}

/**
 * Shares one in-flight localization per asset. A state variant often names the same file as both its
 * image and its transparent image; copying it twice at once onto the same target fails with EBUSY on
 * Windows, which left the variant unlocalized, unmeasured and rendered with a square fallback box.
 */
export function dedupeAssetLocalizer(localizer: AssetLocalizer): AssetLocalizer {
  const inFlight = new Map<string, Promise<string | undefined>>();
  return (url, context) => {
    if (!url) return Promise.resolve(undefined);
    const key = localizationKey(url, context);
    const pending = inFlight.get(key) ?? localizer(url, context);
    inFlight.set(key, pending);
    return pending;
  };
}

export function createMascotAssetLocalizer(repository: RepositoryService, mascotId: string, renderMascotDir: string): AssetLocalizer {
  const candidateRoots = resolveCandidateStorageRoots(repository);

  return dedupeAssetLocalizer(async (url?: string | null, context?: AnimationAssetContext): Promise<string | undefined> => {
    if (!url) return undefined;
    if (url.startsWith("data:") || url.startsWith("./mascot-assets/")) return url;
    if (url.startsWith("/mascot-assets/")) return `.${url}`;

    const staticLocalized = await localizeStaticAsset(url, repository, mascotId, renderMascotDir);
    if (staticLocalized) return staticLocalized;

    const animLocalized = await localizeAnimationArtifact(url, candidateRoots, mascotId, renderMascotDir, context);
    if (animLocalized) return animLocalized;

    if (url.startsWith("./") || url.startsWith("../")) return url;
    return undefined;
  });
}
