import { open } from "node:fs/promises";
import path from "node:path";

export const EXTENSION_MIME_MAP: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".svgz": "image/svg+xml",
  ".gif": "image/gif",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".wav": "audio/wav",
  ".mp3": "audio/mpeg",
  ".json": "application/json",
  ".zip": "application/zip",
};

const TYPES_NEEDING_VERIFICATION = new Set([".png", ".jpg", ".jpeg", ".webp", ".svg", ".svgz"]);

export function isPng(bytes: Uint8Array): boolean {
  return (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  );
}

export function isJpeg(bytes: Uint8Array): boolean {
  return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
}

export function isGif(bytes: Uint8Array): boolean {
  return (
    bytes.length >= 6 &&
    bytes[0] === 0x47 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x38 &&
    (bytes[4] === 0x37 || bytes[4] === 0x39) &&
    bytes[5] === 0x61
  );
}

export function isWebP(bytes: Uint8Array): boolean {
  return (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  );
}

export function isWav(bytes: Uint8Array): boolean {
  return (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x41 &&
    bytes[10] === 0x56 &&
    bytes[11] === 0x45
  );
}

export function isMp4(bytes: Uint8Array): boolean {
  return bytes.length >= 8 && bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70;
}

export function isSvg(bytes: Uint8Array): boolean {
  if (bytes.length < 4) return false;
  let offset = 0;
  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    offset = 3;
  }
  const slice = bytes.subarray(offset, Math.min(bytes.length, offset + 64));
  const text = Buffer.from(slice).toString("utf8").trimStart().toLowerCase();
  return text.startsWith("<svg") || text.startsWith("<?xml") || text.startsWith("<!doctype svg");
}

export function detectMimeTypeFromMagicBytes(bytes: Uint8Array): string | undefined {
  if (isPng(bytes)) return "image/png";
  if (isJpeg(bytes)) return "image/jpeg";
  if (isWebP(bytes)) return "image/webp";
  if (isGif(bytes)) return "image/gif";
  if (isSvg(bytes)) return "image/svg+xml";
  if (isMp4(bytes)) return "video/mp4";
  if (isWav(bytes)) return "audio/wav";
  return undefined;
}

export function getMimeTypeFromExtension(filename: string): string | undefined {
  const ext = path.extname(filename).toLowerCase();
  return EXTENSION_MIME_MAP[ext];
}

export function resolveMimeFromBuffer(bytes: Uint8Array, fallbackFilename?: string): string {
  const magic = detectMimeTypeFromMagicBytes(bytes);
  if (magic) return magic;
  if (fallbackFilename) {
    const extMime = getMimeTypeFromExtension(fallbackFilename);
    if (extMime) return extMime;
  }
  return "application/octet-stream";
}

export async function readHeaderBytes(filePath: string, maxBytes = 64): Promise<Buffer> {
  const handle = await open(filePath, "r");
  try {
    const buf = Buffer.alloc(maxBytes);
    const { bytesRead } = await handle.read(buf, 0, maxBytes, 0);
    return buf.subarray(0, bytesRead);
  } finally {
    await handle.close();
  }
}

export async function resolveMediaMimeType(filePath: string, filename?: string): Promise<string> {
  const name = filename || path.basename(filePath);
  const ext = path.extname(name).toLowerCase();
  const extMime = EXTENSION_MIME_MAP[ext];

  const needsVerification = !extMime || TYPES_NEEDING_VERIFICATION.has(ext);

  if (needsVerification) {
    try {
      const header = await readHeaderBytes(filePath, 64);
      const magicMime = detectMimeTypeFromMagicBytes(header);
      if (magicMime) {
        return magicMime;
      }
    } catch {
      // Fallback to extension if file cannot be read
    }
  }

  return extMime || "application/octet-stream";
}

export function generateAssetETag(size: number, modifiedAt: string | Date): string {
  const mtimeMs = typeof modifiedAt === "string" ? Date.parse(modifiedAt) || 0 : modifiedAt.getTime();
  return `W/"${size}-${mtimeMs}"`;
}

export function isAssetNotModified(
  headers: { "if-none-match"?: string; "if-modified-since"?: string },
  etag: string,
  modifiedAt: string | Date,
): boolean {
  const ifNoneMatch = headers["if-none-match"];
  if (ifNoneMatch) {
    const candidates = ifNoneMatch.split(",").map((s) => s.trim());
    const rawEtag = etag.replace(/^W\//, "");
    return candidates.some((c) => c === "*" || c === etag || c.replace(/^W\//, "") === rawEtag);
  }

  const ifModifiedSince = headers["if-modified-since"];
  if (ifModifiedSince) {
    const ifModifiedSinceTime = Date.parse(ifModifiedSince);
    const fileModifiedTime = typeof modifiedAt === "string" ? Date.parse(modifiedAt) || 0 : modifiedAt.getTime();
    if (!Number.isNaN(ifModifiedSinceTime) && !Number.isNaN(fileModifiedTime)) {
      return Math.floor(fileModifiedTime / 1000) <= Math.floor(ifModifiedSinceTime / 1000);
    }
  }

  return false;
}
