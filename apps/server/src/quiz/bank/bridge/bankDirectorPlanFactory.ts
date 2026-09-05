import {
  DirectorPlanSchema,
  QuizPaletteIdSchema,
  getQuizGameplayArchetype,
  type Channel,
  type DirectorArchetype,
  type DirectorBeat,
  type DirectorPlan,
  type QuizLayoutId,
  type QuizQuestion,
  type QuizV2,
  type TopicCandidate,
} from "@studio/shared";
import { createDefaultDirectorPlan } from "../../director/parseDirectorPlan.js";

/**
 * Maps a quiz archetype identifier to a corresponding DirectorArchetype.
 */
export function mapToDirectorArchetype(
  archetypeId?: string,
  fallback: DirectorArchetype = "text_multiple_choice",
): DirectorArchetype {
  switch (archetypeId) {
    case "mystery_reveal":
      return "mystery_reveal";
    case "clue_deduction":
      return "clue_deduction";
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

/**
 * Resolves the appropriate quiz layout ID for a given topic candidate.
 */
export function resolveTargetLayoutForTopic(topic: TopicCandidate): QuizLayoutId {
  if (topic.suggested_layout) {
    return topic.suggested_layout as QuizLayoutId;
  }
  if (topic.archetype) {
    const bp = getQuizGameplayArchetype(topic.archetype as any);
    if (bp?.targetLayout) return bp.targetLayout as QuizLayoutId;
    switch (topic.archetype) {
      case "mystery_reveal":
        return "mystery_reveal";
      case "clue_deduction":
        return "clue_deduction";
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
  episodeId: string;
  quizQuestion: QuizQuestion;
  archetypeId?: string;
  channel: Channel;
  targetLayout: QuizLayoutId;
}

/**
 * Builds an archetype-tailored DirectorPlan for a single question episode.
 */
export function buildSingleQuestionDirectorPlan(
  params: BuildSingleQuestionDirectorPlanParams,
): DirectorPlan {
  const { episodeId, quizQuestion, archetypeId, channel, targetLayout } = params;
  const channelPalette = QuizPaletteIdSchema.safeParse(channel.default_palette_id);
  const directorArchetype = mapToDirectorArchetype(archetypeId, "text_multiple_choice");
  const isRevealArchetype = archetypeId === "mystery_reveal" || archetypeId === "clue_deduction";

  const directorBeat: DirectorBeat = {
    question_id: quizQuestion.id,
    archetype: directorArchetype,
    energy: "curious",
    visual_density: "focused",
    palette_id: channelPalette.success ? channelPalette.data : "auto",
    layout_id: targetLayout,
    motion_id: "enter.pop",
    transition_id: "bubble_splash",
    thinking_bar_style: channel.default_thinking_bar_style ?? "auto",
    question_counter_style: channel.default_counter_style ?? "auto",
    question_box_style: channel.default_question_box_style ?? "auto",
    answer_card_style: channel.default_answer_card_style ?? "auto",
    background_style: channel.default_background_style ?? "auto",
    thinking_seconds: 7.0,
    beat_intents: [
      "question_enter",
      "choice_reveal",
      "thinking",
      "countdown",
      "answer_reveal",
      "explanation",
      ...(quizQuestion.fun_fact ? ["fun_fact" as const] : []),
      "celebrate" as const,
      "transition",
    ],
    asset_intents: isRevealArchetype ? ["question_illustration", "answer_reveal"] : ["question_illustration"],
    mascot_state: "celebrate",
    sfx_intents: ["countdown_tick", "correct_medium"],
    transition_intent: "zoom",
    reward_intensity: "medium",
  };

  return DirectorPlanSchema.parse({
    schema_version: 2,
    episode_id: episodeId,
    archetype_family: "candy_arcade",
    beats: [directorBeat],
    midpoint_question_id: quizQuestion.id,
    final_challenge_question_id: quizQuestion.id,
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
): DirectorPlan {
  const basePlan = createDefaultDirectorPlan(quiz);
  const channelPalette = QuizPaletteIdSchema.safeParse(channel.default_palette_id);
  const isReveal = topic.archetype === "mystery_reveal" || topic.archetype === "clue_deduction";

  return DirectorPlanSchema.parse({
    ...basePlan,
    beats: basePlan.beats.map((beat) => {
      const directorArchetype = mapToDirectorArchetype(topic.archetype, beat.archetype);

      return {
        ...beat,
        archetype: directorArchetype,
        layout_id: targetLayout,
        palette_id: channelPalette.success ? channelPalette.data : beat.palette_id,
        thinking_bar_style: channel.default_thinking_bar_style ?? beat.thinking_bar_style,
        question_counter_style: channel.default_counter_style ?? beat.question_counter_style,
        question_box_style: channel.default_question_box_style ?? beat.question_box_style,
        answer_card_style: channel.default_answer_card_style ?? beat.answer_card_style,
        background_style: channel.default_background_style ?? beat.background_style,
        asset_intents: isReveal ? ["question_illustration", "answer_reveal"] : beat.asset_intents,
      };
    }),
  });
}
