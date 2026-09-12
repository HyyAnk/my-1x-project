import type { BgmTrack, ResolveBgmOptions } from "./bgmRegistry.js";

export function hashStringToSeed(input?: string | number): number {
  if (typeof input === "number") return Math.abs(Math.floor(input));
  if (!input) return 0;
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash);
}

export function rankCandidatesByRecency(candidates: BgmTrack[], recent: string[]): BgmTrack[] {
  if (recent.length === 0) return candidates;

  let maxDistance = -1;
  const scored = candidates.map((track) => {
    const idx = recent.indexOf(track.id);
    const distance = idx === -1 ? Number.POSITIVE_INFINITY : idx;
    if (distance > maxDistance) {
      maxDistance = distance;
    }
    return { track, distance };
  });

  return scored.filter((item) => item.distance === maxDistance).map((item) => item.track);
}

export function selectCandidateTrack(candidates: BgmTrack[], options?: ResolveBgmOptions): BgmTrack | null {
  if (candidates.length === 0) return null;

  if (options?.trackId) {
    const explicit = candidates.find((t) => t.id === options.trackId || t.filename === options.trackId);
    if (explicit) return explicit;
  }

  const seedNumber = hashStringToSeed(options?.seed);
  const recent = options?.recentTrackIds ?? [];
  const bestPool = rankCandidatesByRecency(candidates, recent);

  return bestPool[seedNumber % bestPool.length];
}
