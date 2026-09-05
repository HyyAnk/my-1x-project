import path from "node:path";
import { mkdir } from "node:fs/promises";
import {
  ALL_QUIZ_IMAGE_STYLES,
  EpisodeSchema,
  QuizPaletteIdSchema,
  QuizV2Schema,
  makeId,
  nowIso,
  type BankQuestion,
  type Channel,
  type DirectorPlan,
  type Episode,
  type QuizImageStyle,
  type QuizLayoutId,
  type QuizQuestion,
  type QuizV2,
  type Task,
  type TopicCandidate,
} from "@studio/shared";
import type { RepositoryService } from "../../../repository.js";
import {
  DEFAULT_NARRATION_WORDS_PER_SECOND,
  estimateQuizTargetDurationMinutes,
  estimateQuizTargetWordCount,
} from "../../../repository/helpers.js";
import type { TaskManager } from "../../../tasks.js";

export interface CreateEpisodeFromQuestionBankInput {
  question_id: string;
  target_language?: string;
  render_aspect_ratio?: "9:16" | "16:9";
  auto_start_pipeline?: boolean;
  visual_style?: QuizImageStyle | "mixed";
  force?: boolean;
}

export interface CreateEpisodeFromQuestionBankResult {
  episode: Episode;
  task: Task | null;
  cooldown_recorded: boolean;
  quiz: QuizV2;
  director_plan: DirectorPlan;
}

export interface CreateEpisodeFromTopicWithBankInput {
  topic_id: string;
  question_count?: number;
  target_language?: string;
  render_aspect_ratio?: "9:16" | "16:9";
  auto_start_pipeline?: boolean;
  visual_style?: QuizImageStyle | "mixed";
  force?: boolean;
}

export interface CreateEpisodeFromTopicWithBankResult {
  episode: Episode;
  task: Task | null;
  quiz: QuizV2;
  director_plan: DirectorPlan;
  curated_source: "bank_only" | "jit_only" | "hybrid";
  question_ids: string[];
  cooldown_recorded: boolean;
}

export interface BootstrapSingleQuestionEpisodeParams {
  repository: RepositoryService;
  channel: Channel;
  channelId: string;
  bankQuestion: BankQuestion;
  quizQuestion: QuizQuestion;
  targetLanguage: string;
  targetLayout: QuizLayoutId;
  requestedStyle: QuizImageStyle | "mixed";
  resolvedStyle: QuizImageStyle;
  renderAspect: "9:16" | "16:9";
  localizedHook: string;
  localizedPremise: string;
}

export interface BootstrapTopicEpisodeParams {
  repository: RepositoryService;
  channel: Channel;
  channelId: string;
  topic: TopicCandidate;
  quizQuestions: QuizQuestion[];
  targetLanguage: string;
  targetLayout: QuizLayoutId;
  requestedStyle: QuizImageStyle | "mixed";
  resolvedStyle: QuizImageStyle;
  renderAspect: "9:16" | "16:9";
  blueprintDefaultFormat?: string;
  selectedAgeBand?: string;
}

export interface BootstrapEpisodeResult {
  episode: Episode;
  quiz: QuizV2;
  episodeDirectory: string;
  timestamp: string;
}

export function resolveEpisodeVisualStyles(
  channel: Channel,
  requestedStyle: QuizImageStyle | "mixed" = "mixed",
): { requestedStyle: QuizImageStyle | "mixed"; resolvedStyle: QuizImageStyle } {
  const styles = channel.selected_styles?.length ? channel.selected_styles : ALL_QUIZ_IMAGE_STYLES;
  const resolvedStyle: QuizImageStyle =
    requestedStyle === "mixed" ? styles[Math.floor(Math.random() * styles.length)] || "pixar_3d" : requestedStyle;
  return { requestedStyle, resolvedStyle };
}

export function triggerPipelineTask(
  tasks: TaskManager | undefined,
  channelId: string,
  episodeId: string,
  autoStart: boolean = true,
): Task | null {
  if (!autoStart || !tasks) return null;
  try {
    return tasks.submit("GENERATE_PIPELINE", channelId, episodeId);
  } catch {
    return (tasks.submit as any)("PIPELINE", channelId, episodeId);
  }
}

