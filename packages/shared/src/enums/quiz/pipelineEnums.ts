import { z } from "zod";
import { ImageAspectRatioSchema } from "../core.js";

export const QuizQuestionFormatSchema = z.enum(["multiple_choice", "image_guess", "true_false", "odd_one_out"]);
export type QuizQuestionFormat = z.infer<typeof QuizQuestionFormatSchema>;

export const QuizAgeBandSchema = z.enum(["4-6", "7-9", "10-12", "family"]);
export type QuizAgeBand = z.infer<typeof QuizAgeBandSchema>;

export const DirectorArchetypeSchema = z.enum([
  "text_multiple_choice",
  "illustrated_multiple_choice",
  "visual_multiple_choice",
  "image_guess",
  "true_false",
  "odd_one_out",
  "visual_reveal",
  "speed_round",
  "final_challenge",
]);
export type DirectorArchetype = z.infer<typeof DirectorArchetypeSchema>;

export const DirectorEnergySchema = z.enum(["gentle", "curious", "playful", "excited", "triumphant"]);

export const DirectorVisualDensitySchema = z.enum(["calm", "focused", "lively", "burst"]);

export const QuizLayoutIdSchema = z.enum([
  "auto",
  "media_left_choices_right",
  "visual_choices_three",
  "media_top_choices_bottom",
  "full_stack_list",
]);
export type QuizLayoutId = z.infer<typeof QuizLayoutIdSchema>;

export const QuizMotionIdSchema = z.enum([
  "auto",
  "enter.pop",
  "enter.slideUp",
  "enter.slideLeft",
  "enter.slideRight",
  "enter.scale",
  "idle.float",
  "idle.push",
  "idle.pulse",
  "emphasis.wiggle",
  "emphasis.punch",
  "emphasis.glow",
  "reveal.correct",
  "reveal.incorrect",
  "exit.fade",
  "exit.slide",
]);
export type QuizMotionId = z.infer<typeof QuizMotionIdSchema>;

export const QuizTransitionIdSchema = z.enum(["auto", "bubble_splash", "brush_wave", "lightning_brush"]);
export type QuizTransitionId = z.infer<typeof QuizTransitionIdSchema>;

export const DirectorBeatIntentSchema = z.enum([
  "question_enter",
  "choice_reveal",
  "thinking",
  "countdown",
  "answer_reveal",
  "explanation",
  "fun_fact",
  "celebrate",
  "transition",
]);

export const DirectorAssetIntentSchema = z.enum([
  "question_illustration",
  "choice_illustration",
  "answer_reveal",
  "background",
  "mascot_pose",
]);

export const SfxIntentSchema = z.enum([
  "ui_pop",
  "ui_soft",
  "countdown_tick",
  "countdown_final",
  "correct_small",
  "correct_medium",
  "correct_big",
  "transition_soft",
  "transition_fast",
  "score_gain",
  "streak",
]);
export type SfxIntent = z.infer<typeof SfxIntentSchema>;

export const TransitionIntentSchema = z.enum(["cut", "slide", "wipe", "zoom"]);

export const RewardIntensitySchema = z.enum(["small", "medium", "big"]);

export const QuizAssetPurposeSchema = z.enum([
  "answer_option",
  "question_illustration",
  "hero_question_image",
  "answer_reveal",
  "background",
  "mascot",
]);

export const QuizAssetStyleSchema = z.enum(["cute_illustration", "bold_icon", "photo_reference", "abstract_shape", "mascot_pose"]);

export const QuizAssetAspectRatioSchema = ImageAspectRatioSchema;
export type QuizAssetAspectRatio = z.infer<typeof QuizAssetAspectRatioSchema>;

export const VoiceSegmentRoleSchema = z.enum([
  "intro",
  "question",
  "choice",
  "thinking_prompt",
  "countdown",
  "reveal",
  "explanation",
  "fun_fact",
  "midpoint",
  "outro",
]);
export type VoiceSegmentRole = z.infer<typeof VoiceSegmentRoleSchema>;

export const VoicePhraseDeliverySchema = z.enum(["normal", "emphasis", "question_end", "playful", "warm"]);
export type VoicePhraseDelivery = z.infer<typeof VoicePhraseDeliverySchema>;

export const VoicePauseClassSchema = z.enum(["micro", "phrase", "anticipation", "long", "none"]);
export type VoicePauseClass = z.infer<typeof VoicePauseClassSchema>;

export const QuizIssueStageSchema = z.enum(["semantic", "director", "assets", "voice", "timeline", "layout", "render"]);
