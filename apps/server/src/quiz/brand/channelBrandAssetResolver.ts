import { copyFile, mkdir, stat } from "node:fs/promises";
import path from "node:path";
import type { Channel, ChannelAssetManifest } from "@studio/shared";
import type { RepositoryRoots, RepositoryService } from "../../repository.js";

export interface ResolvedChannelBrandIdentity {
  channelName: string;
  hasCustomLogo: boolean;
  logoRelativeUrl?: string;
  logoSourcePath?: string;
  logoMimeType?: string;
  logoWidth?: number;
  logoHeight?: number;
  fallbackInitial: string;
}

/**
 * Extracts a robust uppercase fallback initial from channel display name.
 */
export function extractChannelInitial(channelName?: string | null): string {
  const trimmed = channelName?.trim();
  if (!trimmed) return "★";
  const firstChar = Array.from(trimmed)[0];
  return firstChar ? firstChar.toUpperCase() : "★";
}

/**
 * Resolves channel brand identity, detecting uploaded brand logo or social avatar,
 * copying asset to render workspace if provided, or falling back gracefully to lettermark.
 */
export async function resolveChannelBrandIdentity(options: {
  channel: Channel;
  repository: RepositoryService;
  renderRoot?: string;
}): Promise<ResolvedChannelBrandIdentity> {
  const { channel, repository, renderRoot } = options;
  const channelName = channel.display_name?.trim() || channel.slug || "Channel";
  const fallbackInitial = extractChannelInitial(channelName);

  let manifest: ChannelAssetManifest | null;
  try {
    manifest = await repository.getChannelAssetManifest(channel.slug);
  } catch {
    manifest = null;
  }

  const logoItem = manifest?.brand?.logo ?? manifest?.social?.youtube?.avatar;

  if (!logoItem?.relative_path) {
    return {
      channelName,
      hasCustomLogo: false,
      fallbackInitial,
    };
  }

  let absoluteSourcePath: string | null = null;
  try {
    if (path.isAbsolute(logoItem.relative_path)) {
      absoluteSourcePath = logoItem.relative_path;
    } else if (typeof repository.resolveContextPath === "function") {
      absoluteSourcePath = repository.resolveContextPath(logoItem.relative_path);
    } else if (typeof repository.resolvePath === "function") {
      const normalized = logoItem.relative_path.replaceAll("\\", "/").replace(/^\/+/, "");
      const segments = normalized.split("/");
      const rootKey = segments[0] as keyof RepositoryRoots;
      if (repository.roots && rootKey in repository.roots) {
        absoluteSourcePath = repository.resolvePath(rootKey, ...segments.slice(1));
      } else {
        absoluteSourcePath = (repository.resolvePath as unknown as (...args: string[]) => string)(logoItem.relative_path);
      }
    }
  } catch {
    absoluteSourcePath = null;
  }

  if (!absoluteSourcePath) {
    return {
      channelName,
      hasCustomLogo: false,
      fallbackInitial,
    };
  }

  try {
    const fileStat = await stat(absoluteSourcePath);
    if (!fileStat.isFile() || fileStat.size === 0) {
      return {
        channelName,
        hasCustomLogo: false,
        fallbackInitial,
      };
    }
  } catch {
    return {
      channelName,
      hasCustomLogo: false,
      fallbackInitial,
    };
  }

  const logoBasename = path.basename(logoItem.relative_path);
  let logoRelativeUrl = `./brand/${logoBasename}`;

  if (renderRoot) {
    const brandDir = path.join(renderRoot, "brand");
    await mkdir(brandDir, { recursive: true });
    const targetPath = path.join(brandDir, logoBasename);
    try {
      await copyFile(absoluteSourcePath, targetPath);
      logoRelativeUrl = `./brand/${logoBasename}`;
    } catch {
      logoRelativeUrl = logoItem.url || `./brand/${logoBasename}`;
    }
  }

  return {
    channelName,
    hasCustomLogo: true,
    logoRelativeUrl,
    logoSourcePath: absoluteSourcePath,
    logoMimeType: logoItem.mime_type,
    logoWidth: logoItem.width,
    logoHeight: logoItem.height,
    fallbackInitial,
  };
}
