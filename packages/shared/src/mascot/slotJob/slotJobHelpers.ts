/**
 * Shared Mascot Slot Key and Job Utility Functions
 */

import { MIN_SLOT_INDEX, MAX_SLOT_INDEX } from "./slotJobConstants.js";
import type { MascotSlotJobState } from "./slotJobTypes.js";

/**
 * Formats a canonical slot key identifier (e.g. "thinking_1", "celebrate_5").
 */
export function formatMascotSlotKey(state: MascotSlotJobState, slot_index: number): string {
  return `${state}_${slot_index}`;
}

/**
 * Parses a canonical slot key identifier back into state and slot_index.
 * Returns null if the format is invalid or slot index is out of bounds (1-10).
 */
export function parseMascotSlotKey(key: string): { state: MascotSlotJobState; slot_index: number } | null {
  const match = /^(thinking|celebrate)_([1-9]|10)$/.exec(key.trim());
  if (!match) {
    return null;
  }
  const slot_index = Number(match[2]);
  if (slot_index < MIN_SLOT_INDEX || slot_index > MAX_SLOT_INDEX) {
    return null;
  }
  return {
    state: match[1] as MascotSlotJobState,
    slot_index,
  };
}
