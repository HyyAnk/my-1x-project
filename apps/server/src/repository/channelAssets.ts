import { mkdir, readFile, rm } from "node:fs/promises";
import path from "node:path";
import {
  ChannelAssetManifestSchema,
  SocialAssetKindSchema,
  SocialPlatformSchema,
  makeId,
  nowIso,
  type BrandAssetItem,
  type ChannelAssetManifest,
  type SocialArtAsset,
  type SocialAssetKind,
  type SocialPlatform,
} from "@studio/shared";
import { RepositoryError } from "./errors.js";
import type { RepositoryRuntime } from "./runtime.js";
import { extractDimensions, queueChannelAssetOperation, sanitizeFilename } from "./channelAssetsHelpers.js";

export async function ensureChannelAssetDirs(this: RepositoryRuntime, channelSlug: string): Promise<void> {
  const safeSlug = this.assertSlug(channelSlug);
  const channelDir = this.resolvePath("channels", safeSlug);
  const assetsDir = path.join(channelDir, "assets");
  await Promise.all([
    mkdir(path.join(assetsDir, "brand"), { recursive: true }),
    mkdir(path.join(assetsDir, "social", "youtube"), { recursive: true }),
    mkdir(path.join(assetsDir, "social", "x"), { recursive: true }),
    mkdir(path.join(assetsDir, "social", "facebook"), { recursive: true }),
    mkdir(path.join(assetsDir, "social", "tiktok"), { recursive: true }),
    mkdir(path.join(assetsDir, "art"), { recursive: true }),
  ]);
}

export async function getChannelAssetManifest(this: RepositoryRuntime, channelSlug: string): Promise<ChannelAssetManifest> {
  const safeSlug = this.assertSlug(channelSlug);
  const manifestPath = path.join(this.resolvePath("channels", safeSlug), "assets", "manifest.json");
  try {
    const content = await readFile(manifestPath, "utf8");
    return ChannelAssetManifestSchema.parse(JSON.parse(content));
  } catch (err: unknown) {
    const error = err as NodeJS.ErrnoException;
    if (error && error.code === "ENOENT") {
      await ensureChannelAssetDirs.call(this, safeSlug);
      const initial: ChannelAssetManifest = {
        version: 1,
        updated_at: nowIso(),
        brand: {},
        social: {
          youtube: {},
          x: {},
          facebook: {},
          tiktok: {},
        },
        art: [],
      };
      await this.writeJsonAtomic(manifestPath, initial);
      return initial;
    }
    throw error;
  }
}

export async function saveChannelAssetManifest(
  this: RepositoryRuntime,
  channelSlug: string,
  manifest: ChannelAssetManifest,
): Promise<void> {
  const safeSlug = this.assertSlug(channelSlug);
  const validated = ChannelAssetManifestSchema.parse({
    ...manifest,
    updated_at: nowIso(),
  });
  const manifestPath = path.join(this.resolvePath("channels", safeSlug), "assets", "manifest.json");
  await this.writeJsonAtomic(manifestPath, validated);
}

export async function storeBrandLogo(
  this: RepositoryRuntime,
  channelSlug: string,
  buffer: Buffer,
  mimeType: string,
  filename: string,
): Promise<BrandAssetItem> {
  const safeSlug = this.assertSlug(channelSlug);
  return queueChannelAssetOperation(safeSlug, async () => {
    await ensureChannelAssetDirs.call(this, safeSlug);
    const { width, height } = await extractDimensions(buffer);
    const assetId = makeId("logo");
    const safeName = sanitizeFilename(filename, "logo.png");
    const storedFilename = `${assetId}_${safeName}`;
    const relativePath = `channels/${safeSlug}/assets/brand/${storedFilename}`;
    const targetPath = path.join(this.resolvePath("channels", safeSlug), "assets", "brand", storedFilename);
    await this.writeBinaryAtomic(targetPath, buffer);

    const manifest = await getChannelAssetManifest.call(this, safeSlug);
    if (manifest.brand?.logo) {
      await rm(path.join(this.storageRoot, manifest.brand.logo.relative_path), { force: true }).catch(() => {});
    }

    const item: BrandAssetItem = {
      id: assetId,
      filename: safeName,
      relative_path: relativePath,
      mime_type: mimeType,
      size_bytes: buffer.byteLength,
      width,
      height,
      created_at: nowIso(),
      updated_at: nowIso(),
    };

    manifest.brand = { ...manifest.brand, logo: item };
    await saveChannelAssetManifest.call(this, safeSlug, manifest);
    return item;
  });
}

export async function deleteBrandLogo(this: RepositoryRuntime, channelSlug: string): Promise<void> {
  const safeSlug = this.assertSlug(channelSlug);
  return queueChannelAssetOperation(safeSlug, async () => {
    const manifest = await getChannelAssetManifest.call(this, safeSlug);
    if (manifest.brand?.logo) {
      await rm(path.join(this.storageRoot, manifest.brand.logo.relative_path), { force: true }).catch(() => {});
      delete manifest.brand.logo;
      await saveChannelAssetManifest.call(this, safeSlug, manifest);
    }
  });
}

