import type { Channel, QuizConfig, QuizStyleResolutionContext } from "@studio/shared";

export type QuizRenderStyleContext = Omit<QuizStyleResolutionContext, "beat">;

/**
 * Adapts persisted Channel and Episode settings to the shared style policy
 * without collapsing their precedence layers.
 */
export function buildQuizRenderStyleContext(channel: Channel, episode: QuizConfig): QuizRenderStyleContext {
  return {
    theme: episode.visual_theme,
    channel: {
      default_palette_id: channel.default_palette_id,
      default_thinking_bar_style: channel.default_thinking_bar_style,
      default_question_box_style: channel.default_question_box_style,
      default_answer_card_style: channel.default_answer_card_style,
      default_counter_style: channel.default_counter_style,
      default_background_style: channel.default_background_style,
      display_name: channel.display_name,
    },
    episode: {
      visual_theme: episode.visual_theme,
      palette_id: episode.palette_id,
      thinking_bar_style: episode.thinking_bar_style,
      question_box_style: episode.question_box_style,
      answer_card_style: episode.answer_card_style,
      question_counter_style: episode.question_counter_style,
      background_style: episode.background_style,
      channel_brand_name: episode.channel_brand_name,
      style_catalog_revision: episode.style_catalog_revision,
      style_preset_revision: episode.style_preset_revision,
    },
    styleCatalogRevision: episode.style_catalog_revision,
    stylePresetRevision: episode.style_preset_revision,
  };
}
