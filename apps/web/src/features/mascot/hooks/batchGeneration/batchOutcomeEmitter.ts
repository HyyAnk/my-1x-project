import type { MascotSlotBatchJob } from "@studio/shared";
import type { Notice } from "../../../../components/types";
import { createBatchOutcomeNotice, createSlotErrorNotice, createSlotSuccessNotice } from "../../services/mascotQueueNotices";
import { acknowledgeBatchInSession } from "../../utils/mascotSessionStorage";

/**
 * Acknowledges batch in session and emits appropriate user notice based on batch outcome.
 */
export function emitBatchOutcome(batch: MascotSlotBatchJob, onNotice: (notice: Notice) => void): void {
  acknowledgeBatchInSession(batch.id);

  if (batch.total_slots === 1 && batch.items.length > 0) {
    const item = batch.items[0];
    if (item && item.status === "completed") {
      onNotice(createSlotSuccessNotice(item.slot_index, item.state, item.prompt_used ?? undefined));
      return;
    }
    if (item && item.status === "failed") {
      onNotice(createSlotErrorNotice(item.state, new Error(item.error || "Slot generation failed")));
      return;
    }
  }

  onNotice(createBatchOutcomeNotice(batch.status === "cancelled", batch.completed_count, batch.failed_count, batch.total_slots));
}
