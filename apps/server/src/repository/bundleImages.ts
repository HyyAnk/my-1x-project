import { mkdir, readFile, readdir, rm, stat } from "node:fs/promises";
import path from "node:path";
import { RepositoryError } from "./errors.js";
import { isValidImageBuffer } from "./helpers.js";
import type { RepositoryRuntime } from "./runtime.js";
import type { BundleImageAsset, BundleImageMeta } from "./types.js";

export async function listBundleImages(this: RepositoryRuntime, channelId: string, episodeId: string): Promise<BundleImageAsset[]> {
  const episode = await this.getEpisode(channelId, episodeId);
  const channel = await this.getChannel(channelId);
  const directory = this.resolvePath("channels", channel.slug, "episodes", episode.slug, "assets", "bundles");
  await mkdir(directory, { recursive: true });
  const entries = await readdir(directory, { withFileTypes: true });
  const images: BundleImageAsset[] = [];
  for (const entry of entries.filter((item) => item.isFile())) {
    const match = /^CB-(\d{2,})(-alt)?\.png$/i.exec(entry.name);
    if (!match) continue;
    const absolutePath = this.resolvePath("channels", channel.slug, "episodes", episode.slug, "assets", "bundles", entry.name);
    try {
      const metadata = await stat(absolutePath);
      let meta: BundleImageMeta = {};
      const metaPath = absolutePath.replace(/\.png$/i, ".meta.json");
      try {
        meta = JSON.parse(await readFile(metaPath, "utf8")) as BundleImageMeta;
      } catch {
        // No meta file
      }
      images.push({
        bundle_id: `CB-${String(Number(match[1])).padStart(2, "0")}`,
        bundle_number: Number(match[1]),
        variant: match[2] ? 1 : 0,
        filename: entry.name,
        path: `channels/${channel.slug}/episodes/${episode.slug}/assets/bundles/${entry.name}`,
        absolutePath,
        size: metadata.size,
        modified_at: metadata.mtime.toISOString(),
        price_vnd: meta.price_vnd,
        price_breakdown: meta.price_breakdown,
        model: meta.model,
        aspect_ratio: meta.aspect_ratio,
      });
    } catch {
      // Ignore an image that disappeared during a refresh.
    }
  }
  return images.sort((a, b) => a.bundle_number - b.bundle_number || a.variant - b.variant);
}

export async function getBundleImagePath(
  this: RepositoryRuntime,
  channelId: string,
  episodeId: string,
  bundleNumber: number,
  variant = 0,
): Promise<{ bundle_id: string; filename: string; path: string; absolutePath: string }> {
  const episode = await this.getEpisode(channelId, episodeId);
  const channel = await this.getChannel(channelId);
  const filename = `CB-${String(this.assertBundleNumber(bundleNumber)).padStart(2, "0")}${variant === 1 ? "-alt" : ""}.png`;
  const absolutePath = this.resolvePath("channels", channel.slug, "episodes", episode.slug, "assets", "bundles", filename);
  return {
    bundle_id: `CB-${String(bundleNumber).padStart(2, "0")}`,
    filename,
    path: `channels/${channel.slug}/episodes/${episode.slug}/assets/bundles/${filename}`,
    absolutePath,
  };
}

export async function getBundleImageFile(
  this: RepositoryRuntime,
  channelId: string,
  episodeId: string,
  filename: string,
): Promise<BundleImageAsset> {
  if (!/^CB-\d{2,}(?:-alt)?\.png$/i.test(filename)) throw new RepositoryError("Unsupported image asset", "FILE_NOT_ALLOWED");
  const episode = await this.getEpisode(channelId, episodeId);
  const channel = await this.getChannel(channelId);
  const absolutePath = this.resolvePath("channels", channel.slug, "episodes", episode.slug, "assets", "bundles", filename);
  try {
    await this.assertRealPathInside(path.dirname(absolutePath), absolutePath);
    const metadata = await stat(absolutePath);
    const bundleNumber = Number(/^CB-(\d+)/i.exec(filename)?.[1] ?? 0);
    let meta: BundleImageMeta = {};
    const metaPath = absolutePath.replace(/\.png$/i, ".meta.json");
    try {
      meta = JSON.parse(await readFile(metaPath, "utf8")) as BundleImageMeta;
    } catch {
      // No meta file
    }
    return {
      bundle_id: `CB-${String(bundleNumber).padStart(2, "0")}`,
      bundle_number: bundleNumber,
      variant: /-alt\.png$/i.test(filename) ? 1 : 0,
      filename,
      path: `channels/${channel.slug}/episodes/${episode.slug}/assets/bundles/${filename}`,
      absolutePath,
      size: metadata.size,
      modified_at: metadata.mtime.toISOString(),
      price_vnd: meta.price_vnd,
      price_breakdown: meta.price_breakdown,
      model: meta.model,
      aspect_ratio: meta.aspect_ratio,
      provenance: meta.provenance,
      user_selected: meta.user_selected,
    };
  } catch {
    throw new RepositoryError("Image asset not found", "IMAGE_NOT_FOUND");
  }
}

export async function writeBundleImage(
  this: RepositoryRuntime,
  channelId: string,
  episodeId: string,
  bundleNumber: number,
  content: Uint8Array,
  variant = 0,
  meta?: BundleImageMeta,
): Promise<string> {
  if (!isValidImageBuffer(content)) throw new RepositoryError("Image output is not a valid image file", "INVALID_IMAGE");
  const target = await this.getBundleImagePath(channelId, episodeId, bundleNumber, variant);
  const directory = path.dirname(target.absolutePath);
  const episodeDirectory = path.dirname(directory);
  await mkdir(directory, { recursive: true });
  await this.assertRealPathInside(episodeDirectory, directory);
  await this.writeBinaryAtomic(target.absolutePath, content);
  if (meta) {
    const metaPath = target.absolutePath.replace(/\.png$/i, ".meta.json");
    await this.writeJsonAtomic(metaPath, meta);
  }
  return target.path;
}

export const saveBundleImage = writeBundleImage;

export async function writeBundleImageFromFile(
  this: RepositoryRuntime,
  channelId: string,
  episodeId: string,
  bundleNumber: number,
  sourcePath: string,
  variant = 0,
  meta?: BundleImageMeta,
): Promise<string> {
  const resolvedSource = path.resolve(sourcePath);
  const sourceRoot = [this.rootDirectory, this.storageRoot].find((root) => this.isInside(root, resolvedSource));
  if (!sourceRoot) throw new RepositoryError("Codex image path is outside the studio workspace", "UNSAFE_PATH");
  await this.assertRealPathInside(sourceRoot, resolvedSource);
  return this.writeBundleImage(channelId, episodeId, bundleNumber, await readFile(resolvedSource), variant, meta);
}

export async function clearBundleImages(
  this: RepositoryRuntime,
  channelId: string,
  episodeId: string,
  bundleNumber: number,
): Promise<void> {
  const images = await this.listBundleImages(channelId, episodeId);
  const id = `CB-${String(this.assertBundleNumber(bundleNumber)).padStart(2, "0")}`;
  await Promise.all(
    images
      .filter((image) => image.bundle_id === id)
      .flatMap((image) => [
        rm(image.absolutePath, { force: true }),
        rm(image.absolutePath.replace(/\.png$/i, ".meta.json"), { force: true }),
      ]),
  );
}

export const deleteBundleImage = clearBundleImages;
