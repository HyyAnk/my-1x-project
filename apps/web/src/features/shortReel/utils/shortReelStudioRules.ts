import type { ShortReelRecord, Task } from "@studio/shared";

const DELIVERABLE_UNIT_KEYS = ["references", "script", "cover", "publishing"] as const;

/** Strips trailing punctuation from a topic title for display. */
export function getCleanTopicTitle(title: string): string {
  return title.replace(/\.+$/, "");
}

/** All deliverable units (script, references, cover, publishing) must be ready and no segment may be stale. */
export function canExportReel(reel: ShortReelRecord): boolean {
  const requiredUnits = DELIVERABLE_UNIT_KEYS.map((unitKey) => reel.units[unitKey]);
  return requiredUnits.every((unit) => unit.state === "ready") && (reel.stale_segments?.length ?? 0) === 0;
}

/** True when a generation task is active/queued or any deliverable unit is still pending. */
export function hasPendingGeneration(reel: ShortReelRecord, task: Task | null, isGenerating: boolean): boolean {
  if (isGenerating || task?.status === "RUNNING" || task?.status === "QUEUED") return true;
  return DELIVERABLE_UNIT_KEYS.map((unitKey) => reel.units[unitKey]).some((unit) => unit.state === "pending");
}
