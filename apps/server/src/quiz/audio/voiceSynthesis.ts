import { mkdir, readFile } from "node:fs/promises";
import { BUILTIN_DEFAULT_VOICE_PROFILE, VoicePlanSchema, type AppConfig, type VoicePlan } from "@studio/shared";
import type { RepositoryService } from "../../repository.js";
import { runConcurrent } from "../../utils/concurrency.js";
import { quizVoicePacingLimit } from "./voicePolicy.js";
import { wavDurationSeconds } from "../../utils/binary.js";
import {
  MIN_QUIZ_VOICE_SLOWDOWN_TEMPO,
  createSilenceWav,
  enforceQuizVoicePace,
  isStandardPcmWav,
  quizVoicePaceCorrectionTempo,
  segmentPace,
  type QuizVoicePacingClamp,
} from "./voicePacingClamper.js";
import { QUIZ_VOICE_PACING_VERSION, quizVoiceFingerprint, quizVoiceTempo, voicePerformanceConfig } from "./voiceFingerprint.js";
import { renderPerformanceSegment } from "./performanceSegmentRenderer.js";
import { assembleQuizNarration } from "./narrationAssembler.js";

export {
  wavDurationSeconds,
  MIN_QUIZ_VOICE_SLOWDOWN_TEMPO,
  quizVoicePaceCorrectionTempo,
  type QuizVoicePacingClamp,
  createSilenceWav,
  isStandardPcmWav,
  QUIZ_VOICE_PACING_VERSION,
  quizVoiceFingerprint,
  quizVoiceTempo,
  voicePerformanceConfig,
  assembleQuizNarration,
};

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
