import fs from "node:fs";
import path from "node:path";
import type { QuizTimeline } from "@studio/shared";
import { DEFAULT_SFX_MAP } from "./sfxRegistry.js";
import { isBridgeStingerTransition } from "../bridge/bridgeTransitionIds.js";

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

export function resolveSfxCandidatePath(filename: string, candidateDirs: string[], assets?: Record<string, string>): string | null {
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

function resolveCountdownSfx(val: unknown) {
  const isFinalTick = val === 1;
  const intent = isFinalTick ? "countdown_final" : "countdown_tick";
  if (typeof val === "number" && val >= 1 && val <= 5) {
    const filename = val === 1 ? "countdown_1.wav" : `countdown_${val}.wav`;
    const dur = val === 1 ? 0.35 : val === 2 ? 0.09 : 0.08;
    const vol = val === 1 ? 0.6 : val === 2 ? 0.5 : val === 3 ? 0.48 : 0.45;
    return { intent, filename, dur, vol };
  }
  const filename = isFinalTick ? "countdown_final.wav" : "countdown_tick.wav";
  const dur = isFinalTick ? 0.35 : 0.08;
  const vol = isFinalTick ? 0.6 : 0.45;
  return { intent, filename, dur, vol };
}

type TimelineEvent = QuizTimeline["events"][number];

interface EventSfxConfig {
  intent: string;
  filename: string;
  dur: number;
  vol: number;
}

const SFX_PLAY_INTENT_FILES: ReadonlyArray<{ intents: readonly string[]; filename: string; fallbackDur: number }> = [
  { intents: ["transition_fast", "whoosh"], filename: "lightning_brush.wav", fallbackDur: 0.65 },
  { intents: ["transition_soft", "splash"], filename: "bubble_splash.wav", fallbackDur: 0.65 },
  { intents: ["correct_small", "ding", "sparkle"], filename: "correct_ding.wav", fallbackDur: 0.55 },
  { intents: ["correct_big", "triumph"], filename: "correct_triumph.wav", fallbackDur: 1.2 },
  { intents: ["streak", "score_gain"], filename: "streak.wav", fallbackDur: 0.8 },
];

function resolveRewardSfx(event: TimelineEvent): EventSfxConfig {
  const isBig = event.payload?.intensity === "big";
  return {
    intent: isBig ? "correct_big" : "correct_small",
    filename: isBig ? "correct_triumph.wav" : "correct_ding.wav",
    dur: isBig ? 1.5 : 1.1,
    vol: 0.75,
  };
}

function resolveTransitionSfx(event: TimelineEvent): EventSfxConfig | null {
  if (isBridgeStingerTransition(event)) {
    return null;
  }
  const isLightning = event.payload?.intent === "zoom" || event.payload?.intent === "lightning";
  return {
    intent: isLightning ? "transition_fast" : "transition_soft",
    filename: isLightning ? "lightning_brush.wav" : "bubble_splash.wav",
    dur: isLightning ? 0.7 : 0.65,
    vol: 0.6,
  };
}

function resolveSfxPlayConfig(event: TimelineEvent): EventSfxConfig {
  const soundIntent = (event.payload?.sound as string) || (event.payload?.name as string) || "ui_pop";
  const baseDur = event.duration_seconds || 0.35;
  const vol = typeof event.payload?.volume === "number" ? event.payload.volume : 0.6;
  const match = SFX_PLAY_INTENT_FILES.find((entry) => entry.intents.includes(soundIntent));
  return {
    intent: soundIntent,
    filename: match ? match.filename : "ui_pop.wav",
    dur: match ? baseDur || match.fallbackDur : baseDur,
    vol,
  };
}

function resolveEventSfxConfig(event: TimelineEvent): EventSfxConfig | null {
  switch (event.type) {
    case "choices.enter":
      return { intent: "ui_pop", filename: "ui_pop.wav", dur: 0.12, vol: 0.55 };
    case "countdown.tick":
      return resolveCountdownSfx(event.payload?.value);
    case "reward.play":
      return resolveRewardSfx(event);
    case "transition.start":
      return resolveTransitionSfx(event);
    case "sfx.play":
      return resolveSfxPlayConfig(event);
    default:
      return null;
  }
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

    const config = resolveEventSfxConfig(event);
    if (config) {
      const resolvedPath = resolveSfxCandidatePath(config.filename, candidateDirs, assets);
      if (resolvedPath) {
        rawClips.push({
          id,
          intent: config.intent,
          filename: config.filename,
          filePath: resolvedPath,
          start: event.at_seconds,
          duration: config.dur,
          volume: config.vol,
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