function buildEpisodeRecord(params: {
  episodeId: string;
  channelId: string;
  channelSlug: string;
  episodeSlug: string;
  title: string;
  premise: string;
  hook: string;
  targetDurationMinutes: number;
  targetWordCount: number;
  questionCount: number;
  quizFormat: string;
  ageBand: string;
  visualTheme: string;
  requestedStyle: QuizImageStyle | "mixed";
  resolvedStyle: QuizImageStyle;
  channel: Channel;
  renderAspect: "9:16" | "16:9";
  archetype?: string;
  targetLayout: QuizLayoutId;
  timestamp: string;
}): Episode {
  const channelPalette = QuizPaletteIdSchema.safeParse(params.channel.default_palette_id);
  return EpisodeSchema.parse({
    episode_id: params.episodeId,
    channel_id: params.channelId,
    slug: params.episodeSlug,
    topic: { title: params.title, premise: params.premise, hook: params.hook },
    stage: "SELECTED",
    script_path: `channels/${params.channelSlug}/episodes/${params.episodeSlug}/script.md`,
    research_path: `channels/${params.channelSlug}/episodes/${params.episodeSlug}/research.md`,
    treatment_path: `channels/${params.channelSlug}/episodes/${params.episodeSlug}/treatment.md`,
    visual_bible_path: `channels/${params.channelSlug}/episodes/${params.episodeSlug}/visual_bible.md`,
    scene_plan_path: `channels/${params.channelSlug}/episodes/${params.episodeSlug}/scene_plan.md`,
    dialogue_script_path: `channels/${params.channelSlug}/episodes/${params.episodeSlug}/dialogue_script.md`,
    video_prompts_path: `channels/${params.channelSlug}/episodes/${params.episodeSlug}/video_prompts.md`,
    target_duration_minutes: params.targetDurationMinutes,
    target_word_count: params.targetWordCount,
    quiz_config: {
      question_count: params.questionCount,
      quiz_format: params.quizFormat,
      age_band: params.ageBand,
      answer_mode: "voice_and_reveal",
      visual_theme: params.visualTheme,
      visual_style: params.requestedStyle,
      resolved_visual_style: params.resolvedStyle,
      thinking_bar_style: params.channel.default_thinking_bar_style ?? "auto",
      question_counter_style: params.channel.default_counter_style ?? "auto",
      question_box_style: params.channel.default_question_box_style ?? "auto",
      answer_card_style: params.channel.default_answer_card_style ?? "auto",
      background_style: params.channel.default_background_style ?? "auto",
      palette_id: channelPalette.success ? channelPalette.data : "auto",
      style_preset_id: "auto",
      channel_brand_name: "",
      render_aspect_ratio: params.renderAspect,
      archetype: params.archetype,
      target_layout: params.targetLayout,
    },
    created_at: params.timestamp,
    updated_at: params.timestamp,
  });
}

async function writeEpisodeMarkdownStubs(
  repository: RepositoryService,
  episodeDir: string,
  meta: { title: string; hook: string; premise: string; isTopic?: boolean },
): Promise<void> {
  const dossier = meta.isTopic ? "Research has not started.\n" : "Question Bank direct build.\n";
  const treatment = meta.isTopic ? "Treatment has not started.\n" : "Question Bank direct build.\n";
  const script = meta.isTopic ? "# Script\n\nScript generation has not started.\n" : `# Script\n\n${meta.hook}\n`;
  const brief = meta.isTopic
    ? `# ${meta.title}\n\n## Premise\n\n${meta.premise}\n\n## Hook\n\n${meta.hook}\n`
    : `# ${meta.title}\n\n## Question\n${meta.hook}\n\n## Answer\n${meta.premise}\n`;

  await repository.writeTextAtomic(path.join(episodeDir, "brief.md"), brief);
  await Promise.all([
    repository.writeTextAtomic(path.join(episodeDir, "research.md"), `# Research Dossier\n\n${dossier}`),
    repository.writeTextAtomic(path.join(episodeDir, "treatment.md"), `# Treatment\n\n${treatment}`),
    repository.writeTextAtomic(path.join(episodeDir, "script.md"), script),
    repository.writeTextAtomic(path.join(episodeDir, "visual_bible.md"), "# Episode Visual Bible\n\nVisual development has not started.\n"),
    repository.writeTextAtomic(path.join(episodeDir, "scene_plan.md"), `# Scene Plan\n\n${meta.isTopic ? "Scene breakdown has not started.\n" : ""}`),
    repository.writeTextAtomic(path.join(episodeDir, "dialogue_script.md"), "# Dialogue Script\n\n"),
    repository.writeTextAtomic(path.join(episodeDir, "video_prompts.md"), "# Video Prompts\n\n"),
  ]);
}

/**
 * Bootstraps directory structure, episode record, quiz-v2.json, and markdown stubs for a single-question episode.
 */
