import {
  DirectorPlanSchema,
  QuizPaletteIdSchema,
  QuizConfigSchema,
  getQuizGameplayArchetype,
  type Channel,
  type DirectorArchetype,
  type DirectorPlan,
  type MascotRenderAspectRatio,
  type QuizLayoutId,
  type QuizQuestion,
  type QuizV2,
  type TopicCandidate,
} from "@studio/shared";
import { createEpisodeDirectorPlan } from "../../director/episodeDirectorPlan.js";

/**
 * Maps a quiz archetype identifier to a corresponding DirectorArchetype.
 */
export function mapToDirectorArchetype(archetypeId?: string, fallback: DirectorArchetype = "text_multiple_choice"): DirectorArchetype {
  switch (archetypeId) {
    case "mystery_reveal":
      return "mystery_reveal";
    case "versus_faceoff":
    case "visual_identification":
      return "visual_multiple_choice";
    case "verdict_true_false":
    case "verdict_fact_myth":
      return "true_false";
    case "visual_spotting":
      return "odd_one_out";
    case "speed_blitz":
      return "speed_round";
    default:
      return fallback;
  }
}

export function resolveTargetLayoutForTopic(topic: TopicCandidate, aspectRatio: MascotRenderAspectRatio = "16:9"): QuizLayoutId {
  if (aspectRatio !== "16:9") {
    throw new Error("Episode layouts support 16:9 landscape only");
  }
  const suggestedLayout = topic.content_kind === "episode" ? topic.suggested_layout : undefined;
  if (suggestedLayout) {
    return suggestedLayout;
  }
  if (topic.archetype) {
    const bp = getQuizGameplayArchetype(topic.archetype);
    if (bp?.targetLayout) return bp.targetLayout;
    switch (topic.archetype) {
      case "mystery_reveal":
        return "mystery_reveal";
      case "verdict_true_false":
      case "verdict_fact_myth":
        return "verdict_true_false";
      case "versus_faceoff":
        return "split_versus_two";
      case "visual_spotting":
        return "visual_choices_three_pure";
      case "visual_identification":
        return "visual_choices_three";
      case "speed_blitz":
        return "full_stack_list";
      case "deep_trivia":
        return "media_left_choices_right";
    }
  }
  if (topic.quiz_format === "true_false") {
    return "verdict_true_false";
  }
  if (topic.quiz_format === "odd_one_out") {
    return "visual_choices_three_pure";
  }
  if (topic.quiz_format === "image_guess") {
    return "mystery_reveal";
  }
  return "media_left_choices_right";
}

export interface BuildSingleQuestionDirectorPlanParams {
  ageBand?: QuizV2["age_band"];
  episodeId: string;
  quizQuestion: QuizQuestion;
  archetypeId?: string;
  channel: Channel;
  targetLayout: QuizLayoutId;
}

/**
 * Builds an archetype-tailored DirectorPlan for a single question episode.
 */
export function buildSingleQuestionDirectorPlan(params: BuildSingleQuestionDirectorPlanParams): DirectorPlan {
  const { episodeId, quizQuestion, archetypeId, channel, targetLayout } = params;
  const channelPalette = QuizPaletteIdSchema.safeParse(channel.default_palette_id);
  const plan = createEpisodeDirectorPlan(
    { schema_version: 2, episode_id: episodeId, age_band: params.ageBand ?? "7-9", language: channel.language, questions: [quizQuestion] },
    QuizConfigSchema.parse({ archetype: archetypeId, target_layout: targetLayout }),
  );
  return DirectorPlanSchema.parse({
    ...plan,
    beats: plan.beats.map((beat) => ({
      ...beat,
      palette_id: channelPalette.success ? channelPalette.data : "auto",
      thinking_bar_style: channel.default_thinking_bar_style ?? "auto",
      question_counter_style: channel.default_counter_style ?? "auto",
      question_box_style: channel.default_question_box_style ?? "auto",
      answer_card_style: channel.default_answer_card_style ?? "auto",
      background_style: channel.default_background_style ?? "auto",
    })),
  });
}

/**
 * Builds an archetype-tailored DirectorPlan for multi-question topic episodes.
 */
export function buildTopicDirectorPlan(
  quiz: QuizV2,
  topic: TopicCandidate,
  channel: Channel,
  targetLayout: QuizLayoutId,
  aspectRatio: MascotRenderAspectRatio = "16:9",
): DirectorPlan {
  const basePlan = createEpisodeDirectorPlan(
    quiz,
    QuizConfigSchema.parse({
      archetype: topic.archetype,
      target_layout: targetLayout,
      render_aspect_ratio: aspectRatio,
    }),
  );
  const channelPalette = QuizPaletteIdSchema.safeParse(channel.default_palette_id);

  return DirectorPlanSchema.parse({
    ...basePlan,
    beats: basePlan.beats.map((beat) => {
      return {
        ...beat,
        palette_id: channelPalette.success ? channelPalette.data : beat.palette_id,
        thinking_bar_style: channel.default_thinking_bar_style ?? beat.thinking_bar_style,
        question_counter_style: channel.default_counter_style ?? beat.question_counter_style,
        question_box_style: channel.default_question_box_style ?? beat.question_box_style,
        answer_card_style: channel.default_answer_card_style ?? beat.answer_card_style,
        background_style: channel.default_background_style ?? beat.background_style,
      };
    }),
  });
}
