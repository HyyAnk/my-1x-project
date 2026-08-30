import fs from "node:fs";
import path from "node:path";
import type { QuizTimeline } from "@studio/shared";
import { DEFAULT_SFX_MAP } from "./sfxRegistry.js";

export interface SfxScheduleItem {
  id: string;
  intent: string;
  filename: string;
  filePath: string;
  startSeconds: number;
  durationSeconds: number;
  volume: number;
}

export function defaultSfxCandidateDirectories(): string[] {
  return [
    path.resolve(process.cwd(), "assets/audio/sfx"),
    path.resolve(process.cwd(), "../assets/audio/sfx"),
    path.resolve(process.cwd(), "../../assets/audio/sfx"),
    path.resolve(process.cwd(), "templates/sfx"),
    path.resolve(process.cwd(), "../templates/sfx"),
    path.resolve(process.cwd(), "../../templates/sfx"),
  ];
}

export function resolveSfxCandidatePath(
  filename: string,
  candidateDirs: string[],
  assets?: Record<string, string>,
): string | null {
  const intentKey = filename.replace(/\.wav$/, "");
  if (assets?.[`sfx:${intentKey}`]) return assets[`sfx:${intentKey}`];
  if (assets?.[filename]) return assets[filename];

  const defaultMapped = DEFAULT_SFX_MAP[intentKey as keyof typeof DEFAULT_SFX_MAP];
  const finalFilename = defaultMapped ?? (filename.endsWith(".wav") ? filename : `${filename}.wav`);

  for (const dir of candidateDirs) {
    const probe = path.join(dir, finalFilename);
    if (fs.existsSync(probe)) return probe;
  }
  return null;
}

export function resolveSfxSchedule(
  events: QuizTimeline["events"],
  candidateDirs: string[] = defaultSfxCandidateDirectories(),
  assets?: Record<string, string>,
): SfxScheduleItem[] {
  type SfxRaw = {
    id: string;
    intent: string;
    filename: string;
    filePath: string;
    start: number;
    duration: number;
    volume: number;
  };

  const rawClips: SfxRaw[] = [];

  for (const event of events) {
    const timeMs = Math.round(event.at_seconds * 1000);
    const eventSlug = event.type.replaceAll(".", "-");
    const id = `sfx-${eventSlug}-${timeMs}`;

    let filename = "";
    let dur = 0.12;
    let vol = 0.55;
    let intent = "";

    if (event.type === "choices.enter") {
      intent = "ui_pop";
      filename = "ui_pop.wav";
      dur = 0.12;
      vol = 0.55;
    } else if (event.type === "countdown.tick") {
      const isFinalTick = event.payload?.value === 1;
      intent = isFinalTick ? "countdown_final" : "countdown_tick";
      filename = isFinalTick ? "countdown_final.wav" : "countdown_tick.wav";
      dur = isFinalTick ? 0.35 : 0.08;
      vol = isFinalTick ? 0.6 : 0.45;
    } else if (event.type === "reward.play") {
      const isBig = event.payload?.intensity === "big";
      intent = isBig ? "correct_big" : "correct_small";
      filename = isBig ? "correct_triumph.wav" : "correct_ding.wav";
      dur = isBig ? 1.5 : 1.1;
      vol = 0.75;
    } else if (event.type === "transition.start") {
      const isLightning = event.payload?.intent === "zoom" || event.payload?.intent === "lightning";
      intent = isLightning ? "transition_fast" : "transition_soft";
      filename = isLightning ? "lightning_brush.wav" : "bubble_splash.wav";
      dur = isLightning ? 0.7 : 0.65;
      vol = 0.6;
    }

    if (filename) {
      const resolvedPath = resolveSfxCandidatePath(filename, candidateDirs, assets);
      if (resolvedPath) {
        rawClips.push({
          id,
          intent,
          filename,
          filePath: resolvedPath,
          start: event.at_seconds,
          duration: dur,
          volume: vol,
        });
      }
    }
  }

  // De-duplicate within 40ms and clamp overlaps
  rawClips.sort((a, b) => a.start - b.start);
  const resolved: SfxScheduleItem[] = [];

  for (const current of rawClips) {
    if (resolved.length === 0) {
      resolved.push({
        id: current.id,
        intent: current.intent,
        filename: current.filename,
        filePath: current.filePath,
        startSeconds: Number(current.start.toFixed(3)),
        durationSeconds: Number(current.duration.toFixed(3)),
        volume: current.volume,
      });
      continue;
    }

    const prev = resolved[resolved.length - 1];
    if (current.start <= prev.startSeconds + 0.04) {
      continue;
    }

    if (prev.startSeconds + prev.durationSeconds > current.start) {
      prev.durationSeconds = Number(Math.max(0.04, current.start - prev.startSeconds).toFixed(3));
    }

    resolved.push({
      id: current.id,
      intent: current.intent,
      filename: current.filename,
      filePath: current.filePath,
      startSeconds: Number(current.start.toFixed(3)),
      durationSeconds: Number(current.duration.toFixed(3)),
      volume: current.volume,
    });
  }

  return resolved;
}
