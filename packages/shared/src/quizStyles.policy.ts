import {
  ALL_ANSWER_CARD_STYLES,
  ALL_BACKGROUND_STYLES,
  ALL_QUESTION_BOX_STYLES,
  ALL_QUESTION_COUNTER_STYLES,
  ALL_QUIZ_PALETTES,
  ALL_THINKING_BAR_STYLES,
  type QuizAnswerCardStyle,
  type QuizBackgroundStyle,
  type QuizLayoutId,
  type QuizPaletteId,
  type QuizQuestionBoxStyle,
  type QuizQuestionCounterStyle,
  type QuizThinkingBarStyle,
  type QuizVisualTheme,
} from "./enums.js";
import type { VisualPresetItem } from "./presets.js";
import type {
  QuizPaletteCssVariables,
  QuizPaletteLike,
  QuizStyleProvenance,
  QuizStyleResolutionContext,
  ResolvedQuizStyle,
  ResolvedQuizStyleWithProvenance,
} from "./quizStyles.types.js";

export const DEFAULT_QUIZ_VISUAL_THEME: QuizVisualTheme = "candy_arcade";
export const DEFAULT_QUIZ_PALETTE_ID: Exclude<QuizPaletteId, "auto"> = "lime";
export const DEFAULT_QUIZ_THINKING_BAR_STYLE: Exclude<QuizThinkingBarStyle, "auto"> = "star_slider";
export const DEFAULT_QUIZ_QUESTION_BOX_STYLE: Exclude<QuizQuestionBoxStyle, "auto"> = "candy_pop";
export const DEFAULT_QUIZ_ANSWER_CARD_STYLE: Exclude<QuizAnswerCardStyle, "auto"> = "glossy_arcade";
export const DEFAULT_QUIZ_COUNTER_STYLE: Exclude<QuizQuestionCounterStyle, "auto"> = "hanging_woodsign";
export const DEFAULT_QUIZ_BACKGROUND_STYLE: Exclude<QuizBackgroundStyle, "auto"> = "candy_rays";

export const DEFAULT_QUIZ_STYLE_BY_THEME: Record<QuizVisualTheme, ResolvedQuizStyle> = {
  candy_arcade: {
    theme: "candy_arcade",
    paletteId: "lime",
    thinkingBarStyle: "star_slider",
    questionBoxStyle: "candy_pop",
    answerCardStyle: "glossy_arcade",
    counterStyle: "hanging_woodsign",
    backgroundStyle: "candy_rays",
    channelBrandName: "",
  },
  candy_pop: {
    theme: "candy_pop",
    paletteId: "lime",
    thinkingBarStyle: "star_slider",
    questionBoxStyle: "candy_pop",
    answerCardStyle: "glossy_arcade",
    counterStyle: "hanging_woodsign",
    backgroundStyle: "candy_rays",
    channelBrandName: "",
  },
  space_lab: {
    theme: "space_lab",
    paletteId: "aqua",
    thinkingBarStyle: "cosmic_rocket",
    questionBoxStyle: "glass_morphism",
    answerCardStyle: "minimal_soft",
    counterStyle: "neon_badge",
    backgroundStyle: "candy_rays",
    channelBrandName: "",
  },
  jungle_jamboree: {
    theme: "jungle_jamboree",
    paletteId: "lime",
    thinkingBarStyle: "star_slider",
    questionBoxStyle: "candy_pop",
    answerCardStyle: "glossy_arcade",
    counterStyle: "hanging_woodsign",
    backgroundStyle: "candy_rays",
    channelBrandName: "",
  },
  ocean_explorer: {
    theme: "ocean_explorer",
    paletteId: "aqua",
    thinkingBarStyle: "capsule_liquid",
    questionBoxStyle: "glass_morphism",
    answerCardStyle: "glass_neon",
    counterStyle: "neon_badge",
    backgroundStyle: "candy_rays",
    channelBrandName: "",
  },
};

export const DEFAULT_QUIZ_PALETTE_FALLBACK = {
  backgroundPrimary: "#99D93E",
  backgroundSecondary: "#31B87A",
  accent: "#FF6C78",
  surfaceAccent: "#C0394B",
  onAccent: "#0F172A",
  answerBadge: "#FF6C78",
  correct: "#27B96C",
  incorrect: "#7B8DA1",
  surface: "#FFFDF7",
  text: "#152A57",
  muted: "#E8F5DF",
} as const;

interface ResolvedField<T, P> {
  value: T;
  provenance: P;
}

function isValidPalette(val: unknown): val is Exclude<QuizPaletteId, "auto"> {
  return typeof val === "string" && val !== "auto" && ALL_QUIZ_PALETTES.includes(val as QuizPaletteId);
}

