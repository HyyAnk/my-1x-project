import {
  VoicePlanSchema,
  resolveGameplayPolicy,
  type BridgeSceneConfig,
  type DirectorPlan,
  type QuizV2,
  type VoicePhrase,
  type VoiceSegmentRole,
  type VoicePlan,
} from "@studio/shared";
import { sanitizeTextForSpeech, splitSmartPunctuationPhrases, canSplitBetweenWords } from "../../utils/speechSanitizer.js";
import { resolveQuizVoiceCopy, resolveKickoffClosing } from "./voiceCopy.js";

export {
  CHINESE_OUTRO_CLOSING_VARIANTS,
  ENGLISH_OUTRO_CLOSING_VARIANTS,
  resolveOutroClosing,
  CHINESE_KICKOFF_VARIANTS,
  ENGLISH_KICKOFF_VARIANTS,
  resolveKickoffClosing,
} from "./voiceCopy.js";

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

export function buildQuizVoicePlan(
  quiz: QuizV2,
  options?: BuildQuizVoicePlanOptions,
): VoicePlan {
  const copy = resolveQuizVoiceCopy(quiz.language, quiz.episode_id);
  const segments: VoicePlan["segments"] = [];
  if (!options?.skipIntro) {
    segments.push({
      segment_id: "intro",
      role: "intro",
      question_id: null,
      text: copy.intro,
      duration_seconds: null,
      phrases: performancePhrases(copy.intro, "intro"),
    });
  }

  const shouldIncludeBridge =
    options?.includeBridgeSegments ??
    (options?.bridgeConfig?.enabled === true || Boolean(options?.channelName && options?.topic));

  if (shouldIncludeBridge) {
    if (options?.bridgeConfig?.enableTopicScene !== false) {
      const topic = cleanTopicForSpeech(options?.topic || (quiz as { topic?: string }).topic);
      const topicText = copy.topicTeaser(quiz.questions.length, topic);
      segments.push(
        withPhrases({
          segment_id: "intro_topic",
          role: "intro_topic",
          question_id: null,
          text: topicText,
          duration_seconds: null,
        }),
      );
    }

    if (options?.bridgeConfig?.enableCtaScene !== false) {
      const channelName = options?.channelName?.trim() || "our channel";
      let ctaText = copy.subscribeCta(channelName, options?.customCtaText);
      if (
        options?.customCtaText &&
        !/(?:let's\s+(?:go|do this|dive in)|here we go|game on|ready\?|出发|马上开始)/i.test(ctaText)
      ) {
        const kickoff = resolveKickoffClosing(quiz.language, quiz.episode_id);
        ctaText = `${ctaText.replace(/[!.,\s]+$/, "")}! ${kickoff}`;
      }
      segments.push(
        withPhrases({
          segment_id: "intro_cta",
          role: "intro_cta",
          question_id: null,
          text: ctaText,
          duration_seconds: null,
        }),
      );
    }
  }
  quiz.questions.forEach((question, index) => {
    const beat = options?.director?.beats.find((item) => item.question_id === question.id);
    const policy =
      options?.director?.gameplay_policy_version || question.gameplay_id ? resolveGameplayPolicy({ ...question, ...beat }) : undefined;
    const answer = question.choices.find((choice) => choice.id === question.correct_choice_id)?.text ?? "";
    segments.push(
      withPhrases({
        segment_id: question.id + ":question",
        role: "question",
        question_id: question.id,
        text: copy.question(question.number, question.question),
        duration_seconds: null,
      }),
    );
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
    if (policy?.thinkingPrompt !== false)
      segments.push(
        withPhrases({
          segment_id: question.id + ":thinking",
          role: "thinking_prompt",
          question_id: question.id,
          text: copy.thinking[index % copy.thinking.length],
          duration_seconds: null,
        }),
      );
    segments.push(
      withPhrases({
        segment_id: question.id + ":reveal",
        role: "reveal",
        question_id: question.id,
        text: copy.reveal(answer),
        duration_seconds: null,
      }),
      withPhrases({
        segment_id: question.id + ":explanation",
        role: "explanation",
        question_id: question.id,
        text: copy.explanation(question.explanation || question.fun_fact),
        duration_seconds: null,
      }),
    );
  });

  const shouldIncludePreOutro =
    !options?.skipPreOutro &&
    shouldIncludeBridge &&
    options?.bridgeConfig?.enablePreOutroScene !== false;

  if (shouldIncludePreOutro) {
    const preOutroText = copy.preOutro(
      options?.customPreOutroText || options?.bridgeConfig?.customPreOutroText,
    );
    segments.push(
      withPhrases({
        segment_id: "pre_outro",
        role: "pre_outro",
        question_id: null,
        text: preOutroText,
        duration_seconds: null,
      }),
    );
  }

  if (!options?.skipOutro) {
    segments.push(withPhrases({ segment_id: "outro", role: "outro", question_id: null, text: copy.outro, duration_seconds: null }));
  }
  return VoicePlanSchema.parse({ schema_version: 2, episode_id: quiz.episode_id, segments });
}

function withPhrases(segment: Omit<VoicePlan["segments"][number], "phrases">): VoicePlan["segments"][number] {
  return { ...segment, phrases: performancePhrases(segment.text, segment.role) };
}

export function performancePhrases(text: string, role: VoiceSegmentRole): VoicePhrase[] {
  const normalized = sanitizeTextForSpeech(text.trim().replace(/\s+/g, " "));
  const chunks =
    role === "question"
      ? splitQuestionPhrases(normalized)
      : role === "choice"
        ? splitChoicePhrases(normalized)
        : role === "intro"
          ? [normalized]
          : splitPunctuationPhrases(normalized);
  return chunks.map((phrase, index) => {
    const isLastChunk = index === chunks.length - 1;
    const isCtaKickoff =
      role === "intro_cta" &&
      (isLastChunk || /(?:let's\s+(?:go|do this|dive in)|here we go|game on|ready\?|出发|马上开始)/i.test(phrase));

    return {
      text: phrase,
      delivery:
        role === "reveal"
          ? "emphasis"
          : isCtaKickoff
            ? "emphasis"
            : role === "pre_outro"
              ? isLastChunk
                ? "emphasis"
                : "playful"
              : role === "fun_fact" || role === "explanation" || role === "intro_topic"
              ? "warm"
              : role === "outro" || role === "intro" || role === "intro_cta" || role === "thinking_prompt"
                ? "playful"
                : role === "question" && isLastChunk
                  ? "question_end"
                  : index === 1
                    ? "emphasis"
                    : "normal",
      pause_after:
        isLastChunk
          ? "none"
          : role === "outro" && index === 0
            ? "long"
            : role === "question" || role === "intro_cta" || role === "intro_topic"
              ? "phrase"
              : role === "reveal"
                ? "anticipation"
                : "micro",
    };
  });
}

function splitQuestionPhrases(text: string): string[] {
  const punctuation = splitPunctuationPhrases(text);
  if (punctuation.length > 1) return punctuation;
  const words = text.split(" ").filter(Boolean);
  if (words.length <= 12) return [text];

  const midpoint = Math.round(words.length / 2);
  let bestSplit = -1;
  let bestScore = Number.POSITIVE_INFINITY;

  for (let i = 3; i <= words.length - 3; i++) {
    if (!canSplitBetweenWords(words[i - 1], words[i])) continue;
    const word = words[i].replace(/^[^A-Za-zÀ-ỹ]+/, "").toLowerCase();
    const isConjunction = /^(and|or|but|because|although|when|while|which|that|who|whom|where|if|as)$/i.test(word);
    const score = (isConjunction ? 0 : 5) + Math.abs(i - midpoint);
    if (score < bestScore) {
      bestScore = score;
      bestSplit = i;
    }
  }

  if (bestSplit > 0) {
    return [words.slice(0, bestSplit).join(" "), words.slice(bestSplit).join(" ")];
  }
  return [text];
}

export function splitChoicePhrases(text: string): string[] {
  const commaParts = text
    .split(/(?<=,)\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
  if (commaParts.length <= 1) return splitPunctuationPhrases(text);

  const phrases: string[] = [];
  let current: string[] = [];
  for (const [index, part] of commaParts.entries()) {
    current.push(part);
    const wordsBeforeBoundary = current.join(" ").split(/\s+/).filter(Boolean).length;
    const wordsAfterBoundary = commaParts
      .slice(index + 1)
      .join(" ")
      .split(/\s+/)
      .filter(Boolean).length;
    if (wordsAfterBoundary >= 3 && wordsBeforeBoundary >= 3) {
      phrases.push(current.join(" "));
      current = [];
    }
  }
  if (current.length) phrases.push(current.join(" "));
  return phrases.length > 1 ? phrases : [text];
}

export function splitPunctuationPhrases(text: string): string[] {
  return splitSmartPunctuationPhrases(text);
}