export async function bootstrapSingleQuestionEpisode(
  params: BootstrapSingleQuestionEpisodeParams,
): Promise<BootstrapEpisodeResult> {
  const { repository, channel, channelId, bankQuestion, quizQuestion, targetLanguage, targetLayout, requestedStyle, resolvedStyle, renderAspect, localizedHook, localizedPremise } = params;

  const title = `Shorts Quiz: ${localizedHook.slice(0, 50)}`;
  const parentDir = repository.resolvePath("channels", channel.slug, "episodes");
  const episodeSlug = await repository.uniqueSlug(`shorts-${bankQuestion.archetype_id}-${Date.now().toString(36)}`, parentDir);
  const episodeId = makeId("ep");
  const timestamp = nowIso();
  const episodeDirectory = path.join(parentDir, episodeSlug);
  await mkdir(path.join(episodeDirectory, "assets"), { recursive: true });

  const episode = buildEpisodeRecord({
    episodeId,
    channelId,
    channelSlug: channel.slug,
    episodeSlug,
    title,
    premise: localizedPremise,
    hook: localizedHook,
    targetDurationMinutes: 3,
    targetWordCount: 50,
    questionCount: 3,
    quizFormat: quizQuestion.format,
    ageBand: bankQuestion.age_band,
    visualTheme: "candy_pop",
    requestedStyle,
    resolvedStyle,
    channel,
    renderAspect,
    archetype: bankQuestion.archetype_id,
    targetLayout,
    timestamp,
  });

  await repository.writeJsonAtomic(path.join(episodeDirectory, "episode.json"), episode);
  await writeEpisodeMarkdownStubs(repository, episodeDirectory, { title, hook: localizedHook, premise: localizedPremise });

  const quiz: QuizV2 = QuizV2Schema.parse({
    schema_version: 2,
    episode_id: episodeId,
    age_band: bankQuestion.age_band,
    language: targetLanguage,
    questions: [quizQuestion],
  });
  await repository.writeQuiz(channelId, episodeId, quiz);

  return { episode, quiz, episodeDirectory, timestamp };
}

/**
 * Bootstraps directory structure, episode record, quiz-v2.json, markdown stubs, and topic database for a topic episode.
 */
export async function bootstrapTopicEpisode(
  params: BootstrapTopicEpisodeParams,
): Promise<BootstrapEpisodeResult> {
  const { repository, channel, channelId, topic, quizQuestions, targetLanguage, targetLayout, requestedStyle, resolvedStyle, renderAspect, blueprintDefaultFormat, selectedAgeBand } = params;

  const parentDir = repository.resolvePath("channels", channel.slug, "episodes");
  const episodeSlug = await repository.uniqueSlug(topic.title, parentDir);
  const episodeId = makeId("ep");
  const timestamp = nowIso();
  const episodeDirectory = path.join(parentDir, episodeSlug);
  await mkdir(path.join(episodeDirectory, "assets"), { recursive: true });

  const targetDurationMinutes = estimateQuizTargetDurationMinutes(quizQuestions.length);
  const targetWordCount = estimateQuizTargetWordCount(targetDurationMinutes, DEFAULT_NARRATION_WORDS_PER_SECOND);
  const visualTheme = topic.quiz_format === "image_guess" || topic.archetype === "mystery_reveal" ? "jungle_jamboree" : "candy_pop";
  const quizFormat = blueprintDefaultFormat ?? quizQuestions[0]?.format ?? topic.quiz_format ?? "multiple_choice";

  const episode = buildEpisodeRecord({
    episodeId,
    channelId,
    channelSlug: channel.slug,
    episodeSlug,
    title: topic.title,
    premise: topic.premise,
    hook: topic.hook,
    targetDurationMinutes,
    targetWordCount,
    questionCount: quizQuestions.length,
    quizFormat,
    ageBand: (topic.age_band as any) || selectedAgeBand || "family",
    visualTheme,
    requestedStyle,
    resolvedStyle,
    channel,
    renderAspect,
    archetype: topic.archetype,
    targetLayout,
    timestamp,
  });

  await repository.writeJsonAtomic(path.join(episodeDirectory, "episode.json"), episode);
  await writeEpisodeMarkdownStubs(repository, episodeDirectory, { title: topic.title, hook: topic.hook, premise: topic.premise, isTopic: true });
  await repository.writeJsonAtomic(
    path.join(repository.resolvePath("channels", channel.slug), "topic_database.json"),
    (await repository.listTopics(channel.channel_id)).map(({ title, premise }) => ({ title, premise })),
  );

  const quiz: QuizV2 = QuizV2Schema.parse({
    schema_version: 2,
    episode_id: episodeId,
    age_band: (topic.age_band as any) || selectedAgeBand || "family",
    language: targetLanguage,
    questions: quizQuestions,
  });
  await repository.writeQuiz(channelId, episodeId, quiz);

  return { episode, quiz, episodeDirectory, timestamp };
}
