import type { QuizIssue, QuizV2, VoicePlan } from "@studio/shared";
import { quizVoiceTargetWordsPerSecond, quizVoiceWordsPerSecond } from "../../audio/voicePolicy.js";

export interface AssessVoiceQaInput {
  quiz: QuizV2;
  voicePlan?: VoicePlan | null;
  measuredAudio?: boolean;
}

export function assessVoiceQa(input: AssessVoiceQaInput): QuizIssue[] {
  const issues: QuizIssue[] = [];

  if (input.voicePlan && input.measuredAudio === false) {
    issues.push({
      code: "voice_measurement_missing",
      severity: "blocker",
      message: "Voice segments exist but measured narration durations are missing.",
      next_action: "Synthesize narration through Chatterbox and persist measured WAV durations.",
      question_ids: [],
      stage: "voice",
    });
  }

  if (input.voicePlan && input.measuredAudio && input.voicePlan.segments.every((segment) => segment.duration_seconds !== null)) {
    const wordsPerSecond = quizVoiceWordsPerSecond(input.voicePlan);
    const target = quizVoiceTargetWordsPerSecond(input.quiz.age_band);
    if (wordsPerSecond > target + 0.45) {
      issues.push({
        code: "voice_pace_unsafe",
        severity: "blocker",
        message: `Measured narration is ${wordsPerSecond.toFixed(2)} words per second for ${input.quiz.age_band}.`,
        next_action: `Regenerate paced quiz voice at or below ${target.toFixed(2)} words per second before rendering.`,
        question_ids: [],
        stage: "voice",
      });
    } else if (wordsPerSecond > target) {
      issues.push({
        code: "voice_pace_fast",
        severity: "warning",
        message: `Measured narration is ${wordsPerSecond.toFixed(2)} words per second for ${input.quiz.age_band}.`,
        next_action: `Slow the question and explanation delivery to ${target.toFixed(2)} words per second or below.`,
        question_ids: [],
        stage: "voice",
      });
    }
  }

  return issues;
}
