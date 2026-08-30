import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import {
  BUILTIN_DEFAULT_VOICE_PROFILE,
  VoicePlanSchema,
  DEFAULT_QUIZ_VOICE_TEMPO_BY_ROLE,
  type AppConfig,
  type QuizTimeline,
  type VoiceSegment,
  type VoiceSegmentRole,
  type VoicePlan,
} from "@studio/shared";
import type { RepositoryService } from "../../repository.js";
import { synthesizeWav } from "../../providers/chatterbox.js";
import { runConcurrent } from "../../utils/concurrency.js";
import { audioDiagnosticsForTimeline, type VoiceAudioDiagnostics } from "./audioDiagnostics.js";
import { countQuizVoiceWords, quizVoicePacingLimit } from "./voicePolicy.js";
import { wavDurationSeconds } from "../../utils/binary.js";
import {
  MIN_QUIZ_VOICE_SLOWDOWN_TEMPO,
  createSilenceWav,
  enforceQuizVoicePace,
  isStandardPcmWav,
  paceQuizVoiceAudio,
  pauseSeconds,
  quizVoicePaceCorrectionTempo,
  segmentPace,
  type QuizVoicePacingClamp,
} from "./voicePacingClamper.js";

export {
  wavDurationSeconds,
  MIN_QUIZ_VOICE_SLOWDOWN_TEMPO,
  quizVoicePaceCorrectionTempo,
  type QuizVoicePacingClamp,
  createSilenceWav,
  isStandardPcmWav,
};

const execFileAsync = promisify(execFile);
export const QUIZ_VOICE_PACING_VERSION = "paced-v13-expressive-playful";

export type MeasuredQuizVoice = {
  voicePlan: VoicePlan;
  segmentPaths: Map<string, string>;
};

export async function synthesizeQuizVoiceSegments(input: {
  repository: RepositoryService;
  config: AppConfig["audio_generation"];
  channelId: string;
  episodeId: string;
  voicePlan: VoicePlan;
  targetWordsPerSecond: number;
  onProgress?: (progress: { completed: number; total: number; reused: boolean }) => Promise<void> | void;
  onPacingClamp?: (details: QuizVoicePacingClamp) => Promise<void> | void;
}): Promise<MeasuredQuizVoice> {
  const channel = await input.repository.getChannel(input.channelId);
  const defaultBuiltinPath = input.repository.resolveContextPath(BUILTIN_DEFAULT_VOICE_PROFILE.reference_path);
  const voice = channel.voice_reference_path
    ? input.repository.resolveContextPath(channel.voice_reference_path)
    : (await input.repository.exists(defaultBuiltinPath))
      ? defaultBuiltinPath
      : "default";
  const cache = new Map<string, { duration: number; absolutePath: string }>();
  const segmentPaths = new Map<string, string>();
  const pacingDirectory = input.repository.resolvePath("runtime", "quiz-voice", input.episodeId);
  await mkdir(pacingDirectory, { recursive: true });
  const pacingLimit = quizVoicePacingLimit(input.targetWordsPerSecond);

  let completedCount = 0;
  const voiceConcurrency = Math.max(1, Math.min(8, input.config.max_concurrent_tasks || 3));

  const results = await runConcurrent(input.voicePlan.segments, voiceConcurrency, async (segment, index) => {
    const tempo = quizVoiceTempo(segment.role);
    const fingerprint = quizVoiceFingerprint(segment, tempo, voice, input.config, input.targetWordsPerSecond);
    const key = fingerprint;
    const pacingVersion = `${segment.role === "outro" ? "paced-v13-outro" : "paced-v13"}-${fingerprint.slice(0, 20)}`;
    let rendered = cache.get(key);
    let reused = Boolean(rendered);
    if (!rendered) {
      const existing = await input.repository
        .getQuizVoiceSegmentAudioFile(input.channelId, input.episodeId, index + 1, pacingVersion)
        .catch(() => null);
      if (existing) {
        try {
          const audio = new Uint8Array(await readFile(existing.absolutePath));
          const duration = wavDurationSeconds(audio);
          if (duration > 0.05 && isStandardPcmWav(audio) && segmentPace(segment, duration) <= pacingLimit) {
            rendered = { duration, absolutePath: existing.absolutePath };
            reused = true;
          }
        } catch {
          // A corrupt cache entry is regenerated below.
        }
      }
      if (!rendered) {
        const sourceAudio = await renderPerformanceSegment(input.config, segment, voice, pacingDirectory, index + 1);
        const audio = await enforceQuizVoicePace(sourceAudio, segment, pacingLimit, pacingDirectory, index + 1, input.onPacingClamp);
        const duration = wavDurationSeconds(audio);
        const assetPath = await input.repository.writeQuizVoiceSegmentAudio(
          input.channelId,
          input.episodeId,
          index + 1,
          audio,
          pacingVersion,
        );
        rendered = { duration, absolutePath: input.repository.resolveContextPath(assetPath) };
      }
      cache.set(key, rendered);
    }
    completedCount++;
    await input.onProgress?.({ completed: completedCount, total: input.voicePlan.segments.length, reused });
    return {
      segment: { ...segment, duration_seconds: rendered.duration },
      absolutePath: rendered.absolutePath,
    };
  });

  const segments: VoicePlan["segments"] = [];
  for (const item of results) {
    segments.push(item.segment);
    segmentPaths.set(item.segment.segment_id, item.absolutePath);
  }

  return { voicePlan: VoicePlanSchema.parse({ ...input.voicePlan, segments }), segmentPaths };
}

