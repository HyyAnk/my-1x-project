import {
  ALL_QUIZ_IMAGE_STYLES,
  EpisodeSchema,
  nowIso,
  type Episode,
  type EpisodeSettingsInput,
  type QuizImageStyle,
} from "@studio/shared";
import { estimateQuizTargetDurationMinutes, estimateQuizTargetWordCount } from "./helpers.js";
import type { RepositoryRuntime } from "./runtime.js";

function resolveNextResolvedStyle(
  inputStyle?: QuizImageStyle | "mixed",
  inputResolved?: QuizImageStyle,
  currentResolved?: QuizImageStyle,
  channelStyles?: QuizImageStyle[],
): QuizImageStyle {
  if (inputStyle !== undefined) {
    if (inputStyle === "mixed") {
      const availableStyles = channelStyles && channelStyles.length > 0 ? channelStyles : ALL_QUIZ_IMAGE_STYLES;
      return availableStyles[Math.floor(Math.random() * availableStyles.length)] || "pixar_3d";
    }
    return inputStyle;
  }
  if (inputResolved !== undefined) {
    return inputResolved;
  }
  return currentResolved ?? "pixar_3d";
}

function hasQuizSourceSettingsChanged(next: Episode["quiz_config"], prev: Episode["quiz_config"]): boolean {
  return (
    next.question_count !== prev.question_count ||
    next.quiz_format !== prev.quiz_format ||
    next.age_band !== prev.age_band ||
    next.visual_style !== prev.visual_style ||
    next.resolved_visual_style !== prev.resolved_visual_style
  );
}

function hasRenderStyleSettingsChanged(next: Episode["quiz_config"], prev: Episode["quiz_config"]): boolean {
  return (
    next.visual_theme !== prev.visual_theme ||
    next.thinking_bar_style !== prev.thinking_bar_style ||
    next.question_counter_style !== prev.question_counter_style ||
    next.question_box_style !== prev.question_box_style ||
    next.answer_card_style !== prev.answer_card_style ||
    next.background_style !== prev.background_style ||
    next.palette_id !== prev.palette_id ||
    next.style_preset_id !== prev.style_preset_id ||
    next.render_aspect_ratio !== prev.render_aspect_ratio
  );
}

function computeUpdatedQuizConfig(
  prev: Episode["quiz_config"],
  input: EpisodeSettingsInput,
  nextResolvedStyle: QuizImageStyle,
): Episode["quiz_config"] {
  const nextStyle = input.visual_style ?? prev.visual_style ?? "mixed";
  const nextConfig = {
    ...prev,
    ...(input.question_count === undefined ? {} : { question_count: input.question_count }),
    ...(input.quiz_format === undefined ? {} : { quiz_format: input.quiz_format }),
    ...(input.age_band === undefined ? {} : { age_band: input.age_band }),
    ...(input.answer_mode === undefined ? {} : { answer_mode: input.answer_mode }),
    ...(input.visual_theme === undefined ? {} : { visual_theme: input.visual_theme }),
    ...(input.thinking_bar_style === undefined ? {} : { thinking_bar_style: input.thinking_bar_style }),
    ...(input.question_counter_style === undefined ? {} : { question_counter_style: input.question_counter_style }),
    ...(input.question_box_style === undefined ? {} : { question_box_style: input.question_box_style }),
    ...(input.answer_card_style === undefined ? {} : { answer_card_style: input.answer_card_style }),
    ...(input.background_style === undefined ? {} : { background_style: input.background_style }),
    ...(input.palette_id === undefined ? {} : { palette_id: input.palette_id }),
    ...(input.style_preset_id === undefined ? {} : { style_preset_id: input.style_preset_id }),
    ...(input.channel_brand_name === undefined ? {} : { channel_brand_name: input.channel_brand_name }),
    ...(input.render_aspect_ratio === undefined ? {} : { render_aspect_ratio: input.render_aspect_ratio }),
    ...(input.thumbnail_aspect_ratio === undefined ? {} : { thumbnail_aspect_ratio: input.thumbnail_aspect_ratio }),
    ...(input.intro_outro_style_id === undefined ? {} : { intro_outro_style_id: input.intro_outro_style_id }),
    visual_style: nextStyle,
    resolved_visual_style: nextResolvedStyle,
  };

  if (hasRenderStyleSettingsChanged(nextConfig, prev)) {
    nextConfig.style_catalog_revision = undefined;
  }
  return nextConfig;
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
  const nextResolvedStyle = resolveNextResolvedStyle(
    input.visual_style,
    input.resolved_visual_style,
    episode.quiz_config.resolved_visual_style,
    channel.selected_styles,
  );
  const nextQuizConfig = computeUpdatedQuizConfig(episode.quiz_config, input, nextResolvedStyle);
  const quizSourceSettingsChanged = hasQuizSourceSettingsChanged(nextQuizConfig, episode.quiz_config);
  const renderStyleSettingsChanged = hasRenderStyleSettingsChanged(nextQuizConfig, episode.quiz_config);

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
  this.entityIdResolver.setEpisodeSlug(channelId, next.episode_id, next.slug);

  if (quizSourceSettingsChanged) {
    await this.invalidateQuizSourceArtifacts(channelId, episodeId);
  } else if (renderStyleSettingsChanged) {
    await this.invalidateQuizArtifacts(channelId, episodeId, ["style", "qa"]);
  }

  return next;
}
