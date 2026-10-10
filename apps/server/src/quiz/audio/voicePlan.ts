import {
  VoicePlanSchema,
  type BridgeSceneConfig,
  type DirectorPlan,
  type QuizPacingProfile,
  type QuizV2,
  type VoicePlan,
} from "@studio/shared";
import { resolveQuizVoiceCopy, resolveKickoffClosing, type QuizVoiceCopy } from "./voiceCopy.js";
import { insertMidRollCtaSegment, MID_ROLL_CTA_SEGMENT_ROLE, resolveMidRollCtaAnchorIndex } from "../bridge/midRollCta.js";
import { withPhrases } from "./voicePhrases.js";
import { buildQuestionVoiceSegments } from "./questionVoiceSegments.js";
import { quizShortKickoffLine } from "./quizShortVoiceCopy.js";

export {
  CHINESE_OUTRO_CLOSING_VARIANTS,
  ENGLISH_OUTRO_CLOSING_VARIANTS,
  resolveOutroClosing,
  CHINESE_KICKOFF_VARIANTS,
  ENGLISH_KICKOFF_VARIANTS,
  resolveKickoffClosing,
} from "./voiceCopy.js";
export { performancePhrases, splitChoicePhrases, splitPunctuationPhrases } from "./voicePhrases.js";

/** Segment id of the Quiz Short kickoff line; the timeline kickoff stage schedules it. */
export const QUIZ_SHORT_KICKOFF_SEGMENT_ID = "kickoff";

export interface BuildQuizVoicePlanOptions {
  skipIntro?: boolean;
  skipOutro?: boolean;
  skipPreOutro?: boolean;
  director?: DirectorPlan;
  channelName?: string;
  topic?: string;
  bridgeConfig?: BridgeSceneConfig;
  customCtaText?: string;
  customPreOutroText?: string;
  includeBridgeSegments?: boolean;
  /**
   * "short" (Quiz Short): kickoff line instead of the intro, no choice or thinking prompt
   * segments, label-plus-answer reveal, no explanation, no bridge, pre-outro or outro.
   */
  pacingProfile?: QuizPacingProfile;
}

export function cleanTopicForSpeech(rawTopic?: string): string {
  if (!rawTopic || !rawTopic.trim()) return "today's quiz";
  let topic = rawTopic.trim();
  if (topic.includes(" - ")) {
    const parts = topic.split(" - ");
    if (parts[0] && parts[0].trim().length >= 4) topic = parts[0].trim();
  } else if (topic.includes(": ")) {
    const parts = topic.split(": ");
    if (parts[0] && parts[0].trim().length >= 4) topic = parts[0].trim();
  }
  return topic.replace(/[!?,;.:]+$/, "").trim();
}

type VoicePlanStages = {
  short: boolean;
  intro: boolean;
  topic: boolean;
  midRollCta: boolean;
  preOutro: boolean;
  outro: boolean;
};

/** Which optional stages this plan narrates; the short profile keeps only the kickoff and the questions. */
function resolveVoicePlanStages(options?: BuildQuizVoicePlanOptions): VoicePlanStages {
  const short = options?.pacingProfile === "short";
  const bridge =
    !short &&
    (options?.includeBridgeSegments ?? (options?.bridgeConfig?.enabled === true || Boolean(options?.channelName && options?.topic)));
  return {
    short,
    intro: !options?.skipIntro,
    topic: bridge && options?.bridgeConfig?.enableTopicScene !== false,
    midRollCta: bridge && options?.bridgeConfig?.enableCtaScene !== false,
    preOutro: bridge && !options?.skipPreOutro && options?.bridgeConfig?.enablePreOutroScene !== false,
    outro: !short && !options?.skipOutro,
  };
}

export function buildQuizVoicePlan(quiz: QuizV2, options?: BuildQuizVoicePlanOptions): VoicePlan {
  const copy = resolveQuizVoiceCopy(quiz.language, quiz.episode_id);
  const stages = resolveVoicePlanStages(options);
  const segments: VoicePlan["segments"] = [];
  if (stages.intro) segments.push(stages.short ? buildKickoffSegment(quiz) : buildIntroSegment(copy));
  if (stages.topic) segments.push(buildTopicSegment(quiz, copy, options));

  quiz.questions.forEach((question, index) => {
    segments.push(
      ...buildQuestionVoiceSegments(quiz, question, index, copy, { director: options?.director, pacingProfile: options?.pacingProfile }),
    );
  });

  if (stages.midRollCta) {
    const anchorIndex = resolveMidRollCtaAnchorIndex(quiz.questions.length);
    insertMidRollCtaSegment(
      segments,
      buildSubscribeCtaSegment(quiz, copy, options),
      anchorIndex === null ? undefined : quiz.questions[anchorIndex]?.id,
    );
  }
  if (stages.preOutro) segments.push(buildPreOutroSegment(copy, options));
  if (stages.outro)
    segments.push(withPhrases({ segment_id: "outro", role: "outro", question_id: null, text: copy.outro, duration_seconds: null }));
  return VoicePlanSchema.parse({ schema_version: 2, episode_id: quiz.episode_id, segments });
}

function buildTopicSegment(quiz: QuizV2, copy: QuizVoiceCopy, options?: BuildQuizVoicePlanOptions): VoicePlan["segments"][number] {
  const topic = cleanTopicForSpeech(options?.topic || (quiz as { topic?: string }).topic);
  return withPhrases({
    segment_id: "intro_topic",
    role: "intro_topic",
    question_id: null,
    text: copy.topicTeaser(quiz.questions.length, topic),
    duration_seconds: null,
  });
}

function buildPreOutroSegment(copy: QuizVoiceCopy, options?: BuildQuizVoicePlanOptions): VoicePlan["segments"][number] {
  const preOutroText = copy.preOutro(options?.customPreOutroText || options?.bridgeConfig?.customPreOutroText);
  return withPhrases({ segment_id: "pre_outro", role: "pre_outro", question_id: null, text: preOutroText, duration_seconds: null });
}

function buildIntroSegment(copy: QuizVoiceCopy): VoicePlan["segments"][number] {
  return withPhrases({ segment_id: "intro", role: "intro", question_id: null, text: copy.intro, duration_seconds: null });
}

function buildKickoffSegment(quiz: QuizV2): VoicePlan["segments"][number] {
  return withPhrases({
    segment_id: QUIZ_SHORT_KICKOFF_SEGMENT_ID,
    role: "intro",
    question_id: null,
    text: quizShortKickoffLine(quiz.questions.length, quiz.language),
    duration_seconds: null,
  });
}

function buildSubscribeCtaSegment(
  quiz: QuizV2,
  copy: QuizVoiceCopy,
  options: BuildQuizVoicePlanOptions | undefined,
): VoicePlan["segments"][number] {
  const channelName = options?.channelName?.trim() || "our channel";
  let ctaText = copy.subscribeCta(channelName, options?.customCtaText);
  if (options?.customCtaText && !/(?:let's\s+(?:go|do this|dive in)|here we go|game on|ready\?|出发|马上开始)/i.test(ctaText)) {
    const kickoff = resolveKickoffClosing(quiz.language, quiz.episode_id);
    ctaText = `${ctaText.replace(/[!.,\s]+$/, "")}! ${kickoff}`;
  }
  return withPhrases({
    segment_id: MID_ROLL_CTA_SEGMENT_ROLE,
    role: MID_ROLL_CTA_SEGMENT_ROLE,
    question_id: null,
    text: ctaText,
    duration_seconds: null,
  });
}
