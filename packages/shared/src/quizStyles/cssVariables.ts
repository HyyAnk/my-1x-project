import type { QuizPaletteCssVariables, QuizPaletteLike } from "../quizStyles.types.js";
import { DEFAULT_QUIZ_PALETTE_FALLBACK } from "./styleDefaults.js";

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
