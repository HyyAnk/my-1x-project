import type { CodexServerRequest } from "../../codex.js";
import type { TaskManagerRuntime } from "../runtime.js";

export function handleServerRequest(this: TaskManagerRuntime, request: CodexServerRequest): void {
  const threadId = typeof request.params.threadId === "string" ? request.params.threadId : null;
  const turnId = typeof request.params.turnId === "string" ? request.params.turnId : null;
  const active = [...this.active.values()].find((run) => run.threadId === threadId && (!turnId || run.turnId === turnId));
  if (!active) {
    this.codex.rejectRequest(request.id, "No active dashboard task owns this request");
    return;
  }
  this.approvalRequests.set(request.id, { taskId: active.task.task_id, request });
  void this.update(active.task.task_id, { status: "WAITING_APPROVAL", progress_message: "Waiting for approval" });
  const approval = {
    kind: request.method,
    reason: typeof request.params.reason === "string" ? request.params.reason : undefined,
    command: typeof request.params.command === "string" ? request.params.command : undefined,
    cwd: typeof request.params.cwd === "string" ? request.params.cwd : undefined,
  };
  this.emitEvent({ type: "approval.requested", task: this.get(active.task.task_id), request_id: request.id, approval });
}
