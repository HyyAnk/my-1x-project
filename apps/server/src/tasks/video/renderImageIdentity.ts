import { createHash } from "node:crypto";

export interface RenderImageIdentityInput {
  sourceFingerprint: string;
  targetBounds: {
    width: number;
    height: number;
  };
  fit: "cover" | "contain" | "inside";
  quality: number;
  optimizerVersion?: number;
}

/**
 * Pure function producing a stable string key from source content/fingerprint,
 * recommended output bounds, fit, quality, and optimizer version.
 */
export function createRenderImageIdentity(input: RenderImageIdentityInput): string {
  const optimizerVersion = input.optimizerVersion ?? 1;
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
      }),
    )
    .digest("hex");
}
