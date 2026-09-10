import { createHash } from "node:crypto";
import { mkdir, readFile, stat } from "node:fs/promises";
import type { RepositoryRuntime } from "../runtime.js";
import { removeImageBackground } from "../../utils/imageMatting.js";
import type {
  MascotTransparentCacheMeta,
  TransparentMascotAssetOptions,
  TransparentMascotAssetResult,
} from "./mascotTransparentCache.types.js";
import { getTransparentMascotCachePaths } from "./mascotTransparentStorage.js";

export * from "./mascotTransparentCache.types.js";
export * from "./mascotTransparentStorage.js";

const inFlightMatting = new Map<string, Promise<TransparentMascotAssetResult>>();

export async function getOrCreateTransparentMascotAsset(
  this: RepositoryRuntime | void,
  mascotId: string,
  filename: string,
  options?: TransparentMascotAssetOptions,
): Promise<TransparentMascotAssetResult>;
export async function getOrCreateTransparentMascotAsset(
  this: RepositoryRuntime | void,
  repository: Pick<RepositoryRuntime, "roots" | "getMascotAssetFile" | "writeBinaryAtomic" | "writeJsonAtomic">,
  mascotId: string,
  filename: string,
  options?: TransparentMascotAssetOptions,
): Promise<TransparentMascotAssetResult>;
export async function getOrCreateTransparentMascotAsset(
  this: RepositoryRuntime | void,
  first: Pick<RepositoryRuntime, "roots" | "getMascotAssetFile" | "writeBinaryAtomic" | "writeJsonAtomic"> | string,
  second: string,
  third?: string | TransparentMascotAssetOptions,
  fourth?: TransparentMascotAssetOptions,
): Promise<TransparentMascotAssetResult> {
  let repository: Pick<RepositoryRuntime, "roots" | "getMascotAssetFile" | "writeBinaryAtomic" | "writeJsonAtomic">;
  let mascotId: string;
  let filename: string;
  let options: TransparentMascotAssetOptions = {};

  if (typeof first === "string") {
    repository = this as RepositoryRuntime;
    mascotId = first;
    filename = second;
    if (typeof third === "object" && third !== null) {
      options = third;
    }
  } else {
    repository = first;
    mascotId = second;
    filename = third as string;
    if (fourth) {
      options = fourth;
    }
  }

  const flightKey = `${mascotId}:${filename}`;
  if (!options.forceRecompute && inFlightMatting.has(flightKey)) {
    return await inFlightMatting.get(flightKey)!;
  }

  const execution = resolveTransparentAsset(repository, mascotId, filename, options);
  if (!options.forceRecompute) {
    inFlightMatting.set(flightKey, execution);
  }

  try {
    return await execution;
  } finally {
    if (!options.forceRecompute && inFlightMatting.get(flightKey) === execution) {
      inFlightMatting.delete(flightKey);
    }
  }
}

async function resolveTransparentAsset(
  repository: Pick<RepositoryRuntime, "roots" | "getMascotAssetFile" | "writeBinaryAtomic" | "writeJsonAtomic">,
  mascotId: string,
  filename: string,
  options: TransparentMascotAssetOptions,
): Promise<TransparentMascotAssetResult> {
  const sourceAsset = await repository.getMascotAssetFile(mascotId, filename);
  const { transparentDir, cachedPath, metaPath } = getTransparentMascotCachePaths(repository.roots.mascots, mascotId, filename);

  if (!options.forceRecompute) {
    const cached = await readValidCache(sourceAsset, cachedPath, metaPath, repository, options);
    if (cached) return cached;
  }

  return await computeAndStoreCache(repository, sourceAsset, transparentDir, cachedPath, metaPath, filename);
}

async function readValidCache(
  sourceAsset: { absolutePath: string; size: number; modified_at: string },
  cachedPath: string,
  metaPath: string,
  repository: Pick<RepositoryRuntime, "writeJsonAtomic">,
  options: TransparentMascotAssetOptions,
): Promise<TransparentMascotAssetResult | null> {
  try {
    const cachedStat = await stat(cachedPath);
    if (!cachedStat.isFile() || cachedStat.size === 0) return null;

    const metaRaw = await readFile(metaPath, "utf8");
    const parsed: unknown = JSON.parse(metaRaw);
    if (!parsed || typeof parsed !== "object") return null;
    const meta = parsed as MascotTransparentCacheMeta;

    const sizeMatches = meta.source_size === sourceAsset.size;
    const mtimeMatches = meta.source_modified_at === sourceAsset.modified_at;

    if (sizeMatches && mtimeMatches) {
      if (!options.validateHash) {
        return { absolutePath: cachedPath, cached: true, meta };
      }
      const rawContent = await readFile(sourceAsset.absolutePath);
      const hash = createHash("sha256").update(rawContent).digest("hex");
      if (meta.source_hash === hash) {
        return { absolutePath: cachedPath, cached: true, meta };
      }
      return null;
    }

    const rawContent = await readFile(sourceAsset.absolutePath);
    const hash = createHash("sha256").update(rawContent).digest("hex");
    if (meta.source_hash === hash) {
      const updatedMeta: MascotTransparentCacheMeta = {
        ...meta,
        source_size: sourceAsset.size,
        source_modified_at: sourceAsset.modified_at,
      };
      await repository.writeJsonAtomic(metaPath, updatedMeta);
      return { absolutePath: cachedPath, cached: true, meta: updatedMeta };
    }
  } catch {
    // Missing or invalid cache file
  }
  return null;
}

async function computeAndStoreCache(
  repository: Pick<RepositoryRuntime, "writeBinaryAtomic" | "writeJsonAtomic">,
  sourceAsset: { absolutePath: string; size: number; modified_at: string },
  transparentDir: string,
  cachedPath: string,
  metaPath: string,
  filename: string,
): Promise<TransparentMascotAssetResult> {
  const rawContent = await readFile(sourceAsset.absolutePath);
  const sourceHash = createHash("sha256").update(rawContent).digest("hex");
  const transparentContent = await removeImageBackground(rawContent);

  await mkdir(transparentDir, { recursive: true });
  await repository.writeBinaryAtomic(cachedPath, transparentContent);

  const newMeta: MascotTransparentCacheMeta = {
    source_filename: filename,
    source_size: sourceAsset.size,
    source_modified_at: sourceAsset.modified_at,
    source_hash: sourceHash,
    cached_at: new Date().toISOString(),
  };
  await repository.writeJsonAtomic(metaPath, newMeta);

  return {
    absolutePath: cachedPath,
    cached: false,
    meta: newMeta,
  };
}
