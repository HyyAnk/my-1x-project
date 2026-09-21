import type { MascotSlotBatchJob } from "@studio/shared";
import type { BatchProgressState, BatchSlotItem } from "../types/mascotBatch.types";

export type MascotQueueProgressMode = NonNullable<BatchProgressState["mode"]>;

export function getSlotKey(slot: BatchSlotItem): string {
  return `${slot.state}_${slot.slotIndex}`;
}

export function getTargetState(slots: BatchSlotItem[]): "thinking" | "celebrate" | "all" {
  if (slots.every((slot) => slot.state === "thinking")) return "thinking";
  if (slots.every((slot) => slot.state === "celebrate")) return "celebrate";
  return "all";
}

export function mergeTargetState(
  current: BatchProgressState["targetState"],
  next: BatchProgressState["targetState"],
): "thinking" | "celebrate" | "all" {
  if (!current) return next ?? "all";
  return current === next ? current : "all";
}

export function mergeProgressMode(current: MascotQueueProgressMode | undefined, next: MascotQueueProgressMode): MascotQueueProgressMode {
  if (!current) return next;
  if (current === next) return current;
  if (current === "regenerate_selected" && next === "regenerate_selected") return current;
  return next === "single" ? current : next;
}

export function createQueuedMessage(slots: BatchSlotItem[]): string {
  const target = getTargetState(slots);
  const targetLabel = target === "all" ? "" : `${target} `;
  return slots.length === 1 ? `Queued ${targetLabel}slot ${slots[0]?.slotIndex ?? ""}...` : `Queued ${slots.length} ${targetLabel}slots...`;
}

export function getBatchQueuedKeys(batch: MascotSlotBatchJob): string[] {
  return batch.items.filter((item) => item.status === "queued").map((item) => `${item.state}_${item.slot_index}`);
}

export function isOlderBatchSnapshot(updatedAt: string, lastUpdatedAt: string | null): boolean {
  if (!lastUpdatedAt) return false;

  const updatedTime = Date.parse(updatedAt);
  const lastUpdatedTime = Date.parse(lastUpdatedAt);
  if (Number.isFinite(updatedTime) && Number.isFinite(lastUpdatedTime)) {
    return updatedTime < lastUpdatedTime;
  }

  return updatedAt < lastUpdatedAt;
}
