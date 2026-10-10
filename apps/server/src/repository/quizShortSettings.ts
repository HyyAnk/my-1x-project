import {
  ALL_QUIZ_IMAGE_STYLES,
  QuizShortSchema,
  QuizShortSettingsInputSchema,
  nowIso,
  type QuizImageStyle,
  type QuizShort,
  type QuizShortConfig,
  type QuizShortSettingsInput,
} from "@studio/shared";
import type { RepositoryRuntime } from "./runtime.js";

function resolveNextResolvedStyle(
  input: QuizShortSettingsInput,
  current: QuizShortConfig,
  channelStyles?: QuizImageStyle[],
): QuizImageStyle {
  if (input.visual_style !== undefined) {
    if (input.visual_style !== "mixed") return input.visual_style;
    const available = channelStyles && channelStyles.length > 0 ? channelStyles : ALL_QUIZ_IMAGE_STYLES;
    return available[Math.floor(Math.random() * available.length)] || "pixar_3d";
  }
  return input.resolved_visual_style ?? current.resolved_visual_style ?? "pixar_3d";
}

/**
 * Settings that change the question set, the image prompts or the Director layouts: every quiz
 * artifact downstream of the quiz (director, assets, voice, timeline, qa, render) is stale.
 */
export function hasQuizSourceSettingsChanged(next: QuizShortConfig, prev: QuizShortConfig): boolean {
  return (
    next.question_count !== prev.question_count ||
    next.age_band !== prev.age_band ||
    next.visual_style !== prev.visual_style ||
    next.resolved_visual_style !== prev.resolved_visual_style ||
    JSON.stringify(next.layout_pair) !== JSON.stringify(prev.layout_pair)
  );
}

/** Settings that only change how the video looks: the render is stale but the quiz artifacts survive. */
export function hasQuizShortRenderSettingsChanged(next: QuizShortConfig, prev: QuizShortConfig): boolean {
  return (
    next.visual_theme !== prev.visual_theme ||
    next.thinking_bar_style !== prev.thinking_bar_style ||
    next.question_counter_style !== prev.question_counter_style ||
    next.question_box_style !== prev.question_box_style ||
    next.answer_card_style !== prev.answer_card_style ||
    next.background_style !== prev.background_style ||
    next.palette_id !== prev.palette_id ||
    next.style_preset_id !== prev.style_preset_id ||
    JSON.stringify(next.mascot_style_selection) !== JSON.stringify(prev.mascot_style_selection) ||
    next.outro_cta_enabled !== prev.outro_cta_enabled
  );
}

const PASS_THROUGH_KEYS = [
  "question_count",
  "age_band",
  "thinking_bar_style",
  "question_counter_style",
  "question_box_style",
  "answer_card_style",
  "background_style",
  "palette_id",
  "style_preset_id",
  "style_catalog_revision",
  "style_preset_revision",
  "channel_brand_name",
  "mascot_style_selection",
  "layout_pair",
  "outro_cta_enabled",
  "fast_render_mode",
] as const satisfies readonly (keyof QuizShortSettingsInput & keyof QuizShortConfig)[];

function computeUpdatedConfig(prev: QuizShortConfig, input: QuizShortSettingsInput, nextResolvedStyle: QuizImageStyle): QuizShortConfig {
  const patch: Partial<QuizShortConfig> = {};
  for (const key of PASS_THROUGH_KEYS) {
    const value = input[key];
    if (value !== undefined) Object.assign(patch, { [key]: value });
  }
  const next: QuizShortConfig = {
    ...prev,
    ...patch,
    visual_style: input.visual_style ?? prev.visual_style ?? "mixed",
    resolved_visual_style: nextResolvedStyle,
  };
  if (hasQuizShortRenderSettingsChanged(next, prev) && input.style_catalog_revision === undefined) next.style_catalog_revision = undefined;
  return next;
}

export async function updateQuizShortSettings(
  this: RepositoryRuntime,
  channelId: string,
  quizShortId: string,
  rawInput: QuizShortSettingsInput,
): Promise<QuizShort> {
  const input = QuizShortSettingsInputSchema.parse(rawInput);
  const [quizShort, channel] = await Promise.all([this.getQuizShort(channelId, quizShortId), this.getChannel(channelId)]);
  const nextConfig = computeUpdatedConfig(
    quizShort.quiz_config,
    input,
    resolveNextResolvedStyle(input, quizShort.quiz_config, channel.selected_styles),
  );
  const sourceChanged = hasQuizSourceSettingsChanged(nextConfig, quizShort.quiz_config);
  const renderChanged = hasQuizShortRenderSettingsChanged(nextConfig, quizShort.quiz_config);

  const next = await this.saveQuizShort(channelId, QuizShortSchema.parse({ ...quizShort, quiz_config: nextConfig, updated_at: nowIso() }));
  const ref = { kind: "quiz_short", channel_id: channelId, product_id: quizShortId } as const;
  if (sourceChanged) {
    // The question set comes from the bank at confirmation, so the quiz itself is kept and only downstream artifacts are rebuilt.
    await this.invalidateQuizArtifacts(channelId, ref, ["director", "assets", "asset_resolution", "voice", "timeline", "qa", "render"]);
  } else if (renderChanged) {
    await this.invalidateQuizArtifacts(channelId, ref, ["style", "qa"]);
  }
  return sourceChanged || renderChanged ? this.getQuizShort(channelId, quizShortId) : next;
}
