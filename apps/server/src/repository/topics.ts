import { mkdir, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import {
  ALL_QUIZ_IMAGE_STYLES,
  EpisodeSchema,
  TopicCandidateSchema,
  TopicConfirmInputSchema,
  makeId,
  nowIso,
  type Episode,
  type EpisodeSettingsInput,
  type QuizImageStyle,
  type TopicCandidate,
} from "@studio/shared";
import { RepositoryError } from "./errors.js";
import {
  DEFAULT_NARRATION_WORDS_PER_SECOND,
  estimateQuizTargetDurationMinutes,
  estimateQuizTargetWordCount,
  type TopicRun,
} from "./helpers.js";
import type { RepositoryRuntime } from "./runtime.js";

export async function listTopics(this: RepositoryRuntime, channelId: string): Promise<TopicCandidate[]> {
  const channel = await this.getChannel(channelId);
  const directory = this.resolvePath("channels", channel.slug, "topics");
  await mkdir(directory, { recursive: true });
  const entries = await readdir(directory, { withFileTypes: true });
  const all: TopicCandidate[] = [];
  for (const entry of entries.filter((item) => item.isFile() && item.name.endsWith(".json"))) {
    try {
      const run = JSON.parse(await readFile(path.join(directory, entry.name), "utf8")) as TopicRun;
      all.push(...run.candidates.map((candidate) => TopicCandidateSchema.parse(candidate)));
    } catch {
      // Preserve forward compatibility with partially written topic runs.
    }
  }
  return all.sort((a, b) => b.generated_at.localeCompare(a.generated_at));
}

export async function saveTopicRun(this: RepositoryRuntime, channelId: string, candidates: TopicCandidate[]): Promise<void> {
  const channel = await this.getChannel(channelId);
  if (candidates.length !== 5) throw new RepositoryError("A topic suggestion run must contain exactly 5 candidates", "INVALID_TOPIC_RUN");
  const directory = this.resolvePath("channels", channel.slug, "topics");
  await mkdir(directory, { recursive: true });
  const run: TopicRun = { generated_at: nowIso(), candidates: candidates.map((candidate) => TopicCandidateSchema.parse(candidate)) };
  await this.writeJsonAtomic(path.join(directory, `suggestion-${Date.now()}-${makeId("run")}.json`), run);
}

export async function confirmTopic(
  this: RepositoryRuntime,
  channelId: string,
  topicId: string,
  questionCount?: number,
  visualStyle?: QuizImageStyle | "mixed",
): Promise<Episode> {
  const channel = await this.getChannel(channelId);
  const candidate = (await this.listTopics(channelId)).find((topic) => topic.topic_id === topicId);
  if (!candidate) throw new RepositoryError("Topic candidate not found", "TOPIC_NOT_FOUND");
  const parsedConfirm = TopicConfirmInputSchema.parse({ topic_id: topicId, question_count: questionCount, visual_style: visualStyle });
  const selectedQuestionCount = parsedConfirm.question_count ?? candidate.question_count;
  const requestedStyle = parsedConfirm.visual_style ?? candidate.visual_style ?? "mixed";
  const availableStyles = channel.selected_styles && channel.selected_styles.length > 0 ? channel.selected_styles : ALL_QUIZ_IMAGE_STYLES;
  const resolvedStyle: QuizImageStyle =
    requestedStyle === "mixed" ? availableStyles[Math.floor(Math.random() * availableStyles.length)] || "pixar_3d" : requestedStyle;
  const targetDurationMinutes = estimateQuizTargetDurationMinutes(selectedQuestionCount);
  const targetWordCount = estimateQuizTargetWordCount(targetDurationMinutes, DEFAULT_NARRATION_WORDS_PER_SECOND);
  await this.markTopicSelected(channelId, topicId, selectedQuestionCount);
  const episodeSlug = await this.uniqueSlug(candidate.title, this.resolvePath("channels", channel.slug, "episodes"));
  const episodeId = makeId("ep");
  const timestamp = nowIso();
  const episodeDirectory = this.resolvePath("channels", channel.slug, "episodes", episodeSlug);
  await mkdir(path.join(episodeDirectory, "assets"), { recursive: true });
  const episode = EpisodeSchema.parse({
    episode_id: episodeId,
    channel_id: channelId,
    slug: episodeSlug,
    topic: { title: candidate.title, premise: candidate.premise, hook: candidate.hook },
    stage: "SELECTED",
    script_path: `channels/${channel.slug}/episodes/${episodeSlug}/script.md`,
    research_path: `channels/${channel.slug}/episodes/${episodeSlug}/research.md`,
    treatment_path: `channels/${channel.slug}/episodes/${episodeSlug}/treatment.md`,
    visual_bible_path: `channels/${channel.slug}/episodes/${episodeSlug}/visual_bible.md`,
    scene_plan_path: `channels/${channel.slug}/episodes/${episodeSlug}/scene_plan.md`,
    dialogue_script_path: `channels/${channel.slug}/episodes/${episodeSlug}/dialogue_script.md`,
    video_prompts_path: `channels/${channel.slug}/episodes/${episodeSlug}/video_prompts.md`,
    target_duration_minutes: targetDurationMinutes,
    target_word_count: targetWordCount,
    quiz_config: {
      question_count: selectedQuestionCount,
      quiz_format: candidate.quiz_format,
      age_band: candidate.age_band,
      answer_mode: "voice_and_reveal",
      visual_theme: candidate.quiz_format === "image_guess" ? "jungle_jamboree" : "candy_pop",
      visual_style: requestedStyle,
      resolved_visual_style: resolvedStyle,
      thinking_bar_style: channel.default_thinking_bar_style ?? "auto",
      question_counter_style: channel.default_counter_style ?? "auto",
      question_box_style: channel.default_question_box_style ?? "auto",
      answer_card_style: channel.default_answer_card_style ?? "auto",
      palette_id: (channel.default_palette_id as any) ?? "auto",
      style_preset_id: "auto",
      channel_brand_name: "",
    },
    created_at: timestamp,
    updated_at: timestamp,
  });
  await this.writeJsonAtomic(path.join(episodeDirectory, "episode.json"), episode);
  await this.writeTextAtomic(
    path.join(episodeDirectory, "brief.md"),
    `# ${candidate.title}\n\n## Premise\n\n${candidate.premise}\n\n## Hook\n\n${candidate.hook}\n`,
  );
  await Promise.all([
    this.writeTextAtomic(path.join(episodeDirectory, "research.md"), "# Research Dossier\n\nResearch has not started.\n"),
    this.writeTextAtomic(path.join(episodeDirectory, "treatment.md"), "# Documentary Treatment\n\nTreatment has not started.\n"),
    this.writeTextAtomic(path.join(episodeDirectory, "script.md"), "# Script\n\nScript generation has not started.\n"),
    this.writeTextAtomic(path.join(episodeDirectory, "visual_bible.md"), "# Episode Visual Bible\n\nVisual development has not started.\n"),
    this.writeTextAtomic(path.join(episodeDirectory, "scene_plan.md"), "# Scene Plan\n\nScene breakdown has not started.\n"),
    this.writeTextAtomic(path.join(episodeDirectory, "dialogue_script.md"), "# Dialogue Script\n\n"),
    this.writeTextAtomic(path.join(episodeDirectory, "video_prompts.md"), "# Video Prompts\n\n"),
  ]);
  await this.writeJsonAtomic(
    path.join(this.resolvePath("channels", channel.slug), "topic_database.json"),
    (await this.listTopics(channelId)).map(({ title, premise }) => ({ title, premise })),
  );
  await this.updateChannel(channelId, { updated_at: timestamp });
  return episode;
}

export async function updateEpisodeSettings(
  this: RepositoryRuntime,
  channelId: string,
  episodeId: string,
  input: EpisodeSettingsInput,
  wordsPerSecond: number,
): Promise<Episode> {
  const episode = await this.getEpisode(channelId, episodeId);
  const channel = await this.getChannel(channelId);
  let nextResolvedStyle = episode.quiz_config.resolved_visual_style ?? "pixar_3d";
  const nextStyle = input.visual_style ?? episode.quiz_config.visual_style ?? "mixed";
  if (input.visual_style !== undefined) {
    if (input.visual_style === "mixed") {
      const availableStyles =
        channel.selected_styles && channel.selected_styles.length > 0 ? channel.selected_styles : ALL_QUIZ_IMAGE_STYLES;
      nextResolvedStyle = availableStyles[Math.floor(Math.random() * availableStyles.length)] || "pixar_3d";
    } else {
      nextResolvedStyle = input.visual_style;
    }
  } else if (input.resolved_visual_style !== undefined) {
    nextResolvedStyle = input.resolved_visual_style;
  }
  const nextQuizConfig = {
    ...episode.quiz_config,
    ...(input.question_count === undefined ? {} : { question_count: input.question_count }),
    ...(input.quiz_format === undefined ? {} : { quiz_format: input.quiz_format }),
    ...(input.age_band === undefined ? {} : { age_band: input.age_band }),
    ...(input.answer_mode === undefined ? {} : { answer_mode: input.answer_mode }),
    ...(input.visual_theme === undefined ? {} : { visual_theme: input.visual_theme }),
    ...(input.thinking_bar_style === undefined ? {} : { thinking_bar_style: input.thinking_bar_style }),
    ...(input.question_counter_style === undefined ? {} : { question_counter_style: input.question_counter_style }),
    ...(input.question_box_style === undefined ? {} : { question_box_style: input.question_box_style }),
    ...(input.answer_card_style === undefined ? {} : { answer_card_style: input.answer_card_style }),
    ...(input.palette_id === undefined ? {} : { palette_id: input.palette_id }),
    ...(input.style_preset_id === undefined ? {} : { style_preset_id: input.style_preset_id }),
    ...(input.channel_brand_name === undefined ? {} : { channel_brand_name: input.channel_brand_name }),
    visual_style: nextStyle,
    resolved_visual_style: nextResolvedStyle,
  };
  const quizSettingsChanged =
    nextQuizConfig.question_count !== episode.quiz_config.question_count ||
    nextQuizConfig.quiz_format !== episode.quiz_config.quiz_format ||
    nextQuizConfig.age_band !== episode.quiz_config.age_band ||
    nextQuizConfig.visual_theme !== episode.quiz_config.visual_theme ||
    nextQuizConfig.visual_style !== episode.quiz_config.visual_style ||
    nextQuizConfig.resolved_visual_style !== episode.quiz_config.resolved_visual_style ||
    nextQuizConfig.thinking_bar_style !== episode.quiz_config.thinking_bar_style ||
    nextQuizConfig.question_counter_style !== episode.quiz_config.question_counter_style ||
    nextQuizConfig.question_box_style !== episode.quiz_config.question_box_style ||
    nextQuizConfig.answer_card_style !== episode.quiz_config.answer_card_style ||
    nextQuizConfig.palette_id !== episode.quiz_config.palette_id ||
    nextQuizConfig.style_preset_id !== episode.quiz_config.style_preset_id;
  const targetDurationMinutes = input.target_duration_minutes ?? estimateQuizTargetDurationMinutes(nextQuizConfig.question_count);
  const targetWordCount = estimateQuizTargetWordCount(targetDurationMinutes, episode.measured_narration_words_per_second ?? wordsPerSecond);
  const next = EpisodeSchema.parse({
    ...episode,
    target_duration_minutes: targetDurationMinutes,
    target_word_count: targetWordCount,
    quiz_config: nextQuizConfig,
    updated_at: nowIso(),
  });
  await this.writeJsonAtomic(this.resolvePath("channels", channel.slug, "episodes", episode.slug, "episode.json"), next);
  if (quizSettingsChanged) await this.invalidateQuizSourceArtifacts(channelId, episodeId);
  return next;
}

export async function markTopicSelected(this: RepositoryRuntime, channelId: string, topicId: string, questionCount: number): Promise<void> {
  const channel = await this.getChannel(channelId);
  const directory = this.resolvePath("channels", channel.slug, "topics");
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries.filter((item) => item.isFile() && item.name.endsWith(".json"))) {
    const filePath = path.join(directory, entry.name);
    try {
      const run = JSON.parse(await readFile(filePath, "utf8")) as TopicRun;
      let changed = false;
      run.candidates = run.candidates.map((topic) => {
        if (topic.topic_id !== topicId) return topic;
        changed = true;
        return { ...topic, question_count: questionCount, selected: true };
      });
      if (changed) await this.writeJsonAtomic(filePath, run);
    } catch {
      // Ignore malformed historical runs.
    }
  }
}
