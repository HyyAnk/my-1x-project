import { pathToFileURL } from "node:url";
import type { QuizTimeline } from "@studio/shared";
import { defaultBgmRegistry, type ResolveBgmOptions } from "../../audio/bgmRegistry.js";
import { DEFAULT_SFX_MAP } from "../../audio/sfxRegistry.js";
import { escAttr } from "./candyArcadeSvg.js";

export type SfxRawClip = {
  id: string;
  className: string;
  start: number;
  duration: number;
  trackIndex: number;
  volume: string;
  src: string;
};

export function source(value: string): string {
  if (/^(data:|https?:|file:)/i.test(value) || value.startsWith("./") || value.startsWith("../")) return value;
  return pathToFileURL(value).href;
}

export function assetFor(assets: Record<string, string>, ...keys: string[]): string | null {
  for (const key of keys) if (assets[key]) return source(assets[key]);
  return null;
}

export function sfxSource(filename: string, assets?: Record<string, string>): string {
  const intentKey = filename.replace(/\.wav$/, "");
  if (assets?.[`sfx:${intentKey}`]) return source(assets[`sfx:${intentKey}`]);
  if (assets?.[filename]) return source(assets[filename]);
  const defaultMapped = DEFAULT_SFX_MAP[intentKey as keyof typeof DEFAULT_SFX_MAP];
  const finalFilename = defaultMapped ?? (filename.endsWith(".wav") ? filename : `${filename}.wav`);
  return `./sfx/${finalFilename}`;
}

export function buildBgmClips(
  duration: number,
  assets?: Record<string, string>,
  outroStart?: number,
  bgmOptions?: ResolveBgmOptions,
): string[] {
  const schedule = defaultBgmRegistry.resolveBgmSchedule(duration, {
    assets,
    bpmPreference: "120_bpm_upbeat",
    ...bgmOptions,
  });
  const totalClips = schedule.length;

  return schedule.map((item, index) => {
    const isFirstClip = index === 0;
    const isFinalClip = index === totalClips - 1;
    const clipStart = item.startSeconds;
    const clipDuration = item.durationSeconds;
    const baseVolume = item.volume;

    const points: Array<{ t: number; v: number }> = [];

    // Subtle 0.5s fade-in at the beginning of the audio track
    if (isFirstClip) {
      const fadeInDur = Math.min(0.5, clipDuration * 0.2);
      if (fadeInDur > 0.05) {
        points.push({ t: 0, v: 0 });
        points.push({ t: Number(fadeInDur.toFixed(3)), v: baseVolume });
      } else {
        points.push({ t: 0, v: baseVolume });
      }
    } else {
      const fadeInDur = Math.min(0.6, clipDuration * 0.2);
      if (fadeInDur > 0.05) {
        points.push({ t: 0, v: 0 });
        points.push({ t: Number(fadeInDur.toFixed(3)), v: baseVolume });
      } else {
        points.push({ t: 0, v: baseVolume });
      }
    }

    if (isFinalClip) {
      // Smooth fade-out towards the end of the video
      let fadeOutSeconds = 2.5;
      if (typeof outroStart === "number" && outroStart > clipStart && outroStart < duration - 0.5) {
        const outroDur = duration - outroStart;
        fadeOutSeconds = Math.max(2.0, Math.min(4.0, outroDur));
      }
      fadeOutSeconds = Math.min(fadeOutSeconds, clipDuration * 0.5);

      const fadeStartLocal = Math.max(0, clipDuration - fadeOutSeconds);
      const lastPoint = points[points.length - 1];
      if (lastPoint && fadeStartLocal > lastPoint.t) {
        points.push({ t: Number(fadeStartLocal.toFixed(3)), v: baseVolume });
      }
      points.push({ t: Number(clipDuration.toFixed(3)), v: 0 });
    } else {
      const fadeOutSeconds = Math.min(0.6, clipDuration * 0.2);
      const fadeStartLocal = Math.max(0, clipDuration - fadeOutSeconds);
      const lastPoint = points[points.length - 1];
      if (lastPoint && fadeStartLocal > lastPoint.t) {
        points.push({ t: Number(fadeStartLocal.toFixed(3)), v: baseVolume });
      }
      points.push({ t: Number(clipDuration.toFixed(3)), v: 0 });
    }

    const automation = {
      version: 1,
      lanes: [
        {
          target: "volume",
          points,
        },
      ],
    };

    const automationAttr = `data-automation="${escAttr(JSON.stringify(automation))}"`;

    return `<audio id="${item.id}" class="clip bgm-clip" data-start="${item.startSeconds.toFixed(3)}" data-duration="${item.durationSeconds.toFixed(3)}" data-track-index="4" data-volume="${item.volume.toFixed(2)}" ${automationAttr} src="${item.src}"></audio>`;
  });
}

