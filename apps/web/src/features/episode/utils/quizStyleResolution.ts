import type {
  Channel,
  Episode,
  QuizAnswerCardStyle,
  QuizPaletteId,
  QuizQuestionBoxStyle,
  QuizQuestionCounterStyle,
  QuizThinkingBarStyle,
  QuizVisualTheme,
} from "@studio/shared";

export type ResolvedThinkingBarStyle = Exclude<QuizThinkingBarStyle, "auto">;
export type ResolvedQuestionBoxStyle = Exclude<QuizQuestionBoxStyle, "auto">;
export type ResolvedAnswerCardStyle = Exclude<QuizAnswerCardStyle, "auto">;
export type ResolvedCounterStyle = Exclude<QuizQuestionCounterStyle, "auto">;

type QuizConfig = NonNullable<Episode["quiz_config"]>;

export function resolveThinkingBarStyle(channel: Channel, quizConfig?: QuizConfig): ResolvedThinkingBarStyle {
  const configured = quizConfig?.thinking_bar_style ?? "auto";
  if (configured !== "auto") return configured;
  const channelDefault = channel.default_thinking_bar_style;
  return channelDefault && channelDefault !== "auto" ? channelDefault : "star_slider";
}

export function resolveQuestionBoxStyle(channel: Channel, quizConfig?: QuizConfig): ResolvedQuestionBoxStyle {
  const configured = quizConfig?.question_box_style ?? "auto";
  if (configured !== "auto") return configured;
  const channelDefault = channel.default_question_box_style;
  return channelDefault && channelDefault !== "auto" ? channelDefault : "candy_pop";
}

export function resolveAnswerCardStyle(channel: Channel, quizConfig?: QuizConfig): ResolvedAnswerCardStyle {
  const configured = quizConfig?.answer_card_style ?? "auto";
  if (configured !== "auto") return configured;
  const channelDefault = channel.default_answer_card_style;
  return channelDefault && channelDefault !== "auto" ? channelDefault : "glossy_arcade";
}

export function resolveCounterStyle(channel: Channel, quizConfig?: QuizConfig): ResolvedCounterStyle {
  const configured = quizConfig?.question_counter_style ?? "auto";
  if (configured !== "auto") return configured;
  const channelDefault = channel.default_counter_style;
  return channelDefault && channelDefault !== "auto" ? channelDefault : "hanging_woodsign";
}

export function resolvePaletteId(channel: Channel, quizConfig?: QuizConfig): Exclude<QuizPaletteId, "auto"> {
  const configured = quizConfig?.palette_id ?? "auto";
  if (configured !== "auto") return configured;
  const channelDefault = channel.default_palette_id;
  return channelDefault && channelDefault !== "auto" ? (channelDefault as Exclude<QuizPaletteId, "auto">) : "lime";
}

export function resolveVisualTheme(quizConfig?: QuizConfig): QuizVisualTheme {
  return quizConfig?.visual_theme ?? "candy_arcade";
}
