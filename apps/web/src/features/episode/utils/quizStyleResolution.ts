import {
  resolveQuizStyle,
  type Channel,
  type Episode,
  type QuizAnswerCardStyle,
  type QuizBackgroundStyle,
  type QuizPaletteId,
  type QuizQuestionBoxStyle,
  type QuizQuestionCounterStyle,
  type QuizThinkingBarStyle,
  type QuizVisualTheme,
} from "@studio/shared";

export type ResolvedThinkingBarStyle = Exclude<QuizThinkingBarStyle, "auto">;
export type ResolvedQuestionBoxStyle = Exclude<QuizQuestionBoxStyle, "auto">;
export type ResolvedAnswerCardStyle = Exclude<QuizAnswerCardStyle, "auto">;
export type ResolvedCounterStyle = Exclude<QuizQuestionCounterStyle, "auto">;
export type ResolvedBackgroundStyle = Exclude<QuizBackgroundStyle, "auto">;

type QuizConfig = NonNullable<Episode["quiz_config"]>;

export function resolveThinkingBarStyle(
  channel?: Partial<Channel> | null,
  quizConfig?: Partial<QuizConfig> | null,
): ResolvedThinkingBarStyle {
  return resolveQuizStyle({ channel, episode: quizConfig }).thinkingBarStyle;
}

export function resolveQuestionBoxStyle(
  channel?: Partial<Channel> | null,
  quizConfig?: Partial<QuizConfig> | null,
): ResolvedQuestionBoxStyle {
  return resolveQuizStyle({ channel, episode: quizConfig }).questionBoxStyle;
}

export function resolveAnswerCardStyle(
  channel?: Partial<Channel> | null,
  quizConfig?: Partial<QuizConfig> | null,
): ResolvedAnswerCardStyle {
  return resolveQuizStyle({ channel, episode: quizConfig }).answerCardStyle;
}

export function resolveCounterStyle(channel?: Partial<Channel> | null, quizConfig?: Partial<QuizConfig> | null): ResolvedCounterStyle {
  return resolveQuizStyle({ channel, episode: quizConfig }).counterStyle;
}

export function resolveBackgroundStyle(
  channel?: Partial<Channel> | null,
  quizConfig?: Partial<QuizConfig> | null,
): ResolvedBackgroundStyle {
  return resolveQuizStyle({ channel, episode: quizConfig }).backgroundStyle;
}

export function resolvePaletteId(
  channel?: Partial<Channel> | null,
  quizConfig?: Partial<QuizConfig> | null,
): Exclude<QuizPaletteId, "auto"> {
  return resolveQuizStyle({ channel, episode: quizConfig }).paletteId;
}

export function resolveVisualTheme(quizConfig?: Partial<QuizConfig> | null): QuizVisualTheme {
  return resolveQuizStyle({ episode: quizConfig }).theme;
}
