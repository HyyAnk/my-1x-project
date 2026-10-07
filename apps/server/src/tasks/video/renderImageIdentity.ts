import { createHash } from "node:crypto";

export interface RenderImageIdentityInput {
  sourceFingerprint: string;
  targetBounds: {
    width: number;
    height: number;
  };
  fit: "cover" | "contain" | "inside";
  quality: number;
  format?: string;
  optimizerVersion?: number;
}

/**
 * Pure function producing a stable string key from source content/fingerprint,
 * recommended output bounds, fit, quality, format, and optimizer version.
 */
export function createRenderImageIdentity(input: RenderImageIdentityInput): string {
  const optimizerVersion = input.optimizerVersion ?? 2;
  return createHash("sha256")
    .update(
      JSON.stringify({
        version: `render-image-opt-v${optimizerVersion}`,
        sourceFingerprint: input.sourceFingerprint,
        targetBounds: {
          width: Math.round(input.targetBounds.width),
          height: Math.round(input.targetBounds.height),
        },
        fit: input.fit,
        quality: Math.round(input.quality),
        format: input.format ?? "original",
      }),
    )
    .digest("hex");
}
