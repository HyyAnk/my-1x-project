import { createHash } from "node:crypto";
import { DEFAULT_QUIZ_VOICE_TEMPO_BY_ROLE, type AppConfig, type VoicePlan, type VoiceSegment, type VoiceSegmentRole } from "@studio/shared";

export const QUIZ_VOICE_PACING_VERSION = "paced-v13-expressive-playful";

export function quizVoiceTempo(role: VoicePlan["segments"][number]["role"]): number {
  return DEFAULT_QUIZ_VOICE_TEMPO_BY_ROLE[role] ?? 1.0;
}

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
