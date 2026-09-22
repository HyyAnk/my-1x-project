import { readdir } from "node:fs/promises";
import path from "node:path";
import type {
  BrandAssetItem,
  ChannelAssetManifest,
  SocialPlatform,
} from "@studio/shared";

export function formatAssetFileUrl(channelId: string, relativePath: string): string {
  const normalized = relativePath.replace(/\\/g, "/");
  const assetsMatch = normalized.match(/channels\/[^/]+\/assets\/(.+)$/);
  const subPath = assetsMatch ? assetsMatch[1] : normalized.replace(/^assets\//, "").replace(/^\/+/, "");
  return `/api/channels/${encodeURIComponent(channelId)}/assets/file/${subPath}`;
}

export function attachItemUrl<T extends BrandAssetItem>(channelId: string, item: T): T {
  return {
    ...item,
    url: formatAssetFileUrl(channelId, item.relative_path),
  };
}

export function attachAssetUrls(channelId: string, manifest: ChannelAssetManifest): ChannelAssetManifest {
  const result: ChannelAssetManifest = {
    ...manifest,
    brand: {
      ...manifest.brand,
      ...(manifest.brand?.logo ? { logo: attachItemUrl(channelId, manifest.brand.logo) } : {}),
    },
    social: {},
    art: (manifest.art || []).map((artItem) => attachItemUrl(channelId, artItem)),
  };

  for (const [platform, assets] of Object.entries(manifest.social || {})) {
    result.social[platform as SocialPlatform] = {
      ...(assets?.avatar ? { avatar: attachItemUrl(channelId, assets.avatar) } : {}),
      ...(assets?.banner ? { banner: attachItemUrl(channelId, assets.banner) } : {}),
    };
  }

  return result;
}

export function extractBase64Buffer(
  imageData: string,
  defaultMime = "image/png",
): { buffer: Buffer; mimeType: string } {
  const match = imageData.match(/^data:([^;]+);base64,(.+)$/);
  if (match) {
    return {
      mimeType: match[1],
      buffer: Buffer.from(match[2], "base64"),
    };
  }
  return {
    mimeType: defaultMime,
    buffer: Buffer.from(imageData, "base64"),
  };
}

export async function collectAssetFilesRecursively(
  rootDir: string,
  currentDir = rootDir,
): Promise<Array<{ relativePath: string; absolutePath: string }>> {
  const entries = await readdir(currentDir, { withFileTypes: true }).catch(() => []);
  const files: Array<{ relativePath: string; absolutePath: string }> = [];

  for (const entry of entries) {
    const fullPath = path.join(currentDir, entry.name);
    if (entry.isDirectory()) {
      const subFiles = await collectAssetFilesRecursively(rootDir, fullPath);
      files.push(...subFiles);
    } else if (entry.isFile()) {
      const rel = path.relative(rootDir, fullPath).replace(/\\/g, "/");
      files.push({ relativePath: rel, absolutePath: fullPath });
    }
  }

  return files;
}
