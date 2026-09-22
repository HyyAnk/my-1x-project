import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { access } from "node:fs/promises";
import path from "node:path";
import type { Channel, MascotProfile, MascotStyle } from "@studio/shared";
import type { RepositoryService } from "../repository.js";
import { IntroOutroScriptError } from "./errors.js";

export type ResolvedReference = {
  assetId: string;
  url: string;
  absolutePath: string;
  sha256: string;
  mimeType: "image/png" | "image/jpeg" | "image/webp";
};

export async function resolveMascotReference(
  repository: RepositoryService,
  mascot: MascotProfile,
  style: MascotStyle,
): Promise<ResolvedReference | null> {
  if (!style.anchor_image_url) return null;
  const filename = mascotFilename(mascot.id, style.anchor_image_url);
  const file = await repository.getMascotAssetFile(mascot.id, filename);
  return {
    assetId: `${mascot.id}:${style.id}:${filename}`,
    url: style.anchor_image_url,
    absolutePath: file.absolutePath,
    sha256: await fileSha256(file.absolutePath),
    mimeType: imageMime(file.absolutePath),
  };
}

export async function resolveLogoReference(repository: RepositoryService, channel: Channel): Promise<ResolvedReference | null> {
  const manifest = await repository.getChannelAssetManifest(channel.slug).catch(() => null);
  const logo = manifest?.brand?.logo;
  if (!logo) return null;
  const absolutePath = path.join(repository.storageRoot, logo.relative_path);
  await access(absolutePath);
  const normalized = logo.relative_path.replaceAll("\\", "/");
  const marker = "/assets/";
  const offset = normalized.indexOf(marker);
  const subPath = offset >= 0 ? normalized.slice(offset + marker.length) : normalized;
  return {
    assetId: logo.id,
    url: `/api/channels/${encodeURIComponent(channel.channel_id)}/assets/file/${subPath}`,
    absolutePath,
    sha256: await fileSha256(absolutePath),
    mimeType: imageMime(absolutePath),
  };
}

function imageMime(filePath: string): ResolvedReference["mimeType"] {
  const extension = path.extname(filePath).toLowerCase();
  if (extension === ".png") return "image/png";
  if (extension === ".jpg" || extension === ".jpeg") return "image/jpeg";
  if (extension === ".webp") return "image/webp";
  throw new IntroOutroScriptError("The selected reference must be a PNG, JPEG or WebP image", "SCRIPT_REFERENCE_INVALID");
}

async function fileSha256(filePath: string): Promise<string> {
  const hash = createHash("sha256");
  await new Promise<void>((resolve, reject) => {
    const stream = createReadStream(filePath);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("end", resolve);
    stream.on("error", reject);
  });
  return hash.digest("hex");
}

function mascotFilename(mascotId: string, assetUrl: string): string {
  const pathname = assetUrl.split("?")[0].replaceAll("\\", "/");
  const marker = `/api/mascots/${encodeURIComponent(mascotId)}/assets/`;
  const raw = pathname.startsWith(marker) ? pathname.slice(marker.length) : (pathname.split("/").pop() ?? "");
  const filename = decodeURIComponent(raw);
  if (!filename || filename.includes("/") || filename.includes("\\")) {
    throw new IntroOutroScriptError("The selected mascot style has an invalid reference path", "STYLE_REFERENCE_MISSING");
  }
  return filename;
}