function isValidThinkingBar(val: unknown): val is Exclude<QuizThinkingBarStyle, "auto"> {
  return typeof val === "string" && val !== "auto" && ALL_THINKING_BAR_STYLES.includes(val as QuizThinkingBarStyle);
}

function isValidQuestionBox(val: unknown): val is Exclude<QuizQuestionBoxStyle, "auto"> {
  return typeof val === "string" && val !== "auto" && ALL_QUESTION_BOX_STYLES.includes(val as QuizQuestionBoxStyle);
}

function isValidAnswerCard(val: unknown): val is Exclude<QuizAnswerCardStyle, "auto"> {
  return typeof val === "string" && val !== "auto" && ALL_ANSWER_CARD_STYLES.includes(val as QuizAnswerCardStyle);
}

function isValidCounter(val: unknown): val is Exclude<QuizQuestionCounterStyle, "auto"> {
  return typeof val === "string" && val !== "auto" && ALL_QUESTION_COUNTER_STYLES.includes(val as QuizQuestionCounterStyle);
}

function isValidBackground(val: unknown): val is Exclude<QuizBackgroundStyle, "auto"> {
  return typeof val === "string" && val !== "auto" && ALL_BACKGROUND_STYLES.includes(val as QuizBackgroundStyle);
}

function resolvePaletteField(
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

function resolveThinkingBarField(
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

function resolveQuestionBoxField(
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

function resolveAnswerCardField(
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

function resolveCounterField(
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

function resolveBackgroundField(
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

function resolveBrandNameField(
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

/**
 * Pure style-resolution policy enforcing ADR-001 and Phase 5 precedence:
 *
 *     theme defaults
 *         < channel defaults
 *         < selected preset or episode values
 *         < explicit episode custom values
 *         < explicit Director beat values
 *
 * Missing or "auto" values inherit from the immediately lower layer rather than erasing it.
 */
export function resolveQuizStyle(context: QuizStyleResolutionContext = {}): ResolvedQuizStyleWithProvenance {
  const themeCandidate = context.override?.theme ?? context.episode?.visual_theme ?? context.theme;
  const theme: QuizVisualTheme =
    themeCandidate === "candy_arcade" ||
    themeCandidate === "candy_pop" ||
    themeCandidate === "space_lab" ||
    themeCandidate === "jungle_jamboree" ||
    themeCandidate === "ocean_explorer"
      ? themeCandidate
      : DEFAULT_QUIZ_VISUAL_THEME;
  const baseStyle = DEFAULT_QUIZ_STYLE_BY_THEME[theme] ?? DEFAULT_QUIZ_STYLE_BY_THEME.candy_arcade;

  const palette = resolvePaletteField(context, baseStyle.paletteId);
  const thinkingBar = resolveThinkingBarField(context, baseStyle.thinkingBarStyle);
  const questionBox = resolveQuestionBoxField(context, baseStyle.questionBoxStyle);
  const answerCard = resolveAnswerCardField(context, baseStyle.answerCardStyle);
  const counter = resolveCounterField(context, baseStyle.counterStyle);
  const background = resolveBackgroundField(context, baseStyle.backgroundStyle);
  const brandName = resolveBrandNameField(context, baseStyle.channelBrandName);

  return {
    theme,
    paletteId: palette.value,
    thinkingBarStyle: thinkingBar.value,
    questionBoxStyle: questionBox.value,
    answerCardStyle: answerCard.value,
    counterStyle: counter.value,
    backgroundStyle: background.value,
    channelBrandName: brandName.value,
    provenance: {
      theme: context.override?.theme ? "override" : context.episode?.visual_theme ? "episode" : "theme",
      paletteId: palette.provenance,
      thinkingBarStyle: thinkingBar.provenance,
      questionBoxStyle: questionBox.provenance,
      answerCardStyle: answerCard.provenance,
      counterStyle: counter.provenance,
      backgroundStyle: background.provenance,
      channelBrandName: brandName.provenance,
    },
  };
}

/**
 * Resolves styles for a specific question beat in the context of an episode and channel.
 */
export function resolveBeatQuizStyle(
  context: QuizStyleResolutionContext,
  beat?: QuizStyleResolutionContext["beat"],
): ResolvedQuizStyleWithProvenance {
  return resolveQuizStyle({
    ...context,
    beat: beat ?? context.beat,
  });
}

/**
 * Serializes standard semantic CSS custom properties for a palette.
 * Provides defined fallbacks for missing or partial tokens.
 */
export function serializeQuizPaletteCssVariables(palette?: QuizPaletteLike | null): QuizPaletteCssVariables {
  const bgPrimary = palette?.backgroundPrimary ?? DEFAULT_QUIZ_PALETTE_FALLBACK.backgroundPrimary;
  const bgSecondary = palette?.backgroundSecondary ?? DEFAULT_QUIZ_PALETTE_FALLBACK.backgroundSecondary;
  const accent = palette?.accent ?? DEFAULT_QUIZ_PALETTE_FALLBACK.accent;
  const surfaceAccent = palette?.surfaceAccent ?? DEFAULT_QUIZ_PALETTE_FALLBACK.surfaceAccent;
  const onAccent = palette?.onAccent ?? DEFAULT_QUIZ_PALETTE_FALLBACK.onAccent;
  const answerBadge = palette?.answerBadge ?? DEFAULT_QUIZ_PALETTE_FALLBACK.answerBadge;
  const correct = palette?.correct ?? DEFAULT_QUIZ_PALETTE_FALLBACK.correct;
  const incorrect = palette?.incorrect ?? DEFAULT_QUIZ_PALETTE_FALLBACK.incorrect;
  const surface = palette?.surface ?? DEFAULT_QUIZ_PALETTE_FALLBACK.surface;
  const text = palette?.text ?? DEFAULT_QUIZ_PALETTE_FALLBACK.text;
  const muted = palette?.muted ?? DEFAULT_QUIZ_PALETTE_FALLBACK.muted;

  return {
    "--bg-primary": bgPrimary,
    "--bg-secondary": bgSecondary,
    "--accent": accent,
    "--surface-accent": surfaceAccent,
    "--on-accent": onAccent,
    "--answer-badge": answerBadge,
    "--badge": answerBadge,
    "--correct": correct,
    "--incorrect": incorrect,
    "--surface": surface,
    "--text": text,
    "--ink": text,
    "--muted": muted,
  };
}

/**
 * Returns formatted CSS declarations for stylesheet embedding.
 */
export function serializeQuizPaletteCss(palette?: QuizPaletteLike | null, indent = "      "): string {
  const vars = serializeQuizPaletteCssVariables(palette);
  return Object.entries(vars)
    .map(([key, value]) => `${indent}${key}: ${value};`)
    .join("\n");
}

/**
 * Returns semicolon-delimited inline style declarations.
 */
export function serializeQuizPaletteInlineStyle(palette?: QuizPaletteLike | null): string {
  const vars = serializeQuizPaletteCssVariables(palette);
  return Object.entries(vars)
    .map(([key, value]) => `${key}:${value};`)
    .join("");
}

/**
 * ADR-001 Preset Preview Layout Adapter.
 *
 * Presets specify a representative Sandbox showcase layout only (`preview_layout_id`).
 * Production episodes ALWAYS resolve question layout per question format/semantics.
 *
 * @deprecated `layout_id` is a legacy field on custom preset records.
 * Removal condition: migrate custom preset storage schema to v2 and drop `layout_id`.
 */
export function resolvePresetPreviewLayoutId(preset?: Partial<VisualPresetItem> | null): Exclude<QuizLayoutId, "auto"> | "baseline" {
  return preset?.preview_layout_id ?? preset?.layout_id ?? "media_left_choices_right";
}

/**
 * Normalizes legacy visual presets with `layout_id` to `preview_layout_id`.
 */
export function adaptLegacyVisualPreset(
  preset: Partial<VisualPresetItem> & { layout_id?: Exclude<QuizLayoutId, "auto"> | "baseline" },
): VisualPresetItem {
  const previewLayoutId = resolvePresetPreviewLayoutId(preset);
  return {
    id: preset.id ?? `preset_${Date.now()}`,
    name: preset.name ?? "Custom Preset",
    description: preset.description ?? "",
    icon: preset.icon ?? "🎨",
    theme: preset.theme ?? "candy_arcade",
    palette_id: preset.palette_id ?? "lime",
    preview_layout_id: previewLayoutId,
    layout_id: previewLayoutId,
    thinking_bar_style: preset.thinking_bar_style ?? "star_slider",
    question_box_style: preset.question_box_style ?? "candy_pop",
    answer_card_style: preset.answer_card_style ?? "glossy_arcade",
    counter_style: preset.counter_style ?? "hanging_woodsign",
    background_style: preset.background_style ?? "candy_rays",
    mascot_id: preset.mascot_id,
    mascot_position: preset.mascot_position,
    mascot_scale: preset.mascot_scale,
    mascot_offset_x: preset.mascot_offset_x,
    mascot_offset_y: preset.mascot_offset_y,
    mascot_flip_x: preset.mascot_flip_x,
    channel_brand_name: preset.channel_brand_name,
    isBuiltIn: preset.isBuiltIn ?? false,
  };
}
