/**
 * Standard Workspace and Engine Constants
 */

import type { VoiceSegmentRole } from "./enums.js";

/**
 * Maximum number of past recent questions injected into LLM prompt
 * to avoid duplicate questions within the same channel.
 */
export const MAX_DEDUP_HISTORY_QUESTIONS = 15;

/** Failed builds remain actionable briefly, then are retained for forensic review. */
export const FAILED_TASK_ATTENTION_WINDOW_MS = 10 * 60 * 60 * 1000;
export const FAILED_BUILD_RETENTION_MS = 48 * 60 * 60 * 1000;

/**
 * Default TTS playback tempo multiplier mapped by voice segment role.
 * Role-specific pacing ensures engaging delivery for young audiences:
 * - Questions and choices are crisp and clear (1.1x)
 * - Reveals and intro/outro have high energy (1.12x)
 * - Explanations and fun facts remain conversational (1.0x)
 */
export const DEFAULT_QUIZ_VOICE_TEMPO_BY_ROLE: Record<VoiceSegmentRole, number> = {
  intro: 1.12,
  question: 1.1,
  choice: 1.1,
  thinking_prompt: 1.04,
  countdown: 1.0,
  reveal: 1.12,
  explanation: 1.0,
  fun_fact: 1.0,
  midpoint: 1.06,
  outro: 1.12,
};

export interface StarterMascotBlueprint {
  name: string;
  description: string;
  visual_style: "pixar_3d" | "kawaii_chibi" | "flat_vector" | "natural_realism" | "plastic_toy";
  color_theme: string;
  master_prompt: string;
}

export const STARTER_MASCOT_BLUEPRINTS: StarterMascotBlueprint[] = [
  {
    name: "Milo the Explorer",
    description: "Wise, witty owl with large sparkling eyes and red glasses",
    visual_style: "pixar_3d",
    color_theme: "#06b6d4",
    master_prompt:
      "Cute wise baby owl with big sparkling eyes and small red glasses, fluffy soft feathers, wearing a tiny yellow bowtie, friendly and enthusiastic expression, sharp clean silhouette, solid seamless background",
  },
  {
    name: "Bingo the Dino",
    description: "Playful baby green dinosaur with round cute belly",
    visual_style: "pixar_3d",
    color_theme: "#10b981",
    master_prompt:
      "Adorable playful baby green dinosaur with tiny soft wings and round cute belly, joyful smiling expression, big anime eyes, wearing small sneakers, solid white background, vibrant lighting",
  },
  {
    name: "Bolt the Bot",
    description: "Futuristic mini companion robot with glowing heart LED face",
    visual_style: "plastic_toy",
    color_theme: "#8b5cf6",
    master_prompt:
      "Futuristic cute mini companion robot mascot, glossy white ceramic shell, glowing heart-shaped LED screen face, energetic hovering pose with tiny thruster sparks, solid clean background",
  },
  {
    name: "Felix the Fox",
    description: "Adventurous chibi fox cub with aviator goggles",
    visual_style: "kawaii_chibi",
    color_theme: "#ff6b4a",
    master_prompt:
      "Clever adventurous chibi fox cub with oversized bushy tail, warm orange coat with cream chest, curious sparkling eyes, wearing tiny aviator goggles on forehead, playful dynamic pose",
  },
];

/**
 * Built-in default voice constants.
 * Embedded in the repository under assets/audio/voices/english_girl.
 */
export const BUILTIN_DEFAULT_VOICE_ID = "voice_builtin_english_girl";
export const BUILTIN_DEFAULT_VOICE_NAME = "Voice English girl";
export const BUILTIN_DEFAULT_VOICE_REFERENCE_PATH = "assets/audio/voices/english_girl/reference.wav";
export const BUILTIN_DEFAULT_VOICE_SAMPLE_PATH = "assets/audio/voices/english_girl/sample.wav";
export const BUILTIN_DEFAULT_VOICE_CREATED_AT = "2026-08-27T06:06:04.466Z";

export const BUILTIN_DEFAULT_VOICE_PROFILE = {
  voice_id: BUILTIN_DEFAULT_VOICE_ID,
  name: BUILTIN_DEFAULT_VOICE_NAME,
  reference_path: BUILTIN_DEFAULT_VOICE_REFERENCE_PATH,
  sample_path: BUILTIN_DEFAULT_VOICE_SAMPLE_PATH,
  created_at: BUILTIN_DEFAULT_VOICE_CREATED_AT,
  is_builtin: true,
} as const;

