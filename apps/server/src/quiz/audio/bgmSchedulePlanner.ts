import { pathToFileURL } from "node:url";
import type { BgmPlacement, BgmTrack, ResolveBgmOptions } from "./bgmRegistry.js";
import { DEFAULT_BGM_BASE_VOLUME } from "./bgmRegistry.js";
import { hashStringToSeed, selectCandidateTrack } from "./bgmTrackSelector.js";

export function formatAudioSource(filePathOrUrl: string): string {
  if (/^(data:|https?:|file:)/i.test(filePathOrUrl) || filePathOrUrl.startsWith("./") || filePathOrUrl.startsWith("../")) {
    return filePathOrUrl;
  }
  return pathToFileURL(filePathOrUrl).href;
}

export function resolveTrackAudioSrc(track: BgmTrack, assets?: Record<string, string>): string {
  const customAsset = assets?.[`bgm:${track.id}`] ?? assets?.[track.filename];
  return customAsset ? formatAudioSource(customAsset) : `./bgm/${track.filename}`;
}

export function buildSingleTrackPlacement(
  track: BgmTrack,
  duration: number,
  baseVolume: number,
  assets?: Record<string, string>,
  startSeconds?: number,
): BgmPlacement[] {
  const start = startSeconds ?? 0;
  return [
    {
      id: "bgm-clip-1-0",
      trackId: track.id,
      filename: track.filename,
      src: resolveTrackAudioSrc(track, assets),
      startSeconds: Number(start.toFixed(3)),
      durationSeconds: Number(duration.toFixed(3)),
      volume: baseVolume,
      bpm: track.bpm,
    },
  ];
}

export function sequenceMultipleTracks(
  available: BgmTrack[],
  duration: number,
  baseVolume: number,
  seedNumber: number,
  options?: ResolveBgmOptions,
  startSeconds?: number,
): BgmPlacement[] {
  const placements: BgmPlacement[] = [];
  const start = startSeconds ?? options?.startSeconds ?? 0;
  const end = start + duration;
  let cursor = start;
  let index = 0;
  const usedInSequence: string[] = [...(options?.recentTrackIds ?? [])];

  while (cursor < end - 0.1) {
    const remaining = end - cursor;
    const track =
      selectCandidateTrack(available, {
        ...options,
        recentTrackIds: usedInSequence,
        seed: seedNumber + index,
      }) ?? available[(seedNumber + index) % available.length];

    usedInSequence.unshift(track.id);
    const segmentDuration = Math.min(remaining, track.duration_seconds);

    placements.push({
      id: `bgm-clip-${index + 1}-${Math.round(cursor * 1000)}`,
      trackId: track.id,
      filename: track.filename,
      src: resolveTrackAudioSrc(track, options?.assets),
      startSeconds: Number(cursor.toFixed(3)),
      durationSeconds: Number(segmentDuration.toFixed(3)),
      volume: baseVolume,
      bpm: track.bpm,
    });

    cursor += segmentDuration;
    index += 1;
  }

  return placements;
}

export function planBgmSchedule(
  available: BgmTrack[],
  totalDurationSeconds: number,
  options?: ResolveBgmOptions,
): BgmPlacement[] {
  if (available.length === 0) return [];

  const startSeconds = options?.startSeconds ?? 0;
  let activeDuration = totalDurationSeconds;
  if (
    typeof options?.outroStartSeconds === "number" &&
    options.outroStartSeconds > startSeconds &&
    totalDurationSeconds >= options.outroStartSeconds
  ) {
    activeDuration = options.outroStartSeconds - startSeconds;
  }

  const duration = Math.max(1, activeDuration);
  const baseVolume = options?.baseVolume ?? DEFAULT_BGM_BASE_VOLUME;
  const seedNumber = hashStringToSeed(options?.seed);

  const longEnoughTracks = available.filter((t) => t.duration_seconds >= duration - 1.0);
  if (longEnoughTracks.length > 0) {
    const track = selectCandidateTrack(longEnoughTracks, options)!;
    return buildSingleTrackPlacement(track, duration, baseVolume, options?.assets, startSeconds);
  }

  return sequenceMultipleTracks(available, duration, baseVolume, seedNumber, options, startSeconds);
}
