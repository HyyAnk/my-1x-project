import {
  EpisodeSchema,
  QuizConfigSchema,
  QuizPaletteIdSchema,
  type Channel,
  type Episode,
  type EpisodeTopicCandidate,
  type QuizImageStyle,
  type TopicCandidate,
} from "@studio/shared";
import { RepositoryError } from "../../repository/errors.js";
import { buildEpisodePaths } from "./confirmationPathBuilder.js";

/**
 * Asserts that a topic candidate has canonical source bindings when required.
 * Rejects unbound legacy candidates that carry archetype or slot metadata.
 */
export function assertConfirmableCandidate(candidate: TopicCandidate): void {
  if (!candidate.source_bindings || candidate.source_bindings.length === 0) {
    if (
      candidate.archetype ||
      (candidate as { slot_id?: string }).slot_id ||
      candidate.suggested_layout ||
      candidate.topic_id.toLowerCase().includes("unbound") ||
      candidate.topic_id.toLowerCase().includes("legacy")
    ) {
      throw new RepositoryError(
        "UNBOUND_LEGACY_TOPIC: Cannot confirm unbound legacy topic candidate. Re-suggest topics to bind canonical sources.",
        "UNBOUND_LEGACY_TOPIC",
      );
    }
  }
}

/**
 * Assembles the full quiz configuration for an episode candidate.
 */
export function buildQuizConfig(
  candidate: EpisodeTopicCandidate,
  channel: Channel,
  selectedQuestionCount: number,
  requestedStyle: QuizImageStyle | "mixed",
  resolvedStyle: QuizImageStyle,
): Episode["quiz_config"] {
  const channelPalette = QuizPaletteIdSchema.safeParse(channel.default_palette_id);
  return QuizConfigSchema.parse({
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
    background_style: channel.default_background_style ?? "auto",
    palette_id: channelPalette.success ? channelPalette.data : "auto",
    style_preset_id: "auto",
    channel_brand_name: "",
    render_aspect_ratio: "16:9",
    archetype: candidate.archetype,
    target_layout: candidate.suggested_layout,
  });
}

export interface BuildEpisodeParams {
  episodeId: string;
  channelId: string;
  channelSlug: string;
  episodeSlug: string;
  candidate: EpisodeTopicCandidate;
  selectedQuestionCount: number;
  requestedStyle: QuizImageStyle | "mixed";
  resolvedStyle: QuizImageStyle;
  channel: Channel;
  targetDurationMinutes: number;
  targetWordCount: number;
  timestamp: string;
}

/**
 * Builds the initial episode domain object with complete metadata and quiz configuration.
 */
export function buildEpisodeSkeleton(params: BuildEpisodeParams): Episode {
  return EpisodeSchema.parse({
    episode_id: params.episodeId,
    channel_id: params.channelId,
    slug: params.episodeSlug,
    topic: { title: params.candidate.title, premise: params.candidate.premise, hook: params.candidate.hook },
    stage: "SELECTED",
    ...buildEpisodePaths(params.channelSlug, params.episodeSlug),
    target_duration_minutes: params.targetDurationMinutes,
    target_word_count: params.targetWordCount,
    quiz_config: buildQuizConfig(
      params.candidate,
      params.channel,
      params.selectedQuestionCount,
      params.requestedStyle,
      params.resolvedStyle,
    ),
    created_at: params.timestamp,
    updated_at: params.timestamp,
  });
}
