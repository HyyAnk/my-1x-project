import type { MascotSlotBatchJob } from "@studio/shared";

/**
 * Infers whether the batch job targets only thinking, only celebrate, or all states.
 */
export function inferBatchTargetState(batch?: MascotSlotBatchJob | null): "thinking" | "celebrate" | "all" {
  if (!batch?.items || batch.items.length === 0) return "all";
  const states = new Set(batch.items.map((i) => i.state));
  if (states.size === 1) {
    const state = batch.items[0]?.state;
    if (state === "thinking" || state === "celebrate") return state;
  }
  return "all";
}

/**
 * Formats user-facing status message reflecting stream activity or queue status.
 */
export function formatSlotStreamMessage(activeKeys: string[], total: number, isStopping = false): string {
  if (isStopping) return "Stopping batch generation...";
  if (activeKeys.length === 0) {
    return total === 1 ? "Queuing slot..." : `Generating ${total} slots (3 concurrent streams)...`;
  }
  if (total === 1) {
    const [st, num] = activeKeys[0].split("_");
    const titleCase = st ? st.charAt(0).toUpperCase() + st.slice(1) : "";
    return `Generating ${titleCase} slot ${num}...`;
  }
  return activeKeys
    .map((key, idx) => {
      const [st, num] = key.split("_");
      const titleCase = st ? st.charAt(0).toUpperCase() + st.slice(1) : "";
      return `Stream ${idx + 1}: ${titleCase} #${num}`;
    })
    .join(", ");
}

/**
 * Formats canonical slot keys with style-prefixed keys for component compatibility.
 */
export function formatQueuedKeys(rawKeys: string[], styleId: string): string[] {
  const set = new Set<string>();
  for (const key of rawKeys) {
    set.add(key);
    set.add(`${styleId}:${key}`);
  }
  return Array.from(set);
}
