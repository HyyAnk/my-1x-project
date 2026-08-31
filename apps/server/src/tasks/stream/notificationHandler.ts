import type { TaskManagerRuntime } from "../runtime.js";

export function handleNotification(this: TaskManagerRuntime, method: string, params: Record<string, unknown>): void {
  const threadId =
    typeof params.threadId === "string"
      ? params.threadId
      : typeof (params.turn as { threadId?: unknown } | undefined)?.threadId === "string"
        ? (params.turn as { threadId: string }).threadId
        : null;
  const turnId =
    typeof params.turnId === "string"
      ? params.turnId
      : typeof (params.turn as { id?: unknown } | undefined)?.id === "string"
        ? (params.turn as { id: string }).id
        : null;
  const active = [...this.active.values()].find(
    (run) => (threadId ? run.threadId === threadId : true) && (!run.turnId || !turnId || run.turnId === turnId),
  );
  if (!active) return;
  if (turnId && !active.turnId) active.turnId = turnId;
  if (method === "item/agentMessage/delta") {
    const delta =
      typeof params.delta === "string"
        ? params.delta
        : params.delta && typeof params.delta === "object"
          ? JSON.stringify(params.delta)
          : "";
    active.output += delta;
    void this.update(active.task.task_id, { progress_message: "Receiving output" });
  } else if (active.task.task_type === "GENERATE_BUNDLE_IMAGE" && /^item\/(?:image|file|media|attachment|output)/i.test(method)) {
    const media = JSON.stringify(params);
    if (/(?:data:image|b64_json|base64|\.(?:png|jpe?g|webp)\b)/i.test(media)) {
      active.output += media;
      void this.update(active.task.task_id, { progress_message: "Receiving image output" });
    }
  } else if (method === "turn/completed") {
    const turn = params.turn as { status?: string; error?: { message?: string } } | undefined;
    if (turn?.status === "failed") void this.finish(active.task.task_id, "FAILED", turn.error?.message ?? "Codex turn failed");
    else if (turn?.status === "interrupted") void this.finish(active.task.task_id, "CANCELLED", "Turn interrupted");
    else void this.completeWithOutput(active);
  } else if (method === "error") {
    const error = params.error as { message?: string } | undefined;
    void this.finish(active.task.task_id, "FAILED", error?.message ?? "Codex error");
  }
}
