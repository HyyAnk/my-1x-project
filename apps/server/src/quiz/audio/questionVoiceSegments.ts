import type { DirectorPlan, QuizPacingProfile, QuizQuestion, QuizV2, VoicePlan } from "@studio/shared";
import type { QuizVoiceCopy } from "./voiceCopy.js";
import { withPhrases } from "./voicePhrases.js";
import { quizShortRevealLine } from "./quizShortVoiceCopy.js";
import { includesExplanationSegment, resolveVoiceGameplayPolicy } from "./voiceSegmentRules.js";

export interface QuestionVoiceSegmentOptions {
  director?: DirectorPlan;
  pacingProfile?: QuizPacingProfile;
}

/** Question, optional choices, optional thinking prompt, reveal and optional explanation. */
export function buildQuestionVoiceSegments(
  quiz: QuizV2,
  question: QuizQuestion,
  questionIndex: number,
  copy: QuizVoiceCopy,
  options?: QuestionVoiceSegmentOptions,
): VoicePlan["segments"] {
  const beat = options?.director?.beats.find((item) => item.question_id === question.id);
  const policy = resolveVoiceGameplayPolicy(question, options?.director, beat, options?.pacingProfile);
  const short = options?.pacingProfile === "short";
  const answer = question.choices.find((choice) => choice.id === question.correct_choice_id)?.text ?? "";
  const segments: VoicePlan["segments"] = [
    withPhrases({
      segment_id: question.id + ":question",
      role: "question",
      question_id: question.id,
      text: copy.question(question.number, question.question),
      duration_seconds: null,
    }),
  ];
  if (question.answer_mode !== "single_reveal" && policy?.readChoices !== false) {
    segments.push(
      withPhrases({
        segment_id: question.id + ":choice",
        role: "choice",
        question_id: question.id,
        text: copy.choices(question.choices.map((choice) => choice.text)),
        duration_seconds: null,
      }),
    );
  }
  if (policy?.thinkingPrompt !== false) {
    segments.push(
      withPhrases({
        segment_id: question.id + ":thinking",
        role: "thinking_prompt",
        question_id: question.id,
        text: copy.thinking[questionIndex % copy.thinking.length],
        duration_seconds: null,
      }),
    );
  }
  segments.push(
    withPhrases({
      segment_id: question.id + ":reveal",
      role: "reveal",
      question_id: question.id,
      text: short ? quizShortRevealLine(question, quiz.language) : copy.reveal(answer),
      duration_seconds: null,
    }),
  );
  if (includesExplanationSegment(quiz, question, policy, options?.pacingProfile)) {
    segments.push(
      withPhrases({
        segment_id: question.id + ":explanation",
        role: "explanation",
        question_id: question.id,
        text: copy.explanation(question.explanation || question.fun_fact),
        duration_seconds: null,
      }),
    );
  }
  return segments;
}
