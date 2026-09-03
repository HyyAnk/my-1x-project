import {
  ALL_ANSWER_CARD_STYLES,
  ALL_BACKGROUND_STYLES,
  ALL_QUESTION_BOX_STYLES,
  ALL_QUESTION_COUNTER_STYLES,
  ALL_QUIZ_PALETTES,
  ALL_THINKING_BAR_STYLES,
  type QuizAnswerCardStyleId,
  type QuizBackgroundStyleId,
  type QuizQuestionBoxStyleId,
  type QuizQuestionCounterStyleId,
  type QuizThinkingBarStyleId,
  type QuizAnswerCardStyle,
  type QuizBackgroundStyle,
  type QuizPaletteId,
  type QuizQuestionBoxStyle,
  type QuizQuestionCounterStyle,
  type QuizThinkingBarStyle,
} from "../enums.js";
import type { QuizStyleProvenance, QuizStyleResolutionContext } from "../quizStyles.types.js";

export interface ResolvedField<T, P> {
  value: T;
  provenance: P;
}

export function isValidPalette(val: unknown): val is Exclude<QuizPaletteId, "auto"> {
  return typeof val === "string" && val !== "auto" && ALL_QUIZ_PALETTES.includes(val as QuizPaletteId);
}

export function isValidThinkingBar(val: unknown): val is QuizThinkingBarStyleId {
  return typeof val === "string" && val !== "auto" && ALL_THINKING_BAR_STYLES.includes(val as QuizThinkingBarStyle);
}

export function isValidQuestionBox(val: unknown): val is QuizQuestionBoxStyleId {
  return typeof val === "string" && val !== "auto" && ALL_QUESTION_BOX_STYLES.includes(val as QuizQuestionBoxStyle);
}

export function isValidAnswerCard(val: unknown): val is QuizAnswerCardStyleId {
  return typeof val === "string" && val !== "auto" && ALL_ANSWER_CARD_STYLES.includes(val as QuizAnswerCardStyle);
}

export function isValidCounter(val: unknown): val is QuizQuestionCounterStyleId {
  return typeof val === "string" && val !== "auto" && ALL_QUESTION_COUNTER_STYLES.includes(val as QuizQuestionCounterStyle);
}

export function isValidBackground(val: unknown): val is QuizBackgroundStyleId {
  return typeof val === "string" && val !== "auto" && ALL_BACKGROUND_STYLES.includes(val as QuizBackgroundStyle);
}

export function resolvePaletteField(
  ctx: QuizStyleResolutionContext,
  fallback: Exclude<QuizPaletteId, "auto">,
): ResolvedField<Exclude<QuizPaletteId, "auto">, QuizStyleProvenance["paletteId"]> {
  if (isValidPalette(ctx.beat?.palette_id)) return { value: ctx.beat.palette_id, provenance: "beat" };
  const ov = ctx.override?.paletteId ?? ctx.override?.palette_id;
  if (isValidPalette(ov)) return { value: ov, provenance: "override" };
  if (isValidPalette(ctx.episode?.palette_id)) return { value: ctx.episode.palette_id, provenance: "episode" };
  if (isValidPalette(ctx.preset?.palette_id)) return { value: ctx.preset.palette_id, provenance: "preset" };
  const ch = ctx.channel?.default_palette_id ?? ctx.channel?.palette_id;
  if (isValidPalette(ch)) return { value: ch, provenance: "channel" };
  return { value: fallback, provenance: "theme" };
}

export function resolveThinkingBarField(
  ctx: QuizStyleResolutionContext,
  fallback: Exclude<QuizThinkingBarStyle, "auto">,
): ResolvedField<Exclude<QuizThinkingBarStyle, "auto">, QuizStyleProvenance["thinkingBarStyle"]> {
  if (isValidThinkingBar(ctx.beat?.thinking_bar_style)) return { value: ctx.beat.thinking_bar_style, provenance: "beat" };
  const ov = ctx.override?.thinkingBarStyle ?? ctx.override?.thinking_bar_style;
  if (isValidThinkingBar(ov)) return { value: ov, provenance: "override" };
  if (isValidThinkingBar(ctx.episode?.thinking_bar_style)) return { value: ctx.episode.thinking_bar_style, provenance: "episode" };
  if (isValidThinkingBar(ctx.preset?.thinking_bar_style)) return { value: ctx.preset.thinking_bar_style, provenance: "preset" };
  if (isValidThinkingBar(ctx.channel?.default_thinking_bar_style)) {
    return { value: ctx.channel.default_thinking_bar_style, provenance: "channel" };
  }
  return { value: fallback, provenance: "theme" };
}

