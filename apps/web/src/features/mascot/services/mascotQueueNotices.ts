import type { Notice } from "../../../components/types";

export function createSlotSuccessNotice(slotIndex: number, state: string, promptUsed?: string): NonNullable<Notice> {
  const successMessage = promptUsed
    ? `Slot ${slotIndex} (${state}) generated: "${promptUsed}"`
    : `Slot ${slotIndex} (${state}) generated successfully`;

  return {
    tone: "good",
    message: successMessage,
  };
}

export function createSlotErrorNotice(state: string, err: unknown): NonNullable<Notice> {
  const error = err as Error;
  return {
    tone: "bad",
    message: error?.message || `Failed to generate ${state} slot`,
  };
}

export function createBatchOutcomeNotice(
  isAborted: boolean,
  completedCount: number,
  failedCount: number,
  total: number,
): NonNullable<Notice> {
  if (isAborted) {
    return {
      tone: "good",
      message: `Batch generation stopped (${completedCount}/${total} slots generated)`,
    };
  }

  if (failedCount > 0) {
    return {
      tone: completedCount === 0 ? "bad" : "good",
      message:
        completedCount === 0
          ? `Batch generation failed: all ${failedCount} slots failed`
          : `Batch generation finished: ${completedCount}/${total} slots generated (${failedCount} failed)`,
    };
  }

  return {
    tone: "good",
    message: `Batch generation complete (${completedCount}/${total} slots generated)`,
  };
}

export function createReconnectedNotice(
  completed: number,
  total: number,
  activeStreamsCount: number,
): NonNullable<Notice> {
  return {
    tone: "neutral",
    message: `Reconnected to background generation: ${completed}/${total} slots completed (${activeStreamsCount} active streams)`,
  };
}

export function createCatchUpCompletedNotice(
  completedCount: number,
  totalSlots: number,
): NonNullable<Notice> {
  return {
    tone: "good",
    message: `Background generation completed while you were away: ${completedCount}/${totalSlots} poses generated successfully.`,
  };
}

export function createStyleConceptSuccessNotice(styleName: string): NonNullable<Notice> {
  return {
    tone: "good",
    message: `Concept for style "${styleName}" generated successfully`,
  };
}

export function createStyleConceptErrorNotice(styleName: string, err: unknown): NonNullable<Notice> {
  const error = err as Error;
  return {
    tone: "bad",
    message: error?.message || `Failed to generate concept for style "${styleName}"`,
  };
}

export function createStyleBatchOutcomeNotice(
  isAborted: boolean,
  completedCount: number,
  failedCount: number,
  total: number,
): NonNullable<Notice> {
  if (isAborted) {
    return {
      tone: "neutral",
      message: `Style concepts queue stopped (${completedCount}/${total} styles generated)`,
    };
  }

  if (failedCount > 0) {
    return {
      tone: completedCount === 0 ? "bad" : "good",
      message:
        completedCount === 0
          ? `Style concepts generation failed: all ${failedCount} styles failed`
          : `Style concepts generation finished: ${completedCount}/${total} styles generated (${failedCount} failed)`,
    };
  }

  return {
    tone: "good",
    message: `Style concepts generation complete (${completedCount}/${total} styles generated)`,
  };
}

export function createStyleReconnectedNotice(
  completed: number,
  total: number,
  activeCount: number,
): NonNullable<Notice> {
  return {
    tone: "neutral",
    message: `Reconnected to background style generation: ${completed}/${total} completed (${activeCount} active)`,
  };
}

export function createStyleCatchUpCompletedNotice(
  completedCount: number,
  totalStyles: number,
): NonNullable<Notice> {
  return {
    tone: "good",
    message: `Style concept generation completed while you were away: ${completedCount}/${totalStyles} concepts ready.`,
  };
}
