import type { MascotSlotState } from "@studio/shared";

/**
 * Thrown when an invalid slot state transition is attempted according to the state machine.
 */
export class InvalidStateTransitionError extends Error {
  public readonly code = "INVALID_STATE_TRANSITION";
  public readonly from: MascotSlotState;
  public readonly to: MascotSlotState;

  constructor(from: MascotSlotState, to: MascotSlotState, message?: string) {
    super(message ?? `Cannot transition slot state from "${from}" to "${to}"`);
    this.name = "InvalidStateTransitionError";
    this.from = from;
    this.to = to;
  }
}

/**
 * Thrown when an incoming attempt completion is older than the currently active attempt for a slot.
 */
export class StaleCompletionError extends Error {
  public readonly code = "STALE_COMPLETION";
  public readonly currentAttempt: number;
  public readonly incomingAttempt: number;

  constructor(incomingAttempt: number, currentAttempt: number, message?: string) {
    super(message ?? `Attempt ${incomingAttempt} is stale. Current active attempt is ${currentAttempt}.`);
    this.name = "StaleCompletionError";
    this.currentAttempt = currentAttempt;
    this.incomingAttempt = incomingAttempt;
  }
}
