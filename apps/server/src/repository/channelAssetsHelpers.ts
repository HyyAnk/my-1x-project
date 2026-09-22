import path from "node:path";
import sharp from "sharp";

const channelAssetQueues = new Map<string, Promise<unknown>>();

export function queueChannelAssetOperation<T>(channelSlug: string, operation: () => Promise<T>): Promise<T> {
  const previous = channelAssetQueues.get(channelSlug) ?? Promise.resolve();
  const current = previous.catch(() => undefined).then(operation);
  channelAssetQueues.set(channelSlug, current);
  return current.finally(() => {
    if (channelAssetQueues.get(channelSlug) === current) {
      channelAssetQueues.delete(channelSlug);
    }
  });
}

export async function extractDimensions(buffer: Buffer): Promise<{ width: number; height: number }> {
  try {
    const meta = await sharp(buffer, { failOn: "none" }).metadata();
    let width = meta.width ?? 0;
    let height = meta.height ?? 0;
    if (typeof meta.orientation === "number" && meta.orientation >= 5 && meta.orientation <= 8) {
      const temp = width;
      width = height;
      height = temp;
    }
    return { width, height };
  } catch {
    return { width: 0, height: 0 };
  }
}

export function sanitizeFilename(filename: string, fallback: string): string {
  const base = path.basename(filename).trim();
  const sanitized = base.replace(/[^a-zA-Z0-9._-]/g, "_");
  return sanitized.length > 0 ? sanitized : fallback;
}