export function buildSfxClips(events: QuizTimeline["events"], assets?: Record<string, string>): string[] {
  const rawClips: SfxRawClip[] = [];

  for (const event of events) {
    const timeMs = Math.round(event.at_seconds * 1000);
    const eventSlug = event.type.replaceAll(".", "-");
    const id = `sfx-${eventSlug}-${timeMs}`;

    if (event.type === "choices.enter") {
      const src = sfxSource("ui_pop.wav", assets);
      rawClips.push({
        id,
        className: "clip sfx-clip",
        start: event.at_seconds,
        duration: 0.12,
        trackIndex: 3,
        volume: "0.55",
        src,
      });
    } else if (event.type === "countdown.tick") {
      const isFinalTick = event.payload?.value === 1;
      const filename = isFinalTick ? "countdown_final.wav" : "countdown_tick.wav";
      const dur = isFinalTick ? 0.35 : 0.08;
      const vol = isFinalTick ? "0.60" : "0.45";
      const src = sfxSource(filename, assets);
      rawClips.push({
        id,
        className: "clip sfx-clip",
        start: event.at_seconds,
        duration: dur,
        trackIndex: 3,
        volume: String(vol),
        src,
      });
    } else if (event.type === "reward.play") {
      const isBig = event.payload?.intensity === "big";
      const filename = isBig ? "correct_triumph.wav" : "correct_ding.wav";
      const dur = isBig ? 1.5 : 1.1;
      const src = sfxSource(filename, assets);
      rawClips.push({
        id,
        className: "clip sfx-clip",
        start: event.at_seconds,
        duration: dur,
        trackIndex: 3,
        volume: "0.75",
        src,
      });
    } else if (event.type === "transition.start") {
      const isLightning = event.payload?.intent === "zoom" || event.payload?.intent === "lightning";
      const filename = isLightning ? "lightning_brush.wav" : "bubble_splash.wav";
      const dur = isLightning ? 0.7 : 0.65;
      const src = sfxSource(filename, assets);
      rawClips.push({
        id,
        className: "clip sfx-clip",
        start: event.at_seconds,
        duration: dur,
        trackIndex: 3,
        volume: "0.60",
        src,
      });
    }
  }

  // Prevent overlap within each track
  const scheduledClips: SfxRawClip[] = [];
  const clipsByTrack = new Map<number, SfxRawClip[]>();
  for (const clip of rawClips) {
    const list = clipsByTrack.get(clip.trackIndex) ?? [];
    list.push(clip);
    clipsByTrack.set(clip.trackIndex, list);
  }

  for (const [_, trackClips] of clipsByTrack.entries()) {
    trackClips.sort((a, b) => a.start - b.start);
    const resolved: SfxRawClip[] = [];
    for (const current of trackClips) {
      if (resolved.length === 0) {
        resolved.push(current);
        continue;
      }
      const prev = resolved[resolved.length - 1];
      // If exact same start time or within 40ms, skip duplicate
      if (current.start <= prev.start + 0.04) {
        continue;
      }
      // If previous clip overlaps into current, clamp previous clip duration
      if (prev.start + prev.duration > current.start) {
        prev.duration = Math.max(0.04, current.start - prev.start);
      }
      resolved.push(current);
    }
    scheduledClips.push(...resolved);
  }

  return scheduledClips.map(
    (clip) =>
      `<audio id="${clip.id}" class="${clip.className}" data-start="${clip.start.toFixed(3)}" data-duration="${clip.duration.toFixed(3)}" data-track-index="${clip.trackIndex}" data-volume="${clip.volume}" src="${clip.src}"></audio>`,
  );
}
