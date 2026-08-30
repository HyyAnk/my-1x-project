import type { BgmScheduleItem } from "./soundtrackBgmPlanner.js";
import type { SfxScheduleItem } from "./soundtrackSfxPlanner.js";

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
