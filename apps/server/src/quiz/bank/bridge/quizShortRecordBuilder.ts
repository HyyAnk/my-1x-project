import {
  QuizPaletteIdSchema,
  QuizShortConfigSchema,
  QuizShortSchema,
  QuizV2Schema,
  type Channel,
  type DirectorPlan,
  type QuizImageStyle,
  type QuizQuestion,
  type QuizShort,
  type QuizShortConfig,
  type QuizShortLayoutPair,
  type QuizShortTopicCandidate,
  type QuizV2,
} from "@studio/shared";
import { createQuizShortDirectorPlan, resolveQuizShortLayoutPair } from "../../director/quizShortDirectorPlan.js";
import { resolveEpisodeVisualStyles } from "./bootstrapperHelpers.js";
import { applyChannelBeatStyleDefaults } from "./channelBeatStyleDefaults.js";
import { QUIZ_SHORT_RENDER_ASPECT } from "./quizShortConfirmationConfig.js";

export interface BuildQuizShortQuizParams {
  quizShortId: string;
  ageBand: QuizV2["age_band"];
  targetLanguage: string;
  questions: QuizQuestion[];
}

/** The quiz keeps the Episode shape; `episode_id` carries the Quiz Short id like every other product artifact. */
export function buildQuizShortQuiz(params: BuildQuizShortQuizParams): QuizV2 {
  return QuizV2Schema.parse({
    schema_version: 2,
    episode_id: params.quizShortId,
    age_band: params.ageBand,
    language: params.targetLanguage,
    questions: params.questions,
  });
}

export interface BuildQuizShortConfigParams {
  topic: QuizShortTopicCandidate;
  channel: Channel;
  questionCount: number;
  layoutPair: QuizShortLayoutPair;
  inputVisualStyle?: QuizImageStyle | "mixed";
}

/** Quiz config from the candidate plus the channel's visual defaults, locked to portrait. */
export function buildQuizShortConfig(params: BuildQuizShortConfigParams): QuizShortConfig {
  const { topic, channel, questionCount, layoutPair, inputVisualStyle } = params;
  const { requestedStyle, resolvedStyle } = resolveEpisodeVisualStyles(channel, inputVisualStyle);
  const channelPalette = QuizPaletteIdSchema.safeParse(channel.default_palette_id);
  return QuizShortConfigSchema.parse({
    question_count: questionCount,
    age_band: topic.age_band,
    archetype: topic.archetype,
    layout_pair: layoutPair,
    visual_style: requestedStyle,
    resolved_visual_style: resolvedStyle,
    thinking_bar_style: channel.default_thinking_bar_style ?? "auto",
    question_counter_style: channel.default_counter_style ?? "auto",
    question_box_style: channel.default_question_box_style ?? "auto",
    answer_card_style: channel.default_answer_card_style ?? "auto",
    background_style: channel.default_background_style ?? "auto",
    palette_id: channelPalette.success ? channelPalette.data : "auto",
    render_aspect_ratio: QUIZ_SHORT_RENDER_ASPECT,
    thumbnail_aspect_ratio: QUIZ_SHORT_RENDER_ASPECT,
  });
}

export interface BuildQuizShortRecordParams {
  quizShortId: string;
  channelId: string;
  slug: string;
  topic: QuizShortTopicCandidate;
  config: QuizShortConfig;
  timestamp: string;
}

/** Builds the validated record persisted as `quiz_short.json`, starting at the SELECTED stage. */
export function buildQuizShortRecord(params: BuildQuizShortRecordParams): QuizShort {
  const { quizShortId, channelId, slug, topic, config, timestamp } = params;
  return QuizShortSchema.parse({
    quiz_short_id: quizShortId,
    channel_id: channelId,
    slug,
    topic: { title: topic.title, premise: topic.premise, hook: topic.hook },
    stage: "SELECTED",
    quiz_config: config,
    created_at: timestamp,
    updated_at: timestamp,
  });
}

export interface BuildConfiguredQuizShortParams {
  quizShortId: string;
  channel: Channel;
  slug: string;
  topic: QuizShortTopicCandidate;
  finalQuizQuestions: QuizQuestion[];
  layoutPair: QuizShortLayoutPair;
  targetLanguage: string;
  timestamp: string;
  inputVisualStyle?: QuizImageStyle | "mixed";
}

/** Builds the record, the quiz and the portrait director plan from the final localized questions. */
export function buildConfiguredQuizShort(params: BuildConfiguredQuizShortParams): {
  quizShort: QuizShort;
  quiz: QuizV2;
  directorPlan: DirectorPlan;
} {
  const { quizShortId, channel, slug, topic, finalQuizQuestions, layoutPair, targetLanguage, timestamp, inputVisualStyle } = params;
  const quiz = buildQuizShortQuiz({ quizShortId, ageBand: topic.age_band, targetLanguage, questions: finalQuizQuestions });
  const config = buildQuizShortConfig({
    topic,
    channel,
    questionCount: finalQuizQuestions.length,
    layoutPair: resolveQuizShortLayoutPair(quiz, { layout_pair: layoutPair }),
    inputVisualStyle,
  });
  const quizShort = buildQuizShortRecord({ quizShortId, channelId: channel.channel_id, slug, topic, config, timestamp });
  const directorPlan = applyChannelBeatStyleDefaults(createQuizShortDirectorPlan(quiz, config), channel);
  return { quizShort, quiz, directorPlan };
}
