/**
 * Standard Workspace and Engine Constants
 */

import type { VoiceSegmentRole } from "./enums.js";

/**
 * Maximum number of past recent questions injected into LLM prompt
 * to avoid duplicate questions within the same channel.
 */
export const MAX_DEDUP_HISTORY_QUESTIONS = 15;

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
