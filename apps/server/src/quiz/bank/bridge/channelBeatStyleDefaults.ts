import { DirectorPlanSchema, QuizPaletteIdSchema, type Channel, type DirectorPlan } from "@studio/shared";

/** Stamps the channel's default look onto every beat, the same way topic Episode plans are built. */
export function applyChannelBeatStyleDefaults(plan: DirectorPlan, channel: Channel): DirectorPlan {
  const channelPalette = QuizPaletteIdSchema.safeParse(channel.default_palette_id);
  return DirectorPlanSchema.parse({
    ...plan,
    beats: plan.beats.map((beat) => ({
      ...beat,
      palette_id: channelPalette.success ? channelPalette.data : beat.palette_id,
      thinking_bar_style: channel.default_thinking_bar_style ?? beat.thinking_bar_style,
      question_counter_style: channel.default_counter_style ?? beat.question_counter_style,
      question_box_style: channel.default_question_box_style ?? beat.question_box_style,
      answer_card_style: channel.default_answer_card_style ?? beat.answer_card_style,
      background_style: channel.default_background_style ?? beat.background_style,
    })),
  });
}
