import fs from "node:fs";
import path from "node:path";
import { defaultBgmRegistry, type BgmRegistry, type ResolveBgmOptions } from "./bgmRegistry.js";

export interface BgmScheduleItem {
  id: string;
  trackId: string;
  filename: string;
  filePath: string;
  startSeconds: number;
  durationSeconds: number;
  volume: number;
  fadeInSeconds: number;
  fadeOutSeconds: number;
}

export function defaultBgmCandidateDirectories(): string[] {
  return [
    path.resolve(process.cwd(), "assets/audio/bgm/tracks"),
    path.resolve(process.cwd(), "assets/audio/bgm"),
    path.resolve(process.cwd(), "../assets/audio/bgm/tracks"),
    path.resolve(process.cwd(), "../assets/audio/bgm"),
    path.resolve(process.cwd(), "../../assets/audio/bgm/tracks"),
    path.resolve(process.cwd(), "../../assets/audio/bgm"),
  ];
}

export function resolveBgmCandidatePath(
  filename: string,
  candidateDirs: string[] = defaultBgmCandidateDirectories(),
  assets?: Record<string, string>,
  trackId?: string,
): string | null {
  if (trackId && assets?.[`bgm:${trackId}`]) return assets[`bgm:${trackId}`];
  if (assets?.[filename]) return assets[filename];

  for (const dir of candidateDirs) {
    const directProbe = path.join(dir, filename);
    if (fs.existsSync(directProbe)) return directProbe;
    const tracksProbe = path.join(dir, "tracks", filename);
    if (fs.existsSync(tracksProbe)) return tracksProbe;
  }
  return null;
}

export function resolveBgmScheduleItems(
  durationSeconds: number,
  candidateDirs: string[] = defaultBgmCandidateDirectories(),
  options?: ResolveBgmOptions,
  bgmRegistry?: BgmRegistry,
  outroStartSeconds?: number,
): BgmScheduleItem[] {
  const registry = bgmRegistry ?? defaultBgmRegistry;
  const schedule = registry.resolveBgmSchedule(durationSeconds, options);
  const totalClips = schedule.length;

  const items: BgmScheduleItem[] = [];

  for (const [index, placement] of schedule.entries()) {
    const isFirstClip = index === 0;
    const isFinalClip = index === totalClips - 1;
    const clipStart = placement.startSeconds;
    const clipDuration = placement.durationSeconds;

    const resolvedPath = resolveBgmCandidatePath(placement.filename, candidateDirs, options?.assets, placement.trackId);
    if (!resolvedPath) continue;

    let fadeInDur = isFirstClip ? Math.min(0.5, clipDuration * 0.2) : Math.min(0.6, clipDuration * 0.2);
    if (fadeInDur <= 0.05) fadeInDur = 0;

    let fadeOutDur = 0.6;
    if (isFinalClip) {
      let fadeOutSeconds = 2.5;
      if (typeof outroStartSeconds === "number" && outroStartSeconds > clipStart && outroStartSeconds < durationSeconds - 0.5) {
        const outroDur = durationSeconds - outroStartSeconds;
        fadeOutSeconds = Math.max(2.0, Math.min(4.0, outroDur));
      }
      fadeOutSeconds = Math.min(fadeOutSeconds, clipDuration * 0.5);
      fadeOutDur = fadeOutSeconds;
    } else {
      fadeOutDur = Math.min(0.6, clipDuration * 0.2);
    }

    items.push({
      id: placement.id,
      trackId: placement.trackId,
      filename: placement.filename,
      filePath: resolvedPath,
      startSeconds: Number(clipStart.toFixed(3)),
      durationSeconds: Number(clipDuration.toFixed(3)),
      volume: placement.volume,
      fadeInSeconds: Number(fadeInDur.toFixed(3)),
      fadeOutSeconds: Number(fadeOutDur.toFixed(3)),
    });
  }

  return items;
}
