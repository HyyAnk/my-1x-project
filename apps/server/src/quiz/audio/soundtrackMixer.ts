import { execFile } from "node:child_process";
import { mkdir, readFile } from "node:fs/promises";
import { promisify } from "node:util";
import type { QuizTimeline } from "@studio/shared";
import { wavDurationSeconds } from "../../utils/binary.js";
import { diagnoseMasterSoundtrack } from "./audioDiagnostics.js";
import type { BgmRegistry, ResolveBgmOptions } from "./bgmRegistry.js";
import {
  defaultSfxCandidateDirectories,
  resolveSfxCandidatePath,
  resolveSfxSchedule,
  type SfxScheduleItem,
} from "./soundtrackSfxPlanner.js";
import {
  defaultBgmCandidateDirectories,
  resolveBgmCandidatePath,
  resolveBgmScheduleItems,
  type BgmScheduleItem,
} from "./soundtrackBgmPlanner.js";
import {
  buildFilterGraphScript,
  type MasterSoundtrackPlan,
} from "./soundtrackFfmpegBuilder.js";

const execFileAsync = promisify(execFile);

export * from "./soundtrackSfxPlanner.js";
export * from "./soundtrackBgmPlanner.js";
export * from "./soundtrackFfmpegBuilder.js";

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

export async function mixMasterSoundtrack(options: MixMasterSoundtrackOptions): Promise<MixMasterSoundtrackResult> {
  const duration = Math.max(3, Number(options.durationSeconds.toFixed(3)));
  const workingDir = options.workingDirectory;
  await mkdir(workingDir, { recursive: true });

  const sfxCandidateDirs = options.sfxCandidateDirectories ?? defaultSfxCandidateDirectories();
  const bgmCandidateDirs = options.bgmCandidateDirectories ?? defaultBgmCandidateDirectories();

  const sfxItems = resolveSfxSchedule(options.timeline.events, sfxCandidateDirs, options.assets);
  const bgmItems = resolveBgmScheduleItems(
    duration,
    bgmCandidateDirs,
    options.bgmOptions,
    options.bgmRegistry,
    options.outroStartSeconds,
  );

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
