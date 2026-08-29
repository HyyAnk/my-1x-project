import { createHash } from "node:crypto";
import { RepositoryError } from "../repository.js";

export type SupportedAspectRatio = "1:1" | "16:9" | "9:16" | "4:3" | "3:4" | "2:3" | "3:2";

export const DEFAULT_BASE_URL = "https://gpti2.store";
export const DEFAULT_MODEL = "gpt-image-2";
export const DEFAULT_SIZE = "1536x1024";
export const DEFAULT_ASPECT_RATIO = "16:9";
export const POLL_INTERVAL_MS = 3_000;
export const MAX_POLL_ATTEMPTS = 60; // Up to 3 minutes for async generation
export const REQUEST_TIMEOUT_MS = 120_000;

export function resolveImageDimensions(
  aspectRatio: string = "16:9",
  model: string = DEFAULT_MODEL,
): { size: string; aspect_ratio: string } {
  const normRatio = (aspectRatio.trim() || "16:9") as SupportedAspectRatio;

  if (model.startsWith("nano-banana")) {
    const validNanoRatios = new Set(["1:1", "16:9", "9:16", "4:3", "3:4", "2:3", "3:2"]);
    const ratio = validNanoRatios.has(normRatio) ? normRatio : "16:9";
    return { aspect_ratio: ratio, size: "2K" };
  }

  // gpt-image-2 exact supported sizes on gpti2.store (quality: low)
  const sizeMap: Record<string, string> = {
    "16:9": "1280x720",
    "9:16": "720x1280",
    "1:1": "1024x1024",
    "4:3": "1024x768",
    "3:4": "768x1024",
    "3:2": "1536x1024",
    "2:3": "1024x1536",
  };

  const size = sizeMap[normRatio] || "1280x720";
  return { size, aspect_ratio: normRatio };
}

export function waitFor(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function generateIdempotencyKey(prefix: string, seed: string): string {
  const hash = createHash("sha256").update(seed).digest("hex").slice(0, 24);
  return `${prefix}_${hash}`;
}

export async function downloadImageUrl(url: string, cancellationSignal?: AbortSignal): Promise<Uint8Array> {
  const signal = cancellationSignal ? AbortSignal.any([cancellationSignal, AbortSignal.timeout(60_000)]) : AbortSignal.timeout(60_000);

  const response = await fetch(url, { signal });
  if (!response.ok) {
    throw new RepositoryError(`Failed to download generated image (${response.status})`, "IMAGE_PROVIDER_FAILED");
  }
  return new Uint8Array(await response.arrayBuffer());
}