export function resolveQuestionBoxField(
  ctx: QuizStyleResolutionContext,
  fallback: Exclude<QuizQuestionBoxStyle, "auto">,
): ResolvedField<Exclude<QuizQuestionBoxStyle, "auto">, QuizStyleProvenance["questionBoxStyle"]> {
  if (isValidQuestionBox(ctx.beat?.question_box_style)) return { value: ctx.beat.question_box_style, provenance: "beat" };
  const ov = ctx.override?.questionBoxStyle ?? ctx.override?.question_box_style;
  if (isValidQuestionBox(ov)) return { value: ov, provenance: "override" };
  if (isValidQuestionBox(ctx.episode?.question_box_style)) return { value: ctx.episode.question_box_style, provenance: "episode" };
  if (isValidQuestionBox(ctx.preset?.question_box_style)) return { value: ctx.preset.question_box_style, provenance: "preset" };
  if (isValidQuestionBox(ctx.channel?.default_question_box_style)) {
    return { value: ctx.channel.default_question_box_style, provenance: "channel" };
  }
  return { value: fallback, provenance: "theme" };
}

export function resolveAnswerCardField(
  ctx: QuizStyleResolutionContext,
  fallback: Exclude<QuizAnswerCardStyle, "auto">,
): ResolvedField<Exclude<QuizAnswerCardStyle, "auto">, QuizStyleProvenance["answerCardStyle"]> {
  if (isValidAnswerCard(ctx.beat?.answer_card_style)) return { value: ctx.beat.answer_card_style, provenance: "beat" };
  const ov = ctx.override?.answerCardStyle ?? ctx.override?.answer_card_style;
  if (isValidAnswerCard(ov)) return { value: ov, provenance: "override" };
  if (isValidAnswerCard(ctx.episode?.answer_card_style)) return { value: ctx.episode.answer_card_style, provenance: "episode" };
  if (isValidAnswerCard(ctx.preset?.answer_card_style)) return { value: ctx.preset.answer_card_style, provenance: "preset" };
  if (isValidAnswerCard(ctx.channel?.default_answer_card_style)) {
    return { value: ctx.channel.default_answer_card_style, provenance: "channel" };
  }
  return { value: fallback, provenance: "theme" };
}

export function resolveCounterField(
  ctx: QuizStyleResolutionContext,
  fallback: Exclude<QuizQuestionCounterStyle, "auto">,
): ResolvedField<Exclude<QuizQuestionCounterStyle, "auto">, QuizStyleProvenance["counterStyle"]> {
  const beatCounter = ctx.beat?.question_counter_style ?? ctx.beat?.counter_style;
  if (isValidCounter(beatCounter)) return { value: beatCounter, provenance: "beat" };
  const ov = ctx.override?.counterStyle ?? ctx.override?.question_counter_style;
  if (isValidCounter(ov)) return { value: ov, provenance: "override" };
  const epCounter = ctx.episode?.question_counter_style ?? ctx.episode?.counter_style;
  if (isValidCounter(epCounter)) return { value: epCounter, provenance: "episode" };
  if (isValidCounter(ctx.preset?.counter_style)) return { value: ctx.preset.counter_style, provenance: "preset" };
  if (isValidCounter(ctx.channel?.default_counter_style)) return { value: ctx.channel.default_counter_style, provenance: "channel" };
  return { value: fallback, provenance: "theme" };
}

export function resolveBackgroundField(
  ctx: QuizStyleResolutionContext,
  fallback: Exclude<QuizBackgroundStyle, "auto">,
): ResolvedField<Exclude<QuizBackgroundStyle, "auto">, QuizStyleProvenance["backgroundStyle"]> {
  if (isValidBackground(ctx.beat?.background_style)) return { value: ctx.beat.background_style, provenance: "beat" };
  const ov = ctx.override?.backgroundStyle ?? ctx.override?.background_style;
  if (isValidBackground(ov)) return { value: ov, provenance: "override" };
  if (isValidBackground(ctx.episode?.background_style)) return { value: ctx.episode.background_style, provenance: "episode" };
  if (isValidBackground(ctx.preset?.background_style)) return { value: ctx.preset.background_style, provenance: "preset" };
  if (isValidBackground(ctx.channel?.default_background_style)) {
    return { value: ctx.channel.default_background_style, provenance: "channel" };
  }
  return { value: fallback, provenance: "theme" };
}

export function resolveBrandNameField(
  ctx: QuizStyleResolutionContext,
  fallback: string,
): ResolvedField<string, QuizStyleProvenance["channelBrandName"]> {
  const override = nonEmptyString(ctx.override?.channelBrandName);
  if (override) return { value: override, provenance: "override" };
  const episode = nonEmptyString(ctx.episode?.channel_brand_name);
  if (episode) return { value: episode, provenance: "episode" };
  const preset = nonEmptyString(ctx.preset?.channel_brand_name);
  if (preset) return { value: preset, provenance: "preset" };
  const channel = nonEmptyString(ctx.channel?.display_name);
  if (channel) return { value: channel, provenance: "channel" };
  return { value: fallback, provenance: "theme" };
}

function nonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}