export function quizVoiceTempo(role: VoicePlan["segments"][number]["role"]): number {
  return DEFAULT_QUIZ_VOICE_TEMPO_BY_ROLE[role] ?? 1.0;
}

export function quizVoiceFingerprint(
  segment: VoiceSegment,
  tempo: number,
  voice: string,
  config: AppConfig["audio_generation"],
  targetWordsPerSecond = 0,
): string {
  const performance = voicePerformanceConfig(config, segment.role);
  return createHash("sha256")
    .update(
      JSON.stringify({
        version: QUIZ_VOICE_PACING_VERSION,
        segment_id: segment.segment_id,
        role: segment.role,
        question_id: segment.question_id,
        text: segment.text.trim().replace(/\s+/g, " "),
        phrases: segment.phrases,
        tempo,
        targetWordsPerSecond,
        voice,
        provider: config.provider,
        service_url: config.service_url,
        exaggeration: performance.exaggeration,
        cfg_weight: performance.cfg_weight,
      }),
    )
    .digest("hex");
}

/** Only controls supported by the local Chatterbox adapter are used here. */
export function voicePerformanceConfig(config: AppConfig["audio_generation"], role: VoiceSegmentRole): AppConfig["audio_generation"] {
  const settings: Record<VoiceSegmentRole, { exaggeration: number; cfg_weight: number }> = {
    intro: { exaggeration: 0.84, cfg_weight: 0.34 },
    question: { exaggeration: 0.62, cfg_weight: 0.48 },
    choice: { exaggeration: 0.56, cfg_weight: 0.5 },
    thinking_prompt: { exaggeration: 0.75, cfg_weight: 0.42 },
    countdown: { exaggeration: 0.6, cfg_weight: 0.48 },
    reveal: { exaggeration: 0.86, cfg_weight: 0.3 },
    explanation: { exaggeration: 0.58, cfg_weight: 0.52 },
    fun_fact: { exaggeration: 0.62, cfg_weight: 0.5 },
    midpoint: { exaggeration: 0.7, cfg_weight: 0.45 },
    outro: { exaggeration: 0.84, cfg_weight: 0.34 },
  };
  return { ...config, ...settings[role] };
}