export async function storeSocialAsset(
  this: RepositoryRuntime,
  channelSlug: string,
  platform: SocialPlatform,
  kind: SocialAssetKind,
  buffer: Buffer,
  mimeType: string,
  filename: string,
): Promise<BrandAssetItem> {
  const safeSlug = this.assertSlug(channelSlug);
  const safePlatform = SocialPlatformSchema.parse(platform);
  const safeKind = SocialAssetKindSchema.parse(kind);

  return queueChannelAssetOperation(safeSlug, async () => {
    await ensureChannelAssetDirs.call(this, safeSlug);
    const { width, height } = await extractDimensions(buffer);
    const assetId = makeId("soc");
    const safeName = sanitizeFilename(filename, `${safePlatform}_${safeKind}.png`);
    const storedFilename = `${assetId}_${safeName}`;
    const relativePath = `channels/${safeSlug}/assets/social/${safePlatform}/${storedFilename}`;
    const targetPath = path.join(
      this.resolvePath("channels", safeSlug),
      "assets",
      "social",
      safePlatform,
      storedFilename,
    );
    await this.writeBinaryAtomic(targetPath, buffer);

    const manifest = await getChannelAssetManifest.call(this, safeSlug);
    const existing = manifest.social?.[safePlatform]?.[safeKind];
    if (existing) {
      await rm(path.join(this.storageRoot, existing.relative_path), { force: true }).catch(() => {});
    }

    const item: BrandAssetItem = {
      id: assetId,
      filename: safeName,
      relative_path: relativePath,
      mime_type: mimeType,
      size_bytes: buffer.byteLength,
      width,
      height,
      created_at: nowIso(),
      updated_at: nowIso(),
    };

    manifest.social[safePlatform] = {
      ...manifest.social[safePlatform],
      [safeKind]: item,
    };
    await saveChannelAssetManifest.call(this, safeSlug, manifest);
    return item;
  });
}

export async function deleteSocialAsset(
  this: RepositoryRuntime,
  channelSlug: string,
  platform: SocialPlatform,
  kind: SocialAssetKind,
): Promise<void> {
  const safeSlug = this.assertSlug(channelSlug);
  const safePlatform = SocialPlatformSchema.parse(platform);
  const safeKind = SocialAssetKindSchema.parse(kind);

  return queueChannelAssetOperation(safeSlug, async () => {
    const manifest = await getChannelAssetManifest.call(this, safeSlug);
    const platformAssets = manifest.social?.[safePlatform];
    const target = platformAssets?.[safeKind];
    if (target && platformAssets) {
      await rm(path.join(this.storageRoot, target.relative_path), { force: true }).catch(() => {});
      delete platformAssets[safeKind];
      await saveChannelAssetManifest.call(this, safeSlug, manifest);
    }
  });
}

export async function storeSocialArt(
  this: RepositoryRuntime,
  channelSlug: string,
  buffer: Buffer,
  mimeType: string,
  filename: string,
  caption?: string,
): Promise<SocialArtAsset> {
  const safeSlug = this.assertSlug(channelSlug);

  return queueChannelAssetOperation(safeSlug, async () => {
    await ensureChannelAssetDirs.call(this, safeSlug);
    const { width, height } = await extractDimensions(buffer);
    const assetId = makeId("art");
    const safeName = sanitizeFilename(filename, "art.png");
    const storedFilename = `${assetId}_${safeName}`;
    const relativePath = `channels/${safeSlug}/assets/art/${storedFilename}`;
    const targetPath = path.join(this.resolvePath("channels", safeSlug), "assets", "art", storedFilename);
    await this.writeBinaryAtomic(targetPath, buffer);

    const item: SocialArtAsset = {
      id: assetId,
      filename: safeName,
      relative_path: relativePath,
      mime_type: mimeType,
      size_bytes: buffer.byteLength,
      width,
      height,
      created_at: nowIso(),
      updated_at: nowIso(),
      tags: [],
      ...(caption ? { caption } : {}),
    };

    const manifest = await getChannelAssetManifest.call(this, safeSlug);
    manifest.art = [...(manifest.art || []), item];
    await saveChannelAssetManifest.call(this, safeSlug, manifest);
    return item;
  });
}

export async function deleteSocialArt(this: RepositoryRuntime, channelSlug: string, assetId: string): Promise<void> {
  const safeSlug = this.assertSlug(channelSlug);

  return queueChannelAssetOperation(safeSlug, async () => {
    const manifest = await getChannelAssetManifest.call(this, safeSlug);
    const index = (manifest.art || []).findIndex((item) => item.id === assetId);
    if (index === -1) {
      throw new RepositoryError(`Social art asset not found: ${assetId}`, "ASSET_NOT_FOUND");
    }

    const target = manifest.art[index];
    await rm(path.join(this.storageRoot, target.relative_path), { force: true }).catch(() => {});
    manifest.art.splice(index, 1);
    await saveChannelAssetManifest.call(this, safeSlug, manifest);
  });
}
