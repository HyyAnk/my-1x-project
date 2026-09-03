import type {
  QuizAnswerCardStyle,
  QuizBackgroundStyle,
  QuizPaletteId,
  QuizQuestionBoxStyle,
  QuizQuestionCounterStyle,
  QuizThinkingBarStyle,
  QuizVisualTheme,
} from "./enums.js";
import type { VisualPresetItem } from "./presets.js";

export type { StyleCatalogEntry, StyleCatalogSnapshot, StyleSlot } from "./quizStyles/styleCatalog.types.js";

export type QuizStyleProvenanceSource = "beat" | "override" | "preset" | "episode" | "channel" | "theme" | "theme_default";

export type ResolvedQuizStyle = {
  theme: QuizVisualTheme;
  paletteId: Exclude<QuizPaletteId, "auto">;
  thinkingBarStyle: Exclude<QuizThinkingBarStyle, "auto">;
  questionBoxStyle: Exclude<QuizQuestionBoxStyle, "auto">;
  answerCardStyle: Exclude<QuizAnswerCardStyle, "auto">;
  counterStyle: Exclude<QuizQuestionCounterStyle, "auto">;
  backgroundStyle: Exclude<QuizBackgroundStyle, "auto">;
  channelBrandName: string;
};

export type QuizStyleProvenance = {
  theme: QuizStyleProvenanceSource;
  paletteId: QuizStyleProvenanceSource;
  thinkingBarStyle: QuizStyleProvenanceSource;
  questionBoxStyle: QuizStyleProvenanceSource;
  answerCardStyle: QuizStyleProvenanceSource;
  counterStyle: QuizStyleProvenanceSource;
  backgroundStyle: QuizStyleProvenanceSource;
  channelBrandName: QuizStyleProvenanceSource;
};

export type ResolvedQuizStyleWithProvenance = ResolvedQuizStyle & {
  provenance: QuizStyleProvenance;
};

export type QuizStyleResolutionContext = {
  styleCatalogRevision?: string | null;
  stylePresetRevision?: number | null;
  theme?: string | null;
  channel?: {
    default_palette_id?: string | null;
    default_thinking_bar_style?: string | null;
    default_question_box_style?: string | null;
    default_answer_card_style?: string | null;
    default_counter_style?: string | null;
    default_background_style?: string | null;
    palette_id?: string | null;
    display_name?: string | null;
  } | null;
  preset?: Partial<VisualPresetItem> | null;
  episode?: {
    visual_theme?: string | null;
    palette_id?: string | null;
    thinking_bar_style?: string | null;
    question_box_style?: string | null;
    answer_card_style?: string | null;
    question_counter_style?: string | null;
    counter_style?: string | null;
    background_style?: string | null;
    style_catalog_revision?: string | null;
    style_preset_revision?: number | null;
    channel_brand_name?: string | null;
  } | null;
  override?: {
    theme?: string | null;
    paletteId?: string | null;
    thinkingBarStyle?: string | null;
    questionBoxStyle?: string | null;
    answerCardStyle?: string | null;
    counterStyle?: string | null;
    backgroundStyle?: string | null;
    channelBrandName?: string | null;
    palette_id?: string | null;
    thinking_bar_style?: string | null;
    question_box_style?: string | null;
    answer_card_style?: string | null;
    question_counter_style?: string | null;
    background_style?: string | null;
  } | null;
  beat?: {
    palette_id?: string | null;
    thinking_bar_style?: string | null;
    question_box_style?: string | null;
    answer_card_style?: string | null;
    question_counter_style?: string | null;
    counter_style?: string | null;
    background_style?: string | null;
  } | null;
};

export type QuizPaletteLike = {
  id?: string | null;
  backgroundPrimary?: string | null;
  backgroundSecondary?: string | null;
  backgroundGrad?: string | null;
  surface?: string | null;
  surfaceMuted?: string | null;
  surfaceAccent?: string | null;
  surfaceGrad?: string | null;
  onAccent?: string | null;
  answerBadge?: string | null;
  correct?: string | null;
  incorrect?: string | null;
  text?: string | null;
  textLight?: string | null;
  textDark?: string | null;
  accent?: string | null;
  accentSecondary?: string | null;
  goldAccent?: string | null;
  muted?: string | null;
  cardBaseGrad?: string | null;
  badgeBaseGrad?: string | null;
  badgeBorder?: string | null;
  timerTrailGrad?: string | null;
  depthShadow?: string | null;
  innerGlow?: string | null;
  cardBgA?: string | null;
  cardBgB?: string | null;
  cardBgC?: string | null;
  badgeA?: string | null;
  badgeB?: string | null;
  badgeC?: string | null;
  isDark?: boolean | null;
};

export type QuizPaletteCssVariables = Record<string, string>;
