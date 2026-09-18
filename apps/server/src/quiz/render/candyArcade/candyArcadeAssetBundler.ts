import type { MascotProfile, MascotRenderAspectRatio, QuizBackgroundStyle, QuizTimeline } from "@studio/shared";
import type { ResolveBgmOptions } from "../../audio/bgmRegistry.js";
import { buildBgmClips, buildSfxClips, source } from "./candyArcadeAudio.js";
import { candyArcadeCss } from "./candyArcadeStyles.js";
import { candyArcadeFontReadinessScript } from "./candyArcadeFonts.js";
import { toSubComposition, subCompositionMount } from "./candyArcadeClips.js";
import { getMascotPreloadTags } from "../mascotStateResolver.js";
import { renderChannelBrandMark } from "./channelBrandMark.js";

export type CandyArcadeAudioClipsInput = {
  audioPath: string;
  duration: number;
  narrationDurationSeconds: number;
  premixedAudio?: boolean;
  events: QuizTimeline["events"];
  assets?: Record<string, string>;
  bgmOptions?: ResolveBgmOptions;
  episodeId?: string;
  introVideoPath?: string;
  outroVideoPath?: string;
  firstStart: number;
  outroStart?: number;
};

export function buildCandyArcadeAudioTags(input: CandyArcadeAudioClipsInput): string {
  const audioSrc = source(input.audioPath);
  const narrationDuration = input.narrationDurationSeconds > 0 ? input.narrationDurationSeconds : input.duration;
  const isPremixed = input.premixedAudio ?? input.audioPath.includes("soundtrack");

  if (isPremixed) {
    return `<audio id="master-soundtrack" class="clip" data-start="0" data-duration="${input.duration.toFixed(3)}" data-track-index="1" data-volume="1" src="${audioSrc}"></audio>`;
  }

  const resolvedStartSeconds = input.introVideoPath
    ? Math.max(input.firstStart, input.bgmOptions?.startSeconds ?? input.firstStart)
    : (input.bgmOptions?.startSeconds ?? input.firstStart);

  const resolvedOutroStartSeconds =
    input.outroVideoPath && typeof input.outroStart === "number"
      ? typeof input.bgmOptions?.outroStartSeconds === "number"
        ? Math.min(input.outroStart, input.bgmOptions.outroStartSeconds)
        : input.outroStart
      : (input.bgmOptions?.outroStartSeconds ?? input.outroStart);

  const bgmClips = buildBgmClips(
    input.duration,
    input.assets,
    resolvedOutroStartSeconds,
    {
      seed: input.episodeId,
      startSeconds: resolvedStartSeconds,
      outroStartSeconds: resolvedOutroStartSeconds,
      ...input.bgmOptions,
    },
    resolvedStartSeconds,
  );

  const sfxClips = buildSfxClips(input.events, input.assets);

  return [
    `<audio id="quiz-narration" class="clip" data-start="0" data-duration="${narrationDuration.toFixed(3)}" data-track-index="2" data-volume="1" src="${audioSrc}"></audio>`,
    ...bgmClips,
    ...sfxClips,
  ].join("\n");
}

export type AssembleCandyArcadeDocumentInput = {
  clips: string[];
  canvas: { width: number; height: number };
  aspectRatio: MascotRenderAspectRatio;
  duration: number;
  fps: number;
  mascot?: MascotProfile | null;
  usedBackgroundStyles: Set<QuizBackgroundStyle>;
  styleCatalogRevision?: string | null;
  audioPath: string;
  narrationDurationSeconds: number;
  premixedAudio?: boolean;
  events: QuizTimeline["events"];
  assets?: Record<string, string>;
  bgmOptions?: ResolveBgmOptions;
  episodeId?: string;
  introVideoPath?: string;
  outroVideoPath?: string;
  firstStart: number;
  outroStart?: number;
};

export type AssembledCandyArcadeDocument = {
  html: string;
  files: Record<string, string>;
};

export function assembleCandyArcadeDocument(input: AssembleCandyArcadeDocumentInput): AssembledCandyArcadeDocument {
  const scenes = input.clips.filter(Boolean).map((clip) => toSubComposition(clip, input.aspectRatio));
  const mascotPreloads = getMascotPreloadTags(input.mascot, source);
  const audioTags = buildCandyArcadeAudioTags({
    audioPath: input.audioPath,
    duration: input.duration,
    narrationDurationSeconds: input.narrationDurationSeconds,
    premixedAudio: input.premixedAudio,
    events: input.events,
    assets: input.assets,
    bgmOptions: input.bgmOptions,
    episodeId: input.episodeId,
    introVideoPath: input.introVideoPath,
    outroVideoPath: input.outroVideoPath,
    firstStart: input.firstStart,
    outroStart: input.outroStart,
  });

  const css = candyArcadeCss({
    aspectRatio: input.aspectRatio,
    backgroundStyles: input.usedBackgroundStyles,
    styleCatalogRevision: input.styleCatalogRevision ?? undefined,
  });

  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Candy Arcade Quiz</title>${
    mascotPreloads ? `\n${mascotPreloads}` : ""
  }<style>${css}</style></head><body><main id="stage" data-composition-id="quiz-v2-candy-arcade" data-no-timeline data-start="0" data-width="${
    input.canvas.width
  }" data-height="${input.canvas.height}" data-aspect-ratio="${input.aspectRatio}" data-duration="${input.duration.toFixed(
    3,
  )}" data-fps="${input.fps}">${scenes.map(subCompositionMount).join("\n")}\n${audioTags}</main><script>${candyArcadeFontReadinessScript()}</script></body></html>`;

  const files = Object.fromEntries(scenes.map((scene) => [`compositions/${scene.id}.html`, scene.html]));

  return { html, files };
}

export { renderChannelBrandMark };
