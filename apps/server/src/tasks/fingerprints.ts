import { createHash } from "node:crypto";
import type { AppConfig } from "@studio/shared";

export function narrationSegmentFingerprint(
  text: string,
  voice: string,
  scriptModifiedAt: string,
  audioConfig: AppConfig["audio_generation"],
  narrationWordsPerSecond: number,
): string {
  return createHash("sha256")
    .update(
      JSON.stringify({
        version: "narration-segment-v2",
        text: text.trim().replace(/\s+/g, " "),
        voice,
        scriptModifiedAt,
        narrationWordsPerSecond,
        audio: {
          provider: audioConfig.provider,
          service_url: audioConfig.service_url,
          exaggeration: audioConfig.exaggeration,
          cfg_weight: audioConfig.cfg_weight,
          match_target_duration: audioConfig.match_target_duration,
        },
      }),
    )
    .digest("hex");
}

export function renderSourceFingerprint(
  html: string,
  narrationModifiedAt: string,
  narrationSize: number,
  assets: Array<{ asset_id: string; fingerprint: string; path: string }>,
  dependencies: string[] = [],
): string {
  return createHash("sha256")
    .update(
      JSON.stringify({
        version: "quiz-render-v4",
        html,
        narrationModifiedAt,
        narrationSize,
        assets: assets.map((asset) => ({ asset_id: asset.asset_id, fingerprint: asset.fingerprint, path: asset.path })),
        dependencies,
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
