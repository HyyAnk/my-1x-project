import type { QuizLayoutId, QuizVisualTheme } from "../enums.js";
import type { VisualPresetItem } from "../presets.js";
import type { QuizStyleResolutionContext, ResolvedQuizStyleWithProvenance } from "../quizStyles.types.js";
import { DEFAULT_QUIZ_STYLE_BY_THEME, DEFAULT_QUIZ_VISUAL_THEME } from "./styleDefaults.js";
import {
  resolveAnswerCardField,
  resolveBackgroundField,
  resolveBrandNameField,
  resolveCounterField,
  resolvePaletteField,
  resolveQuestionBoxField,
  resolveThinkingBarField,
} from "./fieldValidators.js";

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
