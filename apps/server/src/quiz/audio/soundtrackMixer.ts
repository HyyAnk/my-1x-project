import { execFile } from "node:child_process";
import fs from "node:fs";
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import type { QuizTimeline } from "@studio/shared";
import { defaultBgmRegistry, type BgmRegistry, type ResolveBgmOptions } from "./bgmRegistry.js";
import { DEFAULT_SFX_MAP } from "./sfxRegistry.js";
import { wavDurationSeconds } from "../../utils/binary.js";
import { diagnoseMasterSoundtrack } from "./audioDiagnostics.js";

const execFileAsync = promisify(execFile);

export interface SfxScheduleItem {
  id: string;
  intent: string;
  filename: string;
  filePath: string;
  startSeconds: number;
  durationSeconds: number;
  volume: number;
}

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

export interface MasterSoundtrackPlan {
  durationSeconds: number;
  narrationPath: string;
  bgmItems: BgmScheduleItem[];
  sfxItems: SfxScheduleItem[];
  ducking?: boolean;
  duckingThreshold?: number;
  duckingRatio?: number;
  duckingAttackMs?: number;
  duckingReleaseMs?: number;
  loudnorm?: boolean;
  targetLufs?: number;
  truePeakDb?: number;
  loudnessRange?: number;
}

export interface MixMasterSoundtrackOptions {
  narrationPath: string;
  timeline: QuizTimeline;
  durationSeconds: number;
  workingDirectory: string;
  outputPath: string;
  bgmOptions?: ResolveBgmOptions;
  bgmRegistry?: BgmRegistry;
  sfxCandidateDirectories?: string[];
  bgmCandidateDirectories?: string[];
  assets?: Record<string, string>;
  outroStartSeconds?: number;
  ducking?: boolean;
  duckingThreshold?: number;
  duckingRatio?: number;
  duckingAttackMs?: number;
  duckingReleaseMs?: number;
  loudnorm?: boolean;
  targetLufs?: number;
  truePeakDb?: number;
  loudnessRange?: number;
}

