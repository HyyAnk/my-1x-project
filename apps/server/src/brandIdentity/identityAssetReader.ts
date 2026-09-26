import { createHash } from "node:crypto";
import { readFile, realpath, stat } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import type { IdentityRepository } from "./identityExport.types.js";

const MAX_FILE_BYTES = 32 * 1024 * 1024;

export async function readIdentityFile(filename: string): Promise<Buffer> {
  const metadata = await stat(filename);
  if (!metadata.isFile() || metadata.size > MAX_FILE_BYTES) throw new Error("Asset is missing or exceeds 32 MB.");
  return readFile(filename);
}

export async function readIdentityLogo(root: string, slug: string, relative: string): Promise<Buffer> {
  const expected = await realpath(path.join(root, "channels", slug, "assets", "brand"));
  const target = await realpath(path.resolve(root, relative));
  const child = path.relative(expected, target);
  if (child.startsWith("..") || path.isAbsolute(child)) throw new Error("Invalid logo path.");
  return readIdentityFile(target);
}

async function transparentPng(bytes: Buffer): Promise<Buffer | null> {
  const image = sharp(bytes, { limitInputPixels: 40_000_000 });
  const metadata = await image.metadata();
  if (!metadata.hasAlpha) return null;
  const stats = await image.stats();
  if (stats.isOpaque) return null;
  return image.png().toBuffer();
}

export async function readIdentityMascot(repository: IdentityRepository, mascotId: string, url: string): Promise<Buffer> {
  const prefix = `/api/mascots/${encodeURIComponent(mascotId)}/assets/`;
  if (!url.startsWith(prefix)) throw new Error("The style does not reference a local image.");
  const filename = decodeURIComponent(url.slice(prefix.length).split("?")[0]);
  if (!filename || filename === "." || filename === ".." || /[\\/:\0]/.test(filename)) throw new Error("Invalid style image path.");
  const source = await repository.getMascotAssetFile(mascotId, filename);
  const bytes = await readIdentityFile(source.absolutePath);
  // The repository can fall back to a raw image; never export it without checking alpha.
  const direct = await transparentPng(bytes);
  if (direct) return direct;
  const cached = await repository.getTransparentMascotAssetFile(mascotId, filename);
  const meta: unknown = JSON.parse(await readFile(`${cached.absolutePath}.meta.json`, "utf8"));
  const hash = createHash("sha256").update(bytes).digest("hex");
  if (!meta || typeof meta !== "object" || !("source_hash" in meta) || meta.source_hash !== hash) {
    throw new Error("The transparent image cache is out of date.");
  }
  const result = await transparentPng(await readIdentityFile(cached.absolutePath));
  if (!result) throw new Error("No background-removed image is available.");
  return result;
}
