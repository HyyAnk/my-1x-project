import type { QuizTimeline } from "@studio/shared";
import { isBridgeStingerTransition } from "../../bridge/bridgeTransitionIds.js";

type TimelineEvent = QuizTimeline["events"][number];

export interface CandyArcadeSfxSpec {
  filename: string;
  duration: number;
  volume: string;
}

const SFX_PLAY_INTENT_FILES: ReadonlyArray<{ intents: readonly string[]; filename: string; fallbackDuration: number }> = [
  { intents: ["transition_fast", "whoosh"], filename: "lightning_brush.wav", fallbackDuration: 0.65 },
  { intents: ["transition_soft", "splash"], filename: "bubble_splash.wav", fallbackDuration: 0.65 },
  { intents: ["correct_small", "ding", "sparkle"], filename: "correct_ding.wav", fallbackDuration: 0.55 },
  { intents: ["correct_big", "triumph"], filename: "correct_triumph.wav", fallbackDuration: 1.2 },
  { intents: ["streak", "score_gain"], filename: "streak.wav", fallbackDuration: 0.8 },
];

function resolveCountdownSfx(val: unknown): CandyArcadeSfxSpec {
  const isFinalTick = val === 1;
  const filename =
    typeof val === "number" && val >= 1 && val <= 5
      ? val === 1
        ? "countdown_1.wav"
        : `countdown_${val}.wav`
      : isFinalTick
        ? "countdown_final.wav"
        : "countdown_tick.wav";
  const duration = val === 1 || isFinalTick ? 0.35 : val === 2 ? 0.09 : 0.08;
  const volume = val === 1 || isFinalTick ? "0.60" : val === 2 ? "0.50" : val === 3 ? "0.48" : "0.45";
  return { filename, duration, volume };
}

function resolveRewardSfx(event: TimelineEvent): CandyArcadeSfxSpec {
  const isBig = event.payload?.intensity === "big";
  return {
    filename: isBig ? "correct_triumph.wav" : "correct_ding.wav",
    duration: isBig ? 1.5 : 1.1,
    volume: "0.75",
  };
}

function resolveTransitionSfx(event: TimelineEvent): CandyArcadeSfxSpec | null {
  if (isBridgeStingerTransition(event)) {
    return null;
  }
  const isLightning = event.payload?.intent === "zoom" || event.payload?.intent === "lightning";
  return {
    filename: isLightning ? "lightning_brush.wav" : "bubble_splash.wav",
    duration: isLightning ? 0.7 : 0.65,
    volume: "0.60",
  };
}

function resolveSfxPlayVolume(rawVol: unknown): string {
  if (typeof rawVol === "number") return rawVol.toFixed(2);
  return typeof rawVol === "string" ? rawVol : "0.60";
}

function resolveSfxPlay(event: TimelineEvent): CandyArcadeSfxSpec {
  const soundIntent = (event.payload?.sound as string) || "ui_pop";
  const baseDuration = event.duration_seconds || 0.35;
  const match = SFX_PLAY_INTENT_FILES.find((entry) => entry.intents.includes(soundIntent));
  return {
    filename: match ? match.filename : "ui_pop.wav",
    duration: match ? baseDuration || match.fallbackDuration : baseDuration,
    volume: resolveSfxPlayVolume(event.payload?.volume),
  };
}

export function resolveCandyArcadeSfxSpec(event: TimelineEvent): CandyArcadeSfxSpec | null {
  switch (event.type) {
    case "choices.enter":
      return { filename: "ui_pop.wav", duration: 0.12, volume: "0.55" };
    case "countdown.tick":
      return resolveCountdownSfx(event.payload?.value);
    case "reward.play":
      return resolveRewardSfx(event);
    case "transition.start":
      return resolveTransitionSfx(event);
    case "sfx.play":
      return resolveSfxPlay(event);
    default:
      return null;
  }
}