export interface MixMasterSoundtrackResult {
  outputPath: string;
  durationSeconds: number;
  plan: MasterSoundtrackPlan;
  diagnostics?: import("./audioDiagnostics.js").MasterSoundtrackDiagnostics;
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

export function buildFilterGraphScript(plan: MasterSoundtrackPlan, inputIndices: Map<string, number>): string {
  const lines: string[] = [];
  const enableDucking = plan.ducking !== false && plan.bgmItems.length > 0;
  const duckingThreshold = plan.duckingThreshold ?? 0.08;
  const duckingRatio = plan.duckingRatio ?? 4;
  const duckingAttack = plan.duckingAttackMs ?? 100;
  const duckingRelease = plan.duckingReleaseMs ?? 400;

  // Track stream allocation counts per input index
  const streamCounts = new Map<number, number>();
  for (const bgm of plan.bgmItems) {
    const idx = inputIndices.get(bgm.filePath);
    if (idx !== undefined) streamCounts.set(idx, (streamCounts.get(idx) ?? 0) + 1);
  }
  for (const sfx of plan.sfxItems) {
    const idx = inputIndices.get(sfx.filePath);
    if (idx !== undefined) streamCounts.set(idx, (streamCounts.get(idx) ?? 0) + 1);
  }

  // Generate asplit for inputs used more than once
  const splitCursors = new Map<number, number>();
  for (const [idx, count] of streamCounts.entries()) {
    if (count > 1) {
      const labels = Array.from({ length: count }, (_, i) => `[in_${idx}_${i}]`).join("");
      lines.push(`[${idx}:a]asplit=${count}${labels};`);
    }
  }

  function getStreamName(filePath: string): string {
    const idx = inputIndices.get(filePath)!;
    const total = streamCounts.get(idx) ?? 1;
    if (total <= 1) return `[${idx}:a]`;
    const curr = splitCursors.get(idx) ?? 0;
    splitCursors.set(idx, curr + 1);
    return `[in_${idx}_${curr}]`;
  }

  const mixInputs: string[] = [];

  // 1. Narration (Input 0)
  if (enableDucking) {
    lines.push("[0:a]aformat=sample_rates=48000:channel_layouts=stereo,volume=1.0,asplit=2[narr_stream][narr_sidechain];");
    mixInputs.push("[narr_stream]");
  } else {
    lines.push("[0:a]aformat=sample_rates=48000:channel_layouts=stereo,volume=1.0[narr_stream];");
    mixInputs.push("[narr_stream]");
  }

  // 2. BGM tracks
  const bgmStreams: string[] = [];
  for (const [i, bgm] of plan.bgmItems.entries()) {
    const inStream = getStreamName(bgm.filePath);
    const outStream = `[bgm_stream_${i}]`;
    const fadeOutStart = Math.max(0, bgm.durationSeconds - bgm.fadeOutSeconds);

    const filters: string[] = [
      "aformat=sample_rates=48000:channel_layouts=stereo",
      `atrim=0:${bgm.durationSeconds.toFixed(3)}`,
      "asetpts=PTS-STARTPTS",
    ];

    if (bgm.fadeInSeconds > 0.01) {
      filters.push(`afade=t=in:st=0:d=${bgm.fadeInSeconds.toFixed(3)}`);
    }
    if (bgm.fadeOutSeconds > 0.01 && fadeOutStart > 0) {
      filters.push(`afade=t=out:st=${fadeOutStart.toFixed(3)}:d=${bgm.fadeOutSeconds.toFixed(3)}`);
    }
    filters.push(`volume=${bgm.volume.toFixed(2)}`);

    if (bgm.startSeconds > 0.001) {
      const delayMs = Math.round(bgm.startSeconds * 1000);
      filters.push(`adelay=${delayMs}|${delayMs}`);
    }

    lines.push(`${inStream}${filters.join(",")}${outStream};`);
    bgmStreams.push(outStream);
  }

  if (enableDucking) {
    if (bgmStreams.length > 1) {
      const bgmLabels = bgmStreams.join("");
      lines.push(`${bgmLabels}amix=inputs=${bgmStreams.length}:duration=longest:normalize=0[bgm_combined];`);
      lines.push(
        `[bgm_combined][narr_sidechain]sidechaincompress=threshold=${duckingThreshold}:ratio=${duckingRatio}:attack=${duckingAttack}:release=${duckingRelease}:makeup=1[bgm_ducked];`,
      );
      mixInputs.push("[bgm_ducked]");
    } else if (bgmStreams.length === 1) {
      lines.push(
        `${bgmStreams[0]}[narr_sidechain]sidechaincompress=threshold=${duckingThreshold}:ratio=${duckingRatio}:attack=${duckingAttack}:release=${duckingRelease}:makeup=1[bgm_ducked];`,
      );
      mixInputs.push("[bgm_ducked]");
    }
  } else {
    mixInputs.push(...bgmStreams);
  }

  // 3. SFX clips
  for (const [j, sfx] of plan.sfxItems.entries()) {
    const inStream = getStreamName(sfx.filePath);
    const outStream = `[sfx_stream_${j}]`;

    const filters: string[] = [
      "aformat=sample_rates=48000:channel_layouts=stereo",
      `atrim=0:${sfx.durationSeconds.toFixed(3)}`,
      "asetpts=PTS-STARTPTS",
      `volume=${sfx.volume.toFixed(2)}`,
    ];

    if (sfx.startSeconds > 0.001) {
      const delayMs = Math.round(sfx.startSeconds * 1000);
      filters.push(`adelay=${delayMs}|${delayMs}`);
    }

    lines.push(`${inStream}${filters.join(",")}${outStream};`);
    mixInputs.push(outStream);
  }

  // 4. Mix all streams together with Loudnorm
  const mixLabels = mixInputs.join("");
  const enableLoudnorm = plan.loudnorm !== false;
  const targetLufs = plan.targetLufs ?? -14;
  const truePeak = plan.truePeakDb ?? -1.0;
  const lra = plan.loudnessRange ?? 7;

  const masterFilters: string[] = [
    `amix=inputs=${mixInputs.length}:duration=longest:dropout_transition=0:normalize=0`,
    `atrim=0:${plan.durationSeconds.toFixed(3)}`,
    "asetpts=PTS-STARTPTS",
  ];

  if (enableLoudnorm) {
    masterFilters.push(`loudnorm=I=${targetLufs}:TP=${truePeak}:LRA=${lra}`);
  }
  masterFilters.push("aformat=sample_rates=48000:channel_layouts=stereo");

  lines.push(`${mixLabels}${masterFilters.join(",")}[out_master]`);

  return lines.join("\n");
}

export async function mixMasterSoundtrack(options: MixMasterSoundtrackOptions): Promise<MixMasterSoundtrackResult> {
  const duration = Math.max(3, Number(options.durationSeconds.toFixed(3)));
  const workingDir = options.workingDirectory;
  await mkdir(workingDir, { recursive: true });

  const sfxCandidateDirs = options.sfxCandidateDirectories ?? defaultSfxCandidateDirectories();
  const bgmCandidateDirs = options.bgmCandidateDirectories ?? defaultBgmCandidateDirectories();

  const sfxItems = resolveSfxSchedule(options.timeline.events, sfxCandidateDirs, options.assets);
  const bgmItems = resolveBgmScheduleItems(duration, bgmCandidateDirs, options.bgmOptions, options.bgmRegistry, options.outroStartSeconds);

  const plan: MasterSoundtrackPlan = {
    durationSeconds: duration,
    narrationPath: options.narrationPath,
    bgmItems,
    sfxItems,
    ducking: options.ducking,
    duckingThreshold: options.duckingThreshold,
    duckingRatio: options.duckingRatio,
    duckingAttackMs: options.duckingAttackMs,
    duckingReleaseMs: options.duckingReleaseMs,
    loudnorm: options.loudnorm,
    targetLufs: options.targetLufs,
    truePeakDb: options.truePeakDb,
    loudnessRange: options.loudnessRange,
  };

  // Collect unique audio file paths
  const distinctOtherFiles = Array.from(new Set([...bgmItems.map((b) => b.filePath), ...sfxItems.map((s) => s.filePath)]));
  const allInputFiles = [options.narrationPath, ...distinctOtherFiles];
  const inputIndices = new Map<string, number>(allInputFiles.map((file, idx) => [file, idx]));

  const filterScript = buildFilterGraphScript(plan, inputIndices);

  const ffmpegArgs: string[] = ["-y"];
  for (const file of allInputFiles) {
    ffmpegArgs.push("-i", file);
  }
  ffmpegArgs.push(
    "-filter_complex",
    filterScript,
    "-map",
    "[out_master]",
    "-c:a",
    "pcm_s16le",
    "-ar",
    "48000",
    "-ac",
    "2",
    options.outputPath,
  );

  await execFileAsync("ffmpeg", ffmpegArgs, { timeout: 3 * 60_000, windowsHide: true });
  const outputBuffer = await readFile(options.outputPath);
  const measuredDuration = wavDurationSeconds(new Uint8Array(outputBuffer));
  const diagnostics = diagnoseMasterSoundtrack(new Uint8Array(outputBuffer), duration);

  return {
    outputPath: options.outputPath,
    durationSeconds: measuredDuration,
    plan,
    diagnostics,
  };
}