async function renderPerformanceSegment(
  config: AppConfig["audio_generation"],
  segment: VoiceSegment,
  voice: string,
  directory: string,
  segmentNumber: number,
): Promise<Uint8Array> {
  const phrases = segment.phrases.length
    ? segment.phrases
    : [{ text: segment.text, delivery: "normal" as const, pause_after: "none" as const }];
  const phrasePaths: string[] = [];
  try {
    const renderedPhrases = await Promise.all(
      phrases.map(async (phrase, phraseIndex) => {
        const raw = await synthesizeWav(voicePerformanceConfig(config, segment.role), phrase.text, voice);
        const gainDb = segment.role === "reveal" ? 2.0 : segment.role === "intro" || segment.role === "outro" ? 1.5 : 0;
        const paced = await paceQuizVoiceAudio(raw, quizVoiceTempo(segment.role), directory, segmentNumber * 100 + phraseIndex + 1, gainDb);
        const phrasePath = path.join(directory, `segment-${String(segmentNumber).padStart(3, "0")}-phrase-${phraseIndex + 1}.wav`);
        await writeFile(phrasePath, paced);
        return { phraseIndex, phrasePath };
      }),
    );
    renderedPhrases.sort((a, b) => a.phraseIndex - b.phraseIndex);
    for (const item of renderedPhrases) {
      phrasePaths.push(item.phrasePath);
    }
    if (phrasePaths.length === 1) return new Uint8Array(await readFile(phrasePaths[0]));
    return await concatenatePerformancePhrases(phrasePaths, phrases, directory, segmentNumber);
  } finally {
    await Promise.all(phrasePaths.map((file) => rm(file, { force: true })));
  }
}

