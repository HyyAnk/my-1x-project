import { createHash } from "node:crypto";

export function renderSourceFingerprint(
  html: string,
  narrationModifiedAt: string,
  narrationSize: number,
  assets: Array<{ asset_id: string; fingerprint: string; path: string; renderIdentity?: string }>,
  dependencies: string[] = [],
  compositionFiles: Record<string, string> = {},
): string {
  return createHash("sha256")
    .update(
      JSON.stringify({
        version: "quiz-render-v5",
        html,
        narrationModifiedAt,
        narrationSize,
        assets: assets.map((asset) => ({
          asset_id: asset.asset_id,
          fingerprint: asset.fingerprint,
          path: asset.path,
          renderIdentity: asset.renderIdentity,
        })),
        dependencies,
        compositionFiles: Object.keys(compositionFiles)
          .sort()
          .map((relativePath) => ({ path: relativePath, content: compositionFiles[relativePath] })),
      }),
    )
    .digest("hex");
}

export function soundtrackFingerprint(
  narrationModifiedAt: string,
  narrationSize: number,
  timelineEvents: Array<{ type: string; at_seconds: number; payload?: unknown }>,
  bgmTrackId: string | null | undefined,
  bgmHistoryIds: string[] = [],
  options?: {
    ducking?: boolean;
    loudnorm?: boolean;
    targetLufs?: number;
  },
): string {
  return createHash("sha256")
    .update(
      JSON.stringify({
        version: "master-soundtrack-v2-mastered",
        narrationModifiedAt,
        narrationSize,
        timelineEvents: timelineEvents.map((e) => ({ type: e.type, at: Math.round(e.at_seconds * 1000), payload: e.payload })),
        bgmTrackId: bgmTrackId ?? null,
        bgmHistoryIds,
        options: {
          ducking: options?.ducking ?? true,
          loudnorm: options?.loudnorm ?? true,
          targetLufs: options?.targetLufs ?? -14,
        },
      }),
    )
    .digest("hex");
}
