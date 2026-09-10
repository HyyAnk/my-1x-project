import type { BgmScheduleItem } from "./soundtrackBgmPlanner.js";
import type { SfxScheduleItem } from "./soundtrackSfxPlanner.js";

export const DEFAULT_DUCKING_THRESHOLD = 0.04;
export const DEFAULT_DUCKING_RATIO = 10;
export const DEFAULT_DUCKING_ATTACK_MS = 80;
export const DEFAULT_DUCKING_RELEASE_MS = 450;

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

function buildStreamSplits(streamCounts: Map<number, number>): string[] {
  const lines: string[] = [];
  for (const [idx, count] of streamCounts.entries()) {
    if (count > 1) {
      const labels = Array.from({ length: count }, (_, i) => `[in_${idx}_${i}]`).join("");
      lines.push(`[${idx}:a]asplit=${count}${labels};`);
    }
  }
  return lines;
}

function buildNarrationFilter(enableDucking: boolean): { line: string; outputLabel: string } {
  if (enableDucking) {
    return {
      line: "[0:a]aformat=sample_rates=48000:channel_layouts=stereo,volume=1.0,asplit=2[narr_stream][narr_sidechain];",
      outputLabel: "[narr_stream]",
    };
  }
  return {
    line: "[0:a]aformat=sample_rates=48000:channel_layouts=stereo,volume=1.0[narr_stream];",
    outputLabel: "[narr_stream]",
  };
}

function buildBgmClipFilter(bgm: BgmScheduleItem, inStream: string, outStream: string): string {
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
  return `${inStream}${filters.join(",")}${outStream};`;
}

function buildDuckingFilter(
  bgmStreams: string[],
  threshold: number,
  ratio: number,
  attack: number,
  release: number,
): { lines: string[]; duckedOutput: string } {
  const lines: string[] = [];
  let bgmInputLabel = bgmStreams[0];
  if (bgmStreams.length > 1) {
    const bgmLabels = bgmStreams.join("");
    lines.push(`${bgmLabels}amix=inputs=${bgmStreams.length}:duration=longest:normalize=0[bgm_combined];`);
    bgmInputLabel = "[bgm_combined]";
  }
  lines.push(
    `${bgmInputLabel}[narr_sidechain]sidechaincompress=threshold=${threshold}:ratio=${ratio}:attack=${attack}:release=${release}:makeup=1[bgm_ducked];`,
  );
  return { lines, duckedOutput: "[bgm_ducked]" };
}

function buildSfxClipFilter(sfx: SfxScheduleItem, inStream: string, outStream: string): string {
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
  return `${inStream}${filters.join(",")}${outStream};`;
}

function buildMasterMixFilter(
  mixInputs: string[],
  durationSeconds: number,
  enableLoudnorm: boolean,
  targetLufs: number,
  truePeak: number,
  lra: number,
): string {
  const mixLabels = mixInputs.join("");
  const masterFilters: string[] = [
    `amix=inputs=${mixInputs.length}:duration=longest:dropout_transition=0:normalize=0`,
    `atrim=0:${durationSeconds.toFixed(3)}`,
    "asetpts=PTS-STARTPTS",
  ];
  if (enableLoudnorm) {
    masterFilters.push(`loudnorm=I=${targetLufs}:TP=${truePeak}:LRA=${lra}`);
  }
  masterFilters.push("aformat=sample_rates=48000:channel_layouts=stereo");
  return `${mixLabels}${masterFilters.join(",")}[out_master]`;
}

export function buildFilterGraphScript(plan: MasterSoundtrackPlan, inputIndices: Map<string, number>): string {
  const lines: string[] = [];
  const enableDucking = plan.ducking !== false && plan.bgmItems.length > 0;
  const duckingThreshold = plan.duckingThreshold ?? DEFAULT_DUCKING_THRESHOLD;
  const duckingRatio = plan.duckingRatio ?? DEFAULT_DUCKING_RATIO;
  const duckingAttack = plan.duckingAttackMs ?? DEFAULT_DUCKING_ATTACK_MS;
  const duckingRelease = plan.duckingReleaseMs ?? DEFAULT_DUCKING_RELEASE_MS;

  const streamCounts = new Map<number, number>();
  for (const item of [...plan.bgmItems, ...plan.sfxItems]) {
    const idx = inputIndices.get(item.filePath);
    if (idx !== undefined) streamCounts.set(idx, (streamCounts.get(idx) ?? 0) + 1);
  }
  lines.push(...buildStreamSplits(streamCounts));

  const splitCursors = new Map<number, number>();
  const getStreamName = (filePath: string): string => {
    const idx = inputIndices.get(filePath)!;
    const total = streamCounts.get(idx) ?? 1;
    if (total <= 1) return `[${idx}:a]`;
    const curr = splitCursors.get(idx) ?? 0;
    splitCursors.set(idx, curr + 1);
    return `[in_${idx}_${curr}]`;
  };

  const mixInputs: string[] = [];
  const narration = buildNarrationFilter(enableDucking);
  lines.push(narration.line);
  mixInputs.push(narration.outputLabel);

  const bgmStreams: string[] = [];
  for (const [i, bgm] of plan.bgmItems.entries()) {
    const outStream = `[bgm_stream_${i}]`;
    lines.push(buildBgmClipFilter(bgm, getStreamName(bgm.filePath), outStream));
    bgmStreams.push(outStream);
  }

  if (enableDucking && bgmStreams.length > 0) {
    const ducking = buildDuckingFilter(bgmStreams, duckingThreshold, duckingRatio, duckingAttack, duckingRelease);
    lines.push(...ducking.lines);
    mixInputs.push(ducking.duckedOutput);
  } else {
    mixInputs.push(...bgmStreams);
  }

  for (const [j, sfx] of plan.sfxItems.entries()) {
    const outStream = `[sfx_stream_${j}]`;
    lines.push(buildSfxClipFilter(sfx, getStreamName(sfx.filePath), outStream));
    mixInputs.push(outStream);
  }

  lines.push(
    buildMasterMixFilter(
      mixInputs,
      plan.durationSeconds,
      plan.loudnorm !== false,
      plan.targetLufs ?? -14,
      plan.truePeakDb ?? -1.0,
      plan.loudnessRange ?? 7,
    ),
  );

  return lines.join("\n");
}