async function concatenatePerformancePhrases(
  paths: string[],
  phrases: VoiceSegment["phrases"],
  directory: string,
  segmentNumber: number,
): Promise<Uint8Array> {
  const outputPath = path.join(directory, `segment-${String(segmentNumber).padStart(3, "0")}-joined.wav`);
  const concatManifestPath = path.join(directory, `segment-${String(segmentNumber).padStart(3, "0")}-concat.txt`);
  const temporaryFiles: string[] = [concatManifestPath];

  try {
    const manifestLines: string[] = [];
    for (const [index, phrasePath] of paths.entries()) {
      const normalizedPath = phrasePath.replace(/\\/g, "/").replace(/'/g, "'\\''");
      manifestLines.push(`file '${normalizedPath}'`);
      const pauseClass = phrases[index]?.pause_after ?? "none";
      if (index < paths.length - 1 && pauseClass !== "none") {
        const seconds = pauseSeconds(pauseClass, segmentNumber, index);
        if (seconds > 0) {
          const pausePath = path.join(directory, `segment-${String(segmentNumber).padStart(3, "0")}-pause-${index}.wav`);
          await writeFile(pausePath, createSilenceWav(seconds));
          temporaryFiles.push(pausePath);
          const normalizedPause = pausePath.replace(/\\/g, "/").replace(/'/g, "'\\''");
          manifestLines.push(`file '${normalizedPause}'`);
        }
      }
    }
    await writeFile(concatManifestPath, manifestLines.join("\n") + "\n", "utf8");

    await execFileAsync(
      "ffmpeg",
      [
        "-y",
        "-f",
        "concat",
        "-safe",
        "0",
        "-i",
        concatManifestPath,
        "-af",
        "aformat=sample_rates=48000:channel_layouts=stereo,asetpts=N/SR/TB",
        "-ar",
        "48000",
        "-ac",
        "2",
        "-c:a",
        "pcm_s16le",
        outputPath,
      ],
      { timeout: 2 * 60_000, windowsHide: true },
    );
    return new Uint8Array(await readFile(outputPath));
  } finally {
    await Promise.all([rm(outputPath, { force: true }), ...temporaryFiles.map((file) => rm(file, { force: true }))]);
  }
}

export async function assembleQuizNarration(input: {
  repository: RepositoryService;
  channelId: string;
  episodeId: string;
  voicePlan: VoicePlan;
  timeline: QuizTimeline;
  segmentPaths: Map<string, string>;
}): Promise<{ assetPath: string; durationSeconds: number; diagnostics: VoiceAudioDiagnostics }> {
  const narrationEvents = input.timeline.events
    .filter((event) => event.type === "narration.segment" && event.segment_id)
    .sort((left, right) => left.at_seconds - right.at_seconds);
  if (narrationEvents.length === 0) throw new Error("Quiz timeline has no narration segments");

  const workingDirectory = input.repository.resolvePath("runtime", "quiz-voice", input.episodeId);
  await mkdir(workingDirectory, { recursive: true });
  const outputPath = path.join(workingDirectory, "narration.wav");
  const concatManifestPath = path.join(workingDirectory, "narration-concat.txt");
  const temporaryFiles: string[] = [concatManifestPath];

  try {
    const manifestLines: string[] = [];
    let currentPosition = 0;

    for (const [index, event] of narrationEvents.entries()) {
      const source = input.segmentPaths.get(event.segment_id!);
      if (!source) throw new Error("Quiz narration source is missing for " + event.segment_id);

      const targetStart = Number(event.at_seconds.toFixed(3));
      if (targetStart > currentPosition + 0.002) {
        const gap = Number((targetStart - currentPosition).toFixed(3));
        const silencePath = path.join(workingDirectory, `silence-${String(index).padStart(4, "0")}.wav`);
        await writeFile(silencePath, createSilenceWav(gap));
        temporaryFiles.push(silencePath);
        const normalizedSilence = silencePath.replace(/\\/g, "/").replace(/'/g, "'\\''");
        manifestLines.push(`file '${normalizedSilence}'`);
        currentPosition = targetStart;
      }

      const normalizedSource = source.replace(/\\/g, "/").replace(/'/g, "'\\''");
      manifestLines.push(`file '${normalizedSource}'`);
      currentPosition += Number(event.duration_seconds.toFixed(3));
    }

    const totalDuration = Number(input.timeline.duration_seconds.toFixed(3));
    if (totalDuration > currentPosition + 0.002) {
      const trailingGap = Number((totalDuration - currentPosition).toFixed(3));
      const trailingSilencePath = path.join(workingDirectory, "silence-end.wav");
      await writeFile(trailingSilencePath, createSilenceWav(trailingGap));
      temporaryFiles.push(trailingSilencePath);
      const normalizedTrailing = trailingSilencePath.replace(/\\/g, "/").replace(/'/g, "'\\''");
      manifestLines.push(`file '${normalizedTrailing}'`);
    }

    await writeFile(concatManifestPath, manifestLines.join("\n") + "\n", "utf8");

    const duration = totalDuration;
    await execFileAsync(
      "ffmpeg",
      [
        "-y",
        "-f",
        "concat",
        "-safe",
        "0",
        "-i",
        concatManifestPath,
        "-af",
        `aformat=sample_rates=48000:channel_layouts=stereo,atrim=duration=${duration},asetpts=N/SR/TB,loudnorm=I=-16:TP=-1.5:LRA=7`,
        "-ar",
        "48000",
        "-ac",
        "2",
        "-c:a",
        "pcm_s16le",
        outputPath,
      ],
      { timeout: 10 * 60_000, windowsHide: true },
    );

    const audio = new Uint8Array(await readFile(outputPath));
    const assetPath = await input.repository.writeQuizNarrationAudio(input.channelId, input.episodeId, audio);
    const durationSeconds = wavDurationSeconds(audio);
    const diagnostics = audioDiagnosticsForTimeline(audio, input.timeline);
    await writeFile(path.join(workingDirectory, "narration-diagnostics.json"), `${JSON.stringify(diagnostics, null, 2)}\n`, "utf8");
    await input.repository.saveNarrationMetadata(
      input.channelId,
      input.episodeId,
      assetPath,
      durationSeconds,
      input.voicePlan.segments.length,
      countQuizVoiceWords(input.voicePlan.segments.map((segment) => segment.text).join(" ")),
    );
    return { assetPath, durationSeconds, diagnostics };
  } finally {
    await Promise.all([rm(outputPath, { force: true }), ...temporaryFiles.map((file) => rm(file, { force: true }))]);
  }
}
