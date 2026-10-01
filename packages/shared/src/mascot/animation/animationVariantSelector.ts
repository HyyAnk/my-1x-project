/**
 * Mascot variant selectors.
 *
 * Animation-slot selection remains deterministic for legacy animation workflows.
 * Question mascot selection is intentionally random per selection so each quiz
 * question can use any available state variant. Render snapshots preserve the
 * selected result when a render is retried or resumed.
 */

import type { MascotStateMediaMode } from "../../enums/mascot.js";
import type { MascotStyle } from "../../schemas/mascot.js";
import type { AnimationState } from "./animationConstants.js";
import { isAnimationSlotPublishEligible } from "./animationSchema.js";
import type { MascotAnimatedStateVariant } from "./animationTypes.js";
import { filterPreferredVariants, type MascotVariantMediaCandidate } from "./variantAvailability.js";

/**
 * 32-bit FNV-1a deterministic hash returning an unsigned 32-bit integer.
 */
export function fnv1a32(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/**
 * Computes deterministic integer seed from selection components.
 */
export function computeSelectionSeed(videoId: string, questionId: string, state: string, styleId: string): number {
  return fnv1a32(`${videoId}:${questionId}:${state}:${styleId}`);
}

export interface AnimationVariantSelectionInput<
  T extends { slot_index: number; generation_revision?: number } = MascotAnimatedStateVariant,
> {
  videoId: string;
  questionId: string;
  state: AnimationState;
  styleId: string;
  readyVariants: T[];
  previousSlotIndex?: number;
}

export interface AnimationVariantSelectionResult<
  T extends { slot_index: number; generation_revision?: number } = MascotAnimatedStateVariant,
> {
  slot_index: number;
  variant: T;
  seed: number;
  candidate_index: number;
  revision: number;
}

/**
 * Selects a variant deterministically from ready variants based on video, question, state, and style.
 * Advances 1 slot to prevent immediate repeat when candidate matches previousSlotIndex and >= 2 variants are ready.
 */
export function selectAnimationVariant<T extends { slot_index: number; generation_revision?: number } = MascotAnimatedStateVariant>(
  input: AnimationVariantSelectionInput<T>,
): AnimationVariantSelectionResult<T> {
  const { videoId, questionId, state, styleId, readyVariants, previousSlotIndex } = input;

  if (!readyVariants || readyVariants.length === 0) {
    throw new Error(`No ready animation variants available for selection (state: ${state}, style: ${styleId})`);
  }

  const seed = computeSelectionSeed(videoId, questionId, state, styleId);
  const initialIndex = Math.abs(seed) % readyVariants.length;
  let selectedIndex = initialIndex;
  let candidate = readyVariants[initialIndex];

  if (previousSlotIndex !== undefined && candidate.slot_index === previousSlotIndex && readyVariants.length >= 2) {
    selectedIndex = (initialIndex + 1) % readyVariants.length;
    candidate = readyVariants[selectedIndex];
  }

  const revision = candidate.generation_revision ?? (candidate as { animation?: { version?: number } }).animation?.version ?? 1;

  return {
    slot_index: candidate.slot_index,
    variant: candidate,
    seed,
    candidate_index: selectedIndex,
    revision,
  };
}

/**
 * Convenience helper to extract ready animation variants from a style and deterministically select one.
 */
export function selectStyleAnimationVariant(options: {
  videoId: string;
  questionId: string;
  state: AnimationState;
  style: MascotStyle;
  previousSlotIndex?: number;
}): AnimationVariantSelectionResult | null {
  const variants = options.style.states?.[options.state] ?? [];
  const readyVariants = (variants as MascotAnimatedStateVariant[])
    .filter(isAnimationSlotPublishEligible)
    .sort((a, b) => a.slot_index - b.slot_index);

  if (readyVariants.length === 0) {
    return null;
  }

  return selectAnimationVariant({
    videoId: options.videoId,
    questionId: options.questionId,
    state: options.state,
    styleId: options.style.id,
    readyVariants,
    previousSlotIndex: options.previousSlotIndex,
  });
}

export interface QuestionMascotVariantSelectionInput<T extends MascotVariantMediaCandidate = MascotVariantMediaCandidate> {
  videoId?: string;
  episodeId?: string;
  questionId: string;
  state: string;
  styleId: string;
  variants?: T[] | null;
  /** @deprecated Repeated variants are allowed and this value is ignored. */
  previousSlotIndex?: number;
  mediaMode?: MascotStateMediaMode;
  /** Optional injectable random seed for deterministic tests and callers. */
  randomSeed?: number;
}

export interface QuestionMascotVariantSelectionResult<T extends MascotVariantMediaCandidate = MascotVariantMediaCandidate> {
  slot_index: number;
  variant: T;
  seed: number;
  candidate_index: number;
  revision: number;
}

/**
 * Randomly selects a mascot variant for a question state (thinking or celebrate).
 * Filters variants so only renderable media for the requested mode are considered.
 * Returns null if available variants count is 0.
 * Returns the only variant if count is 1 without error.
 * Repeated selections are allowed, including across adjacent questions.
 */
export function selectQuestionMascotVariantResult<T extends MascotVariantMediaCandidate = MascotVariantMediaCandidate>(
  input: QuestionMascotVariantSelectionInput<T>,
): QuestionMascotVariantSelectionResult<T> | null {
  const availableVariants = filterPreferredVariants(input.variants, input.mediaMode ?? "static");

  if (availableVariants.length === 0) {
    return null;
  }

  const providedSeed = input.randomSeed;
  const seed =
    typeof providedSeed === "number" && Number.isSafeInteger(providedSeed) && providedSeed >= 0
      ? providedSeed
      : Math.floor(Math.random() * 0x1_0000_0000);

  if (availableVariants.length === 1) {
    const candidate = availableVariants[0];
    const revision =
      (candidate as { generation_revision?: number }).generation_revision ??
      (candidate.animation as { version?: number } | undefined)?.version ??
      1;
    const slotIndex = candidate.slot_index ?? 1;

    return {
      slot_index: slotIndex,
      variant: candidate,
      seed,
      candidate_index: 0,
      revision,
    };
  }

  const selectedIndex = seed % availableVariants.length;
  const candidate = availableVariants[selectedIndex];

  const revision =
    (candidate as { generation_revision?: number }).generation_revision ??
    (candidate.animation as { version?: number } | undefined)?.version ??
    1;
  const slotIndex = candidate.slot_index ?? selectedIndex + 1;

  return {
    slot_index: slotIndex,
    variant: candidate,
    seed,
    candidate_index: selectedIndex,
    revision,
  };
}

/**
 * Convenience function to deterministically select a question mascot variant or null if unavailable.
 */
export function selectQuestionMascotVariant<T extends MascotVariantMediaCandidate = MascotVariantMediaCandidate>(
  input: QuestionMascotVariantSelectionInput<T>,
): T | null {
  const result = selectQuestionMascotVariantResult(input);
  return result?.variant ?? null;
}
